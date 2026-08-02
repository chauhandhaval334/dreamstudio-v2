require("dotenv").config();

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT env variable: ${err.message}`);
  }
} else {
  const serviceAccountPath = path.join(__dirname, "../../firebase-service-account.json");
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  }
}

if (!serviceAccount) {
  throw new Error("Firebase service account not configured.");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "dream-studio-ai-dhwix.firebasestorage.app",
  });
}

const bucket = admin.storage().bucket();

module.exports = {
  admin,
  bucket,
};
