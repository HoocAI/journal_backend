
import http from 'http';
import { PrismaClient, Role, MoodType } from '@prisma/client';

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

const TEST_USER = {
    email: 'test.user@example.com',
    phone: '1234567890',
    role: Role.USER
};

const TEST_ADMIN = {
    email: 'test.admin@example.com',
    password: 'adminPassword',
    role: Role.ADMIN
};

async function seedData() {
    console.log('[SETUP] Seeding test users...');
    // Regular User
    await prisma.user.upsert({
        where: { email: TEST_USER.email },
        update: { phone: TEST_USER.phone, isPhoneVerified: true },
        create: {
            email: TEST_USER.email,
            phone: TEST_USER.phone,
            passwordHash: 'dummy-hash',
            isPhoneVerified: true,
            role: Role.USER
        }
    });

    // Admin
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(TEST_ADMIN.password, 10);
    await prisma.user.upsert({
        where: { email: TEST_ADMIN.email },
        update: { passwordHash: hash, role: Role.ADMIN },
        create: {
            email: TEST_ADMIN.email,
            passwordHash: hash,
            role: Role.ADMIN
        }
    });

    // Seed some other data if needed (Moods, etc.)
    console.log('[SETUP] Seed complete.');
}

async function main() {
    await seedData();

    let userToken = '';
    let adminToken = '';

    try {
        console.log('\n--- 1. AUTHENTICATION ---');
        // User Login (Phone)
        const userLogin = await request('POST', '/auth/login/phone/verify', { phone: TEST_USER.phone, otp: '123456' });
        userToken = userLogin.accessToken;
        console.log('✅ User Login Success');

        // Admin Login
        const adminLogin = await request('POST', '/auth/admin/login', { email: TEST_ADMIN.email, password: TEST_ADMIN.password });
        adminToken = adminLogin.accessToken;
        console.log('✅ Admin Login Success');

        console.log('\n--- 2. USER PROFILE ---');
        const profile = await request('GET', '/users/profile', undefined, userToken);
        console.log('✅ GET /profile Success');

        await request('PATCH', '/users/profile', { name: 'Updated Name', onboardingCompleted: true }, userToken);
        console.log('✅ PATCH /profile Success');

        console.log('\n--- 3. JOURNAL ---');
        const journal = await request('POST', '/journal', { content: 'Test Entry' }, userToken);
        console.log('✅ POST /journal Success');

        const journalByDate = await request('GET', `/journal/date/${new Date().toISOString().split('T')[0]}`, undefined, userToken);
        console.log('✅ GET /journal/date/:date Success');

        await request('PATCH', `/journal/${journal.id}`, { content: 'Updated Entry' }, userToken);
        console.log('✅ PATCH /journal/:id Success');

        console.log('\n--- 4. MOOD ---');
        await request('POST', '/mood', { mood: MoodType.JOYFUL, reason: 'Testing' }, userToken);
        console.log('✅ POST /mood Success');

        await request('GET', '/mood/me', undefined, userToken);
        console.log('✅ GET /mood/me Success');

        console.log('\n--- 5. GOALS ---');
        const goal = await request('POST', '/goals', { type: 'personal', content: 'Test Goal' }, userToken);
        console.log('✅ POST /goals Success');

        await request('GET', '/goals/me', undefined, userToken);
        console.log('✅ GET /goals/me Success');

        console.log('\n--- 6. ADMIN ---');
        await request('GET', '/admin/diagnostics', undefined, adminToken);
        console.log('✅ GET /admin/diagnostics Success');

        await request('GET', '/admin/users', undefined, adminToken);
        console.log('✅ GET /admin/users Success');

        console.log('\n--- 7. PUBLIC/OTHER ---');
        await request('GET', '/mood/types', undefined, userToken);
        console.log('✅ GET /mood/types Success');

        console.log('\n🎉 ALL CORE API ROUTES RESPONDING AS EXPECTED.');

    } catch (e) {
        console.error('\n❌ Test failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
