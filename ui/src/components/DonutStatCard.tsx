import { Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
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
    ? [{ name: 'Waiting', value: 1, color: '#e5e7eb' }]
    : [
        { name: 'Up', value: up, color: '#22c55e' },
        { name: 'Down', value: down, color: '#ef4444' },
      ];

  return (
    <Card sx={{ height: '100%', minWidth: 160 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.25} alignItems="center">
          <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>
            {title}
          </Typography>
          {loading ? <CircularProgress size={32} /> : <BoxDonut data={data} />}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="body2" fontWeight={700} color="#22c55e">
                ↑ {up}
              </Typography>
              <Typography variant="caption" color="#6b7280">
                Adv
              </Typography>
            </Stack>
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="body2" fontWeight={700} color="#ef4444">
                ↓ {down}
              </Typography>
              <Typography variant="caption" color="#6b7280">
                Dec
              </Typography>
            </Stack>
          </Stack>
          {(caption || error) && (
            <Typography variant="caption" color={error ? '#ef4444' : '#6b7280'} textAlign="center">
              {error || caption}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const BoxDonut = ({ data }: { data: { name: string; value: number; color: string }[] }) => (
  <ResponsiveContainer width={96} height={96}>
    <PieChart>
      <Pie
        data={data}
        innerRadius={28}
        outerRadius={40}
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
);

export default DonutStatCard;
