const http = require('http');

const data = JSON.stringify({
  title: "Test Policy",
  type: "POLICY",
  status: "PUBLISHED",
  sections: [
    {
      type: "LEGAL_PROSE",
      order: 0,
      content: {
        title: "Test Policy",
        lastUpdated: "Today",
        sections: [
          { title: "Intro", content: "Hello World" }
        ]
      }
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 6005,
  path: '/api/v1/cms/pages/test-policy-123',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
