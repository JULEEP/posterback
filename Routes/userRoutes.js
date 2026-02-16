import express from 'express';
import { 
    registerUser,
     loginUser, 
     getUser, 
     updateUser,
     createProfile, 
     editProfile, 
     getProfile,
     sendBirthdayWishes,
     checkUserBirthday,
     postStory,
     getAllStories,
     getUserStories,
     purchasePlan,
     getSubscribedPlan,
     addCustomerToUser,
     getAllCustomersForUser,
     updateCustomer,
     deleteCustomer,
     buyPoster,
     checkoutOrder,
     getAllOrders,
     getOrdersByUserId,
     deleteStory,
     verifyOTP,
     updateOrderStatus,
     deleteOrder,
     showBirthdayWishOrCountdown,
     getReferralCodeByUserId,
     getUserWallet,
     deleteAccount,
     confirmDeleteAccount,
     deleteUser,
     addContactUs,
     getAllContactUs,
     reportUser,
     resendOTP,
     getHoroscopeBySign,
     addWebsiteContact,
     requestWalletRedemption,
     getOTP,
     saveUserHistory,
     getUserHistory,
     getAllReels,
     likeReel,
     getPanchang,
     getWalletRedemptionStatus,
     unlikeReel,
     sendGreetingNotification,
     updateLanguage,
     verifyOTPs,
     sendMessageController,
     getChatMessagesController
    } from '../Controller/UserController.js'; // Import UserController
import uploads from '../config/uploadConfig.js';
const router = express.Router();

// Registration Route
router.post('/register', registerUser);

// Login Route
router.post('/login', loginUser);
router.post('/verify-otp', verifyOTP);
router.get('/getotp', getOTP);
router.post('/resend-otp', resendOTP);
// Get user details (GET)
router.get('/get-user/:userId', getUser);  // Adding a middleware to verify JWT token

// Update user details (PUT)
router.put('/update-user/:userId', updateUser);  // Adding a middleware to verify JWT token
// Create a new profile with Form Data (including profile image)
router.post('/create-profile/:id', createProfile);  // Profile creation with userId in params

// Edit the user profile by userId
router.put('/edit-profile/:id', editProfile);  // Profile editing by userId

// Get the user profile by userId
router.get('/get-profile/:id', getProfile);  // Get profile by userId
router.get('/send-birthday-wishes', sendBirthdayWishes);
router.get('/check-birthday/:userId', checkUserBirthday);
router.post('/post/:userId', postStory);
// routes/storyRoutes.js
router.delete('/deletestory/:userId/:storyId', deleteStory);
router.get('/getAllStories', getAllStories);
router.get('/getUserStories/:userId', getUserStories);
router.post('/purchaseplan', purchasePlan);
router.get('/myplan/:userId', getSubscribedPlan);
router.post('/addcustomer/:userId', addCustomerToUser);
router.get('/allcustomers/:userId', getAllCustomersForUser);
router.put('/update-customers/:userId/:customerId', updateCustomer);
router.delete('/delete-customers/:userId/:customerId', deleteCustomer);
router.post('/buy', buyPoster);
router.post('/checkout', checkoutOrder);
// ✅ New routes:
router.get('/allorders', getAllOrders);               // GET /api/orders/all
router.put('/orderstatus/:id', updateOrderStatus);
router.delete('/deleteorder/:id', deleteOrder);
router.get('/userorders/:userId', getOrdersByUserId); // GET /api/orders/user/:userId
router.get('/wishes/:userId', showBirthdayWishOrCountdown);
router.get('/refferalcode/:userId', getReferralCodeByUserId);
router.get('/wallet/:userId', getUserWallet);
router.post('/deleteaccount', deleteAccount)
router.get('/confirm-delete-account/:token', confirmDeleteAccount);
router.delete('/delete-user/:userId', deleteUser);
router.post('/contact-us/:userId', addContactUs);
router.get('/getallcontactus', getAllContactUs);
router.post('/report/:reporterId/:reportedUserId', reportUser);
// In your routes file
router.get('/horoscope', getHoroscopeBySign);
router.post('/contactwithus', addWebsiteContact);
// In routes file
router.post('/redeem/:userId', requestWalletRedemption);

router.get('/getredemptionstatus/:userId', getWalletRedemptionStatus);

router.post("/user-history", saveUserHistory);
router.get("/user-history/:userId", getUserHistory);

router.get("/allreels/:userId", getAllReels);
router.post("/likereel/:reelId/:userId", likeReel);
router.post("/unlikereel/:reelId/:userId", unlikeReel);
router.post("/panchang/:userId", getPanchang);
router.get("/getgreet/:userId", sendGreetingNotification);
router.put('/update-lang/:userId', updateLanguage);
router.post('/verify-firebase-otp', verifyOTPs);
router.post("/sendchat/:senderId/:receiverId", sendMessageController);
router.get("/getchat/:senderId/:receiverId", getChatMessagesController);






















export default router;
