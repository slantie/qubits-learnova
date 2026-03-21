import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Real video URLs from the DB
const VIDEO_URL = 'http://localhost:4001/api/stream/97269216-e2a2-4474-a1af-b6a25a2958f9/hls/master.m3u8';
const THUMBNAIL_URL = 'http://localhost:4001/api/stream/97269216-e2a2-4474-a1af-b6a25a2958f9/thumbnail.jpg';

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ─── 1. Existing users — no changes to passwords/details ─────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@learnova.dev' },
    update: {},
    create: { email: 'admin@learnova.dev', name: 'Admin', passwordHash: await hash('admin123'), role: 'ADMIN' },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@learnova.dev' },
    update: {},
    create: { email: 'instructor@learnova.dev', name: 'Jane Instructor', passwordHash: await hash('inst123'), role: 'INSTRUCTOR' },
  });

  await prisma.user.upsert({
    where: { email: 'learner@learnova.dev' },
    update: {},
    create: { email: 'learner@learnova.dev', name: 'John Learner', passwordHash: await hash('learn123'), role: 'LEARNER' },
  });

  // ─── 2. New learner users ─────────────────────────────────────────────────────
  const alice = await prisma.user.upsert({
    where: { email: 'alice@learnova.dev' },
    update: {},
    create: { email: 'alice@learnova.dev', name: 'Alice Student', passwordHash: await hash('alice123'), role: 'LEARNER', totalPoints: 150, currentBadge: 'Explorer' },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@learnova.dev' },
    update: {},
    create: { email: 'bob@learnova.dev', name: 'Bob Developer', passwordHash: await hash('bob123'), role: 'LEARNER', totalPoints: 50, currentBadge: 'Beginner' },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@learnova.dev' },
    update: {},
    create: { email: 'sarah@learnova.dev', name: 'Sarah Chen', passwordHash: await hash('sarah123'), role: 'LEARNER', totalPoints: 310, currentBadge: 'Champion' },
  });

  console.log('✓ Users seeded');

  // ─── 3. Courses ───────────────────────────────────────────────────────────────

  // Course 1: already exists, update it
  const course1 = await prisma.course.upsert({
    where: { id: 1 },
    update: {
      description: 'Explore Australian history, culture, wildlife, and modern society in this comprehensive guide. Perfect for students, travellers, and curious minds.',
      tags: ['culture', 'geography', 'australia', 'travel'],
      isPublished: true,
      visibility: 'EVERYONE',
      accessRule: 'OPEN',
      websiteUrl: 'https://learnova.dev/courses/australia',
    },
    create: {
      title: 'Australia – Culture and Beyond',
      description: 'Explore Australian history, culture, wildlife, and modern society in this comprehensive guide.',
      tags: ['culture', 'geography', 'australia', 'travel'],
      isPublished: true,
      visibility: 'EVERYONE',
      accessRule: 'OPEN',
      instructorId: instructor.id,
      websiteUrl: 'https://learnova.dev/courses/australia',
    },
  });

  // Course 2: Web Development Fundamentals
  const course2 = await prisma.course.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      title: 'Web Development Fundamentals',
      description: 'Learn HTML, CSS, and JavaScript from scratch. Build responsive websites and understand core web concepts through hands-on projects.',
      tags: ['web', 'html', 'css', 'javascript', 'beginner'],
      isPublished: true,
      visibility: 'EVERYONE',
      accessRule: 'OPEN',
      instructorId: instructor.id,
      websiteUrl: 'https://learnova.dev/courses/web-dev',
    },
  });

  // Course 3: Advanced React Patterns (Paid)
  const course3 = await prisma.course.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      title: 'Advanced React Patterns',
      description: 'Master compound components, render props, custom hooks, and performance optimisation patterns used in production React applications.',
      tags: ['react', 'javascript', 'frontend', 'advanced'],
      isPublished: true,
      visibility: 'EVERYONE',
      accessRule: 'ON_PAYMENT',
      price: 999,
      instructorId: instructor.id,
      websiteUrl: 'https://learnova.dev/courses/react-advanced',
    },
  });

  // Course 4: Introduction to AI (Signed-in only)
  const course4 = await prisma.course.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      title: 'Introduction to Artificial Intelligence',
      description: 'A beginner-friendly tour of machine learning, neural networks, and AI ethics. No prior coding experience required.',
      tags: ['ai', 'machine learning', 'python', 'beginner'],
      isPublished: true,
      visibility: 'SIGNED_IN',
      accessRule: 'OPEN',
      instructorId: instructor.id,
      websiteUrl: 'https://learnova.dev/courses/intro-ai',
    },
  });

  console.log('✓ Courses seeded');

  // ─── 4. Lessons ───────────────────────────────────────────────────────────────

  // Course 1 — existing lesson (id=3 stays), add more
  await prisma.lesson.upsert({
    where: { id: 3 },
    update: {
      title: 'Welcome to Australia',
      description: '<p>A warm introduction to the land down under — geography, climate zones, and the six states.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 720,
      order: 1,
      timestamps: [
        { time: 0, label: 'Introduction', description: 'Overview of what we will cover' },
        { time: 180, label: 'Geography', description: 'States and territories' },
        { time: 420, label: 'Climate Zones', description: 'Tropical, arid, and temperate regions' },
      ],
    },
    create: {
      id: 3,
      courseId: course1.id,
      title: 'Welcome to Australia',
      type: 'VIDEO',
      order: 1,
      description: '<p>A warm introduction to the land down under — geography, climate zones, and the six states.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 720,
      timestamps: [
        { time: 0, label: 'Introduction', description: 'Overview of what we will cover' },
        { time: 180, label: 'Geography', description: 'States and territories' },
        { time: 420, label: 'Climate Zones', description: 'Tropical, arid, and temperate regions' },
      ],
    },
  });

  const c1L2 = await prisma.lesson.upsert({
    where: { id: 10 },
    update: {},
    create: {
      id: 10,
      courseId: course1.id,
      title: 'Indigenous Culture and History',
      type: 'VIDEO',
      order: 2,
      description: '<p>Dive into 65,000 years of Aboriginal and Torres Strait Islander history, art, and traditions.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 960,
    },
  });

  const c1L3 = await prisma.lesson.upsert({
    where: { id: 11 },
    update: {},
    create: {
      id: 11,
      courseId: course1.id,
      title: 'Australian Wildlife Overview',
      type: 'DOCUMENT',
      order: 3,
      description: '<p>A reading guide covering iconic Australian animals — kangaroos, koalas, echidnas, and more.</p>',
      filePath: 'https://res.cloudinary.com/daqg9tftx/raw/upload/v1/attachments/sample_wildlife.pdf',
      allowDownload: true,
    },
  });

  // Course 2 — Web Dev lessons
  const c2L1 = await prisma.lesson.upsert({
    where: { id: 20 },
    update: {},
    create: {
      id: 20,
      courseId: course2.id,
      title: 'How the Web Works',
      type: 'VIDEO',
      order: 1,
      description: '<p>Understand browsers, servers, HTTP, and DNS in plain English.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 540,
      timestamps: [
        { time: 0, label: 'Intro', description: 'What happens when you visit a website' },
        { time: 200, label: 'DNS', description: 'How domain names resolve to IP addresses' },
        { time: 380, label: 'HTTP', description: 'Request / response cycle explained' },
      ],
    },
  });

  const c2L2 = await prisma.lesson.upsert({
    where: { id: 21 },
    update: {},
    create: {
      id: 21,
      courseId: course2.id,
      title: 'HTML Basics',
      type: 'VIDEO',
      order: 2,
      description: '<p>Tags, attributes, semantic HTML, and building your first webpage.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 820,
    },
  });

  const c2L3 = await prisma.lesson.upsert({
    where: { id: 22 },
    update: {},
    create: {
      id: 22,
      courseId: course2.id,
      title: 'CSS Fundamentals',
      type: 'VIDEO',
      order: 3,
      description: '<p>Selectors, the box model, flexbox, and responsive design basics.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 1100,
    },
  });

  const c2L4 = await prisma.lesson.upsert({
    where: { id: 23 },
    update: {},
    create: {
      id: 23,
      courseId: course2.id,
      title: 'JavaScript Essentials',
      type: 'VIDEO',
      order: 4,
      description: '<p>Variables, functions, DOM manipulation, and async/await in practice.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 1380,
    },
  });

  // Course 3 — React Advanced lessons
  const c3L1 = await prisma.lesson.upsert({
    where: { id: 30 },
    update: {},
    create: {
      id: 30,
      courseId: course3.id,
      title: 'Compound Components Pattern',
      type: 'VIDEO',
      order: 1,
      description: '<p>Build flexible, expressive component APIs using the compound component pattern.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 1560,
      timestamps: [
        { time: 0, label: 'Why Compound Components', description: 'Problems it solves' },
        { time: 480, label: 'Implementation', description: 'Context + children pattern' },
        { time: 960, label: 'Real-world Example', description: 'Building a Tabs component' },
      ],
    },
  });

  const c3L2 = await prisma.lesson.upsert({
    where: { id: 31 },
    update: {},
    create: {
      id: 31,
      courseId: course3.id,
      title: 'Custom Hooks Deep Dive',
      type: 'VIDEO',
      order: 2,
      description: '<p>Extract and reuse stateful logic across components with well-designed custom hooks.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 1200,
    },
  });

  const c3L3 = await prisma.lesson.upsert({
    where: { id: 32 },
    update: {},
    create: {
      id: 32,
      courseId: course3.id,
      title: 'Performance Optimisation',
      type: 'VIDEO',
      order: 3,
      description: '<p>useMemo, useCallback, React.memo, and profiling with React DevTools.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 1440,
    },
  });

  // Course 4 — AI lessons
  const c4L1 = await prisma.lesson.upsert({
    where: { id: 40 },
    update: {},
    create: {
      id: 40,
      courseId: course4.id,
      title: 'What is Artificial Intelligence?',
      type: 'VIDEO',
      order: 1,
      description: '<p>A plain-English introduction to AI, machine learning, and deep learning and how they relate.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 660,
    },
  });

  const c4L2 = await prisma.lesson.upsert({
    where: { id: 41 },
    update: {},
    create: {
      id: 41,
      courseId: course4.id,
      title: 'Machine Learning Basics',
      type: 'VIDEO',
      order: 2,
      description: '<p>Supervised vs unsupervised learning, training data, and model evaluation.</p>',
      videoUrl: VIDEO_URL,
      thumbnailUrl: THUMBNAIL_URL,
      videoStatus: 'READY',
      videoId: '97269216-e2a2-4474-a1af-b6a25a2958f9',
      duration: 900,
    },
  });

  const c4L3 = await prisma.lesson.upsert({
    where: { id: 42 },
    update: {},
    create: {
      id: 42,
      courseId: course4.id,
      title: 'AI Ethics and Society',
      type: 'DOCUMENT',
      order: 3,
      description: '<p>Bias, fairness, transparency, and the societal impact of AI systems.</p>',
      filePath: 'https://res.cloudinary.com/daqg9tftx/raw/upload/v1/attachments/ai_ethics_guide.pdf',
      allowDownload: true,
    },
  });

  console.log('✓ Lessons seeded');

  // ─── 5. Attachments ───────────────────────────────────────────────────────────

  // Resource links on the web-dev HTML lesson
  await prisma.attachment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      lessonId: c2L2.id,
      type: 'LINK',
      label: 'MDN HTML Reference',
      externalUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    },
  });

  await prisma.attachment.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      lessonId: c2L3.id,
      type: 'LINK',
      label: 'CSS Tricks — Flexbox Guide',
      externalUrl: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
    },
  });

  await prisma.attachment.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      lessonId: c2L4.id,
      type: 'LINK',
      label: 'JavaScript.info',
      externalUrl: 'https://javascript.info',
    },
  });

  console.log('✓ Attachments seeded');

  // ─── 6. Quizzes + Questions + Rewards ─────────────────────────────────────────

  const quiz1 = await prisma.quiz.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      courseId: course2.id,
      title: 'Web Fundamentals Quiz',
    },
  });

  await prisma.quizReward.upsert({
    where: { quizId: quiz1.id },
    update: {},
    create: { quizId: quiz1.id, attempt1Points: 20, attempt2Points: 14, attempt3Points: 8, attempt4PlusPoints: 2 },
  });

  const q1Questions = [
    { text: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'Hyper Transfer Tech Protocol', 'HyperText Transmission Process'], correctOptions: [0], order: 1 },
    { text: 'Which HTML tag is used for the largest heading?', options: ['<h6>', '<h1>', '<header>', '<head>'], correctOptions: [1], order: 2 },
    { text: 'Which CSS property controls text size?', options: ['text-size', 'font-size', 'text-style', 'font-style'], correctOptions: [1], order: 3 },
    { text: 'What does DOM stand for?', options: ['Document Object Model', 'Data Object Map', 'Dynamic Object Model', 'Document Order Map'], correctOptions: [0], order: 4 },
  ];

  for (const [i, q] of q1Questions.entries()) {
    await prisma.question.upsert({
      where: { id: i + 1 },
      update: {},
      create: { id: i + 1, quizId: quiz1.id, ...q },
    });
  }

  const quiz2 = await prisma.quiz.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, courseId: course4.id, title: 'AI Concepts Check' },
  });

  await prisma.quizReward.upsert({
    where: { quizId: quiz2.id },
    update: {},
    create: { quizId: quiz2.id, attempt1Points: 15, attempt2Points: 10, attempt3Points: 5, attempt4PlusPoints: 1 },
  });

  const q2Questions = [
    { text: 'Which of the following is a type of machine learning?', options: ['Supervised learning', 'Compiled learning', 'Static learning', 'Manual learning'], correctOptions: [0], order: 1 },
    { text: 'What is a neural network inspired by?', options: ['Computer circuits', 'The human brain', 'Database tables', 'Decision trees'], correctOptions: [1], order: 2 },
    { text: 'Which concern relates to AI ethics?', options: ['Render speed', 'Algorithmic bias', 'File size', 'Screen resolution'], correctOptions: [1], order: 3 },
  ];

  for (const [i, q] of q2Questions.entries()) {
    await prisma.question.upsert({
      where: { id: i + 10 },
      update: {},
      create: { id: i + 10, quizId: quiz2.id, ...q },
    });
  }

  const quiz3 = await prisma.quiz.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, courseId: course3.id, title: 'React Patterns Quiz' },
  });

  await prisma.quizReward.upsert({
    where: { quizId: quiz3.id },
    update: {},
    create: { quizId: quiz3.id, attempt1Points: 25, attempt2Points: 18, attempt3Points: 10, attempt4PlusPoints: 3 },
  });

  const q3Questions = [
    { text: 'What React hook shares state without prop drilling?', options: ['useState', 'useContext', 'useEffect', 'useRef'], correctOptions: [1], order: 1 },
    { text: 'What does React.memo do?', options: ['Memorises strings', 'Prevents unnecessary re-renders', 'Caches API calls', 'Stores component state'], correctOptions: [1], order: 2 },
    { text: 'Which hook is best for side effects?', options: ['useState', 'useCallback', 'useEffect', 'useMemo'], correctOptions: [2], order: 3 },
    { text: 'What does useCallback return?', options: ['A cached value', 'A memoised function', 'A ref object', 'A context value'], correctOptions: [1], order: 4 },
  ];

  for (const [i, q] of q3Questions.entries()) {
    await prisma.question.upsert({
      where: { id: i + 20 },
      update: {},
      create: { id: i + 20, quizId: quiz3.id, ...q },
    });
  }

  console.log('✓ Quizzes and questions seeded');

  // ─── 7. Enrollments + Lesson Progress ────────────────────────────────────────
  // Helper to create enrollment + optional lesson progresses
  async function enroll(
    userId: number,
    courseId: number,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
    completedLessonIds: number[],
    enrollmentId: number,
  ) {
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status },
      create: {
        id: enrollmentId,
        userId,
        courseId,
        status,
        enrolledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        startedAt: status !== 'NOT_STARTED' ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) : null,
        completedAt: status === 'COMPLETED' ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null,
      },
    });

    for (const lessonId of completedLessonIds) {
      await prisma.lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
        update: { isCompleted: true, completedAt: new Date() },
        create: {
          enrollmentId: enrollment.id,
          lessonId,
          userId,
          isCompleted: true,
          completedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return enrollment;
  }

  // John (id=3): IN_PROGRESS on course1 (2/3 done), NOT_STARTED on course2
  const johnId = 3;
  await enroll(johnId, course1.id, 'IN_PROGRESS', [3, c1L2.id], 100);
  await enroll(johnId, course2.id, 'NOT_STARTED', [], 101);

  // Alice: COMPLETED course2 (all lessons), IN_PROGRESS course4 (1/3 done)
  await enroll(alice.id, course2.id, 'COMPLETED', [c2L1.id, c2L2.id, c2L3.id, c2L4.id], 102);
  await enroll(alice.id, course4.id, 'IN_PROGRESS', [c4L1.id], 103);

  // Bob: IN_PROGRESS course1 (1/3 done), NOT_STARTED course4
  await enroll(bob.id, course1.id, 'IN_PROGRESS', [3], 104);
  await enroll(bob.id, course4.id, 'NOT_STARTED', [], 105);

  // Sarah: COMPLETED course2 + course4, IN_PROGRESS course3 (2/3 done)
  await enroll(sarah.id, course2.id, 'COMPLETED', [c2L1.id, c2L2.id, c2L3.id, c2L4.id], 106);
  await enroll(sarah.id, course4.id, 'COMPLETED', [c4L1.id, c4L2.id, c4L3.id], 107);
  await enroll(sarah.id, course3.id, 'IN_PROGRESS', [c3L1.id, c3L2.id], 108);

  console.log('✓ Enrollments and lesson progress seeded');

  // ─── 8. Reviews ───────────────────────────────────────────────────────────────

  const reviews = [
    { userId: alice.id, courseId: course2.id, rating: 5, reviewText: 'Absolutely brilliant course! Clear explanations, great pacing. I built my first website by lesson 3.' },
    { userId: sarah.id, courseId: course2.id, rating: 4, reviewText: 'Very well structured. I would have liked more exercises, but the content quality is top-notch.' },
    { userId: sarah.id, courseId: course4.id, rating: 5, reviewText: 'The ethics module alone is worth it. A must-watch for anyone entering the AI field.' },
    { userId: bob.id,   courseId: course1.id, rating: 4, reviewText: 'Loved the wildlife section. The documentary-style videos make learning genuinely enjoyable.' },
    { userId: alice.id, courseId: course4.id, rating: 5, reviewText: 'Perfect intro for beginners. No jargon overload — just clear and practical explanations.' },
    { userId: johnId,   courseId: course1.id, rating: 3, reviewText: 'Good overview, but I expected more depth on the cultural history side.' },
  ];

  for (const r of reviews) {
    await prisma.review.upsert({
      where: { userId_courseId: { userId: r.userId, courseId: r.courseId } },
      update: { rating: r.rating, reviewText: r.reviewText },
      create: r,
    });
  }

  console.log('✓ Reviews seeded');

  // ─── 9. Quiz Attempts ─────────────────────────────────────────────────────────

  // Alice — attempt 1 on quiz1 (web dev), scored 20 pts
  await prisma.quizAttempt.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      userId: alice.id,
      quizId: quiz1.id,
      attemptNumber: 1,
      answers: { 1: [0], 2: [1], 3: [1], 4: [0] },
      pointsEarned: 20,
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Sarah — attempt 1 on quiz1, scored 20 pts
  await prisma.quizAttempt.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      userId: sarah.id,
      quizId: quiz1.id,
      attemptNumber: 1,
      answers: { 1: [0], 2: [1], 3: [1], 4: [0] },
      pointsEarned: 20,
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
  });

  // Sarah — attempt 1 on quiz2 (AI), scored 15 pts
  await prisma.quizAttempt.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      userId: sarah.id,
      quizId: quiz2.id,
      attemptNumber: 1,
      answers: { 10: [0], 11: [1], 12: [1] },
      pointsEarned: 15,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Sarah — attempt 1 on quiz3 (React), scored 25 pts
  await prisma.quizAttempt.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      userId: sarah.id,
      quizId: quiz3.id,
      attemptNumber: 1,
      answers: { 20: [1], 21: [1], 22: [2], 23: [1] },
      pointsEarned: 25,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Bob — attempt 1 on quiz2, scored 10 pts (2nd attempt score)
  await prisma.quizAttempt.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5,
      userId: bob.id,
      quizId: quiz2.id,
      attemptNumber: 1,
      answers: { 10: [0], 11: [0], 12: [1] },
      pointsEarned: 10,
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });

  // Sync totalPoints on learner users
  await prisma.user.update({ where: { id: alice.id }, data: { totalPoints: 20, currentBadge: 'Explorer' } });
  await prisma.user.update({ where: { id: sarah.id }, data: { totalPoints: 60, currentBadge: 'Champion' } });
  await prisma.user.update({ where: { id: bob.id },   data: { totalPoints: 10, currentBadge: 'Beginner' } });

  console.log('✓ Quiz attempts seeded');
  console.log('\n🌱 Seed complete!\n');
  console.log('Accounts:');
  console.log('  admin@learnova.dev        / admin123  (ADMIN)');
  console.log('  instructor@learnova.dev   / inst123   (INSTRUCTOR)');
  console.log('  learner@learnova.dev      / learn123  (LEARNER)');
  console.log('  alice@learnova.dev        / alice123  (LEARNER — 2 enrollments)');
  console.log('  bob@learnova.dev          / bob123    (LEARNER — 2 enrollments)');
  console.log('  sarah@learnova.dev        / sarah123  (LEARNER — 3 enrollments, most progress)');
}

main().finally(() => prisma.$disconnect());
