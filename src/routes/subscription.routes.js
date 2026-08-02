const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');

router.get('/subscribeUser', subscriptionController.subscribeUser.bind(subscriptionController));
router.get('/useToken/:order_id', subscriptionController.useToken.bind(subscriptionController));
router.get('/orderDetails/:order_id', subscriptionController.getOrderDetails.bind(subscriptionController));
router.get('/orderDetailsByDeviceId/:device_id', subscriptionController.getOrderDetailsByDeviceId.bind(subscriptionController));

module.exports = router;
