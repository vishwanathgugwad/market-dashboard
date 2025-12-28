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
import { ReactNode, useEffect, useMemo, useState } from 'react';
import BreadthTableCard, { BreadthRow } from '../components/BreadthTableCard';
import DateSelector from '../components/DateSelector';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import { fetchBreadth, BreadthResponse } from '../lib/api';
import { getTradingDays } from '../services/historicalService';

const INDEX_OPTIONS: SegmentedTabOption[] = [
  { key: 'nifty50', label: 'NIFTY 50' },
  { key: 'banknifty', label: 'NIFTY Bank' },
  { key: 'finnifty', label: 'FINNIFTY' },
];

const TIMEFRAME_OPTIONS = [
  { key: '5m', label: '5 MIN', interval: '5minute' },
  { key: '15m', label: '15 MIN', interval: '15minute' },
  { key: '1h', label: '1 HOUR', interval: '60minute' },
];

const FALLBACK_DATES = ['2024-03-01', '2024-02-29', '2024-02-28', '2024-02-27'];

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

const formatPoints = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${value.toFixed(2)} pts`;

const HistoricalDataPage = () => {
  const todayDate = useMemo(() => formatDateInputValue(new Date()), []);
  const [selectedIndex, setSelectedIndex] = useState(INDEX_OPTIONS[0].key);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAME_OPTIONS[0].key);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [availableDates, setAvailableDates] = useState<string[]>(FALLBACK_DATES);
  const [datesLoading, setDatesLoading] = useState(false);
  const [breadthData, setBreadthData] = useState<BreadthResponse | null>(null);
  const [breadthLoading, setBreadthLoading] = useState(false);
  const [breadthError, setBreadthError] = useState<string | null>(null);

  const selectedTimeframeOption = TIMEFRAME_OPTIONS.find((tf) => tf.key === selectedTimeframe);
  const selectedTimeframeLabel = selectedTimeframeOption?.label ?? selectedTimeframe;
  const selectedInterval = selectedTimeframeOption?.interval ?? '5minute';

  const intradayRows: BreadthRow[] = useMemo(() => {
    if (!breadthData?.rows) return [];
    return breadthData.rows.map((row) => ({
      time: row.slot_label,
      advances: row.green,
      declines: row.red,
      range: row.rangePts,
      net: row.netPts,
    }));
  }, [breadthData]);

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

  useEffect(() => {
    let isActive = true;

    const loadBreadth = async () => {
      if (!selectedDate) return;
      setBreadthLoading(true);
      setBreadthError(null);
      try {
        const response = await fetchBreadth({
          indexKey: selectedIndex,
          date: selectedDate,
          interval: selectedInterval,
        });
        if (isActive) {
          setBreadthData(response);
        }
      } catch (error) {
        if (isActive) {
          setBreadthData(null);
          setBreadthError(error instanceof Error ? error.message : 'Failed to load breadth data.');
        }
      } finally {
        if (isActive) {
          setBreadthLoading(false);
        }
      }
    };

    loadBreadth();

    return () => {
      isActive = false;
    };
  }, [selectedIndex, selectedDate, selectedInterval]);

  const daily = breadthData?.daily;

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
                  {breadthLoading ? (
                    <Typography textAlign="center" color="text.secondary" sx={{ py: 2 }}>
                      Loading breadth data...
                    </Typography>
                  ) : breadthError ? (
                    <Typography textAlign="center" color="error" sx={{ py: 2 }}>
                      {breadthError}
                    </Typography>
                  ) : (
                    <>
                      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1.5}>
                        <StatPill label="Advances" value={daily?.advances ?? '—'} color="#22c55e" />
                        <StatPill label="Declines" value={daily?.declines ?? '—'} color="#ef4444" />
                        <StatPill label="Unchanged" value={daily?.unchanged ?? '—'} color="#0f172a" />
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
                          {formatPoints(daily?.rangePts)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Net Change
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="#22c55e">
                          {formatPoints(daily?.netPts)}
                        </Typography>
                      </Box>
                    </>
                  )}
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
                      Received 0 sessions
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
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                      No streaming data available.
                    </Typography>
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
            loading={breadthLoading}
            emptyText={breadthError ?? 'No data available'}
          />
        </Box>
      </Box>
    </Stack>
  );
};

const StatPill = ({ label, value, color }: { label: string; value: ReactNode; color: string }) => (
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
