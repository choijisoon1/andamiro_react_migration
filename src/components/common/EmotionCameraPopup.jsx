import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as faceapi from 'face-api.js'

import './EmotionCameraPopup.scss'

const MODEL_URL = '/models'
const MODEL_LOAD_ERROR_MESSAGE = '표정 분석 모델을 불러오지 못했어요. 모델 파일을 확인해 주세요.'
const CAPTURE_MAX_WIDTH = 720
const CAPTURE_MAX_HEIGHT = 960
const CAPTURE_QUALITY = 0.72
const EXPRESSION_LABELS = {
  happy: '행복',
  neutral: '무표정',
  sad: '슬픔',
  surprised: '놀람',
  angry: '분노',
  fearful: '공포',
  disgusted: '혐오',
}
const EXPRESSION_COLORS = {
  happy: '#22C55E',
  neutral: '#9CA3AF',
  sad: '#4B82F5',
  surprised: '#F59E0B',
  fearful: '#A78BFA',
  angry: '#EF4444',
  disgusted: '#6B7280',
}
const EXPRESSION_ORDER = ['happy', 'neutral', 'sad', 'surprised', 'angry', 'fearful', 'disgusted']

// face-api 모델은 팝업을 다시 열 때 재다운로드하지 않도록 모듈 단위 Promise로 공유한다.
let modelsPromise = null

function createEmptyExpressions() {
  return EXPRESSION_ORDER.reduce((result, key) => {
    result[key] = 0
    return result
  }, {})
}

function normalizeExpressions(source) {
  return EXPRESSION_ORDER.reduce((result, key) => {
    result[key] = Number(source?.[key] ?? 0)
    return result
  }, {})
}

function getTopExpression(items) {
  return items.reduce((top, item) => (item.value > top.value ? item : top), items[0])
}

