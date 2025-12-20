import {
  DailyBreadthResponse,
  IntradayBreadthResponse,
  TradingDaysResponse,
} from '../types/historical';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(path, base);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

async function request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  const data = await res.json();
  if (data.ok === false) {
    throw new Error(data.message || 'Request failed');
  }
  return data as T;
}

export const getTradingDays = async (indexKey: string, days = 30): Promise<TradingDaysResponse> =>
  request<TradingDaysResponse>('/historical/trading-days', { index: indexKey, days });

export const getDailyBreadth = async (
  indexKey: string,
  date: string,
): Promise<DailyBreadthResponse> => request<DailyBreadthResponse>(`/historical/${indexKey}/daily`, { date });

export const getIntradayBreadth = async (
  indexKey: string,
  date: string,
  tf: string,
): Promise<IntradayBreadthResponse> =>
  request<IntradayBreadthResponse>(`/historical/${indexKey}/intraday`, { date, tf });

type DailyBreadthStreamHandlers = {
  onMeta?: (payload: { index: { key: string; name: string }; totalDays: number }) => void;
  onData?: (payload: DailyBreadthResponse) => void;
  onDataError?: (payload: { date: string; message: string }) => void;
  onDone?: (payload: { count: number }) => void;
  onError?: (message: string) => void;
};

export const streamDailyBreadth = (
  indexKey: string,
  days = 60,
  handlers: DailyBreadthStreamHandlers = {},
) => {
  const url = buildUrl(`/historical/${indexKey}/daily/stream`, { days });
  const es = new EventSource(url);

  es.addEventListener('meta', (ev) => handlers.onMeta?.(JSON.parse(ev.data)));
  es.addEventListener('data', (ev) => handlers.onData?.(JSON.parse(ev.data)));
  es.addEventListener('data-error', (ev) => handlers.onDataError?.(JSON.parse(ev.data)));
  es.addEventListener('done', (ev) => handlers.onDone?.(JSON.parse(ev.data)));
  es.addEventListener('error', () => {
    handlers.onError?.('Stream disconnected');
    es.close();
  });

  return {
    close: () => es.close(),
    source: es,
  };
};
