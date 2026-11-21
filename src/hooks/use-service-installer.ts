import { useCallback } from 'react'

import { installService, restartCore } from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'

// RHCloud: only failures are shown; progress and success toasts are dropped.
const executeWithErrorHandling = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation()
  } catch (err) {
    showNotice.error(err)
    throw err
  }
}

export const useServiceInstaller = () => {
  const installServiceAndRestartCore = useCallback(async () => {
    const installResult = await executeWithErrorHandling(() =>
      mutate(() => installService(), {
        id: 'install-service',
        errorNotice: false,
      }),
    )
    if (!installResult.ok) return
    if (installResult.value.status === 'sidecar') {
      showNotice.warning(
        'settings.feedback.notifications.clashService.permissionFallback',
        { reason: installResult.value.reason },
        0,
      )
      return
    }
    await executeWithErrorHandling(() =>
      mutate(() => restartCore(), {
        id: 'restart-core',
        errorNotice: false,
      }),
    )
  }, [])
  return { installServiceAndRestartCore }
}
