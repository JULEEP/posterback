import Category from "../Models/Category.js";
import cloudinary from "../config/cloudinary.js";
import User from "../Models/User.js";


export const createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;

    // Check if category + subcategory already exists
    const existingCategory = await Category.findOne({ 
      categoryName, 
    });

    if (existingCategory) {
      return res.status(400).json({ message: "This category with the given subcategory already exists" });
    }

    // Create new category
    const category = new Category({
      categoryName,
    });

    await category.save();

    res.status(201).json({ message: 'Category created successfully', category });

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};





// 📦 Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let lang = 'en';
    let user = null;
    
    if (userId) {
      user = await User.findById(userId);
      if (user) {
        lang = user.language || 'en';
      }
    }
    
    const categories = await Category.find().sort({ createdAt: -1 });

    // Translate category names if language is Hindi
    let translatedCategories = categories;
    
    if (lang === 'hi' && categories.length > 0) {
      translatedCategories = await Promise.all(
        categories.map(async (category) => {
          const categoryObj = category.toObject ? category.toObject() : { ...category };
          
          // Sirf categoryName translate karo
          if (categoryObj.categoryName) {
            categoryObj.categoryName = await translateToHindi(categoryObj.categoryName);
          }
          
          return categoryObj;
        })
      );
    }

    const message = lang === 'hi' 
      ? 'सभी श्रेणियां प्राप्त हुईं'
      : 'All categories retrieved';

    res.status(200).json({
      success: true,
      message: message,
      categories: translatedCategories,
      count: translatedCategories.length
    });
    
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

async function translateToHindi(text) {
  try {
    if (/[\u0900-\u097F]/.test(text)) return text;
    if (!text || text.trim() === '') return text;
    
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=' + encodeURIComponent(text);
    const response = await fetch(url);
    const data = await response.json();
    
    return (data && data[0] && data[0][0] && data[0][0][0]) ? data[0][0][0] : text;
  } catch (error) {
    return text;
  }
}


// 🔍 Get single category by ID
export const getSingleCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      category,
    });
  } catch (error) {
    console.error("Error getting category:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✏️ Update a category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, image } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { categoryName, image },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// 🗑️ Delete a category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      category: deletedCategory,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

