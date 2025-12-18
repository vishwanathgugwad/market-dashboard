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
      <CardHeader title={title} />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} interval={Math.floor(data.length / 6)} />
            <YAxis tick={{ fontSize: 12 }} width={60} />
            <Tooltip labelFormatter={(label) => new Date(label).toLocaleTimeString()} />
            <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default IndexChartCard;
