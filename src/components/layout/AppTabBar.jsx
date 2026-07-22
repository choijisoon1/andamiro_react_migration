import { NavLink } from 'react-router-dom'

import './AppTabBar.scss'

const TABS = [
  { to: '/main', label: '홈', icon: 'home' },
  { to: '/report', label: '리포트', icon: 'report' },
  { to: '/advice', label: '조언', icon: 'advice' },
  { to: '/my', label: '마이', icon: 'my' },
]

function AppTabBar() {
  return (
    <footer className="tabbar">
      <nav className="tabbar__inner" aria-label="주요 메뉴">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) => (
              `tabbar__item${isActive ? ' is-active' : ''}`
            )}
          >
            <span className="tabbar__icon" data-icon={tab.icon} />
            <span className="tabbar__label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </footer>
  )
}

export default AppTabBar
