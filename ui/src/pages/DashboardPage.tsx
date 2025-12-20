import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import ContributorsCard from '../components/ContributorsCard';
import DonutStatCard from '../components/DonutStatCard';
import IndexChartCard from '../components/IndexChartCard';
import MarketBreadthTable from '../components/MarketBreadthTable';
import MetricCard from '../components/MetricCard';
import SegmentedTabs, { SegmentedTabOption } from '../components/SegmentedTabs';
import { getIndexSeries } from '../services/indexService';
import { IndexSeriesPoint } from '../types/indices';

const INDEX_OPTIONS: SegmentedTabOption[] = [
  { key: 'NIFTY50', label: 'NIFTY50' },
  { key: 'NIFTYBANK', label: 'NIFTYBANK' },
  { key: 'SENSEX', label: 'SENSEX' },
  { key: 'NIFTYMIDSELECT', label: 'NIFTYMIDCAP' },
  { key: 'NIFTYFINSERV', label: 'NIFTYFINSERV' },
];

const contributors = [
  { name: 'BHARTIARTL', change: 1.87 },
  { name: 'ITC', change: 1.32 },
  { name: 'TATACONSUM', change: 1.16 },
  { name: 'SUNPHARMA', change: 1.07 },
  { name: 'SBILIFE', change: 0.94 },
  { name: 'BAJAJFINSV', change: 0.89 },
  { name: 'ASIANPAINT', change: 0.64 },
  { name: 'TITAN', change: 0.58 },
  { name: 'KOTAKBANK', change: 0.33 },
  { name: 'INFY', change: 0.28 },
  { name: 'TCS', change: -0.1 },
  { name: 'DRREDDY', change: -0.22 },
  { name: 'HDFCBANK', change: -0.3 },
  { name: 'HINDUNILVR', change: -0.38 },
  { name: 'HDFC', change: -0.4 },
  { name: 'POWERGRID', change: -0.52 },
  { name: 'ONGC', change: -0.76 },
  { name: 'RELIANCE', change: -1.03 },
  { name: 'BAJFINANCE', change: -1.11 },
  { name: 'JSWSTEEL', change: -1.58 },
  { name: 'TATASTEEL', change: -2.64 },
  { name: 'UPL', change: -3.45 },
  { name: 'BAJAJ-AUTO', change: -3.62 },
];

const fiveMinRows = [
  { time: '9:15-9:20', advances: 12, declines: 38, range: '-30 pts' },
  { time: '9:20-9:25', advances: 12, declines: 38, range: '-30 pts' },
  { time: '9:25-9:30', advances: 18, declines: 35, range: '-17 pts' },
  { time: '9:30-9:35', advances: 20, declines: 35, range: '-15 pts' },
  { time: '9:35-9:40', advances: 22, declines: 32, range: '-10 pts' },
  { time: '10:40-10:45', advances: 28, declines: 28, range: '0 pts' },
];

const DashboardPage = () => {
  const [selectedIndex, setSelectedIndex] = useState<string>(INDEX_OPTIONS[0].key);
  const [series, setSeries] = useState<IndexSeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  const marketOpen = now.getHours() >= 9 && (now.getHours() < 16 || (now.getHours() === 16 && now.getMinutes() === 0));

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
  const changeText = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`;
  const changeColor = changeValue >= 0 ? '#22c55e' : '#ef4444';

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayString = now.toLocaleDateString([], { weekday: 'long' });
  const dateString = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

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
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: 2, mb: 1 }}>
                {timeString}
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {dayString}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dateString}
              </Typography>
            </CardContent>
          </Card>

          <ContributorsCard items={contributors} />
        </Stack>

        <Stack spacing={2.5}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1.2fr repeat(3, 1fr)' }} gap={2}>
            <MetricCard
              title="Nifty 50"
              subtitle={selectedIndex}
              value={`${changeText}`}
              accentColor={changeColor}
              sparklineData={sparklineValues}
              sparklineColor={changeColor}
            />
            <DonutStatCard title="5 min live" up={34} down={16} />
            <DonutStatCard title="15 min live" up={22} down={28} />
            <DonutStatCard title="1 hour live" up={42} down={8} />
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

        <Card sx={{ height: '100%', minHeight: 480 }}>
          <CardContent sx={{ p: 3, height: '100%' }}>
            <Typography
              variant="subtitle2"
              sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', mb: 2 }}
            >
              Live Chat
            </Typography>
            <Box
              sx={{
                border: '1px dashed #d1d5db',
                borderRadius: 2,
                height: '100%',
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              Coming soon
            </Box>
          </CardContent>
        </Card>
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

export default DashboardPage;
