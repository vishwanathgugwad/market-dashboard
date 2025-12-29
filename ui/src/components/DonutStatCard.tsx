import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface DonutStatCardProps {
  title: string;
  up: number;
  down: number;
  caption?: string;
  error?: string;
  loading?: boolean;
  empty?: boolean;
}

const DonutStatCard = ({ title, up, down, caption, error, loading, empty }: DonutStatCardProps) => {
  const data = empty
    ? [{ name: 'Waiting', value: 1, color: '#E2E8F0' }]
    : [
        { name: 'Up', value: up, color: '#16A34A' },
        { name: 'Down', value: down, color: '#DC2626' },
      ];

  return (
    <Card sx={{ height: '100%', minWidth: 160 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.25} alignItems="center">
          <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#64748B' }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="circular" width={96} height={96} />
          ) : (
            <BoxDonut data={data} centerLabel="Adv vs Dec" />
          )}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="body2" fontWeight={700} color="#16A34A">
                ↑ {up}
              </Typography>
              <Typography variant="caption" color="#64748B">
                Adv
              </Typography>
            </Stack>
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="body2" fontWeight={700} color="#DC2626">
                ↓ {down}
              </Typography>
              <Typography variant="caption" color="#64748B">
                Dec
              </Typography>
            </Stack>
          </Stack>
          {(caption || error) && (
            <Typography variant="caption" color={error ? '#DC2626' : '#64748B'} textAlign="center">
              {error || caption}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const BoxDonut = ({
  data,
  centerLabel,
}: {
  data: { name: string; value: number; color: string }[];
  centerLabel: string;
}) => (
  <Box sx={{ position: 'relative', width: 108, height: 108 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={24}
          outerRadius={48}
          startAngle={90}
          endAngle={450}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="none" />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 1,
      }}
    >
      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
        {centerLabel}
      </Typography>
    </Box>
  </Box>
);

export default DonutStatCard;
