import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import HeaderNav from '../components/HeaderNav';

const navItems = [
  { label: 'DASHBOARD', path: '/dashboard' },
  { label: 'HISTORICAL DATA', path: '/historical' },
];

const AppLayout = () => {
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
      <HeaderNav items={navItems} />

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
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
