import { alpha, createTheme } from '@mui/material/styles';
import type { PaletteMode, ThemeOptions } from '@mui/material/styles';

export type ThemeMode = PaletteMode;

export const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem('themeMode');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const getTheme = (mode: ThemeMode) => {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: isDark ? '#60A5FA' : '#2563EB',
      },
      secondary: {
        main: isDark ? '#A5B4FC' : '#0F172A',
      },
      success: {
        main: isDark ? '#4ADE80' : '#16A34A',
      },
      error: {
        main: isDark ? '#F87171' : '#DC2626',
      },
      warning: {
        main: isDark ? '#FBBF24' : '#F59E0B',
      },
      background: {
        default: isDark ? '#0B1220' : '#F8FAFC',
        paper: isDark ? '#111827' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#E2E8F0' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: isDark
              ? '0 18px 40px rgba(2, 6, 23, 0.55)'
              : '0 10px 24px rgba(15, 23, 42, 0.06)',
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
          }),
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderColor: theme.palette.primary.main,
            },
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderBottomColor: theme.palette.divider,
          }),
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
          }),
        },
      },
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          ':root': {
            colorScheme: theme.palette.mode,
            '--app-text-primary': theme.palette.text.primary,
            '--app-text-secondary': theme.palette.text.secondary,
            '--app-bg-default': theme.palette.background.default,
            '--app-bg-paper': theme.palette.background.paper,
            '--app-accent': theme.palette.primary.main,
            '--app-splash-logo': theme.palette.text.primary,
            '--app-splash-subtitle': theme.palette.text.secondary,
            '--app-splash-bg': isDark
              ? 'radial-gradient(circle at top, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.95) 60%, rgba(11, 18, 32, 1) 100%)'
              : 'radial-gradient(circle at top, #ffffff 0%, #f1f5f9 55%, #e2e8f0 100%)',
          },
          body: {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
          '::-webkit-scrollbar': {
            width: 8,
          },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? alpha(theme.palette.text.secondary, 0.4) : '#CBD5F5',
            borderRadius: 999,
          },
        }),
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 700,
      },
      subtitle2: {
        fontWeight: 600,
        letterSpacing: '0.08em',
      },
      body2: {
        fontWeight: 500,
      },
      caption: {
        fontWeight: 500,
      },
    },
  };

  return createTheme(themeOptions);
};
