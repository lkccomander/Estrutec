import { FiBell } from 'react-icons/fi'
import { HiOutlineExclamationTriangle } from 'react-icons/hi2'

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackProps = {
  message?: string | null
  tone?: FeedbackTone
}

export function ActionFeedback({ message, tone = 'info' }: ActionFeedbackProps) {
  if (!message) {
    return null
  }

  return (
    <p className={`action-feedback ${tone}`} role="status" aria-live="polite">
      <span className="action-feedback-icons" aria-hidden="true">
        {tone === 'warning' ? <HiOutlineExclamationTriangle /> : <FiBell />}
        {tone === 'success' ? <span className="action-feedback-check">✅</span> : null}
      </span>
      <span>{message}</span>
    </p>
  )
}
