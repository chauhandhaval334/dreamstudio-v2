const geoip = require('geoip-lite');
const countryList = require('country-list');

/**
 * Resolves country name from an IP address.
 * @param {string} ip
 * @returns {string|null} Country name or null if invalid/unknown.
 */
function resolveCountryByIp(ip) {
  if (!ip) return null;
  const cleanIp = ip.split(',')[0].trim();
  const geo = geoip.lookup(cleanIp);
  if (geo && geo.country) {
    return countryList.getName(geo.country) || null;
  }
  return null;
}

module.exports = {
  resolveCountryByIp
};
