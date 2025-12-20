import { Box, ButtonBase, Grid, Stack, Typography } from '@mui/material';

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
      <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
        Date Selector
      </Typography>
      <Box
        sx={{
          border: '1px solid #e5e7eb',
          borderRadius: 3,
          p: 2,
          bgcolor: '#ffffff',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
          minWidth: 260,
        }}
      >
        {loading ? (
          <Typography textAlign="center" color="text.secondary">
            Loading dates...
          </Typography>
        ) : dates.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            No trading days found
          </Typography>
        ) : (
          <Grid container spacing={1}>
            {dates.map((date) => {
              const isActive = date === selectedDate;
              const { weekday, monthDay } = formatLabel(date);
              return (
                <Grid item xs={4} sm={3} md={2} key={date}>
                  <ButtonBase
                    onClick={() => onSelect(date)}
                    sx={{
                      width: '100%',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isActive ? '#0f172a' : '#e5e7eb',
                      bgcolor: isActive ? '#0f172a' : '#f9fafb',
                      color: isActive ? '#ffffff' : '#0f172a',
                      py: 1.25,
                      px: 1,
                      flexDirection: 'column',
                      display: 'flex',
                      gap: 0.5,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Typography variant="caption" sx={{ opacity: isActive ? 0.9 : 0.7, fontWeight: 600 }}>
                      {weekday}
                    </Typography>
                    <Typography variant="body2" fontWeight={800} letterSpacing={0.5}>
                      {monthDay}
                    </Typography>
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Stack>
  );
};

export default DateSelector;
