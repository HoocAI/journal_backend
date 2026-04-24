const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYzA0NTcxNi0zYjQ4LTRkZjAtODY3Ny0xMTA4NmQyMjdkZGIiLCJzZXNzaW9uSWQiOiJmYzZmZWNjZi0wMTM0LTQyNDUtOTQ3Mi0wZGRmMTg4Nzc3NjIiLCJpc1ByZW1pdW0iOnRydWUsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzYzNTU0NzMsImV4cCI6MTc3NjM1NjM3M30.zr2Fl4KX3252OQ2pP5R2cDysVsGhdI52AabD13pPstQ';

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/goals/me',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
