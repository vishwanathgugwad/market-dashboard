import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import BreadthTableCard, { BreadthRow } from '../components/BreadthTableCard';
import DateSelector from '../components/DateSelector';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import { getDailyBreadth, getIntradayBreadth, getTradingDays } from '../services/historicalService';
import { DailyBreadthResponse, IntradayBreadthResponse } from '../types/historical';

const INDEX_OPTIONS: SegmentedTabOption[] = [
  { key: 'nifty50', label: 'NIFTY50' },
  { key: 'banknifty', label: 'NIFTYBANK' },
  { key: 'sensex', label: 'SENSEX' },
  { key: 'midcapnifty', label: 'NIFTYMIDCAP' },
  { key: 'finnifty', label: 'NIFTYFINSERV' },
];

const TIMEFRAMES = [
  { key: '5m', label: '5 MIN' },
  { key: '15m', label: '15 MIN' },
  { key: '1h', label: '1 HOUR' },
];

const formatChange = (value?: number | null) => {
  if (value === undefined || value === null) return '—';
  const fixed = value.toFixed(2);
  return value > 0 ? `+${fixed}` : fixed;
};

const formatWindow = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${s.toLocaleTimeString([], opts)}-${e.toLocaleTimeString([], opts)}`;
};

const HistoricalDataPage = () => {
  const [selectedIndex, setSelectedIndex] = useState<string>(INDEX_OPTIONS[0].key);
  const [tradingDays, setTradingDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [daily, setDaily] = useState<DailyBreadthResponse | null>(null);
  const [intraday, setIntraday] = useState<Record<string, IntradayBreadthResponse | null>>({});
  const [loadingDays, setLoadingDays] = useState<boolean>(false);
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);
  const [loadingIntraday, setLoadingIntraday] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadDays = async () => {
      setLoadingDays(true);
      setError('');
      try {
        const response = await getTradingDays(selectedIndex, 30);
        setTradingDays(response.days);
        setSelectedDate(response.days[0] || '');
      } catch (err) {
        setTradingDays([]);
        setSelectedDate('');
        setError('Unable to load trading dates.');
      } finally {
        setLoadingDays(false);
      }
    };

    loadDays();
  }, [selectedIndex]);

  useEffect(() => {
    if (!selectedDate) return;

    setDaily(null);
    setIntraday({});

    const loadDaily = async () => {
      setLoadingDaily(true);
      try {
        const response = await getDailyBreadth(selectedIndex, selectedDate);
        setDaily(response);
      } catch (err) {
        setDaily(null);
        setError((prev) => prev || 'Unable to load daily breadth.');
      } finally {
        setLoadingDaily(false);
      }
    };

    const loadIntradayAll = async () => {
      for (const tf of TIMEFRAMES) {
        setLoadingIntraday((prev) => ({ ...prev, [tf.key]: true }));
      }

      try {
        const results = await Promise.all(
          TIMEFRAMES.map((tf) =>
            getIntradayBreadth(selectedIndex, selectedDate, tf.key).catch(() => null),
          ),
        );
        const merged: Record<string, IntradayBreadthResponse | null> = {};
        TIMEFRAMES.forEach((tf, idx) => {
          merged[tf.key] = results[idx];
        });
        setIntraday(merged);
      } finally {
        for (const tf of TIMEFRAMES) {
          setLoadingIntraday((prev) => ({ ...prev, [tf.key]: false }));
        }
      }
    };

    loadDaily();
    loadIntradayAll();
  }, [selectedIndex, selectedDate]);

  const intradayRows = useMemo(() => {
    const map: Record<string, BreadthRow[]> = {};
    TIMEFRAMES.forEach((tf) => {
      const data = intraday[tf.key];
      if (!data) {
        map[tf.key] = [];
        return;
      }

      map[tf.key] = data.intervals.map((interval) => ({
        time: formatWindow(interval.start, interval.end),
        advances: interval.advances,
        declines: interval.declines,
        range: formatChange(interval.range),
        net: formatChange(interval.net),
      }));
    });
    return map;
  }, [intraday]);

  return (
    <Stack spacing={3} alignItems="center">
      <Stack spacing={1} alignItems="center">
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: 2 }}>
          Historical Data
        </Typography>
        <SegmentedTabs options={INDEX_OPTIONS} value={selectedIndex} onChange={setSelectedIndex} />
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ width: '100%', maxWidth: 960 }}>
          {error}
        </Alert>
      )}

      <DateSelector
        dates={tradingDays}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        loading={loadingDays}
      />

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
              {loadingDaily ? (
                <Box display="flex" alignItems="center" justifyContent="center" py={6}>
                  <CircularProgress />
                </Box>
              ) : daily ? (
                <Stack spacing={2}>
                  <Typography textAlign="center" fontWeight={700}>
                    {new Date(`${daily.date}T00:00:00`).toLocaleDateString([], {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Typography>
                  <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1.5}>
                    <StatPill label="Advances" value={daily.advances} color="#22c55e" />
                    <StatPill label="Declines" value={daily.declines} color="#ef4444" />
                    <StatPill label="Unchanged" value={daily.unchanged} color="#0f172a" />
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
                      {daily.indexCandle?.range !== null && daily.indexCandle?.range !== undefined
                        ? `${daily.indexCandle.range.toFixed(2)} pts`
                        : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Net Change
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      color={
                        daily.indexCandle?.netChange !== null && daily.indexCandle?.netChange !== undefined
                          ? daily.indexCandle.netChange > 0
                            ? '#22c55e'
                            : '#ef4444'
                          : '#0f172a'
                      }
                    >
                      {formatChange(daily.indexCandle?.netChange)} pts
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography textAlign="center" color="text.secondary">
                  Select a date to view breadth
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box gridColumn={{ xs: 'span 12', md: 'span 5' }}>
          <BreadthTableCard
            title="5 MIN MARKET BREADTH"
            rows={intradayRows['5m'] || []}
            loading={loadingIntraday['5m']}
          />
        </Box>

        <Box
          gridColumn={{ xs: 'span 12', md: 'span 3' }}
          display="grid"
          gridTemplateRows={{ xs: 'repeat(2, auto)', md: 'repeat(2, 1fr)' }}
          gap={2}
        >
          <BreadthTableCard
            title="15 MIN MARKET BREADTH"
            rows={intradayRows['15m'] || []}
            loading={loadingIntraday['15m']}
          />
          <BreadthTableCard
            title="1 HOUR MARKET BREADTH"
            rows={intradayRows['1h'] || []}
            loading={loadingIntraday['1h']}
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
