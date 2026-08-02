const imageService = require('../services/image.service');

class ImageController {
  async uploadImageAndPrompt(req, res, next) {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = await imageService.uploadImageAndPrompt(req.file, req.body, clientIp);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateFeedback(req, res, next) {
    try {
      const { imageId, feedback } = req.body;
      const result = await imageService.updateFeedback(imageId, feedback);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listImages(req, res, next) {
    try {
      const { itemsPerPage, page } = req.query;
      const result = await imageService.listImages(itemsPerPage, page);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listApprovedImages(req, res, next) {
    try {
      const { itemsPerPage, page } = req.query;
      const result = await imageService.listApprovedImages(itemsPerPage, page);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async likeDislikeImage(req, res, next) {
    try {
      const { id } = req.params;
      const { like } = req.body;
      const result = await imageService.likeDislikeImage(id, like);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ImageController();
