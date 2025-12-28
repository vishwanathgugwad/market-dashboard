import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import BreadthTableCard, { BreadthRow } from '../components/BreadthTableCard';
import DateSelector from '../components/DateSelector';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import {
  getDailyBreadth,
  getIntradayBreadth,
  getTradingDays,
  streamDailyBreadth,
} from '../services/historicalService';
import { DailyBreadthResponse, IntradayBreadthResponse } from '../types/historical';

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

const getTodayDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

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
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(TIMEFRAME_OPTIONS[0].key);
  const [tradingDays, setTradingDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [daily, setDaily] = useState<DailyBreadthResponse | null>(null);
  const [intraday, setIntraday] = useState<Record<string, IntradayBreadthResponse | null>>({});
  const [loadingDays, setLoadingDays] = useState<boolean>(false);
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);
  const [loadingIntraday, setLoadingIntraday] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');
  const [streamedDaily, setStreamedDaily] = useState<DailyBreadthResponse[]>([]);
  const [streamProgress, setStreamProgress] = useState<{ total: number; received: number }>({ total: 0, received: 0 });
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string>('');
  const streamRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    const loadDays = async () => {
      setLoadingDays(true);
      setError('');
      try {
        const response = await getTradingDays(selectedIndex, 30);
        setTradingDays(response.days);
        setSelectedDate((prev) => prev || response.days[0] || '');
      } catch (err) {
        setTradingDays([]);
        setSelectedDate((prev) => prev || '');
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

    loadDaily();
  }, [selectedIndex, selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;

    setIntraday((prev) => ({ ...prev, [selectedTimeframe]: null }));

    const loadIntraday = async () => {
      setLoadingIntraday((prev) => ({ ...prev, [selectedTimeframe]: true }));

      try {
        const response = await getIntradayBreadth(selectedIndex, selectedDate, selectedTimeframe);
        setIntraday((prev) => ({ ...prev, [selectedTimeframe]: response }));
      } catch (err) {
        setIntraday((prev) => ({ ...prev, [selectedTimeframe]: null }));
      } finally {
        setLoadingIntraday((prev) => ({ ...prev, [selectedTimeframe]: false }));
      }
    };

    loadIntraday();
  }, [selectedIndex, selectedDate, selectedTimeframe]);

  useEffect(() => {
    streamRef.current?.close();
    setStreamError('');
    setStreamProgress({ total: 0, received: 0 });
    setStreamedDaily([]);
    setStreaming(true);

    const controller = streamDailyBreadth(selectedIndex, 60, {
      onMeta: (meta) => setStreamProgress((prev) => ({ ...prev, total: meta.totalDays || prev.total })),
      onData: (payload) =>
        setStreamedDaily((prev) => {
          const existing = prev.find((p) => p.date === payload.date);
          if (existing) return prev;
          return [...prev, payload];
        }),
      onDataError: (info) => setStreamError((prev) => prev || `Failed to load ${info.date}: ${info.message}`),
      onDone: (info) => {
        setStreamProgress((prev) => ({ ...prev, received: info.count ?? prev.received }));
        setStreaming(false);
      },
      onError: (message) => {
        setStreamError((prev) => prev || message);
        setStreaming(false);
      },
    });

    streamRef.current = controller;

    return () => {
      controller.close();
    };
  }, [selectedIndex]);

  useEffect(() => {
    setStreamProgress((prev) => ({ ...prev, received: streamedDaily.length }));
  }, [streamedDaily.length]);

  const selectedTimeframeLabel = useMemo(
    () => TIMEFRAME_OPTIONS.find((tf) => tf.key === selectedTimeframe)?.label ?? selectedTimeframe,
    [selectedTimeframe],
  );

  const intradayRows = useMemo(() => {
    const data = intraday[selectedTimeframe];
    if (!data) return [];

    return data.intervals.map((interval) => ({
      time: formatWindow(interval.start, interval.end),
      advances: interval.advances,
      declines: interval.declines,
      range: formatChange(interval.range),
      net: formatChange(interval.net),
    }));
  }, [intraday, selectedTimeframe]);

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

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems="center"
        justifyContent="center"
        width="100%"
      >
        <DateSelector
          dates={tradingDays}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          loading={loadingDays}
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
                {loadingDaily ? (
                  <Box display="flex" alignItems="center" justifyContent="center" py={2}>
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
                  {streamError && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      {streamError}
                    </Alert>
                  )}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    {streaming && <CircularProgress size={14} />}
                    <Typography variant="body2" color="text.secondary">
                      {streaming
                        ? `Receiving ${streamedDaily.length}/${streamProgress.total || '…'}`
                        : `Received ${streamedDaily.length} sessions`}
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
                    {streamedDaily.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Waiting for data…
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {[...streamedDaily]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((entry) => (
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
                    )}
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
            loading={loadingIntraday[selectedTimeframe]}
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
