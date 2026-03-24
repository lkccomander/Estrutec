import type { FormEvent } from 'react'
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2'
import { PiPiggyBankBold } from 'react-icons/pi'
import { ActionFeedback } from '../../components/ActionFeedback'

type ChartPoint = {
  x: number
  y: number
}

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

function buildSplinePath(points: ChartPoint[]) {
  if (!points.length) {
    return ''
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index]
    const current = points[index]
    const next = points[index + 1]
    const following = points[index + 2] ?? next

    const controlPointOneX = current.x + (next.x - previous.x) / 6
    const controlPointOneY = current.y + (next.y - previous.y) / 6
    const controlPointTwoX = next.x - (following.x - current.x) / 6
    const controlPointTwoY = next.y - (following.y - current.y) / 6

    path += ` C ${controlPointOneX} ${controlPointOneY}, ${controlPointTwoX} ${controlPointTwoY}, ${next.x} ${next.y}`
  }

  return path
}

function buildSplineAreaPath(points: ChartPoint[], baselineY: number) {
  if (!points.length) {
    return ''
  }

  const linePath = buildSplinePath(points)
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`
}

export function ProjectsDashboard({
  projects,
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
  const chartWidth = 900
  const chartHeight = 320
  const chartPadding = { top: 26, right: 24, bottom: 54, left: 58 }
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const chartMaxValue = Math.max(...projectPlotRows.map((project) => project.total), 1)
  const chartStepX =
    projectPlotRows.length > 1 ? chartInnerWidth / Math.max(projectPlotRows.length - 1, 1) : 0
  const chartBaselineY = chartPadding.top + chartInnerHeight
  const totalSeriesPoints = projectPlotRows.map((project, index) => ({
    x:
      chartPadding.left +
      (projectPlotRows.length === 1 ? chartInnerWidth / 2 : chartStepX * index),
    y: chartBaselineY - (project.total / chartMaxValue) * chartInnerHeight,
  }))
  const balanceSeriesPoints = projectPlotRows.map((project, index) => ({
    x:
      chartPadding.left +
      (projectPlotRows.length === 1 ? chartInnerWidth / 2 : chartStepX * index),
    y: chartBaselineY - (project.balance / chartMaxValue) * chartInnerHeight,
  }))
  const totalSplinePath = buildSplinePath(totalSeriesPoints)
  const balanceSplinePath = buildSplinePath(balanceSeriesPoints)
  const totalAreaPath = buildSplineAreaPath(totalSeriesPoints, chartBaselineY)
  const balanceAreaPath = buildSplineAreaPath(balanceSeriesPoints, chartBaselineY)
  const chartStats = [
    {
      label: 'Presupuesto visible',
      value: formatProjectTotal(projectPlotRows.reduce((sum, project) => sum + project.total, 0).toFixed(2)),
      toneClass: 'project-dashboard-stat-total',
    },
    {
      label: 'Balance visible',
      value: formatProjectTotal(projectPlotRows.reduce((sum, project) => sum + project.balance, 0).toFixed(2)),
      toneClass: 'project-dashboard-stat-balance',
    },
    {
      label: 'Consumo promedio',
      value: `${(
        projectPlotRows.reduce((sum, project) => sum + project.consumedPercent, 0) /
        Math.max(projectPlotRows.length, 1)
      ).toFixed(1)}%`,
      toneClass: 'project-dashboard-stat-consumed',
    },
  ]

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
        {projectPlotRows.length ? (
          <div className="project-area-chart-shell project-dashboard-spline-shell">
            <div className="project-area-chart-header">
              <span className="project-area-chart-badge project-line-badge project-balance-badge">
                Balance spline
              </span>
              <span className="project-area-chart-badge project-total-badge">
                Presupuesto spline
              </span>
            </div>

            <svg
              className="project-area-chart"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Spline area chart de balance y presupuesto por proyecto"
            >
              <defs>
                <linearGradient id="projectTotalAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id="projectBalanceAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map((step) => {
                const y = chartPadding.top + (chartInnerHeight / 4) * step
                const value = ((chartMaxValue * (4 - step)) / 4).toFixed(0)

                return (
                  <g key={step}>
                    <line
                      className="project-area-grid-line"
                      x1={chartPadding.left}
                      y1={y}
                      x2={chartWidth - chartPadding.right}
                      y2={y}
                    />
                    <text className="project-area-axis-label" x={chartPadding.left - 10} y={y + 4}>
                      {value}
                    </text>
                  </g>
                )
              })}

              <path className="project-spline-area project-spline-area-total" d={totalAreaPath} />
              <path className="project-spline-area project-spline-area-balance" d={balanceAreaPath} />
              <path className="project-total-line project-spline-line" d={totalSplinePath} />
              <path className="project-history-line project-spline-line" d={balanceSplinePath} style={{ stroke: '#22c55e' }} />

              {totalSeriesPoints.map((point, index) => (
                <circle
                  key={`total-${projectPlotRows[index].proyecto_id}`}
                  className="project-total-point"
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  style={{ fill: '#fbbf24', animationDelay: `${0.18 + index * 0.05}s` }}
                />
              ))}
              {balanceSeriesPoints.map((point, index) => (
                <circle
                  key={`balance-${projectPlotRows[index].proyecto_id}`}
                  className="project-history-point"
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  style={{ fill: '#22c55e', animationDelay: `${0.24 + index * 0.05}s` }}
                />
              ))}

              {projectPlotRows.map((project, index) => {
                const x =
                  chartPadding.left +
                  (projectPlotRows.length === 1 ? chartInnerWidth / 2 : chartStepX * index)

                return (
                  <text
                    key={project.proyecto_id}
                    className="project-area-x-label"
                    x={x}
                    y={chartHeight - 18}
                    textAnchor="middle"
                  >
                    {project.nombre_proyecto.slice(0, 10)}
                  </text>
                )
              })}
            </svg>

            <div className="project-area-chart-footer">
              {chartStats.map((stat) => (
                <div className="project-area-stat project-dashboard-stat" key={stat.label}>
                  <h4>{stat.label}</h4>
                  <p className={stat.toneClass}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
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
