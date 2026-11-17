const userModel = require('../models/userModel');
const { unlink } = require('node:fs/promises');
const { sha256Hash } = require('../helpers/hash');

// Sign Up Page
function signupForm(req, res) {
  res.render('signup', { errors: req.flash('error'), session: req.session });
}

function hasText(value, maxLength = Infinity) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

async function rejectSignup(req, res, message) {
  if (req.file) {
    try {
      await unlink(req.file.path);
    } catch (error) {
      console.error('Unable to remove rejected signup upload:', error.code);
    }
  }
  req.flash('error', message);
  return res.redirect('/signup');
}

// Handle Sign Up Submission
async function signup(req, res) {
  const { username, password, name, pet_name, species, breed, age } = req.body || {};
  if (!hasText(username, 50) || typeof password !== 'string' || !password ||
      !hasText(name, 100)) {
    return rejectSignup(req, res, 'Enter valid account details.');
  }
  if (!hasText(pet_name, 80) || !hasText(species, 50) || !hasText(breed, 80) ||
      typeof age !== 'string' || !/^\d+$/.test(age) || Number(age) > 255) {
    return rejectSignup(req, res, 'Enter valid pet details and an age from 0 to 255.');
  }

  try {
    await userModel.createUserWithPet(
      { username, passwordHash: sha256Hash(password), name },
      { name: pet_name, species, breed, age: Number(age), image: req.file?.filename ?? null }
    );
    return res.redirect('/login');
  } catch (error) {
    console.error('Sign up failed:', error.code || error.message);
    return rejectSignup(req, res, 'Sign up failed. Please try again.');
  }
}

// Login Page
function loginForm(req, res) {
  res.render('login', {
    messages: req.flash('success'),
    errors: req.flash('error'),
    session: req.session
  });
}

// Handle Login
function login(req, res) {
  const { username, password } = req.body || {};
  if (!hasText(username) || typeof password !== 'string' || !password) {
    req.flash('error', 'Invalid username or password.');
    return res.redirect('/login');
  }
  const hashedPassword = sha256Hash(password);

  userModel.findByCredentials(username, hashedPassword, (err, results) => {
    if (err) {
      console.error('Login query error:', err);
      req.flash('error', 'Unable to log in. Please check database setup.');
      return res.redirect('/login');
    }

    if (results.length > 0) {
      req.session.user = results[0];
      req.flash('success', 'Login successful!');
      if (results[0].role === 'admin') {
        res.redirect('/admin/dashboard');
      } else {
        res.redirect('/journals');
      }
    } else {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/login');
    }
  });
}

// Logout
function logout(req, res) {
  req.session.destroy();
  res.redirect('/login');
}

module.exports = { signupForm, signup, loginForm, login, logout };
