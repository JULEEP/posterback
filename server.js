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

dotenv.config();

const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ✅ Serve static files from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: ['http://localhost:3000', 'https://posterbnaoadmin.vercel.app', 'http://194.164.148.244:3000', 'http://194.164.148.244:3079'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Database connection
connectDatabase();


// Cron job to check for birthdays and anniversaries at 12 AM
cron.schedule('0 0 * * *', async () => {
  console.log('Running cron job for birthday and anniversary wishes...');

  const today = new Date().toISOString().split('T')[0];  // Get today's date in YYYY-MM-DD format

  // Find users with today's birthday
  const birthdayUsers = await User.find({
    dob: { $regex: today },  // Match the day and month of DOB (ignore year)
  });

  birthdayUsers.forEach(user => {
    sendBirthdaySMS(user.mobile);  // Send SMS to birthday users
  });

  // Find users with today's marriage anniversary
  const anniversaryUsers = await User.find({
    marriageAnniversaryDate: { $regex: today },  // Match the day and month of the anniversary
  });

  anniversaryUsers.forEach(user => {
    sendAnniversarySMS(user.mobile);  // Send SMS to anniversary users
  });
});

console.log('Cron job scheduled for birthdays and anniversaries at midnight.');



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
console.log(`🚀 Server is up and running at: http://localhost:${port}`);
});

