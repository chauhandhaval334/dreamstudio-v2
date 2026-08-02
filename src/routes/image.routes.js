const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image.controller');
const upload = require('../middleware/upload.middleware');

router.post('/uploadImageAndPrompt', upload.single('image'), imageController.uploadImageAndPrompt.bind(imageController));
router.post('/updateFeedback', imageController.updateFeedback.bind(imageController));
router.get('/list-images', imageController.listImages.bind(imageController));
router.get('/list-approved-images', imageController.listApprovedImages.bind(imageController));
router.post('/like-dislike/:id', imageController.likeDislikeImage.bind(imageController));

module.exports = router;
