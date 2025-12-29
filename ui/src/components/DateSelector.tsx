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
    <Stack spacing={0.75} alignItems="flex-start">
      <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
        Date
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          px: 2,
          py: 1.25,
          bgcolor: 'background.paper',
          boxShadow: theme.shadows[2],
          minWidth: 240,
        }}
      >
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
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.35 : 1),
            },
          }}
        />
        {selectedDate && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {formatLabel(selectedDate).weekday}, {formatLabel(selectedDate).monthDay}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default DateSelector;
