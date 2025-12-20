import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  accentColor?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}

const MetricCard = ({
  title,
  subtitle,
  value,
  accentColor = '#0f172a',
  sparklineData,
  sparklineColor = '#22c55e',
  align = 'center',
  children,
}: MetricCardProps) => {
  const chartData = sparklineData?.map((val, idx) => ({ idx, value: val })) ?? [];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5} alignItems={align === 'center' ? 'center' : 'flex-start'}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
            {title}
          </Typography>
          {value !== undefined && (
            <Typography variant="h4" fontWeight={800} color={accentColor}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
              {subtitle}
            </Typography>
          )}
          {sparklineData && sparklineData.length > 0 && (
            <BoxWithChart color={sparklineColor} data={chartData} />
          )}
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
};

const BoxWithChart = ({ data, color }: { data: { idx: number; value: number }[]; color: string }) => (
  <ResponsiveContainer width={120} height={48}>
    <LineChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.4} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export default MetricCard;
