
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1'; // Check port

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
                    reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

const TEST_PHONE = '9876543210';
const TEST_EMAIL = 'phone.test@example.com';

async function seedUser() {
    console.log('[SETUP] Seeding test user...');
    try {
        const user = await prisma.user.upsert({
            where: { email: TEST_EMAIL },
            update: {
                phone: TEST_PHONE,
                isPhoneVerified: true,
                isActive: true,
            },
            create: {
                email: TEST_EMAIL,
                phone: TEST_PHONE,
                passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'password'
                role: 'USER',
                isPhoneVerified: true,
                isEmailVerified: true,
            },
        });
        console.log(`[SETUP] User ${user.email} ready with phone ${user.phone}`);
    } catch (e) {
        console.error('[SETUP] Failed to seed user:', e);
        process.exit(1);
    }
}

async function main() {
    await seedUser();

    try {
        console.log('--- TEST 1: Phone Login Flow ---');

        console.log('1. Initiating Phone Login...');
        try {
            const initRes = await request('POST', '/auth/login/phone/initiate', { phone: TEST_PHONE });
            console.log('   Success! Init response:', initRes);
        } catch (e) {
            console.log('   Note: Init failed:', e.message);
        }

        console.log('\n2. Verifying Phone Login (OTP=123456)...');
        try {
            const verifyRes = await request('POST', '/auth/login/phone/verify', { phone: TEST_PHONE, otp: '123456' });
            console.log('   Success! Login response token:', verifyRes.accessToken ? 'RECEIVED' : 'MISSING');
            if (verifyRes.user) {
                console.log('   User:', verifyRes.user.email);
            }
        } catch (e) {
            console.log('   Verify failed:', e.message);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
