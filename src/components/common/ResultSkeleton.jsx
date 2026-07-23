import './ResultSkeleton.scss'

function ResultSkeleton() {
  return (
    <div className="result-skeleton">
      <section className="importance-content">
        <div className="text-content">
          <div className="text-group">
            <span className="sk sk--text-sm" />
            <span className="sk sk--text-md" />
          </div>
        </div>
        <div className="grap-content">
          <div className="sk-gauge-wrap">
            <div className="sk sk--gauge-ring" />
            <div className="sk-gauge-center">
              <span className="sk sk--gauge-label" />
              <span className="sk sk--gauge-score" />
              <span className="sk sk--gauge-unit" />
            </div>
          </div>
          <div className="sk-score-list">
            {[1, 2, 3, 4].map((number) => (
              <div key={number} className="sk-score-item">
                <span className="sk sk--score-val" />
                <span className="sk sk--score-bar" />
                <span className="sk sk--score-label" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card-content">
        <div className="card-item">
          <div className="sk-card-header">
            <span className="sk sk--icon" />
            <span className="sk sk--card-title" />
          </div>
          <span className="sk sk--line-full" />
          <span className="sk sk--line-full" />
          <span className="sk sk--line-three-quarter" />
          <div className="sk-card-tips">
            <span className="sk sk--badge" />
            <span className="sk sk--line-full" />
            <span className="sk sk--line-half" />
          </div>
        </div>

        <div className="card-item">
          <div className="sk-card-header">
            <span className="sk sk--icon" />
            <span className="sk sk--card-title" />
          </div>
          {[1, 2].map((number) => (
            <div key={number} className="sk-reco-item">
              <span className="sk sk--reco-num" />
              <div className="sk-reco-lines">
                <span className="sk sk--reco-title" />
                <span className="sk sk--line-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ResultSkeleton
