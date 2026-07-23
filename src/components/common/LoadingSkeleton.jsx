import './LoadingSkeleton.scss'

function LoadingSkeleton({ type = 'list', count = 3 }) {
  const isExchangeList = type === 'exchange-list' || type === 'list'

  return (
    <section
      className={`loading-skeleton loading-skeleton--${type}`}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={`${type}-${index + 1}`} className="loading-skeleton__item">
          {isExchangeList && (
            <>
              <span className="loading-skeleton__thumb" />
              <div className="loading-skeleton__body">
                <span className="loading-skeleton__line loading-skeleton__line--title" />
                <span className="loading-skeleton__line loading-skeleton__line--meta" />
                <span className="loading-skeleton__line loading-skeleton__line--short" />
              </div>
              <span className="loading-skeleton__action" />
            </>
          )}

          {type === 'card' && (
            <div className="loading-skeleton__card">
              <span className="loading-skeleton__line loading-skeleton__line--title" />
              <span className="loading-skeleton__line loading-skeleton__line--meta" />
              <span className="loading-skeleton__line loading-skeleton__line--meta" />
              <span className="loading-skeleton__line loading-skeleton__line--short" />
            </div>
          )}

          {type === 'result' && (
            <div className="loading-skeleton__result">
              <span className="loading-skeleton__result-hero" />
              <span className="loading-skeleton__line loading-skeleton__line--title" />
              <span className="loading-skeleton__line loading-skeleton__line--meta" />
              <span className="loading-skeleton__line loading-skeleton__line--short" />
            </div>
          )}

          {!isExchangeList && type !== 'card' && type !== 'result' && (
            <div className="loading-skeleton__card">
              <span className="loading-skeleton__line loading-skeleton__line--title" />
              <span className="loading-skeleton__line loading-skeleton__line--meta" />
              <span className="loading-skeleton__line loading-skeleton__line--short" />
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

export default LoadingSkeleton
