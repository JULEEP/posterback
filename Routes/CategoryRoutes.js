import express from "express";
import {
  createCategory,
  deleteCategory,
  getSingleCategory,
  getAllCategories,
  updateCategory,
} from "../Controller/CategoryController.js";
const router = express.Router();

router.post("/create-cateogry", createCategory);
router.get("/getall-cateogry/:userId", getAllCategories);
router.get("/singlecategory/:id", getSingleCategory);
router.put("/update/:id", updateCategory);
router.delete("/delete/:id", deleteCategory);

export default router;
