
import http from 'http';

const BASE_URL = 'http://13.233.128.76:3000/api/v1';

function request(method: string, path: string, body?: any, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options: http.RequestOptions = {
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

const TEST_PHONE = '7906442359'; // Using a phone number from a previous successful session if known, or a common test one.

async function main() {
    console.log(`[1/3] Attempting Login to Remote Server (${BASE_URL})...`);
    let token = '';
    
    // Attempt login with a common phone number
    try {
        const loginRes = await request('POST', '/auth/login/phone/verify', { phone: TEST_PHONE, otp: '123456' });
        token = loginRes.accessToken;
        console.log('✅ Login Success');
    } catch (e) {
        console.log('   Note: Initial login failed, attempting user creation flow...');
        try {
           await request('POST', '/auth/login/phone/initiate', { phone: TEST_PHONE });
           const loginRes = await request('POST', '/auth/login/phone/verify', { phone: TEST_PHONE, otp: '123456' });
           token = loginRes.accessToken;
           console.log('✅ User created and logged in successfully.');
        } catch (innerE) {
           console.error('❌ Remote authentication failed. Please ensure the remote server allows OTP 123456 or provide a valid token.');
           console.error('Error details:', innerE.message);
           process.exit(1);
        }
    }

    console.log('[2/3] Testing POST /goals on Remote Server...');
    const goalData = {
        type: 'financial',
        content: 'I want to save $10,000',
        deadline: '2024-12-31',
        targetValue: '$10,000',
        templateKey: 'savings_goal'
    };

    const goal = await request('POST', '/goals', goalData, token);
    console.log('Remote API Response:', JSON.stringify(goal, null, 2));

    console.log('[3/3] Verifying AI Affirmation...');
    if (goal.affirmation && goal.affirmation.toLowerCase().includes('i have')) {
        console.log('\n🎉 SUCCESS: Remote AI Affirmation is working perfectly!');
    } else {
        console.error('\n❌ FAILED: Remote Affirmation missing or incorrect format in response.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('\n❌ Remote Verification failed:', err.message);
    process.exit(1);
});
