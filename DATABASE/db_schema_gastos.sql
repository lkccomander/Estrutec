--
-- PostgreSQL database dump
--

\restrict 0gNazgMC0WgPMtYvUHklxNMmO10s5sJLb4krzWoMk9GiWA7LQsWqga6eKGluwt9

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: estado_comprobante; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_comprobante AS ENUM (
    'BORRADOR',
    'PENDIENTE',
    'APROBADO',
    'RECHAZADO'
);


ALTER TYPE public.estado_comprobante OWNER TO postgres;

--
-- Name: estado_presupuesto; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_presupuesto AS ENUM (
    'ACTIVO',
    'AGOTADO',
    'CERRADO'
);


ALTER TYPE public.estado_presupuesto OWNER TO postgres;

--
-- Name: moneda; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.moneda AS ENUM (
    'CRC',
    'USD'
);


ALTER TYPE public.moneda OWNER TO postgres;

--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rol_usuario AS ENUM (
    'ADMIN',
    'APROBADOR',
    'REGISTRADOR'
);


ALTER TYPE public.rol_usuario OWNER TO postgres;

--
-- Name: tipo_comprobante; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_comprobante AS ENUM (
    'FACTURA_FOTO',
    'SINPE_MOVIL',
    'CAJA_CHICA'
);


ALTER TYPE public.tipo_comprobante OWNER TO postgres;

--
-- Name: tipo_movimiento_presupuesto; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_movimiento_presupuesto AS ENUM (
    'ASIGNACION_INICIAL',
    'AUMENTO',
    'DISMINUCION',
    'CONSUMO',
    'AJUSTE'
);


ALTER TYPE public.tipo_movimiento_presupuesto OWNER TO postgres;

--
-- Name: aprobar_comprobante(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.aprobar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_presupuesto_id UUID;
    v_monto NUMERIC(14,2);
    v_moneda moneda;
    v_tipo_cambio NUMERIC(14,6);
    v_monto_presupuesto NUMERIC(14,2);
    v_moneda_presupuesto moneda;
    v_tipo_comprobante tipo_comprobante;
    v_estado_actual estado_comprobante;
    v_monto_total_actual NUMERIC(14,2);
    v_saldo_actual NUMERIC(14,2);
    v_saldo_nuevo NUMERIC(14,2);
BEGIN
    SELECT
        c.presupuesto_id,
        c.monto_gasto,
        c.moneda,
        c.tipo_cambio,
        c.tipo_comprobante,
        c.estado
    INTO
        v_presupuesto_id,
        v_monto,
        v_moneda,
        v_tipo_cambio,
        v_tipo_comprobante,
        v_estado_actual
    FROM comprobante c
    WHERE c.comprobante_id = p_comprobante_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no existe: %', p_comprobante_id;
    END IF;

    IF v_estado_actual = 'APROBADO' THEN
        RAISE EXCEPTION 'El comprobante ya está aprobado: %', p_comprobante_id;
    END IF;

    IF v_estado_actual = 'RECHAZADO' THEN
        RAISE EXCEPTION 'No se puede aprobar un comprobante rechazado: %', p_comprobante_id;
    END IF;

    SELECT monto_total, saldo_disponible, moneda
    INTO v_monto_total_actual
        ,v_saldo_actual
        ,v_moneda_presupuesto
    FROM presupuesto
    WHERE presupuesto_id = v_presupuesto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Presupuesto no existe: %', v_presupuesto_id;
    END IF;

    IF v_moneda_presupuesto = v_moneda THEN
        v_monto_presupuesto := v_monto;
    ELSE
        IF v_tipo_cambio IS NULL OR v_tipo_cambio <= 0 THEN
            RAISE EXCEPTION
                'Tipo de cambio requerido. Presupuesto: %, comprobante: %',
                v_moneda_presupuesto,
                v_moneda;
        END IF;

        v_monto_presupuesto := CASE
            WHEN v_moneda = 'CRC' AND v_moneda_presupuesto = 'USD' THEN
                ROUND((v_monto / v_tipo_cambio)::numeric, 2)
            WHEN v_moneda = 'USD' AND v_moneda_presupuesto = 'CRC' THEN
                ROUND((v_monto * v_tipo_cambio)::numeric, 2)
            ELSE
                ROUND((v_monto * v_tipo_cambio)::numeric, 2)
        END;
    END IF;

    IF v_tipo_comprobante <> 'CAJA_CHICA' AND v_saldo_actual < v_monto_presupuesto THEN
        RAISE EXCEPTION 'Saldo insuficiente. Saldo actual: %, monto presupuesto: %', v_saldo_actual, v_monto_presupuesto;
    END IF;

    IF v_tipo_comprobante = 'CAJA_CHICA' THEN
        v_saldo_nuevo := v_saldo_actual + v_monto_presupuesto;
    ELSE
        v_saldo_nuevo := v_saldo_actual - v_monto_presupuesto;
    END IF;

    UPDATE presupuesto
    SET
        monto_total = CASE
                        WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN monto_total + v_monto_presupuesto
                        ELSE monto_total
                      END,
        saldo_disponible = v_saldo_nuevo,
        estado = CASE
                    WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN 'ACTIVO'
                    WHEN v_saldo_nuevo = 0 THEN 'AGOTADO'
                    WHEN v_saldo_nuevo > 0 AND estado = 'AGOTADO' THEN 'ACTIVO'
                    ELSE estado
                 END
    WHERE presupuesto_id = v_presupuesto_id;

    UPDATE comprobante
    SET
        estado = 'APROBADO',
        usuario_aprobador_id = p_usuario_aprobador_id,
        monto_presupuesto = v_monto_presupuesto,
        observacion = COALESCE(p_observacion, observacion)
    WHERE comprobante_id = p_comprobante_id;

    INSERT INTO movimiento_presupuesto (
        presupuesto_id,
        comprobante_id,
        usuario_id,
        tipo_movimiento,
        monto,
        saldo_anterior,
        saldo_nuevo,
        moneda,
        descripcion
    )
    VALUES (
        v_presupuesto_id,
        p_comprobante_id,
        p_usuario_aprobador_id,
        CASE
            WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN 'AUMENTO'::tipo_movimiento_presupuesto
            ELSE 'CONSUMO'::tipo_movimiento_presupuesto
        END,
        v_monto_presupuesto,
        v_saldo_actual,
        v_saldo_nuevo,
        v_moneda_presupuesto,
        CASE
            WHEN v_tipo_comprobante = 'CAJA_CHICA' AND v_moneda_presupuesto = v_moneda THEN
                'Fondeo de presupuesto por caja chica'
            WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN
                'Fondeo de presupuesto por caja chica con conversion cambiaria'
            WHEN v_moneda_presupuesto = v_moneda THEN
                'Consumo generado por aprobación de comprobante'
            ELSE
                'Consumo generado por aprobación de comprobante con conversion cambiaria'
        END
    );
END;
$$;


ALTER FUNCTION public.aprobar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text) OWNER TO postgres;

