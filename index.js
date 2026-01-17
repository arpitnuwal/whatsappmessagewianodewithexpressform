const express = require("express");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Static folder for uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

let isReady = false;

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// WhatsApp client
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
  client.sendSeen = async () => {};
});

client.initialize();

app.get("/", (req, res) => {
  res.render("index", { isReady });
});

// New page for image send
app.get("/image", (req, res) => {
  res.render("image", { isReady });
});

app.post("/send", async (req, res) => {
  const { number, message } = req.body;
  const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

  if (!isReady) return res.send("WhatsApp client not ready.");

  const isValid = await client.isRegisteredUser(formattedNumber);
  if (!isValid) return res.send("Number not registered.");

  await client.sendMessage(formattedNumber, message, { sendSeen: false });
  res.send("Message sent!");
});

// Send image with text
app.post("/send-image", upload.single("image"), async (req, res) => {
  const { number, caption } = req.body;
  const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

  if (!isReady) return res.send("WhatsApp client not ready.");

  const isValid = await client.isRegisteredUser(formattedNumber);
  if (!isValid) return res.send("Number not registered.");

  const filePath = req.file.path;

  const media = MessageMedia.fromFilePath(filePath);

  await client.sendMessage(formattedNumber, media, {
    caption: caption,
    sendSeen: false
  });


  res.redirect("/image");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
