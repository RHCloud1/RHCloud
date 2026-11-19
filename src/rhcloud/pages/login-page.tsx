import { type CSSProperties, type FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import logo3d from '@/assets/image/rhcloud-logo-3d.png'
import logo from '@/assets/image/rhcloud-logo.png'
import { useThemeMode } from '@/services/states'
import { openExternalUrl } from '@/utils/open-external-url'

import {
  panelUrls,
  SubscriptionRequiredError,
  updateDomainConfigIfStale,
} from '../api'
import { Button, LinkButton } from '../components/ui'
import { hasFreshSession, storage } from '../storage'
import { signIn, syncSubscription } from '../sync'
import { useRhTokens } from '../theme'

const LoginPage = () => {
  const t = useRhTokens()
  const isLight = useThemeMode() === 'light'
  const navigate = useNavigate()
  const saved = storage.session
  const [email, setEmail] = useState(saved?.email || storage.lastEmail)
  const [password, setPassword] = useState(saved?.password ?? '')
  const [remember, setRemember] = useState(storage.rememberPassword)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lineOk, setLineOk] = useState<boolean | null>(null)

  useEffect(() => {
    updateDomainConfigIfStale()
      .then(() => setLineOk(true))
      .catch(() => setLineOk(false))
  }, [])

  if (hasFreshSession()) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password, remember)
      // A plan problem should not block the login itself; the home page shows it.
      await syncSubscription().catch((err) => {
        if (!(err instanceof SubscriptionRequiredError)) throw err
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: CSSProperties = {
    height: 44,
    boxSizing: 'border-box',
    padding: '0 14px',
    borderRadius: 10,
    border: `1px solid ${t.inputBorder}`,
    font: 'inherit',
    fontWeight: 400,
    fontSize: 15,
    color: t.text,
    background: t.surface,
    outlineColor: t.primary,
  }
  const labelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
  }

  return (
    <div
      style={{ display: 'flex', flex: 1, minHeight: 0, background: t.surface }}
    >
      <div
        data-tauri-drag-region="true"
        style={{
          width: '44%',
          maxWidth: 460,
          flexShrink: 0,
          boxSizing: 'border-box',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: t.bg,
          borderRight: `1px solid ${t.border}`,
        }}
      >
        <img
          src={isLight ? logo3d : logo}
          alt="RHCloud"
          style={{
            width: '78%',
            maxWidth: 300,
            aspectRatio: isLight ? '1' : '867 / 537',
            objectFit: 'contain',
            // The 3D artwork has a white background; multiply drops it onto the light panel.
            mixBlendMode: isLight ? 'multiply' : 'normal',
          }}
        />
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.3 }}>
          RHCloud
        </div>
        <div style={{ fontSize: 14, color: t.text2 }}>
          登录后自动同步你的套餐和节点
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          flex: 1,
          boxSizing: 'border-box',
          padding: '48px clamp(32px, 9vw, 96px) 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 18,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>登录账户</h1>
          <p style={{ margin: 0, fontSize: 14, color: t.text2 }}>
            使用 RHCloud 官网的邮箱和密码
          </p>
        </div>
        <label style={labelStyle}>
          邮箱
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          密码
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 14,
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{
                width: 18,
                height: 18,
                accentColor: t.primary,
                margin: 0,
              }}
            />
            记住密码
          </label>
          <LinkButton
            onClick={() => void openExternalUrl(panelUrls.forgetPassword())}
          >
            忘记密码？
          </LinkButton>
        </div>
        {error && (
          <div
            role="alert"
            style={{ fontSize: 14, color: t.bad, lineHeight: 1.5 }}
          >
            {error}
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          style={{ height: 46, fontSize: 16 }}
        >
          {busy ? '正在登录…' : '登录'}
        </Button>
        <div style={{ textAlign: 'center', fontSize: 14, color: t.text2 }}>
          还没有账户？
          <LinkButton
            onClick={() => void openExternalUrl(panelUrls.register())}
          >
            注册
          </LinkButton>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 10,
            fontSize: 12,
            color: t.text2,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: lineOk === false ? t.warn : lineOk ? t.ok : t.text2,
            }}
          />
          {lineOk === null
            ? '正在检测线路…'
            : lineOk
              ? '线路正常 · 已自动选择最快的服务地址'
              : '暂时无法更新线路列表，将使用内置地址'}
        </div>
      </form>
    </div>
  )
}

export default LoginPage
