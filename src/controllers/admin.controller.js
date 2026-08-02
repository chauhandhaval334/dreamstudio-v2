const adminService = require('../services/admin.service');

class AdminController {
  async toggleApproval(req, res, next) {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const result = await adminService.toggleApproval(id, approved);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async compressSingleImage(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.compressSingleImage(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteSingleImage(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteSingleImage(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async compressAllImages(req, res, next) {
    try {
      const result = await adminService.compressAllImages();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listSubscribedUsers(req, res, next) {
    try {
      const result = await adminService.listSubscribedUsers();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async toggleBlockStatus(req, res, next) {
    try {
      const { deviceId, isBlocked } = req.body;
      const result = await adminService.toggleBlockStatus(deviceId, isBlocked);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteImagesBeforeCutoff(req, res, next) {
    try {
      const { cutoffDate } = req.body;
      const result = await adminService.deleteImagesBeforeCutoff(cutoffDate);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
