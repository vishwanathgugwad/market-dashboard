import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MarketMood } from '../lib/api';

interface MarketMoodPillProps {
  mood: MarketMood | null;
  loading: boolean;
  error?: string | null;
}

const getMoodTone = (label?: string | null) => {
  switch (label) {
    case 'Risk-On':
      return 'risk-on';
    case 'Bullish':
      return 'bullish';
    case 'Neutral':
      return 'neutral';
    case 'Bearish':
      return 'bearish';
    case 'Risk-Off':
      return 'risk-off';
    default:
      return 'neutral';
  }
};

const MarketMoodPill = ({ mood, loading, error }: MarketMoodPillProps) => {
  const theme = useTheme();
  const isWaiting = !mood || mood.adr === null || mood.slotCompleted === false;
  const hasError = Boolean(error);

  const tone = isWaiting || hasError ? 'neutral' : getMoodTone(mood?.mood);

  const toneColorMap = {
    'risk-on': theme.palette.success.main,
    bullish: alpha(theme.palette.success.main, 0.7),
    neutral: theme.palette.text.secondary,
    bearish: alpha(theme.palette.error.main, 0.7),
    'risk-off': theme.palette.error.main,
  };

  const toneColor = toneColorMap[tone];

  const label = hasError ? '—' : isWaiting ? 'Mood: Waiting' : mood?.mood || '—';
  const adrText = hasError || isWaiting || mood?.adr === null ? 'ADR —' : `ADR ${mood.adr.toFixed(2)}`;
  const scoreText = !hasError && !isWaiting && mood?.score !== null && mood?.score !== undefined
    ? `${mood.score >= 0 ? '+' : ''}${mood.score}`
    : null;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.4,
        py: 0.6,
        borderRadius: 999,
        border: `1px solid ${alpha(toneColor, 0.35)}`,
        bgcolor: alpha(toneColor, 0.12),
        boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.08)',
        minHeight: 28,
      }}
    >
      {loading && !mood ? (
        <Skeleton variant="rounded" width={140} height={18} />
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 700, color: toneColor }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {adrText}
          </Typography>
          {scoreText && (
            <Typography variant="caption" sx={{ color: toneColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {scoreText}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default MarketMoodPill;
