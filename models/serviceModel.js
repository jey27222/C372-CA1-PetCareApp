const pool = require('../config/db');

function getActiveServices(callback) {
  pool.query('SELECT id, name, price FROM services WHERE is_active = 1 ORDER BY name', callback);
}

module.exports = { getActiveServices };
