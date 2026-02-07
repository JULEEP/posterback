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
    updatePrivacyPolicyById,
    deletePrivacyPolicyById,
    updateAboutUsById,
    deleteAboutUsById,
    updateContactMessageById,
    deleteContactMessageById,
    getReportedUsers,
    blockReportedUser,
    updateRedemptionStatus,
    getAllRedemptionRequests,
    createLogoCategory,
    getAllLogoCategories,
    createReel,
    getAllReels,
    updateReel,
    deleteReel,
    createAudio,
    getAllAudios,
    updateAudio,
    deleteAudio,
    updateLogoCategory,
    deleteLogoCategory,
} from "../Controller/AdminController.js";

const router = express.Router();

router.get("/getallusers", getAllUsers);
router.delete("/deleteuser/:id", deleteUser);
router.get('/usersplans', getAllUsersWithSubscribedPlans);
router.post('/privacy-policy', createOrUpdatePrivacyPolicy);
router.put('/updatepolicy/:id', updatePrivacyPolicyById);
router.delete('/deletepolicy/:id', deletePrivacyPolicyById);
router.get('/getpolicy', getPrivacyPolicy);
router.post('/aboutus', createOrUpdateAboutUs);
router.put('/updateaboutus/:id', updateAboutUsById);
router.delete('/deleteaboutus/:id', deleteAboutUsById);
router.get('/getaboutus', getAboutUs);
router.post('/contact', submitContactMessage);     // POST /api/contact
router.get('/getcontactus', getAllContactMessages);     // GET /api/contact
router.put('/updatecontactmessage/:id', updateContactMessageById);
router.delete('/deletecontactmessage/:id', deleteContactMessageById);
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
router.get('/getallreporteduser', getReportedUsers);
// Only accessible by admin middleware
router.put('/block-user/:userId', blockReportedUser);
router.put("/update-status/:redemptionId", updateRedemptionStatus);
router.get("/getredemption-requests", getAllRedemptionRequests);

router.post('/createlogocategory', createLogoCategory);
router.get('/getlogocategories', getAllLogoCategories);
router.put('/updatelogocategory/:id', updateLogoCategory);
router.delete('/deletelogocategory/:id', deleteLogoCategory);

router.post('/createreel', createReel);
router.post('/getallreels', getAllReels);
router.put("/updatereel/:reelId", updateReel);
router.delete("/deletereel/:reelId", deleteReel);


router.post('/createaudio', createAudio);
router.get('/getallaudios', getAllAudios);
router.put('/updateaudio/:audioId', updateAudio);
router.delete('/deleteaudio/:audioId', deleteAudio);








export default router;