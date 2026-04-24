
import { prisma } from './src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({ take: 5 });
  console.log('Users:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
