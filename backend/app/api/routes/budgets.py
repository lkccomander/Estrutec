from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.dependencies import get_current_user, get_budget_service, require_roles
from app.schemas.common import BudgetCreate, BudgetRead, BudgetUpdate, MovementRead
from app.services.budgets import BudgetService

router = APIRouter(prefix="/presupuestos", tags=["presupuestos"])


@router.get("", response_model=list[BudgetRead], summary="Listar presupuestos")
def list_budgets(
    _: dict = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service),
) -> list[BudgetRead]:
    return service.list_budgets()


@router.post(
    "",
    response_model=BudgetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear presupuesto",
)
def create_budget(
    payload: BudgetCreate,
    _: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: BudgetService = Depends(get_budget_service),
) -> BudgetRead:
    budget = service.create_budget(payload.model_dump())
    if not budget:
        raise HTTPException(
            status_code=400,
            detail="El proyecto no existe o esta archivado.",
        )
    return budget


@router.get(
    "/{presupuesto_id}/movimientos",
    response_model=list[MovementRead],
    summary="Listar movimientos de presupuesto",
)
def list_movements(
    presupuesto_id: str,
    _: dict = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service),
) -> list[MovementRead]:
    return service.list_movements(presupuesto_id)


@router.get("/{presupuesto_id}", response_model=BudgetRead, summary="Detalle de presupuesto")
def get_budget(
    presupuesto_id: str,
    _: dict = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service),
) -> BudgetRead:
    budget = service.get_budget(presupuesto_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    return budget


@router.patch("/{presupuesto_id}", response_model=BudgetRead, summary="Actualizar presupuesto")
def update_budget(
    presupuesto_id: str,
    payload: BudgetUpdate,
    _: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: BudgetService = Depends(get_budget_service),
) -> BudgetRead:
    budget = service.update_budget(presupuesto_id, payload.model_dump(exclude_none=True))
    if not budget:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    return budget


@router.delete("/{presupuesto_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar presupuesto")
def delete_budget(
    presupuesto_id: str,
    _: dict = Depends(require_roles("ADMIN")),
    service: BudgetService = Depends(get_budget_service),
) -> Response:
    deleted = service.delete_budget(presupuesto_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
