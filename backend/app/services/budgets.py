from app.repositories.budgets import BudgetRepository


class BudgetService:
    def __init__(self, repository: BudgetRepository):
        self._repository = repository

    def list_budgets(self) -> list[dict]:
        return self._repository.list_budgets()

    def create_budget(self, payload: dict) -> dict:
        return self._repository.create_budget(payload)

    def get_budget(self, budget_id: str) -> dict | None:
        return self._repository.get_budget(budget_id)

    def update_budget(self, budget_id: str, payload: dict) -> dict | None:
        return self._repository.update_budget(budget_id, payload)

    def delete_budget(self, budget_id: str) -> bool:
        return self._repository.delete_budget(budget_id)

    def list_movements(self, budget_id: str) -> list[dict]:
        return self._repository.list_movements(budget_id)
