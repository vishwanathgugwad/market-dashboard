import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

interface MarketBreadthRow {
  time: string;
  advances: number;
  declines: number;
  range: string;
}

interface MarketBreadthTableProps {
  title: string;
  rows: MarketBreadthRow[];
}

const MarketBreadthTable = ({ title, rows }: MarketBreadthTableProps) => (
  <Card>
    <CardContent>
      <Typography
        variant="subtitle2"
        textAlign="center"
        sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', mb: 2 }}
      >
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">
          No data available
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#22c55e' }}>Advances</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#ef4444' }}>Declines</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Range</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.time} hover>
                <TableCell>{row.time}</TableCell>
                <TableCell sx={{ color: '#22c55e', fontWeight: 600 }}>{row.advances}</TableCell>
                <TableCell sx={{ color: '#ef4444', fontWeight: 600 }}>{row.declines}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.range}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);

export default MarketBreadthTable;
