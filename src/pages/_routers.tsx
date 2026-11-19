import { createBrowserRouter, Navigate } from 'react-router'

import { AppLayout } from '@/rhcloud/layout/app-layout'
import { RhShell } from '@/rhcloud/layout/rh-shell'
import HomePage from '@/rhcloud/pages/home-page'
import LoginPage from '@/rhcloud/pages/login-page'
import NodesPage from '@/rhcloud/pages/nodes-page'
import SettingsPage from '@/rhcloud/pages/settings-page'

// RHCloud replaces the Clash Verge pages with its own login/home/nodes/settings screens.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RhShell,
    children: [
      { path: 'login', Component: LoginPage },
      {
        Component: AppLayout,
        children: [
          { index: true, Component: HomePage },
          { path: 'nodes', Component: NodesPage },
          { path: 'settings', Component: SettingsPage },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
