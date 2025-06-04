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
  getSingleCanvasPoster
} from '../Controller/PosterController.js';

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








export default router;
