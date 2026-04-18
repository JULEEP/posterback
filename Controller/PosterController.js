import Poster from "../Models/Poster.js";
import cloudinary from "../config/cloudinary.js";
import { createCanvas, loadImage } from 'canvas';
//import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PosterCanvas from "../Models/PosterCanvas.js";
import streamifier  from 'streamifier'
import Banner from "../Models/Banner.js";
import moment from "moment";
import TextRemovedImage from "../Models/TextRemovedImage.js";
import fetch from "node-fetch";
import FormData from "form-data";
import sharp from "sharp";

import dotenv from 'dotenv';
import User from "../Models/User.js";

import { fileURLToPath } from "url";
import fs from "fs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();  // Load environment variables from .env file




// Cloudinary Config (if not already configured globally)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

export const createPoster = async (req, res) => {
  try {
    const {
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate,
      inStock,
      tags
    } = req.body;

    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: 'No poster image uploaded' });
    }

    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    const imageUrls = [];

    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "posters"
      });
      imageUrls.push(result.secure_url);
    }

    const newPoster = new Poster({
      name,
      categoryName,
      price,
      images: imageUrls,
      description,
      size,
      festivalDate,
      inStock,
      tags: tags ? tags.split(',') : []
    });

    await newPoster.save();

    res.status(201).json({
      message: 'Poster created successfully',
      poster: newPoster
    });

  } catch (error) {
    console.error('❌ Error creating poster:', error);
    res.status(500).json({
      message: 'Error creating poster',
      error: error.message
    });
  }
};


export const updatePoster = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate,
      inStock,
      tags,
      email,
      mobile,
      title,
      textSettings,
      overlaySettings
    } = req.body;

    const poster = await Poster.findById(id);
    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    // Handle background image upload (optional)
    if (req.files && req.files.bgImage) {
      const bgFile = Array.isArray(req.files.bgImage) ? req.files.bgImage[0] : req.files.bgImage;
      const bgUploadResult = await cloudinary.uploader.upload(bgFile.tempFilePath, {
        folder: 'posters/backgrounds'
      });
      poster.backgroundImage = bgUploadResult.secure_url;
    }

    // Handle overlay images upload (optional)
    if (req.files && req.files.images) {
      const overlayImages = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadedOverlayUrls = [];
      for (const imgFile of overlayImages) {
        const result = await cloudinary.uploader.upload(imgFile.tempFilePath, {
          folder: 'posters/overlays'
        });
        uploadedOverlayUrls.push(result.secure_url);
      }
      poster.images = uploadedOverlayUrls;
    }

    // Update other fields if provided
    if (name !== undefined) poster.name = name;
    if (categoryName !== undefined) poster.categoryName = categoryName;
    if (price !== undefined) poster.price = price;
    if (description !== undefined) poster.description = description;
    if (size !== undefined) poster.size = size;
    if (festivalDate !== undefined) poster.festivalDate = festivalDate;
    if (inStock !== undefined) poster.inStock = inStock;
    if (tags !== undefined) poster.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    if (email !== undefined) poster.email = email;
    if (mobile !== undefined) poster.mobile = mobile;
    if (title !== undefined) poster.title = title;

    if (textSettings) {
      try {
        poster.textSettings = JSON.parse(textSettings);
      } catch {
        return res.status(400).json({ message: 'Invalid JSON in textSettings' });
      }
    }

    if (overlaySettings) {
      try {
        poster.overlaySettings = JSON.parse(overlaySettings);
      } catch {
        return res.status(400).json({ message: 'Invalid JSON in overlaySettings' });
      }
    }

    await poster.save();

    res.status(200).json({
      message: 'Poster updated successfully',
      poster
    });

  } catch (error) {
    console.error('Error updating poster:', error);
    res.status(500).json({ message: 'Error updating poster', error: error.message });
  }
};




