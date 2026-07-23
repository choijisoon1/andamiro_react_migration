import './TabMenu.scss'

function TabMenu({ tabs, value, onChange }) {
  return (
    <section className="tab-menu">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tab-menu__item${value === tab.key ? ' is-active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </section>
  )
}

export default TabMenu
