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
    const { name, description, price, logoCategoryId } = req.body;

    // validations
    if (!logoCategoryId) {
      return res
        .status(400)
        .json({ message: "Logo category is required." });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "Logo image is required." });
    }

    const file = req.files.image;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "logo-images",
    });

    const image = result.secure_url;

    const newLogo = new Logo({
      name,
      description,
      price,
      image,
      logoCategoryId,
    });

    const savedLogo = await newLogo.save();

    res.status(201).json(savedLogo);
  } catch (error) {
    console.error("Error uploading logo:", error);
    res.status(500).json({
      message: "Error creating logo",
      error: error.message,
    });
  }
};



// ✅ Get all logos
export const getAllLogos = async (req, res) => {
  try {
    const { logoCategoryId } = req.query; // optional query

    // Agar logoCategoryId diya ho to filter, warna sab
    const filter = logoCategoryId ? { logoCategoryId } : {};

    const logos = await Logo.find(filter)
      .populate("logoCategoryId", "name image") // populate category info
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


// ✅ Update a logo
export const updateLogo = async (req, res) => {
  try {
    const { logoId } = req.params;
    const { name, description, price, logoCategoryId } = req.body;

    const logo = await Logo.findById(logoId);
    if (!logo) {
      return res.status(404).json({ message: "Logo not found" });
    }

    // 🔄 Update image if new image uploaded
    if (req.files && req.files.image) {
      const file = req.files.image;

      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "logo-images",
      });

      logo.image = result.secure_url;
    }

    // 🔄 Update other fields
    if (name) logo.name = name;
    if (description) logo.description = description;
    if (price) logo.price = price;
    if (logoCategoryId) logo.logoCategoryId = logoCategoryId;

    const updatedLogo = await logo.save();

    res.status(200).json(updatedLogo);
  } catch (error) {
    console.error("Error updating logo:", error);
    res.status(500).json({
      message: "Error updating logo",
      error: error.message,
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



export const createBusinessCard = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      offerPrice,
      description,
      size,
      inStock,
      tags
    } = req.body;

    // Check if images are uploaded
    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    const uploadedImages = [];

    // Upload all images to Cloudinary
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "business-card-images"
      });

      uploadedImages.push(result.secure_url);
    }

    const newBusinessPoster = new BusinessCard({
      name,
      category,
      price,
      offerPrice,
      images: uploadedImages,
      description,
      size,
      inStock,
      tags: tags ? tags.split(',') : []
    });

    const savedBusinessPoster = await newBusinessPoster.save();

    res.status(201).json({
      success: true,
      message: 'Business card created successfully',
      poster: savedBusinessPoster
    });
  } catch (error) {
    console.error("Error creating business card:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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




// ✅ Create Logo Category
export const createLogoCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required." });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "Category image is required." });
    }

    const file = req.files.image;

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "logo-category-images",
    });

    const image = result.secure_url;

    const newCategory = new LogoCategory({
      name,
      image,
    });

    const savedCategory = await newCategory.save();

    res.status(201).json(savedCategory);
  } catch (error) {
    console.error("Error creating logo category:", error);

    // duplicate name error handle
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category already exists." });
    }

    res.status(500).json({
      message: "Error creating logo category",
      error: error.message,
    });
  }
};

// ✅ Get All Logo Categories
export const getAllLogoCategories = async (req, res) => {
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


// ✅ Update Logo Category
export const updateLogoCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updateData = { name };
    
    // If new image is uploaded
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "logo-category-images",
      });
      updateData.image = result.secure_url;
    }

    const updatedCategory = await LogoCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      message: "Error updating category",
      error: error.message,
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
    if (!req.files || !req.files.video) {
      return res.status(400).json({ message: "Reel video is required." });
    }

    const file = req.files.video;

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "reels-videos",
      resource_type: "video",
      transformation: [
        {
          overlay: {
            font_family: "Arial",
            font_size: 28,      // 👈 chhota
            font_weight: "bold",
            text: "EDITEZY",
          },
          gravity: "south_east",
          x: 12,
          y: 12,
          color: "#ffffff",
          opacity: 35,        // 👈 soft look
        },
      ],
    });

    const newReel = new Reel({
      videoUrl: result.secure_url,
      likeCount: 0,
      isLiked: false,
    });

    res.status(201).json(await newReel.save());
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: "Reel not found" });
    }

    // Agar naya video aaya hai
    if (req.files && req.files.video) {
      const file = req.files.video;

      // 🔥 Old video delete from Cloudinary
      if (reel.videoUrl) {
        const publicId = reel.videoUrl
          .split("/")
          .slice(-1)[0]
          .split(".")[0];

        await cloudinary.uploader.destroy(
          `reels-videos/${publicId}`,
          { resource_type: "video" }
        );
      }

      // ⬆️ Upload new video
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "reels-videos",
        resource_type: "video",
        transformation: [
          {
            overlay: {
              font_family: "Arial",
              font_size: 28,
              font_weight: "bold",
              text: "EDITEZY",
            },
            gravity: "south_east",
            x: 12,
            y: 12,
            color: "#ffffff",
            opacity: 35,
          },
        ],
      });

      reel.videoUrl = result.secure_url;
    }

    // Optional fields update
    if (req.body.likeCount !== undefined) {
      reel.likeCount = req.body.likeCount;
    }

    if (req.body.isLiked !== undefined) {
      reel.isLiked = req.body.isLiked;
    }

    const updatedReel = await reel.save();

    res.status(200).json({
      message: "Reel updated successfully",
      reel: updatedReel,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
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



// 1. Create Audio
export const createAudio = async (req, res) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ message: "Audio file is required." });
    }

    const file = req.files.audio;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "audios",
      resource_type: "auto",
    });

    // Create audio duration (Cloudinary returns duration in seconds)
    const duration = result.duration || 0;

    const newAudio = new Audio({
      audioUrl: result.secure_url,
      title: req.body.title || "",
      artist: req.body.artist || "",
      duration: duration,
      size: result.bytes || 0,
      format: result.format || ""
    });

    await newAudio.save();

    res.status(201).json({
      message: "Audio uploaded successfully",
      audio: newAudio
    });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// 3. Update Audio
export const updateAudio = async (req, res) => {
  try {
    const { audioId } = req.params;

    const audio = await Audio.findById(audioId);
    if (!audio) {
      return res.status(404).json({ message: "Audio not found" });
    }

    // If new audio file is uploaded
    if (req.files && req.files.audio) {
      const file = req.files.audio;

      // Delete old audio from Cloudinary
      if (audio.audioUrl) {
        const publicId = audio.audioUrl
          .split("/")
          .slice(-1)[0]
          .split(".")[0];

        await cloudinary.uploader.destroy(
          `audios/${publicId}`,
          { resource_type: "auto" }
        );
      }

      // Upload new audio
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "audios",
        resource_type: "auto",
      });

      audio.audioUrl = result.secure_url;
      audio.duration = result.duration || 0;
      audio.size = result.bytes || 0;
      audio.format = result.format || "";
    }

    // Update text fields
    if (req.body.title !== undefined) {
      audio.title = req.body.title;
    }

    if (req.body.artist !== undefined) {
      audio.artist = req.body.artist;
    }

    const updatedAudio = await audio.save();

    res.status(200).json({
      message: "Audio updated successfully",
      audio: updatedAudio,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
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
