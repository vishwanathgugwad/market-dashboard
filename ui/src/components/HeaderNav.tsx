import { alpha } from '@mui/material/styles';
import { Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { isMarketOpen } from '../lib/marketTime';
import ThemeToggle from './ThemeToggle';

interface HeaderNavItem {
  label: string;
  path: string;
}

interface HeaderNavProps {
  items: HeaderNavItem[];
  moodPill?: ReactNode;
}

const HeaderNav = ({ items, moodPill }: HeaderNavProps) => {
  const { pathname } = useLocation();
  const theme = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const marketOpen = useMemo(() => isMarketOpen(now), [now]);
  const lastUpdated = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [now],
  );

  return (
    <Box
      component="header"
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 2.5, md: 3 },
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
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 3 }}
        alignItems="center"
        justifyContent="space-between"
        sx={{ position: 'relative' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: 'text.primary',
              fontSize: { xs: '1.1rem', md: '1.2rem' },
            }}
          >
            INDEXBREADTH
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={marketOpen ? 'Market Open' : 'Market Closed'}
              sx={{
                color: marketOpen ? 'success.main' : 'text.secondary',
                borderColor: marketOpen ? alpha(theme.palette.success.main, 0.35) : theme.palette.divider,
                bgcolor: alpha(
                  marketOpen ? theme.palette.success.main : theme.palette.background.paper,
                  marketOpen ? 0.12 : 0.6,
                ),
              }}
            />
            <Chip size="small" label={`Last updated ${lastUpdated}`} />
            {moodPill}
          </Stack>
        </Stack>
        <Box sx={{ position: { xs: 'static', md: 'absolute' }, right: 0, top: 0 }}>
          <ThemeToggle />
        </Box>
      </Stack>
      <Box display="flex" justifyContent="center" gap={{ xs: 2.5, md: 5 }} flexWrap="wrap" mt={{ xs: 2, md: 1.5 }}>
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
