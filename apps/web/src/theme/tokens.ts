export const prototypeTokens = {
  color: {
    bg: {
      app: '#F8F9FA',
      surface: '#FFFFFF',
      surfaceMuted: '#F8F9FA',
      surfaceSubtle: '#F3F7FA',
      search: '#EBF0F5',
      navActive: '#E1E7EC'
    },
    border: {
      default: '#E1E7EC',
      strong: '#D7DEE6'
    },
    text: {
      primary: '#212934',
      secondary: '#4B617C'
    },
    icon: {
      muted: '#8895A7'
    },
    brand: {
      teal500: '#009299',
      green500: '#00B488',
      gradientPrimary: 'linear-gradient(90deg, #009299 0%, #00B488 100%)'
    }
  },
  radius: {
    r2: 2,
    r4: 4
  },
  shadow: {
    brandAction: '0px 4px 24px rgba(85, 100, 119, 0.08)'
  },
  size: {
    sidebarWidth: 56,
    iconSm: 20,
    iconMd: 24,
    navButton: 36,
    searchWidth: 560
  },
  space: {
    s4: 4,
    s8: 8,
    s10: 10,
    s12: 12,
    s16: 16,
    s24: 24,
    s32: 32,
    s120: 120
  },
  typography: {
    title: {
      family: '"Poppins", "Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
      sizePx: 24,
      weight: 600
    },
    search: {
      family: '"Source Sans Pro", "Poppins", "Helvetica Neue", Arial, sans-serif',
      sizePx: 18,
      lineHeightPx: 24,
      weight: 400
    }
  }
} as const;
