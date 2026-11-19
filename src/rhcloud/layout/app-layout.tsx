import { type ReactNode } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router'

import logo from '@/assets/image/rhcloud-logo.png'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useVisibility } from '@/hooks/use-visibility'
import parseTraffic from '@/utils/parse-traffic'
import { version } from '@root/package.json'

import { useAutoSync } from '../hooks'
import { hasFreshSession } from '../storage'
import { useRhTokens } from '../theme'

const icon = (paths: ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

const NAV_ITEMS = [
  {
    to: '/',
    label: '首页',
    icon: icon(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>,
    ),
  },
  {
    to: '/nodes',
    label: '节点',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
      </>,
    ),
  },
  {
    to: '/settings',
    label: '设置',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </>,
    ),
  },
]

const SpeedRow = ({ label, value }: { label: string; value: number }) => {
  const t = useRhTokens()
  const [num, unit] = parseTraffic(value)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: t.text }}>
        {num} {unit}/s
      </span>
    </div>
  )
}

/** Sidebar + content for signed-in screens; anyone without a session lands on /login. */
export const AppLayout = () => {
  const t = useRhTokens()
  const visible = useVisibility()
  const {
    response: { data: traffic },
  } = useTrafficData({ enabled: visible })
  useAutoSync()

  if (!hasFreshSession()) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <nav
        aria-label="主导航"
        style={{
          width: 208,
          flexShrink: 0,
          boxSizing: 'border-box',
          padding: '20px 14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: t.side,
          borderRight: `1px solid ${t.border}`,
        }}
      >
        <div
          data-tauri-drag-region="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 8px 22px',
          }}
        >
          <img
            src={logo}
            alt=""
            style={{ width: 44, height: 27, objectFit: 'contain' }}
          />
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>
            RHCloud
          </span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              height: 44,
              padding: '0 14px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: isActive ? 600 : 500,
              background: isActive ? t.navActive : 'transparent',
              color: isActive ? t.navActiveText : t.text2,
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        <div style={{ flexGrow: 1 }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '14px 10px 0',
            borderTop: `1px solid ${t.border}`,
            fontSize: 13,
            color: t.text2,
          }}
        >
          <SpeedRow label="上传" value={traffic?.up ?? 0} />
          <SpeedRow label="下载" value={traffic?.down ?? 0} />
          <div style={{ paddingTop: 4, fontSize: 12 }}>版本 {version}</div>
        </div>
      </nav>
      <main
        style={{
          flex: 1,
          minWidth: 0,
          boxSizing: 'border-box',
          padding: '44px 28px 24px',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
