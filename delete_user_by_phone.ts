
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PHONE = '+919044015254';

async function main() {
    console.log(`Searching for user with phone: ${PHONE}...`);
    
    // Find many because phone might not have a '+' or might be in different formats
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { phone: PHONE },
                { phone: `+91${PHONE}` },
                { phone: `91${PHONE}` }
            ]
        }
    });

    if (users.length === 0) {
        console.log('No user found with that phone number.');
        return;
    }

    console.log(`Found ${users.length} user(s). Proceeding to delete...`);

    for (const user of users) {
        console.log(`Deleting user: ${user.email} (ID: ${user.id})...`);
        
        // Deleting the user should cascade-delete other tables (Session, Goal, etc.) 
        // as per the Prisma schema.
        await prisma.user.delete({
            where: { id: user.id }
        });
        
        console.log(`Successfully deleted user ${user.id}`);
    }
}

main()
    .catch(e => console.error('Deletion failed:', e))
    .finally(async () => {
        await prisma.$disconnect();
    });
