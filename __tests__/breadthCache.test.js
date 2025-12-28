jest.mock("../src/cache/redis", () => ({
  getRedis: jest.fn(),
}));

jest.mock("../src/services/advanceDecline", () => {
  const actual = jest.requireActual("../src/services/advanceDecline");
  return {
    ...actual,
    getAdvanceDecline: jest.fn(),
  };
});

const http = require("http");
const { createServer } = require("../src/server");
const { getRedis } = require("../src/cache/redis");
const { buildBreadthCacheKey } = require("../src/cache/breadthCache");
const { getAdvanceDecline } = require("../src/services/advanceDecline");

function startServer() {
  const app = createServer({});
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function httpGet(baseUrl, path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, body });
      });
    }).on("error", reject);
  });
}

describe("breadth cache", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("builds breadth cache keys using uppercase index name", () => {
    const keys = buildBreadthCacheKey({
      indexName: "nifty50",
      interval: "5minute",
      date: "2025-12-26",
      fromTime: "09:15:00",
      toTime: "09:20:00",
    });

    expect(keys).toEqual({
      cacheKey: "breadth:NIFTY50|5minute|2025-12-26|09:15:00|09:20:00",
      lockKey: "breadth_lock:NIFTY50|5minute|2025-12-26|09:15:00|09:20:00",
    });
  });

  it("returns cached breadth without computing", async () => {
    const data = { ok: true };
    const redis = {
      get: jest.fn().mockResolvedValue(JSON.stringify(data)),
      set: jest.fn(),
      del: jest.fn(),
    };
    getRedis.mockResolvedValue(redis);

    const { server, baseUrl } = await startServer();

    const response = await httpGet(
      baseUrl,
      "/api/breadth/NIFTY50?date=2025-12-26&fromTime=09:15:00&toTime=09:20:00&interval=5minute"
    );

    server.close();

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ...data, source: "redis_cache" });
    expect(getAdvanceDecline).not.toHaveBeenCalled();
  });

  it("computes breadth on cache miss and stores it", async () => {
    const data = { indexName: "NIFTY50", summary: { advances: 1 } };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue("OK"),
      del: jest.fn(),
    };
    getRedis.mockResolvedValue(redis);
    getAdvanceDecline.mockResolvedValue(data);

    const { server, baseUrl } = await startServer();

    const response = await httpGet(
      baseUrl,
      "/api/breadth/NIFTY50?date=2025-12-26&fromTime=09:15:00&toTime=09:20:00&interval=5minute&concurrency=4"
    );

    server.close();

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ...data, source: "computed" });
    expect(getAdvanceDecline).toHaveBeenCalledWith(
      expect.objectContaining({ concurrency: 4 })
    );
    expect(redis.set).toHaveBeenCalledWith(
      "breadth_lock:NIFTY50|5minute|2025-12-26|09:15:00|09:20:00",
      "1",
      { NX: true, EX: 30 }
    );
    expect(redis.set).toHaveBeenCalledWith(
      "breadth:NIFTY50|5minute|2025-12-26|09:15:00|09:20:00",
      JSON.stringify(data),
      { EX: 900 }
    );
    expect(redis.del).toHaveBeenCalledWith(
      "breadth_lock:NIFTY50|5minute|2025-12-26|09:15:00|09:20:00"
    );
  });

  it("waits for cached breadth when lock is held", async () => {
    const data = { indexName: "NIFTY50", summary: { advances: 2 } };
    const redis = {
      get: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(data)),
      set: jest.fn().mockResolvedValue(null),
      del: jest.fn(),
    };
    getRedis.mockResolvedValue(redis);

    const { server, baseUrl } = await startServer();

    const response = await httpGet(
      baseUrl,
      "/api/breadth/NIFTY50?date=2025-12-26&fromTime=09:15:00&toTime=09:20:00&interval=5minute"
    );

    server.close();

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ...data, source: "redis_cache_after_wait" });
    expect(getAdvanceDecline).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });
});
