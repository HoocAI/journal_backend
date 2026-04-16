const http = require('http');
const https = require('https');

const isLocal = process.argv.includes('--local');
const remoteUrl = process.argv.find(arg => arg.startsWith('https://'));
const BASE_URL = isLocal ? 'http://localhost:3000/api/v1' : (remoteUrl ? `${remoteUrl}/api/v1` : 'https://pashumitra.free-tunnelapi.app/api/v1');
const TEST_PHONE = '9044015254'; // Or any phone that exists in the DB

console.log(`\n--- Full API Health Check ---`);
console.log(`Target: ${BASE_URL}`);
console.log(`Environment: ${isLocal ? 'LOCAL' : 'REMOTE'}`);

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            method: method,
            headers: {}
        };

        if (method !== 'GET') {
            options.headers['Content-Type'] = 'application/json';
        }

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }


        const req = protocol.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : null;
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, error: 'JSON Parse Error', raw: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runCheck() {
    try {
        // 1. Authenticate
        console.log(`\n[1/2] Authenticating via Fallback...`);
        const loginRes = await request('POST', '/auth/fallback', { phone: TEST_PHONE });
        
        if (loginRes.status !== 200) {
            console.error(`❌ Authentication failed (Status ${loginRes.status}):`, loginRes.data || loginRes.error);
            console.log(`Tip: If local, ensure a user with phone ${TEST_PHONE} exists in the DB.`);
            return;
        }

        const token = loginRes.data.accessToken;
        console.log(`✅ Authenticated successfully.`);

        // 2. Test Endpoints
        console.log(`\n[2/2] Testing Endpoints...`);
        const endpoints = [
            { name: 'User Profile', path: '/users/profile' },
            { name: 'Goals', path: '/goals/me' },
            { name: 'Journal History', path: '/journal/me' },
            { name: 'Mood History', path: '/mood/me' },
            { name: 'Vision Boards', path: '/vision-board/boards' },
            { name: 'Audio (List)', path: '/audio/' },
            { name: 'Quotes (Random)', path: '/quotes/random?mood=JOYFUL' },
            { name: 'Affirmations (Dev)', path: '/affirmations/random?mood=JOYFUL' },
            { name: 'Assessments History', path: '/assessments/history' },
            { name: 'Daily Photo History', path: '/daily-photo/history' },
            { name: 'Questions (Today)', path: '/questions/today' }
        ];


        const results = [];
        for (const ep of endpoints) {
            process.stdout.write(`Testing ${ep.name}... `);
            try {
                const res = await request('GET', ep.path, null, token);
                results.push({ name: ep.name, path: ep.path, status: res.status });
                if (res.status === 200 || res.status === 201) {
                    console.log(`✅ ${res.status}`);
                } else {
                    console.log(`❌ ${res.status}`);
                    if (res.data && res.data.error) console.log(`   Error: ${res.data.error.message || res.data.error.code}`);
                }
            } catch (err) {
                console.log(`❌ CRASH`);
                results.push({ name: ep.name, path: ep.path, status: 'CRASH', error: err.message });
            }
        }

        console.log(`\n--- Summary Report ---`);
        console.table(results);

    } catch (err) {
        console.error(`\n❌ Script Error:`, err);
    }
}

runCheck();
