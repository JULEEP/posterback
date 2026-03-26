import jwt from 'jsonwebtoken'; // For JWT token generation
import dotenv from 'dotenv';
import User from '../Models/User.js';
import multer from 'multer'; // Import multer for file handling
import path from 'path';  // To resolve file paths
import twilio from 'twilio';
import { SendSms } from '../config/twilioConfig.js';
import uploads from '../config/uploadConfig.js';
import Story from '../Models/Story.js';
import Plan from '../Models/Plan.js';
import mongoose from 'mongoose';
import Order from '../Models/Order.js';
import Poster from '../Models/Poster.js';
import BusinessPoster from '../Models/BusinessPoster.js';
import QRCode from 'qrcode';  // You need to install 'qrcode' using npm
import cloudinary from '../config/cloudinary.js';
import cron from 'node-cron';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'; // ✅ note the ".js"
dayjs.extend(isSameOrAfter);
import moment from 'moment'; // Make sure to install: npm install moment
import crypto from 'crypto';
import ContactUs from '../Models/ContactUs.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import WalletRedemption from '../Models/WalletRedemption.js';
dayjs.extend(customParseFormat);
import Razorpay from "razorpay";
import {sendPushNotification} from "../config/pushNotification.js"
import {getGreeting} from "../utils/greeting.js"

import nodemailer from 'nodemailer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import UserHistory from '../Models/UserHistory.js';
import Reel from '../Models/Reel.js';
import fetch from "node-fetch";
import {
  Observer,
  Body,
  Equator,
  SearchRiseSet
} from "astronomy-engine";
import admin from 'firebase-admin';
import Chat from '../Models/Chat.js';
import Notification from '../Models/Notification.js';
import { exec } from "child_process";
import WalletConfig from '../Models/WalletConfig.js';
import BusinessCard from '../Models/BusinessCard.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import UserPayments from '../Models/UserPayments.js';


dayjs.extend(customParseFormat);

const parseFlexibleDate = (dateString) => {
  if (!dateString) return null;

  const formats = [
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "DD/MM/YYYY",
    "MM-DD-YYYY",
    "MM/DD/YYYY",
  ];

  for (let format of formats) {
    const parsed = dayjs(dateString, format, true);
    if (parsed.isValid()) return parsed;
  }

  const fallback = dayjs(dateString);
  return fallback.isValid() ? fallback : null;
};







dotenv.config();


// Create Twilio client


// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});


// Set up storage for profile images using Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles'); // Specify folder to store uploadsed files
  },
  filename: function (req, file, cb) {
    // Set the filename for the uploaded file
    cb(null, Date.now() + '-' + file.originalname); // Add timestamp to avoid conflicts
  },
});

// Filter to ensure only image files can be uploaded
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(new Error('Invalid file type. Only JPG, JPEG, and PNG files are allowed.'));
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: fileFilter,
});


// Helper to generate 8-character referral code
const generateReferralCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      dob, // Optional
      marriageAnniversaryDate,
      referralCode: enteredCode,
      fcmToken // ✅ ONLY ADDITION
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ message: 'Name and Mobile are required.' });
    }

    // --- Check if mobile exists ---
    let user = await User.findOne({ mobile });

    if (user) {
      if (!user.isVerified) {
        return res.status(400).json({
          message: "Your mobile number is not verified. Please verify it first.",
        });
      }

      // Update fields if exists
      if (name) user.name = name;
      if (email) user.email = email;
      if (dob) user.dob = dob;
      if (marriageAnniversaryDate) user.marriageAnniversaryDate = marriageAnniversaryDate;

      // Validate referral code if provided
      if (enteredCode) {
        const referrer = await User.findOne({ referralCode: enteredCode.toUpperCase() });
        if (!referrer) {
          return res.status(400).json({ message: 'Invalid referral code.' });
        }
        user.referredBy = referrer._id;
      }

      await user.save();

      return res.status(200).json({
        message: 'User details updated successfully.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          dob: user.dob,
          marriageAnniversaryDate: user.marriageAnniversaryDate,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          wallet: user.wallet,
          free7DayTrial: user.free7DayTrial || false,
          trialExpiryDate: user.trialExpiryDate || null
        },
      });
    }

    // ---------------------------------------------------
    // New user creation

    const formattedDOB = dob
      ? moment(dob, ['YYYY-MM-DD', 'DD-MM-YYYY']).format('DD-MM-YYYY')
      : null;

    const formattedAnniversary = marriageAnniversaryDate
      ? moment(marriageAnniversaryDate, ['YYYY-MM-DD', 'DD-MM-YYYY']).format('DD-MM-YYYY')
      : null;

    // Generate unique referral code
    let newReferralCode;
    let isUnique = false;
    while (!isUnique) {
      newReferralCode = generateReferralCode();
      const exists = await User.findOne({ referralCode: newReferralCode });
      if (!exists) isUnique = true;
    }

    let referredBy = null;
    if (enteredCode) {
      const referrer = await User.findOne({ referralCode: enteredCode.toUpperCase() });
      if (!referrer) {
        return res.status(400).json({ message: 'Invalid referral code.' });
      }
      referredBy = referrer._id;
    }

    // Trial expiry date = 7 days from now
    const trialExpiryDate = moment().add(7, 'days').toDate();

    const newUser = new User({
      name,
      email,
      mobile,
      dob: formattedDOB,
      marriageAnniversaryDate: formattedAnniversary,
      referralCode: newReferralCode,
      referredBy,
      wallet: 0,
      free7DayTrial: true,
      trialExpiryDate,
      fcmToken // ✅ ONLY ADDITION
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '1h',
    });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        dob: newUser.dob,
        referralCode: newUser.referralCode,
        referredBy: newUser.referredBy,
        wallet: newUser.wallet,
        free7DayTrial: newUser.free7DayTrial,
        trialExpiryDate: newUser.trialExpiryDate,
        fcmToken: newUser.fcmToken // ✅ ADDED
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Direct Twilio credentials
const TWILIO_SID = 'ACd37d269a71fda78661c1fd2a54a5b567';
const TWILIO_AUTH_TOKEN = '06dc6986bc923184ef0cfa8824485bb2';
const TWILIO_PHONE = '+16193309459'; // Your Twilio phone number



const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

const generateOTP = () => {
  return String(Math.floor(1000 + Math.random() * 9000)); // return as string
};


const sendOTP = async (mobile, otp) => {
  const phoneNumber = `+91${mobile}`;
  const message = `Your one-time password (OTP) is: ${otp}. It is valid for 30 seconds. Do not share it with anyone. – Team EDITEZY`;

  await client.messages.create({
    body: message,
    from: TWILIO_PHONE,
    to: phoneNumber,
  });

  console.log(`✅ OTP sent to ${phoneNumber}: ${otp}`);
};


const checkAndExpireTrial = async (user) => {
  if (
    user.free7DayTrial === true &&
    user.trialExpiryDate &&
    new Date() > user.trialExpiryDate
  ) {
    user.free7DayTrial = false;
    await user.save();
  }
};



export const loginUser = async (req, res) => {
  const { mobile } = req.body;
  
  // Language can also be passed in request body for new users
  const preferredLanguage = req.body.language || 'en';
  
  if (!mobile) {
    const errorMsg = preferredLanguage === 'hi' 
      ? 'मोबाइल नंबर आवश्यक है' 
      : 'Mobile is required';
    return res.status(400).json({ message: errorMsg });
  }

  try {
    let user = await User.findOne({ mobile });

    const staticOtpNumbers = ['9744037599', '9849008143'];
    const otp = staticOtpNumbers.includes(mobile) ? '1234' : generateOTP();

    if (user) {
      // 🔥 AUTO-EXPIRE TRIAL LOGIC
      if (
        user.free7DayTrial === true &&
        user.trialExpiryDate &&
        new Date() > user.trialExpiryDate
      ) {
        user.free7DayTrial = false;
      }

      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 60 * 1000);
      await user.save();

      // Check user's language preference
      const userLanguage = user.language || 'en';
      
      // Translate name if language is Hindi
      let displayName = user.name || null;
      if (userLanguage === 'hi' && displayName) {
        displayName = await translateToHindi(displayName);
      }

      const message = userLanguage === 'hi'
        ? 'ओटीपी सफलतापूर्वक जेनरेट हुआ'
        : 'OTP generated successfully';

      return res.status(200).json({
        message,
        otp,
        user: {
          _id: user._id,
          name: displayName, // Translated name if Hindi user
          email: user.email || null,
          mobile: user.mobile,
          wallet: user.wallet || 0,
          isVerified: user.isVerified || false,
          isSubscribedPlan: user.isSubscribedPlan || false,
          free7DayTrial: user.free7DayTrial,
          trialExpiryDate: user.trialExpiryDate,
          language: user.language || 'en' // Include language preference
        }
      });

    } else {
      // New user - create with preferred language
      const trialExpiryDate = moment().add(7, 'days').toDate();

      user = new User({
        mobile,
        otp,
        otpExpiry: new Date(Date.now() + 60 * 1000),
        free7DayTrial: true,
        trialExpiryDate,
        language: preferredLanguage // Save preferred language for new user
      });
      await user.save();

      const message = preferredLanguage === 'hi'
        ? 'ओटीपी सफलतापूर्वक जेनरेट हुआ'
        : 'OTP generated successfully';

      return res.status(200).json({
        message,
        otp,
        user: {
          _id: user._id,
          mobile: user.mobile,
          free7DayTrial: true,
          trialExpiryDate,
          language: user.language // Include language preference
        }
      });
    }

  } catch (err) {
    console.error(err);
    
    const errorMsg = preferredLanguage === 'hi'
      ? 'सर्वर त्रुटि'
      : 'Server error';
      
    res.status(500).json({ message: errorMsg });
  }
};

// Resend OTP function (optional, if user requests to resend OTP)
export const resendOTP = async (req, res) => {
  const { mobile } = req.body;

  try {
    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Static OTP for specific numbers
    const staticOtpNumbers = ['9744037599', '9849008143'];
    let otp;

    // Check if mobile number is in the static list
    if (staticOtpNumbers.includes(mobile)) {
      otp = '1234'; // Static OTP for specified numbers
    } else {
      otp = generateOTP(); // Random OTP for other numbers
    }

    const otpExpiry = new Date(Date.now() + 30 * 1000); // OTP expiry time (30 seconds)

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.otp;
    delete userResponse.otpExpiry;

    res.status(200).json({
      message: "OTP resent successfully.",
      otp: otp, // Returning OTP directly (for testing)
      user: userResponse
    });

  } catch (error) {
    console.error("Error in resendOTP:", error);
    res.status(500).json({ message: "Failed to resend OTP." });
  }
};





export const verifyOTP = async (req, res) => {
  const { mobile, otp, fcmToken } = req.body; // ✅ fcmToken bhi body se le rahe

  if (!mobile || !otp) {
    const errorMsg = req.body?.language === 'hi' 
      ? 'मोबाइल और ओटीपी आवश्यक है'
      : 'Mobile and OTP are required';
    return res.status(400).json({ error: errorMsg });
  }

  try {
    let user = await User.findOne({ mobile });

    if (!user) {
      const errorMsg = req.body?.language === 'hi'
        ? 'उपयोगकर्ता नहीं मिला। कृपया पहले ओटीपी अनुरोध करें।'
        : 'User not found. Please request OTP first.';
      return res.status(404).json({ error: errorMsg });
    }

    // Check user's language preference
    const userLanguage = user.language || 'en';

    // Translate user name if language is Hindi
    let displayUser = user.toObject ? user.toObject() : { ...user };
    if (userLanguage === 'hi' && displayUser.name) {
      displayUser.name = await translateToHindi(displayUser.name);
    }

    // Static OTP check for special numbers
    const staticOtpNumbers = ['9744037599', '9849008143'];
    if (staticOtpNumbers.includes(mobile) && otp === '1234') {
      user.isVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      
      if (fcmToken) user.fcmToken = fcmToken; // ✅ Store fcmToken

      await user.save();

      const successMsg = userLanguage === 'hi'
        ? 'ओटीपी सफलतापूर्वक सत्यापित हुआ'
        : 'OTP verified successfully';

      return res.status(200).json({ 
        message: successMsg, 
        user: displayUser // User with translated name if Hindi
      });
    }

    // Normal OTP validation
    if (user.otp !== otp) {
      const errorMsg = userLanguage === 'hi'
        ? 'गलत ओटीपी'
        : 'Invalid OTP';
      return res.status(400).json({ error: errorMsg });
    }
    
    if (user.otpExpiry < Date.now()) {
      const errorMsg = userLanguage === 'hi'
        ? 'ओटीपी की अवधि समाप्त हो गई है'
        : 'OTP has expired';
      return res.status(400).json({ error: errorMsg });
    }

    // OTP is valid: mark verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    
    if (fcmToken) user.fcmToken = fcmToken; // ✅ Store fcmToken

    await user.save();

    // Update displayUser with latest data
    displayUser = user.toObject ? user.toObject() : { ...user };
    if (userLanguage === 'hi' && displayUser.name) {
      displayUser.name = await translateToHindi(displayUser.name);
    }

    const successMsg = userLanguage === 'hi'
      ? 'ओटीपी सफलतापूर्वक सत्यापित हुआ'
      : 'OTP verified successfully';

    res.status(200).json({ 
      message: successMsg, 
      user: displayUser // User with translated name if Hindi
    });

  } catch (err) {
    console.error("OTP Verification Error:", err);
    
    const errorMsg = req.body?.language === 'hi'
      ? 'सर्वर त्रुटि'
      : 'Server error';
      
    res.status(500).json({ error: errorMsg });
  }
};


export const getOTP = async (req, res) => {
  const { mobile } = req.body; // ✅ Get mobile from request body

  if (!mobile) {
    return res.status(400).json({ message: "Mobile number is required." });
  }

  try {
    // Find user by mobile
    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "OTP fetched successfully.",
      otp: user.otp,        // 🔥 returning OTP for testing
      otpExpiry: user.otpExpiry
    });

  } catch (error) {
    console.error("getOTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// Birthday Wishes SMS Function
export const sendBirthdaySMS = async (mobile) => {
  const message = `
🎉 Happy Birthday! 🎂
Wishing you a day filled with love, joy, and success.
Enjoy your special day!

– Team POSTER
`;

  try {
    // Sending SMS via Twilio
    await client.messages.create({
      body: message,
      to: `+91${mobile}`,  // Indian mobile number format
      from: TWILIO_PHONE,  // Use your Twilio phone number
    });
    console.log(`Birthday wishes sent to ${mobile}`);
  } catch (error) {
    console.error('Error sending birthday SMS:', error);
  }
};

// Anniversary Wishes SMS Function
export const sendAnniversarySMS = async (mobile) => {
  const message = `
💍 Happy Marriage Anniversary! 💖
Wishing you a lifetime of love, happiness, and togetherness.
Enjoy your special day!

– Team POSTER
`;

  try {
    // Sending SMS via Twilio
    await client.messages.create({
      body: message,
      to: `+91${mobile}`,  // Indian mobile number format
      from: TWILIO_PHONE,  // Use your Twilio phone number
    });
    console.log(`Anniversary wishes sent to ${mobile}`);
  } catch (error) {
    console.error('Error sending anniversary SMS:', error);
  }
};

// Cron job to check for birthdays and anniversaries at 12 AM
cron.schedule('0 0 * * *', async () => {
  console.log('Running cron job for birthday and anniversary wishes...');

  const today = new Date().toISOString().split('T')[0];  // Get today's date in YYYY-MM-DD format
  const todayDDMM = today.slice(5);  // Extract the month and day (MM-DD)

  // Find users with today's birthday (match MM-DD)
  const birthdayUsers = await User.find({
    dob: { $regex: `^${todayDDMM}` },  // Match day and month (ignore year)
  });

  birthdayUsers.forEach(user => {
    sendBirthdaySMS(user.mobile);  // Send SMS to birthday users
  });

  // Find users with today's marriage anniversary (match MM-DD)
  const anniversaryUsers = await User.find({
    marriageAnniversaryDate: { $regex: `^${todayDDMM}` },  // Match day and month (ignore year)
  });

  anniversaryUsers.forEach(user => {
    sendAnniversarySMS(user.mobile);  // Send SMS to anniversary users
  });
});

console.log('Cron job scheduled for birthdays and anniversaries at midnight.');


// User Controller (GET User)
export const getUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      // Error messages
      const errorMessages = {
        en: { message: 'User not found!' },
        hi: { message: 'उपयोगकर्ता नहीं मिला!' }
      };
      
      const userLanguage = user?.language || 'en';
      return res.status(404).json(errorMessages[userLanguage] || errorMessages.en);
    }

    // Check if trial has expired
    let freeTrialActive = user.free7DayTrial;
    if (user.trialExpiryDate && new Date() > new Date(user.trialExpiryDate)) {
      freeTrialActive = false;
    }

    // User ki language check
    const lang = user.language || 'en';

    // Agar language Hindi hai to sirf name Hindi mein bhejo
    if (lang === 'hi') {
      // Sirf name ko Hindi mein convert karo
      const hindiName = await translateToHindi(user.name);
      
      return res.status(200).json({
        message: 'User details retrieved successfully!', // Message English mein
        userId: user._id.toString(),
        name: hindiName, // Sirf name Hindi mein
        email: user.email, // Email English mein
        mobile: user.mobile, // Mobile English mein
        profileImage: user.profileImage || 'default-profile-image.jpg', // English mein
        wallet: user.wallet || 0, // Number hi rahega
        freeTrial: freeTrialActive, // Boolean hi rahega
        trialExpiry: user.trialExpiryDate || null, // Date/null hi rahega
        language: 'hindi'
      });
    }

    // Default English response
    return res.status(200).json({
      message: 'User details retrieved successfully!',
      userId: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage || 'default-profile-image.jpg',
      wallet: user.wallet || 0,
      freeTrial: freeTrialActive,
      trialExpiry: user.trialExpiryDate || null,
      language: 'english'
    });

  } catch (error) {
    console.error(error);
    
    const errorMessages = {
      en: { message: 'Server error' },
      hi: { message: 'सर्वर त्रुटि' }
    };

    const userLanguage = req.user?.language || 'en';
    return res.status(500).json(errorMessages[userLanguage] || errorMessages.en);
  }
};

// Translation function using Google Translate API
async function translateToHindi(text) {
  try {
    // Agar text already Hindi mein hai to waise hi return karo
    if (/[\u0900-\u097F]/.test(text)) {
      return text;
    }
    
    // Google Translate API endpoint
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=' + encodeURIComponent(text);
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Extract translated text from response
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0]; // Translated text in Hindi
    }
    
    return text; // Fallback to original text if translation fails
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}



// User Controller (UPDATE User)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, mobile, dob, marriageAnniversaryDate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if email or mobile already exists for another user
    const userExist = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    // if (userExist && userExist._id.toString() !== userId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Email or mobile already associated with another user",
    //   });
    // }

    // Update fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    user.dob = dob || user.dob;
    user.marriageAnniversaryDate =
      marriageAnniversaryDate || user.marriageAnniversaryDate;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        dob: user.dob,
        marriageAnniversaryDate: user.marriageAnniversaryDate,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};





export const createProfile = [
  upload.single('profileImage'),  // 'profileImage' is the field name in the Form Data
  async (req, res) => {
    try {
      const userId = req.params.id; // Get userId from params

      // Check if the user already exists by userId
      const existingUser = await User.findById(userId);

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found!' });
      }

      // If a profile image is uploaded, update the profileImage field
      const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : existingUser.profileImage;

      // Update the user's profile image
      existingUser.profileImage = profileImage;

      // Save the updated user to the database
      await existingUser.save();

      return res.status(200).json({
        message: 'Profile image updated successfully!',
        user: {
          id: existingUser._id,
          profileImage: existingUser.profileImage,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
];

// Update Profile Image using express-fileupload and Cloudinary
// Update Profile Image using express-fileupload and Cloudinary
export const editProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found!' });
    }

    let profileImageUrl = existingUser.profileImage;

    // Check if profile image is uploaded
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;

      // Upload to Cloudinary using temp file
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'profile_images',
      });

      profileImageUrl = result.secure_url;

      // 🔴 No fs.unlinkSync — just skip cleanup
    }

    // Save the new profile image
    existingUser.profileImage = profileImageUrl;
    await existingUser.save();

    res.status(200).json({
      message: 'Profile image updated successfully!',
      user: {
        id: existingUser._id,
        profileImage: existingUser.profileImage,
      },
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Profile (with userId in params)
export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;  // Get the user ID from request params

    // Find user by ID and populate the subscribedPlans
    const user = await User.findById(userId).populate('subscribedPlans.planId');  // Assuming `subscribedPlans` references `Plan` model

    if (!user) {
      // Error message in multiple languages
      const errorMessages = {
        en: { message: 'User not found!' },
        hi: { message: 'उपयोगकर्ता नहीं मिला!' }
      };
      
      const userLanguage = req.query?.lang || 'en';
      return res.status(404).json(errorMessages[userLanguage] || errorMessages.en);
    }

    // Check user's language preference
    const lang = user.language || 'en';

    // Translate name to Hindi if language is Hindi
    let displayName = user.name;
    if (lang === 'hi') {
      displayName = await translateToHindi(user.name);
    }

    // Respond with user details along with subscribed plans
    return res.status(200).json({
      id: user._id,
      name: displayName, // Sirf name translate hoga
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
      dob: user.dob || null,
      marriageAnniversaryDate: user.marriageAnniversaryDate || null,
      subscribedPlans: user.subscribedPlans,
      wallet: user.wallet || 0,
    });
    
  } catch (error) {
    console.error(error);
    
    const errorMessages = {
      en: { message: 'Server error' },
      hi: { message: 'सर्वर त्रुटि' }
    };

    const userLanguage = req.user?.language || 'en';
    return res.status(500).json(errorMessages[userLanguage] || errorMessages.en);
  }
};



// Controller to send birthday wishes
export const sendBirthdayWishes = async (req, res) => {
  try {
    const today = dayjs().format('MM-DD'); // Get today's date in MM-DD format
    const users = await User.find(); // Fetch all users from the DB

    const birthdayPeople = users.filter(user => {
      // Compare today's date with user's DOB (formatted as MM-DD)
      return user.dob && dayjs(user.dob).format('MM-DD') === today;
    });

    // Send birthday wishes to users whose birthday is today
    for (const user of birthdayPeople) {
      const message = `🎉 Happy Birthday ${user.name}! Wishing you a day filled with joy, laughter, and cake! 🎂🥳`;
      await SendSms(user.mobile, message); // Send SMS via Twilio
    }

    res.status(200).json({
      success: true,
      message: 'Birthday wishes sent to users.',
      totalWished: birthdayPeople.length
    });
  } catch (error) {
    console.error('Error sending birthday wishes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send birthday wishes',
      details: error.message
    });
  }
};


