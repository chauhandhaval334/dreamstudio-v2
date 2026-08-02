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
 * Uploads an original image file to Firebase Storage and cleans up local file upon success.
 * @param {string} localFilePath
 * @returns {Promise<string>} Firebase public URL or local relative path.
 */
async function uploadOriginalToFirebase(localFilePath) {
  const absolutePath = path.isAbsolute(localFilePath)
    ? localFilePath
    : path.join(__dirname, '../../', localFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File does not exist at ${absolutePath}`);
  }

  const relativePath = path.relative(path.join(__dirname, '../../'), absolutePath);

  try {
    if (bucket && bucket.name) {
      const filename = path.basename(absolutePath);
      const destination = `images/${filename}`;
      await bucket.upload(absolutePath, {
        destination,
        metadata: {
          contentType: getContentType(filename)
        }
      });
      const file = bucket.file(destination);
      await file.makePublic();
      logger.info(`Original image uploaded to Firebase: ${destination}`);

      // Auto-delete temporary local file after successful upload
      try {
        fs.unlinkSync(absolutePath);
        logger.info(`Cleaned up temporary local upload file: ${absolutePath}`);
      } catch (cleanupErr) {
        logger.warn(`Failed to cleanup temp upload file ${absolutePath}:`, cleanupErr.message);
      }

      return file.publicUrl();
    }
  } catch (err) {
    logger.warn('Firebase Storage upload failed for original image, using local path:', err.message);
  }

  return relativePath;
}

/**
 * Generates a thumbnail using Sharp and uploads to Firebase Storage.
 * @param {string} originalPathOrUrl
 * @returns {Promise<string>} Thumbnail path or Firebase public URL.
 */
async function generateThumbnail(originalPathOrUrl) {
  let localImagePath;

  if (originalPathOrUrl.startsWith('http://') || originalPathOrUrl.startsWith('https://')) {
    // Firebase URL or remote URL: download temp file for processing if needed
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

  const uploadDirName = process.env.UPLOAD_DIR || 'image';
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

  // Clean temp file if created
  if (localImagePath.includes(path.join('..', '..', 'temp')) || localImagePath.includes('/temp/')) {
    try { fs.unlinkSync(localImagePath); } catch (e) {}
  }

  const relativeThumbPath = path.relative(path.join(__dirname, '../../'), thumbnailLocalPath);

  // Try uploading thumbnail to Firebase Storage
  try {
    if (bucket && bucket.name) {
      const destination = `thumbnails/${thumbnailFilename}`;
      await bucket.upload(thumbnailLocalPath, {
        destination,
        metadata: { contentType: 'image/jpeg' }
      });
      const file = bucket.file(destination);
      await file.makePublic();
      logger.info(`Thumbnail uploaded to Firebase: ${destination}`);

      // Auto-delete temporary local thumbnail file after successful upload
      try {
        fs.unlinkSync(thumbnailLocalPath);
        logger.info(`Cleaned up temporary local thumbnail file: ${thumbnailLocalPath}`);
      } catch (cleanupErr) {
        logger.warn(`Failed to cleanup temp thumbnail file ${thumbnailLocalPath}:`, cleanupErr.message);
      }

      return file.publicUrl();
    }
  } catch (err) {
    logger.warn('Firebase Storage upload warning for thumbnail, using relative path:', err.message);
  }

  return relativeThumbPath;
}

/**
 * Deletes file from Firebase Storage and/or local filesystem.
 * @param {string|null} pathOrUrl
 */
async function deleteFile(pathOrUrl) {
  if (!pathOrUrl) return;

  // Firebase Storage deletion if pathOrUrl is a Firebase URL
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      if (bucket && bucket.name) {
        const urlObj = new URL(pathOrUrl);
        const pathname = decodeURIComponent(urlObj.pathname);
        const match = pathname.match(/\/b\/[^\/]+\/o\/(.+)$/) || pathname.match(/\/([^\/]+\/(?:images|thumbnails)\/.+)$/);
        if (match && match[1]) {
          const storagePath = match[1];
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
    return;
  }

  // Local filesystem deletion
  const absolutePath = path.isAbsolute(pathOrUrl)
    ? pathOrUrl
    : path.join(__dirname, '../../', pathOrUrl);

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
 * Formats image path using environment variable BASE_URL.
 * @param {string|null} imagePath
 * @returns {string|null}
 */
function formatImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = (process.env.BASE_URL || 'https://apis.dreamstudioai.in').replace(/\/$/, '');
  const cleanPath = imagePath.replace(/^\//, '');
  return `${baseUrl}/${cleanPath}`;
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
  uploadOriginalToFirebase,
  generateThumbnail,
  deleteFile,
  formatImageUrl
};
