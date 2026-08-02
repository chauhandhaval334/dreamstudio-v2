const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('./logger.util');

let bucket = null;
try {
  const firebase = require('../config/firebase');
  bucket = firebase.bucket;
} catch (err) {
  logger.warn('Firebase Storage uninitialized (service account missing):', err.message);
}

/**
 * Builds a public Firebase Storage URL for a given file path.
 * @param {string|null} filePath
 * @returns {string|null}
 */
function buildFirebasePublicUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\//, '');
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'dream-studio-ai-dhwix.firebasestorage.app';
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(cleanPath)}?alt=media`;
}

/**
 * Uploads an original image file to Firebase Storage and returns the database relative path.
 * NOTE: Keeps the local original file intact so background thumbnail processing can consume it.
 * @param {string} localFilePath
 * @returns {Promise<string>} Relative path for database storage (e.g., image/filename.jpg).
 */
async function uploadOriginalToFirebase(localFilePath) {
  const absolutePath = path.isAbsolute(localFilePath)
    ? localFilePath
    : path.join(__dirname, '../../', localFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File does not exist at ${absolutePath}`);
  }

  const relativePath = path.relative(path.join(__dirname, '../../'), absolutePath).replace(/\\/g, '/');

  if (!bucket || !bucket.name) {
    throw new Error('Firebase Storage bucket is not configured or uninitialized.');
  }

  const filename = path.basename(absolutePath);
  const destination = `image/${filename}`;

  await bucket.upload(absolutePath, {
    destination,
    metadata: {
      contentType: getContentType(filename),
      cacheControl: 'public,max-age=31536000'
    }
  });

  logger.info(`Original image uploaded to Firebase Storage: ${destination}`);

  // Do NOT delete local file here. It must remain for background thumbnail compression.
  return relativePath;
}

/**
 * Generates a thumbnail using Sharp, uploads to Firebase Storage, and returns relative path for DB.
 * Deletes the local thumbnail file after successful upload.
 * @param {string} originalPathOrUrl
 * @returns {Promise<string>} Relative path for database storage (e.g., thumbnails/thumbnail_filename.jpg).
 */
async function generateThumbnail(originalPathOrUrl) {
  let localImagePath;

  if (originalPathOrUrl.startsWith('http://') || originalPathOrUrl.startsWith('https://')) {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilename = `temp_${Date.now()}_${path.basename(new URL(originalPathOrUrl).pathname)}`;
    localImagePath = path.join(tempDir, tempFilename);

    const response = await fetch(originalPathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch original image from URL: ${originalPathOrUrl}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(localImagePath, Buffer.from(arrayBuffer));
  } else {
    localImagePath = path.isAbsolute(originalPathOrUrl)
      ? originalPathOrUrl
      : path.join(__dirname, '../../', originalPathOrUrl);
  }

  if (!fs.existsSync(localImagePath)) {
    throw new Error(`Original image file does not exist at ${localImagePath}`);
  }

  const thumbnailDir = path.join(__dirname, '../../thumbnails');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  const thumbnailFilename = 'thumbnail_' + path.basename(localImagePath);
  const thumbnailLocalPath = path.join(thumbnailDir, thumbnailFilename);

  // Resize image with Sharp
  await sharp(localImagePath)
    .resize({ width: 500 })
    .jpeg({ quality: 90 })
    .toFile(thumbnailLocalPath);

  // Clean temp file if created from remote URL
  if (localImagePath.includes(path.join('..', '..', 'temp')) || localImagePath.includes('/temp/')) {
    try {
      if (fs.existsSync(localImagePath)) fs.unlinkSync(localImagePath);
    } catch (e) {}
  }

  const relativeThumbPath = path.relative(path.join(__dirname, '../../'), thumbnailLocalPath).replace(/\\/g, '/');

  if (!bucket || !bucket.name) {
    throw new Error('Firebase Storage bucket is not configured or uninitialized.');
  }

  const destination = `thumbnails/${thumbnailFilename}`;
  await bucket.upload(thumbnailLocalPath, {
    destination,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=31536000'
    }
  });

  logger.info(`Thumbnail uploaded to Firebase Storage: ${destination}`);

  // Delete local thumbnail ONLY after upload succeeds
  if (fs.existsSync(thumbnailLocalPath)) {
    fs.unlinkSync(thumbnailLocalPath);
    logger.info(`Cleaned up local thumbnail file after Firebase upload: ${thumbnailLocalPath}`);
  }

  return relativeThumbPath;
}

/**
 * Deletes file from Firebase Storage and local filesystem.
 * @param {string|null} pathOrUrl
 */
async function deleteFile(pathOrUrl) {
  if (!pathOrUrl) return;

  // Firebase Storage object deletion
  try {
    if (bucket && bucket.name) {
      const storagePath = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
        ? decodeURIComponent(new URL(pathOrUrl).pathname).replace(/^.*\/o\//, '').replace(/\?.*$/, '')
        : pathOrUrl.replace(/\\/g, '/').replace(/^\//, '');

      if (storagePath) {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          logger.info(`Deleted file from Firebase Storage: ${storagePath}`);
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to delete Firebase object ${pathOrUrl}:`, err.message);
  }

  // Local filesystem deletion
  deleteLocalFileOnly(pathOrUrl);
}

/**
 * Deletes only the local file from filesystem.
 * @param {string|null} relativeOrAbsolutePath
 */
function deleteLocalFileOnly(relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) return;
  if (relativeOrAbsolutePath.startsWith('http://') || relativeOrAbsolutePath.startsWith('https://')) return;

  const absolutePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(__dirname, '../../', relativeOrAbsolutePath);

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      logger.info(`Deleted local file: ${absolutePath}`);
    }
  } catch (err) {
    logger.error(`Failed to delete local file ${absolutePath}:`, err.message);
  }
}

/**
 * Helper to determine content type.
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    default: return 'image/jpeg';
  }
}

module.exports = {
  buildFirebasePublicUrl,
  uploadOriginalToFirebase,
  generateThumbnail,
  deleteFile,
  deleteLocalFileOnly
};