export const checkUserBirthday = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const today = dayjs().format('MM-DD');
    const dob = user.dob ? dayjs(user.dob).format('MM-DD') : null;

    if (dob === today) {
      return res.status(200).json({
        success: true,
        isBirthday: true,
        message: `🎉 Happy Birthday ${user.name}! Have a fantastic day! 🎂`,
      });
    } else {
      return res.status(200).json({
        success: true,
        isBirthday: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};


export const postStory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { caption } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Normalize all uploaded files into an array
    const uploadedFiles = Object.values(req.files || {}).flat();

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ message: "At least one media file (image, video, or audio) is required." });
    }

    const images = [];
    const videos = [];
    const audios = [];

    for (const file of uploadedFiles) {
      const fileType = file.mimetype.split('/')[0]; // image, video, audio

      // Upload directly to Cloudinary
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: fileType,
        folder: "poster" // You can use "stories" if you prefer separating folders
      });

      // Categorize uploaded URLs
      if (fileType === 'image') images.push(result.secure_url);
      else if (fileType === 'video') videos.push(result.secure_url);
      else if (fileType === 'audio') audios.push(result.secure_url);
    }

    // Validate at least one valid media uploaded
    if (images.length === 0 && videos.length === 0 && audios.length === 0) {
      return res.status(400).json({ message: "Only image, video, or audio files are allowed." });
    }

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    // Save story to DB
    const newStory = new Story({
      user: userId,
      caption,
      images,
      videos,
      audios,
      expired_at: expiredAt
    });

    await newStory.save();

    // Push story ID to user
    await User.findByIdAndUpdate(userId, {
      $push: { myStories: newStory._id }
    });

    const user = await User.findById(userId);

    // Final response
    res.status(201).json({
      message: "Story posted successfully!",
      story: {
        _id: newStory._id,
        user: user._id,
        caption: newStory.caption,
        images: newStory.images,
        videos: newStory.videos,
        audios: newStory.audios,
        expired_at: newStory.expired_at,
        user_name: user.name || null,
        user_mobile: user.mobile || null
      }
    });
  } catch (error) {
    console.error("Error posting story:", error);
    res.status(500).json({ message: "Something went wrong!", error: error.message });
  }
};






// Controller to get all stories with expanded user name and profileImage
export const getAllStories = async (req, res) => {
  try {
    // Fetch all stories, sorted by expiration time (ascending)
    const stories = await Story.find()
      .populate({
        path: 'user',
        select: 'name profileImage language',  // language bhi le lo
      })
      .sort({ expired_at: 1 });

    // Filter out stories where images and videos are empty but caption exists
    const filteredStories = stories.filter(story => {
      return (
        (story.caption && story.caption.trim() !== '') &&
        ((story.images && story.images.length > 0) || (story.videos && story.videos.length > 0))
      );
    });

    // Sirf user ka name translate karo according to their language
    for (let story of filteredStories) {
      if (story.user && story.user.language === 'hi') {
        // Agar user ki language Hindi hai to name translate karo
        story.user.name = await translateToHindi(story.user.name);
      }
      // Agar English hai to kuch mat karo
    }

    // Return exactly same structure as before
    res.status(200).json({
      message: "Stories fetched successfully!",
      stories: filteredStories
    });
    
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};


// ✅ Get user's all stories
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user and populate their stories
    const user = await User.findById(userId).populate('myStories');

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Filter stories: Keep only if images or videos are present
    const filteredStories = user.myStories.filter(story =>
      (story.images && story.images.length > 0) ||
      (story.videos && story.videos.length > 0)
    );

    // Return filtered stories
    res.status(200).json({
      message: "User's stories retrieved successfully!",
      stories: filteredStories,
    });
  } catch (error) {
    console.error("Error fetching user's stories:", error);
    res.status(500).json({ message: "Something went wrong!", error });
  }
};



// Report another user
export const reportUser = async (req, res) => {
  try {
    const { reporterId, reportedUserId } = req.params;

    if (!reporterId || !reportedUserId) {
      return res.status(400).json({ message: "Both reporterId and reportedUserId are required." });
    }

    if (reporterId === reportedUserId) {
      return res.status(400).json({ message: "You cannot report yourself." });
    }

    const reportedUser = await User.findById(reportedUserId);

    if (!reportedUser) {
      return res.status(404).json({ message: "Reported user not found." });
    }

    if (reportedUser.reportedBy?.includes(reporterId)) {
      return res.status(409).json({ message: "You have already reported this user." });
    }

    reportedUser.isReported = true;
    reportedUser.reportedBy.push(reporterId);

    await reportedUser.save();

    res.status(200).json({
      message: "User reported successfully.",
      reportedUserId: reportedUser._id,
      isReported: reportedUser.isReported,
    });

  } catch (error) {
    console.error("Error reporting user:", error);
    res.status(500).json({ message: "Failed to report user", error: error.message });
  }
};




export const deleteStory = async (req, res) => {
  try {
    const { userId, storyId } = req.params;
    const { mediaUrl } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found." });
    }

    // Check if the logged-in user owns this story
    if (story.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized." });
    }

    // Filter the media item out from both arrays
    const originalImagesLength = story.images.length;
    const originalVideosLength = story.videos.length;

    story.images = story.images.filter(url => url !== mediaUrl);
    story.videos = story.videos.filter(url => url !== mediaUrl);

    // If nothing was removed, media URL not found
    if (
      story.images.length === originalImagesLength &&
      story.videos.length === originalVideosLength
    ) {
      return res.status(404).json({ message: "Media item not found in story." });
    }

    await story.save();

    res.status(200).json({ message: "Media item deleted successfully." });
  } catch (error) {
    console.error("Error deleting media item:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};


// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_hNwWuDNHuEICmT',
//   key_secret: process.env.RAZORPAY_KEY_SECRET || 'haiixCtWn3RTXzUWAwZJSQjg'
// });


// Controller to handle the plan purchase
// 🔑 Initialize Razorpay (same structure as createBooking)

export const purchasePlan = async (req, res) => {
  try {
    const { userId, planId, transactionId } = req.body;

    // 1️⃣ Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Validate plan
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    let paymentStatus = "Pending";
    let razorpayPaymentId = null;
    let razorpayOrderId = null;

    // 3️⃣ If transaction already created by frontend
    if (transactionId) {
      let paymentInfo;
      try {
        paymentInfo = await razorpay.payments.fetch(transactionId);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid Razorpay payment ID",
          details: err.error || err,
        });
      }

      // 4️⃣ Capture payment if authorized
      if (paymentInfo.status === "authorized") {
        try {
          await razorpay.payments.capture(
            transactionId,
            Math.round(plan.offerPrice * 100),
            "INR"
          );
          paymentInfo = await razorpay.payments.fetch(transactionId);
        } catch (err) {
          return res.status(500).json({ message: "Payment capture failed" });
        }
      }

      // 5️⃣ Validate payment status
      if (paymentInfo.status !== "captured") {
        return res.status(400).json({
          success: false,
          message: `Payment not captured. Status: ${paymentInfo.status}`,
        });
      }

      paymentStatus = "Paid";
      razorpayPaymentId = transactionId;
      razorpayOrderId = paymentInfo.order_id || null;
    } else {
      // 6️⃣ Create Razorpay Order (if payment not initiated yet)
      const orderOptions = {
        amount: Math.round(plan.offerPrice * 100), // amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: userId.toString(),
          planId: planId.toString(),
          planName: plan.name,
        },
      };

      const order = await razorpay.orders.create(orderOptions);
      razorpayOrderId = order.id;
      paymentStatus = "Pending";
    }

    // 7️⃣ Prepare subscribed plan object
    const newSubscribedPlan = {
      planId: plan._id,
      name: plan.name,
      originalPrice: plan.originalPrice,
      offerPrice: plan.offerPrice,
      discountPercentage: plan.discountPercentage,
      duration: plan.duration,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year validity
      paymentStatus,
      razorpayPaymentId: razorpayPaymentId || null,
      razorpayOrderId: razorpayOrderId || null,
    };

    // 8️⃣ Save to user
    user.subscribedPlans.push(newSubscribedPlan);
    await user.save();

    await Notification.create({
  userId: user._id,
  title: "Plan Purchased",
  message: `You have successfully purchased the ${plan.name} plan.`
});

    // 9️⃣ Respond with details
    res.status(200).json({
      success: true,
      message:
        paymentStatus === "Paid"
          ? "✅ Plan purchased successfully!"
          : "✅ Razorpay order created successfully. Complete payment to activate your plan.",
      plan: newSubscribedPlan,
      razorpayKey: process.env.RAZORPAY_KEY_ID || "rzp_live_RTmw5UsY3ffNxq",
      razorpayOrderId,
      amount: plan.offerPrice,
      currency: "INR",
    });
  } catch (error) {
    console.error("Error in purchasePlan:", error);
    res.status(500).json({ message: "Error purchasing plan" });
  }
};


