const path = require("path");
const dotenv = require("dotenv");

function loadEnv() {
  const attempts = [];
  const envFiles = [".env.local", ".env"];

  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, "../../", file);
    const result = dotenv.config({ path: fullPath, override: false });

    if (result.error) {
      // Ignore missing files; surface other parsing errors
      if (result.error.code !== "ENOENT") {
        console.warn(`Failed to load ${fullPath}:`, result.error.message);
      }
      continue;
    }

    const count = result.parsed ? Object.keys(result.parsed).length : 0;
    attempts.push({ file: fullPath, count });
  }

  return attempts;
}

const loadedEnvFiles = loadEnv();

function must(name) {
  const v = process.env[name];
  if (!v) {
    const checked =
      loadedEnvFiles.length > 0
        ? loadedEnvFiles.map((f) => `${f.file} (${f.count} keys)`).join(", ")
        : "none (no .env files found in project root)";

    throw new Error(
      `Missing env var: ${name}. Checked env files: ${checked}. Ensure .env (or .env.local) exists at the project root with required keys.`
    );
  }
  return v;
}

module.exports = {
  KITE_API_KEY: must("KITE_API_KEY"),
  KITE_ACCESS_TOKEN: must("KITE_ACCESS_TOKEN"),
  PORT: process.env.PORT || 3000,
};
