import { Box, Card, CardContent, Skeleton, Stack, Typography, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const data = empty
    ? [{ name: 'Waiting', value: 1, color: theme.palette.divider }]
    : [
        { name: 'Up', value: up, color: theme.palette.success.main },
        { name: 'Down', value: down, color: theme.palette.error.main },
      ];

  return (
    <Card sx={{ height: '100%', minWidth: 160 }}>
      <CardContent>
        <Stack spacing={1.25} alignItems="center">
          <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
            {title}
          </Typography>
          {loading ? <Skeleton variant="circular" width={108} height={108} /> : <BoxDonut data={data} centerLabel="ADV / DEC" />}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="body2" fontWeight={700} color="success.main">
                ↑ {up}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Adv
              </Typography>
            </Stack>
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="body2" fontWeight={700} color="error.main">
                ↓ {down}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dec
              </Typography>
            </Stack>
          </Stack>
          {(caption || error) && (
            <Typography variant="caption" color={error ? 'error.main' : 'text.secondary'} textAlign="center">
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
  <Box sx={{ position: 'relative', width: 120, height: 120 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={34}
          outerRadius={56}
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
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {centerLabel}
      </Typography>
    </Box>
  </Box>
);

export default DonutStatCard;
