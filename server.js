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

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------
// Middleware
// ------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://194.164.148.244:3079', 
    'http://localhost:3002', 
    'https://ezystudio-zu8y.vercel.app', 
    'https://editezy.com', 
    'https://posternova.vercel.app', 
    'http://31.97.206.144:3065'
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

// ------------------------
// Database
// ------------------------
connectDatabase();

// ------------------------
// Cron Jobs
// ------------------------

// Daily Birthday & Anniversary SMS at 12:00 AM
cron.schedule('0 0 * * *', async () => {
  console.log('🔔 Running birthday/anniversary SMS cron...');
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

    console.log('✅ Birthday & anniversary SMS sent successfully.');
  } catch (err) {
    console.error('❌ Cron job failed:', err);
  }
});

// Daily Greeting Notifications at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Running daily greeting notifications...');
  try {
    const users = await User.find({ fcmToken: { $ne: null } });
    for (const user of users) {
      await sendPushNotification({
        fcmToken: user.fcmToken,
        title: getGreeting(user.name),
        body: "🌟 Start your day with something special!",
        data: { type: "DAILY_GREETING" }
      });
    }
    console.log(`✅ Sent daily greetings to ${users.length} users.`);
  } catch (err) {
    console.error('❌ Daily greeting cron failed:', err);
  }
});

// ------------------------
// Routes
// ------------------------
app.get("/", (req, res) => {
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
  console.log(`🟢 Socket connected: ${socket.id} at ${new Date().toISOString()}`);

  // Log when socket joins a room
  socket.on('joinRoom', ({ senderId, receiverId }) => {
    const roomId = `${senderId}_${receiverId}`;
    socket.join(roomId);
    console.log(`✅ Socket ${socket.id} joined room: ${roomId} at ${new Date().toISOString()}`);
  });

  // Log when socket leaves a room
  socket.on('leaveRoom', ({ senderId, receiverId }) => {
    const roomId = `${senderId}_${receiverId}`;
    socket.leave(roomId);
    console.log(`❌ Socket ${socket.id} left room: ${roomId} at ${new Date().toISOString()}`);
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
      console.log('📤 [Socket] Message emitted:', {
        roomId,
        socketId: socket.id,
        senderId,
        receiverId,
        message: savedMessage.message,
        images: savedMessage.images,
        timestamp: savedMessage.timestamp.toISOString()
      });

    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
    }
  });

  // Log socket disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.id} at ${new Date().toISOString()} | Reason: ${reason}`);
  });

  // Optional: Log any other events for debugging
  socket.onAny((event, ...args) => {
    console.log(`📌 Socket event received: ${event} | Data:`, args);
  });
});

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 6002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
