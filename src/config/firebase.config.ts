import * as admin from 'firebase-admin';

let isInitialized = false;
let initializationError: string | null = null;

try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase configuration (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY) in .env');
    }

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        isInitialized = true;
        console.log(`[FirebaseConfig] Admin SDK initialized successfully using Service Account for: ${projectId}`);
    } else {
        isInitialized = true;
    }
} catch (error: any) {
    initializationError = error.message;
    console.error('[FirebaseConfig] Initialization failed:', error.message);
}

export const firebaseAdmin = admin;
export const getFirebaseStatus = () => ({
    initialized: isInitialized,
    error: initializationError,
    configSource: isInitialized ? 'ENVIRONMENT' : 'NONE'
});
