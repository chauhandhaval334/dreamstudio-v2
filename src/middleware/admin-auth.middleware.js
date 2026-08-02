const logger = require('../utils/logger.util');

/**
 * Basic Authentication Middleware for Admin Panel routes.
 */
function adminAuthMiddleware(req, res, next) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    logger.warn('ADMIN_PASSWORD is not configured in environment variables. Access denied.');
    res.setHeader('WWW-Authenticate', 'Basic realm="DreamStudio V2 Admin Panel"');
    return res.status(401).send('Admin access disabled: ADMIN_PASSWORD environment variable is not configured.');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="DreamStudio V2 Admin Panel"');
    return res.status(401).send('Authentication required.');
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === adminUsername && password === adminPassword) {
    return next();
  }

  logger.warn(`Failed admin login attempt from IP ${req.ip} for user '${username}'`);
  res.setHeader('WWW-Authenticate', 'Basic realm="DreamStudio V2 Admin Panel"');
  return res.status(401).send('Invalid credentials.');
}

module.exports = adminAuthMiddleware;
