const imageRepository = require('../repositories/image.repository');
const { resolveCountryByIp } = require('../utils/geo.util');
const { uploadOriginalToFirebase, generateThumbnail, buildFirebasePublicUrl, deleteLocalFileOnly } = require('../utils/image.util');
const logger = require('../utils/logger.util');

class ImageService {
  /**
   * Uploads original image to Firebase Storage, saves metadata in DB, and triggers background thumbnail creation.
   */
  async uploadImageAndPrompt(file, body, clientIp) {
    if (!file) {
      const err = new Error('No file uploaded');
      err.statusCode = 400;
      throw err;
    }

    // Upload original image to Firebase Storage and get relative path for DB (local file remains for background compression)
    const storedImagePath = await uploadOriginalToFirebase(file.path);

    const country = resolveCountryByIp(clientIp);

    const cleanPrompt = (body.prompt || '').replace(/"/g, '');
    const cleanModelName = (body.modelName || '').replace(/"/g, '');
    const cleanStylePreset = (body.stylePreset || '').replace(/"/g, '');
    const cleanAspectRatio = (body.aspectRatio || '').replace(/"/g, '');
    const cleanFeedback = (body.feedback || 'no feedback').replace(/"/g, '');
    const cleanDeviceId = body.deviceId ? body.deviceId.replace(/"/g, '') : 'noDeviceId';
    const cleanExtraa = body.extraa;
    const cleanVersionCode = body.versionCode ? body.versionCode.replace(/"/g, '') : 'old_versions';

    const imageRecord = await imageRepository.createImage({
      path: storedImagePath,
      prompt: cleanPrompt,
      modelName: cleanModelName,
      stylePreset: cleanStylePreset,
      aspectRatio: cleanAspectRatio,
      country,
      feedback: cleanFeedback,
      versionCode: cleanVersionCode,
      deviceId: cleanDeviceId,
      extraa: cleanExtraa
    });

    const imageId = imageRecord.id;

    // Trigger background compression without awaiting
    this.compressImage(imageId).catch((err) => {
      logger.error(`Background compression failed for image ID ${imageId}:`, err.message);
    });

    return {
      message: 'Image uploaded successfully!',
      imageId
    };
  }

  /**
   * Updates feedback for an uploaded image.
   */
  async updateFeedback(imageId, feedback) {
    const updated = await imageRepository.updateFeedback(imageId, feedback);
    if (!updated) {
      const err = new Error('Image not found');
      err.statusCode = 404;
      throw err;
    }
    return {
      message: 'Feedback submitted successfully!',
      imageId
    };
  }

  /**
   * Background thumbnail compression worker.
   * Generates thumbnail, uploads to Firebase, updates DB, and deletes local original image.
   */
  async compressImage(imageId) {
    const image = await imageRepository.findById(imageId);
    if (!image) {
      logger.error(`Image with ID ${imageId} not found for compression`);
      return null;
    }

    if (!image.thumbPath) {
      const newThumbPath = await generateThumbnail(image.path);
      await imageRepository.updateThumbPath(imageId, newThumbPath);

      // Clean up local original file ONLY AFTER thumbnail generation & upload succeed
      deleteLocalFileOnly(image.path);

      return { success: true, message: 'Thumbnail created and saved successfully' };
    }

    // If thumbnail already exists, ensure local original image is cleaned up
    deleteLocalFileOnly(image.path);
    return { success: true, message: 'Thumbnail already exists' };
  }

  /**
   * Paginated listing of all images.
   */
  async listImages(itemsPerPage = 10, page = 1) {
    const limit = parseInt(itemsPerPage) || 10;
    const currentPage = parseInt(page) || 1;
    const offset = (currentPage - 1) * limit;

    const results = await imageRepository.findAllPaginated(limit, offset);

    const listImages = results.map(result => ({
      id: result.id,
      prompt: result.prompt,
      image: buildFirebasePublicUrl(result.path),
      thumbPath: result.thumbPath ? buildFirebasePublicUrl(result.thumbPath) : null,
      time: result.time,
      modelName: result.modelName,
      stylePreset: result.stylePreset,
      aspectRatio: result.aspectRatio,
      country: result.country,
      approved: result.approved,
      feedback: result.feedback,
      versionCode: result.version_code,
      deviceId: result.deviceId,
      extraa: result.extraa,
      likeCount: result.likeCount
    }));

    return { listImages };
  }

  /**
   * Paginated listing of approved images.
   */
  async listApprovedImages(itemsPerPage = 10, page = 1) {
    const limit = parseInt(itemsPerPage) || 10;
    const currentPage = parseInt(page) || 1;
    const offset = (currentPage - 1) * limit;

    const totalCount = await imageRepository.countApproved();
    const totalPages = Math.ceil(totalCount / limit);
    const lastItemIndex = Math.min(currentPage * limit, totalCount);

    const results = await imageRepository.findApprovedPaginated(limit, offset);

    const listImages = results.map(result => ({
      id: result.id,
      prompt: result.prompt,
      image: buildFirebasePublicUrl(result.path),
      thumbPath: result.thumbPath ? buildFirebasePublicUrl(result.thumbPath) : null,
      time: result.time,
      modelName: result.modelName,
      stylePreset: result.stylePreset,
      aspectRatio: result.aspectRatio,
      country: result.country,
      approved: result.approved,
      feedback: result.feedback,
      likeCount: result.likeCount
    }));

    return {
      count: results.length,
      totalCount,
      currentPageNo: currentPage,
      totalPages,
      lastItemIndex,
      listImages
    };
  }

  /**
   * Toggles like/dislike on an image atomically.
   */
  async likeDislikeImage(imageId, like) {
    if (typeof like !== 'boolean') {
      const err = new Error('`like` must be a boolean');
      err.statusCode = 400;
      throw err;
    }

    let newLikeCount;
    if (like) {
      newLikeCount = await imageRepository.incrementLikeCount(imageId);
    } else {
      newLikeCount = await imageRepository.decrementLikeCount(imageId);
    }

    if (newLikeCount === null) {
      const err = new Error('Image not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      success: true,
      likeCount: newLikeCount,
      message: `Like count ${like ? 'increased' : 'decreased'} successfully`
    };
  }
}

module.exports = new ImageService();
