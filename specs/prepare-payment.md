# Lesson 05 — Payment preparation

Reconstructed from the supplied Lesson 05 lecture contract (not a separately supplied original Markdown file).

GET /payments/prepare/:serviceId is a public classroom API. No login is required.
The server uses data/mockServices.js, never a price from the query string.

| ID | Name | Price (SGD) |
| --- | --- | --- |
| 1 | Vaccination | 35 |
| 2 | Pet Grooming | 50 |
| 3 | Boarding | 80 |

Success is HTTP 200 with exactly five fields: serviceId (number), serviceName
(string), amount (number), currency (string, sgd), status (string,
READY_FOR_PAYMENT). Unknown services return HTTP 404 with
{"error":"Service not found"}.

AC1–AC3: IDs 1–3 return the matching catalogue data.
AC4: ID 999 returns the specified 404.
AC5: Successful JSON has exactly the five fields and types above.
GET /payments/prepare/1?amount=1 still returns amount 35.
No payment processing, database writes, new pages or gateway is involved.
