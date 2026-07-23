function ModalButton({ title, description, icon, onClick }) {
  return (
    <button type="button" className="modal-button" onClick={onClick}>
      <span
        className={`modal-button__icon modal-button__icon--${icon}`}
        aria-hidden="true"
      />
      <span className="modal-button__text">
        <em>{title}</em>
        <span>{description}</span>
      </span>
    </button>
  )
}

export default ModalButton
