# PetCareApp verification

This project builds on the lecturer-supplied C372 PetCareAppMVC starter. The source files on `main` are the current project. `PetCareAppMVC.zip` is the original import archive.

On 17 November 2026, Codex checked the updated source with Node.js, MySQL Community Server 8.4.13, and Chromium in an isolated workspace. The checks below document that run. Add your own observations to your AI Interaction Journal when you repeat the checks.

## Run the project

1. Open the folder that contains `package.json` and install the locked dependencies with `npm ci`. Use Node.js 22 or later.
2. For a fresh local MySQL setup, run `db.sql` in MySQL Workbench, followed by `db-lesson08-extension.sql`. If you already have the class `petcare` schema, check which tables exist before importing. The extension supplies the booking tables and is intended to run once.
3. If you do not already have a local `.env`, copy `.env.example` to `.env`. Enter your local database settings there, then run `npm start` and open [http://localhost:3000](http://localhost:3000).

Run `npm test` for the transaction unit tests. To run the integration suite on an isolated MySQL instance, use a test account that can create and delete temporary databases and create triggers. In PowerShell run `$env:RUN_DB_TESTS = '1'`, then `npm run test:integration`. The suite creates and removes its own temporary schema. The verification instance had binary logging disabled so its restricted test account could create the failure-injection triggers.

## Executed results

| Check | Observed result |
| --- | --- |
| Database setup | Both SQL scripts imported successfully into a fresh MySQL database. |
| Unit and integration suites | 8 of 8 unit checks and 20 of 20 integration groups passed. |
| Login and signup | A missing password redirects to login with readable feedback. An invalid pet age leaves no account. A forced first-pet insert failure rolls back the account and the same signup can be retried. |
| Roles and ownership | Public signup creates a regular user. The seeded administrator can open admin pages. Journal and booking ownership checks passed. |
| Week 3 mock payment | Preparation uses the catalogue amount. The mock endpoint returns the approved, pending and declined outcomes without writing booking rows. |
| Browser smoke check | Signed-out booking redirects to login. Clara booked Basic Bath for Mira at S$25.00 and saw one linked booking and payment, both pending. Ben could not see Clara's booking. Browser signup, login and the first pet also worked. |

## Lesson 08 booking acceptance criteria

| Criterion | Observed result |
| --- | --- |
| AC1 | The correct pet, service, amount, booking status and linked payment status were saved. Request-supplied price and owner values had no effect. |
| AC2 | Booking today and booking in the future worked. Existing bookings kept their saved price after a catalogue price change. |
| AC3 | Invalid or missing dates and IDs were rejected without writes. |
| AC4 | A pet belonging to another user was rejected. |
| AC5 | Inactive and unknown services were rejected without writes. |
| AC6 | MySQL triggers forced booking and payment inserts to fail separately. Each run left both record counts unchanged. The unit suite simulated commit and rollback errors. |
| AC7 | Booking history displayed only the user's bookings, newest first, with the expected statuses. |
| AC8 | Unauthenticated requests to the booking routes redirected to login. |
