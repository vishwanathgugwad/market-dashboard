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
        borderRight: '1px solid rgba(124, 255, 203, 0.16)',
        bgcolor: 'linear-gradient(180deg, #0f1b2d 0%, #0b1220 100%)',
        color: 'text.primary',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}
    >
      <Toolbar sx={{ alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(34,209,238,0.25), rgba(124,255,203,0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(34, 209, 238, 0.35)',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="primary.light">
            IB
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Monitor
          </Typography>
          <Typography variant="h6" component="div" fontWeight={700}>
            Index Breadth
          </Typography>
        </Box>
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
