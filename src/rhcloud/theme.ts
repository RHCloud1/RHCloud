import { useThemeMode } from '@/services/states'
import { classifyDelay } from '@/utils/delay'

// Values match the approved design canvas; text colors keep 4.5:1 contrast on their surfaces.
const light = {
  bg: '#F4F8FC',
  side: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E3EAF2',
  divider: '#EEF3F8',
  text: '#13233A',
  text2: '#5A6B80',
  link: '#1A6FD6',
  primary: '#1A6FD6',
  onPrimary: '#FFFFFF',
  navActive: '#E6F2FD',
  navActiveText: '#1A6FD6',
  chip: '#E6F2FD',
  neutralChip: '#EEF3F8',
  neutralChipText: '#3D4F66',
  track: '#EAF0F6',
  inputBorder: '#C9D5E2',
  ok: '#15803D',
  warn: '#B45309',
  bad: '#B91C1C',
  badBorder: '#F1C4C4',
  up: '#C2410C',
  areaFill: 'rgba(43,143,232,0.12)',
}

const dark: typeof light = {
  bg: '#0D1724',
  side: '#101C2C',
  surface: '#152234',
  border: '#24364C',
  divider: '#1E2E44',
  text: '#E8F0F8',
  text2: '#9AACC2',
  link: '#5DB4F7',
  primary: '#4AA8F5',
  onPrimary: '#08121E',
  navActive: '#1B3350',
  navActiveText: '#7CC3FA',
  chip: '#1B3350',
  neutralChip: '#1E2E44',
  neutralChipText: '#C3D0DF',
  track: '#1E2E44',
  inputBorder: '#3A4D66',
  ok: '#4ADE80',
  warn: '#FBBF24',
  bad: '#F87171',
  badBorder: '#5B2B2B',
  up: '#FB923C',
  areaFill: 'rgba(74,168,245,0.16)',
}

export type RhTokens = typeof light

export const BRAND_GRADIENT =
  'linear-gradient(150deg, #4BC9F3 0%, #2B8FE8 100%)'
export const BRAND_BLUE = '#2B8FE8'
export const FONT_STACK =
  '"Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", Inter, "PingFang SC", sans-serif'

export const useRhTokens = (): RhTokens =>
  useThemeMode() === 'light' ? light : dark

export const latencyColor = (t: RhTokens, delay: number) => {
  switch (classifyDelay(delay)) {
    case 'measured':
      return delay < 150 ? t.ok : t.warn
    case 'timeout':
    case 'error':
      return t.bad
    default:
      return t.text2
  }
}

export const formatLatency = (delay: number) =>
  ({
    testing: '测速中',
    untested: '未测速',
    timeout: '超时',
    error: '失败',
    measured: `${delay} ms`,
  })[classifyDelay(delay)]

/** One spacing/size scale for every screen so cards and controls line up. */
export const SIZE = {
  gap: 16,
  pad: 20,
  radius: 14,
  itemRadius: 12,
  controlRadius: 10,
  control: 36,
  button: 40,
  row: 52,
} as const
