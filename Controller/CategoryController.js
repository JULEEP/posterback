import Category from "../Models/Category.js";
import cloudinary from "../config/cloudinary.js";
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
    const categories = await Category.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "All categories retrieved",
      categories

    });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

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

