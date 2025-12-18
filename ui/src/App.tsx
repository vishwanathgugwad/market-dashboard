import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AppLayout from './layouts/AppLayout';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#22d1ee',
    },
    secondary: {
      main: '#7cffcb',
    },
    background: {
      default: '#0b1624',
      paper: 'rgba(13, 23, 36, 0.9)',
    },
    text: {
      primary: '#e8f0ff',
      secondary: '#9fb3c8',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, rgba(18,31,47,0.9), rgba(11,18,32,0.9))',
          border: '1px solid rgba(124, 255, 203, 0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(13, 23, 36, 0.96)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          color: '#e8f0ff',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginInline: 8,
          marginBlock: 4,
          '&.Mui-selected': {
            backgroundColor: 'rgba(34, 209, 238, 0.12)',
            color: '#22d1ee',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(34, 209, 238, 0.2)',
          color: '#e8f0ff',
          background: 'rgba(255,255,255,0.03)',
          '&.Mui-selected': {
            background: 'linear-gradient(90deg, rgba(34,209,238,0.2), rgba(124,255,203,0.15))',
            color: '#22d1ee',
          },
        },
      },
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppLayout />
    </ThemeProvider>
  );
}

export default App;
