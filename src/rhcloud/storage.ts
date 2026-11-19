import type { SubscriptionInfo } from './api'

const PREFIX = 'rhcloud.'
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

const read = (key: string) => {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, value)
  } catch {
    // Storage can be unavailable; the app then behaves as logged out.
  }
}

const readJson = <T>(key: string, fallback: T): T => {
  const raw = read(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export interface Session {
  email: string
  token: string
  /** Kept only when "remember password" is on, for silent re-login. */
  password: string
  loginAt: number
}

export const storage = {
  get baseUrl() {
    return read('baseUrl') ?? ''
  },
  set baseUrl(value: string) {
    write('baseUrl', value)
  },
  get remoteDefaultBaseUrl() {
    return read('remoteDefaultBaseUrl') ?? ''
  },
  set remoteDefaultBaseUrl(value: string) {
    write('remoteDefaultBaseUrl', value)
  },
  get remoteDomains(): string[] {
    return readJson<string[]>('remoteDomains', [])
  },
  set remoteDomains(value: string[]) {
    write('remoteDomains', JSON.stringify(value))
  },
  get domainConfigUpdatedAt() {
    return Number(read('domainConfigUpdatedAt') ?? 0)
  },
  set domainConfigUpdatedAt(value: number) {
    write('domainConfigUpdatedAt', String(value))
  },

  get session(): Session | null {
    return readJson<Session | null>('session', null)
  },
  set session(value: Session | null) {
    write('session', value ? JSON.stringify(value) : null)
  },
  /** Last email typed on the login page, kept after logout. */
  get lastEmail() {
    return read('lastEmail') ?? ''
  },
  set lastEmail(value: string) {
    write('lastEmail', value)
  },
  get rememberPassword() {
    return read('rememberPassword') !== 'false'
  },
  set rememberPassword(value: boolean) {
    write('rememberPassword', String(value))
  },

  get profileUid() {
    return read('profileUid') ?? ''
  },
  set profileUid(value: string) {
    write('profileUid', value || null)
  },
  get subscription(): SubscriptionInfo | null {
    return readJson<SubscriptionInfo | null>('subscription', null)
  },
  set subscription(value: SubscriptionInfo | null) {
    write('subscription', value ? JSON.stringify(value) : null)
  },
  get lastSyncAt() {
    return Number(read('lastSyncAt') ?? 0)
  },
  set lastSyncAt(value: number) {
    write('lastSyncAt', value ? String(value) : null)
  },
}

/** Sessions older than 30 days send the user back to the login page, as on Android. */
export const hasFreshSession = () => {
  const session = storage.session
  return Boolean(
    session?.token && Date.now() - session.loginAt < SESSION_MAX_AGE_MS,
  )
}
