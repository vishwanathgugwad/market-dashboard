import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import HeaderNav from '../components/HeaderNav';
import MarketMoodPill from '../components/MarketMoodPill';
import { MarketMood } from '../lib/api';

const navItems = [
  { label: 'DASHBOARD', path: '/dashboard' },
  { label: 'HISTORICAL DATA', path: '/historical' },
];

export type HeaderMoodState = {
  mood: MarketMood | null;
  loading: boolean;
  error?: string | null;
};

export type HeaderMoodContext = {
  setHeaderMood: Dispatch<SetStateAction<HeaderMoodState>>;
};

const AppLayout = () => {
  const { pathname } = useLocation();
  const [headerMood, setHeaderMood] = useState<HeaderMoodState>({ mood: null, loading: true, error: null });

  const moodPill = useMemo(() => {
    const onDashboard = pathname === '/' || pathname.startsWith('/dashboard');
    if (!onDashboard) return null;
    return <MarketMoodPill mood={headerMood.mood} loading={headerMood.loading} error={headerMood.error} />;
  }, [headerMood.error, headerMood.loading, headerMood.mood, pathname]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderNav items={navItems} moodPill={moodPill} />

      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: '1360px',
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
        }}
      >
        <Outlet context={{ setHeaderMood }} />
      </Box>
    </Box>
  );
};

export default AppLayout;
