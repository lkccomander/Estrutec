import type { FormEvent } from 'react'
import { ActionFeedback } from '../../components/ActionFeedback'

type Currency = 'CRC' | 'USD'

type Project = {
  proyecto_id: string
  nombre_proyecto: string
  fecha_inicio_proyecto: string
  fecha_fin_proyecto?: string | null
  activo: boolean
  presupuesto_proyecto: string
  balance_proyecto: string
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

type ProjectForm = {
  nombre_proyecto: string
  fecha_inicio_proyecto: string
  fecha_fin_proyecto: string
}

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackState = {
  target: string
  message: string
  tone: FeedbackTone
} | null

type BudgetsDashboardProps = {
  projects: Project[]
  projectFilter: 'active' | 'all' | 'archived'
  projectForm: ProjectForm
  selectedProjectId: string
  selectedProject: Project | null
  budgets: Budget[]
  budgetForm: BudgetForm
  selectedBudgetId: string
  isBusy: boolean
  actionFeedback: ActionFeedbackState
  onProjectFormChange: (patch: Partial<ProjectForm>) => void
  onCreateProject: (event: FormEvent<HTMLFormElement>) => void
  onProjectFilterChange: (filter: 'active' | 'all' | 'archived') => void
  onSelectProject: (projectId: string) => void
  onUpdateProject: (event: FormEvent<HTMLFormElement>) => void
  onArchiveProject: () => void
  onActivateProject: () => void
  onBudgetFormChange: (patch: Partial<BudgetForm>) => void
  onCreateBudget: (event: FormEvent<HTMLFormElement>) => void
  onOpenBudget: (budgetId: string) => void
  formatMoney: (amount: string, currency: Currency) => string
}

export function BudgetsDashboard({
  projects,
  projectFilter,
  projectForm,
  selectedProjectId,
  selectedProject,
  budgets,
  budgetForm,
  selectedBudgetId,
  isBusy,
  actionFeedback,
  onProjectFormChange,
  onCreateProject,
  onProjectFilterChange,
  onSelectProject,
  onUpdateProject,
  onArchiveProject,
  onActivateProject,
  onBudgetFormChange,
  onCreateBudget,
  onOpenBudget,
  formatMoney,
}: BudgetsDashboardProps) {
  const formatProjectTotal = (amount: string) =>
    Number(amount).toLocaleString('es-CR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  const activeProjectOptions = projects.filter((project) => project.activo)
  const visibleProjects =
    projectFilter === 'active'
      ? projects.filter((project) => project.activo)
      : projectFilter === 'archived'
        ? projects.filter((project) => !project.activo)
        : projects
  const activeProjectFilterId = selectedProjectId || budgetForm.proyecto_id
  const visibleBudgets = activeProjectFilterId
    ? budgets.filter((budget) => budget.proyecto_id === activeProjectFilterId)
    : budgets

  return (
    <section className="panel-stack">
      <article className="card-group">
        <div className="section-title">
          <h2>Crear proyecto</h2>
          <span className="list-meta">{activeProjectOptions.length} proyectos activos</span>
        </div>
        <form className="form-grid two-columns" onSubmit={onCreateProject}>
          <label className="field">
            <span>Nombre del proyecto</span>
            <input
              className="input"
              value={projectForm.nombre_proyecto}
              onChange={(event) => onProjectFormChange({ nombre_proyecto: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Fecha inicio</span>
            <input
              className="input"
              type="date"
              value={projectForm.fecha_inicio_proyecto}
              onChange={(event) => onProjectFormChange({ fecha_inicio_proyecto: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Fecha fin</span>
            <input
              className="input"
              type="date"
              value={projectForm.fecha_fin_proyecto}
              onChange={(event) => onProjectFormChange({ fecha_fin_proyecto: event.target.value })}
            />
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="sync-btn" type="submit" disabled={isBusy}>
              Crear proyecto
            </button>
            <ActionFeedback
              message={actionFeedback?.target === 'project-create' ? actionFeedback.message : null}
              tone={actionFeedback?.tone}
            />
          </div>
        </form>
      </article>

      <article className="card-group">
        <div className="section-title">
          <h2>Mantenimiento de proyecto</h2>
          <span className="list-meta">
            {selectedProject?.nombre_proyecto ?? 'Selecciona un proyecto'}
          </span>
        </div>
        <form className="form-grid two-columns" onSubmit={onUpdateProject}>
          <label className="field">
            <span>Proyecto</span>
            <select
              className="select"
              value={selectedProjectId}
              onChange={(event) => onSelectProject(event.target.value)}
            >
              <option value="">Selecciona un proyecto</option>
              {projects.map((project) => (
                <option key={project.proyecto_id} value={project.proyecto_id}>
                  {project.nombre_proyecto} {project.activo ? '' : '(Archivado)'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nombre del proyecto</span>
            <input
              className="input"
              value={projectForm.nombre_proyecto}
              onChange={(event) => onProjectFormChange({ nombre_proyecto: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Fecha inicio</span>
            <input
              className="input"
              type="date"
              value={projectForm.fecha_inicio_proyecto}
              onChange={(event) => onProjectFormChange({ fecha_inicio_proyecto: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Fecha fin</span>
            <input
              className="input"
              type="date"
              value={projectForm.fecha_fin_proyecto}
              onChange={(event) => onProjectFormChange({ fecha_fin_proyecto: event.target.value })}
            />
          </label>
          <div className="field">
            <span>Totales</span>
            <div className="maintenance-note">
              Presupuesto proyecto{' '}
              {selectedProject ? formatProjectTotal(selectedProject.presupuesto_proyecto) : '0.00'}
              {' / '}
              Balance proyecto{' '}
              {selectedProject ? formatProjectTotal(selectedProject.balance_proyecto) : '0.00'}
            </div>
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <div className="action-row">
              <button className="sync-btn" type="submit" disabled={!selectedProjectId || isBusy}>
                Actualizar proyecto
              </button>
              {selectedProject?.activo ? (
                <button className="tab-btn" type="button" onClick={onArchiveProject} disabled={!selectedProjectId || isBusy}>
                  Archivar proyecto
                </button>
              ) : (
                <button className="tab-btn" type="button" onClick={onActivateProject} disabled={!selectedProjectId || isBusy}>
                  Activar proyecto
                </button>
              )}
            </div>
            <ActionFeedback
              message={
                actionFeedback?.target === 'project-update' ||
                actionFeedback?.target === 'project-archive' ||
                actionFeedback?.target === 'project-activate'
                  ? actionFeedback.message
                  : null
              }
              tone={actionFeedback?.tone}
            />
          </div>
        </form>
      </article>

      <article className="card-group">
        <div className="section-title">
          <h2>Crear presupuesto</h2>
          <span className="list-meta">{visibleBudgets.length} registros</span>
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
            <span>Nombre del Presupuesto</span>
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
            <button className="sync-btn" type="submit" disabled={isBusy}>
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
          <h2>Proyectos</h2>
          <select
            className="select mini-select"
            value={projectFilter}
            onChange={(event) =>
              onProjectFilterChange(event.target.value as 'active' | 'all' | 'archived')
            }
          >
            <option value="active">Activos</option>
            <option value="all">Todos</option>
            <option value="archived">Archivados</option>
          </select>
        </div>
        <div className="list-scroll">
          {visibleProjects.map((project) => (
            <article
              className={`record-card ${selectedProjectId === project.proyecto_id ? 'selected-card' : ''}`}
              key={project.proyecto_id}
              onClick={() => onSelectProject(project.proyecto_id)}
            >
              <div className="record-head">
                <div>
                  <h3>{project.nombre_proyecto}</h3>
                  <p className="list-meta">
                    Inicio {new Date(project.fecha_inicio_proyecto).toLocaleDateString('es-CR')}
                  </p>
                </div>
                <span className={`badge ${project.activo ? 'approved' : 'rejected'}`}>
                  {project.activo ? 'ACTIVO' : 'ARCHIVADO'}
                </span>
              </div>
              <div className="record-foot">
                <p>Presupuesto {formatProjectTotal(project.presupuesto_proyecto)}</p>
                <p>Balance {formatProjectTotal(project.balance_proyecto)}</p>
              </div>
              {project.fecha_fin_proyecto ? (
                <p className="record-conversion">
                  Fecha fin: {new Date(project.fecha_fin_proyecto).toLocaleDateString('es-CR')}
                </p>
              ) : null}
            </article>
          ))}
          {visibleProjects.length === 0 ? <p className="empty">No hay proyectos para este filtro.</p> : null}
        </div>
      </article>

      <article className="card-group">
        <div className="section-title">
          <h2>Presupuestos</h2>
          <select
            className="select mini-select"
            value={selectedBudgetId}
            onChange={(event) => onOpenBudget(event.target.value)}
          >
            {visibleBudgets.map((budget) => (
              <option key={budget.presupuesto_id} value={budget.presupuesto_id}>
                {budget.nombre_proyecto ? `${budget.nombre_proyecto} · ` : ''}
                {budget.categoria}
              </option>
            ))}
          </select>
        </div>
        <div className="list-scroll">
          {visibleBudgets.map((budget) => {
            const total = Number(budget.monto_total)
            const available = Number(budget.saldo_disponible)
            const consumed = Math.max(total - available, 0)
            const availablePercent = total > 0 ? (available / total) * 100 : 0
            const consumedPercent = total > 0 ? (consumed / total) * 100 : 0
            const isClosed = budget.estado === 'CERRADO'

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
                  Proyecto:{' '}
                  <strong>{budget.nombre_proyecto ?? 'Sin proyecto asignado'}</strong>
                </p>
                <div className="budget-bar-group">
                  <div className="budget-bar-labels">
                    <span>Consumido {consumedPercent.toFixed(1)}%</span>
                    <span>Disponible {availablePercent.toFixed(1)}%</span>
                  </div>
                  <div className="budget-bar-track" aria-hidden="true">
                    <div
                      className={`budget-bar-fill ${isClosed ? 'budget-bar-closed' : 'budget-bar-consumed'}`}
                      style={{ width: `${Math.min(consumedPercent, 100)}%` }}
                    />
                    <div
                      className={`budget-bar-fill ${isClosed ? 'budget-bar-closed' : 'budget-bar-available'}`}
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
              {activeProjectFilterId
                ? 'No hay presupuestos para el proyecto seleccionado.'
                : 'Inicia sesion para ver presupuestos.'}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  )
}
