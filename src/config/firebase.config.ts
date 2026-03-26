import * as admin from 'firebase-admin';

let isInitialized = false;
let initializationError: string | null = null;

/* 
Firebase Admin SDK initialization is DISABLED for Pure Google Cloud setup.
Your backend now relies on google-auth-library for OAuth 2.0.
*/
initializationError = 'Firebase Admin SDK deactivated for Pure GCloud transition.';

export const firebaseAdmin = admin;
export const getFirebaseStatus = () => ({
    initialized: isInitialized,
    error: initializationError,
    configSource: 'DISABLED'
});
