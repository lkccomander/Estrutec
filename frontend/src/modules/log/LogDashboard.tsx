import type { FormEvent } from 'react'

import { ActionFeedback } from '../../components/ActionFeedback'
import { useI18n } from '../../i18n/useI18n'

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackState = {
  target: string
  message: string
  tone: FeedbackTone
} | null

type LogEntry = {
  log_id: string
  mensaje: string
  usuario_id: string
  autor_nombre: string
  autor_email: string
  created_at: string
}

type LogDashboardProps = {
  entries: LogEntry[]
  message: string
  isBusy: boolean
  actionFeedback: ActionFeedbackState
  onMessageChange: (message: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function formatTimestamp(value: string, locale: string) {
  return new Date(value).toLocaleString(locale)
}

export function LogDashboard({
  entries,
  message,
  isBusy,
  actionFeedback,
  onMessageChange,
  onSubmit,
}: LogDashboardProps) {
  const { language, t } = useI18n()
  const locale = language === 'en' ? 'en-US' : 'es-CR'

  return (
    <section className="panel-stack">
      <article className="card-group">
        <div className="section-title">
          <div>
            <h2>{t('log.title')}</h2>
            <span className="list-meta">{t('log.subtitle')}</span>
          </div>
        </div>

        <form className="panel-stack" onSubmit={onSubmit}>
          <label className="field">
            <span>{t('log.messageLabel')}</span>
            <textarea
              className="input textarea-input"
              rows={10}
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder={t('log.placeholder')}
            />
          </label>
          <div className="action-column">
            <button className="sync-btn" type="submit" disabled={isBusy || !message.trim()}>
              {isBusy ? t('log.saving') : t('log.save')}
            </button>
            <ActionFeedback
              message={actionFeedback?.target === 'log-create' ? actionFeedback.message : null}
              tone={actionFeedback?.tone}
            />
          </div>
        </form>
      </article>

      <article className="card-group">
        <div className="section-title">
          <h2>{t('log.historyTitle')}</h2>
          <span className="list-meta">{entries.length}</span>
        </div>

        {entries.length === 0 ? (
          <p className="empty">{t('log.empty')}</p>
        ) : (
          <div className="log-list">
            {entries.map((entry) => (
              <article className="log-entry-card" key={entry.log_id}>
                <div className="log-entry-meta">
                  <strong>{entry.autor_nombre}</strong>
                  <span>{entry.autor_email}</span>
                  <span>{formatTimestamp(entry.created_at, locale)}</span>
                </div>
                <p className="log-entry-message">{entry.mensaje}</p>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
