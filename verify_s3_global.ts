import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
    console.log('Verifying global S3 migration fields...');

    // 1. Check JournalEntry fields
    const journalFields = await prisma.journalEntry.findFirst();
    console.log('JournalEntry sample:', journalFields ? 'Found' : 'No entries yet (OK)');
    
    // We can check the model structure via prisma.$queryRaw if we want to be deep, 
    // but the fact that the code compiles (or will compile) is a good sign.
    // Let's just try to create a dummy entry with S3 keys.
    
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 's3test@example.com',
                passwordHash: 'dummy',
            }
        });
    }

    console.log('Testing JournalEntry S3 keys...');
    const entry = await prisma.journalEntry.upsert({
        where: { userId_entryDate: { userId: user.id, entryDate: new Date('2026-05-01') } },
        create: {
            userId: user.id,
            content: 'Test content',
            entryDate: new Date('2026-05-01'),
            photoS3Key: 'test/photo.jpg',
            audioS3Key: 'test/audio.mp3'
        },
        update: {
            photoS3Key: 'test/photo-updated.jpg'
        }
    });
    console.log('JournalEntry updated with S3 keys:', entry.photoS3Key);

    console.log('Testing AdminAudio S3 key...');
    const audio = await prisma.adminAudio.create({
        data: {
            title: 'Test Audio',
            audioUrl: 'https://test.com/audio.mp3',
            s3Key: 'admin/audio/test.mp3'
        }
    });
    console.log('AdminAudio created with S3 key:', audio.s3Key);

    // Cleanup
    await prisma.journalEntry.delete({ where: { id: entry.id } });
    await prisma.adminAudio.delete({ where: { id: audio.id } });

    console.log('SUCCESS: S3 fields are working in the database!');
    await prisma.$disconnect();
}

verifyMigration().catch(console.error);
