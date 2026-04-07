import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDatabase from './db/connectDatabase.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import cron from 'node-cron';
import { Server } from 'socket.io';
import cloudinary from './config/cloudinary.js';
import dns from 'dns';
import crypto from "crypto";
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import FormData from 'form-data';        // ✅ added for bg removal
import axios from 'axios';               // ✅ added for bg removal

// ✅ Fix DNS issue (MongoDB Atlas SRV)
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Routes
import UserRoutes from './Routes/userRoutes.js';
import CategoryRoutes from './Routes/CategoryRoutes.js';
import PosterRoutes from './Routes/posterRoutes.js';
import PlanRoutes from './Routes/PlanRoutes.js';
import BusinessRoutes from './Routes/BusinessRoutes.js';
import AdminRoutes from './Routes/AdminRoutes.js';
import paymentRoutes from './Routes/paymentRoutes.js';

// Controllers
import { sendBirthdaySMS, sendAnniversarySMS } from './Controller/UserController.js';
import { sendPushNotification } from './utils/sendPushNotification.js';
import { getGreeting } from './utils/greeting.js';

// Models
import User from './Models/User.js';
import Chat from './Models/Chat.js';
import UserPayments from './Models/UserPayments.js';
import BusinessCardPayment from './Models/BusinessCardPayment.js';

import fs from "fs";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------
// Middleware
// ------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://194.164.148.244:3079', 
    'http://localhost:3002', 
    'https://ezystudio-zu8y.vercel.app', 
    'https://editezy.com', 
    'https://posternova.vercel.app', 
    'http://31.97.206.144:3065',
    'http://31.97.206.144:8058',
    'http://31.97.206.144:8059',
    'https://dreamtoday.in',
    'https://admin.dreamtoday.in'
  ],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}));

app.options('*', cors());

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// // ✅ FIX: useTempFiles false so req.files.image.data is proper Buffer
// app.use(fileUpload({
//   useTempFiles: false,
//   limits: { fileSize: 50 * 1024 * 1024 },
// }));


app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/",
  limits: { fileSize: 50 * 1024 * 1024 },
}));
// Serve UI on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------------
// Database
// ------------------------
connectDatabase();

// ------------------------
// Cron Jobs
// ------------------------

// Daily Birthday & Anniversary SMS at 12:00 AM
cron.schedule('0 0 * * *', async () => {

  const now = new Date();
  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;

  try {
    // Birthday
    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: '$dob' }, todayDay] },
          { $eq: [{ $month: '$dob' }, todayMonth] }
        ]
      }
    });

    for (const user of birthdayUsers) await sendBirthdaySMS(user.mobile);

    
    // Anniversary
    const anniversaryUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: '$marriageAnniversaryDate' }, todayDay] },
          { $eq: [{ $month: '$marriageAnniversaryDate' }, todayMonth] }
        ]
      }
    });

    for (const user of anniversaryUsers) await sendAnniversarySMS(user.mobile);

  } catch (err) {
    console.error('❌ Birthday/Anniversary cron job failed:', err);
  }
});



// Daily Greeting Notifications at 9 AM
cron.schedule('* * * * *', async () => {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    const users = await User.find({ fcmToken: { $ne: null } });

    const hour = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    });

    const currentHour = parseInt(hour);
    let greetingType = "";

    if (currentHour >= 5 && currentHour < 12) {
      greetingType = "🌞 Good Morning";
    } else if (currentHour >= 12 && currentHour < 17) {
      greetingType = "☀️ Good Afternoon";
    } else if (currentHour >= 17 && currentHour < 21) {
      greetingType = "🌆 Good Evening";
    } else {
      greetingType = "🌙 Good Night";
    }

    for (const user of users) {
      const title = getGreeting(user.name);

      await sendPushNotification({
        fcmToken: user.fcmToken,
        title,
        body: "🌟 Start your day with something special!",
        data: { type: "DAILY_GREETING" }
      });
    }

    let nextGreeting = "";
    if (greetingType.includes("Morning")) nextGreeting = "☀️ Afternoon";
    else if (greetingType.includes("Afternoon")) nextGreeting = "🌆 Evening";
    else if (greetingType.includes("Evening")) nextGreeting = "🌙 Night";
    else nextGreeting = "🌞 Morning";

  } catch (err) {
    console.error('❌ Daily greeting cron failed:', err);
  }
});

