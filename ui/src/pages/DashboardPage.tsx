import SearchIcon from '@mui/icons-material/Search';
import { Box, CircularProgress, Stack, TextField, Typography, InputAdornment, alpha } from '@mui/material';
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

      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={320}>
          <CircularProgress />
        </Box>
      ) : (
        <IndexChartCard title={`${selectedLabel} Performance`} data={series} />
      )}
    </Stack>
  );
};

export default DashboardPage;