export const editPoster = async (req, res) => {
  try {
    const { posterId } = req.params;

    const {
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate,
      inStock,
      tags,
      posterlang
    } = req.body;

    const poster = await Poster.findById(posterId);

    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found"
      });
    }

    const uploadDir = path.join(__dirname, "../uploads/posters");

    let images = poster.images || [];

    // 🖼️ ADD NEW IMAGES
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];

      for (const file of files) {
        const uniqueSuffix =
          Date.now() + "-" + Math.round(Math.random() * 1e9);

        const ext = path.extname(file.name);

        const fileName = `poster_${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadDir, fileName);

        await file.mv(filePath);

        images.push(
          `https://api.editezy.com/uploads/posters/${fileName}`
        );
      }
    }

    // 📝 update fields
    if (name) poster.name = name;
    if (categoryName) poster.categoryName = categoryName;
    if (price) poster.price = price;
    if (description) poster.description = description;
    if (size) poster.size = size;
    if (festivalDate) poster.festivalDate = festivalDate;
    if (inStock !== undefined) poster.inStock = inStock;
    if (tags) poster.tags = tags.split(",");
    if (posterlang) poster.posterlang = posterlang;

    poster.images = images;

    const updatedPoster = await poster.save();

    return res.status(200).json({
      success: true,
      message: "Poster updated successfully",
      poster: updatedPoster
    });

  } catch (error) {
    console.error("❌ Error editing poster:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// ✅ Delete a poster
export const deletePoster = async (req, res) => {
  try {
    const { posterId } = req.params;  // Poster ID from URL parameter

    // Find and delete the poster by ID
    const poster = await Poster.findByIdAndDelete(posterId);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    // Optionally, delete the image files from the server if you no longer need them
    // (Implementing file system deletion would require the 'fs' module and careful handling of the files)

    res.status(200).json({ message: 'Poster deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting poster', error });
  }
};


  
  
async function translateToHindiBulk(texts) {
  const translations = {};
  const uniqueTexts = [...new Set(texts.filter(t => t && t.trim() !== ""))];

  await Promise.all(
    uniqueTexts.map(async (text) => {
      try {
        if (/[\u0900-\u097F]/.test(text)) {
          translations[text] = text;
          return;
        }

        const url =
          "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" +
          encodeURIComponent(text);

        const response = await fetch(url);
        const data = await response.json();

        translations[text] = data?.[0]?.[0]?.[0] || text;
      } catch {
        translations[text] = text;
      }
    })
  );

  return translations;
}

export const getAllPosters = async (req, res) => {
  try {
    const { userId } = req.params;

    let lang = "en";

    if (userId) {
      const user = await User.findById(userId).select("language");
      if (user) lang = user.language || "en";
    }

    let posters = await Poster.find().sort({ createdAt: -1 });

    let translationMap = {};

    if (lang === "hi") {
      const textsToTranslate = [];

      posters.forEach(p => {
        if (p.categoryName) textsToTranslate.push(p.categoryName);
        if (p.name && p.name.trim() !== "") textsToTranslate.push(p.name);
      });

      translationMap = await translateToHindiBulk(textsToTranslate);
    }

    posters = posters.map(p => {
      const obj = p.toObject();

      // translation
      if (lang === "hi") {
        if (obj.categoryName)
          obj.categoryName = translationMap[obj.categoryName] || obj.categoryName;

        if (obj.name && obj.name.trim() !== "")
          obj.name = translationMap[obj.name] || obj.name;
      }

      const designData = obj.designData || {};

      const cleanDesignData = {
        bgImage: designData.bgImage || null,
        overlayImages: designData.overlayImages || []
        // ❌ removed overlayImageFilters
      };

      // remove unwanted root field
      delete obj.overlaySettings;

      return {
        ...obj,
        designData: cleanDesignData,
        images: obj.posterImage?.url ? [obj.posterImage.url] : []
      };
    });

    return res.status(200).json(posters);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching posters",
      error: error.message
    });
  }
};


export const getAllPostersForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const posters = await Poster.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Poster.countDocuments();

    const formattedPosters = posters.map(poster => {
      const obj = poster.toObject();
      const posterImageUrl = obj.posterImage?.url || null;

      return {
        ...obj,
        images: posterImageUrl ? [posterImageUrl] : [],
      };
    });

    res.status(200).json({
      data: formattedPosters,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });

  } catch (error) {
    console.error("Error fetching posters:", error);
    res.status(500).json({
      message: "Error fetching posters",
      error: error.message,
    });
  }
};


// ✅ Get posters by categoryName using query param
export const getPostersByCategory = async (req, res) => {
  try {
    const { categoryName } = req.query; // 🔹 use query instead of body

    if (!categoryName) {
      return res.status(400).json({ message: 'categoryName is required' });
    }

    let posters = await Poster.find({ categoryName }).sort({ createdAt: -1 });

    posters = posters.map(poster => {
      const posterImageUrl = poster.posterImage?.url || null;

      return {
        ...poster.toObject(),
        images: posterImageUrl ? [posterImageUrl] : [],
      };
    });

    res.status(200).json(posters);
  } catch (error) {
    console.error("Error fetching posters by categoryName:", error);
    res.status(500).json({ message: 'Error fetching posters by categoryName', error });
  }
};


