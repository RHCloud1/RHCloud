import { fetch } from '@tauri-apps/plugin-http'

import { storage } from './storage'

// Ported from RHCloud-box (Android) RHCloudApi.kt so both clients pick panel domains the same way.
const DEFAULT_BASE_URL = 'https://syn.rhcloud.cc'
const BUILT_IN_BASE_URLS = [
  'https://syn.rhcloud.cc',
  'https://sys.rhcloud.cc',
  'https://syn.ffhy.uk',
  'https://sys.ffhy.uk',
  'https://www.rhcloud.cc',
  'https://www.ffhy.uk',
]
const DOMAIN_CONFIG_URL =
  'https://gitee.com/FHQ666/chatgpt-on-wechat/raw/master/hc.json'

const LOGIN_PATH = '/api/v1/passport/auth/login'
const SUBSCRIBE_INFO_PATH = '/api/v1/user/getSubscribe'
const CLIENT_SUBSCRIBE_PATH = '/api/v1/client/subscribe'

const REQUEST_TIMEOUT_MS = 8000
const SLOW_ENDPOINT_MS = 5000
const PROBE_TIMEOUT_MS = 3000
const DOMAIN_SELECT_TIMEOUT_MS = 6000
const DOMAIN_POOL_SIZE = 3
const DOMAIN_REFRESH_MS = 7 * 24 * 60 * 60 * 1000

export class ApiError extends Error {}
export class AuthExpiredError extends ApiError {}

export type SubscriptionStatus =
  | 'active'
  | 'noPlan'
  | 'expired'
  | 'trafficExhausted'
  | 'missingSubscribeUrl'

export interface SubscriptionInfo {
  planId: number
  planName: string
  subscribeUrl: string
  upload: number
  download: number
  transferEnable: number
  /** Unix seconds, 0 = never expires. */
  expiredAt: number
}

export class SubscriptionRequiredError extends ApiError {
  constructor(
    readonly subscription: SubscriptionInfo,
    readonly status: SubscriptionStatus,
  ) {
    super(subscriptionMessage(status))
  }
}

export const subscriptionMessage = (status: SubscriptionStatus) =>
  ({
    active: '订阅正常',
    noPlan: '当前账户还没有购买套餐',
    expired: '套餐已到期，请续费后再连接',
    trafficExhausted: '本月流量已用完，请续费或升级套餐',
    missingSubscribeUrl: '没有获取到订阅地址，请稍后再试',
  })[status]

const isWww = (baseUrl: string) => {
  try {
    return new URL(baseUrl).host.startsWith('www.')
  } catch {
    return false
  }
}

const normalizeBaseUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const trimmed = value.trim()
    const url = new URL(
      trimmed.includes('://') ? trimmed : `https://${trimmed}`,
    )
    return url.protocol === 'https:' ? url.origin : ''
  } catch {
    return ''
  }
}

const unique = (list: string[]) => [...new Set(list.filter(Boolean))]

/** Default domain first, then non-www domains, www domains last. */
const orderBaseUrls = (list: string[]) =>
  unique([
    ...(list.includes(DEFAULT_BASE_URL) ? [DEFAULT_BASE_URL] : []),
    ...list.filter((url) => url !== DEFAULT_BASE_URL && !isWww(url)),
    ...list.filter((url) => url !== DEFAULT_BASE_URL && isWww(url)),
  ])

const configuredBaseUrls = () =>
  orderBaseUrls(
    unique([
      normalizeBaseUrl(storage.remoteDefaultBaseUrl),
      ...storage.remoteDomains.map(normalizeBaseUrl),
      ...BUILT_IN_BASE_URLS,
    ]),
  )

export const activeBaseUrl = () => {
  const configured = configuredBaseUrls()
  const remembered = storage.baseUrl
  if (remembered && configured.includes(remembered)) return remembered
  const remote = normalizeBaseUrl(storage.remoteDefaultBaseUrl)
  return remote && configured.includes(remote) ? remote : DEFAULT_BASE_URL
}

const rememberBaseUrl = (baseUrl: string) => {
  if (configuredBaseUrls().includes(baseUrl)) storage.baseUrl = baseUrl
}

const candidateBaseUrls = () => {
  const preferred = activeBaseUrl()
  const ordered = configuredBaseUrls().filter((url) => url !== preferred)
  return unique([
    ...(isWww(preferred) ? [] : [preferred]),
    ...ordered.filter((url) => !isWww(url)),
    ...ordered.filter(isWww),
    ...(isWww(preferred) ? [preferred] : []),
  ])
}

export const isKnownPanelUrl = (url: string) => {
  try {
    const host = new URL(url).host
    return configuredBaseUrls().some((base) => new URL(base).host === host)
  } catch {
    return false
  }
}

/** Points a panel URL (e.g. the subscribe link) at the domain that currently works. */
export const normalizeKnownUrl = (url: string) => {
  if (!/^https?:\/\//.test(url) || !isKnownPanelUrl(url)) return url
  const parsed = new URL(url)
  return activeBaseUrl() + parsed.pathname + parsed.search
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  token?: string
  form?: Record<string, string>
  timeoutMs?: number
}

const request = async (url: string, options: RequestOptions = {}) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    'Content-Language': 'zh-CN',
  }
  if (options.token) headers.Authorization = options.token
  let body: string | undefined
  if (options.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(options.form).toString()
  }
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
    signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
  })
  return { status: response.status, text: await response.text() }
}

