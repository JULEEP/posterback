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
import {sendPushNotification} from "../utils/sendPushNotification.js"
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
  if (!mobile) return res.status(400).json({ message: "Mobile is required" });

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

      return res.status(200).json({
        message: "OTP generated successfully",
        otp,
        user: {
          _id: user._id,
          name: user.name || null,
          email: user.email || null,
          mobile: user.mobile,
          wallet: user.wallet || 0,
          isVerified: user.isVerified || false,
          isSubscribedPlan: user.isSubscribedPlan || false,
          free7DayTrial: user.free7DayTrial,
          trialExpiryDate: user.trialExpiryDate
        }
      });

    } else {
      // New user (temp)
      const trialExpiryDate = moment().add(7, 'days').toDate();

      user = new User({
        mobile,
        otp,
        otpExpiry: new Date(Date.now() + 60 * 1000),
        free7DayTrial: true,
        trialExpiryDate
      });
      await user.save();

      return res.status(200).json({
        message: "OTP generated successfully",
        otp,
        user: {
          _id: user._id,
          mobile: user.mobile,
          free7DayTrial: true,
          trialExpiryDate
        }
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    return res.status(400).json({ error: "Mobile and OTP are required" });
  }

  try {
    let user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ error: "User not found. Please request OTP first." });
    }

    // Static OTP check for special numbers
    const staticOtpNumbers = ['9744037599', '9849008143'];
    if (staticOtpNumbers.includes(mobile) && otp === '1234') {
      user.isVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      
      if (fcmToken) user.fcmToken = fcmToken; // ✅ Store fcmToken

      await user.save();

      return res.status(200).json({ 
        message: "OTP verified successfully", 
        user 
      });
    }

    // Normal OTP validation
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (user.otpExpiry < Date.now()) return res.status(400).json({ error: "OTP has expired" });

    // OTP is valid: mark verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    
    if (fcmToken) user.fcmToken = fcmToken; // ✅ Store fcmToken

    await user.save();

    res.status(200).json({ 
      message: "OTP verified successfully", 
      user 
    });

  } catch (err) {
    console.error("OTP Verification Error:", err);
    res.status(500).json({ error: "Server error" });
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
    const userId = req.params.userId; // Get the user ID from request params

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // ✅ Check if trial has expired
    let freeTrialActive = user.free7DayTrial;
    if (user.trialExpiryDate && new Date() > new Date(user.trialExpiryDate)) {
      freeTrialActive = false;
    }

    return res.status(200).json({
      message: 'User details retrieved successfully!',
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage || 'default-profile-image.jpg',
      wallet: user.wallet || 0, // Include wallet amount
      free7DayTrial: freeTrialActive, // Show trial status
      trialExpiryDate: user.trialExpiryDate || null, // Show trial expiry
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};





// User Controller (UPDATE User)
export const updateUser = [
  upload.single('profileImage'),  // 'profileImage' is the field name in the Form Data
  async (req, res) => {
    try {
      const userId = req.params.id;  // Get the user ID from request params
      const { name, email, mobile } = req.body;

      // Find the user by ID
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found!' });
      }

      // Check if the email or mobile is already taken by another user
      const userExist = await User.findOne({
        $or: [{ email }, { mobile }],
      });

      if (userExist && userExist._id.toString() !== userId) {
        return res.status(400).json({
          message: 'Email or mobile is already associated with another user.',
        });
      }

      // Update user details
      user.name = name || user.name;
      user.email = email || user.email;
      user.mobile = mobile || user.mobile;

      // Check if a new profile image is uploaded
      if (req.file) {
        // Update the profile image
        user.profileImage = `/uploads/profiles/${req.file.filename}`;
      }

      // Save the updated user to the database
      await user.save();

      return res.status(200).json({
        message: 'User updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          profileImage: user.profileImage,  // Return the updated profile image
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
];





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
      return res.status(404).json({ message: 'User not found!' });
    }

    // Respond with user details along with subscribed plans and include dob and marriageAnniversaryDate
    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
      dob: user.dob || null,  // Return dob or null if not present
      marriageAnniversaryDate: user.marriageAnniversaryDate || null,  // Return marriageAnniversaryDate or null if not present
      subscribedPlans: user.subscribedPlans,  // Include subscribedPlans in the response
      wallet: user.wallet || 0, // ✅ Include wallet balance (default to 0)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
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
        path: 'user',   // This refers to the 'user' field in the Story schema
        select: 'name profileImage',   // Select both the 'name' and 'profileImage' fields from the User model
      })
      .sort({ expired_at: 1 });  // Sorting by expiration time (ascending)

    // Filter out stories where images and videos are empty but caption exists
    const filteredStories = stories.filter(story => {
      // Keep stories where caption exists, but either images or videos should not be empty
      return (
        (story.caption && story.caption.trim() !== '') &&
        ((story.images && story.images.length > 0) || (story.videos && story.videos.length > 0))
      );
    });

    // Log filtered stories for debugging
    console.log("Filtered Stories: ", filteredStories);

    // Return the filtered stories in the response
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


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_hNwWuDNHuEICmT',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'haiixCtWn3RTXzUWAwZJSQjg'
});


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
        message: 'User not found',
      });
    }

    // ✅ defaults (even if not present in DB)
    const free7DayTrial = user.free7DayTrial ?? false;
    const trialExpiryDate = user.trialExpiryDate ?? null;

    // ❌ No subscribed plans
    if (!user.subscribedPlans || user.subscribedPlans.length === 0) {
      user.isSubscribedPlan = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'No subscribed plans found',
        isSubscribedPlan: false,

        // ✅ added fields
        free7DayTrial,
        trialExpiryDate,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        subscribedPlans: [],
      });
    }

    const formatDate = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    };

    const now = new Date();

    const detailedPlans = await Promise.all(
      user.subscribedPlans.map(async (planEntry) => {
        const plan = await Plan.findById(planEntry.planId);
        if (!plan) return null;

        const startDate = new Date(planEntry.startDate);
        const endDate = new Date(planEntry.endDate);

        return {
          id: plan._id,
          name: plan.name,
          originalPrice: plan.originalPrice,
          offerPrice: plan.offerPrice,
          discountPercentage: plan.discountPercentage,
          duration: plan.duration,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          isPurchasedPlan: true,
          isActive: endDate >= now,
        };
      })
    );

    const subscribedPlans = detailedPlans.filter(Boolean);
    const isSubscribedPlan = subscribedPlans.some(plan => plan.isActive);

    // ✅ Save subscription status
    user.isSubscribedPlan = isSubscribedPlan;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscribed plans fetched successfully',
      isSubscribedPlan,

      // ✅ added fields (always shown)
      free7DayTrial,
      trialExpiryDate,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      subscribedPlans,
    });

  } catch (error) {
    console.error('Error fetching subscribed plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscribed plans',
      error: error.message,
    });
  }
};





