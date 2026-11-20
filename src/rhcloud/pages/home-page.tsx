import { useLockFn } from 'ahooks'
import dayjs from 'dayjs'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useTrafficData } from '@/hooks/use-traffic-data'
import { useTrafficGraphDataEnhanced } from '@/hooks/use-traffic-monitor'
import { useVisibility } from '@/hooks/use-visibility'
import {
  useAppRefreshers,
  useClashConfigData,
} from '@/providers/app-data-context'
import { patchClashMode } from '@/services/cmds'
import { showNotice } from '@/services/notice-service'
import { openExternalUrl } from '@/utils/open-external-url'
import parseTraffic from '@/utils/parse-traffic'

import { panelUrls, subscriptionMessage } from '../api'
import {
  Button,
  Card,
  LinkButton,
  PageHeader,
  SwitchRow,
} from '../components/ui'
import { useCloud, useConnection, useNodeGroups } from '../hooks'
import { storage } from '../storage'
import {
  BRAND_BLUE,
  BRAND_GRADIENT,
  formatLatency,
  latencyColor,
  SIZE,
  useRhTokens,
} from '../theme'

const MODES = [
  { value: 'rule', label: '规则' },
  { value: 'global', label: '全局' },
] as const

const ModeSwitch = () => {
  const t = useRhTokens()
  const { clashConfig } = useClashConfigData()
  const { refreshClashConfig } = useAppRefreshers()
  const current = clashConfig?.mode?.toLowerCase()

  const change = useLockFn(async (mode: string) => {
    try {
      await patchClashMode(mode)
      await refreshClashConfig()
    } catch (error) {
      showNotice.error(error)
    }
  })

  return (
    <div
      role="group"
      aria-label="代理模式"
      style={{
        display: 'flex',
        height: SIZE.control,
        boxSizing: 'border-box',
        padding: 3,
        borderRadius: SIZE.controlRadius,
        background: t.track,
      }}
    >
      {MODES.map((mode) => {
        const active = current === mode.value
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={active}
            onClick={() => change(mode.value)}
            style={{
              height: SIZE.control - 6,
              minWidth: 72,
              padding: '0 18px',
              border: 0,
              borderRadius: SIZE.controlRadius - 3,
              font: 'inherit',
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              background: active ? t.surface : 'transparent',
              color: active ? t.link : t.text2,
              boxShadow: active ? '0 1px 2px rgba(15,35,60,0.12)' : 'none',
            }}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

const ConnectionCard = () => {
  const t = useRhTokens()
  const navigate = useNavigate()
  const { connected, systemProxyOn, tunOn, setSystemProxy, setTun } =
    useConnection()
  const { current } = useNodeGroups()
  const { sync, syncing } = useCloud()

  const toggle = useLockFn(async () => {
    if (connected) {
      if (tunOn) await setTun(false)
      if (systemProxyOn) await setSystemProxy(false)
      return
    }
    // Without the RHCloud profile there is nothing to connect through yet.
    if (!storage.profileUid && !(await sync())) return
    await setSystemProxy(true)
  })

  const status =
    syncing && !connected ? '正在同步订阅…' : connected ? '已连接' : '未连接'

  return (
    <Card
      label="连接"
      style={{ display: 'flex', flexDirection: 'column', gap: SIZE.gap }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SIZE.pad }}>
        <button
          type="button"
          aria-label={connected ? '断开连接' : '连接'}
          aria-pressed={connected}
          onClick={toggle}
          style={{
            width: 112,
            height: 112,
            flexShrink: 0,
            border: connected ? 0 : `2px solid ${t.border}`,
            borderRadius: '50%',
            cursor: 'pointer',
            background: connected ? BRAND_GRADIENT : t.track,
            boxShadow: connected ? '0 10px 28px rgba(43,143,232,0.35)' : 'none',
            color: connected ? '#FFFFFF' : BRAND_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 3v8" />
            <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
          </svg>
        </button>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: connected ? t.ok : t.text2,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connected ? t.ok : t.inputBorder,
              }}
            />
            {status}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current ? current.node : '还没有节点'}
          </div>
          {current && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              {current.selected !== current.node && (
                <span style={{ color: t.text2 }}>{current.selected}</span>
              )}
              {current.type && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: t.chip,
                    color: t.link,
                    fontWeight: 600,
                  }}
                >
                  {current.type}
                </span>
              )}
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  color: latencyColor(t, current.delay),
                }}
              >
                {formatLatency(current.delay)}
              </span>
            </div>
          )}
          <LinkButton
            onClick={() => navigate('/nodes')}
            style={{ alignSelf: 'flex-start' }}
          >
            切换节点 ›
          </LinkButton>
        </div>
      </div>
      <div
        style={{
          marginTop: 'auto',
          borderTop: `1px solid ${t.border}`,
          paddingTop: 4,
        }}
      >
        <SwitchRow
          title="系统代理"
          description="浏览器等大多数应用会自动走代理"
          checked={systemProxyOn}
          onChange={(value) => void setSystemProxy(value)}
        />
        <SwitchRow
          title="TUN 模式"
          description="接管全部应用的流量，首次开启需要安装服务"
          checked={tunOn}
          onChange={(value) => void setTun(value)}
        />
      </div>
    </Card>
  )
}

