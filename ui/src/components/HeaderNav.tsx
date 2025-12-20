import { Box, Typography } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';

interface HeaderNavItem {
  label: string;
  path: string;
}

interface HeaderNavProps {
  items: HeaderNavItem[];
}

const HeaderNav = ({ items }: HeaderNavProps) => {
  const { pathname } = useLocation();

  return (
    <Box
      component="header"
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
        borderBottom: '1px solid #e5e7eb',
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        backdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(247, 249, 251, 0.92)',
        zIndex: 10,
      }}
    >
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ letterSpacing: 4, textTransform: 'uppercase', mb: 1, color: '#0f172a' }}
      >
        INDEXBREADTH
      </Typography>
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
                  color: '#0f172a',
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
