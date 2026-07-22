import './FormGroup.scss'

function FormGroup({ label = '', htmlFor = '', hint = '', error = '', children }) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={htmlFor} className="form-group__label">
          {label}
        </label>
      )}
      <div className="form-group__control">{children}</div>
      {error ? (
        <p className="form-group__error">{error}</p>
      ) : hint ? (
        <p className="form-group__hint">{hint}</p>
      ) : null}
    </div>
  )
}

export default FormGroup
