from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class APIMessage(BaseModel):
    message: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_id: UUID
    nombre: str
    email: str
    rol: str
    activo: bool
    created_at: datetime


class UserUpdate(BaseModel):
    nombre: str | None = None
    rol: str | None = None
    activo: bool | None = None


class ProjectBase(BaseModel):
    nombre_proyecto: str
    fecha_inicio_proyecto: date
    fecha_fin_proyecto: date | None = None
    latitud: Decimal | None = None
    longitud: Decimal | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    proyecto_id: UUID
    activo: bool
    presupuesto_proyecto: Decimal
    balance_proyecto: Decimal
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(BaseModel):
    nombre_proyecto: str | None = None
    fecha_inicio_proyecto: date | None = None
    fecha_fin_proyecto: date | None = None
    latitud: Decimal | None = None
    longitud: Decimal | None = None


class BudgetBase(BaseModel):
    proyecto_id: UUID
    monto_total: Decimal
    categoria: str
    moneda: str


class BudgetCreate(BudgetBase):
    pass


class BudgetRead(BudgetBase):
    model_config = ConfigDict(from_attributes=True)

    presupuesto_id: UUID
    nombre_proyecto: str | None = None
    saldo_disponible: Decimal
    fecha_creacion: datetime
    estado: str
    created_at: datetime
    updated_at: datetime


class BudgetUpdate(BaseModel):
    proyecto_id: UUID | None = None
    monto_total: Decimal | None = None
    categoria: str | None = None
    moneda: str | None = None
    estado: str | None = None


class ReceiptCreate(BaseModel):
    presupuesto_id: UUID
    usuario_creador_id: UUID
    fecha: date
    negocio: str
    descripcion: str
    monto_gasto: Decimal
    moneda: str
    tipo_cambio: Decimal | None = None
    tipo_comprobante: str
    numero_referencia: str | None = None
    numero_factura: str | None = None
    cedula: str | None = None
    observacion: str | None = None


class ReceiptUpdate(BaseModel):
    fecha: date | None = None
    numero_referencia: str | None = None
    numero_factura: str | None = None
    negocio: str | None = None
    cedula: str | None = None
    descripcion: str | None = None
    monto_gasto: Decimal | None = None
    moneda: str | None = None
    tipo_cambio: Decimal | None = None
    tipo_comprobante: str | None = None
    observacion: str | None = None


class ReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comprobante_id: UUID
    presupuesto_id: UUID
    usuario_creador_id: UUID
    usuario_aprobador_id: UUID | None
    fecha: date
    numero_referencia: str | None
    numero_factura: str | None
    negocio: str
    cedula: str | None
    descripcion: str
    monto_gasto: Decimal
    moneda: str
    tipo_cambio: Decimal | None
    monto_presupuesto: Decimal | None
    tipo_comprobante: str
    estado: str
    observacion: str | None
    created_at: datetime
    updated_at: datetime


class ReceiptWithBalanceRead(ReceiptRead):
    balance: Decimal | None = None
    applied_at: datetime | None = None


class ReceiptDecision(BaseModel):
    observacion: str | None = None


class AttachmentCreate(BaseModel):
    cdn_path: str
    nombre_archivo: str | None = None
    tipo_archivo: str | None = None
    orden: int = 1


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    adjunto_id: UUID
    comprobante_id: UUID
    cdn_path: str
    nombre_archivo: str | None
    tipo_archivo: str | None
    orden: int
    created_at: datetime


class MovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    movimiento_id: UUID
    presupuesto_id: UUID
    comprobante_id: UUID | None
    usuario_id: UUID | None
    tipo_movimiento: str
    monto: Decimal
    saldo_anterior: Decimal
    saldo_nuevo: Decimal
    moneda: str
    descripcion: str | None
    referencia_externa: str | None
    created_at: datetime


class LogEntryCreate(BaseModel):
    mensaje: str


class LogEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: UUID
    mensaje: str
    usuario_id: UUID
    autor_nombre: str
    autor_email: str
    created_at: datetime
