import { uploadFileToS3, getSignedUrl } from './src/utils/s3';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

console.log("Credentials check:");
console.log("Region:", process.env.AWS_REGION);
console.log("Access Key ID:", process.env.AWS_ACCESS_KEY_ID ? "****" + process.env.AWS_ACCESS_KEY_ID.slice(-4) : "MISSING");
console.log("Secret Access Key:", process.env.AWS_SECRET_ACCESS_KEY ? "VERIFIED" : "MISSING");
console.log("Bucket:", process.env.AWS_BUCKET_NAME);

async function testS3() {
    try {
        console.log("Starting S3 Upload Test...");

        // 1. Create a tiny 10-byte dummy "image" buffer
        const dummyBuffer = randomBytes(10);
        const fileName = `test-folder/test-image-${Date.now()}.png`;
        const mimeType = 'image/png';

        console.log(`Uploading dummy file: ${fileName} to bucket ${process.env.AWS_BUCKET_NAME}...`);

        // 2. Upload to S3
        const objectUrl = await uploadFileToS3(dummyBuffer, fileName, mimeType);

        console.log("✅ Upload Successful!");
        console.log("Raw Object URL:", objectUrl);

        // 3. Test Pre-signed URL generation (to see if SDK can access the object)
        console.log("Generating pre-signed URL...");
        const signedUrl = await getSignedUrl(fileName);

        console.log("✅ Pre-signed URL generated successfully.");
        console.log("Signed URL (valid for 1hr):", signedUrl);

    } catch (error) {
        console.error("❌ S3 Test Failed!");
        console.error(error);
    }
}

testS3();
