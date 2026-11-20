import { useLockFn } from 'ahooks'
import { useEffect, useMemo, useState } from 'react'

import { useGroupDelays } from '@/hooks/use-group-delays'
import { useProxySelection } from '@/hooks/use-proxy-selection'
import { useVerge } from '@/hooks/use-verge'
import { useAppRefreshers } from '@/providers/app-data-context'
import delayManager from '@/services/delay'
import {
  isInteractableMember,
  resolveMember,
  type InteractableProxyMember,
} from '@/types/proxy-view'

import { Button, PageHeader } from '../components/ui'
import { useNodeGroups } from '../hooks'
import { formatLatency, latencyColor, SIZE, useRhTokens } from '../theme'

const memberType = (member: InteractableProxyMember) =>
  member.kind === 'node' ? member.node.type : member.group.type

const NodesPage = () => {
  const t = useRhTokens()
  const { verge } = useVerge()
  const { proxyView, groups, main } = useNodeGroups()
  const { refreshProxy } = useAppRefreshers()
  const { changeProxy } = useProxySelection({
    onSuccess: () => void refreshProxy(),
  })
  const [groupName, setGroupName] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [testing, setTesting] = useState(false)

  const group = groups.find((g) => g.name === groupName) ?? main
  const delays = useGroupDelays(group?.name ?? null)
  const selectable = group?.type === 'Selector'

  useEffect(() => {
    if (group?.testUrl) delayManager.setUrl(group.name, group.testUrl)
  }, [group?.name, group?.testUrl])

  const members = useMemo(() => {
    if (!proxyView || !group) return []
    return group.members
      .map((ref) => resolveMember(proxyView, ref))
      .filter(isInteractableMember)
  }, [proxyView, group])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? members.filter((m) => m.ref.name.toLowerCase().includes(q))
      : members
  }, [members, query])

  const testAll = useLockFn(async () => {
    if (!group) return
    setTesting(true)
    try {
      await delayManager.checkListDelay(
        members,
        group.name,
        verge?.default_latency_timeout || 10000,
      )
    } finally {
      setTesting(false)
      void refreshProxy()
    }
  })

  return (
    <>
      <PageHeader
        title="节点"
        actions={
          <div style={{ display: 'flex', gap: 12 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: SIZE.control,
                boxSizing: 'border-box',
                padding: '0 12px',
                borderRadius: SIZE.controlRadius,
                border: `1px solid ${t.inputBorder}`,
                background: t.surface,
                color: t.text2,
                fontSize: 14,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="搜索节点"
                aria-label="搜索节点"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  border: 0,
                  outline: 'none',
                  font: 'inherit',
                  width: 150,
                  background: 'transparent',
                  color: t.text,
                }}
              />
            </label>
            <Button
              variant="primary"
              loading={testing}
              disabled={!group}
              onClick={testAll}
              style={{ height: SIZE.control }}
            >
              全部测速
            </Button>
          </div>
        }
      />

      {groups.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: t.text2 }}>
          还没有节点。请回到首页点“同步订阅”。
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="节点分组"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            {groups.map((g) => {
              const active = g.name === group?.name
              return (
                <button
                  key={g.name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroupName(g.name)}
                  style={{
                    height: 32,
                    padding: '0 16px',
                    borderRadius: 16,
                    font: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: active ? 0 : `1px solid ${t.inputBorder}`,
                    background: active ? t.primary : t.surface,
                    color: active ? t.onPrimary : t.neutralChipText,
                  }}
                >
                  {g.name}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 13, color: t.text2, marginBottom: 12 }}>
            当前分组 <b style={{ color: t.text }}>{group?.name}</b> ·{' '}
            {members.length} 个节点
            {selectable ? ' · 点击节点即可切换' : ' · 此分组自动选择最快的节点'}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {visible.map((member) => {
              const name = member.ref.name
              const selected = group?.now === name
              const delay = delays.of(member)
              return (
                <button
                  key={`${member.kind}:${name}`}
                  type="button"
                  disabled={!selectable}
                  aria-pressed={selected}
                  onClick={() =>
                    group &&
                    changeProxy(
                      group.name,
                      name,
                      group.now ?? undefined,
                      group.fixed ?? undefined,
                    )
                  }
                  onDoubleClick={() =>
                    group &&
                    void delayManager.checkDelay(member, group.name, 10000)
                  }
                  title={selectable ? '单击切换，双击单独测速' : '双击单独测速'}
                  style={{
                    boxSizing: 'border-box',
                    height: 76,
                    padding: '14px 16px',
                    borderRadius: SIZE.itemRadius,
                    font: 'inherit',
                    color: t.text,
                    textAlign: 'left',
                    cursor: selectable ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: t.surface,
                    border: selected
                      ? `2px solid ${t.primary}`
                      : `1px solid ${t.border}`,
                    boxShadow: selected
                      ? '0 4px 14px rgba(26,111,214,0.14)'
                      : 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {name}
                    </span>
                    {selected && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={t.primary}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="img"
                        aria-label="当前节点"
                      >
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: t.neutralChip,
                        color: t.neutralChipText,
                        fontWeight: 600,
                      }}
                    >
                      {memberType(member)}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: latencyColor(t, delay),
                      }}
                    >
                      {formatLatency(delay)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

export default NodesPage
