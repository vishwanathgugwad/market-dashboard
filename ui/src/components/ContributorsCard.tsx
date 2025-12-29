import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

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

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
            {title}
          </Typography>
          <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
            {showStatus ? (
              <Typography variant="body2" color="text.secondary">
                {error ? 'Failed to fetch contributors' : 'Loading…'}
              </Typography>
            ) : (
              items.map((item) => {
                const positive = item.change >= 0;
                const barWidth = Math.max((Math.abs(item.change) / maxMagnitude) * 100, 6);
                return (
                  <Stack
                    key={item.name}
                    spacing={0.75}
                    sx={{
                      borderBottom: '1px dashed #e5e7eb',
                      pb: 1,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {item.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: positive ? '#22c55e' : '#ef4444' }}
                      >
                        {positive ? '+' : ''}
                        {item.change.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        position: 'relative',
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: '#e5e7eb',
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
                          backgroundColor: positive ? '#22c55e' : '#ef4444',
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
