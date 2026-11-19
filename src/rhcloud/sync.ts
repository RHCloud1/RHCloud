import {
  deleteProfile,
  getProfiles,
  importProfile,
  patchProfile,
  patchProfilesConfig,
  patchVergeConfig,
  updateProfile,
} from '@/services/cmds'

import {
  AuthExpiredError,
  clashSubscribeUrl,
  fetchSubscription,
  login,
  subscriptionStatus,
  SubscriptionRequiredError,
  type SubscriptionInfo,
} from './api'
import { storage } from './storage'

export const PROFILE_NAME = 'RHCloud'

const PROFILE_OPTION: IProfileOption = {
  with_proxy: false,
  self_proxy: false,
  update_interval: 60,
  allow_auto_update: true,
  timeout_seconds: 30,
}

export const signIn = async (
  email: string,
  password: string,
  remember: boolean,
) => {
  const token = await login(email, password)
  storage.lastEmail = email
  storage.rememberPassword = remember
  storage.session = {
    email,
    token,
    password: remember ? password : '',
    loginAt: Date.now(),
  }
}

/** Re-logs in with the saved password when the panel says the token expired. */
const withFreshToken = async <T>(run: (token: string) => Promise<T>) => {
  const session = storage.session
  if (!session?.token) throw new AuthExpiredError('请先登录')
  try {
    return await run(session.token)
  } catch (error) {
    if (!(error instanceof AuthExpiredError) || !session.password) throw error
    const token = await login(session.email, session.password)
    storage.session = { ...session, token }
    return run(token)
  }
}

export const refreshSubscriptionInfo = () =>
  withFreshToken(async (token) => {
    const info = await fetchSubscription(token)
    storage.subscription = info
    return info
  })

const findProfile = async (url: string) => {
  const { items = [], current } = await getProfiles()
  const remote = (items ?? []).filter((item) => item.type === 'remote')
  const item =
    remote.find((it) => it.uid === storage.profileUid) ??
    remote.find((it) => it.url === url) ??
    remote.find((it) => it.name === PROFILE_NAME)
  return { item, current }
}

/** Imports or refreshes the single RHCloud profile and makes it the active one. */
const applyProfile = async (url: string) => {
  let { item, current } = await findProfile(url)
  if (!item?.uid) {
    await importProfile(url, PROFILE_OPTION)
    ;({ item, current } = await findProfile(url))
    if (!item?.uid) throw new Error('订阅已下载，但没有找到对应的配置')
    await patchProfile(item.uid, { name: PROFILE_NAME, option: PROFILE_OPTION })
  } else {
    if (item.url !== url || item.name !== PROFILE_NAME) {
      await patchProfile(item.uid, { url, name: PROFILE_NAME })
    }
    await updateProfile(item.uid, PROFILE_OPTION)
  }
  storage.profileUid = item.uid
  if (current !== item.uid) {
    await patchProfilesConfig({ current: item.uid })
  }
}

/** Fetches plan info, refuses unusable subscriptions, then imports the Clash Meta profile. */
export const syncSubscription = async (): Promise<SubscriptionInfo> => {
  const info = await refreshSubscriptionInfo()
  const status = subscriptionStatus(info)
  if (status !== 'active') throw new SubscriptionRequiredError(info, status)
  await applyProfile(clashSubscribeUrl(info.subscribeUrl))
  storage.lastSyncAt = Date.now()
  return info
}

export const signOut = async () => {
  await patchVergeConfig({
    enable_system_proxy: false,
    enable_tun_mode: false,
  }).catch(() => {})
  const uid = storage.profileUid
  if (uid) await deleteProfile(uid).catch(() => {})
  storage.session = null
  storage.subscription = null
  storage.lastSyncAt = 0
  storage.profileUid = ''
}