// ✅ Get all posters from "Beauty Products" category
export const getAllPostersBeauty = async (req, res) => {
    try {
      const posters = await Poster.find({ categoryName: "Beauty Products" }).sort({ createdAt: -1 });
      res.status(200).json(posters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching posters', error });
    }
  };


// ✅ Get all Chemical category posters
export const getChemicalPosters = async (req, res) => {
    try {
      const chemicalPosters = await Poster.find({ categoryName: "Chemical" }).sort({ createdAt: -1 });
      
      res.status(200).json(chemicalPosters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching chemical posters', error });
    }
  };

  
// ✅ Get all Clothing category posters
export const getClothingPosters = async (req, res) => {
    try {
      const clothingPosters = await Poster.find({ categoryName: "Clothing" }).sort({ createdAt: -1 });
      
      res.status(200).json(clothingPosters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching clothing posters', error });
    }
  };


// ✅ Get all Ugadi category posters
export const getUgadiPosters = async (req, res) => {
    try {
      const ugadiPosters = await Poster.find({ categoryName: "Ugadi" }).sort({ createdAt: -1 });
  
      res.status(200).json(ugadiPosters);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching Ugadi posters', error });
    }
  };
  
  

// ✅ Get a single poster by ID
export const getSinglePoster = async (req, res) => {
  try {
    const { id } = req.params;
    const poster = await Poster.findById(id);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    res.status(200).json(poster);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching poster', error });
  }
};


export const getPostersByFestivalDates = async (req, res) => {
  try {
    const { festivalDate } = req.body;

    if (!festivalDate) {
      return res.status(400).json({ message: "Festival date is required" });
    }

    let posters = await Poster.find({ festivalDate })
      .sort({ createdAt: -1 })
      .lean(); // ⚡ faster

    if (!posters.length) {
      return res.status(404).json({ message: "No posters found for this festival date" });
    }

    posters = posters.map(obj => {
      const designData = obj.designData || {};

      return {
        ...obj,
        designData: {
          bgImage: designData.bgImage || null,
          overlayImages: designData.overlayImages || []
        },
        images: obj.posterImage?.url ? [obj.posterImage.url] : []
      };
    });

    res.status(200).json(posters);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching posters",
      error: error.message
    });
  }
};


export const Postercreate = async (req, res) => {
  try {
    // Extract the form data from the request body
    const { name, categoryName, price, description, size, festivalDate, inStock, tags } = req.body;

    // If tags are sent as a comma-separated string, split them into an array
    const tagArray = tags ? tags.split(',') : [];

    // Create a new Poster document without image handling
    const newPoster = new Poster({
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate: festivalDate || null,
      inStock,
      tags: tagArray,
    });

    // Save the poster to the database
    const savedPoster = await newPoster.save();

    // Send response back with success
    res.status(201).json({
      success: true,
      message: 'Poster created successfully',
      poster: savedPoster,
    });
  } catch (error) {
    console.error('Error creating poster:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};



// Helper: Create temp file path
const generateTempFilePath = (filename = 'poster.png') => {
  const tempDir = os.tmpdir();
  return path.join(tempDir, filename);
};

// Main controller function
export const createPosterAndUpload = async (req, res) => {
  try {
    const {
      backgroundUrl,
      textItems,
      name = 'Untitled Poster',
      categoryName = 'General',
      price = 0,
      description = '',
      size = 'A4',
      festivalDate = null,
      inStock = true,
      tags = [], // Default to an empty array if not provided
    } = req.body;

    // Validate required fields
    if (!backgroundUrl || !Array.isArray(textItems)) {
      return res.status(400).json({
        success: false,
        message: '"backgroundUrl" and "textItems" are required.',
      });
    }

    // Ensure tags is an array (if it's passed as a string, convert to array)
    if (typeof tags === 'string') {
      tags = tags.split(',').map(tag => tag.trim()); // Split by commas if a string is passed
    }

    // Load background image
    const bgImage = await loadImage(backgroundUrl);
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bgImage, 0, 0);

    // Draw text items
    textItems.forEach(({ text, position, style, align }) => {
      const { dx, dy } = position;
      const { fontFamily = 'Arial', fontSize = 24, color = 0x000000 } = style;

      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.textAlign = align === 1 ? 'center' : 'left';
      ctx.fillText(text, dx, dy);
    });

    // Convert to buffer & save temp file
    const buffer = canvas.toBuffer('image/png');
    const tempFilePath = generateTempFilePath(`poster-${Date.now()}.png`);
    await fs.writeFile(tempFilePath, buffer);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'poster',
    });

    // Delete temp file
    await fs.unlink(tempFilePath);

    // Save to MongoDB
    const newPoster = await Poster.create({
      name,
      categoryName,
      price,
      images: [result.secure_url],
      description,
      size,
      festivalDate,
      inStock,
      tags,
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Poster created successfully',
      poster: newPoster,
    });
  } catch (error) {
    console.error('Poster creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create and upload poster',
      error: error.message,
    });
  }
};



