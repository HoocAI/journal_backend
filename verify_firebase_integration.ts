
import { authService } from './src/services/auth/auth.service';
import { prisma } from './src/lib/prisma';
import { firebaseAdmin } from './src/config/firebase.config';

// Mock verifyIdToken for testing
const originalVerify = firebaseAdmin.auth().verifyIdToken;

async function test() {
    console.log('--- Testing Firebase Integration ---');

    const testPhone = '+910000000000';
    
    // 1. Mock the firebase admin response
    (firebaseAdmin.auth() as any).verifyIdToken = async (token: string) => {
        if (token === 'valid-test-token') {
            return { phone_number: testPhone };
        }
        throw new Error('Invalid token');
    };

    try {
        console.log('Cleaning up existing test user...');
        await prisma.user.deleteMany({ where: { phone: testPhone } });

        console.log('1. Testing firebasePhoneLogin with new user...');
        const result = await authService.firebasePhoneLogin('valid-test-token');
        
        console.log('   Success!');
        console.log('   User ID:', result.user.id);
        console.log('   Generated Email:', result.user.email);
        console.log('   Is Phone Verified:', result.user.isPhoneVerified);

        if (!result.user.email.includes('hooc.ai')) {
            throw new Error('Placeholder email generation failed');
        }

        console.log('\n2. Testing login with existing user...');
        const loginRelogin = await authService.firebasePhoneLogin('valid-test-token');
        console.log('   Success! Logged in as:', loginRelogin.user.id);

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error.message);
    } finally {
        // Restore
        (firebaseAdmin.auth() as any).verifyIdToken = originalVerify;
        await prisma.$disconnect();
    }
}

test();
