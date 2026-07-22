import { useNavigate } from 'react-router-dom'

function PageLayout({
  title = '',
  backTo = '',
  actionLabel = '',
  bodyClass = '',
  hideHeader = false,
  hideBack = false,
  hideRight = false,
  interceptBack = false,
  onAction,
  onBack,
  action,
  footer,
  children,
}) {
  const navigate = useNavigate()

  function goBack() {
    if (interceptBack) {
      onBack?.()
      return
    }
    if (backTo) navigate(backTo)
    else navigate(-1)
  }

  const headerClasses = [
    'header',
    hideBack ? 'header--no-back' : '',
    hideRight ? 'header--no-right' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="wrap">
      {!hideHeader && (
        <div id="headerWrap">
          <header id="header" className={headerClasses}>
            {!hideBack ? (
              <button
                type="button"
                className="header__back"
                aria-label="뒤로"
                onClick={goBack}
              >
                <span className="header__back-icon" />
              </button>
            ) : (
              <span className="header__back" />
            )}

            <h1 className="header__title"><span>{title}</span></h1>

            {!hideRight && (
              <div className="header__right">
                {action ?? (actionLabel ? (
                  <button
                    type="button"
                    className="header__action"
                    onClick={onAction}
                  >
                    {actionLabel}
                  </button>
                ) : null)}
              </div>
            )}
          </header>
        </div>
      )}

      <div id="bodyWrap" className={bodyClass}>
        <main>{children}</main>
        {footer}
      </div>
    </div>
  )
}

export default PageLayout