// // 🔧 Define generatePreviewImage function
// const generatePreviewImage = async (bgUrl, overlayUrls = [], textSettings = {}) => {
//   const canvas = createCanvas(1080, 1080);
//   const ctx = canvas.getContext('2d');

//   const background = await loadImage(bgUrl);
//   ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

//   for (const overlayUrl of overlayUrls) {
//     const overlay = await loadImage(overlayUrl);
//     ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height); // Adjust if needed
//   }

//   ctx.font = '30px Arial';
//   ctx.fillStyle = 'white';

//   if (textSettings.name)
//     ctx.fillText(textSettings.name, textSettings.nameX || 50, textSettings.nameY || 1000);

//   if (textSettings.email)
//     ctx.fillText(textSettings.email, textSettings.emailX || 50, textSettings.emailY || 1040);

//   if (textSettings.mobile)
//     ctx.fillText(textSettings.mobile, textSettings.mobileX || 50, textSettings.mobileY || 1080);

//   const outputPath = path.join(__dirname, `../uploads/preview-${Date.now()}.png`);
//   const out = fs.createWriteStream(outputPath);
//   const stream = canvas.createPNGStream();
//   stream.pipe(out);

//   return new Promise((resolve, reject) => {
//     out.on('finish', () => resolve(outputPath));
//     out.on('error', reject);
//   });
// };


