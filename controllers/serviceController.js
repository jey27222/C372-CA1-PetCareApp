const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const bookingModel = require('../models/serviceBookingModel');

function localToday() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') +
    '-' + String(now.getDate()).padStart(2, '0');
}

function isPositiveId(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value));
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // JavaScript normalises 30 February; comparing the parts detects this.
  return date.getFullYear() === year && date.getMonth() === month - 1 &&
    date.getDate() === day && value >= localToday();
}

function listServices(req, res) {
  petModel.getPetsByOwner(req.session.user.id, (err, pets) => {
    if (err) {
      console.error('Load booking pets:', err);
      return res.status(500).send('Unable to load pets.');
    }
    serviceModel.getActiveServices((serviceError, services) => {
      if (serviceError) {
        console.error('Load services:', serviceError);
        return res.status(500).send('Unable to load services.');
      }
      const selected = pets.find(p => String(p.id) === req.query.petId);
      return res.render('services', {
        pets, services, selectedPetId: selected ? String(selected.id) : '',
        today: localToday(), messages: req.flash('success'), errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const { petId, serviceId, bookingDate } = req.body || {};
  if (!isPositiveId(petId) || !isPositiveId(serviceId) || !isValidDate(bookingDate)) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }
  bookingModel.createPendingBooking(req.session.user.id, Number(petId), Number(serviceId), bookingDate,
    (err, result) => {
      if (err) {
        console.error('Create booking:', err);
        req.flash('error', 'Unable to create the booking. Please try again.');
        return res.redirect('/services?petId=' + petId);
      }
      if (!result) {
        req.flash('error', 'That pet or service is unavailable for booking.');
        return res.redirect('/services');
      }
      req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
      return res.redirect('/bookings');
    });
}

function listBookings(req, res) {
  bookingModel.getBookingsByOwner(req.session.user.id, (err, bookings) => {
    if (err) {
      console.error('Load history:', err);
      return res.status(500).send('Unable to load booking history.');
    }
    return res.render('bookings', {
      bookings, messages: req.flash('success'), errors: req.flash('error'), session: req.session
    });
  });
}

module.exports = { listServices, createBooking, listBookings };
