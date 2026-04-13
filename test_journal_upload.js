const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1';

async function generateTestImage() {
    const filename = 'test-image.jpg';
    // Create a very small valid JPEG file or just a dummy one that passes multer's mimetype check (which relies on what we send in the request)
    // Actually, multer only checks the mimetype provided in the Content-Type of the file part in the multipart form data.
    fs.writeFileSync(filename, 'dummy content');
    return filename;
}

async function runTest() {
    try {
        console.log('1. Signing up a test user...');
        const email = `testuser_${Date.now()}@example.com`;
        
        const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123',
                termsAccepted: true,
                privacyAccepted: true,
                recordingAccepted: true
            })
        });

        const signupData = await signupRes.json();
        if (!signupRes.ok) {
            console.error('Signup failed:', signupData);
            return;
        }

        const token = signupData.accessToken;
        console.log(`Signup successful! Access token obtained.`);

        console.log('\n2. Creating a test image file...');
        const imageFile = await generateTestImage();
        const fileContent = fs.readFileSync(imageFile);
        
        // We need to construct a multipart/form-data request using native fetch (or using FormData)
        // With Node.js >= 18 we can use built-in FormData and Blob / File
        console.log('3. Uploading the test photo to /api/v1/journal...');
        
        const formData = new FormData();
        formData.append('content', 'This is my journal entry created via test script');
        
        // Convert Buffer to Blob for native FormData
        const blob = new Blob([fileContent], { type: 'image/jpeg' });
        formData.append('photo', blob, imageFile);

        const journalRes = await fetch(`${BASE_URL}/journal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const journalData = await journalRes.json();
        
        if (!journalRes.ok) {
            console.error('Journal upload failed:', journalData);
        } else {
            console.log('Journal upload successful! Entry created:');
            console.log(JSON.stringify(journalData, null, 2));
        }

        // Cleanup
        fs.unlinkSync(imageFile);
        console.log('\nTest finished.');
        
    } catch (error) {
        console.error('Error during test:', error);
    }
}

runTest();
