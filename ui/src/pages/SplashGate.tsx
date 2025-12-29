import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMarketOpen } from '../lib/marketTime';

const SplashGate = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const destination = isMarketOpen(new Date()) ? '/dashboard' : '/historical';
      navigate(destination, { replace: true });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <Box className="splash-screen">
      <Box textAlign="center">
        <Typography className="splash-logo" variant="h4">
          INDEXBREADTH
        </Typography>
        <Typography className="splash-subtitle" variant="body2">
          Preparing your market view
        </Typography>
        <Box className="splash-loader" aria-label="Loading">
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </Box>
      </Box>
    </Box>
  );
};

export default SplashGate;