// Trial Expiry Cron - Run at 12:05 AM (5 minutes after midnight)
// 7 days trial from createdAt
cron.schedule("5 0 * * *", async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await User.updateMany(
      {
        free7DayTrial: true,
        createdAt: { $lt: sevenDaysAgo },
        $or: [
          { isSubscribedPlan: false },
          { isSubscribedPlan: { $exists: false } }
        ]
      },
      {
        $set: { free7DayTrial: false }
      }
    );

    if (result.modifiedCount > 0) {
      const expiredUsers = await User.find({
        free7DayTrial: false,
        createdAt: { $lt: sevenDaysAgo }
      }).limit(5).select('name email createdAt');
    }

  } catch (error) {
    console.error("❌ Trial Expiry Cron Error:", error);
  }
});


app.post(
  "/razorpay-webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("🔥🔥 WEBHOOK HIT 🔥🔥");

    try {
      const secret = "Business@25";

      const signature = req.headers["x-razorpay-signature"];
      const rawBody = req.body;

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.log("❌ Signature mismatch");
        return res.status(400).send("Invalid signature");
      }

      console.log("✅ Signature verified");

      const event = JSON.parse(rawBody.toString());

      if (event.event !== "payment.captured") {
        return res.json({ status: "ignored" });
      }

      const payment = event.payload.payment.entity;

      console.log("💰 Payment entity:", payment);

      let userPaymentId =
        payment.notes?.userPaymentId ||
        payment.description ||
        payment.order_id ||
        null;

      console.log("🆔 FINAL userPaymentId:", userPaymentId);

      if (!userPaymentId) {
        console.log("❌ userPaymentId NOT FOUND ANYWHERE");
        return res.status(400).send("userPaymentId missing");
      }

      if (!mongoose.Types.ObjectId.isValid(userPaymentId)) {
        console.log("❌ Invalid ObjectId:", userPaymentId);
        return res.status(400).send("Invalid userPaymentId");
      }

      const userPayment = await UserPayments.findById(userPaymentId);

      if (!userPayment) {
        console.log("❌ Payment not found in DB");
        return res.status(404).send("Payment not found");
      }

      if (userPayment.status === "paid") {
        console.log("⚠️ Already paid");
        return res.json({ status: "ok" });
      }

      userPayment.status = "paid";
      userPayment.transactionId = payment.id;
      userPayment.paidAt = new Date();

      await userPayment.save();

      console.log("✅ PAYMENT UPDATED:", userPayment._id);

      return res.json({ status: "ok" });

    } catch (error) {
      console.error("❌ WEBHOOK ERROR:", error);
      return res.status(500).send("Webhook error");
    }
  }
);

app.post("/razorpay-webhook-businesscard", async (req, res) => {
  try {
    const secret = "Business@25";
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const businessCardPaymentId = payment.notes?.businessCardPaymentId;
      if (!businessCardPaymentId) {
        console.log("⚠️ No businessCardPaymentId in notes");
        return res.status(400).send("businessCardPaymentId missing");
      }

      const cardPayment = await BusinessCardPayment.findById(businessCardPaymentId);
      if (!cardPayment) {
        console.log("❌ Business card payment not found:", businessCardPaymentId);
        return res.status(404).send("Business card payment not found");
      }

      if (cardPayment.status === "paid") {
        console.log("⚠️ Already paid:", businessCardPaymentId);
        return res.json({ status: "ok" });
      }

      cardPayment.status = "paid";
      cardPayment.paidAt = new Date();
      cardPayment.transactionId = payment.id;
      await cardPayment.save();

      console.log("✅ Business card payment confirmed:", {
        id: cardPayment._id,
        userId: cardPayment.userId,
        amount: cardPayment.amount,
        transactionId: payment.id,
      });
    }

    res.json({ status: "ok" });

  } catch (err) {
    console.error("❌ BusinessCard webhook failed:", err);
    res.status(500).send("Webhook error");
  }
});

// ------------------------
// Routes
// ------------------------
app.get("/test", (req, res) => {
  res.json({ status: "success", message: "Welcome to Poster Service!" });
});

app.use('/api/users', UserRoutes);
app.use('/api/category', CategoryRoutes);
app.use('/api/poster', PosterRoutes);
app.use('/api/plans', PlanRoutes);
app.use('/api/business', BusinessRoutes);
app.use('/api/admin', AdminRoutes);
app.use('/api/payment', paymentRoutes);


