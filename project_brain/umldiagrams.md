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
    App --> Projects[ProjectsDashboard]
    App --> ProjectBudgets[ProjectBudgetsDashboard]
    App --> Users[UsersDashboard]
    App --> Icons[IconsDashboard]
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
