export interface TradingDaysResponse {
  index: {
    key: string;
    name: string;
  };
  days: string[];
  source: 'kite' | 'synthetic';
}

export interface IndexCandleSummary {
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  range: number | null;
  netChange: number | null;
}

export interface DailyBreadthResponse {
  index: {
    key: string;
    name: string;
  };
  date: string;
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  indexCandle: IndexCandleSummary | null;
}

export interface IntradayIntervalBreadth {
  start: string;
  end: string;
  advances: number;
  declines: number;
  unchanged: number;
  net: number;
  range: number;
}

export interface IntradayBreadthResponse {
  index: {
    key: string;
    name: string;
  };
  date: string;
  tf: string;
  intervals: IntradayIntervalBreadth[];
}