export const getSubscribedPlan = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const now = new Date();

    // ✅ Calculate 7-day trial from createdAt
    let trialExpiryDate = null;
    let free7DayTrial = false;

    if (user.createdAt) {
      const createdDate = new Date(user.createdAt);
      const expiryDate = new Date(createdDate);
      expiryDate.setDate(expiryDate.getDate() + 7);

      trialExpiryDate = expiryDate;
      free7DayTrial = now <= expiryDate;
    }

    // ✅ Process subscribed plans (no extra DB call)
    const subscribedPlans = (user.subscribedPlans || []).map((planEntry) => {
      const startDate = new Date(planEntry.startDate);
      const endDate = new Date(planEntry.endDate);

      return {
        id: planEntry.planId,
        name: planEntry.name,
        originalPrice: planEntry.originalPrice,
        offerPrice: planEntry.offerPrice,
        discountPercentage: planEntry.discountPercentage,
        duration: planEntry.duration,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isPurchasedPlan: true,
        isActive: endDate >= now,
      };
    });

    const hasActivePlan = subscribedPlans.some(plan => plan.isActive);

    // ✅ Auto sync subscription flag
    if (user.isSubscribedPlan !== hasActivePlan) {
      user.isSubscribedPlan = hasActivePlan;
      await user.save();
    }

    // ✅ SAME RESPONSE STRUCTURE
    return res.status(200).json({
      success: true,
      message: "Subscribed plans fetched successfully",
      isSubscribedPlan: hasActivePlan,
      free7DayTrial,
      trialExpiryDate: trialExpiryDate
        ? trialExpiryDate.toISOString()
        : null,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      subscribedPlans,
    });

  } catch (error) {
    console.error("Get Subscribed Plans Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



export const addCustomerToUser = async (req, res) => {
  try {
    const { customer } = req.body;
    const { userId } = req.params;

    if (!userId || !customer) {
      return res.status(400).json({
        message: "User ID and customer details are required!"
      });
    }

    customer.religion = customer.religion || null;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }

    // Add customer
    user.customers.push(customer);

    await user.save();

    // 🔔 Create Notification
    await Notification.create({
      userId: user._id,
      title: "Customer Added",
      message: `Customer ${customer.name || "New Customer"} added successfully.`
    });

    return res.status(200).json({
      message: "Customer added successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        dob: user.dob,
        marriageAnniversaryDate: user.marriageAnniversaryDate,
        customers: user.customers,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: "Server error"
    });

  }
};

// Get all customers for a specific user by userId
export const getAllCustomersForUser = async (req, res) => {
  try {
    const { userId } = req.params;  // Get userId from URL params

    // Validate if userId is provided
    if (!userId) {
      const errorMsg = req.query?.lang === 'hi' 
        ? 'उपयोगकर्ता आईडी आवश्यक है!'
        : 'User ID is required!';
      return res.status(400).json({ message: errorMsg });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      const errorMsg = req.query?.lang === 'hi'
        ? 'उपयोगकर्ता नहीं मिला!'
        : 'User not found!';
      return res.status(404).json({ message: errorMsg });
    }

    // Check user's language preference
    const userLanguage = user.language || 'en';

    // Translate customer names if language is Hindi
    let translatedCustomers = user.customers || [];
    
    if (userLanguage === 'hi' && translatedCustomers.length > 0) {
      // Translate each customer's name to Hindi
      translatedCustomers = await Promise.all(
        translatedCustomers.map(async (customer) => {
          const customerObj = customer.toObject ? customer.toObject() : { ...customer };
          
          if (customerObj.name) {
            customerObj.name = await translateToHindi(customerObj.name);
          }
          
          return customerObj;
        })
      );
    }

    const successMsg = userLanguage === 'hi'
      ? 'ग्राहक सफलतापूर्वक प्राप्त हुए!'
      : 'Customers fetched successfully!';

    // Return the customers array from the user document
    return res.status(200).json({
      message: successMsg,
      customers: translatedCustomers,  // Return translated customers array
      count: translatedCustomers.length
    });
    
  } catch (error) {
    console.error(error);
    
    const errorMsg = req.query?.lang === 'hi'
      ? 'सर्वर त्रुटि'
      : 'Server error';
      
    return res.status(500).json({ message: errorMsg });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    const updates = req.body.customer; // ✅ Fix here

    if (!userId || !customerId || !updates) {
      return res.status(400).json({ message: 'User ID, Customer ID, and update data are required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const customer = user.customers.id(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // ✅ Apply updates (Including the new 'religion' field)
    if (updates.name) customer.name = updates.name;
    if (updates.email) customer.email = updates.email;
    if (updates.mobile) customer.mobile = updates.mobile;
    if (updates.address) customer.address = updates.address;
    if (updates.gender) customer.gender = updates.gender;
    if (updates.dob) customer.dob = new Date(updates.dob);
    if (updates.anniversaryDate) customer.anniversaryDate = new Date(updates.anniversaryDate);
    if (updates.religion) customer.religion = updates.religion; // Add this line for religion

    await user.save(); // ✅ Persist changes

    return res.status(200).json({
      message: 'Customer updated successfully!',
      customer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};





export const deleteCustomer = async (req, res) => {
  try {
    const { userId, customerId } = req.params;

    console.log(`Attempting to delete customer with ID: ${customerId}`);

    if (!userId || !customerId) {
      return res.status(400).json({
        message: "User ID and Customer ID are required!"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found!"
      });
    }

    const customerIndex = user.customers.findIndex(
      customer => customer._id.toString() === customerId
    );

    console.log(`Customer index: ${customerIndex}`);

    if (customerIndex === -1) {
      return res.status(404).json({
        message: "Customer not found!"
      });
    }

    // Save customer name before deleting
    const deletedCustomer = user.customers[customerIndex];

    // Remove customer
    user.customers.splice(customerIndex, 1);

    await user.save();

    // 🔔 Create Notification
    await Notification.create({
      userId: user._id,
      title: "Customer Deleted",
      message: `Customer ${deletedCustomer.name || "Customer"} deleted successfully.`
    });

    return res.status(200).json({
      message: "Customer deleted successfully!",
      customers: user.customers
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: "Server error"
    });

  }
};



// Function to send birthday wishes
export const sendBirthdayWishesToCustomers = async (req, res) => {
  try {
    // Get today's date (Only day and month)
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];  // Format as yyyy-mm-dd

    // Fetch all users and loop through their customers
    const users = await User.find();

    users.forEach(user => {
      user.customers.forEach(customer => {
        const customerDOB = new Date(customer.dob);
        const customerBirthday = customerDOB.toISOString().split('T')[0];  // Format as yyyy-mm-dd

        // Check if today is the customer's birthday
        if (todayDate === customerBirthday) {
          const message = `Happy Birthday, ${customer.name}! Wishing you a wonderful day.`;
          SendSms(customer.mobile, message);
        }
      });
    });

    res.status(200).json({ message: 'Birthday wishes sent successfully!' });
  } catch (error) {
    console.error('Error sending birthday wishes:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to send anniversary wishes
export const sendAnniversaryWishes = async (req, res) => {
  try {
    // Get today's date (Only day and month)
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];  // Format as yyyy-mm-dd

    // Fetch all users and loop through their customers
    const users = await User.find();

    users.forEach(user => {
      user.customers.forEach(customer => {
        const customerAnniversaryDate = new Date(customer.anniversaryDate);
        const customerAnniversary = customerAnniversaryDate.toISOString().split('T')[0];  // Format as yyyy-mm-dd

        // Check if today is the customer's anniversary
        if (todayDate === customerAnniversary) {
          const message = `Happy Anniversary, ${customer.name}! Wishing you many more years of happiness.`;
          SendSms(customer.mobile, message);
        }
      });
    });

    res.status(200).json({ message: 'Anniversary wishes sent successfully!' });
  } catch (error) {
    console.error('Error sending anniversary wishes:', error);
    res.status(500).json({ message: 'Server error' });
  }
}



export const buyPoster = async (req, res) => {
  try {
    const { userId, posterId, businessPosterId, quantity } = req.body;

    if (!userId || (!posterId && !businessPosterId) || !quantity) {
      return res.status(400).json({
        message: 'userId, posterId or businessPosterId, and quantity are required.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if it's a regular poster or business poster
    let poster = null;
    let posterType = '';

    if (posterId) {
      poster = await Poster.findById(posterId);
      posterType = 'Poster';
    } else if (businessPosterId) {
      poster = await BusinessPoster.findById(businessPosterId);
      posterType = 'BusinessPoster';
    }

    if (!poster) {
      return res.status(404).json({ message: `${posterType || 'Poster'} not found.` });
    }

    if (!poster.inStock) {
      return res.status(400).json({ message: `${posterType} is out of stock.` });
    }

    const now = new Date();
    const hasActivePlan = user.subscribedPlans?.some(plan =>
      plan.startDate <= now && plan.endDate >= now
    );

    const totalAmount = hasActivePlan ? 0 : poster.price * quantity;

    const newOrder = new Order({
      user: user._id,
      poster: posterId || undefined,
      businessPoster: businessPosterId || undefined,
      quantity,
      totalAmount,
      status: 'Pending',
      orderDate: now
    });

    await newOrder.save();

    // Add order to user's bookings
    user.myBookings.push(newOrder._id);
    await user.save();

    return res.status(201).json({
      message: hasActivePlan
        ? `${posterType} ordered for free with active subscription.`
        : `${posterType} order placed successfully.`,
      order: newOrder
    });

  } catch (error) {
    console.error('Error in buyPoster:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const checkoutOrder = async (req, res) => {
  try {
    const { userId, orderId, paymentMethod } = req.body;

    // ✅ Admin's fixed UPI ID (updated to the required UPI ID)
    const adminUpiId = 'nishasinghvi143@okicici';

    // Validate required fields
    if (!userId || !orderId) {
      return res.status(400).json({ message: 'userId and orderId are required.' });
    }

    const user = await User.findById(userId);
    const order = await Order.findById(orderId).populate('poster');

    if (!user || !order) {
      return res.status(404).json({ message: 'User or Order not found.' });
    }

    if (String(order.user) !== String(user._id)) {
      return res.status(403).json({ message: 'Order does not belong to this user.' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Order is not in a pending state.' });
    }

    // ✅ Generate UPI deep link for manual payment (if required)
    if (order.totalAmount > 0) {
      if (!paymentMethod) {
        return res.status(400).json({ message: 'paymentMethod is required for paid orders.' });
      }

      const upiLink = `upi://pay?pa=${adminUpiId}&pn=Juleep%20Admin&am=${order.totalAmount}&cu=INR`;

      return res.status(200).json({
        message: 'Please complete payment via your UPI app.',
        upiApp: paymentMethod,
        upiId: adminUpiId,  // Adding UPI ID to the response
        amount: order.totalAmount,
        upiLink, // Frontend can open this link to launch UPI app
        note: 'Click the link to open in PhonePe, Google Pay, etc. After payment, confirm manually.'
      });
    }

    // Free order — mark as completed immediately
    order.status = 'Completed';
    order.paymentDetails = {
      method: 'UPI',
      paymentDate: new Date()
    };
    await order.save();

    return res.status(200).json({
      message: 'Order completed using free subscription plan.',
      order
    });

  } catch (error) {
    console.error('Error in checkoutOrder:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




export const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const orders = await Order.find({ user: userId })
      .populate('poster', 'name price');

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Error in getOrdersByUserId:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')     // optional: populate user info
      .populate('poster', 'name price');  // optional: populate poster info

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Update order status by ID
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    )
      .populate('user', 'name email')
      .populate('poster', 'name price');

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order status updated", order: updatedOrder });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Delete order by ID
export const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error('Error in deleteOrder:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




export const showBirthdayWishOrCountdown = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      const errorMsg = user?.language === 'hi' 
        ? 'उपयोगकर्ता नहीं मिला' 
        : 'User not found';
      return res.status(404).json({ message: errorMsg });
    }

    const today = dayjs();
    const userLanguage = user.language || 'en';
    
    let displayName = user.name || 'User';
    if (userLanguage === 'hi') {
      displayName = await translateToHindi(displayName);
    }
    
    const wishes = [];

    // ===== 🎂 Birthday Handling =====
    if (user.dob) {

      const birthDate = parseFlexibleDate(user.dob);  // 🔥 FIX HERE

      if (birthDate && birthDate.isValid()) {

        let nextBirthday = birthDate.year(today.year());

        if (nextBirthday.isBefore(today, 'day')) {
          nextBirthday = nextBirthday.add(1, 'year');
        }

        const isBirthdayToday = nextBirthday.format('MM-DD') === today.format('MM-DD');

        if (isBirthdayToday && today.hour() === 0) {
          wishes.push(userLanguage === 'hi' 
            ? `🎉 रात 12 बज गए — जन्मदिन मुबारक हो, ${displayName}! आपका दिन खुशियों से भरा हो।`
            : `🎉 It's 12:00 AM — Happy Birthday, ${displayName}! May your day be filled with happiness.`);
        } else if (isBirthdayToday) {
          wishes.push(userLanguage === 'hi'
            ? `🎉 जन्मदिन मुबारक हो, ${displayName}! आपको खुशी और प्यार मिले।`
            : `🎉 Happy Birthday, ${displayName}! Wishing you joy and love.`);
        } else {
          const daysLeft = nextBirthday.diff(today, 'day');
          wishes.push(userLanguage === 'hi'
            ? `🎂 ${displayName}, आपका जन्मदिन ${daysLeft} दिन में है ${nextBirthday.format('MMMM DD')} को।`
            : `🎂 ${displayName}, your birthday is in ${daysLeft} day(s) on ${nextBirthday.format('MMMM DD')}.`);
        }

      } else {
        wishes.push(userLanguage === 'hi'
          ? `⚠️ ${displayName} के लिए DOB फॉर्मेट गलत है`
          : `⚠️ Invalid DOB format for ${displayName}`);
      }

    } else {
      wishes.push(userLanguage === 'hi'
        ? `${displayName} के लिए DOB नहीं मिला`
        : `DOB not found for ${displayName}`);
    }

    // ===== 💍 Anniversary Handling =====
    if (user.marriageAnniversaryDate) {

      const anniversaryDate = parseFlexibleDate(user.marriageAnniversaryDate); // 🔥 FIX HERE

      if (anniversaryDate && anniversaryDate.isValid()) {

        let nextAnniversary = anniversaryDate.year(today.year());

        if (nextAnniversary.isBefore(today, 'day')) {
          nextAnniversary = nextAnniversary.add(1, 'year');
        }

        const isAnniversaryToday = nextAnniversary.format('MM-DD') === today.format('MM-DD');

        if (isAnniversaryToday && today.hour() === 0) {
          wishes.push(userLanguage === 'hi'
            ? `💖 रात 12 बज गए — सालगिरह मुबारक हो, ${displayName}! आपको प्यार और खुशियाँ मिलें।`
            : `💖 It's 12:00 AM — Happy Anniversary, ${displayName}! Wishing you love and happiness.`);
        } else if (isAnniversaryToday) {
          wishes.push(userLanguage === 'hi'
            ? `💖 सालगिरह मुबारक हो, ${displayName}! आपकी खूबसूरत यात्रा की शुभकामनाएं।`
            : `💖 Happy Anniversary, ${displayName}! Cheers to your beautiful journey together.`);
        } else {
          const daysLeft = nextAnniversary.diff(today, 'day');
          wishes.push(userLanguage === 'hi'
            ? `💍 ${displayName}, आपकी सालगिरह ${daysLeft} दिन में है ${nextAnniversary.format('MMMM DD')} को।`
            : `💍 ${displayName}, your anniversary is in ${daysLeft} day(s) on ${nextAnniversary.format('MMMM DD')}.`);
        }

      } else {
        wishes.push(userLanguage === 'hi'
          ? `⚠️ ${displayName} के लिए Anniversary फॉर्मेट गलत है`
          : `⚠️ Invalid Anniversary date format for ${displayName}`);
      }
    }

    const responseMessage = userLanguage === 'hi'
      ? 'जन्मदिन और/या सालगिरह की शुभकामनाएं या काउंटडाउन'
      : 'Birthday and/or Anniversary wish or countdown';

    res.json({
      message: responseMessage,
      wishes,
    });

  } catch (error) {
    console.error('Error:', error);
    
    const userLanguage = req.user?.language || 'en';
    const errorMsg = userLanguage === 'hi'
      ? 'कुछ गलत हो गया'
      : 'Something went wrong';
      
    res.status(500).json({ error: errorMsg });
  }
};
export const getReferralCodeByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user || !user.referralCode) {
      return res.status(404).json({ message: 'Referral code not found.' });
    }

    return res.status(200).json({
      referralCode: user.referralCode
    });
  } catch (error) {
    console.error('Error fetching referral code:', error);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};



export const getUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      wallet: user.wallet || 0,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Setup Nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'pms226803@gmail.com', // Your email address
    pass: 'nras bifq xsxz urrm', // Use your app password here
  },
  tls: {
    rejectUnauthorized: false, // Allow insecure connections (for debugging)
  },
  connectionTimeout: 10000, // Increase connection timeout to 10 seconds
  greetingTimeout: 10000,    // Increase greeting timeout to 10 seconds
  socketTimeout: 10000,      // Increase socket timeout to 10 seconds
});

export const deleteAccount = async (req, res) => {
  const { email, reason } = req.body;

  // Validate email and reason
  if (!email || !reason) {
    return res.status(400).json({ message: 'Email and reason are required' });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a unique token for account deletion
    const token = crypto.randomBytes(20).toString('hex');
    const deleteLink = `${process.env.BASE_URL}/confirm-delete-account/${token}`;

    // Set the deleteToken and deleteTokenExpiration
    user.deleteToken = token;
    user.deleteTokenExpiration = Date.now() + 3600000;  // Token expires in 1 hour

    // Log the user object before saving
    console.log('User before saving:', user);

    // Save the token and expiration time to the database
    await user.save();  // This should now save the user along with the deleteToken and deleteTokenExpiration

    // Log after saving to confirm
    console.log('User after saving:', user);

    // Send the confirmation email
    const mailOptions = {
      from: 'pms226803@gmail.com',
      to: email,
      subject: 'Account Deletion Request Received',
      text: `Hi ${user.name},\n\nWe have received your account deletion request. To confirm the deletion of your account, please click the link below:\n\n${deleteLink}\n\nReason: ${reason}\n\nIf you have any questions or need further assistance, please feel free to contact us at businessbadavo@gmail.com.\n\nBest regards,\nPOSTERNOVA Team`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: 'Account deletion request has been processed.We are send mail shortly.Please check your email and confirm the link to delete.',
      token: token // Send the token in the response
    });
  } catch (err) {
    console.error('Error in deleteAccount:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


export const confirmDeleteAccount = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      deleteToken: token,
      deleteTokenExpiration: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.status(200).json({
        message: 'Your account has been successfully deleted.',
      });
    }

    // Token is valid, delete the user account
    await User.deleteOne({ _id: user._id });

    return res.status(200).json({
      message: 'Your account has been successfully deleted.',
    });

  } catch (err) {
    console.error('Error in confirmDeleteAccount:', err);

    return res.status(200).json({
      message: 'Your account has been successfully deleted.',
    });
  }
};




export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if user exists
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};


export const addContactUs = async (req, res) => {
  try {
    const userId = req.params.userId;  // Get the userId from the URL parameter
    const { name, email, phone, message } = req.body;

    // Create a new contact message
    const newContactUs = new ContactUs({
      userId,
      name,
      email,
      phone,
      message,
    });

    // Save the contact message to the database
    await newContactUs.save();

    res.status(201).json({
      message: 'Thank you for reaching out! We have received your details and will connect with you shortly.',
      contactUs: newContactUs,
    });
  } catch (error) {
    console.error('Error adding Contact Us message:', error);
    res.status(500).json({ message: 'Something went wrong while adding message!' });
  }
};



export const addWebsiteContact = async (req, res) => {
  try {
    const { name, email, message, requestPoster } = req.body;

    // Create a new website contact message
    const newWebsiteContact = new ContactUs({
      name,
      email,
      message,
      requestPoster, // This should be a boolean (true/false)
    });

    // Save to DB
    await newWebsiteContact.save();

    res.status(201).json({
      message: 'Thank you for contacting us! We’ll get back to you as soon as possible.',
      contact: newWebsiteContact,
    });
  } catch (error) {
    console.error('Error adding website contact message:', error);
    res.status(500).json({ message: 'Something went wrong while submitting the form!' });
  }
};


export const getAllContactUs = async (req, res) => {
  try {
    // Fetch all contact messages from the database
    const contactMessages = await ContactUs.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Contact Us messages fetched successfully!',
      contactUsMessages: contactMessages,
    });
  } catch (error) {
    console.error('Error fetching Contact Us messages:', error);
    res.status(500).json({ message: 'Something went wrong while fetching messages!' });
  }
};


export const getHoroscopeBySign = async (req, res) => {
  const { sign } = req.query;

  if (!sign) {
    return res.status(400).json({ message: "Zodiac sign is required." });
  }

  try {
    const url = `https://www.ganeshaspeaks.com/horoscopes/daily-horoscope/${sign.toLowerCase()}/`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; server-side-scraper)'
      }
    });

    const $ = cheerio.load(data);

    // From inspecting the page, the horoscope text is inside <div class="horoscope-content">
    // or inside <div class="article-body"> etc. Adjust selector accordingly.

    const horoscopeText = $('.horoscope-content p').text().trim();

    if (!horoscopeText) {
      return res.status(404).json({ message: "Horoscope not found for this sign." });
    }

    return res.status(200).json({
      sign: sign.toLowerCase(),
      date: new Date().toISOString().slice(0, 10),
      horoscope: horoscopeText
    });

  } catch (error) {
    console.error("Error fetching horoscope:", error.message);
    return res.status(500).json({ message: "Failed to fetch horoscope." });
  }
};
// ✅ User requests wallet redemption using userId from params
export const requestWalletRedemption = async (req, res) => {
  try {
    const { userId } = req.params; // ✅ userId from URL
    const { accountHolderName, accountNumber, ifscCode, bankName, upiId } = req.body; // Get upiId from body

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user has sufficient wallet balance
    if (user.wallet <= 0) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Create new redemption request
    const redemption = new WalletRedemption({
      user: userId,
      amount: user.wallet,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      upiId,  // Add upiId here
      status: 'Pending',  // Default status
    });

    // Save redemption to the database
    await redemption.save();

    // Update user wallet balance after redemption (Optional)
    user.wallet = 0;  // Assuming you want to deduct the full wallet balance after redemption request
    await user.save();

    // Send success response with redemption details
    return res.status(201).json({ message: "Redemption request submitted", redemption });
  } catch (err) {
    console.error("Wallet redemption error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// ✅ Save User History
export const saveUserHistory = async (req, res) => {
  try {
    const { userId, logoId } = req.body;

    if (!userId || !logoId) {
      return res.status(400).json({
        message: "userId and logoId are required",
      });
    }

    if (!req.files || !req.files.editedImage) {
      return res.status(400).json({
        message: "Edited logo image is required",
      });
    }

    const file = req.files.editedImage;

    // Upload edited image to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "user-edited-logos",
    });

    const editedImage = result.secure_url;

    const history = new UserHistory({
      userId,
      logoId,
      editedImage,
    });

    const savedHistory = await history.save();

    res.status(201).json(savedHistory);
  } catch (error) {
    console.error("Error saving user history:", error);
    res.status(500).json({
      message: "Error saving user history",
      error: error.message,
    });
  }
};



// ✅ Get User History
export const getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Pehle user find karo
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // History fetch karo
    const history = await UserHistory.find({ userId })
      .populate("logoId", "name image price")
      .sort({ createdAt: -1 });

    // User ki language check karo
    const userLanguage = user.language || 'en';
    
    // Translate user name to Hindi if needed
    let displayName = user.name;
    if (userLanguage === 'hi') {
      displayName = await translateToHindi(user.name);
    }

    // Response mein user details bhi include karo
    res.status(200).json({
      success: true,
      message: userLanguage === 'hi' 
        ? 'उपयोगकर्ता इतिहास सफलतापूर्वक प्राप्त हुआ'
        : 'User history fetched successfully',
      user: {
        id: user._id,
        name: displayName,  // Translated name if Hindi user
        email: user.email,
        mobile: user.mobile,
        language: user.language || 'en'
      },
      history: history.map(item => {
        // Logo name bhi translate karo agar logoId hai aur user Hindi hai
        if (userLanguage === 'hi' && item.logoId && item.logoId.name) {
          return {
            ...item.toObject(),
            logoId: {
              ...item.logoId.toObject(),
              name: translateToHindiSync(item.logoId.name) // Sync version for map
            }
          };
        }
        return item;
      }),
      totalCount: history.length
    });

  } catch (error) {
    console.error("Error fetching user history:", error);
    
    // Error message in both languages
    const errorMessages = {
      en: { message: "Error fetching user history" },
      hi: { message: "उपयोगकर्ता इतिहास प्राप्त करने में त्रुटि" }
    };
    
    const userLanguage = req.user?.language || 'en';
    
    res.status(500).json({
      success: false,
      message: errorMessages[userLanguage]?.message || errorMessages.en.message,
      error: error.message,
    });
  }
};


export const getAllReels = async (req, res) => {
  try {
    const { userId } = req.params; // sirf receive kar rahe hain

    console.log("UserId:", userId);

    // ✅ Fetch only hotTop: false
    const reels = await Reel.find({ hotTop: false }).sort({ createdAt: -1 });

    res.status(200).json({
      userId,
      reels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({
      message: "Error fetching reels",
      error: error.message,
    });
  }
};



export const getAllHotTopReels = async (req, res) => {
  try {
    const { userId } = req.params; // sirf receive kar rahe hain
    console.log("UserId:", userId);

    // ✅ Fetch user info
    const user = await User.findById(userId).select('name email mobile');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Fetch only hotTop: true reels
    const reels = await Reel.find({ hotTop: true }).sort({ createdAt: -1 });

    // ✅ Embed user info in each reel
    const reelsWithUser = reels.map(reel => ({
      ...reel.toObject(), // convert Mongoose doc to plain object
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    }));

    res.status(200).json({
      reels: reelsWithUser
    });

  } catch (error) {
    console.error("Error fetching HotTop reels:", error);
    res.status(500).json({
      message: "Error fetching HotTop reels",
      error: error.message,
    });
  }
};



export const likeReel = async (req, res) => {
  try {
    const { reelId, userId } = req.params;

    if (!reelId) {
      return res.status(400).json({ message: "ReelId is required" });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Agar already liked nahi hai to like kare
    if (!reel.isLiked) {
      reel.likeCount += 1;
      reel.isLiked = true;

      // 🔔 Notification add
      await Notification.create({
        userId,
        title: "Reel Liked",
        message: `You liked the reel "${reel.title || "Untitled"}" successfully.`
      });
    }

    await reel.save();

    res.status(200).json({
      message: "Reel liked successfully",
      userId,
      reel,
    });

  } catch (error) {
    console.error("Error liking reel:", error);
    res.status(500).json({
      message: "Error liking reel",
      error: error.message,
    });
  }
};

export const unlikeReel = async (req, res) => {
  try {
    const { reelId, userId } = req.params;

    if (!reelId) {
      return res.status(400).json({ message: "ReelId is required" });
    }

    const reel = await Reel.findById(reelId);

    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Agar currently liked hai tabhi unlike karein
    if (reel.isLiked) {
      reel.likeCount = Math.max((reel.likeCount || 1) - 1, 0); // likeCount 0 se neeche na jaaye
      reel.isLiked = false;

      // 🔔 Notification
      await Notification.create({
        userId,
        title: "Reel Unliked",
        message: `You unliked the reel "${reel.title || "Untitled"}".`
      });
    }

    await reel.save();

    res.status(200).json({
      message: "Reel unliked successfully",
      userId,
      reel,
    });
  } catch (error) {
    console.error("Error unliking reel:", error);
    res.status(500).json({
      message: "Error unliking reel",
      error: error.message,
    });
  }
};



// export const getPanchang = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { year, month, date, location } = req.body;

//     // 1️⃣ Validate inputs
//     if (!userId || !year || !month || !date || !location) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // 2️⃣ Fetch user from DB
//     const user = await User.findById(userId).select("name dob email mobile");
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // 3️⃣ Geocode location using OpenStreetMap
//     const geoRes = await fetch(
//       `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
//     );
//     const geoData = await geoRes.json();

//     if (!geoData || geoData.length === 0) {
//       return res.status(400).json({ message: "Invalid location or unable to geocode" });
//     }

//     const latitude = geoData[0].lat;
//     const longitude = geoData[0].lon;

//     // 4️⃣ Prepare datetime for API (12:00 IST = 6:30 UTC)
//     const dateObj = new Date(Date.UTC(year, month - 1, date, 6, 30));
//     const datetime = dateObj.toISOString();

//     // 5️⃣ Generate Prokerala API token
//     const tokenResponse = await fetch("https://api.prokerala.com/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({
//         client_id: "d66400ca-5ee0-4ad7-8150-7ebe826f7e71",
//         client_secret: "cW3hBFmr01ZDfDTUkONeqe6k5vGSXUKfJKuA3bqJ",
//         grant_type: "client_credentials",
//       }),
//     });

//     const tokenData = await tokenResponse.json();
//     if (!tokenData.access_token) {
//       return res.status(500).json({ message: "Token generation failed" });
//     }

//     // 6️⃣ Call Panchang API
//     const url = `https://api.prokerala.com/v2/astrology/panchang?ayanamsa=1&coordinates=${latitude},${longitude}&datetime=${datetime}&la=en`;
//     const response = await fetch(url, {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`,
//         "Content-Type": "application/json",
//       },
//     });

//     const apiResult = await response.json();
//     if (!apiResult || !apiResult.data) {
//       console.log("API Response:", apiResult);
//       return res.status(500).json({ message: "Panchang data not found from API" });
//     }

//     const data = apiResult.data;

//     // 7️⃣ Telugu mappings
//     const maps = {
//       tithi: {
//         Pratipada: "ప్రతిపద",
//         Dvitiiya: "ద్వితీయ",
//         Tritiiya: "తృతీయ",
//         Chaturthi: "చతుర్థి",
//         Panchami: "పంచమి",
//         Shashthi: "షష్ఠి",
//         Saptami: "సప్తమి",
//         Ashtami: "అష్టమి",
//         Navami: "నవమి",
//         Dashami: "దశమి",
//         Ekadashi: "ఏకాదశి",
//         Dvadashi: " ద్వాదశి",
//         Trayodashi: "త్రయోదశి",
//         Chaturdashi: "చతుర్దశి",
//         Purnima: "పౌర్ణమి",
//         Amavasya: "అమావాస్య",
//       },
//       nakshatra: {
//         Ashwini: "అశ్విని",
//         Bharani: "భరణి",
//         Krittika: "కృత్తిక",
//         Rohini: "రోహిణి",
//         Mrigashirsha: "మృగశిర",
//         Ardra: "ఆర్ద్ర",
//         Punarvasu: "పునర్వసు",
//         Pushyami: "పుష్యమి",
//         Ashlesha: "ఆశ్లేష",
//         Magha: "మఖ",
//         PurvaPhalguni: "పూర్వ ఫల్గుణి",
//         UttaraPhalguni: "ఉత్తర ఫల్గుణి",
//         Hasta: "హస్త",
//         Chitta: "చిత్త",
//         Swati: "స్వాతి",
//         Vishakha: "విశాఖ",
//         Anuradha: "అనూరాధ",
//         Jyeshtha: "జ్యేష్ఠ",
//         Mula: "మూల",
//         Purvashadha: "పూర్వాషాఢ",
//         Uttarashada: "ఉత్తరాషాఢ",
//         Shravana: "శ్రవణం",
//         Dhanishta: "ధనిష్ఠ",
//         Shatabhisha: "శతభిష",
//         Purvabhadra: "పూర్వాభాద్ర",
//         Uttarabhadra: "ఉత్తరాభాద్ర",
//         Revati: "రేవతి",
//       },
//       yoga: {
//         Subha: "శుభ",
//         Sukla: "శుక్ల",
//         Shubha: "శుభ",
//       },
//       karana: {
//         Kaulava: "కౌలవ",
//         Taitila: "తైతిల",
//         Garija: "గరిజ",
//       },
//       vaara: {
//         Monday: "సోమవారం",
//         Tuesday: "మంగళవారం",
//         Wednesday: "బుధవారం",
//         Thursday: "గురువారం",
//         Friday: "శుక్రవారం",
//         Saturday: "శనివారం",
//         Sunday: "ఆదివారం",
//       },
//     };

//     // 8️⃣ Recursive translation to Telugu
//     const translate = (obj) => {
//       if (Array.isArray(obj)) return obj.map(translate);
//       if (obj && typeof obj === "object") {
//         const out = {};
//         for (let k in obj) {
//           if (k === "name") {
//             out[k] =
//               maps.tithi[obj[k]] ||
//               maps.nakshatra[obj[k]] ||
//               maps.yoga[obj[k]] ||
//               maps.karana[obj[k]] ||
//               obj[k];
//           } else if (k === "vaara") {
//             out[k] = maps.vaara[obj[k]] || obj[k];
//           } else {
//             out[k] = translate(obj[k]);
//           }
//         }
//         return out;
//       }
//       return obj;
//     };

//     // 9️⃣ Send final response
//     res.status(200).json({
//       status: "ok",
//       user: {
//         name: user.name,
//         email: user.email,
//         mobile: user.mobile,
//         dob: user.dob,
//       },
//       location,
//       data: translate(data),
//     });
//   } catch (error) {
//     console.error("Server Error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };



// ============================================
// HINDI CONSTANTS
// ============================================
// ============================================
// HINDI CONSTANTS
// ============================================
export const TITHI_HINDI = [
  "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी",
  "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी",
  "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "पूर्णिमा",
  "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी",
  "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी",
  "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "अमावस्या"
];

export const NAKSHATRA_HINDI = [
  "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा",
  "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा",
  "मघा", "पूर्व फाल्गुनी", "उत्तर फाल्गुनी",
  "हस्त", "चित्रा", "स्वाती", "विशाखा",
  "अनुराधा", "ज्येष्ठा", "मूल",
  "पूर्वाषाढ़ा", "उत्तराषाढ़ा",
  "श्रवण", "धनिष्ठा", "शतभिषा",
  "पूर्व भाद्रपद", "उत्तर भाद्रपद", "रेवती"
];

export const VAARA_HINDI = [
  "रविवार", "सोमवार", "मंगलवार",
  "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"
];

export const KARANA_HINDI = [
  "कौलव", "तैतिल", "गरिज", "विष्टि", "बव", "बालव", "शकुनि", "चतुष्पद"
];

export const YOGA_HINDI = [
  "विष्कुम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा", "धृति", "शूल",
  "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र", "सिद्धि", "व्यतीपात", "वरीयान", "परिघ",
  "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल", "ब्रह्म", "इन्द्र", "वैधृति"
];

// ============================================
// ENGLISH CONSTANTS
// ============================================
export const TITHI_ENGLISH = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya"
];

export const NAKSHATRA_ENGLISH = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
  "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha",
  "Anuradha", "Jyeshtha", "Mula",
  "Purva Ashadha", "Uttara Ashadha",
  "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

export const VAARA_ENGLISH = [
  "Sunday", "Monday", "Tuesday",
  "Wednesday", "Thursday", "Friday", "Saturday"
];

export const KARANA_ENGLISH = [
  "Kaulava", "Taitila", "Garaja", "Vishti", "Bava", "Balava", "Shakuni", "Chatushpada"
];

export const YOGA_ENGLISH = [
  "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula",
  "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha",
  "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"
];

// ============================================
// TELUGU CONSTANTS
// ============================================
export const TITHI_TELUGU = [
  "ప్రతిపద", "ద్వితీయ", "తృతీయ", "చతుర్థి", "పంచమి",
  "షష్ఠి", "సప్తమి", "అష్టమి", "నవమి", "దశమి",
  "ఏకాదశి", "ద్వాదశి", "త్రయోదశి", "చతుర్దశి", "పౌర్ణమి",
  "ప్రతిపద", "ద్వితీయ", "తృతీయ", "చతుర్థి", "పంచమి",
  "షష్ఠి", "సప్తమి", "అష్టమి", "నవమి", "దశమి",
  "ఏకాదశి", "ద్వాదశి", "త్రయోదశి", "చతుర్దశి", "అమావాస్య"
];

export const NAKSHATRA_TELUGU = [
  "అశ్విని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర",
  "ఆర్ద్ర", "పునర్వసు", "పుష్యమి", "ఆశ్లేష",
  "మఘ", "పూర్వ ఫాల్గుణి", "ఉత్తర ఫాల్గుణి",
  "హస్త", "చిత్త", "స్వాతి", "విశాఖ",
  "అనూరాధ", "జ్యేష్ఠ", "మూల",
  "పూర్వాషాఢ", "ఉత్తరాషాఢ",
  "శ్రవణ", "ధనిష్ఠ", "శతభిష",
  "పూర్వాభాద్ర", "ఉత్తరాభాద్ర", "రేవతి"
];

export const VAARA_TELUGU = [
  "ఆదివారం", "సోమవారం", "మంగళవారం", 
  "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం"
];

export const KARANA_TELUGU = [
  "కౌలవ", "తైతిల", "గరిజ", "విష్టి", "బవ", "బాలవ", "శకుని", "చతుష్పాద"
];

export const YOGA_TELUGU = [
  "విష్కుంభ", "ప్రీతి", "ఆయుష్మాన్", "సౌభాగ్య", "శోభన", "అతిగండ", "సుకర్మ", "ధృతి", "శూల",
  "గండ", "వృద్ధి", "ధ్రువ", "వ్యాఘాత", "హర్షణ", "వజ్ర", "సిద్ధి", "వ్యతీపాత", "వరియాన్", "పరిఘ",
  "శివ", "సిద్ధ", "సాధ్య", "శుభ", "శుక్ల", "బ్రహ్మ", "ఇంద్ర", "వైధృతి"
];

// ============================================
// PAKSHA TRANSLATIONS
// ============================================
const PAKSHA = {
  en: {
    shukla: "Shukla Paksha",
    krishna: "Krishna Paksha"
  },
  hi: {
    shukla: "शुक्ल पक्ष",
    krishna: "कृष्ण पक्ष"
  },
  te: {
    shukla: "శుక్ల పక్ష",
    krishna: "కృష్ణ పక్ష"
  }
};

// ============================================
// DYNAMIC RULES DATABASE
// ============================================

// 1️⃣ TITHI RULES (30 Tithiyon ke liye)
const TITHI_RULES = {
  // Shukla Paksha (1-15)
  1: {  // Pratipada
    baseTime: { start: 6, end: 12 },
    deity: { en: "Agni (Fire God)", hi: "अग्नि देव", te: "అగ్ని దేవుడు" },
    category: "newBeginnings",
    energy: "creative",
    multiplier: 1.2,
    mantra: { en: "Om Agnaye Namah", hi: "ॐ अग्नये नमः", te: "ఓం అగ్నయే నమః" },
    worship: { en: "Offer ghee, chant Agni mantras", hi: "घी चढ़ाएं, अग्नि मंत्र जपें", te: "నెయ్యి సమర్పించండి, అగ్ని మంత్రాలు జపించండి" }
  },
  2: {  // Dwitiya
    baseTime: { start: 9, end: 15 },
    deity: { en: "Brahma", hi: "ब्रह्मा जी", te: "బ్రహ్మ దేవుడు" },
    category: "administration",
    energy: "structured",
    multiplier: 1.0,
    mantra: { en: "Om Brahmany Namah", hi: "ॐ ब्रह्मणे नमः", te: "ఓం బ్రహ్మణే నమః" },
    worship: { en: "Offer white flowers, chant Gayatri", hi: "सफेद फूल चढ़ाएं, गायत्री मंत्र जपें", te: "తెల్ల పూలు సమర్పించండి, గాయత్రి మంత్రం జపించండి" }
  },
  3: {  // Tritiya
    baseTime: { start: 12, end: 18 },
    deity: { en: "Goddess Parvati", hi: "माता पार्वती", te: "పార్వతీ దేవి" },
    category: "creative",
    energy: "artistic",
    multiplier: 1.1,
    mantra: { en: "Om Parvatyai Namah", hi: "ॐ पार्वत्यै नमः", te: "ఓం పార్వత్యై నమః" },
    worship: { en: "Offer kumkum, chant Durga Saptashati", hi: "कुमकुम चढ़ाएं, दुर्गा सप्तशती पढ़ें", te: "కుంకుమ సమర్పించండి, దుర్గా సప్తశతి పఠించండి" }
  },
  4: {  // Chaturthi
    baseTime: { start: 6, end: 9 },
    deity: { en: "Ganesha", hi: "गणेश जी", te: "గణేశుడు" },
    category: "household",
    energy: "grounding",
    multiplier: 0.9,
    mantra: { en: "Om Ganapataye Namah", hi: "ॐ गणेशाय नमः", te: "ఓం గణేశాయ నమః" },
    worship: { en: "Offer modak, chant Ganpati mantra", hi: "मोदक चढ़ाएं, गणपति मंत्र जपें", te: "మోదక్ సమర్పించండి, గణపతి మంత్రం జపించండి" }
  },
  5: {  // Panchami
    baseTime: { start: 15, end: 21 },
    deity: { en: "Nagas (Serpents)", hi: "नाग देवता", te: "నాగ దేవత" },
    category: "financial",
    energy: "prosperity",
    multiplier: 1.3,
    mantra: { en: "Om Nagarajaya Namah", hi: "ॐ नागराजाय नमः", te: "ఓం నాగరాజాయ నమః" },
    worship: { en: "Offer milk to snake idols", hi: "नाग देवता को दूध चढ़ाएं", te: "నాగ దేవతకు పాలు సమర్పించండి" }
  },
  6: {  // Shashthi
    baseTime: { start: 9, end: 12 },
    deity: { en: "Kartikeya", hi: "कार्तिकेय जी", te: "కార్తికేయుడు" },
    category: "health",
    energy: "healing",
    multiplier: 1.0,
    mantra: { en: "Om Subrahmanyaya Namah", hi: "ॐ सुब्रह्मण्याय नमः", te: "ఓం సుబ్రహ్మణ్యాయ నమః" },
    worship: { en: "Offer red flowers, chant Skanda mantras", hi: "लाल फूल चढ़ाएं, स्कंद मंत्र जपें", te: "ఎరుపు పూలు సమర్పించండి, స్కంద మంత్రాలు జపించండి" }
  },
  7: {  // Saptami
    baseTime: { start: 12, end: 15 },
    deity: { en: "Surya (Sun God)", hi: "सूर्य देव", te: "సూర్య భగవానుడు" },
    category: "travel",
    energy: "active",
    multiplier: 1.1,
    mantra: { en: "Om Suryaya Namah", hi: "ॐ सूर्याय नमः", te: "ఓం సూర్యాయ నమః" },
    worship: { en: "Offer water at sunrise", hi: "सूर्योदय पर जल चढ़ाएं", te: "సూర్యోదయంలో నీరు సమర్పించండి" }
  },
  8: {  // Ashtami
    baseTime: { start: 6, end: 12 },
    deity: { en: "Durga", hi: "माँ दुर्गा", te: "దుర్గా దేవి" },
    category: "spiritual",
    energy: "intense",
    multiplier: 1.4,
    mantra: { en: "Om Durgayai Namah", hi: "ॐ दुर्गायै नमः", te: "ఓం దుర్గాయై నమః" },
    worship: { en: "Offer red flowers, chant Durga Chalisa", hi: "लाल फूल चढ़ाएं, दुर्गा चालीसा पढ़ें", te: "ఎరుపు పూలు సమర్పించండి, దుర్గా చాలీసా పఠించండి" }
  },
  9: {  // Navami
    baseTime: { start: 15, end: 18 },
    deity: { en: "Rama", hi: "भगवान राम", te: "శ్రీరాముడు" },
    category: "ancestors",
    energy: "respectful",
    multiplier: 1.0,
    mantra: { en: "Om Ramaya Namah", hi: "ॐ रामाय नमः", te: "ఓం రామాయ నమః" },
    worship: { en: "Read Ramayana", hi: "रामायण पाठ करें", te: "రామాయణ పారాయణ చేయండి" }
  },
  10: { // Dashami
    baseTime: { start: 9, end: 12 },
    deity: { en: "Yama (God of Death)", hi: "यमराज", te: "యమ ధర్మరాజు" },
    category: "justice",
    energy: "karmic",
    multiplier: 0.8,
    mantra: { en: "Om Yamarajaya Namah", hi: "ॐ यमराजाय नमः", te: "ఓం యమరాజాయ నమః" },
    worship: { en: "Offer black sesame seeds", hi: "काले तिल चढ़ाएं", te: "నల్ల నువ్వులు సమర్పించండి" }
  },
  11: { // Ekadashi
    baseTime: { start: 6, end: 9 },
    deity: { en: "Vishnu", hi: "भगवान विष्णु", te: "మహావిష్ణువు" },
    category: "fasting",
    energy: "purifying",
    multiplier: 1.5,
    mantra: { en: "Om Namo Bhagavate Vasudevaya", hi: "ॐ नमो भगवते वासुदेवाय", te: "ఓం నమో భగవతే వాసుదేవాయ" },
    worship: { en: "Offer tulsi, chant Vishnu Sahasranama", hi: "तुलसी चढ़ाएं, विष्णु सहस्रनाम पढ़ें", te: "తులసి సమర్పించండి, విష్ణు సహస్రనామ పఠించండి" }
  },
  12: { // Dwadashi
    baseTime: { start: 12, end: 15 },
    deity: { en: "Krishna", hi: "भगवान कृष्ण", te: "శ్రీకృష్ణుడు" },
    category: "charity",
    energy: "giving",
    multiplier: 1.2,
    mantra: { en: "Om Krishnaya Namah", hi: "ॐ कृष्णाय नमः", te: "ఓం కృష్ణాయ నమః" },
    worship: { en: "Offer butter and sweets", hi: "माखन-मिश्री चढ़ाएं", te: "వెన్న, మిఠాయిలు సమర్పించండి" }
  },
  13: { // Trayodashi
    baseTime: { start: 15, end: 18 },
    deity: { en: "Shiva", hi: "भगवान शिव", te: "శివుడు" },
    category: "meditation",
    energy: "transformative",
    multiplier: 1.3,
    mantra: { en: "Om Namah Shivaya", hi: "ॐ नमः शिवाय", te: "ఓం నమః శివాయ" },
    worship: { en: "Offer bilva leaves, chant Mahamrityunjaya", hi: "बेलपत्र चढ़ाएं, महामृत्युंजय मंत्र जपें", te: "బిల్వ పత్రాలు సమర్పించండి, మహామృత్యుంజయ మంత్రం జపించండి" }
  },
  14: { // Chaturdashi
    baseTime: { start: 18, end: 21 },
    deity: { en: "Kali", hi: "माँ काली", te: "కాళికా దేవి" },
    category: "eveningRituals",
    energy: "protective",
    multiplier: 1.1,
    mantra: { en: "Om Kalikayai Namah", hi: "ॐ कालिकायै नमः", te: "ఓం కాళికాయై నమః" },
    worship: { en: "Light lamps, offer red flowers", hi: "दीप जलाएं, लाल फूल चढ़ाएं", te: "దీపాలు వెలిగించండి, ఎరుపు పూలు సమర్పించండి" }
  },
  15: { // Purnima
    baseTime: { start: 6, end: 12 },
    deity: { en: "Moon God", hi: "चंद्र देव", te: "చంద్ర దేవుడు" },
    category: "fullMoon",
    energy: "completion",
    multiplier: 1.6,
    mantra: { en: "Om Somaya Namah", hi: "ॐ सोमाय नमः", te: "ఓం సోమాయ నమః" },
    worship: { en: "Offer white rice, chant Chandra mantras", hi: "सफेद चावल चढ़ाएं, चंद्र मंत्र जपें", te: "తెల్ల బియ్యం సమర్పించండి, చంద్ర మంత్రాలు జపించండి" }
  },
  
  // Krishna Paksha (16-30)
  16: { // Pratipada (Krishna)
    baseTime: { start: 9, end: 15 },
    deity: { en: "Agni", hi: "अग्नि देव", te: "అగ్ని దేవుడు" },
    category: "newBeginnings",
    energy: "reflective",
    multiplier: 1.0,
    mantra: { en: "Om Agnaye Namah", hi: "ॐ अग्नये नमः", te: "ఓం అగ్నయే నమః" },
    worship: { en: "Offer ghee in fire", hi: "अग्नि में घी डालें", te: "అగ్నిలో నెయ్యి వేయండి" }
  },
  17: { // Dwitiya (Krishna)
    baseTime: { start: 12, end: 18 },
    deity: { en: "Brahma", hi: "ब्रह्मा जी", te: "బ్రహ్మ దేవుడు" },
    category: "administration",
    energy: "cautious",
    multiplier: 0.9,
    mantra: { en: "Om Brahmany Namah", hi: "ॐ ब्रह्मणे नमः", te: "ఓం బ్రహ్మణే నమః" },
    worship: { en: "Chant Gayatri", hi: "गायत्री मंत्र जपें", te: "గాయత్రీ మంత్రం జపించండి" }
  },
  18: { // Tritiya (Krishna)
    baseTime: { start: 6, end: 9 },
    deity: { en: "Parvati", hi: "माता पार्वती", te: "పార్వతీ దేవి" },
    category: "creative",
    energy: "subdued",
    multiplier: 0.8,
    mantra: { en: "Om Parvatyai Namah", hi: "ॐ पार्वत्यै नमः", te: "ఓం పార్వత్యై నమః" },
    worship: { en: "Offer kumkum", hi: "कुमकुम चढ़ाएं", te: "కుంకుమ సమర్పించండి" }
  },
  19: { // Chaturthi (Krishna)
    baseTime: { start: 15, end: 21 },
    deity: { en: "Ganesha", hi: "गणेश जी", te: "గణేశుడు" },
    category: "household",
    energy: "practical",
    multiplier: 0.9,
    mantra: { en: "Om Ganapataye Namah", hi: "ॐ गणेशाय नमः", te: "ఓం గణేశాయ నమః" },
    worship: { en: "Offer durva grass", hi: "दूर्वा चढ़ाएं", te: "దూర్వ గడ్డి సమర్పించండి" }
  },
  20: { // Panchami (Krishna)
    baseTime: { start: 9, end: 12 },
    deity: { en: "Nagas", hi: "नाग देवता", te: "నాగ దేవత" },
    category: "financial",
    energy: "conservative",
    multiplier: 1.0,
    mantra: { en: "Om Nagarajaya Namah", hi: "ॐ नागराजाय नमः", te: "ఓం నాగరాజాయ నమః" },
    worship: { en: "Offer milk to ant hills", hi: "बांबी पर दूध चढ़ाएं", te: "పుట్టకు పాలు సమర్పించండి" }
  },
  21: { // Shashthi (Krishna)
    baseTime: { start: 12, end: 15 },
    deity: { en: "Kartikeya", hi: "कार्तिकेय जी", te: "కార్తికేయుడు" },
    category: "health",
    energy: "maintenance",
    multiplier: 0.9,
    mantra: { en: "Om Subrahmanyaya Namah", hi: "ॐ सुब्रह्मण्याय नमः", te: "ఓం సుబ్రహ్మణ్యాయ నమః" },
    worship: { en: "Offer peacock feathers", hi: "मोर पंख चढ़ाएं", te: "నెమలి ఈకలు సమర్పించండి" }
  },
  22: { // Saptami (Krishna)
    baseTime: { start: 6, end: 12 },
    deity: { en: "Surya", hi: "सूर्य देव", te: "సూర్య భగవానుడు" },
    category: "travel",
    energy: "avoid",
    multiplier: 0.7,
    mantra: { en: "Om Suryaya Namah", hi: "ॐ सूर्याय नमः", te: "ఓం సూర్యాయ నమః" },
    worship: { en: "Offer water", hi: "जल चढ़ाएं", te: "నీరు సమర్పించండి" }
  },
  23: { // Ashtami (Krishna)
    baseTime: { start: 15, end: 18 },
    deity: { en: "Durga", hi: "माँ दुर्गा", te: "దుర్గా దేవి" },
    category: "spiritual",
    energy: "protection",
    multiplier: 1.2,
    mantra: { en: "Om Durgayai Namah", hi: "ॐ दुर्गायै नमः", te: "ఓం దుర్గాయై నమః" },
    worship: { en: "Offer coconut", hi: "नारियल चढ़ाएं", te: "కొబ్బరి కాయ సమర్పించండి" }
  },
  24: { // Navami (Krishna)
    baseTime: { start: 9, end: 12 },
    deity: { en: "Rama", hi: "भगवान राम", te: "శ్రీరాముడు" },
    category: "ancestors",
    energy: "remembrance",
    multiplier: 1.0,
    mantra: { en: "Om Ramaya Namah", hi: "ॐ रामाय नमः", te: "ఓం రామాయ నమః" },
    worship: { en: "Read Ramayana", hi: "रामायण पाठ", te: "రామాయణ పారాయణ" }
  },
  25: { // Dashami (Krishna)
    baseTime: { start: 6, end: 9 },
    deity: { en: "Yama", hi: "यमराज", te: "యమ ధర్మరాజు" },
    category: "justice",
    energy: "avoid",
    multiplier: 0.6,
    mantra: { en: "Om Yamarajaya Namah", hi: "ॐ यमराजाय नमः", te: "ఓం యమరాజాయ నమః" },
    worship: { en: "Offer sesame seeds", hi: "तिल चढ़ाएं", te: "నువ్వులు సమర్పించండి" }
  },
  26: { // Ekadashi (Krishna)
    baseTime: { start: 12, end: 15 },
    deity: { en: "Vishnu", hi: "भगवान विष्णु", te: "మహావిష్ణువు" },
    category: "fasting",
    energy: "purifying",
    multiplier: 1.4,
    mantra: { en: "Om Namo Bhagavate Vasudevaya", hi: "ॐ नमो भगवते वासुदेवाय", te: "ఓం నమో భగవతే వాసుదేవాయ" },
    worship: { en: "Offer tulsi", hi: "तुलसी चढ़ाएं", te: "తులసి సమర్పించండి" }
  },
  27: { // Dwadashi (Krishna)
    baseTime: { start: 15, end: 18 },
    deity: { en: "Krishna", hi: "भगवान कृष्ण", te: "శ్రీకృష్ణుడు" },
    category: "charity",
    energy: "giving",
    multiplier: 1.1,
    mantra: { en: "Om Krishnaya Namah", hi: "ॐ कृष्णाय नमः", te: "ఓం కృష్ణాయ నమః" },
    worship: { en: "Offer butter", hi: "माखन चढ़ाएं", te: "వెన్న సమర్పించండి" }
  },
  28: { // Trayodashi (Krishna)
    baseTime: { start: 18, end: 21 },
    deity: { en: "Shiva", hi: "भगवान शिव", te: "శివుడు" },
    category: "meditation",
    energy: "release",
    multiplier: 1.2,
    mantra: { en: "Om Namah Shivaya", hi: "ॐ नमः शिवाय", te: "ఓం నమః శివాయ" },
    worship: { en: "Offer bilva leaves", hi: "बेलपत्र चढ़ाएं", te: "బిల్వ పత్రాలు సమర్పించండి" }
  },
  29: { // Chaturdashi (Krishna)
    baseTime: { start: 6, end: 9 },
    deity: { en: "Kali", hi: "माँ काली", te: "కాళికా దేవి" },
    category: "protection",
    energy: "intense",
    multiplier: 1.1,
    mantra: { en: "Om Kalikayai Namah", hi: "ॐ कालिकायै नमः", te: "ఓం కాళికాయై నమః" },
    worship: { en: "Light lamps", hi: "दीप जलाएं", te: "దీపాలు వెలిగించండి" }
  },
  30: { // Amavasya
    baseTime: { start: 6, end: 12 },
    deity: { en: "Pitris (Ancestors)", hi: "पितृ देव", te: "పితృ దేవతలు" },
    category: "newMoon",
    energy: "ancestral",
    multiplier: 1.3,
    mantra: { en: "Om Pitribhyo Namah", hi: "ॐ पितृभ्यो नमः", te: "ఓం పితృభ్యో నమః" },
    worship: { en: "Offer sesame seeds and water", hi: "तिल और जल चढ़ाएं", te: "నువ్వులు, నీరు సమర్పించండి" }
  }
};

// 2️⃣ NAKSHATRA RULES (27 Nakshatras)
const NAKSHATRA_RULES = {
  1: {  // Ashwini
    quality: "deva",
    element: "earth",
    multiplier: 1.3,
    specialties: ["speed", "healing", "beginnings"],
    gana: "deva",
    color: { en: "Gold", hi: "सुनहरा", te: "బంగారు" }
  },
  2: {  // Bharani
    quality: "manushya",
    element: "earth",
    multiplier: 1.0,
    specialties: ["transformation", "responsibility"],
    gana: "manushya",
    color: { en: "Brown", hi: "भूरा", te: "గోధుమ" }
  },
  3: {  // Krittika
    quality: "rakshasa",
    element: "fire",
    multiplier: 0.9,
    specialties: ["cutting", "purification", "courage"],
    gana: "rakshasa",
    color: { en: "Red", hi: "लाल", te: "ఎరుపు" }
  },
  4: {  // Rohini
    quality: "manushya",
    element: "earth",
    multiplier: 1.4,
    specialties: ["creativity", "growth", "beauty"],
    gana: "manushya",
    color: { en: "White", hi: "सफेद", te: "తెలుపు" }
  },
  5: {  // Mrigashira
    quality: "deva",
    element: "earth",
    multiplier: 1.1,
    specialties: ["searching", "curiosity", "travel"],
    gana: "deva",
    color: { en: "Green", hi: "हरा", te: "ఆకుపచ్చ" }
  },
  6: {  // Ardra
    quality: "manushya",
    element: "water",
    multiplier: 0.8,
    specialties: ["storms", "destruction", "rebirth"],
    gana: "manushya",
    color: { en: "Blue", hi: "नीला", te: "నీలం" }
  },
  7: {  // Punarvasu
    quality: "deva",
    element: "water",
    multiplier: 1.2,
    specialties: ["renewal", "returns", "abundance"],
    gana: "deva",
    color: { en: "Silver", hi: "चांदी", te: "వెండి" }
  },
  8: {  // Pushya
    quality: "deva",
    element: "water",
    multiplier: 1.5,
    specialties: ["nourishment", "rituals", "sacred"],
    gana: "deva",
    color: { en: "Yellow", hi: "पीला", te: "పసుపు" }
  },
  9: {  // Ashlesha
    quality: "rakshasa",
    element: "water",
    multiplier: 0.7,
    specialties: ["secrets", "poison", "healing"],
    gana: "rakshasa",
    color: { en: "Black", hi: "काला", te: "నలుపు" }
  },
  10: { // Magha
    quality: "rakshasa",
    element: "water",
    multiplier: 0.9,
    specialties: ["ancestors", "power", "throne"],
    gana: "rakshasa",
    color: { en: "Orange", hi: "नारंगी", te: "నారింజ" }
  },
  11: { // Purva Phalguni
    quality: "manushya",
    element: "fire",
    multiplier: 1.1,
    specialties: ["pleasure", "creativity", "love"],
    gana: "manushya",
    color: { en: "Pink", hi: "गुलाबी", te: "గులాబీ" }
  },
  12: { // Uttara Phalguni
    quality: "manushya",
    element: "fire",
    multiplier: 1.2,
    specialties: ["marriage", "friendship", "patronage"],
    gana: "manushya",
    color: { en: "Cream", hi: "क्रीम", te: "క్రీమ్" }
  },
  13: { // Hasta
    quality: "deva",
    element: "air",
    multiplier: 1.3,
    specialties: ["skill", "hands", "laughter"],
    gana: "deva",
    color: { en: "Light Green", hi: "हल्का हरा", te: "లేత ఆకుపచ్చ" }
  },
  14: { // Chitra
    quality: "rakshasa",
    element: "earth",
    multiplier: 1.1,
    specialties: ["art", "design", "architecture"],
    gana: "rakshasa",
    color: { en: "Multi", hi: "बहुरंगी", te: "బహువర్ణ" }
  },
  15: { // Swati
    quality: "rakshasa",
    element: "air",
    multiplier: 1.0,
    specialties: ["independence", "wind", "flexibility"],
    gana: "rakshasa",
    color: { en: "Purple", hi: "बैंगनी", te: "ఊదా" }
  },
  16: { // Vishakha
    quality: "rakshasa",
    element: "fire",
    multiplier: 0.9,
    specialties: ["purpose", "achievement", "rivalry"],
    gana: "rakshasa",
    color: { en: "Maroon", hi: "मैरून", te: "మెరూన్" }
  },
  17: { // Anuradha
    quality: "deva",
    element: "water",
    multiplier: 1.2,
    specialties: ["devotion", "friendship", "success"],
    gana: "deva",
    color: { en: "Red-Orange", hi: "लाल-नारंगी", te: "ఎరుపు-నారింజ" }
  },
  18: { // Jyeshtha
    quality: "rakshasa",
    element: "water",
    multiplier: 0.8,
    specialties: ["seniority", "protection", "secrets"],
    gana: "rakshasa",
    color: { en: "Dark Blue", hi: "गहरा नीला", te: "ముదురు నీలం" }
  },
  19: { // Mula
    quality: "rakshasa",
    element: "air",
    multiplier: 0.7,
    specialties: ["roots", "destruction", "investigation"],
    gana: "rakshasa",
    color: { en: "Brown", hi: "भूरा", te: "గోధుమ" }
  },
  20: { // Purva Ashadha
    quality: "manushya",
    element: "water",
    multiplier: 1.0,
    specialties: ["victory", "invincibility", "declaration"],
    gana: "manushya",
    color: { en: "Gold", hi: "सुनहरा", te: "బంగారు" }
  },
  21: { // Uttara Ashadha
    quality: "manushya",
    element: "water",
    multiplier: 1.2,
    specialties: ["permanence", "victory", "teachings"],
    gana: "manushya",
    color: { en: "Yellow", hi: "पीला", te: "పసుపు" }
  },
  22: { // Shravana
    quality: "deva",
    element: "air",
    multiplier: 1.3,
    specialties: ["listening", "learning", "pilgrimage"],
    gana: "deva",
    color: { en: "Blue", hi: "नीला", te: "నీలం" }
  },
  23: { // Dhanishtha
    quality: "rakshasa",
    element: "air",
    multiplier: 1.1,
    specialties: ["music", "wealth", "fame"],
    gana: "rakshasa",
    color: { en: "Turquoise", hi: "फ़िरोज़ा", te: "టర్కోయిస్" }
  },
  24: { // Shatabhisha
    quality: "rakshasa",
    element: "air",
    multiplier: 0.8,
    specialties: ["healing", "emptiness", "mystery"],
    gana: "rakshasa",
    color: { en: "Indigo", hi: "नील", te: "నీలి" }
  },
  25: { // Purva Bhadrapada
    quality: "manushya",
    element: "earth",
    multiplier: 0.9,
    specialties: ["transformation", "sacrifice", "energy"],
    gana: "manushya",
    color: { en: "Silver", hi: "चांदी", te: "వెండి" }
  },
  26: { // Uttara Bhadrapada
    quality: "manushya",
    element: "earth",
    multiplier: 1.1,
    specialties: ["stability", "wisdom", "compassion"],
    gana: "manushya",
    color: { en: "White", hi: "सफेद", te: "తెలుపు" }
  },
  27: { // Revati
    quality: "deva",
    element: "earth",
    multiplier: 1.4,
    specialties: ["nourishment", "journey", "protection"],
    gana: "deva",
    color: { en: "Light Blue", hi: "हल्का नीला", te: "లేత నీలం" }
  }
};

// 3️⃣ YOGA RULES (27 Yogas)
const YOGA_RULES = {
  0: { name: { en: "Vishkumbha", hi: "विष्कुम्भ", te: "విష్కుంభ" }, quality: "inauspicious", multiplier: 0.5, description: { en: "Avoid important work", hi: "महत्वपूर्ण काम से बचें", te: "ముఖ్యమైన పనులను నివారించండి" } },
  1: { name: { en: "Priti", hi: "प्रीति", te: "ప్రీతి" }, quality: "auspicious", multiplier: 1.2, description: { en: "Good for relationships", hi: "रिश्तों के लिए अच्छा", te: "సంబంధాలకు మంచిది" } },
  2: { name: { en: "Ayushman", hi: "आयुष्मान", te: "ఆయుష్మాన్" }, quality: "auspicious", multiplier: 1.3, description: { en: "Good for health", hi: "स्वास्थ्य के लिए अच्छा", te: "ఆరోగ్యానికి మంచిది" } },
  3: { name: { en: "Saubhagya", hi: "सौभाग्य", te: "సౌభాగ్య" }, quality: "auspicious", multiplier: 1.4, description: { en: "Good for luck", hi: "भाग्य के लिए अच्छा", te: "అదృష్టానికి మంచిది" } },
  4: { name: { en: "Shobhana", hi: "शोभन", te: "శోభన" }, quality: "auspicious", multiplier: 1.2, description: { en: "Good for beauty", hi: "सुंदरता के लिए अच्छा", te: "అందానికి మంచిది" } },
  5: { name: { en: "Atiganda", hi: "अतिगण्ड", te: "అతిగండ" }, quality: "inauspicious", multiplier: 0.6, description: { en: "Avoid conflicts", hi: "विवाद से बचें", te: "వివాదాలను నివారించండి" } },
  6: { name: { en: "Sukarma", hi: "सुकर्मा", te: "సుకర్మ" }, quality: "auspicious", multiplier: 1.3, description: { en: "Good for deeds", hi: "कर्मों के लिए अच्छा", te: "కర్మలకు మంచిది" } },
  7: { name: { en: "Dhriti", hi: "धृति", te: "ధృతి" }, quality: "auspicious", multiplier: 1.1, description: { en: "Good for patience", hi: "धैर्य के लिए अच्छा", te: "ఓర్పుకు మంచిది" } },
  8: { name: { en: "Shula", hi: "शूल", te: "శూల" }, quality: "inauspicious", multiplier: 0.4, description: { en: "Avoid pain", hi: "पीड़ा से बचें", te: "బాధను నివారించండి" } },
  9: { name: { en: "Ganda", hi: "गण्ड", te: "గండ" }, quality: "inauspicious", multiplier: 0.5, description: { en: "Avoid trouble", hi: "मुसीबत से बचें", te: "ఇబ్బందిని నివారించండి" } },
  10: { name: { en: "Vriddhi", hi: "वृद्धि", te: "వృద్ధి" }, quality: "auspicious", multiplier: 1.2, description: { en: "Good for growth", hi: "विकास के लिए अच्छा", te: "అభివృద్ధికి మంచిది" } },
  11: { name: { en: "Dhruva", hi: "ध्रुव", te: "ధ్రువ" }, quality: "auspicious", multiplier: 1.3, description: { en: "Good for stability", hi: "स्थिरता के लिए अच्छा", te: "స్థిరత్వానికి మంచిది" } },
  12: { name: { en: "Vyaghata", hi: "व्याघात", te: "వ్యాఘాత" }, quality: "inauspicious", multiplier: 0.5, description: { en: "Avoid obstacles", hi: "बाधाओं से बचें", te: "అడ్డంకులను నివారించండి" } },
  13: { name: { en: "Harshana", hi: "हर्षण", te: "హర్షణ" }, quality: "auspicious", multiplier: 1.1, description: { en: "Good for joy", hi: "खुशी के लिए अच्छा", te: "ఆనందానికి మంచిది" } },
  14: { name: { en: "Vajra", hi: "वज्र", te: "వజ్ర" }, quality: "inauspicious", multiplier: 0.6, description: { en: "Avoid harshness", hi: "कठोरता से बचें", te: "కఠినత్వాన్ని నివారించండి" } },
  15: { name: { en: "Siddhi", hi: "सिद्धि", te: "సిద్ధి" }, quality: "auspicious", multiplier: 1.5, description: { en: "Good for success", hi: "सफलता के लिए अच्छा", te: "విజయానికి మంచిది" } },
  16: { name: { en: "Vyatipata", hi: "व्यतीपात", te: "వ్యతీపాత" }, quality: "inauspicious", multiplier: 0.3, description: { en: "Avoid everything", hi: "सब कुछ से बचें", te: "ప్రతిదీ నివారించండి" } },
  17: { name: { en: "Variyan", hi: "वरीयान", te: "వరియాన్" }, quality: "auspicious", multiplier: 1.2, description: { en: "Good for comfort", hi: "आराम के लिए अच्छा", te: "సుఖానికి మంచిది" } },
  18: { name: { en: "Parigha", hi: "परिघ", te: "పరిఘ" }, quality: "inauspicious", multiplier: 0.7, description: { en: "Avoid obstacles", hi: "बाधाओं से बचें", te: "అడ్డంకులను నివారించండి" } },
  19: { name: { en: "Shiva", hi: "शिव", te: "శివ" }, quality: "auspicious", multiplier: 1.4, description: { en: "Good for meditation", hi: "ध्यान के लिए अच्छा", te: "ధ్యానానికి మంచిది" } },
  20: { name: { en: "Siddha", hi: "सिद्ध", te: "సిద్ధ" }, quality: "auspicious", multiplier: 1.5, description: { en: "Good for accomplishments", hi: "उपलब्धियों के लिए अच्छा", te: "సాధనలకు మంచిది" } },
  21: { name: { en: "Sadhya", hi: "साध्य", te: "సాధ్య" }, quality: "auspicious", multiplier: 1.2, description: { en: "Good for achievements", hi: "सिद्धियों के लिए अच्छा", te: "సిద్ధులకు మంచిది" } },
  22: { name: { en: "Shubha", hi: "शुभ", te: "శుభ" }, quality: "auspicious", multiplier: 1.3, description: { en: "Good for auspicious work", hi: "शुभ कार्यों के लिए अच्छा", te: "శుభ కార్యాలకు మంచిది" } },
  23: { name: { en: "Shukla", hi: "शुक्ल", te: "శుక్ల" }, quality: "auspicious", multiplier: 1.1, description: { en: "Good for purity", hi: "पवित्रता के लिए अच्छा", te: "పవిత్రతకు మంచిది" } },
  24: { name: { en: "Brahma", hi: "ब्रह्म", te: "బ్రహ్మ" }, quality: "auspicious", multiplier: 1.4, description: { en: "Good for knowledge", hi: "ज्ञान के लिए अच्छा", te: "జ్ఞానానికి మంచిది" } },
  25: { name: { en: "Indra", hi: "इन्द्र", te: "ఇంద్ర" }, quality: "auspicious", multiplier: 1.3, description: { en: "Good for power", hi: "शक्ति के लिए अच्छा", te: "శక్తికి మంచిది" } },
  26: { name: { en: "Vaidhriti", hi: "वैधृति", te: "వైధృతి" }, quality: "inauspicious", multiplier: 0.4, description: { en: "Avoid everything", hi: "सब कुछ से बचें", te: "ప్రతిదీ నివారించండి" } }
};

// 4️⃣ KARANA RULES (11 Karanas)
const KARANA_RULES = {
  0: { name: { en: "Kaulava", hi: "कौलव", te: "కౌలవ" }, quality: "auspicious", multiplier: 1.1, description: { en: "Good for family", hi: "परिवार के लिए अच्छा", te: "కుటుంబానికి మంచిది" } },
  1: { name: { en: "Taitila", hi: "तैतिल", te: "తైతిల" }, quality: "auspicious", multiplier: 1.2, description: { en: "Good for music", hi: "संगीत के लिए अच्छा", te: "సంగీతానికి మంచిది" } },
  2: { name: { en: "Garaja", hi: "गरिज", te: "గరిజ" }, quality: "inauspicious", multiplier: 0.7, description: { en: "Avoid starting new", hi: "नया शुरू करने से बचें", te: "కొత్త ప్రారంభాన్ని నివారించండి" } },
  3: { name: { en: "Vishti", hi: "विष्टि", te: "విష్టి" }, quality: "inauspicious", multiplier: 0.5, description: { en: "Avoid important work", hi: "महत्वपूर्ण काम से बचें", te: "ముఖ్యమైన పనిని నివారించండి" } },
  4: { name: { en: "Bava", hi: "बव", te: "బవ" }, quality: "auspicious", multiplier: 1.0, description: { en: "Neutral", hi: "सामान्य", te: "సాధారణ" } },
  5: { name: { en: "Balava", hi: "बालव", te: "బాలవ" }, quality: "auspicious", multiplier: 1.1, description: { en: "Good for strength", hi: "शक्ति के लिए अच्छा", te: "బలానికి మంచిది" } },
  6: { name: { en: "Shakuni", hi: "शकुनि", te: "శకుని" }, quality: "inauspicious", multiplier: 0.6, description: { en: "Avoid gambling", hi: "जुआ से बचें", te: "జూదాన్ని నివారించండి" } },
  7: { name: { en: "Chatushpada", hi: "चतुष्पद", te: "చతుష్పాద" }, quality: "neutral", multiplier: 0.9, description: { en: "Good for animals", hi: "पशुओं के लिए अच्छा", te: "జంతువులకు మంచిది" } },
  8: { name: { en: "Nagava", hi: "नागव", te: "నాగవ" }, quality: "inauspicious", multiplier: 0.7, description: { en: "Avoid", hi: "बचें", te: "నివారించండి" } },
  9: { name: { en: "Kinstughna", hi: "किंस्तुघ्न", te: "కింస్తుఘ్న" }, quality: "neutral", multiplier: 0.9, description: { en: "Neutral", hi: "सामान्य", te: "సాధారణ" } },
  10: { name: { en: "Kimstughna", hi: "किम्स्तुघ्न", te: "కిమ్స్తుఘ్న" }, quality: "neutral", multiplier: 1.0, description: { en: "Neutral", hi: "सामान्य", te: "సాధారణ" } }
};

// 5️⃣ VAARA RULES (7 Vaara)
const VAARA_RULES = {
  0: { // Sunday
    colors: { en: "Orange, Red", hi: "नारंगी, लाल", te: "నారింజ, ఎరుపు" },
    planet: { en: "Sun", hi: "सूर्य", te: "సూర్య" },
    multiplier: 1.0,
    gemstone: { en: "Ruby", hi: "माणिक", te: "కెంపు" }
  },
  1: { // Monday
    colors: { en: "White, Silver", hi: "सफेद, चांदी", te: "తెలుపు, వెండి" },
    planet: { en: "Moon", hi: "चंद्र", te: "చంద్ర" },
    multiplier: 1.1,
    gemstone: { en: "Pearl", hi: "मोती", te: "ముత్యం" }
  },
  2: { // Tuesday
    colors: { en: "Red, Maroon", hi: "लाल, मैरून", te: "ఎరుపు, మెరూన్" },
    planet: { en: "Mars", hi: "मंगल", te: "మంగళ" },
    multiplier: 0.9,
    gemstone: { en: "Coral", hi: "मूंगा", te: "పగడం" }
  },
  3: { // Wednesday
    colors: { en: "Green, Yellow", hi: "हरा, पीला", te: "ఆకుపచ్చ, పసుపు" },
    planet: { en: "Mercury", hi: "बुध", te: "బుధ" },
    multiplier: 1.2,
    gemstone: { en: "Emerald", hi: "पन्ना", te: "పచ్చ" }
  },
  4: { // Thursday
    colors: { en: "Yellow, Cream", hi: "पीला, क्रीम", te: "పసుపు, క్రీమ్" },
    planet: { en: "Jupiter", hi: "बृहस्पति", te: "బృహస్పతి" },
    multiplier: 1.4,
    gemstone: { en: "Yellow Sapphire", hi: "पुखराज", te: "పుష్యరాగం" }
  },
  5: { // Friday
    colors: { en: "White, Pink", hi: "सफेद, गुलाबी", te: "తెలుపు, గులాబీ" },
    planet: { en: "Venus", hi: "शुक्र", te: "శుక్ర" },
    multiplier: 1.3,
    gemstone: { en: "Diamond", hi: "हीरा", te: "వజ్రం" }
  },
  6: { // Saturday
    colors: { en: "Blue, Black", hi: "नीला, काला", te: "నీలం, నలుపు" },
    planet: { en: "Saturn", hi: "शनि", te: "శని" },
    multiplier: 0.8,
    gemstone: { en: "Blue Sapphire", hi: "नीलम", te: "నీలం" }
  }
};

// 6️⃣ DO'S AND DON'TS - Category based
const DOS_DONTS = {
  newBeginnings: {
    do: {
      en: ["Start new projects", "Perform religious ceremonies", "Buy new items", "Plant seeds", "Open business", "Get married", "Move to new house"],
      hi: ["नए प्रोजेक्ट शुरू करें", "धार्मिक अनुष्ठान करें", "नई वस्तुएं खरीदें", "बीज बोएं", "व्यवसाय खोलें", "विवाह करें", "नए घर में जाएं"],
      te: ["కొత్త ప్రాజెక్టులు ప్రారంభించండి", "మతపరమైన కార్యక్రమాలు చేయండి", "కొత్త వస్తువులు కొనండి", "విత్తనాలు నాటండి", "వ్యాపారం ప్రారంభించండి", "వివాహం చేసుకోండి", "కొత్త ఇంట్లోకి వెళ్ళండి"]
    },
    dont: {
      en: ["Travel long distance", "Lend money", "Argue with elders", "Break relationships", "Gossip", "Sell property", "Haircut"],
      hi: ["लंबी दूरी की यात्रा", "पैसा उधार दें", "बड़ों से बहस करें", "रिश्ते तोड़ें", "गपशप करें", "संपत्ति बेचें", "बाल कटवाएं"],
      te: ["దూర ప్రయాణం", "డబ్బు అప్పు ఇవ్వండి", "పెద్దలతో వాదించండి", "సంబంధాలు విడదీయండి", "గాసిప్", "ఆస్తి అమ్మండి", "జుట్టు కత్తిరించుకోండి"]
    }
  },
  administration: {
    do: {
      en: ["Administrative work", "Meetings", "File legal documents", "Plan strategies", "Team discussions", "Sign contracts", "Interview candidates"],
      hi: ["प्रशासनिक कार्य", "बैठकें", "कानूनी दस्तावेज दाखिल करें", "रणनीति बनाएं", "टीम चर्चा", "अनुबंध पर हस्ताक्षर करें", "उम्मीदवारों का साक्षात्कार"],
      te: ["పరిపాలనా పని", "సమావేశాలు", "చట్టపరమైన పత్రాలు ఫైల్ చేయండి", "వ్యూహాలు ప్లాన్ చేయండి", "జట్టు చర్చలు", "ఒప్పందాలపై సంతకం చేయండి", "అభ్యర్థుల ఇంటర్వ్యూ"]
    },
    dont: {
      en: ["Start construction", "Get married", "Haircut", "Sign contracts blindly", "Take loans", "Quit job", "Gamble"],
      hi: ["निर्माण शुरू करें", "विवाह करें", "बाल कटवाएं", "आँख मूंदकर अनुबंध पर हस्ताक्षर करें", "ऋण लें", "नौकरी छोड़ें", "जुआ खेलें"],
      te: ["నిర్మాణం ప్రారంభించండి", "వివాహం చేసుకోండి", "జుట్టు కత్తిరించుకోండి", "గుడ్డిగా ఒప్పందాలపై సంతకం చేయండి", "రుణాలు తీసుకోండి", "ఉద్యోగం మానేయండి", "జూదం ఆడండి"]
    }
  },
  creative: {
    do: {
      en: ["Creative work", "Artistic pursuits", "Learn new skills", "Music", "Dance", "Write", "Paint", "Design", "Photography"],
      hi: ["रचनात्मक कार्य", "कलात्मक गतिविधियाँ", "नए कौशल सीखें", "संगीत", "नृत्य", "लिखें", "पेंट करें", "डिज़ाइन करें", "फोटोग्राफी"],
      te: ["సృజనాత్మక పని", "కళాత్మక కార్యకలాపాలు", "కొత్త నైపుణ్యాలు నేర్చుకోండి", "సంగీతం", "నృత్యం", "రాయండి", "పెయింట్ చేయండి", "డిజైన్ చేయండి", "ఫోటోగ్రఫీ"]
    },
    dont: {
      en: ["Non-vegetarian food", "Alcohol", "Gossip", "Rush decisions", "Ignore intuition", "Criticize others", "Procrastinate"],
      hi: ["मांसाहारी भोजन", "शराब", "गपशप", "जल्दबाजी में निर्णय", "अंतर्ज्ञान की अनदेखी", "दूसरों की आलोचना", "टालमटोल"],
      te: ["మాంసాహారం", "మద్యం", "గాసిప్", "తొందరపడి నిర్ణయాలు", "అంతర్ దృష్టిని విస్మరించండి", "ఇతరులను విమర్శించండి", "వాయిదా వేయండి"]
    }
  },
  household: {
    do: {
      en: ["Household chores", "Cleaning", "Organizing", "Family time", "Cooking", "Gardening", "Home decoration", "Repairs"],
      hi: ["घर के काम", "सफाई", "व्यवस्थित करना", "परिवार के साथ समय", "खाना बनाना", "बागवानी", "घर की सजावट", "मरम्मत"],
      te: ["ఇంటి పనులు", "శుభ్రపరచడం", "వ్యవస్థీకరించడం", "కుటుంబ సమయం", "వంట", "తోటపని", "ఇంటి అలంకరణ", "మరమ్మతులు"]
    },
    dont: {
      en: ["Important purchases", "Arguments", "Neglect parents", "Waste food", "Sleep too much", "Ignore children", "Overspend"],
      hi: ["महत्वपूर्ण खरीदारी", "तर्क-वितर्क", "माता-पिता की उपेक्षा", "भोजन बर्बाद करें", "बहुत अधिक सोएं", "बच्चों की अनदेखी", "अधिक खर्च करें"],
      te: ["ముఖ్యమైన కొనుగోళ్లు", "వాదనలు", "తల్లిదండ్రులను నిర్లక్ష్యం చేయండి", "ఆహారం వృథా చేయండి", "ఎక్కువగా నిద్రపోండి", "పిల్లలను విస్మరించండి", "ఎక్కువ ఖర్చు చేయండి"]
    }
  },
  financial: {
    do: {
      en: ["Financial transactions", "Investments", "Savings", "Budget planning", "Gold purchase", "Property investment", "Loan approval", "Tax planning"],
      hi: ["वित्तीय लेनदेन", "निवेश", "बचत", "बजट योजना", "सोने की खरीद", "संपत्ति निवेश", "ऋण स्वीकृति", "कर योजना"],
      te: ["ఆర్థిక లావాదేవీలు", "పెట్టుబడులు", "పొదుపు", "బడ్జెట్ ప్రణాళిక", "బంగారం కొనుగోలు", "ఆస్తి పెట్టుబడి", "రుణ ఆమోదం", "పన్ను ప్రణాళిక"]
    },
    dont: {
      en: ["Gambling", "Speculation", "Lend to strangers", "Overspend", "Ignore bills", "Take unnecessary risks", "Fraud"],
      hi: ["जुआ", "अटकलबाजी", "अजनबियों को उधार दें", "अधिक खर्च", "बिलों की अनदेखी", "अनावश्यक जोखिम लें", "धोखाधड़ी"],
      te: ["జూదం", "ఊహాగానాలు", "అపరిచితులకు అప్పు ఇవ్వండి", "ఎక్కువ ఖర్చు", "బిల్లులను విస్మరించండి", "అనవసరమైన రిస్క్లు తీసుకోండి", "మోసం"]
    }
  },
  health: {
    do: {
      en: ["Health-related activities", "Exercise", "Yoga", "Doctor visits", "Medicine start", "Diet plan", "Detox", "Massage", "Therapy"],
      hi: ["स्वास्थ्य संबंधी गतिविधियाँ", "व्यायाम", "योग", "डॉक्टर के पास जाएँ", "दवा शुरू करें", "आहार योजना", "डिटॉक्स", "मालिश", "थेरेपी"],
      te: ["ఆరోగ్య సంబంధిత కార్యకలాపాలు", "వ్యాయామం", "యోగా", "డాక్టర్ సందర్శనలు", "మందులు ప్రారంభించండి", "డైట్ ప్లాన్", "డిటాక్స్", "మసాజ్", "థెరపీ"]
    },
    dont: {
      en: ["Junk food", "Stress", "Skip meals", "Overwork", "Ignore symptoms", "Late night", "Alcohol"],
      hi: ["जंक फूड", "तनाव", "भोजन छोड़ें", "अधिक काम", "लक्षणों की अनदेखी", "देर रात", "शराब"],
      te: ["జంక్ ఫుడ్", "ఒత్తిడి", "భోజనం మానేయండి", "అతిగా పని", "లక్షణాలను విస్మరించండి", "అర్ధరాత్రి", "మద్యం"]
    }
  },
  travel: {
    do: {
      en: ["Travel", "Vehicle purchase", "Trip planning", "Moving", "Exploration", "Pilgrimage", "Business trip", "Vacation"],
      hi: ["यात्रा", "वाहन खरीद", "यात्रा योजना", "स्थानांतरण", "अन्वेषण", "तीर्थयात्रा", "व्यापार यात्रा", "छुट्टी"],
      te: ["ప్రయాణం", "వాహనం కొనుగోలు", "ట్రిప్ ప్లానింగ్", "తరలింపు", "అన్వేషణ", "తీర్థయాత్ర", "వ్యాపార పర్యటన", "సెలవు"]
    },
    dont: {
      en: ["Rash driving", "Travel without preparation", "Ignore directions", "Take risks", "Travel at night", "Lost documents"],
      hi: ["लापरवाही से ड्राइविंग", "बिना तैयारी के यात्रा", "निर्देशों की अनदेखी", "जोखिम लें", "रात में यात्रा", "दस्तावेज खोना"],
      te: ["నిర్లక్ష్యంగా డ్రైవింగ్", "సిద్ధం లేకుండా ప్రయాణం", "దిశలను విస్మరించండి", "రిస్క్లు తీసుకోండి", "రాత్రి ప్రయాణం", "పత్రాలు కోల్పోవడం"]
    }
  },
  spiritual: {
    do: {
      en: ["Fasting", "Spiritual practices", "Meditation", "Temple visit", "Scripture reading", "Charity", "Prayer", "Mantra chanting"],
      hi: ["उपवास", "आध्यात्मिक अभ्यास", "ध्यान", "मंदिर दर्शन", "शास्त्र पाठ", "दान", "प्रार्थना", "मंत्र जाप"],
      te: ["ఉపవాసం", "ఆధ్యాత్మిక సాధనలు", "ధ్యానం", "దేవాలయ సందర్శన", "శాస్త్ర పఠనం", "దానం", "ప్రార్థన", "మంత్ర జపం"]
    },
    dont: {
      en: ["Non-veg food", "Alcohol", "Negative thoughts", "Skip prayers", "Disturb others", "Lie", "Harming animals"],
      hi: ["मांसाहार", "शराब", "नकारात्मक विचार", "प्रार्थना छोड़ें", "दूसरों को परेशान करें", "झूठ बोलें", "जानवरों को नुकसान पहुंचाएं"],
      te: ["మాంసాహారం", "మద్యం", "ప్రతికూల ఆలోచనలు", "ప్రార్థనలు మానేయండి", "ఇతరులను ఇబ్బంది పెట్టండి", "అబద్ధం", "జంతువులకు హాని"]
    }
  },
  ancestors: {
    do: {
      en: ["Gratitude", "Offering to ancestors", "Charity", "Family gathering", "Remembrance", "Pitru Tarpan", "Feed Brahmins"],
      hi: ["कृतज्ञता", "पितरों को अर्पण", "दान", "परिवार समागम", "स्मरण", "पितृ तर्पण", "ब्राह्मणों को भोजन कराएं"],
      te: ["కృతజ్ఞత", "పితృ దేవతలకు సమర్పణ", "దానం", "కుటుంబ సమావేశం", "స్మరణ", "పితృ తర్పణం", "బ్రాహ్మణులకు భోజనం పెట్టండి"]
    },
    dont: {
      en: ["Non-veg food", "Alcohol", "Disrespect elders", "Forget traditions", "Ignore duties", "Arguments", "Ego"],
      hi: ["मांसाहार", "शराब", "बड़ों का अपमान", "परंपराओं को भूलें", "कर्तव्यों की अनदेखी", "तर्क-वितर्क", "अहंकार"],
      te: ["మాంసాహారం", "మద్యం", "పెద్దలను అగౌరవపరచండి", "సంప్రదాయాలను మరచిపోండి", "విధులను విస్మరించండి", "వాదనలు", "అహం"]
    }
  },
  fasting: {
    do: {
      en: ["Fasting", "Vishnu worship", "Prayers", "Charity", "Self-control", "Meditation", "Read scriptures", "Satvik food"],
      hi: ["उपवास", "विष्णु पूजा", "प्रार्थना", "दान", "आत्म-नियंत्रण", "ध्यान", "शास्त्र पढ़ें", "सात्विक भोजन"],
      te: ["ఉపవాసం", "విష్ణు పూజ", "ప్రార్థనలు", "దానం", "స్వీయ నియంత్రణ", "ధ్యానం", "శాస్త్రాలు చదవండి", "సాత్విక ఆహారం"]
    },
    dont: {
      en: ["Grains", "Onion/garlic", "Alcohol", "Non-veg", "Anger", "Lust", "Greed", "Lying"],
      hi: ["अनाज", "प्याज/लहसुन", "शराब", "मांसाहार", "क्रोध", "वासना", "लालच", "झूठ"],
      te: ["ధాన్యాలు", "ఉల్లి/వెల్లుల్లి", "మద్యం", "మాంసాహారం", "కోపం", "కామం", "లోభం", "అబద్ధం"]
    }
  },
  charity: {
    do: {
      en: ["Donations", "Charity", "Help others", "Feed poor", "Give clothes", "Educational help", "Medical aid", "Animal feed"],
      hi: ["दान", "चैरिटी", "दूसरों की मदद", "गरीबों को भोजन", "कपड़े दें", "शैक्षिक सहायता", "चिकित्सा सहायता", "पशुओं को चारा"],
      te: ["విరాళాలు", "దానం", "ఇతరులకు సహాయం", "పేదలకు ఆహారం", "బట్టలు ఇవ్వండి", "విద్యా సహాయం", "వైద్య సహాయం", "జంతువులకు ఆహారం"]
    },
    dont: {
      en: ["Expect returns", "Show off", "Donate to undeserving", "Regret giving", "Delay", "Conditional charity"],
      hi: ["बदले की उम्मीद", "दिखावा", "अयोग्य को दान", "देने का पछतावा", "देरी", "सशर्त दान"],
      te: ["బదులుగా ఆశించండి", "చూపించు", "అనర్హులకు దానం చేయండి", "ఇచ్చినందుకు చింతించండి", "ఆలస్యం", "షరతులతో కూడిన దానం"]
    }
  },
  meditation: {
    do: {
      en: ["Shiva worship", "Meditation", "Silence", "Introspection", "Nature walk", "Deep breathing", "Yoga nidra", "Journaling"],
      hi: ["शिव पूजा", "ध्यान", "मौन", "आत्मनिरीक्षण", "प्रकृति में सैर", "गहरी सांस", "योग निद्रा", "जर्नलिंग"],
      te: ["శివ పూజ", "ధ్యానం", "మౌనం", "ఆత్మపరిశీలన", "ప్రకృతి నడక", "లోతైన శ్వాస", "యోగ నిద్ర", "జర్నలింగ్"]
    },
    dont: {
      en: ["Loud noise", "Crowded places", "Negative company", "Haste", "Distractions", "Phone", "TV"],
      hi: ["तेज़ शोर", "भीड़-भाड़ वाली जगहें", "नकारात्मक संगति", "जल्दबाजी", "विकर्षण", "फोन", "टीवी"],
      te: ["బిగ్గరగా శబ్దం", "రద్దీ ప్రదేశాలు", "ప్రతికూల సాంగత్యం", "తొందరపాటు", "దృష్టి మరల్చడం", "ఫోన్", "టీవీ"]
    }
  },
  eveningRituals: {
    do: {
      en: ["Evening prayers", "Lamp lighting", "Aarti", "Family time", "Relax", "Read", "Listen to music", "Walk"],
      hi: ["शाम की प्रार्थना", "दीप प्रज्वलन", "आरती", "परिवार के साथ समय", "आराम", "पढ़ें", "संगीत सुनें", "टहलें"],
      te: ["సాయంత్రం ప్రార్థనలు", "దీపం వెలిగించడం", "ఆరతి", "కుటుంబ సమయం", "విశ్రాంతి", "చదవండి", "సంగీతం వినండి", "నడవండి"]
    },
    dont: {
      en: ["Start new work", "Important decisions", "Arguments", "Neglect prayers", "Stay out late", "Heavy food"],
      hi: ["नया काम शुरू करें", "महत्वपूर्ण निर्णय", "तर्क-वितर्क", "प्रार्थना की उपेक्षा", "देर तक बाहर रहें", "भारी भोजन"],
      te: ["కొత్త పని ప్రారంభించండి", "ముఖ్యమైన నిర్ణయాలు", "వాదనలు", "ప్రార్థనలను నిర్లక్ష్యం చేయండి", "ఆలస్యంగా బయట ఉండండి", "భారీ ఆహారం"]
    }
  },
  fullMoon: {
    do: {
      en: ["Full Moon worship", "Meditation", "Charity", "White clothes", "Satvik food", "Chanting", "Candle meditation"],
      hi: ["पूर्णिमा पूजन", "ध्यान", "दान", "सफेद वस्त्र", "सात्विक भोजन", "जप", "मोमबत्ती ध्यान"],
      te: ["పౌర్ణమి పూజ", "ధ్యానం", "దానం", "తెల్లని దుస్తులు", "సాత్విక ఆహారం", "జపం", "కొవ్వొత్తి ధ్యానం"]
    },
    dont: {
      en: ["Non-veg", "Alcohol", "Overthinking", "Stay awake late", "Negative talk", "Anger"],
      hi: ["मांसाहार", "शराब", "अति-विचार", "देर तक जागना", "नकारात्मक बातें", "क्रोध"],
      te: ["మాంసాహారం", "మద్యం", "అతిగా ఆలోచించడం", "ఆలస్యంగా మెలకువగా ఉండండి", "ప్రతికూల మాటలు", "కోపం"]
    }
  },
  newMoon: {
    do: {
      en: ["New Moon rituals", "Ancestor worship", "Charity", "Self-reflection", "Plan new", "Set intentions", "Journal"],
      hi: ["अमावस्या अनुष्ठान", "पितृ पूजन", "दान", "आत्म-चिंतन", "नई योजना", "संकल्प", "जर्नल"],
      te: ["అమావాస్య ఆచారాలు", "పితృ పూజ", "దానం", "స్వీయ ప్రతిబింబం", "కొత్త ప్రణాళిక", "సంకల్పం", "జర్నల్"]
    },
    dont: {
      en: ["Start important work", "Travel", "Lend money", "Overeat", "Impulsive decisions", "Conflict"],
      hi: ["महत्वपूर्ण काम शुरू करें", "यात्रा", "पैसा उधार दें", "अधिक भोजन", "आवेगपूर्ण निर्णय", "संघर्ष"],
      te: ["ముఖ్యమైన పని ప్రారంభించండి", "ప్రయాణం", "డబ్బు అప్పు ఇవ్వండి", "అతిగా తినండి", "హఠాత్తుగా నిర్ణయాలు", "వైరుధ్యం"]
    }
  }
};

// ============================================
// DYNAMIC AUSPICIOUS INFO FUNCTION - FIXED WITH LET
// ============================================
function getDynamicAuspiciousInfo(tithiId, nakshatraId, vaara, yogaId, karanaId, language = 'en') {
  
  // Get day index (0-6) - FIXED: Changed const to let
  let dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(vaara);
  if (dayIndex === -1) {
    // Try with Hindi/Telugu names
    const vaaraMap = {
      "रविवार": 0, "सोमवार": 1, "मंगलवार": 2, "बुधवार": 3, 
      "गुरुवार": 4, "शुक्रवार": 5, "शनिवार": 6,
      "ఆదివారం": 0, "సోమవారం": 1, "మంగళవారం": 2, "బుధవారం": 3,
      "గురువారం": 4, "శుక్రవారం": 5, "శనివారం": 6
    };
    dayIndex = vaaraMap[vaara] !== undefined ? vaaraMap[vaara] : 4;
  }
  
  // Get all rules with fallbacks
  const tithiRule = TITHI_RULES[tithiId] || TITHI_RULES[1];
  const nakshatraRule = NAKSHATRA_RULES[nakshatraId] || NAKSHATRA_RULES[1];
  const yogaRule = YOGA_RULES[yogaId] || YOGA_RULES[0];
  
  // Fix karana index (1-11 to 0-10)
  let karanaIndex = karanaId;
  if (karanaIndex >= 1 && karanaIndex <= 11) {
    karanaIndex = karanaIndex - 1;
  } else {
    karanaIndex = 0;
  }
  const karanaRule = KARANA_RULES[karanaIndex] || KARANA_RULES[0];
  
  const vaaraRule = VAARA_RULES[dayIndex] || VAARA_RULES[4];

  // Calculate dynamic multiplier
  const totalMultiplier = (
    (tithiRule.multiplier || 1) * 
    (nakshatraRule.multiplier || 1) * 
    (yogaRule.multiplier || 1) * 
    (karanaRule.multiplier || 1) * 
    (vaaraRule.multiplier || 1)
  );

  // Calculate dynamic time
  const baseStart = tithiRule.baseTime.start;
  const baseEnd = tithiRule.baseTime.end;
  
  let adjustedStart, adjustedEnd;
  if (totalMultiplier > 1.5) {
    adjustedStart = Math.max(5, baseStart - 1);
    adjustedEnd = Math.min(22, baseEnd + 2);
  } else if (totalMultiplier > 1.0) {
    adjustedStart = baseStart;
    adjustedEnd = baseEnd;
  } else if (totalMultiplier > 0.7) {
    adjustedStart = baseStart + 1;
    adjustedEnd = baseEnd - 1;
  } else {
    adjustedStart = baseStart + 2;
    adjustedEnd = baseEnd - 2;
  }

  adjustedStart = Math.max(0, Math.min(23, adjustedStart));
  adjustedEnd = Math.max(adjustedStart + 1, Math.min(24, adjustedEnd));

  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Determine if day is good
  const isGoodDay = (
    totalMultiplier >= 1.0 &&
    nakshatraRule.quality !== "rakshasa" &&
    yogaRule.quality === "auspicious" &&
    karanaRule.quality !== "inauspicious"
  );

  // Get reason in selected language
  let reasons = [];
  if (tithiRule.multiplier < 0.8) {
    reasons.push(language === 'hi' ? `${tithiRule.category} तिथि` : 
                 language === 'te' ? `${tithiRule.category} తిథి` : 
                 `${tithiRule.category} tithi`);
  }
  if (nakshatraRule.quality === "rakshasa") {
    reasons.push(language === 'hi' ? `${nakshatraRule.specialties[0]} नक्षत्र` : 
                 language === 'te' ? `${nakshatraRule.specialties[0]} నక్షత్రం` : 
                 `${nakshatraRule.specialties[0]} nakshatra`);
  }
  if (yogaRule.quality === "inauspicious") {
    const yogaName = yogaRule.name[language] || yogaRule.name.en;
    reasons.push(language === 'hi' ? `${yogaName} योग` : 
                 language === 'te' ? `${yogaName} యోగ` : 
                 `${yogaName} yoga`);
  }
  if (karanaRule.quality === "inauspicious") {
    const karanaName = karanaRule.name[language] || karanaRule.name.en;
    reasons.push(language === 'hi' ? `${karanaName} करण` : 
                 language === 'te' ? `${karanaName} కరణ` : 
                 `${karanaName} karana`);
  }
  if (vaaraRule.multiplier < 0.9) {
    const planetName = vaaraRule.planet[language] || vaaraRule.planet.en;
    reasons.push(language === 'hi' ? `${planetName} वार` : 
                 language === 'te' ? `${planetName} వార` : 
                 `${planetName} vaara`);
  }
  
  const reasonText = reasons.length > 0 
    ? (language === 'hi' ? `सावधान रहें: ${reasons.join(', ')}` : 
       language === 'te' ? `జాగ్రత్తగా ఉండండి: ${reasons.join(', ')}` : 
       `Be cautious: ${reasons.join(', ')}`)
    : (language === 'hi' ? "सभी कारक अनुकूल हैं!" : 
       language === 'te' ? "అన్ని కారకాలు అనుకూలంగా ఉన్నాయి!" : 
       "All factors are favorable!");

  // Get dos and donts based on category with language
  const dosDontsCategory = DOS_DONTS[tithiRule.category] || DOS_DONTS.spiritual;
  const dos = dosDontsCategory.do[language] || dosDontsCategory.do.en;
  const donts = dosDontsCategory.dont[language] || dosDontsCategory.dont.en;

  // Calculate lucky number
  const luckyNumber = ((tithiId + nakshatraId + dayIndex + 1) % 9) + 1;

  // Get deity and worship details with language
  const deity = tithiRule.deity[language] || tithiRule.deity.en;
  const mantra = tithiRule.mantra[language] || tithiRule.mantra.en;
  const worshipMethod = tithiRule.worship[language] || tithiRule.worship.en;

  // Get nakshatra color with language
  const nakshatraColor = nakshatraRule.color[language] || nakshatraRule.color.en;

  // Get gemstone with language
  const gemstone = vaaraRule.gemstone[language] || vaaraRule.gemstone.en;

  // Get lucky color with language
  const luckyColor = vaaraRule.colors[language] || vaaraRule.colors.en;

  // Get yoga name with language
  const yogaName = yogaRule.name[language] || yogaRule.name.en;
  const yogaDesc = yogaRule.description[language] || yogaRule.description.en;

  // Get karana name with language
  const karanaName = karanaRule.name[language] || karanaRule.name.en;
  const karanaDesc = karanaRule.description[language] || karanaRule.description.en;

  // Get nakshatra name with language
  let nakshatraLangName;
  if (language === 'hi') {
    nakshatraLangName = NAKSHATRA_HINDI[nakshatraId - 1] || nakshatraRule.name?.hi || "कृत्तिका";
  } else if (language === 'te') {
    nakshatraLangName = NAKSHATRA_TELUGU[nakshatraId - 1] || nakshatraRule.name?.te || "కృత్తిక";
  } else {
    nakshatraLangName = NAKSHATRA_ENGLISH[nakshatraId - 1] || nakshatraRule.name?.en || "Krittika";
  }

  // Get category description in language
  const categoryDesc = language === 'hi' ? 
    (tithiRule.category === "financial" ? "वित्तीय" :
     tithiRule.category === "administration" ? "प्रशासनिक" :
     tithiRule.category === "creative" ? "रचनात्मक" :
     tithiRule.category === "spiritual" ? "आध्यात्मिक" :
     tithiRule.category === "health" ? "स्वास्थ्य" :
     tithiRule.category === "travel" ? "यात्रा" :
     tithiRule.category === "newBeginnings" ? "नई शुरुआत" :
     tithiRule.category === "household" ? "गृहस्थ" :
     tithiRule.category === "ancestors" ? "पितृ" :
     tithiRule.category === "fasting" ? "उपवास" :
     tithiRule.category === "charity" ? "दान" :
     tithiRule.category === "meditation" ? "ध्यान" :
     tithiRule.category === "eveningRituals" ? "संध्या अनुष्ठान" :
     tithiRule.category === "fullMoon" ? "पूर्णिमा" :
     tithiRule.category === "newMoon" ? "अमावस्या" :
     tithiRule.category === "justice" ? "न्याय" : tithiRule.category) :
    language === 'te' ?
    (tithiRule.category === "financial" ? "ఆర్థిక" :
     tithiRule.category === "administration" ? "పరిపాలన" :
     tithiRule.category === "creative" ? "సృజనాత్మక" :
     tithiRule.category === "spiritual" ? "ఆధ్యాత్మిక" :
     tithiRule.category === "health" ? "ఆరోగ్య" :
     tithiRule.category === "travel" ? "ప్రయాణ" :
     tithiRule.category === "newBeginnings" ? "కొత్త ప్రారంభం" :
     tithiRule.category === "household" ? "గృహ" :
     tithiRule.category === "ancestors" ? "పితృ" :
     tithiRule.category === "fasting" ? "ఉపవాస" :
     tithiRule.category === "charity" ? "దాన" :
     tithiRule.category === "meditation" ? "ధ్యాన" :
     tithiRule.category === "eveningRituals" ? "సాయంత్ర ఆచారాలు" :
     tithiRule.category === "fullMoon" ? "పౌర్ణమి" :
     tithiRule.category === "newMoon" ? "అమావాస్య" :
     tithiRule.category === "justice" ? "న్యాయ" : tithiRule.category) :
    tithiRule.category.replace(/([A-Z])/g, ' $1').trim();

  // Get energy in language
  const energyLang = language === 'hi' ?
    (tithiRule.energy === "prosperity" ? "समृद्धि" :
     tithiRule.energy === "structured" ? "संरचित" :
     tithiRule.energy === "creative" ? "रचनात्मक" :
     tithiRule.energy === "grounding" ? "स्थिरता" :
     tithiRule.energy === "healing" ? "उपचार" :
     tithiRule.energy === "active" ? "सक्रिय" :
     tithiRule.energy === "intense" ? "तीव्र" :
     tithiRule.energy === "respectful" ? "सम्मानजनक" :
     tithiRule.energy === "karmic" ? "कर्मिक" :
     tithiRule.energy === "purifying" ? "शुद्धिकरण" :
     tithiRule.energy === "giving" ? "दानशील" :
     tithiRule.energy === "transformative" ? "परिवर्तनकारी" :
     tithiRule.energy === "protective" ? "सुरक्षात्मक" :
     tithiRule.energy === "completion" ? "पूर्णता" :
     tithiRule.energy === "reflective" ? "चिंतनशील" :
     tithiRule.energy === "cautious" ? "सतर्क" :
     tithiRule.energy === "subdued" ? "शांत" :
     tithiRule.energy === "practical" ? "व्यावहारिक" :
     tithiRule.energy === "conservative" ? "रूढ़िवादी" :
     tithiRule.energy === "maintenance" ? "रखरखाव" :
     tithiRule.energy === "avoid" ? "बचें" :
     tithiRule.energy === "remembrance" ? "स्मरण" :
     tithiRule.energy === "release" ? "मुक्ति" :
     tithiRule.energy === "ancestral" ? "पैतृक" : tithiRule.energy) :
    language === 'te' ?
    (tithiRule.energy === "prosperity" ? "సమృద్ధి" :
     tithiRule.energy === "structured" ? "నిర్మాణాత్మక" :
     tithiRule.energy === "creative" ? "సృజనాత్మక" :
     tithiRule.energy === "grounding" ? "స్థిరత్వం" :
     tithiRule.energy === "healing" ? "చికిత్స" :
     tithiRule.energy === "active" ? "చురుకైన" :
     tithiRule.energy === "intense" ? "తీవ్రమైన" :
     tithiRule.energy === "respectful" ? "గౌరవప్రదమైన" :
     tithiRule.energy === "karmic" ? "కార్మిక" :
     tithiRule.energy === "purifying" ? "శుద్ధి" :
     tithiRule.energy === "giving" ? "దాతృత్వ" :
     tithiRule.energy === "transformative" ? "పరివర్తన" :
     tithiRule.energy === "protective" ? "రక్షణ" :
     tithiRule.energy === "completion" ? "పూర్తి" :
     tithiRule.energy === "reflective" ? "ప్రతిబింబ" :
     tithiRule.energy === "cautious" ? "జాగ్రత్త" :
     tithiRule.energy === "subdued" ? "శాంత" :
     tithiRule.energy === "practical" ? "ఆచరణ" :
     tithiRule.energy === "conservative" ? "సంప్రదాయ" :
     tithiRule.energy === "maintenance" ? "నిర్వహణ" :
     tithiRule.energy === "avoid" ? "నివారించు" :
     tithiRule.energy === "remembrance" ? "స్మరణ" :
     tithiRule.energy === "release" ? "విడుదల" :
     tithiRule.energy === "ancestral" ? "పితృ" : tithiRule.energy) :
    tithiRule.energy;

  return {
    auspicious: {
      time: {
        start: formatTime(adjustedStart),
        end: formatTime(adjustedEnd),
        desc: (language === 'hi' ? `${categoryDesc} गतिविधियाँ अनुशंसित` : 
               language === 'te' ? `${categoryDesc} కార్యకలాపాలు సిఫార్సు చేయబడ్డాయి` : 
               `${categoryDesc} activities recommended`)
      },
      isGoodDay: isGoodDay,
      reason: reasonText,
      multiplier: totalMultiplier.toFixed(2)
    },
    inauspicious: {
      time: {
        start: formatTime(adjustedEnd),
        end: formatTime(adjustedStart + 12 > 24 ? adjustedStart + 12 - 24 : adjustedStart + 12),
        desc: language === 'hi' ? "इस समय महत्वपूर्ण काम से बचें" : 
              language === 'te' ? "ఈ సమయంలో ముఖ్యమైన పనిని నివారించండి" : 
              "Avoid important work during this time"
      },
      hasKarana: karanaRule.quality === "inauspicious",
      hasYoga: yogaRule.quality === "inauspicious",
      karana: karanaName,
      yoga: yogaName
    },
    lucky: {
      color: luckyColor,
      number: luckyNumber,
      nakshatraColor: nakshatraColor,
      gemstone: gemstone
    },
    deity: {
      name: deity,
      worshipMethod: worshipMethod,
      mantra: mantra
    },
    nakshatra: {
      name: nakshatraLangName,
      quality: language === 'hi' ? 
        (nakshatraRule.quality === "deva" ? "देव" : 
         nakshatraRule.quality === "manushya" ? "मनुष्य" : "राक्षस") :
        language === 'te' ?
        (nakshatraRule.quality === "deva" ? "దేవ" : 
         nakshatraRule.quality === "manushya" ? "మానవ" : "రాక్షస") :
        nakshatraRule.quality,
      element: language === 'hi' ?
        (nakshatraRule.element === "earth" ? "पृथ्वी" :
         nakshatraRule.element === "fire" ? "अग्नि" :
         nakshatraRule.element === "water" ? "जल" : "वायु") :
        language === 'te' ?
        (nakshatraRule.element === "earth" ? "భూమి" :
         nakshatraRule.element === "fire" ? "అగ్ని" :
         nakshatraRule.element === "water" ? "జలం" : "గాలి") :
        nakshatraRule.element,
      specialties: nakshatraRule.specialties,
      gana: language === 'hi' ?
        (nakshatraRule.gana === "deva" ? "देव" :
         nakshatraRule.gana === "manushya" ? "मनुष्य" : "राक्षस") :
        language === 'te' ?
        (nakshatraRule.gana === "deva" ? "దేవ" :
         nakshatraRule.gana === "manushya" ? "మానవ" : "రాక్షస") :
        nakshatraRule.gana
    },
    yoga: {
      name: yogaName,
      quality: language === 'hi' ?
        (yogaRule.quality === "auspicious" ? "शुभ" : 
         yogaRule.quality === "inauspicious" ? "अशुभ" : "सामान्य") :
        language === 'te' ?
        (yogaRule.quality === "auspicious" ? "శుభ" : 
         yogaRule.quality === "inauspicious" ? "అశుభ" : "సాధారణ") :
        yogaRule.quality,
      description: yogaDesc
    },
    karana: {
      name: karanaName,
      quality: language === 'hi' ?
        (karanaRule.quality === "auspicious" ? "शुभ" : 
         karanaRule.quality === "inauspicious" ? "अशुभ" : "सामान्य") :
        language === 'te' ?
        (karanaRule.quality === "auspicious" ? "శుభ" : 
         karanaRule.quality === "inauspicious" ? "అశుభ" : "సాధారణ") :
        karanaRule.quality,
      description: karanaDesc
    },
    dosDonts: {
      do: dos,
      dont: donts
    },
    recommendations: {
      bestFor: categoryDesc,
      energy: energyLang,
      planet: vaaraRule.planet[language] || vaaraRule.planet.en,
      mood: language === 'hi' ? `${energyLang} ऊर्जा` : 
            language === 'te' ? `${energyLang} శక్తి` : 
            `${energyLang} energy`
    }
  };
}

// ============================================
// PANCHANG CALCULATION FUNCTION
// ============================================
export function calculateExactPanchang(year, month, date, lat, lon, language = 'en') {
  const obs = new Observer(lat, lon, 0);
  const base = new Date(Date.UTC(year, month - 1, date, 0, 0));

  // Get language-specific constants
  let tithiList, nakshatraList, vaaraList, karanaList, yogaList;
  
  if (language === 'hi') {
    tithiList = TITHI_HINDI;
    nakshatraList = NAKSHATRA_HINDI;
    vaaraList = VAARA_HINDI;
    karanaList = KARANA_HINDI;
    yogaList = YOGA_HINDI;
  } else if (language === 'te') {
    tithiList = TITHI_TELUGU;
    nakshatraList = NAKSHATRA_TELUGU;
    vaaraList = VAARA_TELUGU;
    karanaList = KARANA_TELUGU;
    yogaList = YOGA_TELUGU;
  } else {
    // Default English
    tithiList = TITHI_ENGLISH;
    nakshatraList = NAKSHATRA_ENGLISH;
    vaaraList = VAARA_ENGLISH;
    karanaList = KARANA_ENGLISH;
    yogaList = YOGA_ENGLISH;
  }

  const paksha = PAKSHA[language] || PAKSHA.en;

  // Sunrise / Sunset / Moonrise / Moonset
  const sunrise = SearchRiseSet(Body.Sun, obs, +1, base, 1).date;
  const sunset = SearchRiseSet(Body.Sun, obs, -1, base, 1).date;
  const moonrise = SearchRiseSet(Body.Moon, obs, +1, base, 1).date;
  const moonset = SearchRiseSet(Body.Moon, obs, -1, base, 1).date;

  const tithiArr = [];
  const nakArr = [];
  const karanaArr = [];
  const yogaArr = [];

  const DEG_NAK = 360 / 27;
  const DEG_YOGA = 360 / 27;

  let prevTithi = null,
      prevNak = null,
      prevKarana = null,
      prevYoga = null;

  let tithiStart = sunrise,
      nakStart = sunrise,
      karanaStart = sunrise,
      yogaStart = sunrise;

  for (let t = new Date(sunrise); t <= sunset; t = new Date(t.getTime() + 60 * 1000)) {
    const sun = Equator(Body.Sun, t, obs, true, true);
    const moon = Equator(Body.Moon, t, obs, true, true);

    const sunLon = sun.ra * 15;
    const moonLon = moon.ra * 15;

    const tithiIndex = Math.floor(((moonLon - sunLon + 360) % 360) / 12);
    const nakIndex = Math.floor(moonLon / DEG_NAK);
    const karanaIndex = tithiIndex % 11;
    const yogaIndex = Math.floor(((sunLon + moonLon) % 360) / DEG_YOGA);

    // Tithi
    if (prevTithi === null) prevTithi = tithiIndex;
    if (tithiIndex !== prevTithi) {
      tithiArr.push({
        id: prevTithi + 1,
        index: 0,
        name: tithiList[prevTithi],
        paksha: prevTithi < 15 ? paksha.shukla : paksha.krishna,
        start: tithiStart.toISOString(),
        end: t.toISOString(),
      });
      tithiStart = t;
      prevTithi = tithiIndex;
    }

    // Nakshatra
    if (prevNak === null) prevNak = nakIndex;
    if (nakIndex !== prevNak) {
      nakArr.push({
        id: prevNak + 1,
        name: nakshatraList[prevNak],
        start: nakStart.toISOString(),
        end: t.toISOString(),
      });
      nakStart = t;
      prevNak = nakIndex;
    }

    // Karana
    if (prevKarana === null) prevKarana = karanaIndex;
    if (karanaIndex !== prevKarana) {
      karanaArr.push({
        id: prevKarana + 1,
        index: 0,
        name: karanaList[prevKarana % karanaList.length],
        start: karanaStart.toISOString(),
        end: t.toISOString(),
      });
      karanaStart = t;
      prevKarana = karanaIndex;
    }

    // Yoga
    if (prevYoga === null) prevYoga = yogaIndex;
    if (yogaIndex !== prevYoga) {
      yogaArr.push({
        id: prevYoga + 1,
        name: yogaList[prevYoga % yogaList.length],
        start: yogaStart.toISOString(),
        end: t.toISOString(),
      });
      yogaStart = t;
      prevYoga = yogaIndex;
    }
  }

  // Push last items
  tithiArr.push({
    id: prevTithi + 1,
    index: 0,
    name: tithiList[prevTithi],
    paksha: prevTithi < 15 ? paksha.shukla : paksha.krishna,
    start: tithiStart.toISOString(),
    end: sunset.toISOString(),
  });
  nakArr.push({
    id: prevNak + 1,
    name: nakshatraList[prevNak],
    start: nakStart.toISOString(),
    end: sunset.toISOString(),
  });
  karanaArr.push({
    id: prevKarana + 1,
    index: 0,
    name: karanaList[prevKarana % karanaList.length],
    start: karanaStart.toISOString(),
    end: sunset.toISOString(),
  });
  yogaArr.push({
    id: prevYoga + 1,
    name: yogaList[prevYoga % yogaList.length],
    start: yogaStart.toISOString(),
    end: sunset.toISOString(),
  });

  // Get primary elements for the day
  const primaryTithi = tithiArr.length > 0 ? tithiArr[0] : null;
  const primaryNakshatra = nakArr.length > 0 ? nakArr[0] : null;
  const primaryYoga = yogaArr.length > 0 ? yogaArr[0] : null;
  const primaryKarana = karanaArr.length > 0 ? karanaArr[0] : null;

  // Get dynamic additional information
  const additionalInfo = primaryTithi && primaryNakshatra ? 
    getDynamicAuspiciousInfo(
      primaryTithi.id, 
      primaryNakshatra.id, 
      vaaraList[new Date(year, month - 1, date).getDay()],
      (primaryYoga?.id || 1) - 1, // Convert to 0-based for yoga
      primaryKarana?.id || 1,
      language
    ) : null;

  return {
    vaara: vaaraList[new Date(year, month - 1, date).getDay()],
    tithi: tithiArr,
    nakshatra: nakArr,
    karana: karanaArr,
    yoga: yogaArr,
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    moonrise: moonrise.toISOString(),
    moonset: moonset.toISOString(),
    additionalInfo
  };
}

// ============================================
// GET PANCHANG ENDPOINT
// ============================================
export const getPanchang = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month, date, location } = req.body;

    // Validate inputs
    if (!userId || !year || !month || !date || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch user from DB with language
    const user = await User.findById(userId).select("name dob email mobile language");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get user's language (default English)
    const language = user.language || 'en';

    // Coordinates (Hyderabad default)
    const lat = 17.385;
    const lon = 78.4867;

    // Calculate Panchang with language
    const data = calculateExactPanchang(
      parseInt(year), 
      parseInt(month), 
      parseInt(date), 
      lat, 
      lon,
      language
    );

    res.status(200).json({
      status: "ok",
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        dob: user.dob,
      },
      location,
      data,
    });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// Get Wallet Redemption Status
export const getWalletRedemptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find latest redemption request of the user
    const redemption = await WalletRedemption.findOne({ user: userId })
      .sort({ createdAt: -1 }); // latest first

    if (!redemption) {
      return res.status(404).json({
        status: "error",
        message: "No redemption request found for this account.",
      });
    }

    // Determine message based on status
    let message = "";
    const status = redemption.status.toLowerCase();

    if (status === "Pending") {
      message = "Your redemption request is being processed. It will be completed within 24 hours.";
    } else if (status === "Completed") {
      message = "Your redemption request has been successfully completed. You can check your account.";
    } else if (status === "failed" || status === "Rejected") {
      message = "Your redemption request could not be processed. Please contact support for assistance.";
    } else {
      message = `Redemption status: ${redemption.status}`;
    }

    return res.status(200).json({ status, message });

  } catch (err) {
    console.error("Get Wallet Redemption Status Error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};



export const sendGreetingNotification = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      return res.status(404).json({ message: "User fcmToken not found" });
    }

    // Prepare the notification content
    const notificationData = {
      title: getGreeting(user.name), // e.g., "☀️ Good Afternoon Narasimha varma"
      body: "✨ We have exciting offers waiting for you!",
      type: "GREETING"
    };

    // Normally send the push:
    // await sendPushNotification({
    //   fcmToken: user.fcmToken,
    //   ...notificationData
    // });

    // Respond with exactly what would go in the push
    return res.status(200).json({
      success: true,
      message: "Notification prepared (not sent)",
      data: notificationData
    });

  } catch (err) {
    console.error("sendGreetingNotification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const updateLanguage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { language } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.language = language;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Language updated successfully"
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Error" });
  }
};



export const verifyOTPs = async (req, res) => {
  const { idToken, fcmToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" });
  }

  try {
    // 1. Verify the Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 2. Extract phone number from the verified token
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number not found in token" });
    }

    // Extract mobile number from phone_number format (+911234567890 -> 1234567890)
    const mobile = phoneNumber.replace('+91', '');

    // 3. Find user in your database
    let user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ error: "User not found. Please request OTP first." });
    }

    // Static OTP bypass for special numbers (optional, but maintained for your requirement)
    const staticOtpNumbers = ['9744037599', '9849008143'];
    if (staticOtpNumbers.includes(mobile)) {
      // For static numbers, we can skip token verification but we've already verified via Firebase
      user.isVerified = true;
      user.otp = null;
      user.otpExpiry = null;
    }

    // For all users (including static numbers), update verification status
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    //  Store/update fcmToken if provided
    if (fcmToken) user.fcmToken = fcmToken;

    await user.save();

    // 4. Return the EXACT SAME RESPONSE STRUCTURE
    res.status(200).json({
      message: "OTP verified successfully",
      user
    });

  } catch (err) {
    console.error("Token Verification Error:", err);

    // Handle specific Firebase token errors
    if (err.code === 'auth/id-token-expired') {
      return res.status(400).json({ error: "Token has expired" });
    }
    if (err.code === 'auth/argument-error') {
      return res.status(400).json({ error: "Invalid token" });
    }

    res.status(500).json({ error: "Server error" });
  }
};






