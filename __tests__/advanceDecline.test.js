const { getAdvanceDecline } = require("../src/services/advanceDecline");

jest.mock("../src/services/indexConstituents", () => ({
  getIndexConstituents: jest.fn(),
}));

jest.mock("../src/services/kiteClient", () => ({
  getKiteClient: jest.fn(),
}));

const { getIndexConstituents } = require("../src/services/indexConstituents");
const { getKiteClient } = require("../src/services/kiteClient");

describe("getAdvanceDecline", () => {
  it("returns summary counts for advance/decline/no_data", async () => {
    getIndexConstituents.mockResolvedValue([
      { tradingsymbol: "AAA", instrument_token: 111, exchange: "NSE" },
      { tradingsymbol: "BBB", instrument_token: 222, exchange: "NSE" },
      { tradingsymbol: "CCC", instrument_token: 333, exchange: "NSE" },
    ]);

    const getHistoricalData = jest.fn(async (token) => {
      if (token === 111) {
        return [{ open: 100, close: 101 }];
      }
      if (token === 222) {
        return [{ open: 200, close: 199 }];
      }
      if (token === 333) {
        return [];
      }
      return [];
    });

    getKiteClient.mockReturnValue({ getHistoricalData });

    const result = await getAdvanceDecline({
      indexName: "NIFTY50",
      date: "2025-12-26",
      fromTime: "09:15:00",
      toTime: "09:20:00",
      interval: "5minute",
      concurrency: 2,
    });

    expect(result.summary).toEqual({
      advances: 1,
      declines: 1,
      unchanged: 0,
      no_data: 1,
      errors: 0,
    });

    expect(result.results).toEqual([
      { symbol: "AAA", status: "advance", open: 100, close: 101 },
      { symbol: "BBB", status: "decline", open: 200, close: 199 },
      { symbol: "CCC", status: "no_data" },
    ]);
  });
});
