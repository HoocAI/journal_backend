import * as admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'firebase-service-account.json');
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

try {
    let credential;

    if (serviceAccountBase64) {
        // Option 1: Load from base64 env variable (for Production/GitHub/Vercel)
        const jsonString = Buffer.from(serviceAccountBase64.trim(), 'base64').toString('utf-8');
        credential = admin.credential.cert(JSON.parse(jsonString));
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
            console.warn('Firebase service account file not found and all Firebase env variables are also missing.');
        }
    }

    if (credential) {
        admin.initializeApp({
            credential,
        });
        console.log('Firebase Admin SDK initialized successfully');
    }
} catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    if (serviceAccountBase64) {
        console.error('FIREBASE_SERVICE_ACCOUNT_BASE64 length:', serviceAccountBase64.length);
        try {
            const decoded = Buffer.from(serviceAccountBase64.trim(), 'base64').toString('utf-8');
            console.error('Decoded content starts with:', decoded.substring(0, 50));
        } catch (e: any) {
            console.error('Base64 decoding failed:', e.message);
        }
    }
}

export const firebaseAdmin = admin;