// ✅ Send message with optional images, socket, and push notification
export const sendMessageController = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const { message } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ success: false, message: "Sender and receiver IDs are required" });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: "Invalid sender or receiver ID" });
    }

    // Fetch sender user
    const sender = await User.findById(senderId).lean();
    if (!sender) return res.status(404).json({ success: false, message: "Sender not found" });

    // Optional: Check if receiverId exists in sender's customers (warning only)
    const customer = sender.customers?.find(cust => cust._id.toString() === receiverId);
    if (!customer) console.warn("⚠️ Receiver is not a customer of sender, but message will still be sent.");

    // Upload images if any
    let images = [];
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: 'chat_images' });
        images.push(result.secure_url);
      }
    }

    // Save chat regardless of receiver existence
    const newChat = new Chat({
      senderId,
      receiverId,
      message: message || '',
      images,
    });

    const savedChat = await newChat.save();

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const roomId = `${senderId}_${receiverId}`;
      io.to(roomId).emit('receiveMessage', savedChat);
      console.log(`📤 Message emitted to room: ${roomId}`);
    }

    // 🔔 PUSH NOTIFICATION (Non-blocking, safe)
    sendPushNotification({
      receiverId,
      senderName: sender.name,
      messageText: message,
      hasImage: images.length > 0,
      chatId: savedChat._id,
      senderId,
    }).catch(err => console.error("Push error (ignored):", err.message));

    return res.status(201).json({ success: true, message: "Message sent successfully", chat: savedChat });

  } catch (error) {
    console.error("❌ Send message error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Get chat messages between two users using route params
// ✅ Get chat between two users
// ✅ Get chat messages between two users (or sender + receiverId even if receiver not in User)
export const getChatMessagesController = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    if (!senderId || !receiverId) {
      return res.status(400).json({ success: false, message: "Sender and receiver IDs are required" });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: "Invalid sender or receiver ID" });
    }

    // Fetch chats between sender and receiver (both directions)
    const chats = await Chat.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });

    // Optionally emit via Socket.IO if you want to notify client that chats were fetched
    const io = req.app.get('io');
    if (io) {
      const roomId = `${senderId}_${receiverId}`;
      io.to(roomId).emit('chatsFetched', chats);
      console.log(`📤 Chats emitted to room: ${roomId}`);
    }

    return res.status(200).json({ success: true, chats });

  } catch (error) {
    console.error("❌ Get chat error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};




export const getNotificationsByUserId = async (req, res) => {
  try {

    const { userId } = req.params;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalNotifications: notifications.length,
      notifications
    });

  } catch (error) {

    console.error("Get notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};



// Delete specific notifications by IDs for a user
export const deleteNotificationsByIds = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notificationIds } = req.body; // Expecting an array of notification IDs

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required!" });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Notification IDs are required and should be a non-empty array.",
      });
    }

    // ✅ Delete notifications matching userId and IDs
    const result = await Notification.deleteMany({
      userId,
      _id: { $in: notificationIds },
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notification(s) deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting notifications",
      error: error.message,
    });
  }
};


