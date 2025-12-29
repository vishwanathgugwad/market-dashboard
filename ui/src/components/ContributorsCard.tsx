import { Box, Card, CardContent, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface Contributor {
  name: string;
  change: number;
}

interface ContributorsCardProps {
  title: string;
  items: Contributor[];
  loading?: boolean;
  error?: string | null;
}

const ContributorsCard = ({ title, items, loading = false, error = null }: ContributorsCardProps) => {
  const showStatus = loading || error;
  const maxMagnitude = items.reduce((max, item) => Math.max(max, Math.abs(item.change)), 0) || 1;
  const theme = useTheme();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
            {title}
          </Typography>
          <Stack
            spacing={1.2}
            sx={{
              maxHeight: 320,
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(theme.palette.text.secondary, 0.4),
                borderRadius: 999,
              },
            }}
          >
            {showStatus ? (
              error ? (
                <Typography variant="body2" color="text.secondary">
                  Failed to fetch contributors
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <Skeleton key={idx} variant="rounded" height={28} />
                  ))}
                </Stack>
              )
            ) : (
              items.map((item) => {
                const tone = item.change >= 0 ? 'positive' : 'negative';
                const color = tone === 'positive' ? theme.palette.success.main : theme.palette.error.main;
                const barWidth = Math.max((Math.abs(item.change) / maxMagnitude) * 100, 8);
                return (
                  <Stack
                    key={item.name}
                    spacing={0.6}
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          color: 'text.primary',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }}
                      >
                        {item.name}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color }}>
                        {item.change >= 0 ? '+' : ''}
                        {item.change.toFixed(2)}%
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        position: 'relative',
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: alpha(theme.palette.text.primary, 0.12),
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${barWidth}%`,
                          borderRadius: 999,
                          backgroundColor: color,
                        }}
                      />
                    </Box>
                  </Stack>
                );
              })
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ContributorsCard;
