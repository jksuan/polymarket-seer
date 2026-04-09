const https = require('https');

const options = {
  hostname: 'gamma-api.polymarket.com',
  port: 443,
  path: '/public-search?q=World%20Cup%20winner&limit=8',
  method: 'GET',
};

// If using proxy on Windows:
const { HttpsProxyAgent } = require('https-proxy-agent');
const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

options.agent = agent;

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
