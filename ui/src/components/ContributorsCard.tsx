import { Card, CardContent, Stack, Typography } from '@mui/material';

interface Contributor {
  name: string;
  change: number;
}

interface ContributorsCardProps {
  items: Contributor[];
}

const ContributorsCard = ({ items }: ContributorsCardProps) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
            Nifty50 Contributors
          </Typography>
          <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
            {items.map((item) => {
              const positive = item.change >= 0;
              return (
                <Stack
                  key={item.name}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    borderBottom: '1px dashed #e5e7eb',
                    pb: 0.5,
                  }}
                >
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
              );
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ContributorsCard;
