import FormGroup from '@/components/common/FormGroup'
import './ProfileForm.scss'

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대 이상']
const GENDERS = [
  { value: '남성', image: '/assets/img/login/img-m.png' },
  { value: '여성', image: '/assets/img/login/img-w.png' },
]

function ProfileForm({
  nickname = '',
  ageGroup = '',
  gender = '',
  fields = ['nickname', 'ageGroup', 'gender'],
  showLabels = false,
  idPrefix = 'profile',
  onNicknameChange,
  onAgeGroupChange,
  onGenderChange,
  onNicknameSubmit,
}) {
  const includes = (field) => fields.includes(field)

  return (
    <div className="form-content profile-form">
      {includes('nickname') && (
        <FormGroup
          label={showLabels ? '닉네임' : ''}
          htmlFor={`${idPrefix}Nickname`}
        >
          <div className="profile-form__input-wrap">
            {!showLabels && (
              <label className="sr-only" htmlFor={`${idPrefix}Nickname`}>
                닉네임
              </label>
            )}
            <input
              id={`${idPrefix}Nickname`}
              value={nickname}
              type="text"
              placeholder="닉네임"
              maxLength={10}
              onChange={(event) => onNicknameChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onNicknameSubmit?.()
              }}
            />
            <span className="input-count">{nickname.length}/10</span>
          </div>
        </FormGroup>
      )}

      {includes('ageGroup') && (
        <FormGroup label={showLabels ? '연령대' : ''}>
          <fieldset className="tyep-button">
            <legend className="sr-only">연령대 선택</legend>
            {AGE_GROUPS.map((age) => {
              const inputId = `${idPrefix}Age${age}`
              return (
                <label key={age} className="radio" htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="radio"
                    name={`${idPrefix}Age`}
                    value={age}
                    checked={ageGroup === age}
                    onChange={() => onAgeGroupChange?.(age)}
                  />
                  <span>{age}</span>
                </label>
              )
            })}
          </fieldset>
        </FormGroup>
      )}

      {includes('gender') && (
        <FormGroup label={showLabels ? '성별' : ''}>
          <fieldset className="tyep-button ico">
            <legend className="sr-only">성별 선택</legend>
            {GENDERS.map((item) => {
              const inputId = `${idPrefix}Gender${item.value}`
              return (
                <label key={item.value} className="radio" htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="radio"
                    name={`${idPrefix}Gender`}
                    value={item.value}
                    checked={gender === item.value}
                    onChange={() => onGenderChange?.(item.value)}
                  />
                  <div className="radio-face">
                    <img src={item.image} alt={item.value} />
                    <span className="radio-text">{item.value}</span>
                  </div>
                </label>
              )
            })}
          </fieldset>
        </FormGroup>
      )}
    </div>
  )
}

export default ProfileForm
