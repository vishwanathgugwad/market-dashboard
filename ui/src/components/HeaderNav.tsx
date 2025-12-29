import { alpha } from '@mui/material/styles';
import { Box, Typography, useTheme } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

interface HeaderNavItem {
  label: string;
  path: string;
}

interface HeaderNavProps {
  items: HeaderNavItem[];
}

const HeaderNav = ({ items }: HeaderNavProps) => {
  const { pathname } = useLocation();
  const theme = useTheme();

  return (
    <Box
      component="header"
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 2.5, md: 3.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        backdropFilter: 'blur(8px)',
        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.88 : 0.92),
        zIndex: 10,
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ letterSpacing: 3, textTransform: 'uppercase', color: 'text.primary' }}
        >
          INDEXBREADTH
        </Typography>
        <Box sx={{ position: 'absolute', right: 0 }}>
          <ThemeToggle />
        </Box>
      </Box>
      <Box display="flex" justifyContent="center" gap={{ xs: 3, md: 6 }} flexWrap="wrap">
        {items.map((item) => {
          const isActive = pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <Typography
                variant="subtitle1"
                fontWeight={isActive ? 800 : 600}
                sx={{
                  letterSpacing: 1,
                  color: 'text.primary',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {item.label}
              </Typography>
            </NavLink>
          );
        })}
      </Box>
    </Box>
  );
};

export default HeaderNav;
