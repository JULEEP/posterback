// routes/posterRoutes.js
import express from 'express';
import {
  createPoster,
  getAllPosters,
  getSinglePoster,
  getPostersByFestivalDates,
  getAllPostersBeauty,
  getChemicalPosters,
  getClothingPosters,
  getUgadiPosters,
  getPostersByCategory,
  editPoster,
  deletePoster,
  Postercreate,
  createPosterAndUpload,
  updatePoster,
  canvasCreatePoster,
  getAllCanvasPosters,
  getSingleCanvasPoster,
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner
} from '../Controller/PosterController.js';
import fileUpload from "express-fileupload";


const router = express.Router();

router.post('/create-poster', createPoster);
router.post('/create-canvaposter', canvasCreatePoster);
router.put('/update/:id', updatePoster);
router.get('/getallposter', getAllPosters); 
router.put('/editposter/:posterId', editPoster);
router.delete('/deleteposter/:posterId', deletePoster);
router.get('/getposterbycategory', getPostersByCategory); 
router.post('/festival', getPostersByFestivalDates); 
router.get('/single-poster/:id', getSinglePoster);    // GET /api/posters/:id
router.get('/beautyposter', getAllPostersBeauty); 
router.get('/chemicalposter', getChemicalPosters); 
router.get('/clothingposter', getClothingPosters);
router.get('/ugadiposter', getUgadiPosters);
router.post('/create', Postercreate);
router.post('/create', createPosterAndUpload);
router.get('/canvasposters', getAllCanvasPosters);
router.get('/singlecanvasposters/:posterId', getSingleCanvasPoster);
router.post("/createbanner", createBanner);
router.get("/getbanners", getAllBanners);
router.put("/updatebanner/:id", updateBanner);
router.delete("/deletebanner/:id", deleteBanner);









export default router;