function EmotionCameraPopup({ show = false, onClose, onComplete }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectTimerRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const isStartingRef = useRef(false)
  const hasHistoryEntryRef = useRef(false)
  const startTokenRef = useRef(0)
  const [modelsReady, setModelsReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [modelError, setModelError] = useState('')
  const [expressions, setExpressions] = useState(createEmptyExpressions)
  const [faceBox, setFaceBox] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const expressionItems = useMemo(() => EXPRESSION_ORDER.map((key) => ({
    key,
    label: EXPRESSION_LABELS[key],
    color: EXPRESSION_COLORS[key] ?? EXPRESSION_COLORS.disgusted,
    value: expressions[key] ?? 0,
    percent: Math.round((expressions[key] ?? 0) * 100),
  })), [expressions])

  const recordingTimeText = useMemo(() => {
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
    const seconds = String(elapsedSeconds % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [elapsedSeconds])

  function resetAnalysis() {
    setModelsReady(false)
    setCameraReady(false)
    setIsDetecting(false)
    setCameraError('')
    setModelError('')
    setExpressions(createEmptyExpressions())
    setFaceBox(null)
    setElapsedSeconds(0)
  }

  function stopRecordingTimer() {
    if (!recordingTimerRef.current) return
    window.clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }

  function stopAnalysisLoop() {
    if (detectTimerRef.current) {
      window.clearInterval(detectTimerRef.current)
      detectTimerRef.current = null
    }
    setIsDetecting(false)
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
  }

  function stop() {
    startTokenRef.current += 1
    isStartingRef.current = false
    stopRecordingTimer()
    stopAnalysisLoop()
    stopStream()
    resetAnalysis()
  }

  function unbindBackButton() {
    if (!hasHistoryEntryRef.current) return
    window.removeEventListener('popstate', handleBackButton)
    hasHistoryEntryRef.current = false
  }

  function handleBackButton() {
    stop()
    unbindBackButton()
    onClose?.()
  }

  function bindBackButton() {
    if (hasHistoryEntryRef.current) return

    // React 개발 모드의 effect 재실행에서도 팝업용 history가 중복으로 쌓이지 않게 한다.
    if (!window.history.state?.emotionCameraPopup) {
      window.history.pushState({ ...window.history.state, emotionCameraPopup: true }, '')
    }
    window.addEventListener('popstate', handleBackButton)
    hasHistoryEntryRef.current = true
  }

  function startRecordingTimer() {
    stopRecordingTimer()
    setElapsedSeconds(0)
    const startedAt = Date.now()
    recordingTimerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
  }

  async function loadModels() {
    setModelError('')
    if (!modelsPromise) {
      modelsPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ])
    }

    try {
      await modelsPromise
      setModelsReady(true)
      return true
    } catch (error) {
      console.error('표정 분석 모델 로딩 실패:', error)
      modelsPromise = null
      setModelsReady(false)
      setModelError(MODEL_LOAD_ERROR_MESSAGE)
      return false
    }
  }

  async function startCamera(token) {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('이 브라우저에서는 카메라를 사용할 수 없어요.')
      return false
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      if (token !== startTokenRef.current) {
        nextStream.getTracks().forEach((track) => track.stop())
        return false
      }

      streamRef.current = nextStream
      if (!videoRef.current) {
        stopStream()
        setCameraError('카메라 화면을 준비하지 못했어요.')
        return false
      }

      videoRef.current.srcObject = nextStream
      await videoRef.current.play()
      if (token !== startTokenRef.current) return false

      setCameraReady(true)
      return true
    } catch (error) {
      console.error('카메라 실행 실패:', error)
      if (token !== startTokenRef.current) return false

      stopStream()
      setCameraReady(false)
      if (error.name === 'NotAllowedError') {
        setCameraError('카메라 권한이 필요합니다.')
      } else if (error.name === 'NotFoundError') {
        setCameraError('사용 가능한 카메라를 찾을 수 없어요.')
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setCameraError('카메라는 HTTPS 환경에서만 사용할 수 있어요.')
      } else {
        setCameraError('카메라를 실행하지 못했어요.')
      }
      return false
    }
  }

  function getDisplayBox(box, video) {
    const videoWidth = video.videoWidth || 1
    const videoHeight = video.videoHeight || 1
    const elementWidth = video.clientWidth || videoWidth
    const elementHeight = video.clientHeight || videoHeight
    const videoRatio = videoWidth / videoHeight
    const elementRatio = elementWidth / elementHeight
    let scale = elementHeight / videoHeight
    let offsetX = (elementWidth - videoWidth * scale) / 2
    let offsetY = 0

    if (elementRatio > videoRatio) {
      scale = elementWidth / videoWidth
      offsetX = 0
      offsetY = (elementHeight - videoHeight * scale) / 2
    }

    return {
      left: offsetX + (videoWidth - box.x - box.width) * scale,
      top: offsetY + box.y * scale,
      width: box.width * scale,
      height: box.height * scale,
    }
  }

  async function detectFace() {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceExpressions()

      if (!result) {
        setFaceBox(null)
        return
      }

      setExpressions(normalizeExpressions(result.expressions))
      setFaceBox(getDisplayBox(result.detection.box, video))
    } catch (error) {
      console.error('표정 분석 실패:', error)
    }
  }

  function startAnalysisLoop() {
    if (!videoRef.current) return
    stopAnalysisLoop()
    setIsDetecting(true)
    detectTimerRef.current = window.setInterval(detectFace, 250)
  }

  async function start() {
    if (isStartingRef.current) return
    const token = startTokenRef.current + 1
    startTokenRef.current = token
    isStartingRef.current = true
    resetAnalysis()

    try {
      const didStartCamera = await startCamera(token)
      if (!didStartCamera || token !== startTokenRef.current) return

      startRecordingTimer()
      const didLoadModels = await loadModels()
      if (!didLoadModels || token !== startTokenRef.current) return

      startAnalysisLoop()
    } finally {
      if (token === startTokenRef.current) isStartingRef.current = false
    }
  }

  useEffect(() => {
    if (!show) return undefined
    bindBackButton()
    start()

    return () => {
      stop()
      unbindBackButton()
    }
    // Vue의 show watcher와 같은 열기/정리 생명주기이며 콜백 변경으로 카메라를 재시작하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  function restart() {
    stop()
    window.requestAnimationFrame(start)
  }

  function captureCompressedFrame() {
    const video = videoRef.current
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return Promise.resolve(null)
    }

    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    const scale = Math.min(1, CAPTURE_MAX_WIDTH / sourceWidth, CAPTURE_MAX_HEIGHT / sourceHeight)
    const width = Math.round(sourceWidth * scale)
    const height = Math.round(sourceHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return Promise.resolve(null)

    context.translate(width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve({
            url: dataUrl,
            dataUrl,
            meta: { width, height, size: 0, type: 'image/jpeg' },
          })
          return
        }

        resolve({
          url: URL.createObjectURL(blob),
          dataUrl,
          meta: { width, height, size: blob.size, type: blob.type },
        })
      }, 'image/jpeg', CAPTURE_QUALITY)
    })
  }

  function close() {
    stop()
    const shouldPopHistory = hasHistoryEntryRef.current
      && window.history.state?.emotionCameraPopup
    unbindBackButton()
    if (shouldPopHistory) window.history.back()
    onClose?.()
  }

  async function complete() {
    const top = getTopExpression(expressionItems)
    const capture = await captureCompressedFrame()
    onComplete?.({
      emotion: top.key,
      emotionLabel: top.label,
      score: top.value,
      expressions: { ...expressions },
      capturedImageUrl: capture?.url ?? capture?.dataUrl ?? '',
      capturedImageDataUrl: capture?.dataUrl ?? capture?.url ?? '',
      capturedImageMeta: capture?.meta ?? null,
    })
    close()
  }

  if (!show) return null

  return createPortal(
    <section
      className="emotion-camera"
      role="dialog"
      aria-modal="true"
      aria-label="실시간 표정 분석"
    >
      <header className="emotion-camera__header">
        <button type="button" className="emotion-camera__close" aria-label="닫기" onClick={close}>
          닫기
        </button>
      </header>
      <div className="emotion-camera__stage" style={{ background: '#fff' }}>
        {cameraError && <p className="emotion-camera__error">{cameraError}</p>}
        {modelError && <p className="emotion-camera__notice">{modelError}</p>}
        {cameraReady && (
          <div className="emotion-camera__status">
            <div className="emotion-camera__status-pill">
              <span className="emotion-camera__status-dot emotion-camera__status-dot--recording" />
              <span>{recordingTimeText}</span>
            </div>
            <div className="emotion-camera__status-pill emotion-camera__status-pill--ai">
              <span className="emotion-camera__status-dot emotion-camera__status-dot--ai" />
              <span>AI 분석 중</span>
            </div>
          </div>
        )}
        {!cameraError && (
          <video
            ref={videoRef}
            className="camera-video emotion-camera__video"
            autoPlay
            muted
            playsInline
          />
        )}
        {faceBox ? (
          <div
            className="emotion-camera__face-box"
            style={{
              left: `${faceBox.left}px`,
              top: `${faceBox.top}px`,
              width: `${faceBox.width}px`,
              height: `${faceBox.height}px`,
            }}
            aria-hidden="true"
          />
        ) : (
          <div className="emotion-camera__guide" aria-hidden="true" />
        )}
      </div>

      <div className="emotion-camera__panel">
        <ul className="emotion-camera__bars" aria-label="실시간 표정 분석 결과">
          <h4>실시간 표정 분석</h4>
          {expressionItems.map((item) => (
            <li key={item.key} className="emotion-camera__bar">
              <span className="emotion-camera__bar-label">{item.label}</span>
              <span className="emotion-camera__bar-track" aria-hidden="true">
                <span
                  className="emotion-camera__bar-fill"
                  style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                />
              </span>
              <span className="emotion-camera__bar-value">{item.percent}%</span>
            </li>
          ))}
        </ul>

        <div className="button-content--duo">
          <button type="button" className="btn-ctp--secondary" onClick={restart}>다시 녹화</button>
          <button
            type="button"
            className="btn-ctp"
            disabled={!modelsReady || !cameraReady || !isDetecting}
            onClick={complete}
          >
            기록완료
          </button>
        </div>
      </div>
    </section>,
    document.body,
  )
}

export default EmotionCameraPopup
