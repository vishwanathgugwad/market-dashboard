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

interface IndexChartCardProps {
  title: string;
  data: IndexSeriesPoint[];
  marketOpen: boolean;
}

const IndexChartCard = ({ title, data, marketOpen }: IndexChartCardProps) => {
  return (
    <Card sx={{ width: '100%', minHeight: 360, height: '100%' }}>
      <CardHeader
        title={title}
        subheader={marketOpen ? 'Live intraday momentum' : 'Market closed · latest snapshot'}
        subheaderTypographyProps={{ color: 'text.secondary' }}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#17253a" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: '#9fb3c8' }} interval={Math.floor(data.length / 6) || 1} />
            <YAxis tick={{ fontSize: 12, fill: '#9fb3c8' }} width={60} tickFormatter={(value) => value.toLocaleString()} />
            {marketOpen && (
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                contentStyle={{ backgroundColor: '#0f1a29', border: '1px solid rgba(124,255,203,0.2)' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#45c49c"
              strokeWidth={2.8}
              dot={false}
              isAnimationActive={marketOpen}
            />
    <Card sx={{ width: '100%', minHeight: 360 }}>
      <CardHeader title={title} subheader="High-tempo view of intraday momentum" subheaderTypographyProps={{ color: 'text.secondary' }} />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18263a" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: '#9fb3c8' }} interval={Math.floor(data.length / 6)} />
            <YAxis tick={{ fontSize: 12, fill: '#9fb3c8' }} width={60} />
            <Tooltip labelFormatter={(label) => new Date(label).toLocaleTimeString()} contentStyle={{ backgroundColor: '#0f1a29', border: '1px solid rgba(124,255,203,0.2)' }} />
            <Line type="monotone" dataKey="value" stroke="#22d1ee" strokeWidth={2.6} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default IndexChartCard;