const generatePreviewImage = async (bgUrl, overlayUrls = [], overlaySettings = {}, textSettings = {}) => {
  const canvas = createCanvas(1080, 1080);
  const ctx = canvas.getContext('2d');

  // Draw background
  const background = await loadImage(bgUrl);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // Draw overlays at positions/sizes from overlaySettings.overlays array
  for (let i = 0; i < overlayUrls.length; i++) {
    const overlay = await loadImage(overlayUrls[i]);
    const pos = (overlaySettings.overlays && overlaySettings.overlays[i]) || {};
    const x = pos.x || 0;
    const y = pos.y || 0;
    const width = pos.width || canvas.width;
    const height = pos.height || canvas.height;
    ctx.drawImage(overlay, x, y, width, height);
  }

  // Draw shapes
  if (overlaySettings.shapes && Array.isArray(overlaySettings.shapes)) {
    overlaySettings.shapes.forEach(shape => {
      ctx.fillStyle = shape.color || 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      if (shape.type === 'rectangle') {
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'circle') {
        ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.closePath();
    });
  }

  // Draw texts
  ctx.font = '30px Arial';
  ctx.fillStyle = 'white';

  if (textSettings.name)
    ctx.fillText(textSettings.name, textSettings.nameX || 50, textSettings.nameY || 1040);

  if (textSettings.email)
    ctx.fillText(textSettings.email, textSettings.emailX || 350, textSettings.emailY || 1040);

  if (textSettings.mobile)
    ctx.fillText(textSettings.mobile, textSettings.mobileX || 650, textSettings.mobileY || 1040);

  const buffer = canvas.toBuffer('image/png');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'posters/previews', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// export const canvasCreatePoster = async (req, res) => {
//   try {
//     const {
//       name, 
//       categoryName, 
//       festivalDate, 
//       description, 
//       tags,
//       email, 
//       mobile, 
//       title,
//       designData
//     } = req.body;

//     if (!req.files || !req.files.posterImage) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Poster image is required' 
//       });
//     }

//     // Parse designData if it's a JSON string
//     const designDataParsed = typeof designData === 'string' ? JSON.parse(designData) : designData;

//     // Upload final poster image
//     const posterFile = req.files.posterImage;
//     const posterUpload = await cloudinary.uploader.upload(posterFile.tempFilePath, {
//       folder: 'posters/final',
//       quality: 'auto:good',
//       format: 'jpg'
//     });

//     // Upload bgImage if provided
//     let bgImageData = null;
//     if (req.files.bgImage) {
//       const bgUpload = await cloudinary.uploader.upload(req.files.bgImage.tempFilePath, {
//         folder: 'posters/bg'
//       });
//       bgImageData = {
//         url: bgUpload.secure_url,
//         publicId: bgUpload.public_id
//       };
//     }

//     // Upload multiple overlayImages if provided
//     let overlayImagesData = [];
//     if (req.files.overlayImages) {
//       const overlayFiles = Array.isArray(req.files.overlayImages) 
//         ? req.files.overlayImages 
//         : [req.files.overlayImages];

//       for (const file of overlayFiles) {
//         const overlayUpload = await cloudinary.uploader.upload(file.tempFilePath, {
//           folder: 'posters/overlay'
//         });
//         overlayImagesData.push({
//           url: overlayUpload.secure_url,
//           publicId: overlayUpload.public_id
//         });
//       }
//     }

//     // Create new Poster document
//     const newPoster = new Poster({
//       name,
//       categoryName,
//       festivalDate: festivalDate || undefined,
//       description: description || undefined,
//       tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
//       email: email || undefined,
//       mobile: mobile || undefined,
//       title: title || undefined,
//       posterImage: {
//         url: posterUpload.secure_url,
//         publicId: posterUpload.public_id
//       },
//       designData: {
//         bgImage: bgImageData,
//         overlayImages: overlayImagesData,  // note plural here
//         bgImageSettings: designDataParsed?.bgImageSettings || {},
//         overlaySettings: designDataParsed?.overlaySettings || { overlays: [] },
//         textSettings: designDataParsed?.textSettings || {},
//         textStyles: designDataParsed?.textStyles || {},
//         textVisibility: designDataParsed?.textVisibility || {},
//         overlayImageFilters: designDataParsed?.overlayImageFilters || []
//       },
//       createdAt: new Date(),
//       updatedAt: new Date()
//     });

//     await newPoster.save();

//     return res.status(201).json({
//       success: true,
//       message: 'Poster created successfully',
//       poster: {
//         _id: newPoster._id,
//         name: newPoster.name,
//         categoryName: newPoster.categoryName,
//         festivalDate: newPoster.festivalDate,
//         description: newPoster.description,
//         tags: newPoster.tags,
//         email: newPoster.email,
//         mobile: newPoster.mobile,
//         title: newPoster.title,
//         posterImage: newPoster.posterImage.url,
//         createdAt: newPoster.createdAt
//       }
//     });

//   } catch (error) {
//     console.error('Error creating poster:', error);
//     return res.status(500).json({ 
//       success: false,
//       message: 'Error creating poster', 
//       error: error.message 
//     });
//   }
// };


// export const canvasCreatePoster = async (req, res) => {
//   try {
//     const {
//       name, 
//       categoryName, 
//       festivalDate, 
//       description, 
//       tags,
//       email, 
//       mobile, 
//       title,
//       designData,
//       posterlang
//     } = req.body;

//     if (!req.files || !req.files.posterImage) {
//       return res.status(400).json({ 
//         success: false,
//         message: 'Poster image is required' 
//       });
//     }

//     // Parse designData if it's a JSON string
//     const designDataParsed = typeof designData === 'string' ? JSON.parse(designData) : designData;

//     // Upload final poster image WITHOUT watermark
//     const posterFile = req.files.posterImage;
//     const posterUpload = await cloudinary.uploader.upload(posterFile.tempFilePath, {
//       folder: 'posters/final',
//       quality: 'auto:good',
//       format: 'jpg'
//       // Removed watermark transformation
//     });

//     // Upload bgImage if provided
//     let bgImageData = null;
//     if (req.files.bgImage) {
//       const bgUpload = await cloudinary.uploader.upload(req.files.bgImage.tempFilePath, {
//         folder: 'posters/bg'
//       });
//       bgImageData = {
//         url: bgUpload.secure_url,
//         publicId: bgUpload.public_id
//       };
//     }

//     // Upload multiple overlayImages if provided
//     let overlayImagesData = [];
//     if (req.files.overlayImages) {
//       const overlayFiles = Array.isArray(req.files.overlayImages) 
//         ? req.files.overlayImages 
//         : [req.files.overlayImages];

//       for (const file of overlayFiles) {
//         const overlayUpload = await cloudinary.uploader.upload(file.tempFilePath, {
//           folder: 'posters/overlay'
//         });
//         overlayImagesData.push({
//           url: overlayUpload.secure_url,
//           publicId: overlayUpload.public_id
//         });
//       }
//     }

//     // Create new Poster document
//     const newPoster = new Poster({
//       name,
//       categoryName,
//       festivalDate: festivalDate || undefined,
//       description: description || undefined,
//       tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
//       email: email || undefined,
//       mobile: mobile || undefined,
//       title: title || undefined,
//       posterlang,
//       posterImage: {
//         url: posterUpload.secure_url,
//         publicId: posterUpload.public_id
//       },
//       designData: {
//         bgImage: bgImageData,
//         overlayImages: overlayImagesData,
//         bgImageSettings: designDataParsed?.bgImageSettings || {},
//         overlaySettings: designDataParsed?.overlaySettings || { overlays: [] },
//         textSettings: designDataParsed?.textSettings || {},
//         textStyles: designDataParsed?.textStyles || {},
//         textVisibility: designDataParsed?.textVisibility || {},
//         overlayImageFilters: designDataParsed?.overlayImageFilters || []
//       },
//       createdAt: new Date(),
//       updatedAt: new Date()
//     });

//     await newPoster.save();

//     return res.status(201).json({
//       success: true,
//       message: 'Poster created successfully',
//       poster: {
//         _id: newPoster._id,
//         name: newPoster.name,
//         categoryName: newPoster.categoryName,
//         festivalDate: newPoster.festivalDate,
//         description: newPoster.description,
//         tags: newPoster.tags,
//         email: newPoster.email,
//         mobile: newPoster.mobile,
//         title: newPoster.title,
//         posterImage: newPoster.posterImage.url,
//         posterlang: newPoster.posterlang,
//         createdAt: newPoster.createdAt
//       }
//     });

//   } catch (error) {
//     console.error('Error creating poster:', error);
//     return res.status(500).json({ 
//       success: false,
//       message: 'Error creating poster', 
//       error: error.message 
//     });
//   }
// };



export const canvasCreatePoster = async (req, res) => {
  try {
    const {
      name,
      categoryName,
      festivalDate,
      description,
      tags,
      email,
      mobile,
      title,
      designData,
      posterlang
    } = req.body;

    if (!req.files || !req.files.posterImage) {
      return res.status(400).json({
        success: false,
        message: "Poster image is required"
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

    const designDataParsed = parseIfString(designData);

    const baseUrl = "https://api.editezy.com";

    const uploadDir = path.join(__dirname, "../uploads/posters");
    const bgDir = path.join(uploadDir, "bg");
    const overlayDir = path.join(uploadDir, "overlay");

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
    if (!fs.existsSync(overlayDir)) fs.mkdirSync(overlayDir, { recursive: true });

    // =========================
    // 🎨 MAIN POSTER IMAGE
    // =========================
    const posterFile = req.files.posterImage;

    const posterName =
      "poster_" + Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(posterFile.name);

    const posterPath = path.join(uploadDir, posterName);

    await posterFile.mv(posterPath);

    const posterUpload = {
      url: `${baseUrl}/uploads/posters/${posterName}`,
      publicId: posterName
    };

    // =========================
    // 🖼 BG IMAGE
    // =========================
    let bgImageData = null;

    if (req.files.bgImage) {
      const bgFile = req.files.bgImage;

      const bgName =
        "bg_" + Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(bgFile.name);

      const bgPath = path.join(bgDir, bgName);

      await bgFile.mv(bgPath);

      bgImageData = {
        url: `${baseUrl}/uploads/posters/bg/${bgName}`,
        publicId: bgName
      };
    }

    // =========================
    // 🔺 OVERLAY IMAGES
    // =========================
    let overlayImagesData = [];

    if (req.files.overlayImages) {
      const overlayFiles = Array.isArray(req.files.overlayImages)
        ? req.files.overlayImages
        : [req.files.overlayImages];

      for (const file of overlayFiles) {
        const overlayName =
          "overlay_" + Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.name);

        const overlayPath = path.join(overlayDir, overlayName);

        await file.mv(overlayPath);

        overlayImagesData.push({
          url: `${baseUrl}/uploads/posters/overlay/${overlayName}`,
          publicId: overlayName
        });
      }
    }

    // =========================
    // 🧠 CREATE POSTER
    // =========================
    const newPoster = new Poster({
      name,
      categoryName,
      festivalDate: festivalDate || undefined,
      description: description || undefined,
      tags: tags ? tags.split(",").map(tag => tag.trim()) : [],
      email: email || undefined,
      mobile: mobile || undefined,
      title: title || undefined,
      posterlang,

      posterImage: posterUpload,

      designData: {
        bgImage: bgImageData,
        overlayImages: overlayImagesData,
        bgImageSettings: designDataParsed?.bgImageSettings || {},
        overlaySettings: designDataParsed?.overlaySettings || { overlays: [] },
        textSettings: designDataParsed?.textSettings || {},
        textStyles: designDataParsed?.textStyles || {},
        textVisibility: designDataParsed?.textVisibility || {},
        overlayImageFilters: designDataParsed?.overlayImageFilters || []
      },

      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newPoster.save();

    return res.status(201).json({
      success: true,
      message: "Poster created successfully",
      poster: {
        _id: newPoster._id,
        name: newPoster.name,
        categoryName: newPoster.categoryName,
        festivalDate: newPoster.festivalDate,
        description: newPoster.description,
        tags: newPoster.tags,
        email: newPoster.email,
        mobile: newPoster.mobile,
        title: newPoster.title,
        posterImage: newPoster.posterImage.url,
        posterlang: newPoster.posterlang,
        createdAt: newPoster.createdAt
      }
    });

  } catch (error) {
    console.error("❌ Error creating poster:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating poster",
      error: error.message
    });
  }
};




export const getAllCanvasPosters = async (req, res) => {
  try {
    let posters = await Poster.find().sort({ createdAt: -1 }); // newest first

    // Map posters to adjust `images` field
    posters = posters.map(poster => {
      const posterImageUrl = poster.posterImage?.url || null;

      return {
        ...poster.toObject(),
        images: posterImageUrl ? [posterImageUrl] : [],
      };
    });

    res.status(200).json({
      message: 'All canvas posters fetched successfully',
      posters,
    });
  } catch (error) {
    console.error('❌ Error fetching all canvas posters:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};





export const getSingleCanvasPoster = async (req, res) => {
  try {
    const { posterId } = req.params;

    const poster = await Poster.findById(posterId);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    const posterImageUrl = poster.posterImage?.url || null;

    const posterObj = {
      ...poster.toObject(),
      images: posterImageUrl ? [posterImageUrl] : [],
    };

    res.status(200).json({
      message: 'Canvas poster fetched successfully',
      poster: posterObj,
    });
  } catch (error) {
    console.error('❌ Error fetching canvas poster:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const createBanner = async (req, res) => {
  try {
    if (!req.files || !req.files.images) {
      return res.status(400).json({
        success: false,
        message: "No banner images uploaded"
      });
    }

    const files = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    const uploadDir = path.join(__dirname, "../uploads/banners");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imageUrls = [];

    for (const file of files) {
      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);
      const fileName = `banner_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      imageUrls.push(
        `https://api.editezy.com/uploads/banners/${fileName}`
      );
    }

    const newBanner = new Banner({
      images: imageUrls
    });

    await newBanner.save();

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      banner: newBanner
    });

  } catch (error) {
    console.error("❌ Error creating banner:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// GET All Banners
export const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    console.error("❌ Error fetching banners:", error);
    res.status(500).json({ message: "Error fetching banners", error: error.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || !req.files.images) {
      return res.status(400).json({
        success: false,
        message: "No banner images uploaded"
      });
    }

    const files = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    const uploadDir = path.join(__dirname, "../uploads/banners");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imageUrls = [];

    for (const file of files) {
      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      const ext = path.extname(file.name);
      const fileName = `banner_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await file.mv(filePath);

      imageUrls.push(
        `https://api.editezy.com/uploads/banners/${fileName}`
      );
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { images: imageUrls },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      banner: updatedBanner
    });

  } catch (error) {
    console.error("❌ Error updating banner:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// DELETE Banner by ID
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting banner:", error);
    res.status(500).json({ message: "Error deleting banner", error: error.message });
  }
};



export const getWeeklyPosters = async (req, res) => {
  try {
    const { userId } = req.params;
    const today = moment().format("dddd");
    const todayLower = today.toLowerCase();

    // 🔹 Dono queries parallel chalao
    const [user, posters] = await Promise.all([
      userId
        ? User.findById(userId).select("language").lean()
        : Promise.resolve(null),
      Poster.find({ categoryName: new RegExp(`^${todayLower}$`, "i") }) // 👈 sirf aaj ke posters fetch karo — sab nahi
        .select("name categoryName posterImage designData description posterlang size festivalDate inStock tags title createdAt updatedAt")
        .lean(),
    ]);

    if (!posters.length) return res.status(200).json({});

    const lang = user?.language || "en";

    // 🔹 Translation sirf tab jab lang === "hi"
    let translationMap = {};
    if (lang === "hi" && posters.length > 0) {
      const uniqueTexts = new Set();
      posters.forEach((p) => {
        if (p.categoryName) uniqueTexts.add(p.categoryName);
        if (p.name) uniqueTexts.add(p.name);
      });
      translationMap = await translateToHindiBulk(Array.from(uniqueTexts));
    }

    // 🔹 Map karo
    const todayPosters = posters.map((obj) => {
      if (lang === "hi") {
        if (obj.categoryName)
          obj.categoryName = translationMap[obj.categoryName] || obj.categoryName;
        if (obj.name)
          obj.name = translationMap[obj.name] || obj.name;
      }
      const designData = obj.designData || {};
      return {
        ...obj,
        designData: {
          bgImage: designData.bgImage || null,
          overlayImages: designData.overlayImages || [],
        },
        images: obj.posterImage?.url ? [obj.posterImage.url] : [],
      };
    });

    const response = {};
    if (todayPosters.length) {
      response[today] = todayPosters;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching today's posters:", error);
    res.status(500).json({
      message: "Error fetching today's posters",
      error: error.message,
    });
  }
};


export const removeTextFromImage = async (req, res) => {
  let tempFilesToDelete = [];

  try {
    const { userId } = req.params;

    // 1️⃣ Image validation
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if (!req.files.mask) {
      return res.status(400).json({
        success: false,
        message: "Mask is required. Please select text area to remove.",
      });
    }

    const imageFile = Array.isArray(req.files.image)
      ? req.files.image[0]
      : req.files.image;

    const maskFile = Array.isArray(req.files.mask)
      ? req.files.mask[0]
      : req.files.mask;

    if (!imageFile.tempFilePath || !maskFile.tempFilePath) {
      return res.status(400).json({
        success: false,
        message: "Please upload local image and mask files",
      });
    }

    tempFilesToDelete.push(imageFile.tempFilePath);
    tempFilesToDelete.push(maskFile.tempFilePath);

    // 2️⃣ Convert image to PNG
    const cleanImageBuffer = await sharp(imageFile.tempFilePath)
      .png()
      .toBuffer();

    const { width, height } = await sharp(imageFile.tempFilePath).metadata();

    // 3️⃣ Process MASK (MOST IMPORTANT PART)
    // White (user selection) → Transparent (editable)
    // Black (rest) → Opaque (protected)
    const cleanMaskBuffer = await sharp(maskFile.tempFilePath)
      .resize(width, height)
      .ensureAlpha()
      .negate({ alpha: false }) // 🔥 invert mask
      .png()
      .toBuffer();

    // 4️⃣ Prepare OpenAI request
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append(
      "prompt",
      "Remove the selected text only and naturally fill it to match the original background. Do not change any other area."
    );

    formData.append("image", cleanImageBuffer, {
      filename: "image.png",
      contentType: "image/png",
    });

    formData.append("mask", cleanMaskBuffer, {
      filename: "mask.png",
      contentType: "image/png",
    });

    // 5️⃣ Call OpenAI Image Edit API
    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const result = await openaiRes.json();

    if (!openaiRes.ok || !result?.data?.[0]?.b64_json) {
      console.error("OpenAI Error:", result);
      return res.status(500).json({
        success: false,
        message: result.error?.message || "OpenAI image edit failed",
      });
    }

    // 6️⃣ Upload output to Cloudinary
    const outputBuffer = Buffer.from(
      result.data[0].b64_json,
      "base64"
    );

    cloudinary.uploader.upload_stream(
      { folder: "text-removed" },
      async (error, cloudResult) => {

        // Cleanup temp files
        tempFilesToDelete.forEach(fp => {
          fs.unlink(fp, () => {});
        });

        if (error) {
          return res.status(500).json({
            success: false,
            message: "Cloudinary upload failed",
            error,
          });
        }

        // 7️⃣ Save DB record
        const saved = await TextRemovedImage.create({
          userId: userId || null,
          editedImageUrl: cloudResult.secure_url,
          cloudinaryPublicId: cloudResult.public_id,
        });

        return res.status(200).json({
          success: true,
          message: "Selected text removed successfully.",
          imageUrl: cloudResult.secure_url,
          data: saved,
        });
      }
    ).end(outputBuffer);

  } catch (err) {
    tempFilesToDelete.forEach(fp => {
      fs.unlink(fp, () => {});
    });

    console.error("Image edit error:", err);
    return res.status(500).json({
      success: false,
      message: "Processing failed",
      error: err.message,
    });
  }
};
