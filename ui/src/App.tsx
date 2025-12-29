import { CssBaseline, ThemeProvider } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeModeContext } from './theme/ThemeModeContext';
import { getTheme, ThemeMode } from './theme/theme';

interface AppProps {
  initialMode: ThemeMode;
}

function App({ initialMode }: AppProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    window.localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  const contextValue = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Outlet />
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default App;
