import NoData from './NoData'

function QueryError({
  onRetry,
  title = '데이터를 불러오지 못했어요',
  description = '잠시 후 다시 시도해 주세요.',
  wrapperClass = '',
}) {
  // 빈 데이터용 기존 UI를 재사용하되 문구와 동작을 분리해 서버 오류임을 명확히 알린다.
  return (
    <NoData
      title={title}
      description={description}
      buttonLabel="다시 시도하기"
      wrapperClass={wrapperClass}
      ariaLabel="데이터 조회 오류 안내"
      onButtonClick={onRetry}
    />
  )
}

export default QueryError
