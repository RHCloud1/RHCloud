import getSystem from '@/utils/get-system'
const OS = getSystem()

// default theme setting
export const defaultTheme = {
  primary_color: '#1A6FD6',
  secondary_color: '#2B8FE8',
  primary_text: '#13233A',
  secondary_text: '#5A6B80',
  info_color: '#1A6FD6',
  error_color: '#B91C1C',
  warning_color: '#B45309',
  success_color: '#15803D',
  background_color: '#FFFFFF',
  font_family: `"Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji"${
    OS === 'windows' ? ', twemoji mozilla' : ''
  }`,
}

// dark mode
export const defaultDarkTheme = {
  ...defaultTheme,
  primary_color: '#4AA8F5',
  secondary_color: '#4BC9F3',
  primary_text: '#E8F0F8',
  background_color: '#152234',
  secondary_text: '#9AACC2',
  info_color: '#4AA8F5',
  error_color: '#F87171',
  warning_color: '#FBBF24',
  success_color: '#4ADE80',
}
