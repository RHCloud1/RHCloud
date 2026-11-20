import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'

import { useProxySelection } from '@/hooks/use-proxy-selection'
import { useSystemProxyState } from '@/hooks/use-system-proxy-state'
import { useSystemState } from '@/hooks/use-system-state'
import { useVerge } from '@/hooks/use-verge'
import {
  useAppRefreshers,
  useClashConfigData,
  useProxiesData,
} from '@/providers/app-data-context'
import { showNotice } from '@/services/notice-service'
import { requestService } from '@/services/service-request'
import { getRecord, type ProxyGroupView } from '@/types/proxy-view'

import {
  AuthExpiredError,
  subscriptionStatus,
  SubscriptionRequiredError,
  type SubscriptionInfo,
} from './api'
import { hasFreshSession, storage } from './storage'
import { refreshSubscriptionInfo, signOut, syncSubscription } from './sync'

const AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000

// Tiny store so every screen sees the same subscription/sync state.
interface CloudState {
  info: SubscriptionInfo | null
  lastSyncAt: number
  syncing: boolean
  error: string
}
let state: CloudState = {
  info: storage.subscription,
  lastSyncAt: storage.lastSyncAt,
  syncing: false,
  error: '',
}
const listeners = new Set<() => void>()
const setState = (patch: Partial<CloudState>) => {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

let syncPromise: Promise<boolean> | null = null

/** Runs one subscription sync at a time; resolves false when it failed. */
const runSync = () => {
  syncPromise ??= (async () => {
    setState({ syncing: true, error: '' })
    try {
      const info = await syncSubscription()
      setState({ info, lastSyncAt: storage.lastSyncAt })
      return true
    } catch (error) {
      setState({
        info:
          error instanceof SubscriptionRequiredError
            ? error.subscription
            : state.info,
        error: errorText(error),
      })
      if (error instanceof AuthExpiredError) throw error
      return false
    } finally {
      setState({ syncing: false })
      syncPromise = null
    }
  })()
  return syncPromise
}

export const useCloud = () => {
  const snapshot = useSyncExternalStore(subscribe, () => state)
  const navigate = useNavigate()

  const handleAuthError = useCallback(
    async (error: unknown) => {
      if (!(error instanceof AuthExpiredError)) return false
      await signOut()
      showNotice.info('登录已过期，请重新登录')
      navigate('/login', { replace: true })
      return true
    },
    [navigate],
  )

  const sync = useCallback(async () => {
    try {
      return await runSync()
    } catch (error) {
      await handleAuthError(error)
      return false
    }
  }, [handleAuthError])

  const refreshInfo = useCallback(async () => {
    try {
      setState({ info: await refreshSubscriptionInfo() })
    } catch (error) {
      if (!(await handleAuthError(error)))
        console.warn('[rhcloud] refresh failed', error)
    }
  }, [handleAuthError])

  const logout = useCallback(async () => {
    await signOut()
    setState({ info: null, lastSyncAt: 0, error: '' })
    navigate('/login', { replace: true })
  }, [navigate])

  const status = snapshot.info ? subscriptionStatus(snapshot.info) : null
  return { ...snapshot, status, sync, refreshInfo, logout }
}

/** Keeps the profile fresh: syncs on start when stale or missing, then hourly. */
export const useAutoSync = () => {
  const { sync } = useCloud()
  useEffect(() => {
    const due = () =>
      hasFreshSession() &&
      (!storage.profileUid ||
        Date.now() - storage.lastSyncAt > AUTO_SYNC_INTERVAL_MS)
    if (due()) void sync()
    const timer = window.setInterval(
      () => {
        if (due()) void sync()
      },
      5 * 60 * 1000,
    )
    return () => window.clearInterval(timer)
  }, [sync])
}

export interface CurrentNode {
  group: ProxyGroupView
  /** What the main group points at (a node or a sub-group such as 自动选择). */
  selected: string
  /** The node traffic actually leaves through, after following sub-groups. */
  node: string
  type: string
  delay: number
}

const lastDelay = (history: { delay: number }[] | undefined) =>
  history && history.length > 0 ? history[history.length - 1].delay : -1

/** Selector groups users pick nodes in; the panel template puts the main one first. */
export const useNodeGroups = () => {
  const { proxyView } = useProxiesData()
  return useMemo(() => {
    const groups = (proxyView?.groups ?? []).filter((group) => !group.hidden)
    const findGroup = (name: string) =>
      groups.find((group) => group.name === name)

    const main = groups.find((group) => group.type === 'Selector') ?? groups[0]
    let current: CurrentNode | null = null
    if (proxyView && main?.now) {
      let name = main.now
      let type = ''
      let delay = -1
      const seen = new Set<string>()
      for (;;) {
        const sub = findGroup(name)
        if (!sub?.now || seen.has(name)) break
        seen.add(name)
        name = sub.now
      }
      const member = groups
        .flatMap((group) => group.members)
        .find((ref) => ref.kind === 'node' && ref.name === name)
      if (member?.kind === 'node') {
        const record = getRecord(proxyView, member.recordId)
        type = record?.type ?? ''
        delay = lastDelay(record?.history)
      }
      current = { group: main, selected: main.now, node: name, type, delay }
    }
    return { proxyView, groups, main, current }
  }, [proxyView])
}

/**
 * Global mode routes through mihomo's GLOBAL group, which the UI never shows, so keep it
 * pointed at the main group; otherwise a node picked on the nodes page would be ignored.
 */
export const useGlobalFollowsMain = () => {
  const { clashConfig } = useClashConfigData()
  const { proxyView, main } = useNodeGroups()
  const { refreshProxy } = useAppRefreshers()
  const onSuccess = useCallback(() => void refreshProxy(), [refreshProxy])
  const { changeProxy } = useProxySelection({ onSuccess })
  const mode = clashConfig?.mode?.toLowerCase()
  const globalName = proxyView?.global?.name
  const globalNow = proxyView?.global?.now ?? undefined
  const mainName = main?.name

  useEffect(() => {
    if (mode !== 'global' || !globalName || !mainName || globalNow === mainName)
      return
    changeProxy(globalName, mainName, globalNow)
  }, [mode, globalName, globalNow, mainName, changeProxy])
}

/** System proxy and TUN switches with the same guards Verge uses. */
export const useConnection = () => {
  const { verge, mutateVerge, patchVerge } = useVerge()
  const { indicator: systemProxyOn, toggleSystemProxy } = useSystemProxyState()
  const { runState, isTunModeAvailable, isLoading } = useSystemState()
  const tunOn = Boolean(verge?.enable_tun_mode && isTunModeAvailable)

  const setSystemProxy = useCallback(
    async (value: boolean) => {
      if (value && !isLoading && runState.mode === 'NotRunning') {
        showNotice.error('核心还没有启动，请稍后再试')
        return
      }
      try {
        await toggleSystemProxy(value)
      } catch (error) {
        showNotice.error(error)
      }
    },
    [isLoading, runState.mode, toggleSystemProxy],
  )

  const setTun = useCallback(
    async (value: boolean) => {
      if (value && !isTunModeAvailable) {
        requestService({
          reason: 'tunNeedsService',
          restore: { enable_tun_mode: true },
        })
        return
      }
      mutateVerge(
        (prev) => (prev ? { ...prev, enable_tun_mode: value } : prev),
        false,
      )
      try {
        await patchVerge({ enable_tun_mode: value })
      } catch (error) {
        showNotice.error(error)
      }
    },
    [isTunModeAvailable, mutateVerge, patchVerge],
  )

  return {
    systemProxyOn,
    tunOn,
    connected: systemProxyOn || tunOn,
    tunAvailable: isTunModeAvailable,
    serviceUsable: runState.serviceUsable,
    setSystemProxy,
    setTun,
  }
}
