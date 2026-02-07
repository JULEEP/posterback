import admin from "./firebase.js";

export const sendPushNotification = async ({
  fcmToken,
  title,
  body,
  data = {}
}) => {
  if (!fcmToken) return;

  const message = {
    token: fcmToken,
    notification: {
      title,
      body
    },
    data
  };

  try {
    await admin.messaging().send(message);
    console.log("✅ Push sent:", title);
  } catch (err) {
    console.error("❌ FCM Error:", err.message);
  }
};
