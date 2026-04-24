import 'dotenv/config';
import { uploadFileToS3, getSignedUrl } from './src/utils/s3';

async function testS3Manifest() {
    console.log('--- S3 Manifest Prefix Test ---');

    // 1. Check Env
    if (!process.env.AWS_BUCKET_NAME) {
        console.error('AWS_BUCKET_NAME not set');
        process.exit(1);
    }

    // 2. Test File Upload to manifest/ prefix
    const testKey = `manifest/test-upload-${Date.now()}.txt`;
    const testContent = Buffer.from(`This is a test file to verify S3 connectivity with manifest/ prefix at ${new Date().toISOString()}`);
    const testMimetype = 'text/plain';

    try {
        console.log(`Uploading to: ${testKey}...`);
        const resultUrl = await uploadFileToS3(testContent, testKey, testMimetype);
        console.log('✅ Success! File uploaded.');
        console.log(`Result URL: ${resultUrl}`);

        // 3. Test Pre-signed URL Generation
        console.log('\nTesting Pre-signed URL Generation...');
        const signedUrl = await getSignedUrl(testKey);
        console.log('✅ Success! Pre-signed URL generated.');
        // console.log(`Signed URL: ${signedUrl}`);

        console.log('\n--- Test Completed Successfully! ---');
    } catch (err: any) {
        console.error('\n❌ S3 Manifest Test Failed!');
        console.error('Error Details:', err.message || err);
    }
}

testS3Manifest();
