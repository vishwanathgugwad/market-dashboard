const API_BASE = import.meta.env.VITE_API_BASE_URL || '';


export type BreadthRowResponse = {
  slot_label: string;
  green: number;
  red: number;
  unchanged: number;
  rangePts: number | null;
  netPts: number | null;
};

export type BreadthResponse = {
  indexName: string;
  date: string;
  daily: {
    advances: number;
    declines: number;
    unchanged: number;
    no_data: number;
    rangePts: number | null;
    netPts: number | null;
  };
  timeframe: {
    interval: string;
    fromTime: string;
    toTime: string;
  };
  rows: BreadthRowResponse[];
  source: 'computed' | 'redis_cache' | 'redis_cache_after_wait';
};

const INDEX_ROUTE_MAP: Record<string, string> = {
  nifty50: 'nifty50',
  banknifty: 'banknifty',
  finnifty: 'finnifty',
};

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(path, base);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchBreadth = async ({
  indexKey,
  date,
  interval,
  fromTime = '09:15:00',
  toTime = '15:30:00',
  retries = 3,
}: {
  indexKey: string;
  date: string;
  interval: string;
  fromTime?: string;
  toTime?: string;
  retries?: number;
}): Promise<BreadthResponse> => {
  const indexRoute = INDEX_ROUTE_MAP[indexKey];
  if (!indexRoute) {
    throw new Error('Selected index is not supported.');
  }

  let attempt = 0;

  while (true) {
    const url = buildUrl(`/api/breadth/${indexRoute}`, { date, interval, fromTime, toTime });
    const res = await fetch(url);

    if (res.status === 202) {
      const data = await res.json().catch(() => ({}));
      if (attempt < retries) {
        attempt += 1;
        await delay(700);
        continue;
      }
      throw new Error(data?.error || 'Breadth is being computed. Please retry.');
    }

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(payload?.error || `Request failed (${res.status})`);
    }

    if (payload?.error) {
      throw new Error(payload.error);
    }

    return payload as BreadthResponse;
  }
};
