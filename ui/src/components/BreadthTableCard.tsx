import {
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export interface BreadthRow {
  time: string;
  advances: number;
  declines: number;
  range?: string;
  net?: string;
}

interface BreadthTableCardProps {
  title: string;
  rows: BreadthRow[];
  loading?: boolean;
  emptyText?: string;
}

const BreadthTableCard = ({ title, rows, loading, emptyText = 'No data available' }: BreadthTableCardProps) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle2"
          textAlign="center"
          sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', mb: 2 }}
        >
          {title}
        </Typography>

        {loading ? (
          <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
            <CircularProgress size={22} />
          </Typography>
        ) : rows.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            {emptyText}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#22c55e' }}>Advances</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#ef4444' }}>Declines</TableCell>
                {rows.some((r) => r.range !== undefined) && <TableCell sx={{ fontWeight: 700 }}>Range</TableCell>}
                {rows.some((r) => r.net !== undefined) && <TableCell sx={{ fontWeight: 700 }}>Net</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.time} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.time}</TableCell>
                  <TableCell sx={{ color: '#22c55e', fontWeight: 700 }}>{row.advances}</TableCell>
                  <TableCell sx={{ color: '#ef4444', fontWeight: 700 }}>{row.declines}</TableCell>
                  {rows.some((r) => r.range !== undefined) && (
                    <TableCell sx={{ fontWeight: 600 }}>{row.range ?? '-'}</TableCell>
                  )}
                  {rows.some((r) => r.net !== undefined) && (
                    <TableCell sx={{ fontWeight: 600 }}>{row.net ?? '-'}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BreadthTableCard;
