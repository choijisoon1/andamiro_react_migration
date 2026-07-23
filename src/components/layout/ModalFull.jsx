import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import './ModalFull.scss'

function ModalFull({
  show = false,
  title = '',
  modalClass = '',
  bodyClass = '',
  onClose,
  footer,
  children,
}) {
  const titleId = useId()

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
    <div className="modal-full-overlay">
      <div
        className={`modal-full${modalClass ? ` ${modalClass}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <div className="modal-full__head">
          {title && <h3 id={titleId} className="modal-full__title">{title}</h3>}
          <button type="button" className="modal-full__close" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className={`modal-full__body${bodyClass ? ` ${bodyClass}` : ''}`}>
          {children}
        </div>
        {footer && <div className="modal-full__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default ModalFull
