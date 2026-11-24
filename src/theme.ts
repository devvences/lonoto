import { alpha, createTheme, type Theme } from '@mui/material/styles';

export type ResolvedMode = 'light' | 'dark';

const fontFamily = [
  'Inter',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

export const monoFontFamily = [
  '"JetBrains Mono"',
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  '"Liberation Mono"',
  'monospace',
].join(',');

export function buildTheme(mode: ResolvedMode): Theme {
  const dark = mode === 'dark';

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#ffb457' : '#d97706',
        light: dark ? '#ffd08a' : '#f59e0b',
        dark: dark ? '#e08a2e' : '#b45309',
        contrastText: dark ? '#241707' : '#ffffff',
      },
      secondary: {
        main: dark ? '#7fc8ff' : '#1d6feb',
      },
      background: {
        default: dark ? '#0b1320' : '#f6f2ea',
        paper: dark ? '#121f33' : '#ffffff',
      },
      text: {
        primary: dark ? '#e9eff8' : '#1b2431',
        secondary: dark ? '#9fb0c8' : '#5d6b7e',
      },
      divider: dark ? 'rgba(255,255,255,0.09)' : 'rgba(22,32,48,0.10)',
      success: { main: dark ? '#63d6a4' : '#178a5f' },
      warning: { main: '#ffb457' },
      error: { main: dark ? '#ff8a8a' : '#c62828' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily,
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 750, letterSpacing: '-0.02em' },
      h4: { fontWeight: 750, letterSpacing: '-0.015em' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
      body1: { lineHeight: 1.65 },
      body2: { lineHeight: 1.6 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { WebkitTextSizeAdjust: '100%' },
          body: {
            minHeight: '100dvh',
            backgroundColor: dark ? '#0b1320' : '#f6f2ea',
            backgroundImage: dark
              ? [
                  'radial-gradient(1100px 560px at 12% -12%, rgba(255,180,87,0.10), transparent 62%)',
                  'radial-gradient(900px 520px at 100% -8%, rgba(86,146,255,0.10), transparent 58%)',
                ].join(',')
              : [
                  'radial-gradient(1000px 520px at 8% -10%, rgba(255,180,87,0.16), transparent 62%)',
                  'radial-gradient(900px 500px at 100% 0%, rgba(80,140,255,0.08), transparent 58%)',
                ].join(','),
            backgroundAttachment: 'fixed',
          },
          '::selection': {
            backgroundColor: alpha(dark ? '#ffb457' : '#f59e0b', 0.32),
          },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: dark
              ? 'rgba(255,255,255,0.16)'
              : 'rgba(20,30,50,0.20)',
            borderRadius: 999,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: dark
              ? 'rgba(255,255,255,0.26)'
              : 'rgba(20,30,50,0.32)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 650,
            paddingInline: 16,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 550 },
          label: { paddingInline: 10 },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 450 },
        styleOverrides: {
          tooltip: { fontSize: 12, fontWeight: 500, borderRadius: 8 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,50,0.08)'}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,50,0.08)'}`,
            marginTop: 6,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 700 },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
    },
  });

  return theme;
}
