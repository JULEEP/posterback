import Poster from "../Models/Poster.js";
import cloudinary from "../config/cloudinary.js";
import { createCanvas, loadImage } from 'canvas';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import PosterCanvas from "../Models/PosterCanvas.js";



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
    const { posterId } = req.params;  // Poster ID from URL parameter
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

    // Find the existing poster by ID
    const poster = await Poster.findById(posterId);

    if (!poster) {
      return res.status(404).json({ message: 'Poster not found' });
    }

    // Handle new images if any were uploaded
    let images = poster.images; // Keep existing images by default

    // If new images are uploaded, add them to the existing ones
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const newImages = [];

      // Upload new images to Cloudinary
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: "poster", // Specify a folder in Cloudinary
        });
        newImages.push(result.secure_url);  // Store the secure URL of each image
      }

      // Append the new images to the existing ones
      images = [...images, ...newImages];
    }

    // Conditionally update the fields based on what is provided in the request body
    if (name) poster.name = name;
    if (categoryName) poster.categoryName = categoryName;
    if (price) poster.price = price;
    if (description) poster.description = description;
    if (size) poster.size = size;
    if (festivalDate) poster.festivalDate = festivalDate;
    if (inStock !== undefined) poster.inStock = inStock;
    if (tags) poster.tags = tags.split(",");  // Convert tags string to an array

    // Always update the images array, even if the other fields were not provided
    poster.images = images;

    // Save the updated poster
    const updatedPoster = await poster.save();

    return res.status(200).json({
      message: "Poster updated successfully",
      poster: updatedPoster,
    });
  } catch (error) {
    console.error("❌ Error editing poster:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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


  
  
export const getAllPosters = async (req, res) => {
  try {
    // Fetch all posters, sorted by creation date in descending order
    let posters = await Poster.find().sort({ createdAt: -1 });

    // Send the posters with all fields (including price)
    res.status(200).json(posters);
  } catch (error) {
    console.error("Error fetching posters:", error);
    res.status(500).json({ message: 'Error fetching posters', error });
  }
};



// ✅ Get posters by categoryName
export const getPostersByCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: 'categoryName is required' });
    }

    const posters = await Poster.find({ categoryName }).sort({ createdAt: -1 });

    res.status(200).json(posters);
  } catch (error) {
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

    const posters = await Poster.find({ festivalDate }).sort({ createdAt: -1 });

    if (posters.length === 0) {
      return res.status(404).json({ message: "No posters found for this festival date" });
    }

    res.status(200).json(posters);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posters", error });
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



export const canvasCreatePoster = async (req, res) => {
  try {
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

    // Check for background image
    if (!req.files || !req.files.bgImage) {
      return res.status(400).json({ message: 'Background image is required' });
    }

    // Upload background image
    const bgFile = Array.isArray(req.files.bgImage) ? req.files.bgImage[0] : req.files.bgImage;
    const bgUploadResult = await cloudinary.uploader.upload(bgFile.tempFilePath, {
      folder: 'posters/backgrounds'
    });
    const bgImageUrl = bgUploadResult.secure_url;

    // Upload overlay images (optional)
    let overlayImages = [];
    if (req.files.images) {
      overlayImages = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    }

    const uploadedOverlayUrls = [];
    for (const imgFile of overlayImages) {
      const result = await cloudinary.uploader.upload(imgFile.tempFilePath, {
        folder: 'posters/overlays'
      });
      uploadedOverlayUrls.push(result.secure_url);
    }

    // Create new poster
    const newPoster = new Poster({
      name,
      categoryName,
      price,
      description,
      size,
      festivalDate,
      inStock,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      email,
      mobile,
      title,
      textSettings: textSettings ? JSON.parse(textSettings) : {},
      overlaySettings: overlaySettings ? JSON.parse(overlaySettings) : {},
      images: uploadedOverlayUrls,
      backgroundImage: bgImageUrl
    });

    await newPoster.save();

    res.status(201).json({
      message: 'Poster created successfully',
      poster: newPoster
    });

  } catch (error) {
    console.error('Error creating poster:', error);
    res.status(500).json({ message: 'Error creating poster', error: error.message });
  }
};





export const getAllCanvasPosters = async (req, res) => {
  try {
    const posters = await Poster.find().sort({ createdAt: -1 }); // newest first
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

    res.status(200).json({
      message: 'Canvas poster fetched successfully',
      poster,
    });
  } catch (error) {
    console.error('❌ Error fetching canvas poster:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