const AccountCard = () => {
  const t = useRhTokens()
  const { info, status, lastSyncAt, syncing, error, sync, refreshInfo } =
    useCloud()
  const email = storage.session?.email ?? ''

  useEffect(() => {
    void refreshInfo()
  }, [refreshInfo])

  const used = info ? info.upload + info.download : 0
  const total = info?.transferEnable ?? 0
  const percent =
    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const [usedNum, usedUnit] = parseTraffic(used)
  const [totalNum, totalUnit] = parseTraffic(total)
  const expiresAt = info?.expiredAt
    ? dayjs(
        info.expiredAt > 100000000000 ? info.expiredAt : info.expiredAt * 1000,
      )
    : null

  const onSync = async () => {
    if (await sync()) showNotice.success('订阅已更新')
  }

  return (
    <Card
      label="账户"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 13, color: t.text2 }}>当前账户</span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {email}
          </span>
        </div>
        <LinkButton onClick={() => void openExternalUrl(panelUrls.dashboard())}>
          用户中心 ›
        </LinkButton>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>
          {info?.planName || '暂无套餐'}
        </span>
        <span style={{ fontSize: 13, color: t.text2 }}>
          {expiresAt
            ? `${expiresAt.format('YYYY-MM-DD')} 到期`
            : info?.planName
              ? '长期有效'
              : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: t.track,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              borderRadius: 4,
              background: percent >= 90 ? t.bad : t.primary,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            color: t.text2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>
            已用 {usedNum} {usedUnit} /{' '}
            {total > 0 ? `${totalNum} ${totalUnit}` : '不限'}
          </span>
          <span>{total > 0 ? `${percent}%` : ''}</span>
        </div>
      </div>
      {status && status !== 'active' ? (
        <div role="alert" style={{ fontSize: 13, color: t.bad }}>
          {subscriptionMessage(status)}
        </div>
      ) : (
        error && (
          <div role="alert" style={{ fontSize: 13, color: t.bad }}>
            同步失败：{error}
          </div>
        )
      )}
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: 'flex', gap: 12 }}>
        <Button loading={syncing} onClick={onSync} style={{ flex: 1 }}>
          同步订阅
        </Button>
        <Button
          variant="primary"
          onClick={() => void openExternalUrl(panelUrls.plan())}
          style={{ flex: 1 }}
        >
          {status === 'noPlan' ? '购买套餐' : '续费'}
        </Button>
      </div>
      <div style={{ fontSize: 12, color: t.text2 }}>
        {lastSyncAt
          ? `上次同步：${dayjs(lastSyncAt).fromNow()} · 每 60 分钟自动更新`
          : '还没有同步过订阅'}
      </div>
    </Card>
  )
}

const GRAPH_W = 560
const GRAPH_H = 120

const TrafficCard = () => {
  const t = useRhTokens()
  const visible = useVisibility()
  const {
    response: { data: traffic },
  } = useTrafficData({ enabled: visible })
  const { dataPoints } = useTrafficGraphDataEnhanced()
  const [down, downUnit] = parseTraffic(traffic?.down ?? 0)
  const [up, upUnit] = parseTraffic(traffic?.up ?? 0)

  const paths = useMemo(() => {
    const points = dataPoints.slice(-60)
    if (points.length < 2) return null
    const max = Math.max(1024, ...points.map((p) => Math.max(p.up, p.down)))
    const line = (key: 'up' | 'down') =>
      points
        .map((p, i) => {
          const x = (i / (points.length - 1)) * GRAPH_W
          const y = GRAPH_H - 6 - (p[key] / max) * (GRAPH_H - 16)
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
        })
        .join(' ')
    const down = line('down')
    return {
      down,
      up: line('up'),
      area: `${down} L${GRAPH_W} ${GRAPH_H} L0 ${GRAPH_H} Z`,
    }
  }, [dataPoints])

  return (
    <Card
      label="实时流量"
      style={{
        display: 'flex',
        gap: SIZE.pad,
        alignItems: 'stretch',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
          width: 170,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600 }}>实时流量</div>
        <div>
          <div style={{ fontSize: 12, color: t.text2 }}>下载</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: t.link,
            }}
          >
            {down}{' '}
            <span style={{ fontSize: 13, fontWeight: 500 }}>{downUnit}/s</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: t.text2 }}>上传</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: t.up,
            }}
          >
            {up}{' '}
            <span style={{ fontSize: 13, fontWeight: 500 }}>{upUnit}/s</span>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="最近的上传和下载速度曲线"
        style={{ flex: 1, minWidth: 0, height: 140 }}
      >
        {paths && (
          <>
            <path d={paths.area} fill={t.areaFill} />
            <path
              d={paths.down}
              fill="none"
              stroke={BRAND_BLUE}
              strokeWidth="2.5"
            />
            <path
              d={paths.up}
              fill="none"
              stroke={t.up}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </>
        )}
      </svg>
    </Card>
  )
}

const HomePage = () => (
  <>
    <PageHeader title="首页" actions={<ModeSwitch />} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: SIZE.gap }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: SIZE.gap,
        }}
      >
        <ConnectionCard />
        <AccountCard />
      </div>
      <TrafficCard />
    </div>
  </>
)

export default HomePage
