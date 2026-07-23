import { useEffect, useRef } from 'react'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { LegacyGridContainLabel } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([CanvasRenderer, BarChart, GridComponent, LegacyGridContainLabel])

function EChart({ option, className = '', ariaLabel = '차트' }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const chart = echarts.init(container)
    chartRef.current = chart

    // vue-echarts의 autoresize와 같은 역할을 React에서 직접 처리한다.
    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  )
}

export default EChart
