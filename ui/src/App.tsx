import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AppLayout from './layouts/AppLayout';

const theme = createTheme({
  palette: {
    background: {
      default: '#f4f6f8',
    },
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