--
-- Name: archivar_proyecto(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.archivar_proyecto(p_proyecto_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE t_proyectos
    SET activo = FALSE
    WHERE proyecto_id = p_proyecto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proyecto no existe: %', p_proyecto_id;
    END IF;
END;
$$;


ALTER FUNCTION public.archivar_proyecto(p_proyecto_id uuid) OWNER TO postgres;

--
-- Name: bloquear_cambios_adjuntos_comprobante_aprobado(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bloquear_cambios_adjuntos_comprobante_aprobado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_estado estado_comprobante;
    v_comprobante_id UUID;
BEGIN
    v_comprobante_id := COALESCE(NEW.comprobante_id, OLD.comprobante_id);

    SELECT estado
    INTO v_estado
    FROM comprobante
    WHERE comprobante_id = v_comprobante_id;

    IF v_estado = 'APROBADO' THEN
        RAISE EXCEPTION
            'No se pueden modificar adjuntos de un comprobante APROBADO (comprobante_id=%)',
            v_comprobante_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.bloquear_cambios_adjuntos_comprobante_aprobado() OWNER TO postgres;

--
-- Name: bloquear_campos_criticos_comprobante_aprobado(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bloquear_campos_criticos_comprobante_aprobado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado = 'APROBADO' THEN
        IF
            NEW.presupuesto_id IS DISTINCT FROM OLD.presupuesto_id OR
            NEW.usuario_creador_id IS DISTINCT FROM OLD.usuario_creador_id OR
            NEW.fecha IS DISTINCT FROM OLD.fecha OR
            NEW.numero_referencia IS DISTINCT FROM OLD.numero_referencia OR
            NEW.numero_factura IS DISTINCT FROM OLD.numero_factura OR
            NEW.negocio IS DISTINCT FROM OLD.negocio OR
            NEW.cedula IS DISTINCT FROM OLD.cedula OR
            NEW.descripcion IS DISTINCT FROM OLD.descripcion OR
            NEW.monto_gasto IS DISTINCT FROM OLD.monto_gasto OR
            NEW.moneda IS DISTINCT FROM OLD.moneda OR
            NEW.tipo_comprobante IS DISTINCT FROM OLD.tipo_comprobante
        THEN
            RAISE EXCEPTION
                'No se pueden modificar campos críticos de un comprobante APROBADO (comprobante_id=%)',
                OLD.comprobante_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.bloquear_campos_criticos_comprobante_aprobado() OWNER TO postgres;

--
-- Name: bloquear_delete_comprobante_aprobado(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bloquear_delete_comprobante_aprobado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado = 'APROBADO' THEN
        RAISE EXCEPTION
            'No se puede eliminar un comprobante en estado APROBADO (comprobante_id=%)',
            OLD.comprobante_id;
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION public.bloquear_delete_comprobante_aprobado() OWNER TO postgres;

--
-- Name: rechazar_comprobante(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rechazar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_estado_actual estado_comprobante;
BEGIN
    SELECT estado
    INTO v_estado_actual
    FROM comprobante
    WHERE comprobante_id = p_comprobante_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no existe: %', p_comprobante_id;
    END IF;

    IF v_estado_actual = 'APROBADO' THEN
        RAISE EXCEPTION 'No se puede rechazar un comprobante ya aprobado';
    END IF;

    IF v_estado_actual = 'RECHAZADO' THEN
        RAISE EXCEPTION 'El comprobante ya está rechazado';
    END IF;

    UPDATE comprobante
    SET
        estado = 'RECHAZADO',
        usuario_aprobador_id = p_usuario_aprobador_id,
        observacion = COALESCE(p_observacion, observacion)
    WHERE comprobante_id = p_comprobante_id;
END;
$$;


ALTER FUNCTION public.rechazar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text) OWNER TO postgres;

--
-- Name: refresh_project_totals(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_project_totals(p_proyecto_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_proyecto_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE t_proyectos
    SET
        presupuesto_proyecto = COALESCE((
            SELECT SUM(monto_total)
            FROM presupuesto
            WHERE proyecto_id = p_proyecto_id
        ), 0),
        balance_proyecto = COALESCE((
            SELECT SUM(saldo_disponible)
            FROM presupuesto
            WHERE proyecto_id = p_proyecto_id
        ), 0)
    WHERE proyecto_id = p_proyecto_id;
END;
$$;


ALTER FUNCTION public.refresh_project_totals(p_proyecto_id uuid) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: sync_project_totals_from_budget(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_project_totals_from_budget() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_project_totals(OLD.proyecto_id);
        RETURN OLD;
    END IF;

    PERFORM refresh_project_totals(NEW.proyecto_id);

    IF TG_OP = 'UPDATE' AND NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id THEN
        PERFORM refresh_project_totals(OLD.proyecto_id);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_project_totals_from_budget() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adjunto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.adjunto (
    adjunto_id uuid DEFAULT gen_random_uuid() NOT NULL,
    comprobante_id uuid NOT NULL,
    cdn_path text NOT NULL,
    nombre_archivo character varying(255),
    tipo_archivo character varying(100),
    orden integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_adjunto_cdn_path_no_vacio CHECK ((length(TRIM(BOTH FROM cdn_path)) > 0)),
    CONSTRAINT chk_adjunto_orden_positivo CHECK ((orden > 0))
);


ALTER TABLE public.adjunto OWNER TO postgres;

--
-- Name: app_migration_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_migration_log (
    migration_name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_migration_log OWNER TO postgres;

--
-- Name: comprobante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comprobante (
    comprobante_id uuid DEFAULT gen_random_uuid() NOT NULL,
    presupuesto_id uuid NOT NULL,
    usuario_creador_id uuid NOT NULL,
    usuario_aprobador_id uuid,
    fecha date NOT NULL,
    numero_referencia character varying(100),
    numero_factura character varying(100),
    negocio character varying(200) NOT NULL,
    cedula character varying(50),
    descripcion text NOT NULL,
    monto_gasto numeric(14,2) NOT NULL,
    moneda public.moneda NOT NULL,
    tipo_comprobante public.tipo_comprobante NOT NULL,
    estado public.estado_comprobante DEFAULT 'BORRADOR'::public.estado_comprobante NOT NULL,
    observacion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tipo_cambio numeric(14,6),
    monto_presupuesto numeric(14,2),
    CONSTRAINT chk_comprobante_monto_presupuesto_positivo CHECK (((monto_presupuesto IS NULL) OR (monto_presupuesto > (0)::numeric))),
    CONSTRAINT chk_comprobante_tipo_cambio_positivo CHECK (((tipo_cambio IS NULL) OR (tipo_cambio > (0)::numeric))),
    CONSTRAINT comprobante_monto_gasto_check CHECK ((monto_gasto > (0)::numeric))
);


ALTER TABLE public.comprobante OWNER TO postgres;

--
-- Name: movimiento_presupuesto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimiento_presupuesto (
    movimiento_id uuid DEFAULT gen_random_uuid() NOT NULL,
    presupuesto_id uuid NOT NULL,
    comprobante_id uuid,
    usuario_id uuid,
    tipo_movimiento public.tipo_movimiento_presupuesto NOT NULL,
    monto numeric(14,2) NOT NULL,
    saldo_anterior numeric(14,2) NOT NULL,
    saldo_nuevo numeric(14,2) NOT NULL,
    moneda public.moneda NOT NULL,
    descripcion text,
    referencia_externa character varying(150),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimiento_presupuesto_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT movimiento_presupuesto_saldo_anterior_check CHECK ((saldo_anterior >= (0)::numeric)),
    CONSTRAINT movimiento_presupuesto_saldo_nuevo_check CHECK ((saldo_nuevo >= (0)::numeric))
);


ALTER TABLE public.movimiento_presupuesto OWNER TO postgres;

--
-- Name: presupuesto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.presupuesto (
    presupuesto_id uuid DEFAULT gen_random_uuid() NOT NULL,
    monto_total numeric(14,2) NOT NULL,
    categoria character varying(120) NOT NULL,
    saldo_disponible numeric(14,2) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    estado public.estado_presupuesto DEFAULT 'ACTIVO'::public.estado_presupuesto NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    moneda public.moneda NOT NULL,
    proyecto_id uuid NOT NULL,
    CONSTRAINT chk_presupuesto_saldo_no_supera_monto CHECK ((saldo_disponible <= monto_total)),
    CONSTRAINT presupuesto_monto_total_check CHECK ((monto_total >= (0)::numeric)),
    CONSTRAINT presupuesto_saldo_disponible_check CHECK ((saldo_disponible >= (0)::numeric))
);


ALTER TABLE public.presupuesto OWNER TO postgres;

--
-- Name: t_proyectos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_proyectos (
    proyecto_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_proyecto character varying(180) NOT NULL,
    fecha_inicio_proyecto date NOT NULL,
    fecha_fin_proyecto date,
    presupuesto_proyecto numeric(14,2) DEFAULT 0 NOT NULL,
    balance_proyecto numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    latitud numeric(9,6),
    longitud numeric(9,6),
    CONSTRAINT chk_t_proyectos_balance_no_supera_presupuesto CHECK ((balance_proyecto <= presupuesto_proyecto)),
    CONSTRAINT chk_t_proyectos_fechas CHECK (((fecha_fin_proyecto IS NULL) OR (fecha_fin_proyecto >= fecha_inicio_proyecto))),
    CONSTRAINT t_proyectos_balance_proyecto_check CHECK ((balance_proyecto >= (0)::numeric)),
    CONSTRAINT t_proyectos_presupuesto_proyecto_check CHECK ((presupuesto_proyecto >= (0)::numeric))
);


ALTER TABLE public.t_proyectos OWNER TO postgres;

--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    usuario_id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    rol public.rol_usuario NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash text NOT NULL
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Name: adjunto adjunto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adjunto
    ADD CONSTRAINT adjunto_pkey PRIMARY KEY (adjunto_id);


--
-- Name: app_migration_log app_migration_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_migration_log
    ADD CONSTRAINT app_migration_log_pkey PRIMARY KEY (migration_name);


--
-- Name: comprobante comprobante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comprobante
    ADD CONSTRAINT comprobante_pkey PRIMARY KEY (comprobante_id);


--
-- Name: movimiento_presupuesto movimiento_presupuesto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_presupuesto
    ADD CONSTRAINT movimiento_presupuesto_pkey PRIMARY KEY (movimiento_id);


--
-- Name: presupuesto presupuesto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT presupuesto_pkey PRIMARY KEY (presupuesto_id);


--
-- Name: t_proyectos t_proyectos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_proyectos
    ADD CONSTRAINT t_proyectos_pkey PRIMARY KEY (proyecto_id);


--
-- Name: t_proyectos uq_t_proyectos_nombre_proyecto; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_proyectos
    ADD CONSTRAINT uq_t_proyectos_nombre_proyecto UNIQUE (nombre_proyecto);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (usuario_id);


--
-- Name: ix_adjunto_comprobante_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_adjunto_comprobante_id ON public.adjunto USING btree (comprobante_id);


--
-- Name: ix_adjunto_orden; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_adjunto_orden ON public.adjunto USING btree (comprobante_id, orden);


--
-- Name: ix_comprobante_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_estado ON public.comprobante USING btree (estado);


--
-- Name: ix_comprobante_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_fecha ON public.comprobante USING btree (fecha);


--
-- Name: ix_comprobante_numero_factura; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_numero_factura ON public.comprobante USING btree (numero_factura);


--
-- Name: ix_comprobante_presupuesto_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_presupuesto_id ON public.comprobante USING btree (presupuesto_id);


--
-- Name: ix_comprobante_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_tipo ON public.comprobante USING btree (tipo_comprobante);


--
-- Name: ix_comprobante_usuario_aprobador_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_usuario_aprobador_id ON public.comprobante USING btree (usuario_aprobador_id);


--
-- Name: ix_comprobante_usuario_creador_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_comprobante_usuario_creador_id ON public.comprobante USING btree (usuario_creador_id);


--
-- Name: ix_movimiento_comprobante_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_movimiento_comprobante_id ON public.movimiento_presupuesto USING btree (comprobante_id);


--
-- Name: ix_movimiento_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_movimiento_created_at ON public.movimiento_presupuesto USING btree (created_at);


--
-- Name: ix_movimiento_presupuesto_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_movimiento_presupuesto_id ON public.movimiento_presupuesto USING btree (presupuesto_id);


--
-- Name: ix_movimiento_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_movimiento_tipo ON public.movimiento_presupuesto USING btree (tipo_movimiento);


--
-- Name: ix_movimiento_usuario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_movimiento_usuario_id ON public.movimiento_presupuesto USING btree (usuario_id);


--
-- Name: ix_presupuesto_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_presupuesto_categoria ON public.presupuesto USING btree (categoria);


--
-- Name: ix_presupuesto_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_presupuesto_estado ON public.presupuesto USING btree (estado);


--
-- Name: ix_presupuesto_proyecto_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_presupuesto_proyecto_id ON public.presupuesto USING btree (proyecto_id);


--
-- Name: ix_t_proyectos_nombre_proyecto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_t_proyectos_nombre_proyecto ON public.t_proyectos USING btree (nombre_proyecto);


--
-- Name: ix_usuario_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_usuario_email ON public.usuario USING btree (email);


--
-- Name: ix_usuario_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_usuario_rol ON public.usuario USING btree (rol);


--
-- Name: adjunto trg_bloquear_delete_adjunto_aprobado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bloquear_delete_adjunto_aprobado BEFORE DELETE ON public.adjunto FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambios_adjuntos_comprobante_aprobado();


--
-- Name: comprobante trg_bloquear_delete_comprobante_aprobado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bloquear_delete_comprobante_aprobado BEFORE DELETE ON public.comprobante FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_comprobante_aprobado();


--
-- Name: adjunto trg_bloquear_insert_adjunto_aprobado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bloquear_insert_adjunto_aprobado BEFORE INSERT ON public.adjunto FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambios_adjuntos_comprobante_aprobado();


--
-- Name: adjunto trg_bloquear_update_adjunto_aprobado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bloquear_update_adjunto_aprobado BEFORE UPDATE ON public.adjunto FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambios_adjuntos_comprobante_aprobado();


--
-- Name: comprobante trg_bloquear_update_comprobante_aprobado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bloquear_update_comprobante_aprobado BEFORE UPDATE ON public.comprobante FOR EACH ROW EXECUTE FUNCTION public.bloquear_campos_criticos_comprobante_aprobado();


--
-- Name: comprobante trg_comprobante_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_comprobante_set_updated_at BEFORE UPDATE ON public.comprobante FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: presupuesto trg_presupuesto_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_presupuesto_set_updated_at BEFORE UPDATE ON public.presupuesto FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: presupuesto trg_presupuesto_sync_project_totals; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_presupuesto_sync_project_totals AFTER INSERT OR DELETE OR UPDATE ON public.presupuesto FOR EACH ROW EXECUTE FUNCTION public.sync_project_totals_from_budget();


--
-- Name: t_proyectos trg_t_proyectos_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_t_proyectos_set_updated_at BEFORE UPDATE ON public.t_proyectos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: adjunto fk_adjunto_comprobante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adjunto
    ADD CONSTRAINT fk_adjunto_comprobante FOREIGN KEY (comprobante_id) REFERENCES public.comprobante(comprobante_id) ON DELETE CASCADE;


--
-- Name: comprobante fk_comprobante_presupuesto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comprobante
    ADD CONSTRAINT fk_comprobante_presupuesto FOREIGN KEY (presupuesto_id) REFERENCES public.presupuesto(presupuesto_id) ON DELETE RESTRICT;


--
-- Name: comprobante fk_comprobante_usuario_aprobador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comprobante
    ADD CONSTRAINT fk_comprobante_usuario_aprobador FOREIGN KEY (usuario_aprobador_id) REFERENCES public.usuario(usuario_id) ON DELETE RESTRICT;


--
-- Name: comprobante fk_comprobante_usuario_creador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comprobante
    ADD CONSTRAINT fk_comprobante_usuario_creador FOREIGN KEY (usuario_creador_id) REFERENCES public.usuario(usuario_id) ON DELETE RESTRICT;


--
-- Name: movimiento_presupuesto fk_movimiento_comprobante; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_presupuesto
    ADD CONSTRAINT fk_movimiento_comprobante FOREIGN KEY (comprobante_id) REFERENCES public.comprobante(comprobante_id) ON DELETE SET NULL;


--
-- Name: movimiento_presupuesto fk_movimiento_presupuesto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_presupuesto
    ADD CONSTRAINT fk_movimiento_presupuesto FOREIGN KEY (presupuesto_id) REFERENCES public.presupuesto(presupuesto_id) ON DELETE RESTRICT;


--
-- Name: movimiento_presupuesto fk_movimiento_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_presupuesto
    ADD CONSTRAINT fk_movimiento_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(usuario_id) ON DELETE SET NULL;


--
-- Name: presupuesto fk_presupuesto_proyecto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_proyecto FOREIGN KEY (proyecto_id) REFERENCES public.t_proyectos(proyecto_id) ON DELETE RESTRICT;


--
-- Name: FUNCTION aprobar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.aprobar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text) TO gastos_user;


--
-- Name: FUNCTION archivar_proyecto(p_proyecto_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.archivar_proyecto(p_proyecto_id uuid) TO gastos_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO gastos_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO gastos_user;


--
-- Name: FUNCTION bloquear_cambios_adjuntos_comprobante_aprobado(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bloquear_cambios_adjuntos_comprobante_aprobado() TO gastos_user;


--
-- Name: FUNCTION bloquear_campos_criticos_comprobante_aprobado(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bloquear_campos_criticos_comprobante_aprobado() TO gastos_user;


--
-- Name: FUNCTION bloquear_delete_comprobante_aprobado(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bloquear_delete_comprobante_aprobado() TO gastos_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO gastos_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO gastos_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO gastos_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO gastos_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION fips_mode(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fips_mode() TO gastos_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO gastos_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO gastos_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO gastos_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO gastos_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO gastos_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO gastos_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO gastos_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO gastos_user;


--
-- Name: FUNCTION rechazar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rechazar_comprobante(p_comprobante_id uuid, p_usuario_aprobador_id uuid, p_observacion text) TO gastos_user;


--
-- Name: FUNCTION refresh_project_totals(p_proyecto_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_project_totals(p_proyecto_id uuid) TO gastos_user;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO gastos_user;


--
-- Name: FUNCTION sync_project_totals_from_budget(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_project_totals_from_budget() TO gastos_user;


--
-- Name: TABLE adjunto; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.adjunto TO gastos_user;


--
-- Name: TABLE app_migration_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.app_migration_log TO gastos_user;


--
-- Name: TABLE comprobante; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comprobante TO gastos_user;


--
-- Name: TABLE movimiento_presupuesto; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.movimiento_presupuesto TO gastos_user;


--
-- Name: TABLE presupuesto; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.presupuesto TO gastos_user;


--
-- Name: TABLE t_proyectos; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.t_proyectos TO gastos_user;


--
-- Name: TABLE usuario; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.usuario TO gastos_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO gastos_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO gastos_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO gastos_user;


--
-- PostgreSQL database dump complete
--

\unrestrict 0gNazgMC0WgPMtYvUHklxNMmO10s5sJLb4krzWoMk9GiWA7LQsWqga6eKGluwt9

