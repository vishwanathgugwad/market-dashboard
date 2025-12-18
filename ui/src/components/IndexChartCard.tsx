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
}

const IndexChartCard = ({ title, data }: IndexChartCardProps) => {
  return (
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
