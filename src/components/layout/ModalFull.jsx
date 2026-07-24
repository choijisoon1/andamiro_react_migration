import { useEffect, useId, useState } from 'react'
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
  const [presence, setPresence] = useState({ show, leaving: false })

  if (presence.show !== show) {
    // Vue Transition의 leave 애니메이션이 끝날 때까지 Portal을 유지한다.
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
      className={`modal-full-overlay ${show ? 'is-entering' : 'is-leaving'}`}
      onAnimationEnd={(event) => {
        if (!show && event.target === event.currentTarget) {
          setPresence({ show: false, leaving: false })
        }
      }}
    >
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
