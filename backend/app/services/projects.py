from app.repositories.projects import ProjectRepository


class ProjectService:
    def __init__(self, repository: ProjectRepository):
        self._repository = repository

    def list_projects(self) -> list[dict]:
        return self._repository.list_projects()

    def create_project(self, payload: dict) -> dict:
        return self._repository.create_project(payload)

    def get_project(self, project_id: str) -> dict | None:
        return self._repository.get_project(project_id)

    def update_project(self, project_id: str, payload: dict) -> dict | None:
        return self._repository.update_project(project_id, payload)

    def delete_project(self, project_id: str) -> bool:
        return self._repository.delete_project(project_id)

    def archive_project(self, project_id: str) -> dict | None:
        return self._repository.archive_project(project_id)

    def set_project_active(self, project_id: str, active: bool) -> dict | None:
        return self._repository.set_project_active(project_id, active)
