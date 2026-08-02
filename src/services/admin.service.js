const imageRepository = require('../repositories/image.repository');
const subscriptionRepository = require('../repositories/subscription.repository');
const { generateThumbnail, deleteFile } = require('../utils/image.util');
const logger = require('../utils/logger.util');

class AdminService {
  /**
   * Toggles image approval status and generates thumbnail if missing.
   */
  async toggleApproval(imageId, approved) {
    const image = await imageRepository.findById(imageId);
    if (!image) {
      const err = new Error('Image not found');
      err.statusCode = 404;
      throw err;
    }

    if (!image.thumbPath) {
      const newThumbPath = await generateThumbnail(image.path);
      await imageRepository.updateApprovalStatus(imageId, approved, newThumbPath);
      return { success: true, message: 'Approval status and thumbnail updated successfully' };
    } else {
      await imageRepository.updateApprovalStatus(imageId, approved);
      return { success: true, message: 'Approval status updated successfully' };
    }
  }

  /**
   * Generates thumbnail for a single image ID if missing.
   */
  async compressSingleImage(imageId) {
    const image = await imageRepository.findById(imageId);
    if (!image) {
      const err = new Error('Image not found');
      err.statusCode = 404;
      throw err;
    }

    if (!image.thumbPath) {
      const newThumbPath = await generateThumbnail(image.path);
      await imageRepository.updateThumbPath(imageId, newThumbPath);
      return { success: true, message: 'Thumbnail created and saved successfully' };
    } else {
      return { success: true, message: 'Thumbnail already exists' };
    }
  }

  /**
   * Deletes an image record and associated files (Firebase Storage & Local).
   */
  async deleteSingleImage(imageId) {
    const image = await imageRepository.findById(imageId);
    if (!image) {
      const err = new Error('Image not found');
      err.statusCode = 404;
      throw err;
    }

    await deleteFile(image.path);
    if (image.thumbPath) {
      await deleteFile(image.thumbPath);
    }

    await imageRepository.deleteById(imageId);
    return { success: true, message: 'Image deleted successfully' };
  }

  /**
   * Batch generates thumbnails for all uncompressed images.
   */
  async compressAllImages() {
    const results = await imageRepository.findUncompressed();
    if (results.length === 0) {
      const err = new Error('No images found with null thumbPath');
      err.statusCode = 404;
      throw err;
    }

    let processedCount = 0;
    for (const image of results) {
      try {
        const newThumbPath = await generateThumbnail(image.path);
        await imageRepository.updateThumbPath(image.id, newThumbPath);
        processedCount++;
      } catch (error) {
        logger.error(`Error creating thumbnail for image ID ${image.id}:`, error.message);
      }
    }

    return {
      success: true,
      message: `${processedCount} thumbnails created and saved successfully`
    };
  }

  /**
   * Lists all subscribed users.
   */
  async listSubscribedUsers() {
    const results = await subscriptionRepository.findAllSubscribedUsers();

    const subscribedUsers = results.map(result => ({
      availableToken: result.available_token,
      deviceId: result.device_id && result.device_id !== 'NULL' ? result.device_id : null,
      orderId: result.order_id,
      packageName: result.package_name,
      sku: result.sku,
      time: result.time,
      totalToken: result.total_token,
      isBlocked: result.isBlocked,
      lastUsed: result.last_used
    }));

    return {
      count: results.length,
      subscribedUsers
    };
  }

  /**
   * Toggles block status for a user device.
   */
  async toggleBlockStatus(deviceId, isBlocked) {
    if (!deviceId || typeof isBlocked !== 'number') {
      const err = new Error('Invalid request data');
      err.statusCode = 400;
      throw err;
    }

    const affectedRows = await subscriptionRepository.toggleBlockStatusByDeviceId(deviceId, isBlocked);
    if (affectedRows === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      message: `User with Device ID ${deviceId} has been ${isBlocked ? 'blocked' : 'unblocked'}.`
    };
  }

  /**
   * Deletes unapproved images before a cutoff date (Firebase Storage & Local).
   */
  async deleteImagesBeforeCutoff(cutoffDate) {
    if (!cutoffDate) {
      const err = new Error('Cutoff date is required');
      err.statusCode = 400;
      throw err;
    }

    const results = await imageRepository.findUnapprovedBeforeCutoff(cutoffDate);
    if (results.length === 0) {
      const err = new Error('No images found to delete');
      err.statusCode = 404;
      throw err;
    }

    for (const image of results) {
      await deleteFile(image.path);
      if (image.thumbPath) {
        await deleteFile(image.thumbPath);
      }
      await imageRepository.deleteById(image.id);
    }

    return { success: true, message: 'Images deleted successfully' };
  }
}

module.exports = new AdminService();
