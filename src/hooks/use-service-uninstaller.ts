import { useCallback } from 'react'

import { uninstallService } from '@/services/cmds'
import { mutate } from '@/services/mutate'

import { useSystemState } from './use-system-state'

export const useServiceUninstaller = () => {
  const { mutateSystemState } = useSystemState()

  const uninstallServiceAndStartSidecar = useCallback(async () => {
    let uninstallError: unknown
    // RHCloud: no progress/success toasts; failures are rethrown to the caller.
    try {
      await mutate(() => uninstallService(), {
        id: 'uninstall-service',
        errorNotice: false,
      })
    } catch (error) {
      uninstallError = error
    }

    try {
      await mutateSystemState()
    } catch (error) {
      if (!uninstallError) throw error
    }

    if (uninstallError) throw uninstallError
  }, [mutateSystemState])

  return { uninstallServiceAndStartSidecar }
}
