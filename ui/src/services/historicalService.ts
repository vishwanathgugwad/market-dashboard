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
