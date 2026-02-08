import "dotenv/config";

import { PrismaClient } from '../../generated/prisma'

const connectionString = `${process.env.DATABASE_URL}`

const prisma = new PrismaClient()

export { prisma }