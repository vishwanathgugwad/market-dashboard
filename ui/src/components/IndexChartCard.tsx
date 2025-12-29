import { Card, CardContent, CardHeader, useTheme } from '@mui/material';
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

const IndexChartCard = ({ title, data, marketOpen, lines, showGrid = false }: IndexChartCardProps) => {
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
      />
      <CardContent sx={{ pt: 1, pb: 2.5 }}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
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
                labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                contentStyle={tooltipStyles}
                labelStyle={{ color: theme.palette.text.secondary }}
                itemStyle={{ color: theme.palette.text.primary }}
                cursor={{ stroke: alpha(theme.palette.primary.main, 0.18), strokeWidth: 1 }}
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

export default IndexChartCard;
