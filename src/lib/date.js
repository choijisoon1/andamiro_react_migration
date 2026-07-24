// 개인 일기의 record_date는 UTC 시각이 아니라 사용자가 보고 있는 현지 달력 날짜다.
export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
