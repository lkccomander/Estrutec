from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.dependencies import get_current_user, get_project_service, require_roles
from app.schemas.common import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.projects import ProjectService

router = APIRouter(prefix="/proyectos", tags=["proyectos"])


@router.get("", response_model=list[ProjectRead], summary="Listar proyectos")
def list_projects(
    _: dict = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectRead]:
    return service.list_projects()


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear proyecto",
)
def create_project(
    payload: ProjectCreate,
    _: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    return service.create_project(payload.model_dump())


@router.get("/{proyecto_id}", response_model=ProjectRead, summary="Detalle de proyecto")
def get_project(
    proyecto_id: str,
    _: dict = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    project = service.get_project(proyecto_id)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@router.patch("/{proyecto_id}", response_model=ProjectRead, summary="Actualizar proyecto")
def update_project(
    proyecto_id: str,
    payload: ProjectUpdate,
    _: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    project = service.update_project(proyecto_id, payload.model_dump(exclude_none=True))
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@router.delete("/{proyecto_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar proyecto")
def delete_project(
    proyecto_id: str,
    _: dict = Depends(require_roles("ADMIN")),
    service: ProjectService = Depends(get_project_service),
) -> Response:
    deleted = service.delete_project(proyecto_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{proyecto_id}/archivar", response_model=ProjectRead, summary="Archivar proyecto")
def archive_project(
    proyecto_id: str,
    _: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    project = service.archive_project(proyecto_id)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@router.patch("/{proyecto_id}/activar", response_model=ProjectRead, summary="Activar proyecto")
def activate_project(
    proyecto_id: str,
    _: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    project = service.set_project_active(proyecto_id, True)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project
