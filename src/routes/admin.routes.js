const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.post('/toggle-approval/:id', adminController.toggleApproval.bind(adminController));
router.post('/compress-image/:id', adminController.compressSingleImage.bind(adminController));
router.delete('/delete-image/:id', adminController.deleteSingleImage.bind(adminController));
router.post('/compress-all-images', adminController.compressAllImages.bind(adminController));
router.get('/list-subscribed-users', adminController.listSubscribedUsers.bind(adminController));
router.post('/toggle-block-status', adminController.toggleBlockStatus.bind(adminController));
router.delete('/delete-images-from', adminController.deleteImagesBeforeCutoff.bind(adminController));

module.exports = router;
