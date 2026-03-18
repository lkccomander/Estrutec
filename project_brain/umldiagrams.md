# UML Diagrams

## Backend layers

```mermaid
flowchart TD
    Client[Frontend React/Vite] --> API[FastAPI routes]
    API --> Services[Services]
    Services --> Repositories[Repositories]
    Repositories --> DB[(PostgreSQL)]
    API --> Schemas[Pydantic schemas]
    DB --> SQL[Funciones, triggers y constraints]
```

## Flujo de aprobacion de comprobante

```mermaid
flowchart TD
    A[POST /comprobantes/{id}/aprobar] --> B[Service de comprobantes]
    B --> C[Repository invoca aprobar_comprobante()]
    C --> D{Tipo de comprobante}
    D -->|FACTURA_FOTO o SINPE_MOVIL| E[Consumir saldo del presupuesto]
    D -->|CAJA_CHICA| F[Aumentar monto_total y saldo_disponible]
    E --> G[Insertar movimiento CONSUMO]
    F --> H[Insertar movimiento AUMENTO]
    G --> I[Comprobante APROBADO]
    H --> I
```

## Frontend actual

```mermaid
flowchart TD
    App[App.tsx] --> Login[Login/Register]
    App --> Home[Dashboard]
    App --> Projects[ProjectsDashboard]
    App --> ProjectBudgets[ProjectBudgetsDashboard]
    App --> Users[UsersDashboard]
    App --> Icons[IconsDashboard]
    App --> Accounts[Cuentas]
    Home --> Summary[Cards resumen]
    Home --> History[Historial por proyecto]
    Home --> Donut[Dona por proyectos]
    Home --> Map[Mapa CR por coordenadas]
    Projects --> ProjectBudgets
    ProjectBudgets --> Detail[Budget detail flow]
    Detail --> Receipts[Receipts]
    Detail --> Movements[Movements]
    Detail --> Attachments[Attachments]
```

## Navegacion actual de proyectos y presupuestos

```mermaid
flowchart TD
    D1[dashboard1] --> PList[Listado de proyectos]
    D1 --> PMaint[Mantenimiento de proyecto]
    PList --> Btn[Boton Presupuestos por proyecto]
    Btn --> PBudgets[Presupuestos del proyecto]
    PBudgets --> BDetail[Detalle de presupuesto]
    BDetail --> Receipts[Comprobantes]
    BDetail --> Files[Adjuntos]
    BDetail --> Audit[Movimientos]
```

## Dashboard analitico actual

```mermaid
flowchart TD
    Home[Dashboard] --> Cards[Indicadores globales]
    Home --> Hist[Historial de saldo por proyectos]
    Hist --> Bal[Saldo disponible]
    Hist --> Exp[Gastos acumulados]
    Hist --> Tot[Saldo total]
    Home --> Donut[Dona por presupuesto total del proyecto]
    Home --> Map[Mapa de Costa Rica]
    Map --> Coords[Latitud/Longitud por proyecto]
```
