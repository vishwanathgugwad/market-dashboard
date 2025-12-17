require("dotenv").config();
const KiteConnect = require("kiteconnect").KiteConnect;

const kc = new KiteConnect({
  api_key: process.env.KITE_API_KEY
});

async function generateToken() {
  try {
    const session = await kc.generateSession(
      process.env.KITE_REQUEST_TOKEN,
      process.env.KITE_API_SECRET
    );

    console.log("Access Token:", session.access_token);
  } catch (err) {
    console.error("Error generating token:", err);
  }
}

generateToken();
