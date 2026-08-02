const pool = require('../config/postgres');
const subscriptionRepository = require('../repositories/subscription.repository');
const { skuTokens, skuDurations } = require('../constants/sku.constants');

class SubscriptionService {
  /**
   * Processes user subscription with full transactional safety.
   */
  async subscribeUser({ order_id, package_name, sku, purchase_time, device_id }) {
    if (!order_id || !package_name || !sku || !purchase_time) {
      const err = new Error('Missing required parameters');
      err.statusCode = 400;
      throw err;
    }

    const tokenConfig = skuTokens[sku];
    if (!tokenConfig) {
      const err = new Error('Invalid SKU');
      err.statusCode = 400;
      throw err;
    }

    let total_token = tokenConfig.total_token;
    let available_token = tokenConfig.available_token;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (device_id) {
        const results = await subscriptionRepository.findActiveByDeviceId(device_id, client);

        if (results.length > 0) {
          const existingAvailableToken = results[0].available_token;
          const existingTotalToken = results[0].total_token;

          if (existingAvailableToken > 0) {
            available_token += existingAvailableToken;
            total_token += existingTotalToken;
          }

          await subscriptionRepository.zeroTokensByDeviceId(device_id, client);
        }

        const isDeviceAlreadyBlocked = await subscriptionRepository.isDeviceBlocked(device_id, client);
        const isOrderBlocked = order_id.startsWith('GPA') ? 0 : 1;
        const isBlocked = isDeviceAlreadyBlocked || isOrderBlocked ? 1 : 0;
        const finalAvailableToken = isBlocked ? 0 : available_token;

        await subscriptionRepository.createSubscriptionWithDevice({
          order_id,
          package_name,
          sku,
          purchase_time,
          available_token: finalAvailableToken,
          total_token,
          device_id,
          isBlocked
        }, client);
      } else {
        await subscriptionRepository.createSubscriptionWithoutDevice({
          order_id,
          package_name,
          sku,
          purchase_time,
          available_token,
          total_token
        }, client);
      }

      await client.query('COMMIT');
      return { message: 'Data inserted successfully' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Deducts 1 token for an order.
   */
  async useToken(orderId) {
    const order = await subscriptionRepository.findByOrderId(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.available_token <= 0) {
      const err = new Error('No available tokens');
      err.statusCode = 400;
      throw err;
    }

    const newAvailableToken = order.available_token - 1;
    const currentTime = Date.now();

    await subscriptionRepository.updateTokenUsage(orderId, newAvailableToken, currentTime);

    return { message: 'Token deducted and last_used updated successfully' };
  }

  /**
   * Gets order details by order ID. Supports both duration subscriptions and non-expiring token packs.
   */
  async getOrderDetails(orderId) {
    const order = await subscriptionRepository.findDetailsByOrderId(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const { available_token, total_token, purchase_time, sku } = order;
    const durationInDays = skuDurations[sku];

    const expiration_time = durationInDays
      ? new Date(Number(purchase_time) + (durationInDays * 24 * 60 * 60 * 1000)).toISOString()
      : null;

    return {
      order_id: orderId,
      available_token,
      total_token,
      purchase_time,
      expiration_time
    };
  }

  /**
   * Gets order details by device ID. Supports both duration subscriptions and non-expiring token packs.
   */
  async getOrderDetailsByDeviceId(deviceId) {
    const order = await subscriptionRepository.findDetailsByDeviceId(deviceId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const { order_id, available_token, total_token, purchase_time, sku } = order;
    const durationInDays = skuDurations[sku];

    const expiration_time = durationInDays
      ? new Date(Number(purchase_time) + (durationInDays * 24 * 60 * 60 * 1000)).toISOString()
      : null;

    return {
      order_id,
      available_token,
      total_token,
      purchase_time,
      expiration_time
    };
  }
}

module.exports = new SubscriptionService();
