import { Box, Stack, TextField, Typography } from '@mui/material';

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
  return (
    <Stack spacing={1} alignItems="center">
      <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#64748B' }}>
        Date Selector
      </Typography>
      <Box
        sx={{
          border: '1px solid #E2E8F0',
          borderRadius: 999,
          px: 2,
          py: 1.5,
          bgcolor: '#FFFFFF',
          boxShadow: '0 10px 22px rgba(15, 23, 42, 0.06)',
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
                bgcolor: '#F8FAFC',
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
