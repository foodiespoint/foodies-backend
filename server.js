const express = require("express");
const webPush = require("web-push");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Load keys from environment variables set in Render
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:contact@foodiespoint.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log("🟢 VAPID keys configured successfully.");
} else {
  console.warn("⚠️ VAPID keys missing! Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables.");
}

// Health Check Endpoint
app.get("/", (req, res) => {
  res.status(200).send("Foodies Point Push API is live 🟢");
});

// Broadcast Push Endpoint
app.post("/api/broadcast", async (req, res) => {
  const { title, message, subscriptions } = req.body;

  if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
    return res.status(400).json({ error: "No subscribers provided." });
  }

  const payload = JSON.stringify({
    title: title || "Foodies Point 🍛",
    body: message || "Today's live menu is up!",
    icon: "/foodies-point-beta/icon.png",
    badge: "/foodies-point-beta/icon.png"
  });

  let successCount = 0;
  let failureCount = 0;
  const expiredEndpoints = [];

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webPush.sendNotification(sub, payload);
      successCount++;
    } catch (error) {
      failureCount++;
      if (error.statusCode === 404 || error.statusCode === 410) {
        expiredEndpoints.push(sub.endpoint);
      }
    }
  });

  await Promise.all(sendPromises);

  console.log(`[Broadcast] Delivered: ${successCount} | Failed: ${failureCount}`);

  res.status(200).json({
    success: true,
    delivered: successCount,
    failed: failureCount,
    expiredEndpoints
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Foodies Backend running on port ${PORT}`);
});