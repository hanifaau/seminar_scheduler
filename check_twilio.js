const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://admired-bandicoot-366.convex.cloud");

async function run() {
  try {
    const res = await client.action("notifications:testTwilio", { phone: "081234567890" });
    console.log("Twilio Test Response:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
