import { useId } from 'react'

import './SvgGauge.scss'

// 기존 Vue 게이지와 동일한 240×168 좌표와 260° 호 계산을 사용한다.
const CX = 120
const CY = 84
const R = 74
const CIRCUMFERENCE = 2 * Math.PI * R
const TRACK = CIRCUMFERENCE * (260 / 360)
const GAP = CIRCUMFERENCE - TRACK

function SvgGauge({ score = 0, colorFrom = '#6ee7c0', colorTo = '#059669' }) {
  const reactId = useId()
  const gradientId = `svg-gauge-${reactId.replaceAll(':', '')}`
  const progressLength = TRACK * (score / 100)
  const progressGap = CIRCUMFERENCE - progressLength

  return (
    <svg viewBox="0 0 240 168" className="svg-gauge" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
      </defs>

      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="#EFF2F3"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${TRACK} ${GAP}`}
        transform={`rotate(140 ${CX} ${CY})`}
      />
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${progressLength} ${progressGap}`}
        transform={`rotate(140 ${CX} ${CY})`}
        className="svg-gauge__arc"
      />
    </svg>
  )
}

export default SvgGauge
