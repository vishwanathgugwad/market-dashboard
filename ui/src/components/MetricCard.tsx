import { Card, CardContent, Stack, Typography, useTheme } from '@mui/material';
import { ReactNode } from 'react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  valueSlot?: ReactNode;
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
  valueSlot,
  accentColor,
  sparklineData,
  sparklineColor,
  align = 'center',
  children,
}: MetricCardProps) => {
  const theme = useTheme();
  const chartData = sparklineData?.map((val, idx) => ({ idx, value: val })) ?? [];
  const resolvedAccent = accentColor ?? theme.palette.text.primary;
  const resolvedSparkline = sparklineColor ?? theme.palette.success.main;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          spacing={1.5}
          alignItems={align === 'center' ? 'center' : 'flex-start'}
          sx={{ width: '100%' }}
        >
          <Typography
            variant="subtitle2"
            sx={{ letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary', width: '100%', textAlign: align }}
          >
            {title}
          </Typography>
          {valueSlot}
          {value !== undefined && !valueSlot && (
            <Typography
              variant="h4"
              fontWeight={800}
              color={resolvedAccent}
              sx={{
                width: '100%',
                textAlign: align,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                lineHeight: 1.15,
                fontSize: { xs: '1.6rem', sm: '1.85rem', md: '2.05rem' },
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'text.secondary',
                width: '100%',
                textAlign: align,
              }}
            >
              {subtitle}
            </Typography>
          )}
          {sparklineData && sparklineData.length > 0 && (
            <BoxWithChart color={resolvedSparkline} data={chartData} />
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
