const connection = require('../config/db');
const petModel = require('./petModel');

async function createUserWithPet(user, pet) {
  const sql = "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, 'user')";
  const transaction = await connection.promise().getConnection();
  try {
    await transaction.beginTransaction();
    const [result] = await transaction.query(sql, [user.username, user.passwordHash, user.name]);
    await petModel.createPet(result.insertId, pet, transaction);
    await transaction.commit();
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      transaction.destroy();
      throw rollbackError;
    }
    throw error;
  } finally {
    transaction.release();
  }
}

function findByCredentials(username, hashedPassword, callback) {
  const sql = 'SELECT id, username, name, role FROM users WHERE username = ? AND password = ?';
  connection.query(sql, [username, hashedPassword], callback);
}

function getAllUsers(callback) {
  const sql = 'SELECT id, name, username, role FROM users';
  connection.query(sql, callback);
}

function getUserById(userId, callback) {
  const sql = 'SELECT id, name, username, role FROM users WHERE id = ?';
  connection.query(sql, [userId], callback);
}

function deleteUser(userId, callback) {
  const sql = 'DELETE FROM users WHERE id = ?';
  connection.query(sql, [userId], callback);
}

module.exports = {
  createUserWithPet,
  findByCredentials,
  getAllUsers,
  getUserById,
  deleteUser
};
