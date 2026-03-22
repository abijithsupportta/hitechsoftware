const https = require('https');

const SUPABASE_URL = 'otmnfcuuqlbeowphxagf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzM5MzYsImV4cCI6MjA4ODcwOTkzNn0.WKfUF4YYGoI-XSAkFf_-wSB47RCcOs7wHsV5uxHtOKw';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bW5mY3V1cWxiZW93cGh4YWdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEzMzkzNiwiZXhwIjoyMDg4NzA5OTM2fQ.mvNJvFj6Gd5f2MDHURuxrFeCycv1fzHoDuFCGz-W02o';

function httpsRequest(path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path,
      method,
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        ...headers,
      }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(email, password, label) {
  console.log(`\n=== Testing ${label} Login ===`);
  console.log(`Email: ${email}`);
  const body = JSON.stringify({ email, password });
  const res = await httpsRequest('/auth/v1/token?grant_type=password', 'POST', {}, body);
  if (res.body.access_token) {
    console.log('STATUS: SUCCESS');
    console.log('User ID:', res.body.user.id);
    console.log('Email:', res.body.user.email);
    console.log('User metadata:', JSON.stringify(res.body.user.user_metadata));
    console.log('App metadata:', JSON.stringify(res.body.user.app_metadata));
    return res.body.access_token;
  } else {
    console.log('STATUS: FAILED');
    console.log('Error:', JSON.stringify(res.body, null, 2));
    return null;
  }
}

async function checkProfile(userId, token, label) {
  console.log(`\n=== Checking Profile for ${label} ===`);
  const res = await httpsRequest(
    `/rest/v1/profiles?id=eq.${userId}&select=*`,
    'GET',
    { 'Authorization': `Bearer ${token}` },
    null
  );
  console.log('Status:', res.status);
  if (Array.isArray(res.body) && res.body.length > 0) {
    console.log('Profile found:', JSON.stringify(res.body[0], null, 2));
  } else {
    console.log('No profile found or error:', JSON.stringify(res.body, null, 2));
  }
  return res.body;
}

async function checkDashboard(token, label) {
  console.log(`\n=== Checking Dashboard Data for ${label} ===`);
  
  // Try to access jobs
  const jobsRes = await httpsRequest(
    '/rest/v1/jobs?select=id,status,created_at&limit=5',
    'GET',
    { 'Authorization': `Bearer ${token}` },
    null
  );
  console.log('Jobs access - Status:', jobsRes.status);
  if (Array.isArray(jobsRes.body)) {
    console.log(`Jobs count returned: ${jobsRes.body.length}`);
    if (jobsRes.body.length > 0) console.log('First job:', JSON.stringify(jobsRes.body[0]));
  } else {
    console.log('Jobs error:', JSON.stringify(jobsRes.body, null, 2));
  }

  // Try to access customers
  const custRes = await httpsRequest(
    '/rest/v1/customers?select=id,name&limit=3',
    'GET',
    { 'Authorization': `Bearer ${token}` },
    null
  );
  console.log('\nCustomers access - Status:', custRes.status);
  if (Array.isArray(custRes.body)) {
    console.log(`Customers count returned: ${custRes.body.length}`);
  } else {
    console.log('Customers error:', JSON.stringify(custRes.body, null, 2));
  }

  // Try to access profiles
  const profilesRes = await httpsRequest(
    '/rest/v1/profiles?select=id,role,full_name&limit=5',
    'GET',
    { 'Authorization': `Bearer ${token}` },
    null
  );
  console.log('\nProfiles access - Status:', profilesRes.status);
  if (Array.isArray(profilesRes.body)) {
    console.log(`Profiles count returned: ${profilesRes.body.length}`);
    profilesRes.body.forEach(p => console.log(` - ${p.full_name} (${p.role})`));
  } else {
    console.log('Profiles error:', JSON.stringify(profilesRes.body, null, 2));
  }
}

async function checkUserExists(email) {
  console.log(`\n=== Checking if user ${email} exists (via service role) ===`);
  const res = await httpsRequest(
    `/auth/v1/admin/users`,
    'GET',
    { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    null
  );
  if (res.body.users) {
    const user = res.body.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      console.log('User EXISTS:', JSON.stringify({ id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at, last_sign_in_at: user.last_sign_in_at }, null, 2));
      return user;
    } else {
      console.log('User NOT FOUND in auth.users');
      console.log('All users:', res.body.users.map(u => u.email));
    }
  } else {
    console.log('Error fetching users:', JSON.stringify(res.body, null, 2));
  }
  return null;
}

async function main() {
  // 1. Test SuperAdmin
  const adminToken = await login('Varghesejoby2003@gmail.com', 'admin123', 'SuperAdmin');
  if (adminToken) {
    const profiles = await httpsRequest('/rest/v1/profiles?select=id,role&limit=1', 'GET', { 'Authorization': `Bearer ${adminToken}` }, null);
    if (profiles.body && profiles.body[0]) {
      await checkProfile(profiles.body[0].id, adminToken, 'SuperAdmin');
    }
    await checkDashboard(adminToken, 'SuperAdmin');
  }

  // 2. Test Technician
  const techToken = await login('ramu@gmail.com', 'ramutech123', 'Technician (ramu)');
  if (techToken) {
    const profiles = await httpsRequest('/rest/v1/profiles?select=id,role&limit=1', 'GET', { 'Authorization': `Bearer ${techToken}` }, null);
    if (profiles.body && profiles.body[0]) {
      await checkProfile(profiles.body[0].id, techToken, 'Technician');
    }
    await checkDashboard(techToken, 'Technician');
  }

  // 3. Use service role to check all users
  await checkUserExists('Varghesejoby2003@gmail.com');
  await checkUserExists('ramu@gmail.com');
}

main().catch(console.error);
