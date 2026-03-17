import type { FormEvent } from 'react'
import { ActionFeedback } from '../../components/ActionFeedback'

type Currency = 'CRC' | 'USD'

type Project = {
  proyecto_id: string
  nombre_proyecto: string
  activo: boolean
}

type Budget = {
  presupuesto_id: string
  proyecto_id: string
  nombre_proyecto?: string | null
  monto_total: string
  categoria: string
  moneda: Currency
  saldo_disponible: string
  estado: string
  created_at: string
}

type BudgetForm = {
  proyecto_id: string
  categoria: string
  monto_total: string
  moneda: Currency
}

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackState = {
  target: string
  message: string
  tone: FeedbackTone
} | null

type ProjectBudgetsDashboardProps = {
  projects: Project[]
  budgets: Budget[]
  budgetForm: BudgetForm
  selectedProjectId: string
  selectedBudgetId: string
  isBusy: boolean
  actionFeedback: ActionFeedbackState
  onBudgetFormChange: (patch: Partial<BudgetForm>) => void
  onCreateBudget: (event: FormEvent<HTMLFormElement>) => void
  onOpenBudget: (budgetId: string) => void
  onBackToProjects: () => void
  formatMoney: (amount: string, currency: Currency) => string
}

export function ProjectBudgetsDashboard({
  projects,
  budgets,
  budgetForm,
  selectedProjectId,
  selectedBudgetId,
  isBusy,
  actionFeedback,
  onBudgetFormChange,
  onCreateBudget,
  onOpenBudget,
  onBackToProjects,
  formatMoney,
}: ProjectBudgetsDashboardProps) {
  const activeProjectOptions = projects.filter((project) => project.activo)
  const selectedProject = projects.find((project) => project.proyecto_id === selectedProjectId) ?? null
  const visibleBudgets = selectedProjectId
    ? budgets.filter((budget) => budget.proyecto_id === selectedProjectId)
    : []

  return (
    <section className="panel-stack">
      <article className="card-group">
        <div className="section-title">
          <h2>Crear presupuesto</h2>
          <div className="action-row">
            <span className="list-meta">
              {selectedProject?.nombre_proyecto ?? 'Selecciona un proyecto primero'}
            </span>
            <button className="tab-btn" type="button" onClick={onBackToProjects}>
              Volver a proyectos
            </button>
          </div>
        </div>
        <form className="form-grid two-columns" onSubmit={onCreateBudget}>
          <label className="field">
            <span>Proyecto</span>
            <select
              className="select"
              value={budgetForm.proyecto_id}
              onChange={(event) => onBudgetFormChange({ proyecto_id: event.target.value })}
            >
              <option value="">Selecciona un proyecto</option>
              {activeProjectOptions.map((project) => (
                <option key={project.proyecto_id} value={project.proyecto_id}>
                  {project.nombre_proyecto}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nombre del presupuesto</span>
            <input
              className="input"
              value={budgetForm.categoria}
              onChange={(event) => onBudgetFormChange({ categoria: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Monto total</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={budgetForm.monto_total}
              onChange={(event) => onBudgetFormChange({ monto_total: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Moneda</span>
            <select
              className="select"
              value={budgetForm.moneda}
              onChange={(event) => onBudgetFormChange({ moneda: event.target.value as Currency })}
            >
              <option value="CRC">CRC</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="sync-btn" type="submit" disabled={isBusy || !selectedProjectId}>
              Crear presupuesto
            </button>
            <ActionFeedback
              message={actionFeedback?.target === 'budget-create' ? actionFeedback.message : null}
              tone={actionFeedback?.tone}
            />
          </div>
        </form>
      </article>

      <article className="card-group">
        <div className="section-title">
          <h2>Presupuestos</h2>
          <span className="list-meta">{visibleBudgets.length} registros</span>
        </div>
        <div className="list-scroll">
          {visibleBudgets.map((budget) => {
            const total = Number(budget.monto_total)
            const available = Number(budget.saldo_disponible)
            const consumed = Math.max(total - available, 0)
            const availablePercent = total > 0 ? (available / total) * 100 : 0
            const consumedPercent = total > 0 ? (consumed / total) * 100 : 0

            return (
              <article
                className={`record-card ${selectedBudgetId === budget.presupuesto_id ? 'selected-card' : ''}`}
                key={budget.presupuesto_id}
                onClick={() => onOpenBudget(budget.presupuesto_id)}
              >
                <div className="record-head">
                  <div>
                    <h3>{budget.categoria}</h3>
                    <p className="list-meta">{budget.moneda}</p>
                  </div>
                  <span className="badge role">{budget.estado}</span>
                </div>
                <p className="record-conversion">
                  Proyecto: <strong>{budget.nombre_proyecto ?? selectedProject?.nombre_proyecto ?? 'Sin proyecto'}</strong>
                </p>
                <div className="budget-bar-group">
                  <div className="budget-bar-labels">
                    <span>Consumido {consumedPercent.toFixed(1)}%</span>
                    <span>Disponible {availablePercent.toFixed(1)}%</span>
                  </div>
                  <div className="budget-bar-track" aria-hidden="true">
                    <div
                      className="budget-bar-fill budget-bar-consumed"
                      style={{ width: `${Math.min(consumedPercent, 100)}%` }}
                    />
                    <div
                      className="budget-bar-fill budget-bar-available"
                      style={{ width: `${Math.min(availablePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="record-foot">
                  <p>{formatMoney(budget.saldo_disponible, budget.moneda)} disponibles</p>
                  <p className="list-meta">
                    {new Date(budget.created_at).toLocaleDateString('es-CR')}
                  </p>
                </div>
                <p className="record-conversion">
                  Total {formatMoney(budget.monto_total, budget.moneda)} / Consumido{' '}
                  {formatMoney(String(consumed.toFixed(2)), budget.moneda)}
                </p>
              </article>
            )
          })}
          {visibleBudgets.length === 0 ? (
            <p className="empty">
              {selectedProjectId
                ? 'No hay presupuestos para el proyecto seleccionado.'
                : 'Selecciona un proyecto para ver sus presupuestos.'}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  )
}
