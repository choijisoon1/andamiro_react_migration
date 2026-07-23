function FooterText({
  subText = '',
  mainText = '',
  label = '시작하기',
  disabled = false,
  pointer = false,
  pointerVisible = false,
  onClick,
}) {
  // Vue의 동적 <component>와 동일한 DOM 구조를 유지해 기존 _chat.scss를 그대로 사용한다.
  const Content = pointer ? 'section' : 'div'

  return (
    <footer className={pointer ? undefined : 'button-ctp'}>
      {pointer && (
        <div
          className={`emotion-footer-pointer${pointerVisible ? ' is-visible' : ''}`}
          aria-hidden="true"
        />
      )}
      <Content className={pointer ? 'btn-content' : 'button-content'}>
        <div className="text-group">
          <p>{subText}</p>
          <p>{mainText}</p>
        </div>
        <button type="button" className="btn-ctp" disabled={disabled} onClick={onClick}>
          {label}
        </button>
      </Content>
    </footer>
  )
}

export default FooterText
