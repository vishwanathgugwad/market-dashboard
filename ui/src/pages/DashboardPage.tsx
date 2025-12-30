import { Box, Chip, Divider, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ContributorsCard from '../components/ContributorsCard';
import DonutStatCard from '../components/DonutStatCard';
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
  fetchMarketMoodLive,
  LiveBreadthResponse,
  LiveIndexQuoteResponse,
  MarketMood,
} from '../lib/api';
import { HeaderMoodContext, HeaderMoodState } from '../layouts/AppLayout';

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

type MoodState = {
  loading: boolean;
  data?: MarketMood | null;
  error?: string | null;
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

const DashboardPage = () => {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<string>(INDEX_OPTIONS[0].key);
  const [series, setSeries] = useState<IndexSeriesPoint[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [live5, setLive5] = useState<LiveCardState>({ loading: true });
  const [live15, setLive15] = useState<LiveCardState>({ loading: true });
  const [live60, setLive60] = useState<LiveCardState>({ loading: true });
  const [mood5, setMood5] = useState<MoodState>({ loading: true, data: null, error: null });
  const [mood15, setMood15] = useState<MoodState>({ loading: true, data: null, error: null });
  const [mood60, setMood60] = useState<MoodState>({ loading: true, data: null, error: null });
  const [liveQuote, setLiveQuote] = useState<LiveIndexQuoteState>({ loading: true });
  const [contributorsState, setContributorsState] = useState<ContributorsState>({
    loading: true,
    items: [],
    error: null,
  });
  const { setHeaderMood } = useOutletContext<HeaderMoodContext>();

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
    const controllers = new Map<string, AbortController>();
    const timers: number[] = [];

    const logError = (message: string, error: unknown) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(message, error);
      }
    };

    const fetchMood = async (
      interval: '5minute' | '15minute' | '60minute',
      setter: Dispatch<SetStateAction<MoodState>>,
    ) => {
      const existingController = controllers.get(interval);
      if (existingController) {
        existingController.abort();
      }
      const controller = new AbortController();
      controllers.set(interval, controller);

      setter((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await fetchMarketMoodLive({ indexKey, interval, signal: controller.signal });
        if (!isActive) return;
        setter({ data, loading: false, error: null });
      } catch (error) {
        if (!isActive) return;
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logError('Failed to fetch market mood', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch';
        setter((prev) => ({ ...prev, loading: false, error: message }));
      }
    };

    const schedule = (
      interval: '5minute' | '15minute' | '60minute',
      setter: Dispatch<SetStateAction<MoodState>>,
      openMs: number,
    ) => {
      const pollMs = marketOpen ? openMs : 60000;
      fetchMood(interval, setter);
      const timer = window.setInterval(() => fetchMood(interval, setter), pollMs);
      timers.push(timer);
    };

    schedule('5minute', setMood5, 5000);
    schedule('15minute', setMood15, 10000);
    schedule('60minute', setMood60, 15000);

    return () => {
      isActive = false;
      timers.forEach((timer) => clearInterval(timer));
      controllers.forEach((controller) => controller.abort());
    };
  }, [indexKey, marketOpen]);

  useEffect(() => {
    setHeaderMood((prev: HeaderMoodState) => ({
      ...prev,
      mood: mood5.data ?? null,
      loading: mood5.loading,
      error: mood5.error ?? null,
    }));
  }, [mood5.data, mood5.error, mood5.loading, setHeaderMood]);

  useEffect(() => {
    return () => {
      setHeaderMood({ mood: null, loading: false, error: null });
    };
  }, [setHeaderMood]);

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
        </Stack>

        <Stack spacing={2.5}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
            <LiveDonutCard title="5 min live" state={live5} moodState={mood5} />
            <LiveDonutCard title="15 min live" state={live15} moodState={mood15} />
            <LiveDonutCard title="1 hour live" state={live60} moodState={mood60} />
          </Box>

        </Stack>

        <Stack spacing={2}>
          <ContributorsCard
            title={`${selectedLabel} Top Contributors`}
            items={contributorsState.items}
            loading={contributorsState.loading}
            error={contributorsState.error}
          />
        </Stack>
      </Box>

      <LiveChatCard contextLabel={selectedIndex} marketOpen={marketOpen} floating />
    </Stack>
  );
};

const LiveDonutCard = ({
  title,
  state,
  moodState,
}: {
  title: string;
  state: LiveCardState;
  moodState: MoodState;
}) => {
  const data = state.data;
  const moodData = moodState.data ?? null;

  // waiting if backend says slot not completed OR we don't have data yet but not an error
  const waiting = (!state.error && (!data || data.slotCompleted === false));

  const up = data?.summary?.advances ?? 0;
  const down = data?.summary?.declines ?? 0;

  // show backend message when waiting (e.g., "Waiting for first 15-minute candle")
  const caption = waiting ? data?.message || 'Waiting for first candle' : undefined;

  // show actual error text (not generic)
  const errorText = state.error || undefined;

  const moodWaiting = !moodData || moodData.slotCompleted === false || moodData.adr === null;
  const moodError = moodState.error;

  const adrValue = moodWaiting || moodError ? '—' : moodData?.adr?.toFixed(2) ?? '—';
  const spreadValue =
    moodWaiting || moodError || moodData?.spread === null || moodData?.spread === undefined
      ? '—'
      : `${moodData.spread >= 0 ? '+' : ''}${moodData.spread.toFixed(0)}`;
  const spreadTone =
    moodWaiting || moodError || moodData?.spread === null || moodData?.spread === undefined
      ? 'text.secondary'
      : moodData.spread >= 0
      ? 'success.main'
      : 'error.main';

  const metaLine = (
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      ADR {adrValue} • Spread{' '}
      <Box component="span" sx={{ color: spreadTone, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {spreadValue}
      </Box>
    </Typography>
  );

  return (
    <DonutStatCard
      title={title}
      up={up}
      down={down}
      loading={state.loading}
      empty={waiting || !!errorText}
      caption={caption}
      meta={metaLine}
      metaCaption={moodError ? 'Failed to fetch' : undefined}
      error={errorText}
    />
  );
};

export default DashboardPage;
