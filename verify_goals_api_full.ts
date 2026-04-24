
import http from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';

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

const TEST_PHONE = '1234567891';
const TEST_EMAIL = 'verify.goals@example.com';

async function main() {
    console.log('[1/4] Seeding test user...');
    await prisma.user.upsert({
        where: { email: TEST_EMAIL },
        update: { phone: TEST_PHONE, isPhoneVerified: true, isActive: true },
        create: {
            email: TEST_EMAIL,
            phone: TEST_PHONE,
            passwordHash: 'dummy',
            isPhoneVerified: true,
            isActive: true,
            role: 'USER'
        }
    });

    console.log('[2/4] Logging in...');
    const loginRes = await request('POST', '/auth/login/phone/verify', { phone: TEST_PHONE, otp: '123456' });
    const token = loginRes.accessToken;

    console.log('[3/4] Testing POST /goals...');
    const goalData = {
        type: 'financial',
        content: 'I want to save $10,000',
        deadline: '2024-12-31',
        targetValue: '$10,000',
        templateKey: 'savings_goal'
    };

    const goal = await request('POST', '/goals', goalData, token);
    console.log('API Response:', JSON.stringify(goal, null, 2));

    console.log('[4/4] Verifying AI Affirmation...');
    if (goal.affirmation && goal.affirmation.toLowerCase().includes('i have')) {
        console.log('✅ SUCCESS: AI Affirmation generated correctly.');
    } else {
        console.error('❌ FAILED: Affirmation missing or incorrect format.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
