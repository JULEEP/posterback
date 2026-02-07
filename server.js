import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDatabase from './db/connectDatabase.js';
import path from 'path'; // Import path to work with file and directory paths
import UserRoutes from './Routes/userRoutes.js'
import CategoryRoutes from './Routes/CategoryRoutes.js'
import PosterRoutes from './Routes/posterRoutes.js'
import { fileURLToPath } from 'url';  // Import the fileURLToPath method
import PlanRoutes from './Routes/PlanRoutes.js'
import BusinessRoutes from './Routes/BusinessRoutes.js'
import AdminRoutes from './Routes/AdminRoutes.js'
import paymentRoutes from './Routes/paymentRoutes.js'
import cloudinary from './config/cloudinary.js';
import fileUpload from 'express-fileupload';
import cron from 'node-cron';
import { sendBirthdaySMS, sendAnniversarySMS } from './Controller/UserController.js';  // Import functions directly
import { Blob, File } from 'buffer';
import { sendPushNotification } from './utils/sendPushNotification.js';
import { getGreeting } from './utils/greeting.js';
import User from './Models/User.js';

global.Blob = Blob;
global.File = File;



dotenv.config();
console.log('🔍 Loaded MONGO_URI:', process.env.MONGO_URI);

const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ✅ Serve static files from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: ['http://localhost:3000', 'http://194.164.148.244:3079', 'http://localhost:3002', 'https://ezystudio-zu8y.vercel.app', 'https://editezy.com', 'https://posternova.vercel.app', 'http://31.97.206.144:3065'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Database connection
connectDatabase();


// Run every day at midnight (12:00 AM)
cron.schedule('0 0 * * *', async () => {
  console.log('🔔 Running birthday/anniversary SMS cron...');

  const now = new Date();
  const todayDay = now.getDate();         // e.g., 29
  const todayMonth = now.getMonth() + 1;  // e.g., July is 6 + 1 = 7

  try {
    // 🎂 Birthday matches
    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: '$dob' }, todayDay] },
          { $eq: [{ $month: '$dob' }, todayMonth] }
        ]
      }
    });

    for (const user of birthdayUsers) {
      await sendBirthdaySMS(user.mobile);
    }

    // 💍 Anniversary matches
    const anniversaryUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: '$marriageAnniversaryDate' }, todayDay] },
          { $eq: [{ $month: '$marriageAnniversaryDate' }, todayMonth] }
        ]
      }
    });

    for (const user of anniversaryUsers) {
      await sendAnniversarySMS(user.mobile);
    }

    console.log('✅ Birthday & anniversary SMS sent successfully.');
  } catch (err) {
    console.error('❌ Cron job failed:', err);
  }
});


// ------------------------
// Cron: Daily Greeting Notifications at 9 AM
// ------------------------
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



// Middleware to handle file uploads
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/', // Temporary directory to store files before upload
}));

// Default route
app.get("/", (req, res) => {
    res.json({
        status: "success",    // A key to indicate the response status
        message: "Welcome to our poser bnao service!", // Static message
    });
});



// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve frontend static files (HTML, JS, CSS)


// Create HTTP server with Express app
const server = http.createServer(app);

app.use('/api/users', UserRoutes);
app.use('/api/category', CategoryRoutes);
app.use('/api/poster', PosterRoutes);
app.use('/api/plans', PlanRoutes);
app.use('/api/business', BusinessRoutes);
app.use('/api/admin', AdminRoutes);
app.use('/api/payment', paymentRoutes); // So your route becomes /api/payment/phonepe




const port = process.env.PORT || 6002;

app.listen(port, '0.0.0.0', () => {
console.log(`🚀 Server is up and running at: http://0.0.0.0:${port}`);
});