// ========== INPAINTING API ==========
app.post('/api/remove-painted-area', async (req, res) => {
  console.log("Inpainting API called");
  console.log("req.files keys:", req.files ? Object.keys(req.files) : "NO FILES");

  try {
    if (!req.files || !req.files.image || !req.files.mask) {
      return res.status(400).json({
        error: 'image and mask files are required. Got: ' + JSON.stringify(req.files ? Object.keys(req.files) : null)
      });
    }

const imageBufferRaw = fs.readFileSync(req.files.image.tempFilePath);
const maskBufferRaw = fs.readFileSync(req.files.mask.tempFilePath);


    console.log("Image buffer:", imageBufferRaw.length, "bytes | Mask buffer:", maskBufferRaw.length, "bytes");

    if (!imageBufferRaw || imageBufferRaw.length === 0) {
      return res.status(400).json({ error: 'Image buffer is empty.' });
    }
    if (!maskBufferRaw || maskBufferRaw.length === 0) {
      return res.status(400).json({ error: 'Mask buffer is empty.' });
    }

    let imageBuffer, maskBuffer;
    try {
      imageBuffer = await sharp(imageBufferRaw).png().toBuffer();
    } catch (e) {
      return res.status(400).json({ error: 'Could not decode image: ' + e.message });
    }
    try {
      maskBuffer = await sharp(maskBufferRaw).png().toBuffer();
    } catch (e) {
      return res.status(400).json({ error: 'Could not decode mask: ' + e.message });
    }

    let image, mask;
    try {
      image = await loadImage(imageBuffer);
      mask = await loadImage(maskBuffer);
    } catch (e) {
      return res.status(400).json({ error: 'Canvas could not load image: ' + e.message });
    }

    const width = image.width;
    const height = image.height;
    console.log("Image size:", width, "x", height);

    const origCanvas = createCanvas(width, height);
    const origCtx = origCanvas.getContext('2d');
    origCtx.drawImage(image, 0, 0, width, height);
    const origPixels = origCtx.getImageData(0, 0, width, height).data;

    const maskCanvas = createCanvas(width, height);
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(mask, 0, 0, width, height);
    const maskPixels = maskCtx.getImageData(0, 0, width, height).data;

    const MASK_THRESHOLD = 128;
    const masked = [];
    for (let i = 0; i < maskPixels.length; i += 4) {
      if (maskPixels[i] > MASK_THRESHOLD && maskPixels[i+1] > MASK_THRESHOLD && maskPixels[i+2] > MASK_THRESHOLD) {
        const pixelIndex = i / 4;
        masked.push({
          x: pixelIndex % width,
          y: Math.floor(pixelIndex / width),
          idx: pixelIndex
        });
      }
    }

    console.log("Masked pixels found:", masked.length);

    if (masked.length === 0) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'inpaint_results' }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }).end(imageBuffer);
      });
      return res.json({ success: true, processedUrl: uploadResult.secure_url, note: 'No mask area detected.' });
    }

    const resultPixels = new Uint8ClampedArray(origPixels.length);
    resultPixels.set(origPixels);

    const maskedSet = new Set(masked.map(p => p.idx));

    for (const p of masked) {
      let found = false;
      let radius = 1;
      const maxRadius = Math.max(width, height);

      while (!found && radius <= maxRadius) {
        for (let dy = -radius; dy <= radius && !found; dy++) {
          for (let dx = -radius; dx <= radius && !found; dx++) {
            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
            const nx = p.x + dx;
            const ny = p.y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const neighborIdx = ny * width + nx;
            if (!maskedSet.has(neighborIdx)) {
              const si = neighborIdx * 4;
              const di = p.idx * 4;
              resultPixels[di]     = origPixels[si];
              resultPixels[di + 1] = origPixels[si + 1];
              resultPixels[di + 2] = origPixels[si + 2];
              resultPixels[di + 3] = origPixels[si + 3];
              found = true;
            }
          }
        }
        radius++;
      }

      if (!found) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = p.x + dx;
            const ny = p.y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const si = (ny * width + nx) * 4;
            r += origPixels[si]; g += origPixels[si+1]; b += origPixels[si+2]; a += origPixels[si+3];
            count++;
          }
        }
        if (count > 0) {
          const di = p.idx * 4;
          resultPixels[di] = r/count; resultPixels[di+1] = g/count;
          resultPixels[di+2] = b/count; resultPixels[di+3] = a/count;
        }
      }
    }

    const resultCanvas = createCanvas(width, height);
    const resultCtx = resultCanvas.getContext('2d');
    const resultImageData = resultCtx.createImageData(width, height);
    resultImageData.data.set(resultPixels);
    resultCtx.putImageData(resultImageData, 0, 0);

    const outputBuffer = resultCanvas.toBuffer('image/png');

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'inpaint_results', resource_type: 'image' },
        (err, result) => { if (err) reject(err); else resolve(result); }
      ).end(outputBuffer);
    });

    res.json({ success: true, processedUrl: uploadResult.secure_url });

  } catch (error) {
    console.error("Inpainting API error:", error);
    res.status(500).json({ error: 'Failed to process image: ' + error.message });
  }
});


