import User from "../Models/User.js";
import PrivacyPolicy from "../Models/privacyPolicyModel.js";
import AboutUs from "../Models/Aboutus.js";
import ContactMessage from "../Models/ContactMessage.js";
import Order from '../Models/Order.js'
import Logo from "../Models/Logo.js";
import BusinessCard from "../Models/BusinessCard.js";
import Admin from "../Models/Admin.js";
import generateToken from "../config/jwtToken.js";
import Plan from "../Models/Plan.js";
import cloudinary from "../config/cloudinary.js";
import Poster from "../Models/Poster.js";
import Category from '../Models/Category.js'
import Banner from '../Models/Banner.js'
import WalletRedemption from "../Models/WalletRedemption.js";
import LogoCategory from "../Models/LogoCategory.js";
import Reel from "../Models/Reel.js";
import Audio from "../Models/Audio.js";
import Notification from "../Models/Notification.js";
import StickerCategory from "../Models/StickerCategory.js";
import Sticker from "../Models/Sticker.js";
import WalletConfig from "../Models/WalletConfig.js";
import AmountConfig from "../Models/AmountConfig.js";
import Celebration from "../Models/Celebration.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// User Controller (GET All Users)
export const getAllUsers = async (req, res) => {
    try {
      const users = await User.find(); // Fetch all users
  
      if (users.length === 0) {
        return res.status(404).json({ message: 'No users found!' });
      }
  
      // Map and format each user's data
      const formattedUsers = users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage || 'default-profile-image.jpg',
      }));
  
      return res.status(200).json({
        message: 'Users retrieved successfully!',
        users: formattedUsers,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };



export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    return res.status(200).json({
      message: "User deleted successfully!",
      userId: deletedUser._id, // 👈 userId returned here
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Server error" });
  }
};



// Controller to get all users who have subscribed to at least one valid plan
export const getAllUsersWithSubscribedPlans = async (req, res) => {
  try {
    const users = await User.find(
      { subscribedPlans: { $exists: true, $not: { $size: 0 } } },  // Ensure users have at least one plan
      'name email mobile subscribedPlans'  // Only select the required fields
    )
    .populate('subscribedPlans.planId', 'name originalPrice offerPrice discountPercentage duration startDate endDate'); // Populate plan details

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users with subscribed plans found' });
    }

    // Map the users to return the desired structure, filtering out invalid plans
    const formattedUsers = users.map(user => {
      return {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        subscribedPlans: user.subscribedPlans
          .filter(plan => plan.planId !== null) // Exclude invalid plans (null or undefined planId)
          .map(plan => {
            return {
              planId: plan.planId._id,
              name: plan.planId.name,
              originalPrice: plan.planId.originalPrice,
              offerPrice: plan.planId.offerPrice,
              discountPercentage: plan.planId.discountPercentage,
              duration: plan.planId.duration,
              startDate: plan.startDate,
              endDate: plan.endDate,
            };
          }),
      };
    });

    // Only return users with at least one valid plan
    const validUsers = formattedUsers.filter(user => user.subscribedPlans.length > 0);

    if (validUsers.length === 0) {
      return res.status(404).json({ message: 'No valid users with subscribed plans found' });
    }

    res.status(200).json({
      message: 'Users with valid subscribed plans fetched successfully',
      users: validUsers,
    });
  } catch (error) {
    console.error('Error fetching users with subscribed plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




// Create or update the privacy policy
export const createOrUpdatePrivacyPolicy = async (req, res) => {
  const { title, content, date } = req.body;

  try {
    // Check if the policy exists, if so, update it, otherwise create a new one
    const existingPolicy = await PrivacyPolicy.findOne();
    if (existingPolicy) {
      existingPolicy.title = title;
      existingPolicy.content = content;
      existingPolicy.date = date;
      await existingPolicy.save();
      return res.status(200).json({ message: "Privacy policy updated successfully!" });
    } else {
      const newPolicy = new PrivacyPolicy({
        title,
        content,
        date,
      });
      await newPolicy.save();
      return res.status(201).json({ message: "Privacy policy created successfully!" });
    }
  } catch (error) {
    console.error("Error creating/updating privacy policy:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};


// Update by ID
export const updatePrivacyPolicyById = async (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  try {
    const policy = await PrivacyPolicy.findById(id);
    if (!policy) {
      return res.status(404).json({ message: "Privacy policy not found." });
    }

    policy.title = title || policy.title;
    policy.content = content || policy.content;
    policy.date = date || policy.date;

    await policy.save();

    return res.status(200).json({ message: "Privacy policy updated successfully!" });
  } catch (error) {
    console.error("Error updating privacy policy:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Delete by ID
export const deletePrivacyPolicyById = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPolicy = await PrivacyPolicy.findByIdAndDelete(id);

    if (!deletedPolicy) {
      return res.status(404).json({ message: "Privacy policy not found." });
    }

    return res.status(200).json({ message: "Privacy policy deleted successfully!" });
  } catch (error) {
    console.error("Error deleting privacy policy:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Get the current privacy policy
export const getPrivacyPolicy = async (req, res) => {
  try {
    const policy = await PrivacyPolicy.findOne();
    if (!policy) {
      return res.status(404).json({ message: "Privacy policy not found." });
    }
    return res.status(200).json(policy);
  } catch (error) {
    console.error("Error fetching privacy policy:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};



// Create or Update About Us
export const createOrUpdateAboutUs = async (req, res) => {
  const { title, content, date } = req.body;

  try {
    const existingAbout = await AboutUs.findOne();

    if (existingAbout) {
      existingAbout.title = title;
      existingAbout.content = content;
      existingAbout.date = date;
      await existingAbout.save();
      return res.status(200).json({ message: 'About Us updated successfully!' });
    } else {
      const newAbout = new AboutUs({ title, content, date });
      await newAbout.save();
      return res.status(201).json({ message: 'About Us created successfully!' });
    }
  } catch (error) {
    console.error('Error in createOrUpdateAboutUs:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};


// Update About Us by ID
export const updateAboutUsById = async (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  try {
    const aboutUs = await AboutUs.findById(id);
    if (!aboutUs) {
      return res.status(404).json({ message: "About Us not found." });
    }

    aboutUs.title = title || aboutUs.title;
    aboutUs.content = content || aboutUs.content;
    aboutUs.date = date || aboutUs.date;

    await aboutUs.save();

    return res.status(200).json({ message: "About Us updated successfully!" });
  } catch (error) {
    console.error("Error updating About Us:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};



// Delete About Us by ID
export const deleteAboutUsById = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedAboutUs = await AboutUs.findByIdAndDelete(id);
    if (!deletedAboutUs) {
      return res.status(404).json({ message: "About Us not found." });
    }

    return res.status(200).json({ message: "About Us deleted successfully!" });
  } catch (error) {
    console.error("Error deleting About Us:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};


// Get About Us
export const getAboutUs = async (req, res) => {
  try {
    const aboutData = await AboutUs.findOne();
    if (!aboutData) {
      return res.status(404).json({ message: 'About Us not found' });
    }
    res.status(200).json(aboutData);
  } catch (error) {
    console.error('Error fetching About Us:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};



export const submitContactMessage = async (req, res) => {
  const { name, email, subject, message, address } = req.body;

  try {
    const newMessage = new ContactMessage({
      name,
      email,
      subject,
      message,
      address  // ➕ Save address

    });

    await newMessage.save();
    res.status(201).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
};



// Update Contact Message by ID
export const updateContactMessageById = async (req, res) => {
  const { id } = req.params;
  const { name, email, subject, message, address } = req.body;

  try {
    const contactMessage = await ContactMessage.findById(id);
    if (!contactMessage) {
      return res.status(404).json({ message: "Contact message not found." });
    }

    contactMessage.name = name || contactMessage.name;
    contactMessage.email = email || contactMessage.email;
    contactMessage.subject = subject || contactMessage.subject;
    contactMessage.message = message || contactMessage.message;
    contactMessage.address = address || contactMessage.address;

    await contactMessage.save();

    return res.status(200).json({ message: "Contact message updated successfully!" });
  } catch (error) {
    console.error("Error updating contact message:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};



// Delete Contact Message by ID
export const deleteContactMessageById = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMessage = await ContactMessage.findByIdAndDelete(id);
    if (!deletedMessage) {
      return res.status(404).json({ message: "Contact message not found." });
    }

    return res.status(200).json({ message: "Contact message deleted successfully!" });
  } catch (error) {
    console.error("Error deleting contact message:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};


// GET: Retrieve All Contact Messages
export const getAllContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ message: 'Failed to retrieve contact messages.' });
  }
};



export const getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // ✅ 1. Active Users (updated in last 24 hrs)
    const activeUsers = await User.find({
      updatedAt: { $gte: yesterday },
    });

    // ✅ 2. Today's Birthdays
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const todayStr = `${day}-${month}`;

    const birthdayUsers = await User.find({
      dob: { $regex: `^${todayStr}` },
    });

    // ✅ 3. Today's Anniversaries
    const anniversaryUsers = await User.find({
      marriageAnniversaryDate: { $regex: `^${todayStr}` },
    });

    // ✅ 4. Subscription plan summary
    const usersWithPlans = await User.find({ "subscribedPlans.0": { $exists: true } });

    const planSummary = {};
    usersWithPlans.forEach((user) => {
      user.subscribedPlans.forEach((plan) => {
        planSummary[plan.name] = (planSummary[plan.name] || 0) + 1;
      });
    });

    // ✅ 5. Count Data
    const totalUsersCount = await User.countDocuments();
    const totalPosters = await Poster.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalBanners = await Banner.countDocuments();
    const totalLogos = await Logo.countDocuments();
    const totalActiveSubscriptions = usersWithPlans.length;

    return res.status(200).json({
      totalUsersCount,
      totalPosters,
      totalCategories,
      totalBanners,
      totalLogos,
      totalActiveSubscriptions,
      activeUsersCount: activeUsers.length,
      birthdayUsers,
      anniversaryUsers,
      planSummary,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({ error: "Dashboard fetch failed" });
  }
};

export const createLogo = async (req, res) => {
  try {
    const { name, logoCategoryId, placeholders, previewImageData } = req.body;

    if (!logoCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Logo category is required"
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Logo image is required"
      });
    }

    const file = req.files.image;

    // 📁 upload folder
    const uploadDir = path.join(__dirname, "../uploads/logo-images");
    const previewDir = path.join(__dirname, "../uploads/logo-preview");

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.name);

    const fileName = `logo_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // 1️⃣ Save original image
    await file.mv(filePath);

    const originalImage = `https://api.editezy.com/uploads/logo-images/${fileName}`;

    // 2️⃣ Preview image (base64 optional)
    let previewImage = "";

    if (previewImageData) {
      try {
        const base64Data = previewImageData.replace(
          /^data:image\/\w+;base64,/,
          ""
        );

        const buffer = Buffer.from(base64Data, "base64");

        const previewName = `preview_${uniqueSuffix}.png`;
        const previewPath = path.join(previewDir, previewName);

        fs.writeFileSync(previewPath, buffer);

        previewImage = `https://api.editezy.com/uploads/logo-preview/${previewName}`;
      } catch (err) {
        console.error("Preview error:", err);
        previewImage = originalImage;
      }
    }

    // 3️⃣ Parse placeholders
    let parsedPlaceholders = [];

    if (placeholders) {
      try {
        parsedPlaceholders =
          typeof placeholders === "string"
            ? JSON.parse(placeholders)
            : placeholders;
      } catch (err) {
        parsedPlaceholders = [];
      }
    }

    // 4️⃣ Save DB
    const newLogo = new Logo({
      name,
      image: originalImage,
      previewImage: previewImage || originalImage,
      logoCategoryId,
      placeholders: parsedPlaceholders
    });

    const savedLogo = await newLogo.save();

    return res.status(201).json({
      success: true,
      message: "Logo created successfully",
      data: savedLogo
    });

  } catch (error) {
    console.error("❌ Create Logo Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ✅ Get all logos with language support
// ✅ Get all logos with language support (logo name + category name both translate)
export const getAllLogos = async (req, res) => {
  try {
    const { userId } = req.params; // userId from params
    const { logoCategoryId } = req.query; // optional query for filtering
    
    // Default language
    let userLanguage = 'en';
    
    // If userId is provided, fetch user's language preference
    if (userId) {
      try {
        const user = await User.findById(userId).select('language');
        if (user && user.language) {
          userLanguage = user.language;
        }
      } catch (userError) {
        console.error("Error fetching user language:", userError);
        // Continue with default language
      }
    }

    // Agar logoCategoryId diya ho to filter, warna sab
    const filter = logoCategoryId ? { logoCategoryId } : {};

    const logos = await Logo.find(filter)
      .populate("logoCategoryId", "name image") // populate category info
      .sort({ createdAt: -1 });

    // If user prefers Hindi, translate both logo name and category name
    if (userLanguage === 'hi') {
      // Translate each logo's name and category name
      const translatedLogos = await Promise.all(
        logos.map(async (logo) => {
          // Convert to plain object
          const logoObj = logo.toObject();
          
          // ✅ Translate logo name
          if (logoObj.name) {
            logoObj.name = await translateToHindi(logoObj.name);
          }
          
          // ✅ Translate category name if it exists
          if (logoObj.logoCategoryId && logoObj.logoCategoryId.name) {
            logoObj.logoCategoryId.name = await translateToHindi(logoObj.logoCategoryId.name);
          }
          
          return logoObj;
        })
      );
      
      return res.status(200).json(translatedLogos);
    }

    // For English or other languages, return original logos
    res.status(200).json(logos);
    
  } catch (error) {
    console.error("Error fetching logos:", error);
    
    // Try to get user language for error message
    let errorLang = 'en';
    if (req.params.userId) {
      try {
        const user = await User.findById(req.params.userId).select('language');
        errorLang = user?.language || 'en';
      } catch {
        // Ignore error
      }
    }
    
    const errorMsg = errorLang === 'hi' 
      ? 'लोगो प्राप्त करने में त्रुटि' 
      : 'Error fetching logos';
    
    res.status(500).json({
      message: errorMsg,
      error: error.message,
    });
  }
};



export const getAllLogosForAdmin = async (req, res) => {
  try {
    const { logoCategoryId } = req.query; // optional filter

    // Filter agar logoCategoryId diya ho
    const filter = logoCategoryId ? { logoCategoryId } : {};

    const logos = await Logo.find(filter)
      .populate("logoCategoryId", "name image")
      .sort({ createdAt: -1 });

    res.status(200).json(logos);

  } catch (error) {
    console.error("Error fetching logos:", error);
    res.status(500).json({
      message: "Error fetching logos",
      error: error.message,
    });
  }
};


export const updateLogo = async (req, res) => {
  try {
    const { logoId } = req.params;
    const { name, description, price, logoCategoryId } = req.body;

    const logo = await Logo.findById(logoId);

    if (!logo) {
      return res.status(404).json({
        success: false,
        message: "Logo not found"
      });
    }

    const uploadDir = path.join(__dirname, "../uploads/logo-images");

    // 🔥 update image
    if (req.files && req.files.image) {
      const file = req.files.image;

      // delete old file
      if (logo.image) {
        const oldPath = path.join(
          __dirname,
          "../uploads/logo-images",
          logo.image.split("/").pop()
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.name);

      const fileName = `logo_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      logo.image = `https://api.editezy.com/uploads/logo-images/${fileName}`;
    }

    // 🔥 update fields
    if (name) logo.name = name;
    if (description) logo.description = description;
    if (price) logo.price = price;
    if (logoCategoryId) logo.logoCategoryId = logoCategoryId;

    const updatedLogo = await logo.save();

    return res.status(200).json({
      success: true,
      message: "Logo updated successfully",
      data: updatedLogo
    });

  } catch (error) {
    console.error("❌ Update Logo Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// ✅ Delete a logo
export const deleteLogo = async (req, res) => {
  try {
    const { logoId } = req.params;
    const deleted = await Logo.findByIdAndDelete(logoId);
    if (!deleted) {
      return res.status(404).json({ message: 'Logo not found' });
    }
    res.status(200).json({ message: 'Logo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting logo', error });
  }
};




// ✅ Get all Business Cards
export const getAllBusinessCards = async (req, res) => {
  try {
    const businessCards = await BusinessCard.find().sort({ createdAt: -1 });
    res.status(200).json(businessCards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching business cards', error });
  }
};

// ✅ Update a Business Card
export const updateBusinessCard = async (req, res) => {
  try {
    const { businessCardId } = req.params;
    const { name, category, price, offerPrice, description, size, tags, inStock } = req.body;

    const businessCard = await BusinessCard.findById(businessCardId);
    if (!businessCard) {
      return res.status(404).json({ message: 'Business card not found' });
    }

    // Update images if new ones are uploaded
    let updatedImages = businessCard.images;
    if (req.files && req.files['images']) {
      updatedImages = req.files['images'].map(file => `uploads/${file.filename}`);
    }

    // Update other fields
    businessCard.name = name || businessCard.name;
    businessCard.category = category || businessCard.category;
    businessCard.price = price || businessCard.price;
    businessCard.offerPrice = offerPrice || businessCard.offerPrice;
    businessCard.description = description || businessCard.description;
    businessCard.size = size || businessCard.size;
    businessCard.tags = tags ? tags.split(",").map(tag => tag.trim()) : businessCard.tags;
    businessCard.inStock = inStock || businessCard.inStock;
    businessCard.images = updatedImages;

    const updatedBusinessCard = await businessCard.save();
    res.status(200).json(updatedBusinessCard);
  } catch (error) {
    res.status(500).json({ message: 'Error updating business card', error });
  }
};

// ✅ Delete a Business Card
export const deleteBusinessCard = async (req, res) => {
  try {
    const { businessCardId } = req.params;
    const deleted = await BusinessCard.findByIdAndDelete(businessCardId);
    if (!deleted) {
      return res.status(404).json({ message: 'Business card not found' });
    }
    res.status(200).json({ message: 'Business card deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting business card', error });
  }  
};


// 📝 Register Admin
export const registerAdmin = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ error: "Admin already exists with this email." });
    }

    const newAdmin = new Admin({ name, email, phone, password });
    await newAdmin.save();

    const token = generateToken(newAdmin._id);

    res.status(201).json({
      message: "Admin registered successfully.",
      token,
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", details: err.message });
  }
};

// 🔑 Login Admin
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ error: "Admin not found." });

    // In this case, we are not comparing hashed passwords, so just check if the password matches directly
    if (admin.password !== password) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = generateToken(admin._id);

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login error", details: err.message });
  }
};

// 👤 Get Admin Profile
export const getAdminProfile = async (req, res) => {
  const { adminId } = req.params; // Extract adminId from the request parameters

  try {
    // Find the admin by ID, excluding the password field
    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.status(200).json({ admin });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile", details: err.message });
  }
};




// ✏️ Update Admin Profile
export const updateAdminProfile = async (req, res) => {
  const { adminId } = req.params; // Extract adminId from params
  const updates = req.body; // Fields to update (name, email, etc.)

  try {
    // Prevent password update here unless handled separately
    if (updates.password) {
      return res.status(400).json({ error: "Password cannot be updated from this route." });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updates },
      { new: true, runValidators: true, select: "-password" } // exclude password from response
    );

    if (!updatedAdmin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.status(200).json({ message: "Admin profile updated successfully", admin: updatedAdmin });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};


// 🔑 Logout Admin (Cookie version)
export const logoutAdmin = (req, res) => {
  try {
    // Clear the JWT token cookie
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ error: "Logout error", details: err.message });
  }
};


export const getReportedUsers = async (req, res) => {
  try {
    const reportedUsers = await User.find({ isReported: true })
      .populate('reportedBy', 'name email') // populate reporter info if needed
      .select('-password'); // exclude password for security

    if (reportedUsers.length === 0) {
      return res.status(404).json({ message: 'No reported users found.' });
    }

    res.status(200).json({
      message: 'Reported users fetched successfully.',
      users: reportedUsers,
    });
  } catch (error) {
    console.error('Error fetching reported users:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// Admin: Block or Unblock a reported user
export const blockReportedUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { block } = req.body; // Expecting true to block, false to unblock

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (typeof block !== "boolean") {
      return res.status(400).json({ message: "Block status (true/false) is required in the request body." });
    }

    // If status is already the same, no update needed
    if (user.isBlocked === block) {
      return res.status(409).json({ message: `User is already ${block ? "blocked" : "unblocked"}.` });
    }

    user.isBlocked = block;
    await user.save();

    res.status(200).json({
      message: `User has been ${block ? "blocked" : "unblocked"} successfully.`,
      userId: user._id,
      isBlocked: user.isBlocked
    });

  } catch (error) {
    console.error("Error updating block status:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


// ✅ Admin approves or rejects
export const updateRedemptionStatus = async (req, res) => {
  try {
    const { redemptionId } = req.params;
    const { status } = req.body;

    const redemption = await WalletRedemption.findById(redemptionId).populate('user');
    if (!redemption) return res.status(404).json({ message: "Redemption not found" });

    if (status === 'Completed') {
      // Set user wallet to 0
      await User.findByIdAndUpdate(redemption.user._id, { wallet: 0 });
    }

    redemption.status = status;
    await redemption.save();

    return res.status(200).json({ message: `Redemption marked as ${status}`, redemption });
  } catch (err) {
    console.error("Redemption status update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: get all redemption requests
export const getAllRedemptionRequests = async (req, res) => {
  try {
    const requests = await WalletRedemption.find().populate('user', 'name email mobile').sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (err) {
    console.error("Fetching redemptions failed:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




export const createLogoCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Category image is required"
      });
    }

    const file = req.files.image;

    const uploadDir = path.join(__dirname, "../uploads/logo-category");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.name);

    const fileName = `logo_cat_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await file.mv(filePath);

    // 👉 LOCALHOST BASE URL
    const image = `https://api.editezy.com/uploads/logo-category/${fileName}`;

    const newCategory = new LogoCategory({
      name,
      image
    });

    const savedCategory = await newCategory.save();

    return res.status(201).json(savedCategory);

  } catch (error) {
    console.error("❌ Create Logo Category Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// ✅ Get All Logo Categories
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

// ✅ Get All Logo Categories
export const getAllLogoCategories = async (req, res) => {
  try {
    // Get userId from params
    const { userId } = req.params;
    
    // Default language
    let userLanguage = 'en';
    
    // If userId is provided, fetch user's language preference
    if (userId) {
      try {
        const user = await User.findById(userId).select('language');
        if (user && user.language) {
          userLanguage = user.language;
        }
      } catch (userError) {
        console.error("Error fetching user language:", userError);
        // Continue with default language if user fetch fails
      }
    }
    
    // Fetch all logo categories
    const categories = await LogoCategory.find().sort({ createdAt: -1 });
    
    // If user prefers Hindi, translate category names
    if (userLanguage === 'hi') {
      // Create a new array with translated names
      const translatedCategories = await Promise.all(
        categories.map(async (category) => {
          // Convert to plain object so we can modify it
          const categoryObj = category.toObject();
          
          // Translate the category name if it exists
          if (categoryObj.name) {
            categoryObj.name = await translateToHindi(categoryObj.name);
          }
          
          return categoryObj;
        })
      );
      
      return res.status(200).json(translatedCategories);
    }
    
    // For English or other languages, return original categories
    res.status(200).json(categories);
    
  } catch (error) {
    console.error("Error fetching logo categories:", error);
    
    // Determine error message language based on userLanguage (if available)
    // We might not have userLanguage here if error occurs before that
    const errorMsg = req.params.userId ? 
      (await getUserLanguage(req.params.userId) === 'hi' 
        ? 'लोगो श्रेणियाँ प्राप्त करने में त्रुटि' 
        : 'Error fetching logo categories')
      : 'Error fetching logo categories';
    
    res.status(500).json({
      message: errorMsg,
      error: error.message,
    });
  }
};

// Helper function to get user language (optional, for error messages)
async function getUserLanguage(userId) {
  try {
    const user = await User.findById(userId).select('language');
    return user?.language || 'en';
  } catch {
    return 'en';
  }
}



// ✅ Get All Logo Categories (Simple Version)
export const getAllLogoCategoriesForAdmin = async (req, res) => {
  try {
    const categories = await LogoCategory.find().sort({ createdAt: -1 });

    res.status(200).json(categories);

  } catch (error) {
    console.error("Error fetching logo categories:", error);
    res.status(500).json({
      message: "Error fetching logo categories",
      error: error.message,
    });
  }
};


export const updateLogoCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await LogoCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const updateData = { name };

    const uploadDir = path.join(__dirname, "../uploads/logo-category");

    // 🔥 update image
    if (req.files && req.files.image) {
      const file = req.files.image;

      // delete old file
      if (category.image) {
        const oldFilePath = path.join(
          __dirname,
          "../uploads/logo-category",
          category.image.split("/").pop()
        );

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.name);

      const fileName = `logo_cat_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      updateData.image = `https://api.editezy.com/uploads/logo-category/${fileName}`;
    }

    const updatedCategory = await LogoCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return res.status(200).json(updatedCategory);

  } catch (error) {
    console.error("❌ Update Logo Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// ✅ Delete Logo Category
export const deleteLogoCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await LogoCategory.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete image from Cloudinary if needed
    // Implement Cloudinary delete if required

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      message: "Error deleting category",
      error: error.message,
    });
  }
};



export const createReel = async (req, res) => {
  try {
    console.log("🎥 Reel upload started");

    if (!req.files || !req.files.video) {
      return res.status(400).json({
        success: false,
        message: "Reel video is required"
      });
    }

    const { hotTop } = req.body;
    const videoFile = req.files.video;
    const thumbnailFile = req.files.thumbnail;

    // 1️⃣ Validate video type
    const validVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/3gpp"
    ];

    if (!validVideoTypes.includes(videoFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video format"
      });
    }

    // 2️⃣ Upload directory
    const uploadDir = path.join(__dirname, "../uploads/reels");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // 3️⃣ Save video
    const videoExt = path.extname(videoFile.name);
    const videoName = `reel_${uniqueSuffix}${videoExt}`;
    const videoPath = path.join(uploadDir, videoName);

    await videoFile.mv(videoPath);
    console.log("✅ Video saved");

    // 4️⃣ Save thumbnail (optional)
    let thumbUrl = null;

    if (thumbnailFile) {
      const validImg = ["image/jpeg", "image/png", "image/webp"];

      if (validImg.includes(thumbnailFile.mimetype)) {
        const thumbExt = path.extname(thumbnailFile.name);
        const thumbName = `thumb_${uniqueSuffix}${thumbExt}`;
        const thumbPath = path.join(uploadDir, thumbName);

        await thumbnailFile.mv(thumbPath);
        thumbUrl = `/uploads/reels/${thumbName}`;
      }
    }

    // 5️⃣ BASE URL CHANGE HERE 👇
    const baseUrl = "https://api.editezy.com";

    const videoUrl = `${baseUrl}/uploads/reels/${videoName}`;
    const finalThumb = thumbUrl ? `${baseUrl}${thumbUrl}` : null;

    // 6️⃣ Save DB
    const reel = new Reel({
      videoUrl,
      thumbnailUrl: finalThumb,
      likeCount: 0,
      isLiked: false,
      hotTop: hotTop === "true" || hotTop === true
    });

    await reel.save();

    // 7️⃣ Notify users
    const users = await User.find({}, "_id");

    const notifications = users.map(u => ({
      userId: u._id,
      title: "New Reel Added",
      message: "New reel uploaded, check it now!"
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // 8️⃣ Response
    return res.status(201).json({
      success: true,
      message: "Reel created successfully",
      reel
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


export const getAllReels = async (req, res) => {
  try {
    const reels = await Reel.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Reels fetched successfully",
      reels,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const updateReel = async (req, res) => {
  try {
    const { reelId } = req.params;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found"
      });
    }

    const uploadDir = path.join(__dirname, "../uploads/reels");

    // 🔥 UPDATE VIDEO
    if (req.files && req.files.video) {
      const videoFile = req.files.video;

      // delete old file
      if (reel.videoUrl) {
        const oldVideoPath = path.join(
          __dirname,
          "../uploads/reels",
          reel.videoUrl.split("/").pop()
        );

        if (fs.existsSync(oldVideoPath)) {
          fs.unlinkSync(oldVideoPath);
        }
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const videoExt = path.extname(videoFile.name);

      const videoName = `reel_${uniqueSuffix}${videoExt}`;
      const videoPath = path.join(uploadDir, videoName);

      await videoFile.mv(videoPath);

      reel.videoUrl = `https://api.editezy.com/uploads/reels/${videoName}`;
    }

    // 🔥 UPDATE THUMBNAIL
    if (req.files && req.files.thumbnail) {
      const thumbFile = req.files.thumbnail;

      if (reel.thumbnailUrl) {
        const oldThumbPath = path.join(
          __dirname,
          "../uploads/reels",
          reel.thumbnailUrl.split("/").pop()
        );

        if (fs.existsSync(oldThumbPath)) {
          fs.unlinkSync(oldThumbPath);
        }
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const thumbExt = path.extname(thumbFile.name);

      const thumbName = `thumb_${uniqueSuffix}${thumbExt}`;
      const thumbPath = path.join(uploadDir, thumbName);

      await thumbFile.mv(thumbPath);

      reel.thumbnailUrl = `https://api.editezy.com/uploads/reels/${thumbName}`;
    }

    // 🔥 OPTIONAL FIELDS
    if (req.body.likeCount !== undefined) {
      reel.likeCount = req.body.likeCount;
    }

    if (req.body.isLiked !== undefined) {
      reel.isLiked = req.body.isLiked;
    }

    if (req.body.hotTop !== undefined) {
      reel.hotTop = req.body.hotTop;
    }

    const updatedReel = await reel.save();

    return res.status(200).json({
      success: true,
      message: "Reel updated successfully",
      reel: updatedReel
    });

  } catch (error) {
    console.error("❌ Update Reel Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteReel = async (req, res) => {
  try {
    const { reelId } = req.params;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    await Reel.findByIdAndDelete(reelId);

    res.status(200).json({
      message: "Reel deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const createAudio = async (req, res) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required."
      });
    }

    const file = req.files.audio;

    // upload folder
    const uploadDir = path.join(__dirname, "../uploads/audios");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.name);

    const fileName = `audio_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await file.mv(filePath);

    const audioUrl = `https://api.editezy.com/uploads/audios/${fileName}`;

    const newAudio = new Audio({
      audioUrl,
      title: req.body.title || "",
      artist: req.body.artist || "",
      duration: 0, // local me auto detect nahi hota (optional ffmpeg se kar sakte hain)
      size: file.size || 0,
      format: ext.replace(".", "")
    });

    await newAudio.save();

    return res.status(201).json({
      success: true,
      message: "Audio uploaded successfully",
      audio: newAudio
    });

  } catch (error) {
    console.error("❌ Create Audio Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// 2. Get All Audios
export const getAllAudios = async (req, res) => {
  try {
    const audios = await Audio.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Audios fetched successfully",
      audios,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAudio = async (req, res) => {
  try {
    const { audioId } = req.params;

    const audio = await Audio.findById(audioId);
    if (!audio) {
      return res.status(404).json({
        success: false,
        message: "Audio not found"
      });
    }

    const uploadDir = path.join(__dirname, "../uploads/audios");

    // 🔥 UPDATE AUDIO FILE
    if (req.files && req.files.audio) {
      const file = req.files.audio;

      // delete old file
      if (audio.audioUrl) {
        const oldFilePath = path.join(
          __dirname,
          "../uploads/audios",
          audio.audioUrl.split("/").pop()
        );

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.name);

      const fileName = `audio_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      audio.audioUrl = `https://api.editezy.com/uploads/audios/${fileName}`;
      audio.size = file.size || 0;
      audio.format = ext.replace(".", "");
    }

    // 🔥 UPDATE TEXT FIELDS
    if (req.body.title !== undefined) {
      audio.title = req.body.title;
    }

    if (req.body.artist !== undefined) {
      audio.artist = req.body.artist;
    }

    const updatedAudio = await audio.save();

    return res.status(200).json({
      success: true,
      message: "Audio updated successfully",
      audio: updatedAudio
    });

  } catch (error) {
    console.error("❌ Update Audio Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// 4. Delete Audio
export const deleteAudio = async (req, res) => {
  try {
    const { audioId } = req.params;

    // 1️⃣ Find audio
    const audio = await Audio.findById(audioId);
    if (!audio) {
      return res.status(404).json({ message: "Audio not found" });
    }

    // 2️⃣ Delete from database
    await Audio.findByIdAndDelete(audioId);

    res.status(200).json({
      message: "Audio deleted successfully from database",
    });

  } catch (error) {
    console.error("❌ Delete audio error:", error);
    res.status(500).json({ message: error.message });
  }
};



export const createStickerCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Category image is required"
      });
    }

    const file = req.files.image;

    // 📁 folder
    const uploadDir = path.join(__dirname, "../uploads/sticker-category");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.name);

    const fileName = `sticker_cat_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // 💾 save file
    await file.mv(filePath);

    const imageUrl = `https://api.editezy.com/uploads/sticker-category/${fileName}`;

    // 🧠 create category
    const newCategory = await StickerCategory.create({
      name,
      image: imageUrl
    });

    return res.status(201).json({
      success: true,
      message: "Sticker category created successfully",
      category: newCategory
    });

  } catch (error) {
    console.error("❌ Sticker Category Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


export const getAllStickerCategories = async (req, res) => {
  try {
    const categories = await StickerCategory.find()
      .sort({ createdAt: -1 })
      .lean();

    const updatedCategories = await Promise.all(
      categories.map(async (cat) => {

        // 🔥 total stickers count
        const count = await Sticker.countDocuments({
          stickerCategoryId: cat._id,
        });

        // 🔥 first 4 stickers
        const stickers = await Sticker.find({
          stickerCategoryId: cat._id,
        })
          .select("image")
          .limit(4)
          .lean();

        return {
          ...cat,
          stickerCount: count,
          stickersPreview: stickers.map(s => s.image), // only image array
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: updatedCategories.length,
      categories: updatedCategories,
    });

  } catch (error) {
    console.error("Error fetching sticker categories:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching sticker categories",
      error: error.message,
    });
  }
};

export const editStickerCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await StickerCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Sticker category not found"
      });
    }

    // 📝 update name
    if (name) {
      category.name = name;
    }

    // 📁 folder
    const uploadDir = path.join(__dirname, "../uploads/sticker-category");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 🖼️ update image
    if (req.files && req.files.image) {
      const file = req.files.image;

      // delete old image
      if (category.image) {
        const oldPath = path.join(
          __dirname,
          "../uploads/sticker-category",
          category.image.split("/").pop()
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);

      const fileName = `sticker_cat_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      category.image = `https://api.editezy.com/uploads/sticker-category/${fileName}`;
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: "Sticker category updated successfully",
      category: updatedCategory
    });

  } catch (error) {
    console.error("❌ Sticker Category Update Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const deleteStickerCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await StickerCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Sticker category not found",
      });
    }

    await StickerCategory.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Sticker category deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting sticker category:", error);

    return res.status(500).json({
      success: false,
      message: "Error deleting sticker category",
      error: error.message,
    });
  }
};


export const createSticker = async (req, res) => {
  try {
    const { stickerCategoryId } = req.body;

    if (!stickerCategoryId) {
      return res.status(400).json({
        success: false,
        message: "stickerCategoryId is required"
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Sticker image is required"
      });
    }

    const file = req.files.image;

    // 📁 folder
    const uploadDir = path.join(__dirname, "../uploads/stickers");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.name);

    const fileName = `sticker_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // 💾 save file
    await file.mv(filePath);

    const imageUrl = `https://api.editezy.com/uploads/stickers/${fileName}`;

    // 🧠 save DB
    const newSticker = new Sticker({
      stickerCategoryId,
      image: imageUrl
    });

    const saved = await newSticker.save();

    return res.status(201).json({
      success: true,
      message: "Sticker created successfully",
      sticker: saved
    });

  } catch (error) {
    console.error("❌ Create Sticker Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ==========================
// GET ALL STICKERS
// ==========================
export const getAllStickers = async (req, res) => {
  try {
    const stickers = await Sticker.find()
      .populate("stickerCategoryId", "name image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: stickers.length,
      stickers,
    });

  } catch (error) {
    console.error("Get Stickers Error:", error);
    res.status(500).json({ message: "Error fetching stickers", error: error.message });
  }
};

// ==========================
// UPDATE STICKER
// ==========================
export const updateSticker = async (req, res) => {
  try {
    const { id } = req.params;
    const { stickerCategoryId } = req.body;

    const sticker = await Sticker.findById(id);

    if (!sticker) {
      return res.status(404).json({
        success: false,
        message: "Sticker not found"
      });
    }

    // 📝 update category
    if (stickerCategoryId) {
      sticker.stickerCategoryId = stickerCategoryId;
    }

    const uploadDir = path.join(__dirname, "../uploads/stickers");

    // 🖼️ update image
    if (req.files && req.files.image) {
      const file = req.files.image;

      // delete old image
      if (sticker.image) {
        const oldPath = path.join(
          __dirname,
          "../uploads/stickers",
          sticker.image.split("/").pop()
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);

      const fileName = `sticker_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      sticker.image = `https://api.editezy.com/uploads/stickers/${fileName}`;
    }

    const updated = await sticker.save();

    return res.status(200).json({
      success: true,
      message: "Sticker updated successfully",
      sticker: updated
    });

  } catch (error) {
    console.error("❌ Update Sticker Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// ==========================
// DELETE STICKER
// ==========================
export const deleteSticker = async (req, res) => {
  try {
    const { id } = req.params;

    const sticker = await Sticker.findById(id);
    if (!sticker) {
      return res.status(404).json({ message: "Sticker not found" });
    }

    await Sticker.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Sticker deleted successfully",
    });

  } catch (error) {
    console.error("Delete Sticker Error:", error);
    res.status(500).json({ message: "Error deleting sticker", error: error.message });
  }
};



export const getStickersByCategory = async (req, res) => {
  try {
    const { stickerCategoryId } = req.query;

    if (!stickerCategoryId) {
      return res.status(400).json({
        success: false,
        message: "stickerCategoryId is required in query",
      });
    }

    const stickers = await Sticker.find({ stickerCategoryId })
      .populate("stickerCategoryId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: stickers.length,
      stickers,
    });

  } catch (error) {
    console.error("Get Stickers By Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stickers",
      error: error.message,
    });
  }
};


export const getSingleSticker = async (req, res) => {
  try {
    const { stickerId } = req.params;

    const sticker = await Sticker.findById(stickerId)
      .populate("stickerCategoryId", "name");

    if (!sticker) {
      return res.status(404).json({
        success: false,
        message: "Sticker not found",
      });
    }

    res.status(200).json({
      success: true,
      sticker,
    });

  } catch (error) {
    console.error("Get Single Sticker Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sticker",
      error: error.message,
    });
  }
};


export const setWalletAmount = async (req, res) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    let config = await WalletConfig.findOne();

    if (!config) {
      config = await WalletConfig.create({ amount });
    } else {
      config.amount = amount;
      await config.save();
    }

    res.status(200).json({
      success: true,
      message: "Wallet amount updated successfully",
      config,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating wallet amount",
      error: error.message,
    });
  }
};


export const getWalletAmount = async (req, res) => {
  try {
    const config = await WalletConfig.findOne();

    res.status(200).json({
      success: true,
      amount: config ? config.amount : 0,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching wallet amount",
      error: error.message,
    });
  }
};


export const deleteWalletConfig = async (req, res) => {
  try {
    await WalletConfig.deleteMany();

    res.status(200).json({
      success: true,
      message: "Wallet config deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting wallet config",
      error: error.message,
    });
  }
};



export const setAmount = async (req, res) => {
  try {
    const { name, amount } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    let data = await AmountConfig.findOne({ name });

    if (!data) {
      data = await AmountConfig.create({
        name,
        amount,
      });
    } else {
      data.amount = amount ?? data.amount;
      await data.save();
    }

    return res.status(200).json({
      success: true,
      message: "Amount updated successfully",
      data,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error setting amount",
      error: error.message,
    });
  }
};


export const getAllAmounts = async (req, res) => {
  try {
    const data = await AmountConfig.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching amounts",
      error: error.message,
    });
  }
};



export const deleteAmount = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await AmountConfig.findById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Amount config not found",
      });
    }

    await AmountConfig.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Amount deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting amount",
      error: error.message,
    });
  }
};


// // Create Business Card
// export const createBusinessCard = async (req, res) => {
//   try {
//     const {
//       name,
//       title,
//       company,
//       email,
//       phone,
//       address,
//       website,
//       socialLinks,
//       textStyles,
//       logoSettings,
//       design,
//       useTemplate
//     } = req.body;

//     // Validation
//     if (!name || !title) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Name and title are required" 
//       });
//     }

//     // Parse JSON strings if they come as strings
//     const parseIfString = (data) => {
//       if (typeof data === 'string') {
//         try {
//           return JSON.parse(data);
//         } catch (e) {
//           return data;
//         }
//       }
//       return data;
//     };

//     const parsedSocialLinks = parseIfString(socialLinks);
//     const parsedTextStyles = parseIfString(textStyles);
//     const parsedLogoSettings = parseIfString(logoSettings);
//     const parsedDesign = parseIfString(design);

//     // Upload logo if present
//     let logoUrl = '';
//     if (req.files && req.files.logo) {
//       const logoFile = req.files.logo;
//       const logoResult = await cloudinary.uploader.upload(logoFile.tempFilePath, {
//         folder: "business-cards/logos",
//       });
//       logoUrl = logoResult.secure_url;
//     }

//     // Upload QR code if present
//     let qrCodeUrl = '';
//     if (req.files && req.files.qrCode) {
//       const qrFile = req.files.qrCode;
//       const qrResult = await cloudinary.uploader.upload(qrFile.tempFilePath, {
//         folder: "business-cards/qrcodes",
//       });
//       qrCodeUrl = qrResult.secure_url;
//     }

//     // Upload TEMPLATE image (without any overlay - just background)
//     let templateUrl = '';
//     if (req.files && req.files.templateImage) {
//       const templateFile = req.files.templateImage;
//       const templateResult = await cloudinary.uploader.upload(templateFile.tempFilePath, {
//         folder: "business-cards/templates",
//       });
//       templateUrl = templateResult.secure_url;
//     }

//     // Upload PREVIEW image (with all overlays - final card)
//     let previewUrl = '';
//     if (req.files && req.files.previewImage) {
//       const previewFile = req.files.previewImage;
//       const previewResult = await cloudinary.uploader.upload(previewFile.tempFilePath, {
//         folder: "business-cards/previews",
//       });
//       previewUrl = previewResult.secure_url;
//     }

//     // Create business card
//     const businessCard = new BusinessCard({
//       name,
//       title,
//       company: company || '',
//       email: email || '',
//       phone: phone || '',
//       address: address || '',
//       website: website || '',
//       logo: logoUrl,
//       qrCode: qrCodeUrl,
//       templateImage: templateUrl,    // 👈 Background template without overlay
//       previewImage: previewUrl,       // 👈 Final card with all overlays
//       logoSettings: parsedLogoSettings,
//       textStyles: parsedTextStyles,
//       socialLinks: parsedSocialLinks || [],
//       design: parsedDesign,
//       useTemplate: useTemplate === 'true'
//     });

//     const savedCard = await businessCard.save();

//     res.status(201).json({
//       success: true,
//       message: "Business card created successfully",
//       data: savedCard
//     });

//   } catch (error) {
//     console.error("Error creating business card:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error creating business card",
//       error: error.message
//     });
//   }
// };


export const createBusinessCard = async (req, res) => {
  try {
    const {
      name,
      title,
      company,
      email,
      phone,
      address,
      website,
      socialLinks,
      textStyles,
      logoSettings,
      design,
      useTemplate
    } = req.body;

    if (!name || !title) {
      return res.status(400).json({
        success: false,
        message: "Name and title are required"
      });
    }

    const parseIfString = (data) => {
      if (typeof data === "string") {
        try {
          return JSON.parse(data);
        } catch (e) {
          return data;
        }
      }
      return data;
    };

    const parsedSocialLinks = parseIfString(socialLinks);
    const parsedTextStyles = parseIfString(textStyles);
    const parsedLogoSettings = parseIfString(logoSettings);
    const parsedDesign = parseIfString(design);

    // 📁 folders
    const uploadDir = path.join(__dirname, "../uploads/business-cards");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const baseUrl = "https://api.editezy.com";

    const saveFile = async (file, prefix) => {
      if (!file) return "";

      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);
      const fileName = `${prefix}_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      return `${baseUrl}/uploads/business-cards/${fileName}`;
    };

    // 🔥 uploads (same structure as Cloudinary version)
    let logoUrl = "";
    if (req.files && req.files.logo) {
      logoUrl = await saveFile(req.files.logo, "logo");
    }

    let qrCodeUrl = "";
    if (req.files && req.files.qrCode) {
      qrCodeUrl = await saveFile(req.files.qrCode, "qr");
    }

    let templateUrl = "";
    if (req.files && req.files.templateImage) {
      templateUrl = await saveFile(req.files.templateImage, "template");
    }

    let previewUrl = "";
    if (req.files && req.files.previewImage) {
      previewUrl = await saveFile(req.files.previewImage, "preview");
    }

    // 🧠 Create Business Card (NO CHANGE IN STRUCTURE)
    const businessCard = new BusinessCard({
      name,
      title,
      company: company || "",
      email: email || "",
      phone: phone || "",
      address: address || "",
      website: website || "",
      logo: logoUrl,
      qrCode: qrCodeUrl,
      templateImage: templateUrl,
      previewImage: previewUrl,
      logoSettings: parsedLogoSettings,
      textStyles: parsedTextStyles,
      socialLinks: parsedSocialLinks || [],
      design: parsedDesign,
      useTemplate: useTemplate === "true"
    });

    const savedCard = await businessCard.save();

    return res.status(201).json({
      success: true,
      message: "Business card created successfully",
      data: savedCard
    });

  } catch (error) {
    console.error("❌ Business Card Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating business card",
      error: error.message
    });
  }
};



// // celebrationController.js - Fixed
// export const createCelebration = async (req, res) => {
//   try {
//     let videoUrl = "";

//     if (req.files && req.files.video) {
//       const file = req.files.video;

//       // ✅ detect file type
//       const isGif = file.mimetype === "image/gif";

//       const result = await cloudinary.uploader.upload(file.tempFilePath, {
//         folder: "celebrations",
//         resource_type: isGif ? "image" : "video",
//       });

//       videoUrl = result.secure_url;
//     }

//     const {
//       enabled,
//       duration_seconds,
//       loop,
//       gradient_colors,
//       section_bg_color,
//       primary_text_color,
//       secondary_text_color,
//       accent_color,
//     } = req.body;

//     // ✅ Parse gradient_colors if it's a string
//     let parsedGradientColors = gradient_colors;
//     if (typeof gradient_colors === 'string') {
//       try {
//         parsedGradientColors = JSON.parse(gradient_colors);
//       } catch(e) {
//         parsedGradientColors = ['#FF6B6B', '#4ECDC4'];
//       }
//     }

//     const celebration = await Celebration.create({
//       enabled,
//       video_url: videoUrl,
//       duration_seconds,
//       loop,
//       gradient_colors: parsedGradientColors, // ✅ Store as array, not string
//       section_bg_color,
//       primary_text_color,
//       secondary_text_color,
//       accent_color,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Celebration created successfully",
//       data: celebration,
//     });

//   } catch (error) {
//     console.error("Create Celebration Error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


export const createCelebration = async (req, res) => {
  try {
    let videoUrl = "";

    const uploadDir = path.join(__dirname, "../uploads/celebrations");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 🎥 upload video/gif
    if (req.files && req.files.video) {
      const file = req.files.video;

      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);
      const fileName = `celebration_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      videoUrl = `https://api.editezy.com/uploads/celebrations/${fileName}`;
    }

    const {
      enabled,
      duration_seconds,
      loop,
      gradient_colors,
      section_bg_color,
      primary_text_color,
      secondary_text_color,
      accent_color
    } = req.body;

    // 🧠 parse gradient colors (same logic)
    let parsedGradientColors = gradient_colors;

    if (typeof gradient_colors === "string") {
      try {
        parsedGradientColors = JSON.parse(gradient_colors);
      } catch (e) {
        parsedGradientColors = ["#FF6B6B", "#4ECDC4"];
      }
    }

    // 💾 save DB
    const celebration = await Celebration.create({
      enabled,
      video_url: videoUrl,
      duration_seconds,
      loop,
      gradient_colors: parsedGradientColors,
      section_bg_color,
      primary_text_color,
      secondary_text_color,
      accent_color
    });

    return res.status(201).json({
      success: true,
      message: "Celebration created successfully",
      data: celebration
    });

  } catch (error) {
    console.error("❌ Create Celebration Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ GET ACTIVE (your API)
export const getCelebration = async (req, res) => {
  try {
    const celebration = await Celebration.findOne();

    if (!celebration) {
      return res.status(200).json({
        enabled: false,
        video_url: "",
        duration_seconds: 0,
        loop: true,
        gradient_colors: ["#FF6B6B", "#4ECDC4"],
        section_bg_color: "#FFF5F5",
        primary_text_color: "#1A1A1A",
        secondary_text_color: "#888888",
        accent_color: "#FF6B6B",
      });
    }

    res.status(200).json(celebration);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ GET ALL
export const getAllCelebrations = async (req, res) => {
  try {
    const data = await Celebration.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCelebration = async (req, res) => {
  try {
    const { id } = req.params;

    let updateData = { ...req.body };

    // 🧠 parse gradient_colors safely
    if (
      updateData.gradient_colors &&
      typeof updateData.gradient_colors === "string"
    ) {
      try {
        updateData.gradient_colors = JSON.parse(
          updateData.gradient_colors
        );
      } catch (e) {
        updateData.gradient_colors = ["#FF6B6B", "#4ECDC4"];
      }
    }

    const uploadDir = path.join(__dirname, "../uploads/celebrations");

    // 🎥 update video/gif if provided
    if (req.files && req.files.video) {
      const file = req.files.video;

      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);
      const fileName = `celebration_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      updateData.video_url = `https://api.editezy.com/uploads/celebrations/${fileName}`;
    }

    // 💾 update DB
    const updated = await Celebration.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Celebration not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Updated successfully",
      data: updated
    });

  } catch (error) {
    console.error("❌ Update Celebration Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ✅ DELETE
export const deleteCelebration = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Celebration.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Celebration not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllSimpleBusinessCards = async (req, res) => {
  try {
    const businessCards = await BusinessCard.find()
      .sort({ createdAt: -1 })
      .select([
        "_id",
        "previewImage"
      ]);

    res.status(200).json({
      success: true,
      total: businessCards.length,
      data: businessCards
    });
  } catch (error) {
    console.error("Error fetching business cards:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching business cards",
      error: error.message
    });
  }
};