import { useEffect, useId, useState } from 'react'
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
  const [presence, setPresence] = useState({ show, leaving: false })

  if (presence.show !== show) {
    // Vue Transition처럼 show=false가 된 한 프레임 뒤까지 Portal을 유지한다.
    setPresence({ show, leaving: !show })
  }

  useEffect(() => {
    if (!show) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, show])

  if (!show && !presence.leaving) return null

  return createPortal(
    <div
      className={`modal-overlay ${show ? 'is-entering' : 'is-leaving'}`}
      onAnimationEnd={(event) => {
        if (!show && event.target === event.currentTarget) {
          setPresence({ show: false, leaving: false })
        }
      }}
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