// ========== BG REMOVAL - Remove.bg API ==========
app.post('/api/remove-bg', async (req, res) => {
  console.log('🎯 BG removal called');
  try {
    if (!req.files?.image) {
      return res.status(400).json({ error: 'Image file is required' });
    }

const imageBuffer = fs.readFileSync(req.files.image.tempFilePath);

    if (!imageBuffer?.length) {
      return res.status(400).json({ error: 'Empty image buffer' });
    }

    // Use form-data + axios (built-in fetch doesn't handle form-data headers correctly)
    const form = new FormData();
    form.append('image_file', imageBuffer, {
      filename: 'image.png',
      contentType: req.files.image.mimetype || 'image/png',
    });
    form.append('size', 'auto');

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
      headers: {
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
        ...form.getHeaders(),
      },
      responseType: 'arraybuffer', // important — binary PNG response
    });

    const resultBuffer = Buffer.from(response.data);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'bg_removal_results', resource_type: 'image', format: 'png' },
        (err, result) => err ? reject(err) : resolve(result)
      ).end(resultBuffer);
    });

    const meta = await sharp(resultBuffer).metadata();
    console.log('✅ BG removal done via remove.bg');
    res.json({
      success: true,
      processedUrl: uploadResult.secure_url,
      width: meta.width,
      height: meta.height
    });

  } catch (error) {
    // Axios error — show remove.bg's actual error message
    if (error.response) {
      const errMsg = Buffer.from(error.response.data).toString();
      console.error('❌ Remove.bg API error:', errMsg);
      return res.status(500).json({ error: 'Remove.bg failed: ' + errMsg });
    }
    console.error('❌ BG removal error:', error);
    res.status(500).json({ error: 'Failed: ' + error.message });
  }
});

