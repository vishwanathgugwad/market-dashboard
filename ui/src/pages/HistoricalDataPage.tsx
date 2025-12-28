import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import BreadthTableCard, { BreadthRow } from '../components/BreadthTableCard';
import DateSelector from '../components/DateSelector';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import { getTradingDays } from '../services/historicalService';

const INDEX_OPTIONS: SegmentedTabOption[] = [
  { key: 'nifty50', label: 'NIFTY 50' },
  { key: 'banknifty', label: 'NIFTY Bank' },
  { key: 'finnifty', label: 'FINNIFTY' },
  { key: 'midcapnifty', label: 'MIDCPNIFTY' },
];

const TIMEFRAME_OPTIONS = [
  { key: '5m', label: '5 MIN' },
  { key: '15m', label: '15 MIN' },
  { key: '30m', label: '30 MIN' },
  { key: '1h', label: '1 HOUR' },
  { key: '1d', label: '1 DAY' },
];

const FALLBACK_DATES = ['2024-03-01', '2024-02-29', '2024-02-28', '2024-02-27'];

const STATIC_DAILY = {
  date: '2024-03-01',
  advances: 32,
  declines: 18,
  unchanged: 0,
  indexCandle: {
    range: 142.35,
    netChange: 86.4,
  },
};

const STATIC_STREAM = [
  { date: '2024-03-01', advances: 32, declines: 18, unchanged: 0 },
  { date: '2024-02-29', advances: 28, declines: 22, unchanged: 0 },
  { date: '2024-02-28', advances: 30, declines: 20, unchanged: 0 },
  { date: '2024-02-27', advances: 25, declines: 25, unchanged: 0 },
];

const STATIC_INTRADAY_ROWS: BreadthRow[] = [
  { time: '09:15-10:00', advances: 18, declines: 12, range: '+28.4', net: '+14.2' },
  { time: '10:00-11:00', advances: 20, declines: 10, range: '+36.1', net: '+18.7' },
  { time: '11:00-12:00', advances: 16, declines: 14, range: '+12.3', net: '+6.1' },
  { time: '12:00-13:00', advances: 14, declines: 16, range: '-8.4', net: '-4.2' },
  { time: '13:00-14:00', advances: 19, declines: 11, range: '+21.6', net: '+10.8' },
];

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value?: string) => {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const HistoricalDataPage = () => {
  const todayDate = useMemo(() => formatDateInputValue(new Date()), []);
  const [selectedIndex, setSelectedIndex] = useState(INDEX_OPTIONS[0].key);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAME_OPTIONS[0].key);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [availableDates, setAvailableDates] = useState<string[]>(FALLBACK_DATES);
  const [datesLoading, setDatesLoading] = useState(false);
  const selectedTimeframeLabel =
    TIMEFRAME_OPTIONS.find((tf) => tf.key === selectedTimeframe)?.label ?? selectedTimeframe;
  const intradayRows = STATIC_INTRADAY_ROWS;

  useEffect(() => {
    let isActive = true;

    const loadDates = async () => {
      setDatesLoading(true);
      try {
        const response = await getTradingDays(selectedIndex, 30);
        if (!isActive) return;
        if (response.days?.length) {
          setAvailableDates(response.days);
          if (!selectedDate) {
            setSelectedDate(response.days[0]);
          }
        }
      } catch (error) {
        if (isActive) {
          setAvailableDates(FALLBACK_DATES);
        }
      } finally {
        if (isActive) {
          setDatesLoading(false);
        }
      }
    };

    loadDates();

    return () => {
      isActive = false;
    };
  }, [selectedIndex]);

  return (
    <Stack spacing={3} alignItems="center">
      <Stack spacing={1} alignItems="center">
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: 2 }}>
          Historical Data
        </Typography>
        <SegmentedTabs options={INDEX_OPTIONS} value={selectedIndex} onChange={setSelectedIndex} />
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems="center"
        justifyContent="center"
        width="100%"
      >
        <DateSelector
          dates={availableDates}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          loading={datesLoading}
        />

        <Stack spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
            Timeframe
          </Typography>
          <Box
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: 3,
              p: 2,
              bgcolor: '#ffffff',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
              minWidth: 260,
              width: '100%',
              maxWidth: 360,
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="timeframe-select-label">Select timeframe</InputLabel>
                <Select
                  labelId="timeframe-select-label"
                  label="Select timeframe"
                  value={selectedTimeframe}
                  onChange={(event) => setSelectedTimeframe(event.target.value)}
                >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Stack>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' }}
        gap={2}
        width="100%"
      >
        <Box gridColumn={{ xs: 'span 12', md: 'span 4' }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                textAlign="center"
                sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', mb: 2 }}
              >
                Daily Candle Market Breadth
              </Typography>
              <Stack spacing={2}>
                <Stack spacing={2}>
                  <Typography textAlign="center" fontWeight={700}>
                    {formatDisplayDate(selectedDate)}
                  </Typography>
                  <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1.5}>
                    <StatPill label="Advances" value={STATIC_DAILY.advances} color="#22c55e" />
                    <StatPill label="Declines" value={STATIC_DAILY.declines} color="#ef4444" />
                    <StatPill label="Unchanged" value={STATIC_DAILY.unchanged} color="#0f172a" />
                  </Box>
                  <Box
                    sx={{
                      border: '1px dashed #e5e7eb',
                      borderRadius: 3,
                      p: 2,
                      bgcolor: '#f9fafb',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Range
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {STATIC_DAILY.indexCandle.range.toFixed(2)} pts
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Net Change
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#22c55e">
                      +{STATIC_DAILY.indexCandle.netChange.toFixed(2)} pts
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    borderTop: '1px solid #e5e7eb',
                    pt: 2,
                    mt: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ letterSpacing: 0.5, mb: 1 }}>
                    Streaming (last 60 sessions)
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Received {STATIC_STREAM.length} sessions
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      maxHeight: 260,
                      overflow: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: 2,
                      p: 1,
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Stack spacing={1}>
                      {STATIC_STREAM.map((entry) => (
                        <Box
                          key={entry.date}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr repeat(3, 0.8fr)',
                            gap: 1,
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            bgcolor: '#fff',
                            boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
                          }}
                        >
                          <Typography variant="body2" fontWeight={700}>
                            {new Date(`${entry.date}T00:00:00`).toLocaleDateString([], {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 700 }}>
                            A: {entry.advances}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 700 }}>
                            D: {entry.declines}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            U: {entry.unchanged}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box gridColumn={{ xs: 'span 12', md: 'span 8' }}>
          <BreadthTableCard
            title={`${selectedTimeframeLabel} MARKET BREADTH`}
            rows={intradayRows}
            loading={false}
          />
        </Box>
      </Box>
    </Stack>
  );
};

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Box
    sx={{
      border: '1px solid #e5e7eb',
      borderRadius: 3,
      p: 2,
      bgcolor: '#ffffff',
      textAlign: 'center',
      boxShadow: '0 8px 20px rgba(15,23,42,0.05)',
    }}
  >
    <Typography variant="caption" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={800} sx={{ color }}>
      {value}
    </Typography>
  </Box>
);

export default HistoricalDataPage;
