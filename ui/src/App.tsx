import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AppLayout from './layouts/AppLayout';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a',
    },
    secondary: {
      main: '#14b8a6',
    },
    background: {
      default: '#f7f9fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#6b7280',
    },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: '#e5e7eb',
          color: '#0f172a',
          textTransform: 'none',
          '&.Mui-selected': {
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderColor: '#0f172a',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '::-webkit-scrollbar': {
          width: 8,
        },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: '#d1d5db',
          borderRadius: 999,
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
