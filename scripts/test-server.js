const https = require('https');
const http = require('http');

// Test 1: Check if the server is accessible
function testServer(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path: '/',
      method: 'GET'
    }, (res) => {
      resolve({ status: res.statusCode, running: true });
    });
    req.on('error', () => resolve({ running: false }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ running: false }); });
    req.end();
  });
}

// Test Auth API route (if exists)
function testApiRoute(port, path, method, body, headers) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port,
      path,
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      }
    };
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data.substring(0, 500) }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'timeout' }); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('=== CHECKING NEXT.JS DEV SERVER ===');
  
  // Check common ports
  for (const port of [3000, 3001, 3002]) {
    const status = await testServer(port);
    console.log(`Port ${port}: ${status.running ? `RUNNING (status ${status.status})` : 'NOT RUNNING'}`);
  }
}

main().catch(console.error);
