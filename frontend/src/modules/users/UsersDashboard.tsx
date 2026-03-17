import type { FormEvent } from 'react'
import { ActionFeedback } from '../../components/ActionFeedback'
import { UsersListView } from './UsersListView'

type Role = 'ADMIN' | 'APROBADOR' | 'REGISTRADOR'

type User = {
  usuario_id: string
  nombre: string
  email: string
  rol: Role
  activo: boolean
  created_at: string
}

type CreateUserForm = {
  nombre: string
  email: string
  password: string
  rol: Role
}

type UserForm = {
  nombre: string
  rol: Role
}

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackState = {
  target: string
  message: string
  tone: FeedbackTone
} | null

type UsersDashboardProps = {
  users: User[]
  selectedUserId: string
  selectedUser: User | null
  createUserForm: CreateUserForm
  userForm: UserForm
  isBusy: boolean
  actionFeedback: ActionFeedbackState
  onSelectUser: (userId: string) => void
  onCreateUserSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUpdateUserSubmit: (event: FormEvent<HTMLFormElement>) => void
  onToggleUserActive: (nextActive: boolean) => void
  onCreateUserFormChange: (patch: Partial<CreateUserForm>) => void
  onUserFormChange: (patch: Partial<UserForm>) => void
}

export function UsersDashboard({
  users,
  selectedUserId,
  selectedUser,
  createUserForm,
  userForm,
  isBusy,
  actionFeedback,
  onSelectUser,
  onCreateUserSubmit,
  onUpdateUserSubmit,
  onToggleUserActive,
  onCreateUserFormChange,
  onUserFormChange,
}: UsersDashboardProps) {
  return (
    <section className="panel-stack">
      <article className="card-group">
        <div className="section-title">
          <h2>Crear usuario</h2>
          <span className="list-meta">Alta de nuevos accesos</span>
        </div>
        <form className="form-grid two-columns" onSubmit={onCreateUserSubmit}>
          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              value={createUserForm.nombre}
              onChange={(event) => onCreateUserFormChange({ nombre: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              value={createUserForm.email}
              onChange={(event) => onCreateUserFormChange({ email: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Password temporal</span>
            <input
              className="input"
              type="password"
              value={createUserForm.password}
              onChange={(event) => onCreateUserFormChange({ password: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Rol</span>
            <select
              className="select"
              value={createUserForm.rol}
              onChange={(event) => onCreateUserFormChange({ rol: event.target.value as Role })}
            >
              <option value="REGISTRADOR">Registrador</option>
              <option value="APROBADOR">Aprobador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="sync-btn" type="submit" disabled={isBusy}>
              Crear usuario
            </button>
            <ActionFeedback
              message={actionFeedback?.target === 'user-create' ? actionFeedback.message : null}
              tone={actionFeedback?.tone}
            />
          </div>
        </form>
      </article>

      <UsersListView
        users={users}
        selectedUserId={selectedUserId}
        onSelectUser={onSelectUser}
      />

      <article className="card-group">
        <div className="section-title">
          <h2>Mantenimiento de usuario</h2>
          <span className="list-meta">{selectedUser?.email ?? 'Selecciona un usuario'}</span>
        </div>
        <form className="form-grid two-columns" onSubmit={onUpdateUserSubmit}>
          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              value={userForm.nombre}
              onChange={(event) => onUserFormChange({ nombre: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Rol</span>
            <select
              className="select"
              value={userForm.rol}
              onChange={(event) => onUserFormChange({ rol: event.target.value as Role })}
            >
              <option value="REGISTRADOR">Registrador</option>
              <option value="APROBADOR">Aprobador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <div className="field">
            <span>Estado</span>
            <div className="action-row">
              <button
                className="sync-btn"
                type="button"
                onClick={() => onToggleUserActive(true)}
                disabled={!selectedUserId || isBusy || selectedUser?.activo}
              >
                Habilitar
              </button>
              <button
                className="tab-btn"
                type="button"
                onClick={() => onToggleUserActive(false)}
                disabled={!selectedUserId || isBusy || !selectedUser?.activo}
              >
                Deshabilitar
              </button>
            </div>
            <ActionFeedback
              message={
                actionFeedback?.target === 'user-activate' || actionFeedback?.target === 'user-deactivate'
                  ? actionFeedback.message
                  : null
              }
              tone={actionFeedback?.tone}
            />
          </div>
          <div className="field">
            <span>Password</span>
            <div className="maintenance-note">
              Cambio de password pendiente de endpoint backend.
            </div>
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="sync-btn" type="submit" disabled={!selectedUserId || isBusy}>
              Actualizar perfil
            </button>
            <ActionFeedback
              message={actionFeedback?.target === 'user-update' ? actionFeedback.message : null}
              tone={actionFeedback?.tone}
            />
          </div>
        </form>
      </article>
    </section>
  )
}
