import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import './ModalBottom.scss'

function ModalBottom({
  show = false,
  icon = '',
  title = '',
  titleClass = '',
  description = '',
  cancelLabel = '',
  confirmLabel = '확인',
  onClose,
  onConfirm,
  footer,
  children,
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!show) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, show])

  if (!show) return null

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className="modal-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="modal-bottom__body">
          {icon && <span className="modal-bottom__icon">{icon}</span>}
          {title && (
            <strong
              id={titleId}
              className={`modal-bottom__title${titleClass ? ` ${titleClass}` : ''}`}
            >
              {title}
            </strong>
          )}
          {description && (
            <p id={descriptionId} className="modal-bottom__desc">{description}</p>
          )}
          {children}
        </div>
        <div className="modal-bottom__footer">
          {footer ?? (
            <>
              {cancelLabel && (
                <button
                  type="button"
                  className="btn-ctp btn-ctp--secondary"
                  onClick={onClose}
                >
                  {cancelLabel}
                </button>
              )}
              <button type="button" className="btn-ctp" onClick={onConfirm}>
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ModalBottom