/** Tries each panel domain; a domain answering within 5s is remembered for next time. */
const execute = async (path: string, options: RequestOptions = {}) => {
  let lastError: unknown
  let slow: {
    baseUrl: string
    result: { status: number; text: string }
  } | null = null
  for (const baseUrl of candidateBaseUrls()) {
    const startedAt = Date.now()
    try {
      const result = await request(baseUrl + path, options)
      if (Date.now() - startedAt <= SLOW_ENDPOINT_MS) {
        rememberBaseUrl(baseUrl)
        return result
      }
      slow ??= { baseUrl, result }
    } catch (error) {
      lastError = error
    }
  }
  if (slow) {
    rememberBaseUrl(slow.baseUrl)
    return slow.result
  }
  throw new ApiError(
    lastError instanceof Error && lastError.message
      ? `无法连接 RHCloud：${lastError.message}`
      : '无法连接 RHCloud，请检查网络',
  )
}

const parseResponse = ({ status, text }: { status: number; text: string }) => {
  let root: any
  try {
    root = JSON.parse(text)
  } catch {
    throw new ApiError(`服务器返回了无法识别的内容（HTTP ${status}）`)
  }
  const message: string = root?.message || root?.msg || ''
  const failed =
    status === 401 ||
    status === 403 ||
    root?.status === 'fail' ||
    root?.status === 'error' ||
    root?.code === 401 ||
    status >= 400
  if (failed) {
    if (
      status === 401 ||
      status === 403 ||
      root?.code === 401 ||
      message.includes('未登录') ||
      message.includes('登录已过期')
    ) {
      throw new AuthExpiredError(message || '登录已过期，请重新登录')
    }
    throw new ApiError(message || `请求失败（HTTP ${status}）`)
  }
  return root
}

const toNumber = (value: unknown) => {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

export const login = async (email: string, password: string) => {
  const root = parseResponse(
    await execute(LOGIN_PATH, { method: 'POST', form: { email, password } }),
  )
  const data = root?.data ?? root
  const token: string =
    data?.auth_data || data?.token || data?.authData || data?.auth_data?.token
  if (!token) throw new ApiError(root?.message || '登录失败，没有拿到登录凭证')
  return token
}

export const fetchSubscription = async (
  token: string,
): Promise<SubscriptionInfo> => {
  const root = parseResponse(await execute(SUBSCRIBE_INFO_PATH, { token }))
  const data = root?.data ?? root
  return {
    planId: toNumber(data?.plan_id),
    planName: data?.plan?.name || data?.plan_name || '',
    subscribeUrl: normalizeKnownUrl(data?.subscribe_url || ''),
    upload: toNumber(data?.u),
    download: toNumber(data?.d),
    transferEnable: toNumber(data?.transfer_enable),
    expiredAt: toNumber(data?.expired_at),
  }
}

export const subscriptionStatus = (
  info: SubscriptionInfo,
  now = Date.now(),
): SubscriptionStatus => {
  const expiresAt =
    info.expiredAt > 100000000000 ? info.expiredAt : info.expiredAt * 1000
  if (info.planId <= 0 && !info.planName) return 'noPlan'
  if (expiresAt > 0 && expiresAt <= now) return 'expired'
  if (
    info.transferEnable > 0 &&
    info.upload + info.download >= info.transferEnable
  )
    return 'trafficExhausted'
  if (!info.subscribeUrl) return 'missingSubscribeUrl'
  return 'active'
}

/** Subscribe link in Clash Meta format; mihomo needs `flag=meta` from Xboard. */
export const clashSubscribeUrl = (subscribeUrl: string) => {
  const url = normalizeKnownUrl(
    subscribeUrl || activeBaseUrl() + CLIENT_SUBSCRIBE_PATH,
  )
  if (/[?&]flag=/.test(url)) return url
  return url + (url.includes('?') ? '&' : '?') + 'flag=meta'
}

const probe = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/`, {
    method: 'GET',
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  })
  if (response.status >= 400) throw new ApiError(`HTTP ${response.status}`)
  return baseUrl
}

/** Downloads the domain list from gitee and keeps the 3 fastest reachable domains. */
export const updateDomainConfig = async () => {
  const response = await fetch(`${DOMAIN_CONFIG_URL}?_t=${Date.now()}`, {
    method: 'GET',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const root = JSON.parse(await response.text())
  const fallbackDefault = normalizeBaseUrl(root?.default)
  const domains = unique([
    ...(Array.isArray(root?.domains) ? root.domains.map(normalizeBaseUrl) : []),
    fallbackDefault,
  ])
  if (domains.length === 0)
    throw new ApiError('域名配置里没有可用的 HTTPS 地址')
  const candidates = unique([DEFAULT_BASE_URL, ...domains])

  const reachable: string[] = []
  await Promise.race([
    Promise.allSettled(
      candidates.map((url) => probe(url).then((ok) => reachable.push(ok))),
    ),
    new Promise((resolve) => setTimeout(resolve, DOMAIN_SELECT_TIMEOUT_MS)),
  ])
  const effective = orderBaseUrls([
    ...reachable,
    ...candidates.filter((url) => !reachable.includes(url)),
  ]).slice(0, DOMAIN_POOL_SIZE)

  storage.remoteDefaultBaseUrl = effective[0]
  storage.remoteDomains = effective
  storage.domainConfigUpdatedAt = Date.now()
  rememberBaseUrl(effective[0])
  return effective
}

export const updateDomainConfigIfStale = async () => {
  const last = storage.domainConfigUpdatedAt
  if (
    last > 0 &&
    Date.now() - last < DOMAIN_REFRESH_MS &&
    storage.remoteDomains.length
  )
    return
  await updateDomainConfig()
}

export const panelUrls = {
  dashboard: () => `${activeBaseUrl()}/#/dashboard`,
  plan: () => `${activeBaseUrl()}/#/plan`,
  register: () => `${activeBaseUrl()}/#/register`,
  forgetPassword: () => `${activeBaseUrl()}/#/forgetpassword`,
}
