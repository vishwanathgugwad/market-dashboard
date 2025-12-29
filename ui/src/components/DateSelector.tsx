import { Box, Stack, TextField, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface DateSelectorProps {
  dates: string[];
  selectedDate?: string;
  onSelect: (date: string) => void;
  loading?: boolean;
}

const formatLabel = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
  const monthDay = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  return { weekday, monthDay };
};

const DateSelector = ({ dates, selectedDate, onSelect, loading }: DateSelectorProps) => {
  const theme = useTheme();

  return (
    <Stack spacing={1} alignItems="center">
      <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
        Date Selector
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 999,
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper',
          boxShadow: theme.shadows[2],
          minWidth: 260,
          width: '100%',
          maxWidth: 360,
        }}
      >
        <Stack spacing={1.5}>
          {loading && (
            <Typography textAlign="center" color="text.secondary">
              Loading dates...
            </Typography>
          )}
          <TextField
            label="Select date"
            type="date"
            value={selectedDate ?? ''}
            onChange={(event) => onSelect(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            disabled={loading}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 999,
                bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.35 : 1),
              },
            }}
          />
          {selectedDate && (
            <Typography textAlign="center" variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {formatLabel(selectedDate).weekday}, {formatLabel(selectedDate).monthDay}
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default DateSelector;
