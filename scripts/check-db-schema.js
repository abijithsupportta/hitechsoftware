const https = require('https');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEzMzkzNiwiZXhwIjoyMDg4NzA5OTM2fQ.mvNJvFj6Gd5f2MDHURuxrFeCycv1fzHoDuFCGz-W02o';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzM5MzYsImV4cCI6MjA4ODcwOTkzNn0.WKfUF4YYGoI-XSAkFf_-wSB47RCcOs7wHsV5uxHtOKw';

function httpsReq(path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'otmnfcuuqlbeowphxagf.supabase.co',
      path,
      method: method || 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        ...headers,
      }
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const r = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  console.log('=== CHECKING ACTUAL DATABASE TABLES ===');

  // Use PostgREST to get available tables - try each table we expect
  const tablesToCheck = ['jobs', 'job_cards', 'work_orders', 'service_requests', 'customers', 'profiles', 'technicians', 'orders'];

  for (const table of tablesToCheck) {
    const res = await httpsReq(`/rest/v1/${table}?limit=1`, 'GET', {}, null);
    if (res.status === 404 && res.body.code === 'PGRST205') {
      console.log(`TABLE '${table}': DOES NOT EXIST`);
    } else if (res.status === 400) {
      console.log(`TABLE '${table}': EXISTS but query error - ${res.body.message}`);
    } else if (res.status === 200 || res.status === 206) {
      console.log(`TABLE '${table}': EXISTS, rows returned: ${Array.isArray(res.body) ? res.body.length : 0}`);
      if (Array.isArray(res.body) && res.body.length > 0) {
        console.log(`  Columns: ${Object.keys(res.body[0]).join(', ')}`);
      }
    } else if (res.status === 401) {
      console.log(`TABLE '${table}': EXISTS but unauthorized`);
    } else {
      console.log(`TABLE '${table}': unknown status ${res.status} - ${JSON.stringify(res.body).substring(0, 100)}`);
    }
  }

  console.log('\n=== CHECKING CUSTOMERS TABLE COLUMNS ===');
  const custRes = await httpsReq('/rest/v1/customers?limit=1', 'GET', {}, null);
  console.log('Status:', custRes.status, JSON.stringify(custRes.body).substring(0, 300));

  console.log('\n=== CHECKING PROFILES TABLE COLUMNS ===');
  const profRes = await httpsReq('/rest/v1/profiles?limit=1', 'GET', {}, null);
  console.log('Status:', profRes.status);
  if (Array.isArray(profRes.body) && profRes.body.length > 0) {
    console.log('Profile columns:', Object.keys(profRes.body[0]).join(', '));
    console.log('Sample row:', JSON.stringify(profRes.body[0], null, 2));
  } else {
    console.log(JSON.stringify(profRes.body).substring(0, 300));
  }

  // Check auth users using service role admin API
  console.log('\n=== LISTING ALL AUTH USERS ===');
  const usersRes = await httpsReq('/auth/v1/admin/users', 'GET', {}, null);
  if (usersRes.body.users) {
    console.log(`Total users: ${usersRes.body.users.length}`);
    usersRes.body.users.forEach(u => {
      console.log(`  - ${u.email} | confirmed: ${!!u.email_confirmed_at} | role_in_meta: ${u.user_metadata?.role || 'none'}`);
    });
  } else {
    console.log(JSON.stringify(usersRes.body).substring(0, 300));
  }
}

main().catch(console.error);
