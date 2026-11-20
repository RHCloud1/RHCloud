import { useLockFn } from 'ahooks'
import { type ReactNode } from 'react'

import { useServiceInstaller } from '@/hooks/use-service-installer'
import { useServiceUninstaller } from '@/hooks/use-service-uninstaller'
import { useSystemState } from '@/hooks/use-system-state'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'
import { openExternalUrl } from '@/utils/open-external-url'

import { panelUrls } from '../api'
import {
  Button,
  Card,
  LinkButton,
  PageHeader,
  SwitchRow,
} from '../components/ui'
import { useCloud } from '../hooks'
import { storage } from '../storage'
import { SIZE, useRhTokens } from '../theme'

const THEMES = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
] as const

const Section = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => {
  const t = useRhTokens()
  return (
    <Card label={title} style={{ paddingTop: SIZE.pad - 4, paddingBottom: 4 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: t.text2,
        }}
      >
        {title}
      </h2>
      {children}
    </Card>
  )
}

const Row = ({
  title,
  children,
  divider,
}: {
  title: ReactNode
  children: ReactNode
  divider?: boolean
}) => {
  const t = useRhTokens()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: SIZE.row,
        borderBottom: divider ? `1px solid ${t.divider}` : undefined,
      }}
    >
      <div style={{ fontSize: 15, minWidth: 0 }}>{title}</div>
      {children}
    </div>
  )
}

const SettingsPage = () => {
  const t = useRhTokens()
  const { verge, patchVerge } = useVerge()
  const { runState, isServiceMode } = useSystemState()
  const { installServiceAndRestartCore } = useServiceInstaller()
  const { uninstallServiceAndStartSidecar } = useServiceUninstaller()
  const { logout } = useCloud()

  const patch = (value: Partial<IVergeConfig>) =>
    patchVerge(value).catch((error) => showNotice.error(error))

  const install = useLockFn(async () => {
    await installServiceAndRestartCore().catch(() => {})
  })
  const uninstall = useLockFn(async () => {
    await uninstallServiceAndStartSidecar().catch((error) =>
      showNotice.error(error),
    )
  })
  const onLogout = useLockFn(logout)

  const themeMode = verge?.theme_mode ?? 'system'

  return (
    <>
      <PageHeader title="设置" />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SIZE.gap,
          maxWidth: 760,
        }}
      >
        <Section title="常规">
          <SwitchRow
            title="开机自动启动"
            checked={Boolean(verge?.enable_auto_launch)}
            onChange={(value) => void patch({ enable_auto_launch: value })}
            divider
          />
          <SwitchRow
            title="启动时隐藏窗口"
            description="开机启动后只在托盘显示图标"
            checked={Boolean(verge?.enable_silent_start)}
            onChange={(value) => void patch({ enable_silent_start: value })}
            divider
          />
          <Row title="外观">
            <div
              role="group"
              aria-label="外观"
              style={{
                display: 'flex',
                height: SIZE.control,
                boxSizing: 'border-box',
                padding: 3,
                borderRadius: SIZE.controlRadius,
                background: t.track,
              }}
            >
              {THEMES.map((theme) => {
                const active = themeMode === theme.value
                return (
                  <button
                    key={theme.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void patch({ theme_mode: theme.value })}
                    style={{
                      height: SIZE.control - 6,
                      minWidth: 72,
                      padding: '0 12px',
                      border: 0,
                      borderRadius: SIZE.controlRadius - 3,
                      font: 'inherit',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontWeight: active ? 600 : 400,
                      background: active ? t.surface : 'transparent',
                      color: active ? t.link : t.text2,
                      boxShadow: active
                        ? '0 1px 2px rgba(15,35,60,0.12)'
                        : 'none',
                    }}
                  >
                    {theme.label}
                  </button>
                )
              })}
            </div>
          </Row>
        </Section>

        <Section title="TUN 服务">
          <Row
            title={
              <>
                <div>
                  服务状态：
                  <span
                    style={{
                      fontWeight: 600,
                      color: runState.serviceUsable ? t.ok : t.text2,
                    }}
                  >
                    {runState.serviceUsable
                      ? isServiceMode
                        ? '运行中'
                        : '已安装'
                      : '未安装'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: t.text2 }}>
                  TUN 模式需要以系统服务运行核心
                </div>
              </>
            }
          >
            {runState.serviceUsable ? (
              <Button onClick={uninstall} style={{ width: 112 }}>
                卸载服务
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={install}
                style={{ width: 112 }}
              >
                安装服务
              </Button>
            )}
          </Row>
        </Section>

        <Section title="账户">
          <Row
            title={
              <>
                <div>{storage.session?.email ?? ''}</div>
                <LinkButton
                  onClick={() => void openExternalUrl(panelUrls.dashboard())}
                  style={{ fontSize: 13 }}
                >
                  打开用户中心 ›
                </LinkButton>
              </>
            }
          >
            <Button variant="danger" onClick={onLogout} style={{ width: 112 }}>
              退出登录
            </Button>
          </Row>
        </Section>
      </div>
    </>
  )
}

export default SettingsPage
