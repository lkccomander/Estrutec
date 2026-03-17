type Role = 'ADMIN' | 'APROBADOR' | 'REGISTRADOR'

type User = {
  usuario_id: string
  nombre: string
  email: string
  rol: Role
  activo: boolean
  created_at: string
}

type UsersListViewProps = {
  users: User[]
  selectedUserId: string
  onSelectUser: (userId: string) => void
}

export function UsersListView({
  users,
  selectedUserId,
  onSelectUser,
}: UsersListViewProps) {
  return (
    <article className="card-group">
      <div className="section-title">
        <h2>Todos los usuarios</h2>
        <span className="list-meta">{users.length} registrados</span>
      </div>
      <div className="list-scroll">
        {users.map((user) => (
          <article
            className={`record-card ${selectedUserId === user.usuario_id ? 'selected-card' : ''}`}
            key={user.usuario_id}
            onClick={() => onSelectUser(user.usuario_id)}
          >
            <div className="record-head">
              <div>
                <h3>{user.nombre}</h3>
                <p>{user.email}</p>
              </div>
              <span className={`badge ${user.activo ? 'approved' : 'rejected'}`}>
                {user.activo ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
            <div className="record-foot">
              <p>{user.rol}</p>
              <p className="list-meta">
                {new Date(user.created_at).toLocaleDateString('es-CR')}
              </p>
            </div>
          </article>
        ))}
        {users.length === 0 ? <p className="empty">No hay usuarios para mostrar.</p> : null}
      </div>
    </article>
  )
}
