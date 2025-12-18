import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SideNav from '../components/SideNav';

const DRAWER_WIDTH = 240;

const AppLayout = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <SideNav width={DRAWER_WIDTH} />
      <Box
        component="main"
        sx={{
          flex: 1,
          padding: 3,
          marginLeft: `${DRAWER_WIDTH}px`,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
