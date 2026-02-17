import "dotenv/config";

import { PrismaClient } from '@prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

const prisma = new PrismaClient()

export { prisma }