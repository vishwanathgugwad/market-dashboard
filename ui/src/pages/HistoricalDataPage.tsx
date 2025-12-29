import { Box, Button, Card, CardContent, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
  const theme = useTheme();
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
  const timeframeTabs = TIMEFRAME_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
  }));

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
          if (!response.days.includes(selectedDate)) {
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

  const loadBreadth = useCallback(async () => {
    if (!selectedDate) return;
    setBreadthLoading(true);
    setBreadthError(null);
    try {
      const response = await fetchBreadth({
        indexKey: selectedIndex,
        date: selectedDate,
        interval: selectedInterval,
      });
      setBreadthData(response);
    } catch (error) {
      setBreadthData(null);
      setBreadthError(error instanceof Error ? error.message : 'Failed to load breadth data.');
    } finally {
      setBreadthLoading(false);
    }
  }, [selectedDate, selectedIndex, selectedInterval]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!isActive) return;
      await loadBreadth();
    };
    load();
    return () => {
      isActive = false;
    };
  }, [loadBreadth]);

  const daily = breadthData?.daily;
  const breadthErrorMessage = breadthError
    ? 'We could not load breadth data right now.'
    : null;
  const errorState = breadthErrorMessage ? (
    <ErrorState
      title="Unable to load data"
      message={breadthErrorMessage}
      hint="Retry in a moment or switch the timeframe."
      onRetry={loadBreadth}
    />
  ) : null;

  return (
    <Stack spacing={3} alignItems="center">
      <SegmentedTabs options={INDEX_OPTIONS} value={selectedIndex} onChange={setSelectedIndex} />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        width="100%"
      >
        <DateSelector
          dates={availableDates}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          loading={datesLoading}
        />

        <Stack spacing={0.75} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
            Timeframe
          </Typography>
          <SegmentedTabs options={timeframeTabs} value={selectedTimeframe} onChange={setSelectedTimeframe} />
        </Stack>
      </Stack>

      <Card sx={{ width: '100%' }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
              Selected day summary
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDisplayDate(selectedDate)}
            </Typography>
          </Stack>
          {breadthLoading ? (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(5, 1fr)' }} gap={1.5} mt={2}>
              {[0, 1, 2, 3, 4].map((idx) => (
                <Skeleton key={idx} variant="rounded" height={64} />
              ))}
            </Box>
          ) : (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(5, 1fr)' }} gap={1.5} mt={2}>
              <SummaryPill label="Adv" value={daily?.advances ?? '—'} tone="positive" />
              <SummaryPill label="Dec" value={daily?.declines ?? '—'} tone="negative" />
              <SummaryPill label="Unch" value={daily?.unchanged ?? '—'} tone="neutral" />
              <SummaryPill label="Range Pts" value={formatPoints(daily?.rangePts)} tone="neutral" />
              <SummaryPill label="Net Pts" value={formatPoints(daily?.netPts)} tone="positive" />
            </Box>
          )}
        </CardContent>
      </Card>

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
                sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', mb: 2 }}
              >
                Daily Candle Market Breadth
              </Typography>
              <Stack spacing={2}>
                <Stack spacing={2}>
                  <Typography textAlign="center" fontWeight={700}>
                    {formatDisplayDate(selectedDate)}
                  </Typography>
                  {breadthLoading ? (
                    <Stack spacing={2} sx={{ py: 1 }}>
                      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1.5}>
                        {[0, 1, 2].map((idx) => (
                          <Skeleton key={idx} variant="rounded" height={72} />
                        ))}
                      </Box>
                      <Skeleton variant="rounded" height={120} />
                    </Stack>
                  ) : breadthErrorMessage ? (
                    <Box sx={{ py: 2 }}>{errorState}</Box>
                  ) : (
                    <>
                      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1.5}>
                        <StatPill label="Advances" value={daily?.advances ?? '—'} color={theme.palette.success.main} />
                        <StatPill label="Declines" value={daily?.declines ?? '—'} color={theme.palette.error.main} />
                        <StatPill label="Unchanged" value={daily?.unchanged ?? '—'} color={theme.palette.text.primary} />
                      </Box>
                      <Box
                        sx={{
                          border: '1px dashed',
                          borderColor: 'divider',
                          borderRadius: 3,
                          p: 2,
                          bgcolor: alpha(theme.palette.background.paper, 0.6),
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
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          color={daily?.netPts && daily.netPts < 0 ? 'error.main' : 'success.main'}
                        >
                          {formatPoints(daily?.netPts)}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>

                <Box
                  sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider',
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
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1,
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
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
            emptyText="No data available"
            emptyState={errorState}
          />
        </Box>
      </Box>
    </Stack>
  );
};

const StatPill = ({ label, value, color }: { label: string; value: ReactNode; color: string }) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      p: 2,
      bgcolor: 'background.paper',
      textAlign: 'center',
      boxShadow: 2,
      minHeight: 88,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}
  >
    <Typography variant="caption" sx={{ letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={800} sx={{ color }}>
      {value}
    </Typography>
  </Box>
);

const SummaryPill = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: 'positive' | 'negative' | 'neutral';
}) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      p: 1.5,
      bgcolor: 'background.paper',
      textAlign: 'center',
      boxShadow: 2,
    }}
  >
    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography
      variant="subtitle1"
      fontWeight={700}
      sx={{
        color: tone === 'positive' ? 'success.main' : tone === 'negative' ? 'error.main' : 'text.primary',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const ErrorState = ({
  title,
  message,
  hint,
  onRetry,
}: {
  title: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
}) => (
  <Stack spacing={1} alignItems="center" textAlign="center" sx={{ color: 'text.secondary' }}>
    <ErrorOutlineIcon sx={{ color: 'text.secondary' }} />
    <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    )}
    {onRetry && (
      <Button variant="outlined" size="small" onClick={onRetry}>
        Retry
      </Button>
    )}
  </Stack>
);

export default HistoricalDataPage;
