
const http = require('http');

const isLocal = process.argv.includes('--local');
const BASE_URL = isLocal ? 'http://localhost:3000/api/v1' : 'https://pashumitra.free-tunnelapi.app/api/v1';

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const PHONES = ['9044015254'];
const ADMIN_EMAIL = 'test.admin@example.com';
const ADMIN_PASS = 'adminPassword';

async function main() {
    console.log(`[1/3] Attempting Authentication on Remote Server (${BASE_URL})...`);
    let token = '';
    
    // Try Phone Logins
    for (const phone of PHONES) {
        try {
            console.log(`Trying phone login: ${phone}...`);
            const loginRes = await request('POST', '/auth/login/phone/verify', { phone, otp: '123456' });
            token = loginRes.accessToken;
            console.log(`✅ Phone Login Success with ${phone}`);
            break;
        } catch (e) {
            console.log(`   ❌ Phone login failed: ${e.message}`);
        }
    }

    // Try Admin Login as fallback
    if (!token) {
        try {
            console.log(`Trying admin login: ${ADMIN_EMAIL}...`);
            const adminRes = await request('POST', '/auth/admin/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
            token = adminRes.accessToken;
            console.log('✅ Admin Login Success');
        } catch (e) {
            console.log(`   ❌ Admin login failed: ${e.message}`);
        }
    }

    if (!token) {
        console.error('\n❌ Could not authenticate on the remote server.');
        console.log('Please provide a valid test user or ensure the dev seed has been run on the remote DB.');
        process.exit(1);
    }

    console.log('[2/3] Testing POST /goals on Remote Server...');
    const goalData = {
        type: 'financial',
        content: 'I want to save $10,000',
        deadline: '2024-12-31',
        targetValue: '$10,000',
        templateKey: 'savings_goal'
    };

    try {
        const goal = await request('POST', '/goals', goalData, token);
        console.log('Remote API Response:', JSON.stringify(goal, null, 2));

        console.log('[3/3] Verifying AI Affirmation...');
        if (goal.affirmation && goal.affirmation.toLowerCase().includes('i have')) {
            console.log('\n🎉 SUCCESS: Remote AI Affirmation is working perfectly!');
            if (ADMIN_EMAIL && token.includes('admin')) {
                console.log('(Verified using Admin account)');
            }
        } else {
            console.error('\n❌ FAILED: Remote Affirmation missing or incorrect format in response.');
            process.exit(1);
        }
    } catch (e) {
        console.error('\n❌ API Call Failed:', e.message);
        process.exit(1);
    }
}

main();