// ========== BG REMOVAL UI PAGE ==========
app.get('/bg-removal', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Background Remover - AI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { background: #0a0f1c; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; padding: 16px; color: #eee; }
    .container { max-width: 600px; margin: 0 auto; background: #121826; border-radius: 32px; padding: 20px 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); }
    h2 { font-size: 1.6rem; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .sub { color: #8e9aaf; font-size: 0.85rem; margin-bottom: 20px; border-left: 3px solid #3b82f6; padding-left: 10px; }
    .upload-area { background: #1e2538; border-radius: 24px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: center; }
    .upload-btn { background: #3b82f6; border: none; color: white; padding: 12px 20px; border-radius: 60px; font-size: 1rem; font-weight: 500; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .upload-btn:active { background: #2563eb; transform: scale(0.97); }
    .preview-area { margin: 16px 0; text-align: center; }
    .preview-img { max-width: 100%; max-height: 300px; border-radius: 20px; border: 1px solid #2d3748; background: #0a0c14; }
    .action-btn { background: #10b981; width: 100%; border: none; padding: 16px; border-radius: 60px; font-size: 1.1rem; font-weight: bold; color: white; margin: 16px 0 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .action-btn:active { transform: scale(0.97); background: #059669; }
    .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .result-area { margin-top: 20px; background: #0f1422; border-radius: 24px; padding: 16px; }
    .result-title { font-weight: 600; margin-bottom: 12px; }
    .result-img { max-width: 100%; border-radius: 20px; border: 1px solid #2d3748; }
    .loader { display: inline-block; width: 20px; height: 20px; border: 2px solid #fff3; border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info { font-size: 0.75rem; color: #7e8aa8; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
<div class="container">
  <h2>🖌️ AI Background Remover</h2>
  <div class="sub">Upload any image – background will be removed automatically</div>

  <div class="upload-area">
    <button id="selectImageBtn" class="upload-btn">📸 Choose Image</button>
    <input type="file" id="fileInput" accept="image/*" style="display: none;">
  </div>

  <div class="preview-area" id="previewArea" style="display: none;">
    <img id="previewImg" class="preview-img" alt="Preview">
  </div>

  <button id="removeBgBtn" class="action-btn" disabled>✨ Remove Background</button>

  <div id="resultArea" class="result-area" style="display: none;">
    <div class="result-title">✅ Result (transparent background)</div>
    <img id="resultImg" class="result-img" alt="Result">
    <div style="margin-top: 12px; display: flex; gap: 12px;">
      <button id="downloadBtn" style="flex:1; background:#3b82f6; border:none; padding:10px; border-radius:40px; color:white; font-weight:500;">⬇️ Download</button>
      <button id="newBtn" style="flex:1; background:#334155; border:none; padding:10px; border-radius:40px; color:white;">🔄 New Image</button>
    </div>
  </div>
  <div class="info">⚡ Powered by AI – works best with people, products, or clear subjects.</div>
</div>

<script>
  const fileInput = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectImageBtn');
  const previewArea = document.getElementById('previewArea');
  const previewImg = document.getElementById('previewImg');
  const removeBtn = document.getElementById('removeBgBtn');
  const resultArea = document.getElementById('resultArea');
  const resultImg = document.getElementById('resultImg');
  const downloadBtn = document.getElementById('downloadBtn');
  const newBtn = document.getElementById('newBtn');

  let selectedFile = null;

  selectBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    selectedFile = file;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewArea.style.display = 'block';
    resultArea.style.display = 'none';
    removeBtn.disabled = false;
  });

  removeBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }

    removeBtn.disabled = true;
    removeBtn.innerHTML = '<span class="loader"></span> Processing...';

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('https://api.editezy.com/api/remove-bg', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        resultImg.src = data.processedUrl;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      removeBtn.disabled = false;
      removeBtn.innerHTML = '✨ Remove Background';
    }
  });

  // ✅ Download using the same endpoint as inpainting (handles Cloudinary URLs)
  downloadBtn.addEventListener('click', () => {
    const imgUrl = resultImg.src;
    if (!imgUrl || imgUrl === '') {
      alert('No processed image to download');
      return;
    }
    const downloadUrl = 'https://api.editezy.com/api/download-image?url=' + encodeURIComponent(imgUrl);
    window.location.href = downloadUrl;
  });

  newBtn.addEventListener('click', () => {
    selectedFile = null;
    previewArea.style.display = 'none';
    resultArea.style.display = 'none';
    fileInput.value = '';
    removeBtn.disabled = true;
  });
</script>
</body>
</html>`);
});


app.get('/api/download-image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).send('Missing ?url parameter');
    }

    // Security: only allow Cloudinary URLs
    if (!imageUrl.includes('res.cloudinary.com')) {
      return res.status(403).send('Invalid image source');
    }

    // Fetch image from Cloudinary
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 🔥 FORCE DOWNLOAD – this will never open in browser
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="processed_image.png"');
    res.setHeader('Content-Length', buffer.length);
    
    // Send file
    res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Download failed: ' + err.message);
  }
});




// ========== TEST PAGE ==========
app.get('/test-api', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>AI Object Remover - Mobile</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      background: #0a0f1c;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 16px;
      color: #eee;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #121826;
      border-radius: 32px;
      padding: 20px 16px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }
    h2 {
      font-size: 1.6rem;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sub {
      color: #8e9aaf;
      font-size: 0.85rem;
      margin-bottom: 20px;
      border-left: 3px solid #3b82f6;
      padding-left: 10px;
    }
    .upload-area {
      background: #1e2538;
      border-radius: 24px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
    }
    .upload-btn {
      background: #3b82f6;
      border: none;
      color: white;
      padding: 12px 20px;
      border-radius: 60px;
      font-size: 1rem;
      font-weight: 500;
      width: 100%;
      cursor: pointer;
      transition: 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .upload-btn:active { background: #2563eb; transform: scale(0.97); }
    .toolbar {
      background: #1e2538;
      border-radius: 40px;
      padding: 12px 16px;
      margin: 12px 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .brush-size {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #0f1422;
      padding: 6px 14px;
      border-radius: 40px;
    }
    .brush-size label { font-size: 0.85rem; font-weight: 500; }
    input[type="range"] {
      width: 140px;
      height: 4px;
      -webkit-appearance: none;
      background: #3b82f6;
      border-radius: 4px;
    }
    input[type="range"]:focus { outline: none; }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .btn-clear {
      background: #334155;
      border: none;
      color: white;
      padding: 8px 18px;
      border-radius: 40px;
      font-weight: 500;
      cursor: pointer;
      transition: 0.2s;
    }
    .btn-clear:active { background: #1e293b; }
    .canvas-container {
      position: relative;
      background: #00000022;
      border-radius: 24px;
      overflow: hidden;
      margin: 12px 0;
      display: flex;
      justify-content: center;
      border: 1px solid #2d3748;
    }
    canvas {
      display: block;
      max-width: 100%;
      height: auto;
      cursor: crosshair;
      background: #0a0c14;
      touch-action: none;  /* important for touch drawing */
    }
    .action-btn {
      background: #10b981;
      width: 100%;
      border: none;
      padding: 16px;
      border-radius: 60px;
      font-size: 1.1rem;
      font-weight: bold;
      color: white;
      margin: 16px 0 12px;
      cursor: pointer;
      transition: 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .action-btn:active { transform: scale(0.97); background: #059669; }
    .action-btn:disabled {
      opacity: 0.6;
      transform: none;
      cursor: not-allowed;
    }
    .result-area {
      margin-top: 20px;
      background: #0f1422;
      border-radius: 24px;
      padding: 16px;
    }
    .result-title {
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 1rem;
    }
    .result-img {
      max-width: 100%;
      border-radius: 20px;
      border: 1px solid #2d3748;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .info {
      font-size: 0.75rem;
      color: #7e8aa8;
      text-align: center;
      margin-top: 16px;
    }
    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #fff3;
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: #f97373; margin-top: 8px; font-size: 0.8rem; text-align: center; }
  </style>
</head>
<body>
<div class="container">
  <h2>✨ AI Object Remover</h2>
  <div class="sub">Paint over anything you want to erase → auto fill</div>

  <div class="upload-area">
    <button id="selectImageBtn" class="upload-btn">📸 Choose Image</button>
    <input type="file" id="fileInput" accept="image/*" style="display: none;">
  </div>

  <div class="toolbar">
    <div class="brush-size">
      <span>🖌️ Brush</span>
      <input type="range" id="brushSlider" min="8" max="50" value="22">
      <span id="brushValue">22px</span>
    </div>
    <button id="clearBtn" class="btn-clear">🗑️ Clear mask</button>
  </div>

  <div class="canvas-container">
    <canvas id="mainCanvas" width="500" height="400" style="width:100%; height:auto;"></canvas>
  </div>

  <button id="removeBtn" class="action-btn">✨ Remove painted area</button>

  <div id="resultArea" class="result-area" style="display: none;">
    <div class="result-title">✅ Processed result</div>
    <img id="resultImg" class="result-img" alt="Result">
    <div style="margin-top: 12px; display: flex; gap: 12px;">
      <button id="downloadBtn" style="flex:1; background:#3b82f6; border:none; padding:10px; border-radius:40px; color:white; font-weight:500;">⬇️ Download</button>
      <button id="newBtn" style="flex:1; background:#334155; border:none; padding:10px; border-radius:40px; color:white;">🔄 New Image</button>
    </div>
  </div>
  <div class="info">✏️ Touch and drag to paint over object. White strokes = area to remove.</div>
</div>

<script>
  // ---------- DOM elements ----------
  const canvas = document.getElementById('mainCanvas');
  const ctx = canvas.getContext('2d');
  const fileInput = document.getElementById('fileInput');
  const selectBtn = document.getElementById('selectImageBtn');
  const brushSlider = document.getElementById('brushSlider');
  const brushValue = document.getElementById('brushValue');
  const clearBtn = document.getElementById('clearBtn');
  const removeBtn = document.getElementById('removeBtn');
  const resultArea = document.getElementById('resultArea');
  const resultImg = document.getElementById('resultImg');
  const downloadBtn = document.getElementById('downloadBtn');
  const newBtn = document.getElementById('newBtn');

  let originalImage = null;
  let maskStrokes = [];
  let drawing = false;
  let brushRadius = 22;

  function resizeCanvasToImage(img) {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  function redrawWithMask() {
    if (!originalImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let s of maskStrokes) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function addStroke(x, y) {
    maskStrokes.push({ x: x, y: y, r: brushRadius });
    redrawWithMask();
  }

  function clearMask() {
    maskStrokes = [];
    if (originalImage) redrawWithMask();
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    x = Math.min(Math.max(0, x), canvas.width);
    y = Math.min(Math.max(0, y), canvas.height);
    return { x, y };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = getCanvasCoords(e);
    addStroke(x, y);
  }

  function drawMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    addStroke(x, y);
  }

  function endDraw(e) {
    drawing = false;
    e.preventDefault();
  }

  canvas.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', drawMove);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', drawMove, { passive: false });
  canvas.addEventListener('touchend', endDraw);
  canvas.addEventListener('touchcancel', endDraw);

  brushSlider.addEventListener('input', (e) => {
    brushRadius = parseInt(e.target.value);
    brushValue.innerText = brushRadius + 'px';
  });

  clearBtn.addEventListener('click', () => clearMask());
  selectBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    const reader = new FileReader();
    reader.onload = function(e) {
      img.onload = () => {
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = height * (maxWidth / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        originalImage = img;
        maskStrokes = [];
        resultArea.style.display = 'none';
        removeBtn.disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', async () => {
    if (!originalImage) {
      alert('Please select an image first');
      return;
    }
    if (maskStrokes.length === 0) {
      alert('Paint over the area you want to remove (white strokes)');
      return;
    }
    removeBtn.disabled = true;
    removeBtn.innerHTML = '<span class="loader"></span> Processing...';

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = 'white';
    for (let s of maskStrokes) {
      maskCtx.beginPath();
      maskCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      maskCtx.fill();
    }
    const maskBlob = await new Promise(resolve => maskCanvas.toBlob(resolve, 'image/png'));
    const imageResponse = await fetch(originalImage.src);
    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append('image', imageBlob, 'image.png');
    formData.append('mask', maskBlob, 'mask.png');

    try {
      const apiUrl = 'https://api.editezy.com/api/remove-painted-area';
      const response = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        resultImg.src = data.processedUrl;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      removeBtn.disabled = false;
      removeBtn.innerHTML = '✨ Remove painted area';
    }
  });

 downloadBtn.addEventListener('click', async () => {
  const imgUrl = resultImg.src;
  if (!imgUrl || imgUrl === '') {
    alert('No processed image to download');
    return;
  }
const downloadUrl = 'https://api.editezy.com/api/download-image?url=' + encodeURIComponent(imgUrl);
  window.location.href = downloadUrl;
});

  newBtn.addEventListener('click', () => {
    originalImage = null;
    canvas.width = 500;
    canvas.height = 400;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e1f2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    maskStrokes = [];
    resultArea.style.display = 'none';
    fileInput.value = '';
    removeBtn.disabled = true;
  });

  // initial placeholder
  ctx.fillStyle = '#1e1f2c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#aaa';
  ctx.font = '14px system-ui';
  ctx.fillText('📸 Select an image', canvas.width/2-80, canvas.height/2);
</script>
</body>
</html>`);
});


// ------------------------
// HTTP + Socket.IO server
// ------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

// ------------------------
// Socket.IO for chat
// ------------------------
io.on('connection', (socket) => {

  socket.on('joinRoom', ({ senderId, receiverId }) => {
    const roomId = senderId + '_' + receiverId;
    socket.join(roomId);
  });

  socket.on('leaveRoom', ({ senderId, receiverId }) => {
    const roomId = senderId + '_' + receiverId;
    socket.leave(roomId);
  });

  socket.on('sendMessage', async ({ senderId, receiverId, message, images }) => {
    try {
      if (!message || message.trim() === '') return;

      const newMessage = new Chat({
        senderId,
        receiverId,
        message: message.trim(),
        images: images || [],
        timestamp: new Date()
      });

      const savedMessage = await newMessage.save();

      const roomId = senderId + '_' + receiverId;
      io.to(roomId).emit('receiveMessage', savedMessage);

    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
    }
  });

  socket.on('disconnect', (reason) => {
    //console.log(`🔴 Socket disconnected: ${socket.id}`);
  });

  socket.onAny((event, ...args) => {
    //console.log(`📌 Socket event received: ${event}`);
  });
});

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 6002;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📌 Network access: http://31.97.206.144:${PORT}`);
  console.log(`📌 Open http://localhost:${PORT}/index.html to access the UI`);
  console.log(`🧪 Test inpainting: http://localhost:${PORT}/test-api`);
  console.log(`🖼️ Background removal: http://localhost:${PORT}/bg-removal`);
});