# Lesson 06 — Local mock payment

Summarised from Lesson 06 slides and Resources/createMockPayment.txt.
POST /payments/mock/:serviceId is public for Postman classroom tests.
JSON body: {"testStatus":"APPROVED"}, PENDING, DECLINED, or {}.
The default is PENDING. Unknown service: 404, {"error":"Service not found"}.
Successful response: HTTP 200 with serviceId (number), providerPaymentId,
merchantReference, paymentStatus and bookingStatus (strings).

| Payment result | Booking outcome |
| --- | --- |
| APPROVED | CONFIRMED |
| PENDING | AWAITING_PAYMENT |
| DECLINED | PAYMENT_FAILED |

The provider is a local JavaScript function. Price/name come from the mock
catalogue; reference is SERVICE-<id>; currency is sgd. No database rows or actual
payment are created. This API does not update Lesson 08 bookings.
The supplied teaching code does not reject unsupported testStatus values;
that documented limitation is retained (bookingStatus may be absent).
