import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SideNav from '../components/SideNav';

const DRAWER_WIDTH = 240;

const AppLayout = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(34,209,238,0.06), transparent 35%), radial-gradient(circle at 80% 0%, rgba(124,255,203,0.05), transparent 30%)',
      }}
    >
      <SideNav width={DRAWER_WIDTH} />
      <Box
        component="main"
        sx={{
          flex: 1,
          padding: 4,
          marginLeft: `${DRAWER_WIDTH}px`,
          color: 'text.primary',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
