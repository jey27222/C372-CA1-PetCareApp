const router = require('express').Router();
const { isLoggedIn } = require('../middleware/auth');
const controller = require('../controllers/serviceController');

router.get('/services', isLoggedIn, controller.listServices);
router.post('/services/book', isLoggedIn, controller.createBooking);
router.get('/bookings', isLoggedIn, controller.listBookings);

module.exports = router;
