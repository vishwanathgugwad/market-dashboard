import { Box, Card, CardContent, CardHeader, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IndexSeriesPoint } from '../types/indices';
export type ChartDatum = { timestamp: string } & Record<string, number | string>;

interface LineConfig {
  dataKey: string;
  color: string;
  strokeWidth?: number;
}

interface IndexChartCardProps {
  title: string;
  data: Array<IndexSeriesPoint | ChartDatum>;
  marketOpen: boolean;
  lines?: LineConfig[];
  showGrid?: boolean;
}

const IndexChartCard = ({ title, data, marketOpen, lines, showGrid = true }: IndexChartCardProps) => {
  const theme = useTheme();
  const tooltipStyles = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[2],
  };

  return (
    <Card sx={{ width: '100%', minHeight: 320, height: '100%' }}>
      <CardHeader
        title={title}
        subheader={marketOpen ? 'Live intraday momentum' : 'Market closed · latest snapshot'}
        subheaderTypographyProps={{ color: 'text.secondary', variant: 'caption' }}
        titleTypographyProps={{ sx: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 13 } }}
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1, pb: 2 }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid strokeDasharray="4 6" stroke={alpha(theme.palette.text.secondary, 0.25)} />
            )}
            <XAxis
              dataKey="timestamp"
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              hide
            />
            <YAxis
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              hide
            />
            {marketOpen && (
              <Tooltip
                labelFormatter={(label) =>
                  new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
                contentStyle={tooltipStyles}
                itemStyle={{ color: theme.palette.text.primary }}
                cursor={{ stroke: alpha(theme.palette.primary.main, 0.18), strokeWidth: 1 }}
                content={<ChartTooltip />}
              />
            )}
            {(lines ?? [{ dataKey: 'value', color: theme.palette.primary.main, strokeWidth: 3 }]).map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth ?? 2.4}
                dot={false}
                isAnimationActive={marketOpen}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const ChartTooltip = ({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ dataKey?: string; value?: number | string; color?: string }>;
}) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label ? new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </Typography>
      <Stack spacing={0.5} mt={0.5}>
        {payload.map((entry) => (
          <Stack key={entry.dataKey} direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color ?? 'primary.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {entry.dataKey}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, marginLeft: 'auto' }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default IndexChartCard;
