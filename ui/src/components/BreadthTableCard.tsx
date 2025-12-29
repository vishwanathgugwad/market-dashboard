import {
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';

export interface BreadthRow {
  time: string;
  advances: number;
  declines: number;
  range?: number | null;
  net?: number | null;
}

interface BreadthTableCardProps {
  title: string;
  rows: BreadthRow[];
  loading?: boolean;
  emptyText?: string;
  emptyState?: ReactNode;
}

const formatCellValue = (value?: number | null) => (value === null || value === undefined ? '—' : value);

const BreadthTableCard = ({
  title,
  rows,
  loading,
  emptyText = 'No data available',
  emptyState,
}: BreadthTableCardProps) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="subtitle2"
          textAlign="center"
          sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#64748B', mb: 2 }}
        >
          {title}
        </Typography>

        {loading ? (
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
        ) : rows.length === 0 ? (
          emptyState ?? (
            <Typography textAlign="center" color="text.secondary">
              {emptyText}
            </Typography>
          )
        ) : (
          <Table size="small" sx={{ '& th, & td': { py: 1.4 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#16A34A' }}>Advances</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#DC2626' }}>Declines</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Range</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Net</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => {
                const dominant =
                  row.advances === row.declines ? 'neutral' : row.advances > row.declines ? 'adv' : 'dec';
                return (
                <TableRow key={row.time} hover sx={{ bgcolor: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.time}</TableCell>
                  <TableCell
                    sx={{
                      color: '#16A34A',
                      fontWeight: 700,
                      bgcolor: dominant === 'adv' ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                      borderRadius: 1,
                    }}
                  >
                    {row.advances}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#DC2626',
                      fontWeight: 700,
                      bgcolor: dominant === 'dec' ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                      borderRadius: 1,
                    }}
                  >
                    {row.declines}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{formatCellValue(row.range)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{formatCellValue(row.net)}</TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BreadthTableCard;
