import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import { NavLink, useLocation } from 'react-router-dom';

interface SideNavProps {
  width: number;
}

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/dashboard' },
  { label: 'Historical Data', icon: <HistoryIcon fontSize="small" />, path: '/historical' },
];

const SideNav = ({ width }: SideNavProps) => {
  const { pathname } = useLocation();

  return (
    <Box
      component="nav"
      sx={{
        width,
        flexShrink: 0,
        position: 'fixed',
        height: '100vh',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: '#fff',
      }}
    >
      <Toolbar>
        <Typography variant="h6" component="div">
          MarketNav
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default SideNav;
