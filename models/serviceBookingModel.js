const pool = require('../config/db');

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  pool.getConnection((err, connection) => {
    if (err) return callback(err);

    // Roll back before returning. A broken connection must not go back in the pool.
    function rollback(error) {
      connection.rollback((rollbackError) => {
        if (rollbackError) {
          connection.destroy();
          console.error('Booking rollback failed:', rollbackError);
          return callback(rollbackError);
        }
        connection.release();
        callback(error || null, null);
      });
    }

    connection.beginTransaction((beginError) => {
      if (beginError) {
        connection.release();
        return callback(beginError);
      }
      // Owner and active-service checks run in the same INSERT as the booking.
      const bookingSql = `
        INSERT INTO service_bookings
          (pet_id, service_id, booking_date, booked_price, booking_status)
        SELECT p.id, s.id, ?, s.price, 'pending'
        FROM pets p CROSS JOIN services s
        WHERE p.id = ? AND p.owner_id = ? AND s.id = ? AND s.is_active = 1
      `;
      connection.query(bookingSql, [bookingDate, petId, ownerId, serviceId], (bookingError, result) => {
        if (bookingError) return rollback(bookingError);
        if (result.affectedRows !== 1) return rollback(null);
        const bookingId = result.insertId;

        // Copy the saved booking price, not any price supplied by the browser.
        const paymentSql = `
          INSERT INTO payments (booking_id, amount, payment_status)
          SELECT id, booked_price, 'pending' FROM service_bookings WHERE id = ?
        `;
        connection.query(paymentSql, [bookingId], (paymentError, payment) => {
          if (paymentError) return rollback(paymentError);
          if (payment.affectedRows !== 1) return rollback(new Error('Pending payment not saved'));
          connection.commit((commitError) => {
            if (commitError) return rollback(commitError);
            connection.release();
            callback(null, { bookingId, paymentId: payment.insertId });
          });
        });
      });
    });
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT b.id AS booking_id, DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      p.name AS pet_name, s.name AS service_name, b.booked_price, b.booking_status,
      pay.payment_status, pay.payment_reference, b.created_at
    FROM service_bookings b
    JOIN pets p ON p.id = b.pet_id
    JOIN services s ON s.id = b.service_id
    LEFT JOIN payments pay ON pay.booking_id = b.id
    WHERE p.owner_id = ?
    ORDER BY b.created_at DESC, b.id DESC
  `;
  pool.query(sql, [ownerId], callback);
}

module.exports = { createPendingBooking, getBookingsByOwner };
