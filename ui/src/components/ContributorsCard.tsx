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
  const gainers = items.filter((item) => item.change >= 0);
  const losers = items.filter((item) => item.change < 0);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#64748B' }}>
            {title}
          </Typography>
          <Stack spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
            {showStatus ? (
              <Typography variant="body2" color="text.secondary">
                {error ? 'Failed to fetch contributors' : 'Loading…'}
              </Typography>
            ) : (
              <>
                <ContributorSection
                  title="Top gainers"
                  items={gainers}
                  maxMagnitude={maxMagnitude}
                  tone="positive"
                />
                <ContributorSection
                  title="Top losers"
                  items={losers}
                  maxMagnitude={maxMagnitude}
                  tone="negative"
                />
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const ContributorSection = ({
  title,
  items,
  maxMagnitude,
  tone,
}: {
  title: string;
  items: Contributor[];
  maxMagnitude: number;
  tone: 'positive' | 'negative';
}) => {
  const color = tone === 'positive' ? '#16A34A' : '#DC2626';
  const emptyLabel = tone === 'positive' ? 'No gainers yet' : 'No losers yet';

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        items.map((item) => {
          const barWidth = Math.max((Math.abs(item.change) / maxMagnitude) * 100, 8);
          return (
            <Stack
              key={item.name}
              spacing={0.75}
              sx={{
                borderBottom: '1px dashed #E5E7EB',
                pb: 1,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: '#0F172A', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                >
                  {item.name}
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color }}>
                  {item.change >= 0 ? '+' : ''}
                  {item.change.toFixed(2)}
                </Typography>
              </Stack>
              <Box
                sx={{
                  position: 'relative',
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: '#E5E7EB',
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
  );
};

export default ContributorsCard;
