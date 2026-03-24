import type { FormEvent } from 'react'
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2'
import { PiPiggyBankBold } from 'react-icons/pi'
import { ActionFeedback } from '../../components/ActionFeedback'

type Project = {
  proyecto_id: string
  nombre_proyecto: string
  fecha_inicio_proyecto: string
  fecha_fin_proyecto?: string | null
  latitud?: string | null
  longitud?: string | null
  activo: boolean
  presupuesto_proyecto: string
  balance_proyecto: string
}

type Budget = {
  presupuesto_id: string
  proyecto_id: string
  monto_total: string
  categoria: string
  moneda: 'CRC' | 'USD'
  saldo_disponible: string
  estado: string
  created_at: string
}

type ProjectForm = {
  nombre_proyecto: string
  fecha_inicio_proyecto: string
  fecha_fin_proyecto: string
  latitud: string
  longitud: string
}

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackState = {
  target: string
  message: string
  tone: FeedbackTone
} | null

type ProjectsDashboardProps = {
  projects: Project[]
  budgets: Budget[]
  projectFilter: 'active' | 'all' | 'archived'
  projectForm: ProjectForm
  selectedProjectId: string
  selectedProject: Project | null
  isBusy: boolean
  actionFeedback: ActionFeedbackState
  onProjectFormChange: (patch: Partial<ProjectForm>) => void
  onCreateProject: (event: FormEvent<HTMLFormElement>) => void
  onProjectFilterChange: (filter: 'active' | 'all' | 'archived') => void
  onSelectProject: (projectId: string) => void
  onUpdateProject: (event: FormEvent<HTMLFormElement>) => void
  onArchiveProject: () => void
  onActivateProject: () => void
  onOpenBudgets: (projectId: string) => void
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeDonutArc(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle)
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle)
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle)
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