export const googleLogin = async (req, res) => {
  const { provider, firebaseIdToken, fcmToken } = req.body;

  if (!provider || !firebaseIdToken) {
    return res.status(400).json({
      error: "Provider and firebaseIdToken are required"
    });
  }

  if (provider !== "google") {
    return res.status(400).json({
      error: "Invalid provider"
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);

    const email = decodedToken.email;
    const name = decodedToken.name;
    const firebaseUid = decodedToken.uid;
    const mobile = decodedToken.phone_number || null;

    let user = await User.findOne({
      $or: [{ email }, { firebaseUid }]
    });

    if (!user) {
      user = new User({
        name,
        email,
        firebaseUid,
        mobile,
        provider: "google",
        isVerified: true,
        fcmToken: fcmToken || null
      });

      await user.save();
    } else {
      if (fcmToken) {
        user.fcmToken = fcmToken;
        await user.save();
      }
    }

    const userLanguage = user.language || "en";

    let displayUser = user.toObject ? user.toObject() : { ...user };

    const successMsg =
      userLanguage === "hi"
        ? "सफलतापूर्वक लॉगिन हुआ"
        : "Login successful";

    return res.status(200).json({
      message: successMsg,
      user: displayUser
    });

  } catch (error) {
    console.error("Google Login Error:", error);

    return res.status(500).json({
      error: "Google login failed"
    });
  }
};



export const removeBackground = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "Image is required" });
    }

    const file = req.files.image;

    // Input & Output paths
    const inputPath = path.join("uploads", `${Date.now()}_${file.name}`);
    const outputPath = path.join("uploads", `output_${Date.now()}.png`);

    await file.mv(inputPath);

    // Python script path
    const pythonScript = path.join("bg_remove.py");

    exec(`python3 ${pythonScript} ${inputPath} ${outputPath}`, (error) => {
      if (error) {
        console.error("BG removal error:", error);
        return res.status(500).json({ message: "Background removal failed" });
      }

      res.sendFile(path.resolve(outputPath));
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const addWalletReward = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, duration } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const config = await WalletConfig.findOne();

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Wallet config not set",
      });
    }

    // wallet update
    user.wallet = (user.wallet || 0) + config.amount;

    // store reward history
    user.rewardHistory.push({
      date,
      duration,
      amount: config.amount,
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Wallet updated successfully",
      addedAmount: config.amount,
      wallet: user.wallet,
      date,
      duration,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


export const getTodayReward = async (req, res) => {
  try {
    const { userId } = req.params;

    const today = new Date().toISOString().split("T")[0];

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const todayData = user.rewardHistory.find(
      (item) => item.date === today
    );

    return res.status(200).json({
      success: true,
      amount: todayData ? todayData.amount : 0,
      duration: todayData ? todayData.duration : 0,
      date: todayData ? todayData.date : today,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const addUserBusinessCard = async (req, res) => {
  try {
    const { userId } = req.params;
    const businessCardData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    if (!businessCardData || Object.keys(businessCardData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Business card data is required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Logo upload (Cloudinary)
    let logoUrl = businessCardData.logo || "";
    if (req.files && req.files.logo) {
      const file = req.files.logo;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "business_cards",
        resource_type: "auto",
      });
      logoUrl = result.secure_url;
    }

    // ✅ socialLinks handling: JSON parse if sent as string
    let socialLinks = [];
    if (businessCardData.socialLinks) {
      try {
        socialLinks = JSON.parse(businessCardData.socialLinks);
        if (!Array.isArray(socialLinks)) socialLinks = [];
      } catch (err) {
        socialLinks = [];
      }
    }

    const newBusinessCard = {
      name: businessCardData.name || '',
      title: businessCardData.title || '',
      company: businessCardData.company || '',
      email: businessCardData.email || '',
      phone: businessCardData.phone || '',
      address: businessCardData.address || '',
      website: businessCardData.website || '',
      logo: logoUrl,
      socialLinks, // ✅ updated here
      createdAt: new Date(),
      updatedAt: new Date(),
      cardId: Date.now().toString()
    };

    user.userBusinessCards.push(newBusinessCard);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Business card added successfully",
      data: newBusinessCard,
      totalCards: user.userBusinessCards.length
    });

  } catch (error) {
    console.error("Error adding business card:", error);
    res.status(500).json({
      success: false,
      message: "Error adding business card",
      error: error.message
    });
  }
};
// ─────────────────────────────────────────────
// Helper: URL se image Buffer fetch karo
// ─────────────────────────────────────────────
const fetchImageBuffer = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
};
 
// ─────────────────────────────────────────────
// Helper: Template image pe user data overlay karo
// Returns: Cloudinary URL of overlaid image
// ─────────────────────────────────────────────
const overlayTextOnTemplate = async (templateImageUrl, textStyles, logoUrl, logoSettings, socialLinks) => {
  try {
    // 1. Template image load karo
    const templateBuffer = await fetchImageBuffer(templateImageUrl);
    const templateImg = await loadImage(templateBuffer);
 
    const CARD_W = templateImg.width;
    const CARD_H = templateImg.height;
 
    // 2. Canvas banao template size ka
    const canvas = createCanvas(CARD_W, CARD_H);
    const ctx = canvas.getContext('2d');
 
    // 3. Template image draw karo
    ctx.drawImage(templateImg, 0, 0, CARD_W, CARD_H);
 
    // 4. Text fields overlay karo
    const fields = ['name', 'title', 'company', 'email', 'phone', 'address', 'website'];
 
    for (const field of fields) {
      const style = textStyles?.[field];
      if (!style || !style.text) continue; // empty text skip
 
      const fontSize = style.fontSize || 14;
      const fontWeight = style.fontWeight || 'normal';
      const fontFamily = 'sans-serif';
      const color = style.color || '#000000';
      const italic = style.italic ? 'italic ' : '';
 
      // X, Y - ye template ke stored coordinates hain
      // Canvas coordinates: x, y as-is (already in px relative to card)
      const x = style.x ?? 50;
      const y = style.y ?? 100;
 
      ctx.save();
      ctx.font = `${italic}${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
 
      // Underline support
      if (style.underline) {
        const textWidth = ctx.measureText(style.text).width;
        ctx.fillRect(x, y + fontSize + 2, textWidth, 1);
      }
 
      ctx.fillText(style.text, x, y);
      ctx.restore();
    }
 
    // 5. Logo overlay karo (agar logo URL hai)
    if (logoUrl && logoSettings) {
      try {
        const logoBuffer = await fetchImageBuffer(logoUrl);
        const logoImg = await loadImage(logoBuffer);
 
        const lx = logoSettings.x ?? 20;
        const ly = logoSettings.y ?? 20;
        const lw = logoSettings.width ?? 70;
        const lh = logoSettings.height ?? 70;
        const shape = logoSettings.shape || 'rectangle';
        const br = logoSettings.borderRadius || 0;
 
        ctx.save();
 
        // Clipping path (circle ya rounded rectangle)
        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
          ctx.clip();
        } else if (br > 0) {
          ctx.beginPath();
          ctx.roundRect(lx, ly, lw, lh, br);
          ctx.clip();
        }
 
        ctx.drawImage(logoImg, lx, ly, lw, lh);
 
        // Border draw karo (agar borderWidth > 0)
        if (logoSettings.borderWidth > 0) {
          ctx.strokeStyle = logoSettings.borderColor || '#000000';
          ctx.lineWidth = logoSettings.borderWidth;
          if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.strokeRect(lx, ly, lw, lh);
          }
        }
 
        ctx.restore();
      } catch (logoErr) {
        console.warn('Logo load failed, skipping:', logoErr.message);
      }
    }
 
    // 6. Social links icons overlay karo
    if (socialLinks && socialLinks.length > 0) {
      for (const social of socialLinks) {
        if (!social.iconUrl) continue;
 
        try {
          const iconBuffer = await fetchImageBuffer(social.iconUrl);
          const iconImg = await loadImage(iconBuffer);
 
          const ix = social.x ?? 50;
          const iy = social.y ?? 400;
          const iconSize = social.iconSize ?? 30;
 
          ctx.drawImage(iconImg, ix, iy, iconSize, iconSize);
 
          // URL text bhi show karo (agar showUrl true hai)
          if (social.showUrl && social.url) {
            ctx.save();
            ctx.font = `${social.urlFontSize || 12}px sans-serif`;
            ctx.fillStyle = social.urlColor || '#666666';
            ctx.textBaseline = 'middle';
            ctx.fillText(social.url, ix + iconSize + 8, iy + iconSize / 2);
            ctx.restore();
          }
        } catch (iconErr) {
          console.warn(`Icon load failed for ${social.platform}, skipping:`, iconErr.message);
        }
      }
    }
 
    // 7. Canvas ko PNG buffer mein convert karo
    const outputBuffer = canvas.toBuffer('image/png');
 
    // 8. Cloudinary pe upload karo
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'business-cards/overlays',
          format: 'png',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(outputBuffer);
    });
 
    return uploadResult.secure_url;
 
  } catch (error) {
    console.error('overlayTextOnTemplate error:', error.message);
    return null; // fallback: null return karo
  }
};
 
// ─────────────────────────────────────────────
// ✅ GET All Business Cards Controller
// ─────────────────────────────────────────────
export const getUserBusinessCards = async (req, res) => {
  try {
    const { userId } = req.params;
 
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }
 
    // 1. User fetch karo
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
 
    // 2. Saare templates fetch karo
    const templates = await BusinessCard.find().sort({ createdAt: -1 });
 
    // 3. User ke cards process karo — har card pe template overlay karo
    const userMappedCards = await Promise.all(
      (user.userBusinessCards || []).map(async (userCard) => {
        // Pehla template use karo (ya matching template logic add kar sakte ho)
        const template = templates[0] || {};
        const templateTextStyles = template.textStyles || {};
 
        // Template positions + user data combine karo
        const overlayTextStyles = {};
        const fields = ['name', 'title', 'company', 'email', 'phone', 'address', 'website'];
 
        fields.forEach((field) => {
          const templateStyle = templateTextStyles[field] || {};
          overlayTextStyles[field] = {
            fontSize: templateStyle.fontSize || 24,
            fontWeight: templateStyle.fontWeight || 'normal',
            color: templateStyle.color || '#000000',
            italic: templateStyle.italic || false,
            underline: templateStyle.underline || false,
            x: templateStyle.x ?? 50,
            y: templateStyle.y ?? 100,
            text: userCard[field] || '', // 👈 User ka actual data
          };
        });
 
        const overlayLogoSettings = template.logoSettings || {
          x: 20, y: 20, width: 70, height: 70,
          borderRadius: 8, borderWidth: 0, borderColor: '#000000', shape: 'rectangle',
        };
 
        const overlayDesign = template.design || {
          backgroundColor: '#ffffff', textColor: '#000000', accentColor: '#3b82f6',
          fontFamily: 'Poppins', fontSize: '14', showLogo: true, showQrCode: false,
          roundedCorners: true, shadow: true, border: true,
        };
 
        // Social links merge karo
        const userSocialLinks = userCard.socialLinks || [];
        const templateSocialLinks = template.socialLinks || [];
 
        const mergedSocialLinks = userSocialLinks.map((userSocial, idx) => {
          const templateSocial = templateSocialLinks[idx] || {};
          return {
            ...userSocial,
            x: templateSocial.x ?? 50,
            y: templateSocial.y ?? 400 + idx * 40,
            iconSize: templateSocial.iconSize || 30,
            showUrl: templateSocial.showUrl !== undefined ? templateSocial.showUrl : true,
            urlColor: templateSocial.urlColor || '#666666',
            urlFontSize: templateSocial.urlFontSize || 12,
          };
        });
 
        // ✅ Template image pe overlay karo — overlaid image URL generate karo
        const templateImageUrl = template.templateImage || '';
        let overlaidImageUrl = '';
 
        if (templateImageUrl) {
          overlaidImageUrl = await overlayTextOnTemplate(
            templateImageUrl,
            overlayTextStyles,
            userCard.logo || '',
            overlayLogoSettings,
            mergedSocialLinks
          );
        }
 
        return {
          _id: userCard.cardId || new mongoose.Types.ObjectId().toString(),
 
          // Overlay data
          textStyles: overlayTextStyles,
          logoSettings: overlayLogoSettings,
          design: overlayDesign,
          socialLinks: mergedSocialLinks,
 
          useTemplate: true,
          templateImage: templateImageUrl,           // Original template (reference ke liye)
          overlaidImage: overlaidImageUrl || '',     // ✅ User data overlay ki hui image
          qrCode: template.qrCode || '',
 
          createdAt: userCard.createdAt,
          updatedAt: userCard.updatedAt,
 
          // User ka original data
          name: userCard.name || '',
          title: userCard.title || '',
          company: userCard.company || '',
          email: userCard.email || '',
          phone: userCard.phone || '',
          address: userCard.address || '',
          website: userCard.website || '',
          logo: userCard.logo || '',
          previewImage: userCard.previewImage || overlaidImageUrl || '', // ✅ overlaid image fallback
 
          source: 'user_profile',
        };
      })
    );
 
    // 4. Original templates include karo (unchanged)
    const originalTemplates = templates.map((card) => {
      const cardObj = card.toObject();
      const fields = ['name', 'title', 'company', 'email', 'phone', 'address', 'website'];
 
      fields.forEach((field) => {
        if (cardObj.textStyles && cardObj.textStyles[field]) {
          cardObj.textStyles[field].text = cardObj[field] || '';
        }
      });
 
      return {
        ...cardObj,
        source: 'business_card_schema',
      };
    });
 
    // 5. Combine karo
    const combinedCards = [...userMappedCards, ...originalTemplates];
 
    res.status(200).json({
      success: true,
      counts: {
        fromUserProfile: userMappedCards.length,
        fromBusinessCardSchema: originalTemplates.length,
        total: combinedCards.length,
      },
      data: combinedCards,
    });
 
  } catch (error) {
    console.error('Error fetching business cards:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching business cards',
      error: error.message,
    });
  }
};


const convertImageToPDF = async (imageUrl) => {
  try {
    if (!imageUrl) {
      console.warn('No image URL provided for PDF conversion');
      return null;
    }

    // 1. Image fetch karo
    const imageBuffer = await fetchImageBuffer(imageUrl);
    
    // 2. PDF document create karo
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    
    // 3. Image load karo (PNG ya JPG)
    let image;
    try {
      image = await pdfDoc.embedPng(imageBuffer);
    } catch (err) {
      try {
        image = await pdfDoc.embedJpg(imageBuffer);
      } catch (jpgErr) {
        console.error('Failed to embed image:', jpgErr.message);
        return null;
      }
    }
    
    // 4. Image dimensions lo
    const { width, height } = image.scale(1);
    
    // 5. Page size set karo image ke according
    page.setSize(width, height);
    
    // 6. Image draw karo
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });
    
    // 7. PDF buffer generate karo
    const pdfBuffer = await pdfDoc.save();
    
    // 8. Cloudinary pe PDF upload karo
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'business-cards/pdfs',
          resource_type: 'auto',  // 'auto' se Cloudinary automatically detect karega
          public_id: `business_card_${Date.now()}`,  // .pdf mat lagao, Cloudinary auto add karega
          format: 'pdf',  // format specify kar do
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(pdfBuffer);
    });
    
    // 9. Secure URL return karo (bina fl_attachment ke, browser me open hogi)
    // Cloudinary automatically .pdf extension add kar dega
    return uploadResult.secure_url;
    
  } catch (error) {
    console.error('Error converting image to PDF:', error.message);
    return null;
  }
};

// export const getSingleBusinessCard = async (req, res) => {
//    try {
//     const { userId, businessCardId } = req.params;

//     if (!userId || !businessCardId) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID and Template ID are required',
//       });
//     }

//     // 1. User fetch karo
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // 2. Template (Business Card) fetch karo
//     const template = await BusinessCard.findById(businessCardId);
//     if (!template) {
//       return res.status(404).json({
//         success: false,
//         message: 'Template not found',
//       });
//     }

//     // 3. User ke saare business cards process karo
//     const processedCards = await Promise.all(
//       (user.userBusinessCards || []).map(async (userCard, index) => {
//         // Template positions + user card data combine karo
//         const templateTextStyles = template.textStyles || {};
//         const overlayTextStyles = {};
//         const fields = ['name', 'title', 'company', 'email', 'phone', 'address', 'website'];

//         fields.forEach((field) => {
//           const templateStyle = templateTextStyles[field] || {};
//           overlayTextStyles[field] = {
//             fontSize: templateStyle.fontSize || 24,
//             fontWeight: templateStyle.fontWeight || 'normal',
//             color: templateStyle.color || '#000000',
//             italic: templateStyle.italic || false,
//             underline: templateStyle.underline || false,
//             x: templateStyle.x ?? 50,
//             y: templateStyle.y ?? 100,
//             text: userCard[field] || '',
//           };
//         });

//         // Logo settings
//         const overlayLogoSettings = template.logoSettings || {
//           x: 20, y: 20, width: 70, height: 70,
//           borderRadius: 8, borderWidth: 0, borderColor: '#000000', shape: 'rectangle',
//         };

//         // Design settings
//         const overlayDesign = template.design || {
//           backgroundColor: '#ffffff', textColor: '#000000', accentColor: '#3b82f6',
//           fontFamily: 'Poppins', fontSize: '14', showLogo: true, showQrCode: false,
//           roundedCorners: true, shadow: true, border: true,
//         };

//         // Social links
//         const userSocialLinks = userCard.socialLinks || [];
//         const templateSocialLinks = template.socialLinks || [];
        
//         const mergedSocialLinks = userSocialLinks.map((userSocial, idx) => {
//           const templateSocial = templateSocialLinks[idx] || {};
//           return {
//             platform: userSocial.platform,
//             url: userSocial.url,
//             iconUrl: userSocial.iconUrl,
//             iconName: userSocial.iconName,
//             color: userSocial.color,
//             x: templateSocial.x ?? 50,
//             y: templateSocial.y ?? 400 + idx * 40,
//             iconSize: templateSocial.iconSize || 30,
//             showUrl: templateSocial.showUrl !== undefined ? templateSocial.showUrl : true,
//             urlColor: templateSocial.urlColor || '#666666',
//             urlFontSize: templateSocial.urlFontSize || 12,
//           };
//         });

//         // Overlay image generate karo
//         const templateImageUrl = template.templateImage || '';
//         let overlaidImageUrl = '';

//         if (templateImageUrl) {
//           overlaidImageUrl = await overlayTextOnTemplate(
//             templateImageUrl,
//             overlayTextStyles,
//             userCard.logo || '',
//             overlayLogoSettings,
//             mergedSocialLinks
//           );
//         }

//         // 🔥 PDF generate karo overlaid image se
//         let pdfUrl = '';
//         if (overlaidImageUrl) {
//           pdfUrl = await convertImageToPDF(overlaidImageUrl);
//         }

//         return {
//           _id: userCard.cardId || userCard._id || `card_${index}`,
          
//           // User card ka original data
//           name: userCard.name || '',
//           title: userCard.title || '',
//           company: userCard.company || '',
//           email: userCard.email || '',
//           phone: userCard.phone || '',
//           address: userCard.address || '',
//           website: userCard.website || '',
//           logo: userCard.logo || '',
//           previewImage: userCard.previewImage || overlaidImageUrl || '',
//           socialLinks: mergedSocialLinks,
          
//           // Images (PNG and PDF)
//           overlaidImage: overlaidImageUrl || '',           // PNG image
//           overlaidPdf: pdfUrl || '',                       // 🔥 PDF version
          
//           // Template styling
//           templateId: template._id,
//           templateImage: templateImageUrl,
//           textStyles: overlayTextStyles,
//           logoSettings: overlayLogoSettings,
//           design: overlayDesign,
          
//           // Metadata
//           createdAt: userCard.createdAt,
//           updatedAt: userCard.updatedAt,
//         };
//       })
//     );

//     res.status(200).json({
//       success: true,
//       data: {
//         template: {
//           _id: template._id,
//           name: template.name || 'Template',
//           templateImage: template.templateImage,
//         },
//         userCards: processedCards,
//         counts: {
//           total: processedCards.length,
//         },
//       },
//     });

//   } catch (error) {
//     console.error('Error fetching user business cards with template:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching business cards',
//       error: error.message,
//     });
//   }
// };


export const getSingleBusinessCard = async (req, res) => {
  try {
    const { userId, businessCardId } = req.params;

    if (!userId || !businessCardId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Template ID are required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const template = await BusinessCard.findById(businessCardId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Bas pehla user card process karenge (array nahi chahiye)
    const userCard = (user.userBusinessCards || [])[0] || {};

    const templateTextStyles = template.textStyles || {};
    const overlayTextStyles = {};
    const fields = ['name', 'title', 'company', 'email', 'phone', 'address', 'website'];

    fields.forEach((field) => {
      const templateStyle = templateTextStyles[field] || {};
      overlayTextStyles[field] = {
        fontSize: templateStyle.fontSize || 24,
        fontWeight: templateStyle.fontWeight || 'normal',
        color: templateStyle.color || '#000000',
        italic: templateStyle.italic || false,
        underline: templateStyle.underline || false,
        x: templateStyle.x ?? 50,
        y: templateStyle.y ?? 100,
        text: userCard[field] || '',
      };
    });

    const overlayLogoSettings = template.logoSettings || {
      x: 20, y: 20, width: 70, height: 70,
      borderRadius: 8, borderWidth: 0, borderColor: '#000000', shape: 'rectangle',
    };

    const userSocialLinks = userCard.socialLinks || [];
    const templateSocialLinks = template.socialLinks || [];
    const mergedSocialLinks = userSocialLinks.map((userSocial, idx) => {
      const templateSocial = templateSocialLinks[idx] || {};
      return {
        platform: userSocial.platform,
        url: userSocial.url,
        iconUrl: userSocial.iconUrl,
        iconName: userSocial.iconName,
        color: userSocial.color,
        x: templateSocial.x ?? 50,
        y: templateSocial.y ?? 400 + idx * 40,
        iconSize: templateSocial.iconSize || 30,
        showUrl: templateSocial.showUrl !== undefined ? templateSocial.showUrl : true,
        urlColor: templateSocial.urlColor || '#666666',
        urlFontSize: templateSocial.urlFontSize || 12,
      };
    });

    const templateImageUrl = template.templateImage || '';
    let overlaidImageUrl = '';
    if (templateImageUrl) {
      overlaidImageUrl = await overlayTextOnTemplate(
        templateImageUrl,
        overlayTextStyles,
        userCard.logo || '',
        overlayLogoSettings,
        mergedSocialLinks
      );
    }

    let pdfUrl = '';
    if (overlaidImageUrl) {
      pdfUrl = await convertImageToPDF(overlaidImageUrl);
    }

    // ✅ Array ko object me convert karke response
    const processedCard = {
      overlaidImage: overlaidImageUrl || '',
      overlaidPdf: pdfUrl || '',
      templateId: template._id,
    };

    res.status(200).json({
      success: true,
      data: processedCard,
    });

  } catch (error) {
    console.error('Error fetching user business card:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching business card',
      error: error.message,
    });
  }
};


const razorpay = new Razorpay({
  key_id: "rzp_test_BxtRNvflG06PTV",
  key_secret: "RecEtdcenmR7Lm4AIEwo4KFr",
});


export const createUserPayment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemName, itemId, amount } = req.body;
    
    // File from form-data
    const file = req.files?.media; // assuming field name is 'media'

   

    // Check if file is provided
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Media file (image/video) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if item exists in DB
    let itemExists;
    let folderName;
    switch (itemName.toLowerCase()) {
      case "poster":
        itemExists = await Poster.exists({ _id: itemId });
        folderName = "poster-payments";
        break;
      case "reels":
        itemExists = await Reel.exists({ _id: itemId });
        folderName = "reels-payments";
        break;
      case "sticker":
        itemExists = await Sticker.exists({ _id: itemId });
        folderName = "sticker-payments";
        break;
      case "logo":
        itemExists = await Logo.exists({ _id: itemId });
        folderName = "logo-payments";
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid itemName" });
    }

    if (!itemExists) {
      return res.status(404).json({ success: false, message: `${itemName} item not found` });
    }

    // Determine media type
    const mediaType = file.mimetype.startsWith("image/") ? "image" : "video";
    
    // Upload to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: folderName,
        resource_type: mediaType === "video" ? "video" : "image",
      });
      
      // Delete temp file
      fs.unlinkSync(file.tempFilePath);
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload media",
        error: uploadError.message,
      });
    }

    // Create payment record with media URL
    const payment = await UserPayments.create({
      userId,
      itemName: itemName.toLowerCase(),
      itemId,
      amount,
      mediaUrl: cloudinaryResult.secure_url,
      mediaType: mediaType,
      status: "pending",
      paidAt: null,
      transactionId: null,
    });

    res.status(201).json({
      success: true,
      message: `${itemName} payment initiated (Pending confirmation)`,
      payment: {
        _id: payment._id,
        itemName: payment.itemName,
        amount: payment.amount,
        mediaUrl: payment.mediaUrl,
        status: payment.status,
      },
    });

  } catch (error) {
    console.error("UserPayment Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};

export const getUserPaymentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const payments = await UserPayments.find({ userId })
      .sort({ paidAt: -1 })
      .lean();

    // 🔥 Populate item details dynamically
    const populatedPayments = await Promise.all(
      payments.map(async (p) => {
        let itemDetails = null;

        switch (p.itemName.toLowerCase()) {
          case "poster":
            itemDetails = await Poster.findById(p.itemId).lean();
            break;
          case "reels":
            itemDetails = await Reel.findById(p.itemId).lean();
            break;
          case "sticker":
            itemDetails = await Sticker.findById(p.itemId).lean();
            break;
          case "logo":
            itemDetails = await Logo.findById(p.itemId).lean();
            break;
        }

        return {
          ...p,
          itemDetails, // populate item details here
        };
      })
    );

    res.status(200).json({
      success: true,
      message: `Payments for user ${userId} fetched successfully`,
      data: populatedPayments,
    });

  } catch (error) {
    console.error("Get UserPayments Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user payments",
      error: error.message,
    });
  }
};


export const getAllUserPaymentsAdmin = async (req, res) => {
  try {
    const payments = await UserPayments.find()
      .sort({ paidAt: -1 })
      .lean();

    const populatedPayments = await Promise.all(
      payments.map(async (p) => {
        // 1️⃣ Populate item details dynamically
        let itemDetails = null;
        switch (p.itemName.toLowerCase()) {
          case "poster":
            itemDetails = await Poster.findById(p.itemId).lean();
            break;
          case "reels":
            itemDetails = await Reel.findById(p.itemId).lean();
            break;
          case "sticker":
            itemDetails = await Sticker.findById(p.itemId).lean();
            break;
          case "logo":
            itemDetails = await Logo.findById(p.itemId).lean();
            break;
        }

        // 2️⃣ Populate user details
        const user = await User.findById(p.userId)
          .select("name email mobile")
          .lean();

        return {
          ...p,
          itemDetails, // item info
          user: user || null, // user info
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "All user payments fetched successfully with user info",
      data: populatedPayments,
    });

  } catch (error) {
    console.error("Get All UserPayments Admin Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching all user payments",
      error: error.message,
    });
  }
};