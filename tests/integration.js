// Run explicitly with npm run test:integration. Creates and removes ONLY its own new DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function main() {
  if (process.env.RUN_DB_TESTS !== '1') {
    throw new Error('Set RUN_DB_TESTS=1 to allow a NEW disposable test database. Existing app data is not used.');
  }
  const dbName = 'petcare_test_' + Date.now() + '_' + process.pid;
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    multipleStatements: true, dateStrings: true
  });
  let server, pool;
  let passed = 0;
  try {
    const root = path.join(__dirname, '..');
    const baseline = fs.readFileSync(path.join(root, 'db.sql'), 'utf8').replace(/\bpetcare\b/g, dbName);
    const extension = fs.readFileSync(path.join(root, 'db-lesson08-extension.sql'), 'utf8').replace(/\bpetcare\b/g, dbName);
    await admin.query(baseline);
    await admin.query(extension);
    process.env.DB_NAME = dbName;
    pool = require('../config/db');
    const app = require('../app');
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    const cookies = {};
    async function request(url, { user = 'guest', method = 'GET', body, form } = {}) {
      const headers = {};
      if (cookies[user]) headers.Cookie = cookies[user];
      if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const response = await fetch(base + url, {
        method, headers, redirect: 'manual', body: form || (body && new URLSearchParams(body))
      });
      const cookie = response.headers.get('set-cookie');
      if (cookie) cookies[user] = cookie.split(';')[0];
      return { status: response.status, location: response.headers.get('location'), text: await response.text() };
    }
    async function check(name, fn) {
      await fn(); passed++; console.log('PASS ' + name);
    }
    async function counts() {
      const [rows] = await admin.query('SELECT (SELECT COUNT(*) FROM service_bookings) b, (SELECT COUNT(*) FROM payments) p');
      return rows[0];
    }
    function today(offset = 0) {
      const d = new Date(); d.setDate(d.getDate() + offset);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    async function book(body) {
      return request('/services/book', { user: 'clara', method: 'POST', body: { petId: '5', serviceId: '1', bookingDate: today(), ...body } });
    }
    await check('AC8 signed-out booking routes and existing protected pages', async () => {
      for (const [url, method] of [['/services','GET'], ['/services/book','POST'], ['/bookings','GET'], ['/journals','GET'], ['/pets/new','GET'], ['/pets','POST'], ['/journals/new','GET'], ['/journals/new','POST'], ['/journals/edit/1','GET'], ['/journals/edit/1','POST'], ['/journals/delete/1','GET'], ['/journals/search','GET']]) {
        const r = await request(url, { method }); assert.equal(r.status, 302); assert.equal(r.location, '/login');
      }
    });
    await check('GET payment preparation catalogue, exact fields, unknown and price tampering', async () => {
      for (const [id, name, amount] of [[1,'Vaccination',35],[2,'Pet Grooming',50],[3,'Boarding',80]]) {
        const r = await request('/payments/prepare/' + id + '?amount=1');
        assert.equal(r.status, 200);
        assert.deepEqual(JSON.parse(r.text), { serviceId:id, serviceName:name, amount, currency:'sgd', status:'READY_FOR_PAYMENT' });
      }
      const r = await request('/payments/prepare/999'); assert.equal(r.status, 404);
      assert.deepEqual(JSON.parse(r.text), { error: 'Service not found' });
    });
    await check('POST mock payment approved/pending/declined/default and unknown; no writes', async () => {
      const provider = require('../services/mockPaymentProvider');
      const original = provider.createPayment;
      provider.createPayment = async input => {
        assert.equal(input.amount, 50); assert.equal(input.currency, 'sgd');
        return original(input);
      };
      const before = await counts();
      for (const [status, outcome] of [['APPROVED','CONFIRMED'],['PENDING','AWAITING_PAYMENT'],['DECLINED','PAYMENT_FAILED'],[undefined,'AWAITING_PAYMENT']]) {
        const response = await fetch(base + '/payments/mock/2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(status ? { testStatus: status, amount: 1 } : {}) });
        const data = await response.json(); assert.equal(response.status, 200);
        assert.equal(data.serviceId, 2); assert.equal(data.paymentStatus, status || 'PENDING');
        assert.equal(data.bookingStatus, outcome); assert.equal(data.merchantReference, 'SERVICE-2');
        assert.match(data.providerPaymentId, /^mock_\d+$/); assert.equal(Object.keys(data).length, 5);
      }
      assert.equal((await request('/payments/mock/999', { method:'POST', body:{} })).status, 404);
      assert.deepEqual(await counts(), before);
      provider.createPayment = original;
    });
    await check('Login valid/invalid, session and original pages', async () => {
      assert.equal((await request('/signup')).status, 200);
      assert.equal((await request('/')).status, 200);
      assert.equal((await request('/login', { method:'POST', body:{ username:'clara',password:'wrong' } })).location, '/login');
      assert.match((await request('/login')).text, /Invalid username or password/);
      for (const name of ['clara','ben','admin1']) {
        const r = await request('/login', { user:name, method:'POST', body:{ username:name,password:name === 'admin1' ? 'admin123' : 'user123' } });
        assert.equal(r.location, name === 'admin1' ? '/admin/dashboard' : '/journals');
      }
      assert.match((await request('/journals', { user:'clara' })).text, /Mira/);
    });
    await check('AC1 booking pair, trusted price, pending statuses and exact success', async () => {
      const before = await counts(); const r = await book({ amount:'1', ownerId:'3' });
      assert.equal(r.location, '/bookings');
      const after = await counts(); assert.equal(after.b, before.b + 1); assert.equal(after.p, before.p + 1);
      const [rows] = await admin.query('SELECT b.*, p.amount, p.payment_status, p.payment_reference FROM service_bookings b JOIN payments p ON p.booking_id=b.id ORDER BY b.id DESC LIMIT 1');
      assert.equal(rows[0].pet_id, 5); assert.equal(Number(rows[0].booked_price), 25); assert.equal(Number(rows[0].amount), 25);
      assert.equal(rows[0].booking_status, 'pending'); assert.equal(rows[0].payment_status, 'pending'); assert.equal(rows[0].payment_reference, null);
      assert.match((await request('/bookings', { user:'clara' })).text, /Booking created\. Payment is pending; no payment has been processed\./);
    });
    await check('AC2 today and future; stored prices survive catalogue change; duplicates allowed', async () => {
      for (const date of [today(), today(30)]) assert.equal((await book({ bookingDate:date })).location, '/bookings');
      await admin.query('UPDATE services SET price=26 WHERE id=1');
      const [old] = await admin.query('SELECT booked_price FROM service_bookings ORDER BY id LIMIT 1');
      assert.equal(Number(old[0].booked_price), 25);
      await admin.query('UPDATE services SET price=25 WHERE id=1');
    });
    await check('AC3 bad/missing dates and IDs: no writes, exact validation message', async () => {
      const before = await counts();
      const bad = [{bookingDate:''},{bookingDate:'2026-02-30'},{bookingDate:'bad'},{bookingDate:today(-1)},{bookingDate:'2030-2-03'}, {petId:''},{petId:'abc'},{petId:'0'},{petId:'-1'},{petId:'1.5'},{serviceId:''},{serviceId:'0'},{serviceId:'-2'},{serviceId:'1x'}];
      for (const body of bad) assert.equal((await book(body)).location, '/services');
      assert.deepEqual(await counts(), before);
      assert.match((await request('/services', { user:'clara' })).text, /Choose a pet, service, and valid booking date\./);
    });
    await check('AC4 another owner/unknown pet rejected and preselection checked', async () => {
      const before = await counts();
      for (const petId of ['3','999']) assert.equal((await book({petId})).location, '/services');
      assert.deepEqual(await counts(), before);
      const page = await request('/services?petId=3', { user:'clara' });
      assert.match(page.text, /Mira/); assert.doesNotMatch(page.text, /Molly/);
      assert.match(page.text, /That pet or service is unavailable for booking\./);
    });
    await check('AC5 inactive and unknown service rejected without writes', async () => {
      const before = await counts(); await admin.query('UPDATE services SET is_active=0 WHERE id=1');
      assert.equal((await book({})).location, '/services');
      assert.equal((await book({serviceId:'999'})).location, '/services');
      assert.deepEqual(await counts(), before);
      assert.doesNotMatch((await request('/services', { user:'clara' })).text, /Basic Bath/);
      await admin.query('UPDATE services SET is_active=1 WHERE id=1');
    });
    await check('AC6 real payment INSERT failure rolls booking back; no success', async () => {
      const before = await counts();
      await admin.query("CREATE TRIGGER fail_payment BEFORE INSERT ON payments FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated test payment failure'");
      try {
        assert.equal((await book({})).location, '/services?petId=5');
        assert.deepEqual(await counts(), before);
        const page = await request('/services?petId=5', { user:'clara' });
        assert.match(page.text, /Unable to create the booking\. Please try again\./); assert.doesNotMatch(page.text, /Booking created\./);
      } finally { await admin.query('DROP TRIGGER fail_payment'); }
    });
    await check('AC6 real booking INSERT failure produces no records', async () => {
      const before = await counts();
      await admin.query("CREATE TRIGGER fail_booking BEFORE INSERT ON service_bookings FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated test booking failure'");
      try { assert.equal((await book({})).location, '/services?petId=5'); assert.deepEqual(await counts(), before); }
      finally { await admin.query('DROP TRIGGER fail_booking'); }
    });
    await check('AC7 history owner isolation, newest order and missing-payment fallback', async () => {
      await request('/services/book', { user:'ben', method:'POST', body:{petId:'3',serviceId:'2',bookingDate:today()} });
      const clara = await request('/bookings', { user:'clara' }); const ben = await request('/bookings', { user:'ben' });
      assert.match(clara.text, /Mira/); assert.doesNotMatch(clara.text, /Molly/);
      assert.match(ben.text, /Molly/); assert.doesNotMatch(ben.text, /Mira/);
      const model = require('../models/serviceBookingModel');
      const rows = await new Promise((resolve,reject) => model.getBookingsByOwner(4,(err,rows) => err ? reject(err) : resolve(rows)));
      assert.equal(rows.length, 3); assert.ok(rows[0].booking_id > rows[1].booking_id); assert.match(rows[0].booking_date, /^\d{4}-\d{2}-\d{2}$/);
      await admin.query('DELETE FROM payments WHERE booking_id=?', [rows[0].booking_id]);
      assert.match((await request('/bookings', { user:'clara' })).text, /No payment record/);
    });
    await check('Service form/history empty states', async () => {
      await admin.query('UPDATE services SET is_active=0');
      assert.match((await request('/services', { user:'clara' })).text, /There are no services available to book right now/);
      await admin.query('UPDATE services SET is_active=1');
      assert.match((await request('/bookings', { user:'admin1' })).text, /You have no bookings yet/);
      await admin.query('DELETE FROM pets WHERE owner_id=1');
      assert.match((await request('/services', { user:'admin1' })).text, /Add a pet before booking a service/);
    });
    await check('Read failures return 500 with explicit messages', async () => {
      for (const [file, method, url, message] of [
        ['petModel','getPetsByOwner','/services','Unable to load pets.'],
        ['serviceModel','getActiveServices','/services','Unable to load services.'],
        ['serviceBookingModel','getBookingsByOwner','/bookings','Unable to load booking history.']]) {
        const model = require('../models/' + file); const original = model[method];
        model[method] = (...args) => args.at(-1)(new Error('Simulated read failure'));
        try { const r = await request(url, {user:'clara'}); assert.equal(r.status,500); assert.equal(r.text,message); }
        finally { model[method] = original; }
      }
    });
    await check('Pet upload and Journal create/read/filter/search/edit/delete', async () => {
      const form = new FormData();
      for (const [k,v] of Object.entries({pet_name:'Test Pet',species:'Cat',breed:'Mixed',age:'1'})) form.append(k,v);
      form.append('pet_image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')], {type:'image/png'}), 'test-pet.png');
      assert.equal((await request('/pets',{user:'clara',method:'POST',form})).location,'/journals');
      const [pets] = await admin.query("SELECT * FROM pets WHERE name='Test Pet'"); const pet = pets[0];
      try {
        assert.equal(pet.owner_id,4); assert.equal((await request('/images/' + pet.image)).status,200);
        assert.equal((await request('/journals/new',{user:'clara'})).status,200);
        const body = {pet_id:String(pet.id),activity:'Test walk',notes:'Integration check',entry_date:today()};
        assert.equal((await request('/journals/new',{user:'clara',method:'POST',body})).location, '/journals?petId=' + pet.id);
        const [rows] = await admin.query('SELECT * FROM journal WHERE pet_id=?',[pet.id]); const id=rows[0].id;
        assert.match((await request('/journals?petId='+pet.id,{user:'clara'})).text,/Test walk/);
        assert.match((await request('/journals/search?q=Integration&petId='+pet.id,{user:'clara'})).text,/Test walk/);
        assert.equal((await request('/journals/edit/'+id,{user:'clara'})).status,200);
        assert.equal((await request('/journals/edit/'+id,{user:'clara',method:'POST',body:{...body,activity:'Updated walk'}})).location,'/journals?petId='+pet.id);
        assert.match((await request('/journals?petId='+pet.id,{user:'clara'})).text,/Updated walk/);
        assert.equal((await request('/journals/delete/'+id,{user:'clara'})).location,'/journals?petId='+pet.id);
        assert.equal((await admin.query('SELECT * FROM journal WHERE id=?',[id]))[0].length,0);
      } finally { fs.unlinkSync(path.join(root,'public/images',pet.image)); }
    });
    await check('Journal ownership tampering blocked', async () => {
      const [before] = await admin.query('SELECT * FROM journal WHERE id=5');
      assert.equal((await request('/journals/new',{user:'clara',method:'POST',body:{pet_id:'3',activity:'Intrusion',notes:'blocked',entry_date:today()}})).status,403);
      assert.equal((await request('/journals/edit/5',{user:'clara',method:'POST',body:{pet_id:'5',activity:'Intrusion',notes:'blocked',entry_date:today()}})).status,403);
      assert.doesNotMatch((await request('/journals/edit/5',{user:'clara'})).text, /value="Vet Visit"/);
      await request('/journals/delete/5',{user:'clara'});
      assert.deepEqual((await admin.query('SELECT * FROM journal WHERE id=5'))[0],before);
    });
    await check('Sign-up with first pet, admin dashboard/list/detail/delete and role checks', async () => {
      const form = new FormData();
      for(const [k,v] of Object.entries({username:'test_signup',password:'test-only',name:'Test User',role:'user',pet_name:'First Pet',species:'Dog',breed:'Mixed',age:'2'})) form.append(k,v);
      assert.equal((await request('/signup',{method:'POST',form})).location,'/login');
      const [users]=await admin.query("SELECT * FROM users WHERE username='test_signup'");
      assert.equal(users.length,1); assert.equal(users[0].password.length,64);
      assert.equal((await admin.query('SELECT * FROM pets WHERE owner_id=?',[users[0].id]))[0].length,1);
      for(const url of ['/admin/dashboard','/admin/users','/admin/users/'+users[0].id]) assert.equal((await request(url,{user:'admin1'})).status,200);
      assert.match((await request('/admin/users',{user:'clara'})).text,/Access Denied/);
      assert.equal((await request('/admin/users/delete/'+users[0].id,{user:'admin1'})).location,'/admin/users');
      assert.equal((await admin.query('SELECT * FROM users WHERE id=?',[users[0].id]))[0].length,0);
      assert.equal((await admin.query('SELECT * FROM pets WHERE owner_id=?',[users[0].id]))[0].length,0);
    });
    await check('Logout removes access', async () => {
      assert.equal((await request('/logout',{user:'clara'})).location,'/login');
      assert.equal((await request('/bookings',{user:'clara'})).location,'/login');
    });
    console.log('Integration checks passed: ' + passed);
    console.log('Database engine: ' + (await admin.query('SELECT VERSION() AS version'))[0][0].version);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.promise().end();
    await admin.query('DROP DATABASE IF EXISTS `' + dbName + '`');
    await admin.end();
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
