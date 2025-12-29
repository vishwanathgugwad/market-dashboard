import {
  Card,
  CardContent,
  Skeleton,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  const theme = useTheme();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle2"
          textAlign="left"
          sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', mb: 2 }}
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
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader sx={{ '& th, & td': { py: 1.2 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'success.main', bgcolor: 'background.paper' }}>Adv</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'error.main', bgcolor: 'background.paper' }}>Dec</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Range</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Net</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => {
                  const dominant =
                    row.advances === row.declines ? 'neutral' : row.advances > row.declines ? 'adv' : 'dec';
                  return (
                    <TableRow
                      key={row.time}
                      hover
                      sx={{ bgcolor: idx % 2 === 0 ? alpha(theme.palette.primary.main, 0.04) : 'transparent' }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{row.time}</TableCell>
                      <TableCell
                        sx={{
                          color: 'success.main',
                          fontWeight: 700,
                          bgcolor: dominant === 'adv' ? alpha(theme.palette.success.main, 0.12) : 'transparent',
                          borderRadius: 1,
                        }}
                      >
                        {row.advances}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: 'error.main',
                          fontWeight: 700,
                          bgcolor: dominant === 'dec' ? alpha(theme.palette.error.main, 0.12) : 'transparent',
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
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default BreadthTableCard;
