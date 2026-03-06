import * as admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'firebase-service-account.json');
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

let isInitialized = false;
let initializationError: string | null = null;

try {
    let credential;

    if (serviceAccountBase64) {
        // Option 1: Load from base64 env variable (for Production/GitHub/Vercel)
        try {
            const jsonString = Buffer.from(serviceAccountBase64.trim(), 'base64').toString('utf-8');
            credential = admin.credential.cert(JSON.parse(jsonString));
        } catch (err: any) {
            initializationError = `Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64: ${err.message}`;
            console.error(initializationError);
        }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        // Option 3: Load from individual env variables
        credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
    } else {
        // Option 2: Load from local file path
        const fs = require('fs');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            credential = admin.credential.cert(serviceAccount);
        } else {
            initializationError = 'Firebase service account file not found and all Firebase env variables are also missing.';
            console.warn(initializationError);
        }
    }

    if (credential) {
        admin.initializeApp({
            credential,
        });
        isInitialized = true;
        console.log('Firebase Admin SDK initialized successfully');
    }
} catch (error: any) {
    initializationError = `Error initializing Firebase Admin SDK: ${error.message}`;
    console.error(initializationError);
}

export const firebaseAdmin = admin;
export const getFirebaseStatus = () => ({
    initialized: isInitialized,
    error: initializationError,
    configSource: serviceAccountBase64 ? 'BASE64' : (process.env.FIREBASE_PROJECT_ID ? 'ENV_VARS' : 'FILE')
});
