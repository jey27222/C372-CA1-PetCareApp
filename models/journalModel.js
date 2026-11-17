const connection = require('../config/db');

function getJournalsByOwner(ownerId, callback) {
  const sql = `
    SELECT journal.*, pets.id AS pet_id
    FROM journal
    JOIN pets ON journal.pet_id = pets.id
    WHERE pets.owner_id = ?
  `;
  connection.query(sql, [ownerId], callback);
}

function getJournalsByPetAndOwner(ownerId, petId, callback) {
  const sql = `
    SELECT journal.*, pets.name, pets.species, pets.breed, pets.age, pets.image 
    FROM journal 
    JOIN pets ON journal.pet_id = pets.id 
    WHERE pets.owner_id = ? AND pets.id = ?
  `;
  connection.query(sql, [ownerId, petId], callback);
}

function getJournalById(journalId, ownerId, callback) {
  const sql = 'SELECT j.* FROM journal j JOIN pets p ON p.id = j.pet_id WHERE j.id = ? AND p.owner_id = ?';
  connection.query(sql, [journalId, ownerId], callback);
}

function createJournal(ownerId, petId, activity, notes, entryDate, callback) {
  // INSERT ... SELECT prevents writing a journal for somebody else's pet.
  const sql = 'INSERT INTO journal (pet_id, activity, notes, entry_date) SELECT id, ?, ?, ? FROM pets WHERE id = ? AND owner_id = ?';
  connection.query(sql, [activity, notes, entryDate, petId, ownerId], callback);
}

function updateJournal(journalId, ownerId, entryDate, activity, notes, petId, callback) {
  const sql = `UPDATE journal j JOIN pets oldPet ON oldPet.id = j.pet_id
    JOIN pets newPet ON newPet.id = ? AND newPet.owner_id = ?
    SET j.entry_date = ?, j.activity = ?, j.notes = ?, j.pet_id = newPet.id
    WHERE j.id = ? AND oldPet.owner_id = ?`;
  connection.query(sql, [petId, ownerId, entryDate, activity, notes, journalId, ownerId], callback);
}

function getPetIdForJournal(journalId, ownerId, callback) {
  const sql = 'SELECT j.pet_id FROM journal j JOIN pets p ON p.id = j.pet_id WHERE j.id = ? AND p.owner_id = ?';
  connection.query(sql, [journalId, ownerId], callback);
}

function deleteJournal(journalId, ownerId, callback) {
  const sql = 'DELETE j FROM journal j JOIN pets p ON p.id = j.pet_id WHERE j.id = ? AND p.owner_id = ?';
  connection.query(sql, [journalId, ownerId], callback);
}

function searchJournals(ownerId, searchQuery, selectedPetId, callback) {
  let sql = `
    SELECT journal.*, pets.name, pets.species, pets.breed, pets.age, pets.image 
    FROM journal 
    JOIN pets ON journal.pet_id = pets.id 
    WHERE pets.owner_id = ? AND (journal.activity LIKE ? OR journal.notes LIKE ?)`;

  const params = [ownerId, searchQuery, searchQuery];

  if (selectedPetId) {
    sql += ' AND pets.id = ?';
    params.push(selectedPetId);
  }

  connection.query(sql, params, callback);
}

module.exports = {
  getJournalsByOwner,
  getJournalsByPetAndOwner,
  getJournalById,
  createJournal,
  updateJournal,
  getPetIdForJournal,
  deleteJournal,
  searchJournals
};
