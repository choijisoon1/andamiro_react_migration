import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import FormGroup from '@/components/common/FormGroup'
import FooterCtp from '@/components/layout/FooterCtp'
import PageLayout from '@/components/layout/PageLayout'
import { supabase } from '@/lib/supabase'
import { useCreateExchangePostMutation } from '@/queries/exchangeQueries'

import './WriteView.scss'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif']

function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = image

      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width)
          width = maxPx
        } else {
          width = Math.round((width * maxPx) / height)
          height = maxPx
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(image, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(
          blob
            ? new File([blob], file.name, { type: 'image/jpeg' })
            : file,
        ),
        'image/jpeg',
        quality,
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    image.src = url
  })
}

function WriteView() {
  const location = useLocation()
  const navigate = useNavigate()
  const createPost = useCreateExchangePostMutation()
  const clientRequestIdRef = useRef(crypto.randomUUID())
  const polishRequestRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [imageError, setImageError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [contentError, setContentError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [saveError, setSaveError] = useState('')

  const isAiDiary = new URLSearchParams(location.search).get('source') === 'ai'
  const summary = location.state?.summary ?? ''

  useEffect(() => {
    if (!summary) return undefined

    let cancelled = false

    async function polishContent() {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return summary

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: '사용자의 채팅 요약을 받아 마치 본인이 오늘 하루를 직접 쓴 것처럼 1인칭 감성 일기체로 다듬어 주세요. 2~3문장마다 자연스럽게 줄바꿈(\\n)을 넣어 읽기 편하게 작성하세요. 설명이나 부연 없이 일기 본문만 반환하세요.',
          messages: [{ role: 'user', content: summary }],
        }),
      })
      const data = await response.json()
      return data?.content?.[0]?.text?.trim() || summary
    }

    // 개발 모드의 effect 재실행에서도 같은 AI 다듬기 요청을 공유한다.
    if (!polishRequestRef.current) {
      setPolishing(true)
      polishRequestRef.current = polishContent().catch(() => summary)
    }

    polishRequestRef.current.then((polishedContent) => {
      if (cancelled) return
      setContent(polishedContent)
      setPolishing(false)
    })

    return () => {
      cancelled = true
    }
  }, [summary])

  useEffect(() => (
    () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  ), [imagePreview])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('jpg, png, gif 파일만 등록할 수 있어요.')
      event.target.value = ''
      return
    }

    setImageError('')
    setImagePreview(URL.createObjectURL(file))
    // GIF는 애니메이션이 사라지지 않도록 원본을 사용한다.
    setImageFile(
      file.type === 'image/gif' ? file : await compressImage(file),
    )
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview('')
  }

  async function handleSave() {
    setTitleError('')
    setContentError('')
    setPasswordError('')
    setSaveError('')

    if (!title.trim()) {
      setTitleError('제목을 입력해 주세요.')
      return
    }
    if (!content.trim()) {
      setContentError('내용을 입력해 주세요.')
      return
    }
    if (!password.trim()) {
      setPasswordError('비밀번호를 입력해 주세요.')
      return
    }

    try {
      // 서버 데이터 생성과 관련 Query 캐시 갱신은 TanStack Query가 담당한다.
      const result = await createPost.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        imageFile,
        password: password.trim() || null,
        clientRequestId: clientRequestIdRef.current,
      })

      if (result?.id) {
        const shareUrl = `${window.location.origin}/exchange/join?token=${result.invitation_token}`
        navigate(`/exchange/view/${result.id}`, {
          replace: true,
          state: { justCreated: true, shareUrl },
        })
      } else {
        navigate('/exchange', { replace: true })
      }
    } catch (error) {
      setSaveError(error?.message || '저장에 실패했어요.')
    }
  }

  return (
    <PageLayout
      title="공유일기 만들기"
      backTo="/exchange"
      mainClassName="write-body"
      footer={(
        <FooterCtp
          label={createPost.isPending ? '저장 중…' : '완료'}
          disabled={createPost.isPending}
          onClick={handleSave}
        />
      )}
    >
      {isAiDiary && (
        <section className="badge-content">
          <p className="badge-info">✦ AI가 오늘의 일기를 작성했어요</p>
        </section>
      )}

      <section className="form-content">
        <FormGroup label="이미지" error={imageError}>
          {imagePreview ? (
            <div className="write-img-preview">
              <img src={imagePreview} alt="미리보기" />
              <button
                type="button"
                className="write-img-remove"
                onClick={removeImage}
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="write-img-add">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif"
                className="write-file-input"
                onChange={handleFileChange}
              />
              <span className="write-img-add__icon">+</span>
            </label>
          )}
        </FormGroup>

        <FormGroup label="제목" htmlFor="write-title" error={titleError}>
          <input
            id="write-title"
            className="write-input"
            type="text"
            placeholder="제목을 입력해 주세요"
            maxLength={60}
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormGroup>

        <FormGroup label="내용" htmlFor="write-content" error={contentError}>
          {polishing ? (
            <div className="write-skeleton" />
          ) : (
            <textarea
              id="write-content"
              className="write-textarea"
              placeholder="오늘의 채팅 내용을 요약해 주세요"
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
        </FormGroup>

        <FormGroup
          label="비밀번호"
          htmlFor="write-password"
          hint="초대받은 상대방에게 비밀번호를 알려주세요"
          error={passwordError}
        >
          <div className="write-pw-wrap">
            <input
              id="write-password"
              className="write-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호를 입력해 주세요"
              maxLength={20}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="write-pw-eye"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </FormGroup>

        {saveError && (
          <p className="write-error" role="alert">{saveError}</p>
        )}
      </section>
    </PageLayout>
  )
}

export default WriteView
