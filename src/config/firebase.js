require("dotenv").config();

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(
    __dirname,
    "../../firebase-service-account.json"
));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
}

const bucket = admin.storage().bucket();

module.exports = {
    admin,
    bucket,
};
