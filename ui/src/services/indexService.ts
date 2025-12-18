import { IndexSeriesPoint } from '../types/indices';

const SERIES_LENGTH = 20;

export const getIndexSeries = async (indexKey: string): Promise<IndexSeriesPoint[]> => {
  // TODO: replace mock with real API call when backend endpoint becomes available
  const now = Date.now();
  const base = (Math.abs(indexKey.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % 50) + 100;

  const data: IndexSeriesPoint[] = Array.from({ length: SERIES_LENGTH }).map((_, idx) => ({
    timestamp: new Date(now - (SERIES_LENGTH - idx) * 60 * 1000).toISOString(),
    value: Number((base + Math.sin(idx / 2) * 5 + Math.random()).toFixed(2)),
  }));

  return Promise.resolve(data);
};
