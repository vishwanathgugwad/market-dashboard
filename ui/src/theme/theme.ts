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
        main: isDark ? '#34D399' : '#16A34A',
      },
      error: {
        main: isDark ? '#F87171' : '#DC2626',
      },
      warning: {
        main: isDark ? '#FBBF24' : '#F59E0B',
      },
      background: {
        default: isDark ? '#0B1220' : '#F8FAFC',
        paper: isDark ? '#0F172A' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#E2E8F0' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
    },
    shape: {
      borderRadius: 18,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius + 2,
            boxShadow: isDark
              ? '0 16px 40px rgba(2, 6, 23, 0.55)'
              : '0 12px 28px rgba(15, 23, 42, 0.08)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 22px 48px rgba(2, 6, 23, 0.65)'
                : '0 18px 36px rgba(15, 23, 42, 0.12)',
            },
          }),
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 24,
            '&:last-child': {
              paddingBottom: 24,
            },
          },
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
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 999,
            fontWeight: 600,
            letterSpacing: '0.02em',
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            border: `1px solid ${theme.palette.divider}`,
          }),
          label: {
            paddingInline: 10,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.16),
              color: theme.palette.primary.main,
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
            borderRadius: 12,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderBottomColor: theme.palette.divider,
            fontSize: 13,
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
          '*': {
            scrollbarColor: `${alpha(theme.palette.text.secondary, 0.6)} transparent`,
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
      h1: {
        fontWeight: 700,
        fontSize: '2.6rem',
        letterSpacing: '-0.04em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2.1rem',
        letterSpacing: '-0.03em',
      },
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
        letterSpacing: '0.02em',
      },
    },
  };

  return createTheme(themeOptions);
};