// User Registration Controller - Adding Customer to User's Customers Array
export const addCustomerToUser = async (req, res) => {
  try {
    const { customer } = req.body;  // Expecting customer details in the request body
    const { userId } = req.params;  // Getting userId from URL params

    // Validate mandatory fields for customer
    if (!userId || !customer) {
      return res.status(400).json({ message: 'User ID and customer details are required!' });
    }

    // 🔹 ADD THIS LINE ONLY
    customer.religion = customer.religion || null;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Add the new customer to the user's customers array
    user.customers.push(customer);

    // Save the updated user document
    await user.save();

    // Return the updated user data with the new customer added
    return res.status(200).json({
      message: 'Customer added successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        dob: user.dob,
        marriageAnniversaryDate: user.marriageAnniversaryDate,
        customers: user.customers,  // Return the updated customers array
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Get all customers for a specific user by userId
export const getAllCustomersForUser = async (req, res) => {
  try {
    const { userId } = req.params;  // Get userId from URL params

    // Validate if userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required!' });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Return the customers array from the user document
    return res.status(200).json({
      message: 'Customers fetched successfully!',
      customers: user.customers,  // Return the customers array
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
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





// Delete customer by userId and customerId (no ObjectId validation)
export const deleteCustomer = async (req, res) => {
  try {
    const { userId, customerId } = req.params;

    console.log(`Attempting to delete customer with ID: ${customerId}`);

    if (!userId || !customerId) {
      return res.status(400).json({ message: 'User ID and Customer ID are required!' });
    }

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // Match customerId directly as string (no ObjectId casting)
    const customerIndex = user.customers.findIndex(
      customer => customer._id.toString() === customerId
    );

    console.log(`Customer index: ${customerIndex}`);

    if (customerIndex === -1) {
      return res.status(404).json({ message: 'Customer not found!' });
    }

    // Remove the customer from the array
    user.customers.splice(customerIndex, 1);

    // Save changes
    await user.save();

    return res.status(200).json({
      message: 'Customer deleted successfully!',
      customers: user.customers, // just return updated customers if you want to simplify
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
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
      return res.status(404).json({ message: 'User not found' });
    }

    const today = dayjs();
    const name = user.name || 'User';
    const wishes = [];

    // ===== 🎂 Birthday Handling =====
    if (user.dob) {
      const birthDate = dayjs(user.dob, 'DD-MM-YYYY');

      if (birthDate.isValid()) {
        let nextBirthday = birthDate.year(today.year());

        if (nextBirthday.isBefore(today, 'day')) {
          nextBirthday = nextBirthday.add(1, 'year');
        }

        const isBirthdayToday = nextBirthday.format('MM-DD') === today.format('MM-DD');

        if (isBirthdayToday && today.hour() === 0) {
          wishes.push(`🎉 It's 12:00 AM — Happy Birthday, ${name}! May your day be filled with happiness.`);
        } else if (isBirthdayToday) {
          wishes.push(`🎉 Happy Birthday, ${name}! Wishing you joy and love.`);
        } else {
          const daysLeft = nextBirthday.diff(today, 'day');
          wishes.push(`🎂 ${name}, your birthday is in ${daysLeft} day(s) on ${nextBirthday.format('MMMM DD')}.`);
        }
      } else {
        wishes.push(`⚠️ Invalid DOB format for ${name}`);
      }
    } else {
      wishes.push(`DOB not found for ${name}`);
    }

    // ===== 💍 Anniversary Handling =====
    if (user.marriageAnniversaryDate) {
      const anniversaryDate = dayjs(user.marriageAnniversaryDate, 'DD-MM-YYYY');

      if (anniversaryDate.isValid()) {
        let nextAnniversary = anniversaryDate.year(today.year());

        if (nextAnniversary.isBefore(today, 'day')) {
          nextAnniversary = nextAnniversary.add(1, 'year');
        }

        const isAnniversaryToday = nextAnniversary.format('MM-DD') === today.format('MM-DD');

        if (isAnniversaryToday && today.hour() === 0) {
          wishes.push(`💖 It's 12:00 AM — Happy Anniversary, ${name}! Wishing you love and happiness.`);
        } else if (isAnniversaryToday) {
          wishes.push(`💖 Happy Anniversary, ${name}! Cheers to your beautiful journey together.`);
        } else {
          const daysLeft = nextAnniversary.diff(today, 'day');
          wishes.push(`💍 ${name}, your anniversary is in ${daysLeft} day(s) on ${nextAnniversary.format('MMMM DD')}.`);
        }
      } else {
        wishes.push(`⚠️ Invalid Anniversary date format for ${name}`);
      }
    }

    res.json({
      message: 'Birthday and/or Anniversary wish or countdown',
      wishes,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
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

    const history = await UserHistory.find({ userId })
      .populate("logoId", "name image price")
      .sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({
      message: "Error fetching user history",
      error: error.message,
    });
  }
};



export const getAllReels = async (req, res) => {
  try {
    const { userId } = req.params; // sirf receive kar rahe hain

    // optional: userId ka use future logic ke liye
    console.log("UserId:", userId);

    // ❌ Reel.find({ userId }) nahi
    // ✅ sab reels lao
    const reels = await Reel.find().sort({ createdAt: -1 });

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

    // Agar already liked hai to dobara like na ho
    if (!reel.isLiked) {
      reel.likeCount += 1;
      reel.isLiked = true;
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


// teluguConstants.js
export const TITHI_TELUGU = [
  "ప్రతిపద","ద్వితీయ","తృతీయ","చతుర్థి","పంచమి",
  "షష్ఠి","సప్తమి","అష్టమి","నవమి","దశమి",
  "ఏకాదశి","ద్వాదశి","త్రయోదశి","చతుర్దశి","పౌర్ణమి",
  "ప్రతిపద","ద్వితీయ","తృతీయ","చతుర్థి","పంచమి",
  "షష్ఠి","సప్తమి","అష్టమి","నవమి","దశమి",
  "ఏకాదశి","ద్వాదశి","త్రయోదశి","చతుర్దశి","అమావాస్య"
];

export const NAKSHATRA_TELUGU = [
  "అశ్విని","భరణి","కృత్తిక","రోహిణి","మృగశిర",
  "ఆర్ద్ర","పునర్వసు","పుష్యమి","ఆశ్లేష",
  "మఖ","పూర్వ ఫల్గుణి","ఉత్తర ఫల్గుణి",
  "హస్త","చిత్త","స్వాతి","విశాఖ",
  "అనూరాధ","జ్యేష్ఠ","మూల",
  "పూర్వాషాఢ","ఉత్తరాషాఢ",
  "శ్రవణం","ధనిష్ఠ","శతభిష",
  "పూర్వాభాద్ర","ఉత్తరాభాద్ర","రేవతి"
];

export const VAARA_TELUGU = [
  "ఆదివారం","సోమవారం","మంగళవారం",
  "బుధవారం","గురువారం","శుక్రవారం","శనివారం"
];

export const KARANA_TELUGU = [
  "కౌలవ","తైతిల","గరిజ","విష్ట","బవ","బలవ","శకుని","చతుష్పద"
];

export const YOGA_TELUGU = [
  "శుభ","అమృత","సౌభాగ్య","శ్రేయ","బల","అముక్త","శుభకార","అనంత","ప్రజాపతి",
  "ఆనంద","రావి","విధి","పర్ణ","వికార","దుర్ముఖ","శక్తి","శాంత","దివ్య","విద్య","విష్ణు","మంగళ","సుర","చంద్ర"
];

// Panchang calculation function (simplified JS version)
export function calculateExactPanchang(year, month, date, lat, lon) {
  const obs = new Observer(lat, lon, 0); // Observer from astronomy lib
  const base = new Date(Date.UTC(year, month - 1, date, 0, 0));

  // Sunrise / Sunset / Moonrise / Moonset
  const sunrise = SearchRiseSet(Body.Sun, obs, +1, base, 1).date;
  const sunset = SearchRiseSet(Body.Sun, obs, -1, base, 1).date;
  const moonrise = SearchRiseSet(Body.Moon, obs, +1, base, 1).date;
  const moonset = SearchRiseSet(Body.Moon, obs, -1, base, 1).date;

  const tithiArr = [];
  const nakArr = [];
  const karanaArr = [];
  const yogaArr = [];

  // Sun-Moon position loop to calculate tithi, nakshatra, karana, yoga
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
    const karanaIndex = tithiIndex % 11; // 11 Karana cycle
    const yogaIndex = Math.floor(((sunLon + moonLon) % 360) / DEG_YOGA);

    // Tithi
    if (prevTithi === null) prevTithi = tithiIndex;
    if (tithiIndex !== prevTithi) {
      tithiArr.push({
        id: prevTithi + 1,
        index: 0,
        name: TITHI_TELUGU[prevTithi],
        paksha: prevTithi < 15 ? "Shukla Paksha" : "Krishna Paksha",
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
        name: NAKSHATRA_TELUGU[prevNak],
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
        name: KARANA_TELUGU[prevKarana],
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
        name: YOGA_TELUGU[prevYoga],
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
    name: TITHI_TELUGU[prevTithi],
    paksha: prevTithi < 15 ? "Shukla Paksha" : "Krishna Paksha",
    start: tithiStart.toISOString(),
    end: sunset.toISOString(),
  });
  nakArr.push({
    id: prevNak + 1,
    name: NAKSHATRA_TELUGU[prevNak],
    start: nakStart.toISOString(),
    end: sunset.toISOString(),
  });
  karanaArr.push({
    id: prevKarana + 1,
    index: 0,
    name: KARANA_TELUGU[prevKarana],
    start: karanaStart.toISOString(),
    end: sunset.toISOString(),
  });
  yogaArr.push({
    id: prevYoga + 1,
    name: YOGA_TELUGU[prevYoga],
    start: yogaStart.toISOString(),
    end: sunset.toISOString(),
  });

  return {
    vaara: VAARA_TELUGU[new Date(year, month - 1, date).getDay()],
    tithi: tithiArr,
    nakshatra: nakArr,
    karana: karanaArr,
    yoga: yogaArr,
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    moonrise: moonrise.toISOString(),
    moonset: moonset.toISOString(),
  };
}

// getPanchangFree endpoint
export const getPanchang = async (req, res) => {
  try {
    const { userId } = req.params; // userId from URL params
    const { year, month, date, location } = req.body;

    // 1️⃣ Validate inputs
    if (!userId || !year || !month || !date || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 2️⃣ Fetch user from DB
    const user = await User.findById(userId).select("name dob email mobile");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 3️⃣ Coordinates (Hyderabad hardcoded, optional geocode)
    const lat = 17.385;
    const lon = 78.4867;

    // 4️⃣ Calculate Panchang
    const data = calculateExactPanchang(year, month, date, lat, lon);

    // 5️⃣ Respond
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
