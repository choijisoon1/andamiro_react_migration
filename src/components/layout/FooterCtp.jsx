function FooterCtp({
  label = '다음',
  disabled = false,
  secondaryLabel = '',
  secondaryDisabled = false,
  onClick,
  onSecondaryClick,
  above,
}) {
  return (
    <footer className="button-ctp">
      <div className={`button-content${secondaryLabel ? ' button-content--duo' : ''}`}>
        {above}
        {secondaryLabel && (
          <button
            type="button"
            className="btn-ctp btn-ctp--secondary"
            disabled={secondaryDisabled}
            onClick={onSecondaryClick}
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          className="btn-ctp"
          disabled={disabled}
          onClick={onClick}
        >
          {label}
        </button>
      </div>
    </footer>
  )
}

export default FooterCtp
