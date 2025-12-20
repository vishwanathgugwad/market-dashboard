import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import IndexChartCard from '../components/IndexChartCard';
import IndexSelector, { IndexOption } from '../components/IndexSelector';
import { getIndexSeries } from '../services/indexService';
import { IndexSeriesPoint } from '../types/indices';

const INDEX_OPTIONS: IndexOption[] = [
  { key: 'NIFTY50', label: 'Nifty 50' },
  { key: 'NIFTYBANK', label: 'Nifty Bank' },
  { key: 'SENSEX', label: 'Sensex' },
  { key: 'NIFTYMIDSELECT', label: 'Nifty Mid Select' },
  { key: 'NIFTYFINSERV', label: 'Nifty Fin Serv' },
];

const DashboardPage = () => {
  const [selectedIndex, setSelectedIndex] = useState<string>(INDEX_OPTIONS[0].key);
  const [series, setSeries] = useState<IndexSeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const now = new Date();
  const marketOpen = now.getHours() >= 9 && (now.getHours() < 16 || (now.getHours() === 16 && now.getMinutes() === 0));

  const breadthStats = useMemo(
    () => [
      { label: 'Advances', value: 1425, color: '#55efc4', note: 'rising issues across the exchange' },
      { label: 'Declines', value: 937, color: '#ff7b7b', note: 'pulling back from session highs' },
      { label: 'Unchanged', value: 188, color: '#cfd8e3', note: 'holding flat versus prior close' },
    ],
    [],
  );

  useEffect(() => {
    const loadSeries = async () => {
      setLoading(true);
      const data = await getIndexSeries(selectedIndex);
      setSeries(data);
      setLoading(false);
    };

    loadSeries();
  }, [selectedIndex]);

  const selectedLabel = useMemo(
    () => INDEX_OPTIONS.find((opt) => opt.key === selectedIndex)?.label ?? 'Index',
    [selectedIndex],
  );

  return (
    <Stack spacing={3}>
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        sx={{
          background: (theme) =>
            `linear-gradient(110deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.secondary.main, 0.12)}), rgba(13,23,36,0.8)`,
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
          boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
          p: 2,
          borderRadius: 3,
        }}
      >
        <TextField
          placeholder="Search symbols, indices or breadth metrics"
          fullWidth
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="primary" />
              </InputAdornment>
            ),
            sx: {
              bgcolor: 'rgba(255,255,255,0.04)',
              borderRadius: 2,
              '& fieldset': {
                borderColor: 'rgba(255,255,255,0.08)',
              },
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180, textAlign: 'right' }}>
          Live market pulse · curated for you
        </Typography>
      </Box>

      <IndexSelector options={INDEX_OPTIONS} selected={selectedIndex} onChange={setSelectedIndex} />

      <Box display="flex" gap={3} flexWrap={{ xs: 'wrap', lg: 'nowrap' }}>
        <Box flex={{ xs: '1 1 100%', lg: '3 1 0' }} minWidth={{ xs: '100%', lg: '58%' }}>
          {loading ? (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight={360}>
              <CircularProgress />
            </Box>
          ) : (
            <IndexChartCard title={`${selectedLabel} summary`} data={series} marketOpen={marketOpen} />
          )}
        </Box>

        <Stack
          spacing={2}
          flex={{ xs: '1 1 100%', lg: '2 1 0' }}
          minWidth={{ xs: '100%', lg: '36%' }}
          justifyContent="center"
        >
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              Market breadth
            </Typography>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Advancers vs decliners
            </Typography>
          </Box>

          {breadthStats.map((stat) => (
            <Card key={stat.label} sx={{ background: 'rgba(255,255,255,0.03)', border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'transparent',
                    color: stat.color,
                    border: `2px solid ${stat.color}`,
                    width: 48,
                    height: 48,
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {stat.value.toLocaleString()}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={700} color={stat.color}>
                    {stat.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.note}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                <Typography variant="caption" color="text.secondary">
                  Session
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
};

export default DashboardPage;
