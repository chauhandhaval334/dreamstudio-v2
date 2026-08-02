const subscriptionService = require('../services/subscription.service');

class SubscriptionController {
  async subscribeUser(req, res, next) {
    try {
      const { order_id, package_name, sku, purchase_time, device_id } = req.query;
      const result = await subscriptionService.subscribeUser({
        order_id,
        package_name,
        sku,
        purchase_time,
        device_id
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async useToken(req, res, next) {
    try {
      const { order_id } = req.params;
      const result = await subscriptionService.useToken(order_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOrderDetails(req, res, next) {
    try {
      const { order_id } = req.params;
      const result = await subscriptionService.getOrderDetails(order_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOrderDetailsByDeviceId(req, res, next) {
    try {
      const { device_id } = req.params;
      const result = await subscriptionService.getOrderDetailsByDeviceId(device_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SubscriptionController();
