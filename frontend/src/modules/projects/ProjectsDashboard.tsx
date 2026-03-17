import type { FormEvent } from 'react'
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2'
import { PiPiggyBankBold } from 'react-icons/pi'
import { ActionFeedback } from '../../components/ActionFeedback'

type Project = {
  proyecto_id: string
  nombre_proyecto: string
  fecha_inicio_proyecto: string
  fecha_fin_proyecto?: string | null
  activo: boolean
  presupuesto_proyecto: string
  balance_proyecto: string
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
                      <span>Presupuestos</span>
                    </span>
                  </button>
                  <span className={`badge ${project.activo ? 'approved' : 'rejected'}`}>
                    {project.activo ? 'ACTIVO' : 'ARCHIVADO'}
                  </span>
                </div>
              </div>
              <div className="record-foot">
                <p>Presupuesto {formatProjectTotal(project.presupuesto_proyecto)}</p>
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
