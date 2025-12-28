const https = require("https");
const zlib = require("zlib");
const { parse } = require("csv-parse/sync");

function download(url, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed. Status: ${res.statusCode}`));
        res.resume();
        return;
      }

      const chunks = [];
      const stream =
        res.headers["content-encoding"] === "gzip" ? res.pipe(zlib.createGunzip()) : res;

      stream.on("data", (d) => chunks.push(d));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      stream.on("error", reject);
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Download timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
  });
}

async function loadInstruments({ timeoutMs } = {}) {
  const url = "https://api.kite.trade/instruments";
  const csv = await download(url, { timeoutMs });

  // Proper CSV parsing (handles quotes/commas correctly)
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });

  return records;
}

module.exports = { loadInstruments };
