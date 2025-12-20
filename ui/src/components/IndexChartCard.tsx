import { Card, CardContent, CardHeader } from '@mui/material';
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
  return (
    <Card sx={{ width: '100%', minHeight: 320, height: '100%' }}>
      <CardHeader
        title={title}
        subheader={marketOpen ? 'Live intraday momentum' : 'Market closed · latest snapshot'}
        subheaderTypographyProps={{ color: 'text.secondary' }}
        titleTypographyProps={{ sx: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 } }}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis hide dataKey="timestamp" />
            <YAxis hide />
            {marketOpen && (
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
              />
            )}
            {(lines ?? [{ dataKey: 'value', color: '#f97316', strokeWidth: 3 }]).map((line) => (
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