export function ProjectsDashboard({
  projects,
  budgets,
  projectFilter,
  projectForm,
  selectedProjectId,
  selectedProject,
  isBusy,
  actionFeedback,
  onProjectFormChange,
  onCreateProject,
  onProjectFilterChange,
  onSelectProject,
  onUpdateProject,
  onArchiveProject,
  onActivateProject,
  onOpenBudgets,
}: ProjectsDashboardProps) {
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
  const projectPlotRows = visibleProjects.map((project) => {
    const total = Number(project.presupuesto_proyecto)
    const balance = Number(project.balance_proyecto)
    const consumed = Math.max(total - balance, 0)
    const availablePercent = total > 0 ? (balance / total) * 100 : 0
    const consumedPercent = total > 0 ? (consumed / total) * 100 : 0

    return {
      ...project,
      total,
      balance,
      availablePercent,
      consumedPercent,
    }
  })
  const selectedProjectBudgets = selectedProjectId
    ? budgets.filter((budget) => budget.proyecto_id === selectedProjectId)
    : []
  const budgetChartRows = [...selectedProjectBudgets]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((budget) => ({
      ...budget,
      total: Number(budget.monto_total),
      balance: Number(budget.saldo_disponible),
      consumed: Math.max(Number(budget.monto_total) - Number(budget.saldo_disponible), 0),
      availablePercent:
        Number(budget.monto_total) > 0
          ? (Number(budget.saldo_disponible) / Number(budget.monto_total)) * 100
          : 0,
      consumedPercent:
        Number(budget.monto_total) > 0
          ? ((Number(budget.monto_total) - Number(budget.saldo_disponible)) / Number(budget.monto_total)) * 100
          : 0,
      dateLabel: new Date(budget.created_at).toLocaleDateString('es-CR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }))
  const chartStats = [
    {
      label: 'Total rubros',
      value: formatProjectTotal(budgetChartRows.reduce((sum, budget) => sum + budget.total, 0).toFixed(2)),
      toneClass: 'project-dashboard-stat-total',
    },
    {
      label: 'Disponible rubros',
      value: formatProjectTotal(budgetChartRows.reduce((sum, budget) => sum + budget.balance, 0).toFixed(2)),
      toneClass: 'project-dashboard-stat-balance',
    },
    {
      label: 'Consumo promedio',
      value: `${(
        budgetChartRows.reduce((sum, budget) => sum + (budget.total > 0 ? ((budget.total - budget.balance) / budget.total) * 100 : 0), 0) /
        Math.max(budgetChartRows.length, 1)
      ).toFixed(1)}%`,
      toneClass: 'project-dashboard-stat-consumed',
    },
  ]
  const donutColors = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']
  const donutTotal = budgetChartRows.reduce((sum, budget) => sum + budget.total, 0)
  let accumulatedAngle = 0
  const donutSegments = budgetChartRows.map((budget, index) => {
    const percent = donutTotal > 0 ? (budget.total / donutTotal) * 100 : 0
    const sweep = donutTotal > 0 ? (budget.total / donutTotal) * 360 : 0
    const startAngle = accumulatedAngle
    const endAngle = accumulatedAngle + sweep
    accumulatedAngle = endAngle

    return {
      ...budget,
      percent,
      color: donutColors[index % donutColors.length],
      path: describeDonutArc(132, 132, 104, 60, startAngle, endAngle),
    }
  })

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
          <label className="field">
            <span>Latitud</span>
            <input
              className="input"
              value={projectForm.latitud}
              onChange={(event) => onProjectFormChange({ latitud: event.target.value })}
              placeholder="9.9281"
            />
          </label>
          <label className="field">
            <span>Longitud</span>
            <input
              className="input"
              value={projectForm.longitud}
              onChange={(event) => onProjectFormChange({ longitud: event.target.value })}
              placeholder="-84.0907"
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
          <label className="field">
            <span>Latitud</span>
            <input
              className="input"
              value={projectForm.latitud}
              onChange={(event) => onProjectFormChange({ latitud: event.target.value })}
              placeholder="9.9281"
            />
          </label>
          <label className="field">
            <span>Longitud</span>
            <input
              className="input"
              value={projectForm.longitud}
              onChange={(event) => onProjectFormChange({ longitud: event.target.value })}
              placeholder="-84.0907"
            />
          </label>
          <div className="field">
            <span>Totales</span>
            <div className="maintenance-note">
              Rubro proyecto{' '}
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
                <span className="button-with-icon">
                  <HiOutlineClipboardDocumentList aria-hidden="true" />
                  <span>Actualizar proyecto</span>
                </span>
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
        {budgetChartRows.length ? (
          <div className="project-area-chart-shell project-dashboard-spline-shell">
            <div className="project-donut-layout project-donut-layout-animated">
              <div className="project-donut-wrap">
                <svg
                  className="project-donut-chart"
                  viewBox="0 0 264 264"
                  role="img"
                  aria-label="Grafico de dona de rubros del proyecto seleccionado"
                >
                  <circle className="project-donut-base" cx="132" cy="132" r="104" />
                  {donutSegments.map((budget, index) => (
                    <path
                      key={budget.presupuesto_id}
                      className="project-donut-segment"
                      d={budget.path}
                      fill={budget.color}
                      style={{ animationDelay: `${0.2 + index * 0.12}s` }}
                    />
                  ))}
                  <circle className="project-donut-hole" cx="132" cy="132" r="60" />
                  <text className="project-donut-total-label project-donut-project-label" x="132" y="120" textAnchor="middle">
                    Rubros
                  </text>
                  <text className="project-donut-total-value" x="132" y="144" textAnchor="middle">
                    {budgetChartRows.length}
                  </text>
                </svg>
              </div>

              <div className="project-donut-legend">
                {donutSegments.map((budget, index) => (
                  <article
                    key={budget.presupuesto_id}
                    className="project-donut-item project-donut-item-animated"
                    style={{ animationDelay: `${0.28 + index * 0.08}s` }}
                  >
                    <span
                      className="project-donut-swatch"
                      style={{ backgroundColor: budget.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <h4>{budget.categoria}</h4>
                      <p>{budget.percent.toFixed(1)}% del total del proyecto</p>
                      <p>Total {formatProjectTotal(budget.total.toFixed(2))}</p>
                      <p>Disponible {formatProjectTotal(budget.balance.toFixed(2))}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="project-area-chart-footer">
              {chartStats.map((stat) => (
                <div className="project-area-stat project-dashboard-stat" key={stat.label}>
                  <h4>{stat.label}</h4>
                  <p className={stat.toneClass}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : selectedProjectId ? (
          <p className="empty">El proyecto seleccionado no tiene rubros para representar en el grafico de dona.</p>
        ) : null}
        <div className="list-scroll">
          {projectPlotRows.map((project) => (
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
                <div className="project-head-actions">
                  <button
                    className="sync-btn project-budget-btn"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenBudgets(project.proyecto_id)
                    }}
                  >
                    <span className="button-with-icon">
                      <PiPiggyBankBold aria-hidden="true" />
                      <span>Rubros</span>
                    </span>
                  </button>
                  <span className={`badge ${project.activo ? 'approved' : 'rejected'}`}>
                    {project.activo ? 'ACTIVO' : 'ARCHIVADO'}
                  </span>
                </div>
              </div>
              <div className="record-foot">
                <p>Rubro {formatProjectTotal(project.presupuesto_proyecto)}</p>
                <p>Balance {formatProjectTotal(project.balance_proyecto)}</p>
              </div>
              <div className="project-plot-track" aria-hidden="true">
                <div
                  className="project-plot-fill project-plot-consumed"
                  style={{ width: `${Math.min(project.consumedPercent, 100)}%` }}
                />
                <div
                  className="project-plot-fill project-plot-available"
                  style={{ width: `${Math.min(project.availablePercent, 100)}%` }}
                />
              </div>
              <p className="record-conversion">
                Disponible {project.availablePercent.toFixed(1)}% / Consumido{' '}
                {project.consumedPercent.toFixed(1)}%
              </p>
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
    </section>
  )
}
