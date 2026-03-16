// pushNotification.js
import admin from "../utils/firebase.js"; // Directly firebase-admin initialized instance
import User from "../Models/User.js";

/**
 * Sends a push notification for a chat message
 */
export const sendPushNotification = async ({
  receiverId,
  senderName,
  messageText,
  hasImage,
  chatId,
  senderId,
}) => {
  try {
    const user = await User.findById(receiverId);

    if (!user?.fcmToken) {
      console.log("⚠️ No FCM token. Skipping push.");
      return;
    }

    // Decide notification body
    const bodyText = hasImage
      ? `${senderName} sent you a photo 📷`
      : `${senderName} is texting you, please check`;

    // FCM payload
    const payload = {
      token: user.fcmToken,
      notification: {
        title: "📩 New Message",
        body: bodyText,
      },
      data: {
        senderId: senderId.toString(),
        chatId: chatId.toString(),
        message: messageText || "",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
      },
    };

    // Send push and capture Firebase response
    const response = await admin.messaging().send(payload);

    console.log("✅ Push sent successfully!");
    console.log("📦 Firebase response (message ID):", response);
    console.log("📝 Payload sent:", JSON.stringify(payload, null, 2));
    console.log("💬 Message sent:", messageText || "<image only or empty>"); // ✅ Yahan actual message bhi log ho raha

  } catch (error) {
    console.error("❌ Push failed but message already sent:", error.message);

    // Invalid token handling
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      await User.findByIdAndUpdate(receiverId, { fcmToken: null });
      console.log("🧹 Invalid FCM token removed");
    }
  }
};