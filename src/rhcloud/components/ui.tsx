import { CircularProgress, Switch } from '@mui/material'
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { useRhTokens } from '../theme'

export const Card = ({
  children,
  style,
  label,
}: {
  children: ReactNode
  style?: CSSProperties
  label?: string
}) => {
  const t = useRhTokens()
  return (
    <section
      aria-label={label}
      style={{
        boxSizing: 'border-box',
        padding: 22,
        borderRadius: 16,
        background: t.surface,
        border: `1px solid ${t.border}`,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

export const PageHeader = ({
  title,
  actions,
}: {
  title: string
  actions?: ReactNode
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      marginBottom: 18,
    }}
  >
    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{title}</h1>
    {actions}
  </div>
)

export const SwitchRow = ({
  title,
  description,
  checked,
  disabled,
  onChange,
  divider,
}: {
  title: string
  description?: ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  divider?: boolean
}) => {
  const t = useRhTokens()
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        minHeight: 52,
        borderBottom: divider ? `1px solid ${t.divider}` : undefined,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>
          {title}
        </span>
        {description && (
          <span style={{ display: 'block', fontSize: 13, color: t.text2 }}>
            {description}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(_, value) => onChange(value)}
        slotProps={{ input: { 'aria-label': title } }}
      />
    </label>
  )
}

type Variant = 'primary' | 'secondary' | 'danger'

export const Button = ({
  variant = 'secondary',
  loading,
  children,
  style,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
}) => {
  const t = useRhTokens()
  const look: Record<Variant, CSSProperties> = {
    primary: { border: 0, background: t.primary, color: t.onPrimary },
    secondary: {
      border: `1px solid ${t.inputBorder}`,
      background: t.surface,
      color: t.text,
    },
    danger: {
      border: `1px solid ${t.badBorder}`,
      background: t.surface,
      color: t.bad,
    },
  }
  return (
    <button
      type="button"
      disabled={disabled || loading}
      {...rest}
      style={{
        height: 40,
        padding: '0 16px',
        borderRadius: 10,
        font: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...look[variant],
        ...style,
      }}
    >
      {loading && <CircularProgress size={16} color="inherit" />}
      {children}
    </button>
  )
}

export const LinkButton = ({
  children,
  onClick,
  style,
}: {
  children: ReactNode
  onClick: () => void
  style?: CSSProperties
}) => {
  const t = useRhTokens()
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 0,
        padding: 0,
        background: 'transparent',
        font: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        color: t.link,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
