const connection = require('../config/db');

function createPet(ownerId, { name, species, breed, age, image }, database = connection.promise()) {
  const sql = 'INSERT INTO pets (owner_id, name, species, breed, age, image) VALUES (?, ?, ?, ?, ?, ?)';
  return database.query(sql, [ownerId, name, species, breed, age, image]);
}

function getPetsByOwner(ownerId, callback) {
  const sql = 'SELECT * FROM pets WHERE owner_id = ?';
  connection.query(sql, [ownerId], callback);
}

module.exports = {
  createPet,
  getPetsByOwner
};
