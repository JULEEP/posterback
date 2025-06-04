import express from "express";
import {
    createOrUpdateAboutUs,
    createOrUpdatePrivacyPolicy,
    getAboutUs,
    getAllContactMessages,
    getAllUsers,
    getAllUsersWithSubscribedPlans,
    getPrivacyPolicy,
    submitContactMessage,
    getDashboardData,
    createLogo,
    getAllLogos,
    updateLogo,
    deleteLogo,
    createBusinessCard,
    getAllBusinessCards,
    updateBusinessCard,
    deleteBusinessCard,
    registerAdmin,
    loginAdmin,
    getAdminProfile,
    logoutAdmin,
    deleteUser,
    updateAdminProfile,
} from "../Controller/AdminController.js";

const router = express.Router();

router.get("/getallusers", getAllUsers);
router.delete("/deleteuser/:id", deleteUser);
router.get('/usersplans', getAllUsersWithSubscribedPlans);
router.post('/privacy-policy', createOrUpdatePrivacyPolicy);
router.get('/getpolicy', getPrivacyPolicy);
router.post('/aboutus', createOrUpdateAboutUs);
router.get('/getaboutus', getAboutUs);
router.post('/contact', submitContactMessage);     // POST /api/contact
router.get('/getcontactus', getAllContactMessages);     // GET /api/contact
router.get('/dashboard', getDashboardData);
router.post('/createlogo', createLogo);
router.get('/getlogos', getAllLogos);
router.put('/updatelogo/:logoId', updateLogo);
router.delete('/deletelogo/:logoId', deleteLogo);
router.post('/createbusinesscard', createBusinessCard);
router.get('/getbusinesscards', getAllBusinessCards);
router.put('/updatebusinesscard/:businessCardId', updateBusinessCard);
router.delete('/deletebusinesscard/:businessCardId', deleteBusinessCard);
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/profile/:adminId', getAdminProfile);
router.put('/updateprofile/:adminId', updateAdminProfile);
router.post('/logout', logoutAdmin);






export default router;