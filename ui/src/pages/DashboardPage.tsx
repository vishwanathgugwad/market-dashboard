import { Box, Card, CardContent, Chip, Divider, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import ContributorsCard from '../components/ContributorsCard';
import DonutStatCard from '../components/DonutStatCard';
import MarketBreadthTable from '../components/MarketBreadthTable';
import MetricCard from '../components/MetricCard';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import LiveChatCard from '../components/LiveChatCard';
import { getIndexSeries } from '../services/indexService';
import { IndexSeriesPoint } from '../types/indices';
import { isMarketOpen } from '../lib/marketTime';
import {
  fetchLiveBreadth,
  fetchLiveContributors,
  fetchLiveIndexQuote,
  LiveBreadthResponse,
  LiveIndexQuoteResponse,
} from '../lib/api';

type LiveCardState = {
  data?: LiveBreadthResponse;
  loading: boolean;
  error?: string;
};

type ContributorsState = {
  loading: boolean;
  items: Array<{ name: string; change: number }>;
  error: string | null;
};

type LiveIndexQuoteState = {
  loading: boolean;
  data?: LiveIndexQuoteResponse;
  error?: string;
};

const INDEX_OPTIONS: SegmentedTabOption[] = [
  { key: 'NIFTY50', label: 'NIFTY 50' },
  { key: 'NIFTYBANK', label: 'NIFTY Bank' },
  { key: 'FINNIFTY', label: 'FINNIFTY' },
];

const INDEX_KEY_MAP: Record<string, string> = {
  NIFTY50: 'nifty50',
  NIFTYBANK: 'banknifty',
  FINNIFTY: 'finnifty',
};

const fiveMinRows = [
  { time: '9:15-9:20', advances: 12, declines: 38, range: '-30 pts' },
  { time: '9:20-9:25', advances: 12, declines: 38, range: '-30 pts' },
  { time: '9:25-9:30', advances: 18, declines: 35, range: '-17 pts' },
  { time: '9:30-9:35', advances: 20, declines: 35, range: '-15 pts' },
  { time: '9:35-9:40', advances: 22, declines: 32, range: '-10 pts' },
  { time: '10:40-10:45', advances: 28, declines: 28, range: '0 pts' },
];

const DashboardPage = () => {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<string>(INDEX_OPTIONS[0].key);
  const [series, setSeries] = useState<IndexSeriesPoint[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [live5, setLive5] = useState<LiveCardState>({ loading: true });
  const [live15, setLive15] = useState<LiveCardState>({ loading: true });
  const [live60, setLive60] = useState<LiveCardState>({ loading: true });
  const [liveQuote, setLiveQuote] = useState<LiveIndexQuoteState>({ loading: true });
  const [contributorsState, setContributorsState] = useState<ContributorsState>({
    loading: true,
    items: [],
    error: null,
  });

  const marketOpen = isMarketOpen(now);
  const indexKey = useMemo(() => INDEX_KEY_MAP[selectedIndex], [selectedIndex]);

  useEffect(() => {
    const loadSeries = async () => {
      const data = await getIndexSeries(selectedIndex);
      setSeries(data);
    };

    loadSeries();
  }, [selectedIndex]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchInterval = async (
      interval: '5minute' | '15minute' | '60minute',
      setter: Dispatch<SetStateAction<LiveCardState>>,
    ) => {
      setter((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const data = await fetchLiveBreadth({ indexKey, interval });
        if (!isActive) return;
        setter({ data, loading: false });
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Failed to fetch';
        setter({ data: undefined, loading: false, error: message });
      }
    };

    const fetchAll = () => {
      fetchInterval('5minute', setLive5);
      fetchInterval('15minute', setLive15);
      fetchInterval('60minute', setLive60);
    };

    fetchAll();
    const timer = setInterval(fetchAll, 30000);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [indexKey]);

  useEffect(() => {
    let isActive = true;
    let timer: number | undefined;

    const fetchQuote = async () => {
      setLiveQuote((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const data = await fetchLiveIndexQuote({ indexKey });
        if (!isActive) return;
        setLiveQuote({ data, loading: false });
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Failed to fetch';
        setLiveQuote({ data: undefined, loading: false, error: message });
      }
    };

    const pollMs = marketOpen ? 5000 : 60000;

    fetchQuote();
    timer = window.setInterval(fetchQuote, pollMs);

    return () => {
      isActive = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [indexKey, marketOpen]);

  useEffect(() => {
    let isActive = true;
    let timer: number | undefined;

    const fetchContributors = async () => {
      setContributorsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await fetchLiveContributors({ indexKey, limit: 15 });
        if (!isActive) return;
        const items = data.contributors.map((item) => ({
          name: item.symbol,
          change: item.contribPts,
        }));
        items.sort((a, b) => b.change - a.change);
        setContributorsState({ loading: false, items, error: null });
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Failed to fetch contributors';
        setContributorsState({ loading: false, items: [], error: message });
      }
    };

    fetchContributors();

    if (marketOpen) {
      timer = window.setInterval(fetchContributors, 30000);
    }

    return () => {
      isActive = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [indexKey, marketOpen]);

  const fallbackSeries = useMemo<IndexSeriesPoint[]>(
    () =>
      Array.from({ length: 16 }).map((_, idx) => ({
        timestamp: new Date(now.getTime() - (15 - idx) * 5 * 60 * 1000).toISOString(),
        value: 223 + idx * 4 + (idx % 2 === 0 ? 3 : -2),
      })),
    [now],
  );

  const displaySeries = series.length ? series : fallbackSeries;

  const sparklineValues = displaySeries.map((point) => point.value);
  const latestValue = displaySeries[displaySeries.length - 1]?.value ?? 0;
  const firstValue = displaySeries[0]?.value ?? latestValue;
  const changeValue = latestValue - firstValue;
  const changeColor = changeValue >= 0 ? theme.palette.success.main : theme.palette.error.main;

  const selectedLabel = useMemo(
    () => INDEX_OPTIONS.find((option) => option.key === selectedIndex)?.label ?? selectedIndex,
    [selectedIndex],
  );

  const quote = liveQuote.data;
  const quoteChange = quote?.change ?? null;
  const quoteChangePct = quote?.changePct ?? null;
  const quoteLtp = quote?.ltp ?? null;
  const quoteOpen = quote?.open ?? null;
  const quoteHigh = quote?.high ?? null;
  const quoteLow = quote?.low ?? null;

  const quoteError = liveQuote.error;
  const quoteColor = quoteChange !== null && quoteChange >= 0 ? theme.palette.success.main : theme.palette.error.main;
  const quoteValue = quoteChange !== null ? `${quoteChange >= 0 ? '+' : ''}${quoteChange.toFixed(2)}` : null;
  const quotePctText =
    quoteChangePct !== null ? `${quoteChangePct >= 0 ? '+' : ''}${quoteChangePct.toFixed(2)}%` : null;
  const quoteLtpText = quoteLtp !== null ? quoteLtp.toFixed(2) : null;
  const quoteOpenText = quoteOpen !== null ? quoteOpen.toFixed(2) : null;
  const quoteHighText = quoteHigh !== null ? quoteHigh.toFixed(2) : null;
  const quoteLowText = quoteLow !== null ? quoteLow.toFixed(2) : null;
  const changeTone = quoteChange !== null ? (quoteChange >= 0 ? 'positive' : 'negative') : 'neutral';
  const changeTextColor = changeTone === 'neutral' ? theme.palette.text.primary : quoteColor;
  const moodLabel = changeTone === 'positive' ? 'Positive' : changeTone === 'negative' ? 'Negative' : 'Neutral';
  const moodColor =
    changeTone === 'positive'
      ? theme.palette.success.main
      : changeTone === 'negative'
      ? theme.palette.error.main
      : theme.palette.text.secondary;

  return (
    <Stack spacing={3} alignItems="center">
      <SegmentedTabs options={INDEX_OPTIONS} value={selectedIndex} onChange={setSelectedIndex} />

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', lg: '280px 1fr 320px' }}
        gap={3}
        width="100%"
        alignItems="start"
      >
        <Stack spacing={2}>
          <MetricCard
            title={selectedLabel}
            subtitle="Intraday"
            accentColor={quoteChange !== null ? quoteColor : theme.palette.text.secondary}
            sparklineData={sparklineValues}
            sparklineColor={quoteChange !== null ? quoteColor : changeColor}
            align="left"
            valueSlot={
              <Stack
                spacing={1.2}
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  p: 2,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
                  <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1.4, color: 'text.secondary' }}>
                    Change
                  </Typography>
                  <Chip
                    size="small"
                    label={moodLabel}
                    sx={{
                      color: moodColor,
                      borderColor: alpha(moodColor, 0.4),
                      bgcolor: alpha(moodColor, 0.12),
                    }}
                  />
                </Stack>
                <Stack direction="row" alignItems="baseline" spacing={1.2} flexWrap="wrap">
                  {quoteValue ? (
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: changeTextColor,
                        letterSpacing: '-0.03em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {quoteValue}
                    </Typography>
                  ) : (
                    <Skeleton variant="text" width={120} height={36} />
                  )}
                  {quotePctText ? (
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: changeTextColor,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {quotePctText}
                    </Typography>
                  ) : (
                    <Skeleton variant="text" width={64} height={28} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    LTP
                  </Typography>
                  {quoteLtpText ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {quoteLtpText}
                    </Typography>
                  ) : (
                    <Skeleton variant="text" width={72} height={22} />
                  )}
                </Stack>
              </Stack>
            }
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  O
                </Typography>
                {quoteOpenText ? (
                  <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {quoteOpenText}
                  </Typography>
                ) : (
                  <Skeleton variant="text" width={48} />
                )}
              </Stack>
              <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  H
                </Typography>
                {quoteHighText ? (
                  <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {quoteHighText}
                  </Typography>
                ) : (
                  <Skeleton variant="text" width={48} />
                )}
              </Stack>
              <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  L
                </Typography>
                {quoteLowText ? (
                  <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {quoteLowText}
                  </Typography>
                ) : (
                  <Skeleton variant="text" width={48} />
                )}
              </Stack>
            </Stack>
            {quoteError && (
              <Typography variant="caption" color="error.main">
                Market quote is temporarily unavailable.
              </Typography>
            )}
          </MetricCard>

          <ContributorsCard
            title={`${selectedLabel} Top Contributors`}
            items={contributorsState.items}
            loading={contributorsState.loading}
            error={contributorsState.error}
          />
        </Stack>

        <Stack spacing={2.5}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
            <LiveDonutCard title="5 min live" intervalLabel="5 min" state={live5} />
            <LiveDonutCard title="15 min live" intervalLabel="15 min" state={live15} />
            <LiveDonutCard title="1 hour live" intervalLabel="1 hour" state={live60} />
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }} gap={2}>
            <MarketBreadthTable title="5 min market breadth" rows={fiveMinRows} />
            <PlaceholderCard title="15 min market breadth" />
            <PlaceholderCard title="1 hour market breadth" />
          </Box>
        </Stack>

        <LiveChatCard contextLabel={selectedIndex} marketOpen={marketOpen} />
      </Box>
    </Stack>
  );
};

const PlaceholderCard = ({ title }: { title: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {title}
      </Typography>
    </CardContent>
  </Card>
);

const LiveDonutCard = ({
  title,
  intervalLabel,
  state,
}: {
  title: string;
  intervalLabel: string;
  state: LiveCardState;
}) => {
  const data = state.data;

  // waiting if backend says slot not completed OR we don't have data yet but not an error
  const waiting = (!state.error && (!data || data.slotCompleted === false));

  const up = data?.summary?.advances ?? 0;
  const down = data?.summary?.declines ?? 0;

  // show backend message when waiting (e.g., "Waiting for first 15-minute candle")
  const caption = waiting ? data?.message || 'Waiting for first candle' : undefined;

  // show actual error text (not generic)
  const errorText = state.error || undefined;

  return (
    <DonutStatCard
      title={title}
      up={up}
      down={down}
      loading={state.loading}
      empty={waiting || !!errorText}
      caption={caption}
      error={errorText}
    />
  );
};

export default DashboardPage;
