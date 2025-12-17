require("dotenv").config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

module.exports = {
  KITE_API_KEY: must("KITE_API_KEY"),
  KITE_ACCESS_TOKEN: must("KITE_ACCESS_TOKEN"),
  PORT: process.env.PORT || 3000,
};
