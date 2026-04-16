
import dotenv from 'dotenv';
dotenv.config();

import { uploadFileToS3, getSignedUrl } from './src/utils/s3';

async function testS3() {
    console.log('--- S3 Connectivity Test ---');
    console.log(`Bucket: ${process.env.AWS_BUCKET_NAME}`);
    console.log(`Region: ${process.env.AWS_REGION}`);

    const testContent = Buffer.from(`S3 Connection Test Successful - ${new Date().toISOString()}`);
    const testKey = `test/connection_test_${Date.now()}.txt`;
    const mimetype = 'text/plain';

    try {
        console.log(`\n1. Attempting upload to: ${testKey}...`);
        const uploadUrl = await uploadFileToS3(testContent, testKey, mimetype);
        console.log('✅ Upload successful!');
        console.log(`Static URL: ${uploadUrl}`);

        console.log('\n2. Attempting to generate pre-signed URL...');
        const signedUrl = await getSignedUrl(testKey);
        console.log('✅ Signed URL generated successfully!');
        console.log(`Signed URL: ${signedUrl}`);

        console.log('\n--- Test Completed Successfully ---');
    } catch (error: any) {
        console.error('\n❌ S3 Test Failed!');
        console.error('Error Details:', error.message || error);
        if (error.stack) {
            // console.error(error.stack);
        }
        process.exit(1);
    }
}

testS3();
