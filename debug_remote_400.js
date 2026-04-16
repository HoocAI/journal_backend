const https = require('https');

// 1. Get Token via Fallback
const authData = JSON.stringify({ phone: '9044015254' });
const authOptions = {
    hostname: 'pashumitra.free-tunnelapi.app',
    path: '/api/v1/auth/fallback',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': authData.length
    }
};

const getAuth = () => new Promise((resolve, reject) => {
    const req = https.request(authOptions, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(authData);
    req.end();
});

// 2. Test Goals
const testGoals = (token) => new Promise((resolve, reject) => {
    const options = {
        hostname: 'pashumitra.free-tunnelapi.app',
        path: '/api/v1/goals/me',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
});

async function run() {
    try {
        const auth = await getAuth();
        console.log('Login Status: 200');
        const goals = await testGoals(auth.accessToken);
        console.log('Goals Status:', goals.status);
        console.log('Goals Body:', goals.body);
    } catch (e) {
        console.error(e);
    }
}

run();
