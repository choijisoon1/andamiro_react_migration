import { useNavigate } from 'react-router-dom'

import './NoData.scss'

function NoData({
  title = '당신의 하루를 들려주길\n기다리고 있어요!',
  description = '작은 기록이 모여 당신의 마음 지도가 완성돼요.',
  buttonLabel = '',
  buttonTo = '/chat',
  wrapperClass = '',
  iconWrapperClass = '',
  iconBaseClass = 'no-data__icon',
  iconClass = '',
  ariaLabel = '데이터 없음 안내',
  onButtonClick,
}) {
  const navigate = useNavigate()
  const descriptionLines = description.split(/<br\s*\/?>/i)

  function handleButtonClick() {
    // 조회 오류 화면은 같은 디자인을 유지하면서 이동 대신 현재 Query를 다시 요청한다.
    if (onButtonClick) {
      onButtonClick()
      return
    }
    navigate(buttonTo)
  }

  return (
    <section
      className={`no-data${wrapperClass ? ` ${wrapperClass}` : ''}`}
      aria-label={ariaLabel}
    >
      <div>
        <div className="text-content">
          <span
            className={`no-data__icon-wrap${iconWrapperClass ? ` ${iconWrapperClass}` : ''}`}
            aria-hidden="true"
          >
            <span className={`${iconBaseClass}${iconClass ? ` ${iconClass}` : ''}`} />
          </span>
          <div className="text-group">
            <p><em className="no-data__title">{title}</em></p>
            <p>
              {descriptionLines.flatMap((line, index) => [
                index > 0 ? <br key={`break-${index}`} /> : null,
                line,
              ])}
            </p>
          </div>
          {buttonLabel && (
            <div className="btn-content">
              <button
                type="button"
                className="btn-sub"
                onClick={handleButtonClick}
              >
                {buttonLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default NoData
