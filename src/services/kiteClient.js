const KiteConnect = require("kiteconnect").KiteConnect;
const env = require("../config/env");

let kiteClient;

function getKiteClient() {
  if (!kiteClient) {
    kiteClient = new KiteConnect({ api_key: env.KITE_API_KEY });
    kiteClient.setAccessToken(env.KITE_ACCESS_TOKEN);
  }

  return kiteClient;
}

module.exports = { getKiteClient };
