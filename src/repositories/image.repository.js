const pool = require("../config/postgres");

class ImageRepository {
  /**
   * Creates a new image record in dream_images.
   * @param {Object} data
   * @param {string} data.path
   * @param {string} data.prompt
   * @param {string} data.modelName
   * @param {string} data.stylePreset
   * @param {string} data.aspectRatio
   * @param {string} data.country
   * @param {string} [data.feedback]
   * @param {string} [data.versionCode]
   * @param {string} [data.deviceId]
   * @param {string} [data.extraa]
   * @param {Object} [client=pool]
   * @returns {Promise<Object>} The created image record.
   */
  async createImage({
    path,
    prompt,
    modelName,
    stylePreset,
    aspectRatio,
    country,
    feedback,
    versionCode,
    deviceId,
    extraa
  }, client = pool) {
    const query = `
      INSERT INTO dream_images (path, prompt, "modelName", "stylePreset", "aspectRatio", country, feedback, version_code, "deviceId", extraa)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      path,
      prompt,
      modelName,
      stylePreset,
      aspectRatio,
      country,
      feedback || "no feedback",
      versionCode || "old_versions",
      deviceId || "noDeviceId",
      extraa
    ];
    const { rows } = await client.query(query, values);
    return rows[0];
  }

  /**
   * Updates feedback text for an image.
   * @param {number} id
   * @param {string} feedback
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>} The updated image record, or null if not found.
   */
  async updateFeedback(id, feedback, client = pool) {
    const query = `
      UPDATE dream_images
      SET feedback = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await client.query(query, [feedback, id]);
    return rows[0] || null;
  }

  /**
   * Finds an image by ID.
   * @param {number} id
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async findById(id, client = pool) {
    const query = `
      SELECT id, path, "thumbPath", prompt, time, "modelName", "stylePreset", "aspectRatio", country, approved, feedback, version_code, "deviceId", extraa, "likeCount"
      FROM dream_images
      WHERE id = $1
    `;
    const { rows } = await client.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Updates thumbnail path for an image.
   * @param {number} id
   * @param {string} thumbPath
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async updateThumbPath(id, thumbPath, client = pool) {
    const query = `
      UPDATE dream_images
      SET "thumbPath" = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await client.query(query, [thumbPath, id]);
    return rows[0] || null;
  }

  /**
   * Counts total images.
   * @param {Object} [client=pool]
   * @returns {Promise<number>}
   */
  async countImages(client = pool) {
    const query = `
      SELECT COUNT(*)::int AS "totalCount"
      FROM dream_images
    `;
    const { rows } = await client.query(query);
    return rows[0].totalCount;
  }

  /**
   * Fetches paginated list of all images.
   * @param {number} limit
   * @param {number} offset
   * @param {Object} [client=pool]
   * @returns {Promise<Array<Object>>}
   */
  async findAllPaginated(limit, offset, client = pool) {
    const query = `
      SELECT id, prompt, path, "thumbPath", time, "modelName", "stylePreset", "aspectRatio", country, approved, feedback, version_code, "deviceId", extraa, "likeCount"
      FROM dream_images
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await client.query(query, [limit, offset]);
    return rows;
  }

  /**
   * Counts total approved images.
   * @param {Object} [client=pool]
   * @returns {Promise<number>}
   */
  async countApproved(client = pool) {
    const query = `
      SELECT COUNT(*)::int AS "totalCount"
      FROM dream_images
      WHERE approved = 1
    `;
    const { rows } = await client.query(query);
    return rows[0].totalCount;
  }

  /**
   * Fetches paginated list of approved images.
   * @param {number} limit
   * @param {number} offset
   * @param {Object} [client=pool]
   * @returns {Promise<Array<Object>>}
   */
  async findApprovedPaginated(limit, offset, client = pool) {
    const query = `
      SELECT id, prompt, path, "thumbPath", time, "modelName", "stylePreset", "aspectRatio", country, approved, feedback, version_code, "deviceId", "likeCount"
      FROM dream_images
      WHERE approved = 1
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await client.query(query, [limit, offset]);
    return rows;
  }

  /**
   * Updates approval status (and optionally thumbPath).
   * @param {number} id
   * @param {number} approved
   * @param {string|null} [thumbPath=null]
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>}
   */
  async updateApprovalStatus(id, approved, thumbPath = null, client = pool) {
    if (thumbPath !== null) {
      const query = `
        UPDATE dream_images
        SET approved = $1, "thumbPath" = $2
        WHERE id = $3
        RETURNING *
      `;
      const { rows } = await client.query(query, [approved, thumbPath, id]);
      return rows[0] || null;
    } else {
      const query = `
        UPDATE dream_images
        SET approved = $1
        WHERE id = $2
        RETURNING *
      `;
      const { rows } = await client.query(query, [approved, id]);
      return rows[0] || null;
    }
  }

  /**
   * Atomically increments likeCount for an image.
   * @param {number} id
   * @param {Object} [client=pool]
   * @returns {Promise<number|null>} New likeCount value or null if not found.
   */
  async incrementLikeCount(id, client = pool) {
    const query = `
      UPDATE dream_images
      SET "likeCount" = COALESCE("likeCount", 0) + 1
      WHERE id = $1
      RETURNING "likeCount"
    `;
    const { rows } = await client.query(query, [id]);
    return rows[0] ? rows[0].likeCount : null;
  }

  /**
   * Atomically decrements likeCount for an image (floored at 0).
   * @param {number} id
   * @param {Object} [client=pool]
   * @returns {Promise<number|null>} New likeCount value or null if not found.
   */
  async decrementLikeCount(id, client = pool) {
    const query = `
      UPDATE dream_images
      SET "likeCount" = GREATEST(COALESCE("likeCount", 0) - 1, 0)
      WHERE id = $1
      RETURNING "likeCount"
    `;
    const { rows } = await client.query(query, [id]);
    return rows[0] ? rows[0].likeCount : null;
  }

  /**
   * Deletes an image record by ID.
   * @param {number} id
   * @param {Object} [client=pool]
   * @returns {Promise<Object|null>} The deleted record or null if not found.
   */
  async deleteById(id, client = pool) {
    const query = `
      DELETE FROM dream_images
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await client.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Finds all images without a thumbnail.
   * @param {Object} [client=pool]
   * @returns {Promise<Array<Object>>}
   */
  async findUncompressed(client = pool) {
    const query = `
      SELECT id, path, "thumbPath"
      FROM dream_images
      WHERE "thumbPath" IS NULL OR "thumbPath" = ''
    `;
    const { rows } = await client.query(query);
    return rows;
  }

  /**
   * Finds unapproved images created before a cutoff timestamp.
   * @param {string|Date} cutoffDate
   * @param {Object} [client=pool]
   * @returns {Promise<Array<Object>>}
   */
  async findUnapprovedBeforeCutoff(cutoffDate, client = pool) {
    const query = `
      SELECT id, path, "thumbPath"
      FROM dream_images
      WHERE approved = 0 AND time < $1
    `;
    const { rows } = await client.query(query, [cutoffDate]);
    return rows;
  }
}

module.exports = new ImageRepository();
