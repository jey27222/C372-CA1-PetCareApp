const petModel = require('../models/petModel');

// Add Pet Form
function newPetForm(req, res) {
  res.render('newPet', { session: req.session });
}

// Handle Add Pet Submission
async function createPet(req, res) {
  const { pet_name, species, breed, age } = req.body;
  let petImage;

  if (req.file) {
    petImage = req.file.filename; // use uploaded filename
  } else {
    petImage = null;
  }

  const ownerId = req.session.user.id;

  try {
    await petModel.createPet(ownerId, { name: pet_name, species, breed, age, image: petImage });
    return res.redirect('/journals');
  } catch (error) {
    console.error(error);
    return res.send('Failed to add pet.');
  }
}

module.exports = { newPetForm, createPet };
