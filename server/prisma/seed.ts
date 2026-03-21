import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  await prisma.user.upsert({
    where: { email: 'admin@learnova.dev' },
    update: {},
    create: {
      email: 'admin@learnova.dev',
      name: 'Admin',
      passwordHash: await hash('admin123'),
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email: 'instructor@learnova.dev' },
    update: {},
    create: {
      email: 'instructor@learnova.dev',
      name: 'Jane Instructor',
      passwordHash: await hash('inst123'),
      role: 'INSTRUCTOR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'learner@learnova.dev' },
    update: {},
    create: {
      email: 'learner@learnova.dev',
      name: 'John Learner',
      passwordHash: await hash('learn123'),
      role: 'LEARNER',
    },
  });

  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
