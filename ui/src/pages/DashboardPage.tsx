import SearchIcon from '@mui/icons-material/Search';
import { Box, CircularProgress, Stack, TextField, Typography, InputAdornment } from '@mui/material';
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
      <Box display="flex" alignItems="center" gap={2}>
        <Typography variant="h4" fontWeight={600} sx={{ minWidth: 200 }}>
          IndexBreadth
        </Typography>
        <TextField
          placeholder="Search"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
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
