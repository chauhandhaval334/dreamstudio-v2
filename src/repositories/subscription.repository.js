const pool = require("../config/postgres");

class SubscriptionRepository {
  /**
   * Fetches all subscribed users ordered by time DESC.
   * @param {Object} [client=pool]
   * @returns {Promise<Array<Object>>}
   */
  async findAllSubscribedUsers(client = pool) {
    const query = `
      SELECT available_token, device_id, order_id, package_name, sku, time, total_token, "isBlocked", last_used
      FROM tbl_subscription
      ORDER BY time DESC
    `;
    const { rows } = await client.query(query);
    return rows;
  }

  /**
   * Toggles block status for a device ID and zeroes out tokens.
   * @param {string} deviceId
   * @param {number} isBlocked
   * @param {Object} [client=pool]
   * @returns {Promise<number>} Number of affected rows.
   */
  async toggleBlockStatusByDeviceId(deviceId, isBlocked, client = pool) {
    const query = `
      UPDATE tbl_subscription
      SET "isBlocked" = $1, available_token = 0
      WHERE device_id = $2 OR "deviceId" = $2
      RETURNING *
    `;
    const { rows } = await client.query(query, [isBlocked, deviceId]);
    return rows.length;
  }

  /**
   * Finds active subscriptions (available_token > 0) for a device ID.
   * @param {string} deviceId
   * @param {Object} [client=pool]
   * @returns {Promise<Array<Object>>}
   */
  async findActiveByDeviceId(deviceId, client = pool) {
    const query = `
      SELECT available_token, total_token
      FROM tbl_subscription
      WHERE (device_id = $1 OR "deviceId" = $1) AND available_token > 0
      ORDER BY time DESC
    `;
    const { rows } = await client.query(query, [deviceId]);
    return rows;
  }

  /**
   * Zeroes out available tokens for a device ID.
   * @param {string} deviceId
   * @param {Object} [client=pool]
   * @returns {Promise<number>} Number of updated records.
   */
  async zeroTokensByDeviceId(deviceId, client = pool) {
    const query = `
      UPDATE tbl_subscription
      SET available_token = 0
      WHERE device_id = $1 OR "deviceId" = $1
      RETURNING *
    `;
    const { rows } = await client.query(query, [deviceId]);
    return rows.length;
  }

  /**
   * Checks whether a device is currently blocked.
   * @param {string} deviceId
   * @param {Object} [client=pool]
   * @returns {Promise<boolean>}
   */
  async isDeviceBlocked(deviceId, client = pool) {
    const query = `
      SELECT 1
      FROM tbl_subscription
      WHERE (device_id = $1 OR "deviceId" = $1) AND "isBlocked" = 1
      LIMIT 1
    `;
    const { rows } = await client.query(query, [deviceId]);
    return rows.length > 0;
  }

  /**
   * Creates a subscription record with device ID.
   * @param {Object} data
   * @param {string} data.order_id
   * @param {string} data.package_name
   * @param {string} data.sku
   * @param {number|string} data.purchase_time
   * @param {number} data.available_token
   * @param {number} data.total_token
   * @param {string} data.device_id
   * @param {number} data.isBlocked
   * @param {Object} [client=pool]
   * @returns {Promise<Object>}
   */
  async createSubscriptionWithDevice({
    order_id,
    package_name,
    sku,
    purchase_time,
    available_token,
    total_token,
    device_id,
    isBlocked
  }, client = pool) {
    const query = `
      INSERT INTO tbl_subscription (order_id, package_name, sku, time, available_token, total_token, device_id, "deviceId", "isBlocked")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
      RETURNING *
    `;
    const values = [
      order_id,
      package_name,
      sku,
      purchase_time,
      available_token,
      total_token,
      device_id,
      isBlocked
    ];
    const { rows } = await client.query(query, values);
    return rows[0];
  }

  /**
   * Creates a subscription record without device ID.
   * @param {Object} data
   * @param {string} data.order_id
   * @param {string} data.package_name
   * @param {string} data.sku
   * @param {number|string} data.purchase_time
   * @param {number} data.available_token
   * @param {number} data.total_token
   * @param {Object} [client=pool]
   * @returns {Promise<Object>}
   */
  async createSubscriptionWithoutDevice({
    order_id,
    package_name,
    sku,
    purchase_time,
    available_token,
    total_token
  }, client = pool) {
    const query = `
      INSERT INTO tbl_subscription (order_id, package_name, sku, time, available_token, total_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      order_id,
      package_name,
      sku,
      purchase_time,
      available_token,
      total_token
    ];
    const { rows } = await client.query(query, values);
    return rows[0];
  }

  /**
   * Finds subscription record by order ID.
   * @param {string} orderId
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async findByOrderId(orderId, client = pool) {
    const query = `
      SELECT *
      FROM tbl_subscription
      WHERE order_id = $1
    `;
    const { rows } = await client.query(query, [orderId]);
    return rows[0] || null;
  }

  /**
   * Deducts token and updates last_used timestamp for an order ID.
   * @param {string} orderId
   * @param {number} newAvailableToken
   * @param {number} lastUsedTimestamp
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async updateTokenUsage(orderId, newAvailableToken, lastUsedTimestamp, client = pool) {
    const query = `
      UPDATE tbl_subscription
      SET available_token = $1, last_used = $2
      WHERE order_id = $3
      RETURNING *
    `;
    const { rows } = await client.query(query, [newAvailableToken, lastUsedTimestamp, orderId]);
    return rows[0] || null;
  }

  /**
   * Finds subscription order details by order ID.
   * @param {string} orderId
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async findDetailsByOrderId(orderId, client = pool) {
    const query = `
      SELECT available_token, total_token, time AS purchase_time, sku
      FROM tbl_subscription
      WHERE order_id = $1
    `;
    const { rows } = await client.query(query, [orderId]);
    return rows[0] || null;
  }

  /**
   * Finds latest subscription order details by device ID.
   * @param {string} deviceId
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async findDetailsByDeviceId(deviceId, client = pool) {
    const query = `
      SELECT order_id, available_token, total_token, time AS purchase_time, sku
      FROM tbl_subscription
      WHERE device_id = $1 OR "deviceId" = $1
      ORDER BY time DESC
      LIMIT 1
    `;
    const { rows } = await client.query(query, [deviceId]);
    return rows[0] || null;
  }
}

module.exports = new SubscriptionRepository();
