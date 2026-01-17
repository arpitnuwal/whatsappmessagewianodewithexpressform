const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

let qrCodeData = "";
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
  skipBrokenMethods: true
});

client.on("qr", (qr) => {
  qrcode.toDataURL(qr, (err, url) => {
    qrCodeData = url;
  });
});

client.on("ready", () => {
  isReady = true;
  console.log("WhatsApp ready");
});

client.initialize();

// QR API (React will call this)
app.get("/qr", (req, res) => {
  res.json({ qr: qrCodeData, ready: isReady });
});

// Send API (React will call this)
app.post("/send", async (req, res) => {
  const { number, message } = req.body;
  const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

  if (!isReady) {
    return res.status(400).json({ status: false, message: "WhatsApp not ready" });
  }

  try {
    await client.sendMessage(formattedNumber, message, { sendSeen: false });
    res.json({ status: true, message: "Sent" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
