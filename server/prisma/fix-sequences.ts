import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const tables = [
  'User', 'Course', 'Section', 'Lesson', 'Attachment',
  'Quiz', 'Question', 'QuizReward', 'Enrollment', 'LessonProgress',
  'QuizAttempt', 'Review', 'Certificate', 'UserBadge', 'Coupon',
];

async function main() {
  console.log('Resetting all sequences to max(id)...\n');

  for (const t of tables) {
    try {
      const result: any[] = await prisma.$queryRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX("id") FROM "${t}"), 1)) AS val`
      );
      console.log(`  ✓ ${t.padEnd(18)} sequence => ${result[0].val}`);
    } catch (e: any) {
      console.log(`  ✗ ${t.padEnd(18)} ${e.message?.slice(0, 100)}`);
    }
  }

  console.log('\nDone!');
}

main().finally(() => prisma.$disconnect());
