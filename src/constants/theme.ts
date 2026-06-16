import { Platform } from 'react-native';

const headingFont = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-medium',
  default: 'System',
});

const bodyFont = Platform.select({
  ios: 'Avenir',
  android: 'sans-serif',
  default: 'System',
});

export const theme = {
  colors: {
    background: '#F4F0E8',
    surface: '#FFFCF7',
    mutedSurface: '#E8E0D3',
    border: '#D7CCBD',
    primary: '#204B5D',
    primarySoft: '#DCE8EC',
    accent: '#D87532',
    success: '#3F6B57',
    warning: '#AA6A34',
    danger: '#A04133',
    text: '#13242D',
    textMuted: '#5D6B72',
    white: '#FFFDF8',
    ink: '#08141A',
  },
  spacing: [0, 4, 8, 12, 16, 20, 24, 32, 40] as const,
  radius: {
    sm: 12,
    md: 18,
    lg: 28,
    pill: 999,
  },
  typography: {
    headingFont,
    bodyFont,
  },
  shadow: {
    shadowColor: '#17303D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
};
