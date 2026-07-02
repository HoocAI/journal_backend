import { prisma } from './src/lib/prisma';

async function main() {
  console.log('Migrating all users to PREMIUM plan...');
  const result = await prisma.user.updateMany({
    data: {
      plan: 'PREMIUM',
    },
  });
  console.log(`Successfully updated ${result.count} user(s) to PREMIUM plan.`);
}

main()
  .catch((err) => {
    console.error('Error migrating users:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
