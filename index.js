const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "my-session"
  }),
  puppeteer: {
    args: ["--no-sandbox"]
  },
  skipBrokenMethods: true
});

client.on("qr", (qr) => {
  console.log("Scan QR Code");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  isReady = true;
  console.log("WhatsApp is ready! ✅");

  // Disable sendSeen to prevent markedUnread error
  client.sendSeen = async () => {};
});

client.on("auth_failure", (msg) => {
  isReady = false;
  console.log("Auth failure: ", msg);
});

client.on("disconnected", (reason) => {
  isReady = false;
  console.log("Client disconnected: ", reason);
});

client.initialize();

app.get("/", (req, res) => {
  res.render("index", { isReady });
});

app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.send("Number and Message are required");
  }

  const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

  try {
    if (!isReady) {
      return res.send("WhatsApp client not ready. Please scan QR and try again.");
    }

    const isValid = await client.isRegisteredUser(formattedNumber);
    if (!isValid) {
      return res.send("This number is not registered on WhatsApp.");
    }

    // ✅ sendSeen disabled here
    await client.sendMessage(formattedNumber, message, { sendSeen: false });

    res.send("Message sent successfully!");
  } catch (error) {
    console.log(error);
    res.send("Error: " + error.message);
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
