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

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
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

// Log that cron jobs are being scheduled


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

    //console.log(`👥 Total users to send greeting: ${users.length}`);

    // 🔥 Detect greeting type
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

      // 🔹 Per user log

    }



    
    // 🔥 Next greeting hint
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

    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Update users who:
    // 1. Have free7DayTrial = true
    // 2. Created more than 7 days ago (createdAt < 7 days ago)
    // 3. Don't have any active subscription
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


    
    // Optional: Log some sample users that got expired
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

      // 🔥 TRY MULTIPLE SOURCES
      let userPaymentId =
        payment.notes?.userPaymentId ||   // ✅ expected
        payment.description ||            // ⚠️ fallback
        payment.order_id ||               // ⚠️ fallback
        null;

      console.log("🆔 FINAL userPaymentId:", userPaymentId);

      if (!userPaymentId) {
        console.log("❌ userPaymentId NOT FOUND ANYWHERE");
        return res.status(400).send("userPaymentId missing");
      }

      // 🔹 Validate ObjectId
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

      // ✅ UPDATE
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

    // Signature verify
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

  // Log when socket joins a room
  socket.on('joinRoom', ({ senderId, receiverId }) => {
    const roomId = `${senderId}_${receiverId}`;
    socket.join(roomId);
  });

  // Log when socket leaves a room
  socket.on('leaveRoom', ({ senderId, receiverId }) => {
    const roomId = `${senderId}_${receiverId}`;
    socket.leave(roomId);
  });

  // Handle sending messages
  socket.on('sendMessage', async ({ senderId, receiverId, message, images }) => {
    try {
      if (!message || message.trim() === '') return;

      // Save message to DB
      const newMessage = new Chat({
        senderId,
        receiverId,
        message: message.trim(),
        images: images || [],
        timestamp: new Date()
      });

      const savedMessage = await newMessage.save();

      // Emit to room
      const roomId = `${senderId}_${receiverId}`;
      io.to(roomId).emit('receiveMessage', savedMessage);

      // 🔹 Log everything
      // console.log('📤 [Socket] Message emitted:', {
      //   roomId,
      //   socketId: socket.id,
      //   senderId,
      //   receiverId,
      //   message: savedMessage.message,
      //   images: savedMessage.images,
      //   timestamp: savedMessage.timestamp.toISOString()
      // });

    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
    }
  });

  // Log socket disconnection
  socket.on('disconnect', (reason) => {
    //console.log(`🔴 Socket disconnected: ${socket.id} at ${new Date().toISOString()} | Reason: ${reason}`);
  });

  // Optional: Log any other events for debugging
  socket.onAny((event, ...args) => {
    //console.log(`📌 Socket event received: ${event} | Data:`, args);
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

});