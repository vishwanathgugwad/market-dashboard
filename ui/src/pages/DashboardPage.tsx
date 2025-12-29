import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import ContributorsCard from '../components/ContributorsCard';
import DonutStatCard from '../components/DonutStatCard';
import IndexChartCard from '../components/IndexChartCard';
import MarketBreadthTable from '../components/MarketBreadthTable';
import MetricCard from '../components/MetricCard';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import LiveChatCard from '../components/LiveChatCard';
import { getIndexSeries } from '../services/indexService';
import { IndexSeriesPoint } from '../types/indices';
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

const isMarketOpen = (date: Date) => {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
};

const DashboardPage = () => {
  const [selectedIndex, setSelectedIndex] = useState<string>(INDEX_OPTIONS[0].key);
  const [series, setSeries] = useState<IndexSeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
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
      setLoading(true);
      const data = await getIndexSeries(selectedIndex);
      setSeries(data);
      setLoading(false);
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

  const breadthData = useMemo(
    () =>
      displaySeries.map((point, idx) => ({
        timestamp: point.timestamp,
        advances: point.value + 20 + (idx % 4 === 0 ? 8 : -6),
        declines: point.value - 18 + (idx % 3 === 0 ? -4 : 6),
      })),
    [displaySeries],
  );

  const sparklineValues = displaySeries.map((point) => point.value);
  const latestValue = displaySeries[displaySeries.length - 1]?.value ?? 0;
  const firstValue = displaySeries[0]?.value ?? latestValue;
  const changeValue = latestValue - firstValue;
  const changeColor = changeValue >= 0 ? '#22c55e' : '#ef4444';

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
  const quoteColor = quoteChange !== null && quoteChange >= 0 ? '#22c55e' : '#ef4444';
  const quoteValue = quoteChange !== null ? `${quoteChange >= 0 ? '+' : ''}${quoteChange.toFixed(2)}` : '—';
  const quotePctText =
    quoteChangePct !== null ? `${quoteChangePct >= 0 ? '+' : ''}${quoteChangePct.toFixed(2)}%` : '—';
  const quoteLtpText = quoteLtp !== null ? quoteLtp.toFixed(2) : '—';
  const quoteOpenText = quoteOpen !== null ? quoteOpen.toFixed(2) : '—';
  const quoteHighText = quoteHigh !== null ? quoteHigh.toFixed(2) : '—';
  const quoteLowText = quoteLow !== null ? quoteLow.toFixed(2) : '—';

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
            value={quoteValue}
            accentColor={quoteChange !== null ? quoteColor : '#94a3b8'}
            sparklineData={sparklineValues}
            sparklineColor={quoteChange !== null ? quoteColor : changeColor}
            align="left"
          >
            <Typography variant="body2" color="text.secondary">
              {quotePctText} • LTP {quoteLtpText}
            </Typography>
            <Stack spacing={0.25} sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                O {quoteOpenText}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                H {quoteHighText}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                L {quoteLowText}
              </Typography>
            </Stack>
            {quoteError && (
              <Typography variant="caption" color="error.main">
                Failed to fetch
              </Typography>
            )}
          </MetricCard>

          <ContributorsCard
            title={`${selectedLabel} Contributors`}
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

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={2}>
            {loading ? (
              <LoadingCard />
            ) : (
              <IndexChartCard
                title="Nifty50 breadth"
                data={breadthData}
                marketOpen={marketOpen}
                lines={[
                  { dataKey: 'advances', color: '#22c55e', strokeWidth: 3 },
                  { dataKey: 'declines', color: '#ef4444', strokeWidth: 3 },
                ]}
              />
            )}

            {loading ? (
              <LoadingCard />
            ) : (
              <IndexChartCard
                title="Nifty50"
                data={displaySeries}
                marketOpen={marketOpen}
                lines={[{ dataKey: 'value', color: '#f97316', strokeWidth: 3 }]}
              />
            )}
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
      <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>
        {title}
      </Typography>
    </CardContent>
  </Card>
);

const LoadingCard = () => (
  <Card sx={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
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
  const caption = waiting
    ? data?.message || `Waiting for first ${intervalLabel} candle`
    : undefined;

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
