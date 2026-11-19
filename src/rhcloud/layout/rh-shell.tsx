import { ThemeProvider } from '@mui/material'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'

import { BaseErrorBoundary } from '@/components/base'
import { NoticeManager } from '@/components/layout/notice-manager'
import { ServiceMigrationDialog } from '@/components/layout/service-migration-dialog'
import { SysproxyPrivilegeDialog } from '@/components/layout/sysproxy-privilege-dialog'
import {
  WindowControls,
  WindowResizeHandles,
} from '@/components/layout/window-controller'
import { useI18n } from '@/hooks/use-i18n'
import { useVerge } from '@/hooks/use-verge'
import { useWindowDecorations } from '@/hooks/use-window'
import {
  useCustomTheme,
  useLoadingOverlay,
  usePendingFailures,
} from '@/pages/_layout/hooks'
import { useEventBus } from '@/services/bus'
import { handleNoticeMessage } from '@/services/notice-handlers'

import { FONT_STACK, useRhTokens } from '../theme'

import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** Root of every screen: theme, notices, service dialogs and the frameless window chrome. */
export const RhShell = () => {
  const { t } = useTranslation()
  const tokens = useRhTokens()
  const { theme } = useCustomTheme()
  const { verge } = useVerge()
  const { switchLanguage } = useI18n()
  const navigate = useNavigate()
  const { decorated } = useWindowDecorations()

  useLoadingOverlay(Boolean(theme))
  usePendingFailures()

  const handleNotice = useCallback(
    ([status, msg]: [string, string]) => {
      try {
        handleNoticeMessage(status, msg, t, navigate)
      } catch (error) {
        console.error('[notice] failed:', error)
      }
    },
    [t, navigate],
  )
  useEventBus(handleNotice)

  useEffect(() => {
    if (verge?.language) switchLanguage(verge.language)
  }, [verge?.language, switchLanguage])

  if (!theme) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: tokens.bg }} />
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <NoticeManager position={verge?.notice_position} />
      <ServiceMigrationDialog />
      <SysproxyPrivilegeDialog />
      <div
        onContextMenu={(e) => {
          const target = e.target as HTMLElement
          if (!['INPUT', 'TEXTAREA'].includes(target.tagName))
            e.preventDefault()
        }}
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: tokens.bg,
          color: tokens.text,
          fontFamily: FONT_STACK,
        }}
      >
        {decorated === false && <WindowResizeHandles />}
        {decorated === false && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 36,
              display: 'flex',
              zIndex: 10,
            }}
          >
            <div data-tauri-drag-region="true" style={{ flex: 1 }} />
            <div
              style={{ display: 'flex', alignItems: 'center', paddingRight: 6 }}
            >
              <WindowControls />
            </div>
          </div>
        )}
        <BaseErrorBoundary>
          <Outlet />
        </BaseErrorBoundary>
      </div>
    </ThemeProvider>
  )
}
