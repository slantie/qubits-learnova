import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Real asset URLs from the existing database ─────────────────────────────

// 10 READY videos (3 distinct source files)
const VIDEOS = [
  { id: '97269216-e2a2-4474-a1af-b6a25a2958f9', duration: 45 },   // fleet_flow
  { id: '2d6f1e89-e421-4266-a776-1e7794d28235', duration: 45 },   // fleet_flow
  { id: 'f1c48c26-bf33-4fc5-b80c-6dbf771dc000', duration: 45 },   // test-lesson
  { id: 'bc4359cd-f3b9-4c77-ad9e-de97ed3421e9', duration: 149 },  // Rust in 100s
  { id: 'e05645c8-f2a6-402c-9817-3c56133a2570', duration: 149 },  // Rust in 100s
  { id: '632efee2-6f1c-4e57-b4b0-a0599c7777de', duration: 149 },  // Rust in 100s
  { id: 'bf3a46a3-a6e1-4f07-972a-da6f21e83842', duration: 149 },  // Rust in 100s
  { id: '75cbe839-40e2-4bfe-8e2f-fb514061b331', duration: 85 },   // SelfRevealingPoisons
  { id: 'cc359caf-89c5-4ddf-b0c7-01fa9d402e2d', duration: 85 },   // WhatsApp video
  { id: '3a567fab-1de8-4114-b455-3c6bb1de54f2', duration: 85 },   // WhatsApp video
];

const vUrl = (id: string) => `http://localhost:4001/api/stream/${id}/hls/master.m3u8`;
const tUrl = (id: string) => `http://localhost:4001/api/stream/${id}/thumbnail.jpg`;
const pickVid = (i: number) => VIDEOS[i % VIDEOS.length];

// Real Cloudinary covers (from existing courses)
const COVERS = [
  'https://res.cloudinary.com/daqg9tftx/image/upload/v1774099938/learnova/covers/IMG_4935%20%28Large%29%20%28Small%29.jpg',
  'https://res.cloudinary.com/daqg9tftx/image/upload/v1774105006/learnova/covers/7245218.jpg',
  'https://res.cloudinary.com/daqg9tftx/image/upload/v1774105051/learnova/covers/6731690.jpg',
  'https://res.cloudinary.com/daqg9tftx/image/upload/v1774106517/learnova/covers/51L751cquHL._AC_UF1000%2C1000_QL80_.jpg',
  'https://res.cloudinary.com/daqg9tftx/image/upload/v1774111039/learnova/covers/header.jpg',
];

// Real Cloudinary attachment files
const FILES = {
  IMG_OUTPUT: 'https://res.cloudinary.com/daqg9tftx/image/upload/v1774095138/learnova/attachments/output.jpg',
  DOCX_PRD: 'https://res.cloudinary.com/daqg9tftx/raw/upload/v1774097242/learnova/attachments/learnova_prd.docx',
  PDF_QML: 'https://res.cloudinary.com/daqg9tftx/image/upload/v1774107373/learnova/attachments/Superior%20resilience%20to%20poisoning%20and%20amenability%20to%20unlearning%20in%20quantum%20machine%20learning.pdf',
  MP3_NOISE: 'https://res.cloudinary.com/daqg9tftx/video/upload/v1774131673/learnova/attachments/random_noise.mp3',
  IMG_HEADER: 'https://res.cloudinary.com/daqg9tftx/image/upload/v1774131706/learnova/attachments/header.jpg',
  PDF_LEARNOVA: 'https://res.cloudinary.com/daqg9tftx/image/upload/v1774131789/learnova/attachments/Qubits%20Learnova%20-%20eLearning%20Platform.pdf',
  PDF_LEARNOVA2: 'https://res.cloudinary.com/daqg9tftx/image/upload/v1774138422/learnova/attachments/Learnova%20%28eLearning%20Platform%29%20%281%29.pdf',
};

const PASSWORD = 'Test@1234';

// Offset all seeded IDs to avoid collisions with existing auto-incremented data
const ID_OFFSET = 30000;

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. USERS (33 total)
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Team admins (real emails) ---
  const teamAdmins = [
    { email: 'ridhampatel2k4@gmail.com', name: 'Ridham Patel' },
    { email: 'harsh888dodiya@gmail.com', name: 'Harsh Dodiya' },
    { email: 'kandarp.gajjar.460@gmail.com', name: 'Kandarp Gajjar' },
  ];
  const adminUsers: { id: number; email: string }[] = [];
  for (const a of teamAdmins) {
    const u = await prisma.user.upsert({
      where: { email: a.email },
      update: { role: 'ADMIN' },
      create: { email: a.email, name: a.name, passwordHash: hash, role: 'ADMIN' },
    });
    adminUsers.push(u);
  }

  // --- Yopmail admin ---
  const yopAdmin = await prisma.user.upsert({
    where: { email: 'learnova.admin@yopmail.com' },
    update: { role: 'ADMIN' },
    create: { email: 'learnova.admin@yopmail.com', name: 'Arjun Mehta', passwordHash: hash, role: 'ADMIN' },
  });

  // --- Instructors (5) ---
  const instructorData = [
    { email: 'priya.sharma.inst@yopmail.com', name: 'Priya Sharma' },
    { email: 'rohan.gupta.inst@yopmail.com', name: 'Rohan Gupta' },
    { email: 'ananya.iyer.inst@yopmail.com', name: 'Ananya Iyer' },
    { email: 'vikram.reddy.inst@yopmail.com', name: 'Vikram Reddy' },
    { email: 'neha.joshi.inst@yopmail.com', name: 'Neha Joshi' },
  ];
  const instructors: { id: number; name: string }[] = [];
  for (const d of instructorData) {
    const u = await prisma.user.upsert({
      where: { email: d.email },
      update: { role: 'INSTRUCTOR' },
      create: { email: d.email, name: d.name, passwordHash: hash, role: 'INSTRUCTOR' },
    });
    instructors.push(u);
  }

  // --- Learners (25) ---
  const learnerData = [
    { email: 'aarav.kumar@yopmail.com', name: 'Aarav Kumar', points: 130, badge: 'Master' },
    { email: 'diya.verma@yopmail.com', name: 'Diya Verma', points: 105, badge: 'Expert' },
    { email: 'arjun.singh@yopmail.com', name: 'Arjun Singh', points: 95, badge: 'Specialist' },
    { email: 'isha.patel@yopmail.com', name: 'Isha Patel', points: 82, badge: 'Specialist' },
    { email: 'vihaan.rao@yopmail.com', name: 'Vihaan Rao', points: 70, badge: 'Achiever' },
    { email: 'anvi.desai@yopmail.com', name: 'Anvi Desai', points: 65, badge: 'Achiever' },
    { email: 'reyansh.kapoor@yopmail.com', name: 'Reyansh Kapoor', points: 55, badge: 'Explorer' },
    { email: 'saanvi.nair@yopmail.com', name: 'Saanvi Nair', points: 48, badge: 'Explorer' },
    { email: 'kabir.malhotra@yopmail.com', name: 'Kabir Malhotra', points: 42, badge: 'Explorer' },
    { email: 'myra.bhat@yopmail.com', name: 'Myra Bhat', points: 38, badge: 'Newbie' },
    { email: 'aditya.thakur@yopmail.com', name: 'Aditya Thakur', points: 35, badge: 'Newbie' },
    { email: 'kiara.menon@yopmail.com', name: 'Kiara Menon', points: 30, badge: 'Newbie' },
    { email: 'vivaan.sinha@yopmail.com', name: 'Vivaan Sinha', points: 28, badge: 'Newbie' },
    { email: 'aanya.pillai@yopmail.com', name: 'Aanya Pillai', points: 25, badge: 'Newbie' },
    { email: 'dhruv.banerjee@yopmail.com', name: 'Dhruv Banerjee', points: 22, badge: 'Newbie' },
    { email: 'navya.chandra@yopmail.com', name: 'Navya Chandra', points: 18, badge: null },
    { email: 'ishaan.saxena@yopmail.com', name: 'Ishaan Saxena', points: 15, badge: null },
    { email: 'pari.mishra@yopmail.com', name: 'Pari Mishra', points: 12, badge: null },
    { email: 'arnav.chatterjee@yopmail.com', name: 'Arnav Chatterjee', points: 10, badge: null },
    { email: 'tara.kulkarni@yopmail.com', name: 'Tara Kulkarni', points: 8, badge: null },
    { email: 'siddharth.hegde@yopmail.com', name: 'Siddharth Hegde', points: 5, badge: null },
    { email: 'riya.pawar@yopmail.com', name: 'Riya Pawar', points: 3, badge: null },
    { email: 'ayaan.mukherjee@yopmail.com', name: 'Ayaan Mukherjee', points: 0, badge: null },
    { email: 'meera.das@yopmail.com', name: 'Meera Das', points: 0, badge: null },
    { email: 'krish.sethi@yopmail.com', name: 'Krish Sethi', points: 0, badge: null },
  ];
  const learners: { id: number; name: string; points: number }[] = [];
  for (const d of learnerData) {
    const u = await prisma.user.upsert({
      where: { email: d.email },
      update: { totalPoints: d.points, currentBadge: d.badge },
      create: { email: d.email, name: d.name, passwordHash: hash, role: 'LEARNER', totalPoints: d.points, currentBadge: d.badge },
    });
    learners.push({ id: u.id, name: u.name, points: d.points });
  }

  console.log('✓ 33 users seeded');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. COURSES (12 total)
  // ═══════════════════════════════════════════════════════════════════════════

  const courseDefs = [
    // 4 free/open courses
    { title: 'Full Stack Web Development with MERN', desc: 'Master MongoDB, Express, React, and Node.js to build production-ready web applications from scratch. Includes REST APIs, authentication, and deployment.', tags: ['mern', 'react', 'nodejs', 'mongodb', 'fullstack'], published: true, vis: 'EVERYONE' as const, access: 'OPEN' as const, price: null, inst: 0, cover: 0, certTemplate: 'classic', certThreshold: 70 },
    { title: 'Python for Data Science', desc: 'Learn Python programming with focus on NumPy, Pandas, Matplotlib, and Scikit-learn. Hands-on projects with real datasets from Kaggle.', tags: ['python', 'data-science', 'pandas', 'machine-learning'], published: true, vis: 'EVERYONE' as const, access: 'OPEN' as const, price: null, inst: 1, cover: 1, certTemplate: 'modern', certThreshold: 75 },
    { title: 'UI/UX Design Fundamentals', desc: 'From wireframes to high-fidelity prototypes. Learn Figma, design thinking, accessibility standards, and user research methods.', tags: ['design', 'uiux', 'figma', 'prototyping'], published: true, vis: 'EVERYONE' as const, access: 'OPEN' as const, price: null, inst: 2, cover: 2, certTemplate: null, certThreshold: null },
    { title: 'Introduction to Cloud Computing', desc: 'Understand AWS, Azure, and GCP fundamentals. Deploy your first serverless function and containerised application.', tags: ['cloud', 'aws', 'devops', 'docker'], published: true, vis: 'EVERYONE' as const, access: 'OPEN' as const, price: null, inst: 3, cover: 3, certTemplate: 'classic', certThreshold: 60 },
    // 4 paid courses
    { title: 'Advanced React & Next.js Patterns', desc: 'Server components, App Router, streaming SSR, and advanced state management. Build a production SaaS dashboard from scratch.', tags: ['react', 'nextjs', 'typescript', 'advanced'], published: true, vis: 'EVERYONE' as const, access: 'ON_PAYMENT' as const, price: 1499, inst: 0, cover: 4, certTemplate: 'premium', certThreshold: 80, earlyBirdPrice: 999, earlyBirdLimit: 50 },
    { title: 'System Design for Interviews', desc: 'Design scalable distributed systems. Cover load balancers, caching, message queues, database sharding, and CAP theorem with real whiteboard sessions.', tags: ['system-design', 'interview', 'architecture', 'scalability'], published: true, vis: 'EVERYONE' as const, access: 'ON_PAYMENT' as const, price: 1999, inst: 1, cover: 0, certTemplate: 'premium', certThreshold: 85 },
    { title: 'Machine Learning with TensorFlow', desc: 'Build neural networks, CNNs, RNNs, and transformers. Includes computer vision and NLP projects with deployment to production.', tags: ['ml', 'tensorflow', 'deep-learning', 'ai'], published: true, vis: 'EVERYONE' as const, access: 'ON_PAYMENT' as const, price: 2499, inst: 2, cover: 1, certTemplate: 'modern', certThreshold: 75 },
    { title: 'DevOps & CI/CD Mastery', desc: 'Docker, Kubernetes, GitHub Actions, Terraform, and monitoring with Prometheus/Grafana. Automate everything from build to deployment.', tags: ['devops', 'docker', 'kubernetes', 'cicd'], published: true, vis: 'EVERYONE' as const, access: 'ON_PAYMENT' as const, price: 1799, inst: 4, cover: 2, certTemplate: 'classic', certThreshold: 70 },
    // 2 signed-in only free courses
    { title: 'Git & GitHub Mastery', desc: 'From git init to advanced rebasing, cherry-picking, and CI workflows. Collaborate like a pro with pull requests and code reviews.', tags: ['git', 'github', 'version-control', 'collaboration'], published: true, vis: 'SIGNED_IN' as const, access: 'OPEN' as const, price: null, inst: 3, cover: 3, certTemplate: null, certThreshold: null },
    { title: 'Competitive Programming in C++', desc: 'Master algorithms, data structures, dynamic programming, and graph theory. Prepare for ICPC, Codeforces, and LeetCode contests.', tags: ['cpp', 'algorithms', 'competitive', 'dsa'], published: true, vis: 'SIGNED_IN' as const, access: 'OPEN' as const, price: null, inst: 4, cover: 4, certTemplate: 'classic', certThreshold: 90 },
    // 2 draft/unpublished courses
    { title: 'Blockchain & Web3 Development', desc: 'Solidity smart contracts, Hardhat, ethers.js, and decentralized app architecture. Build a full DeFi protocol.', tags: ['blockchain', 'web3', 'solidity', 'ethereum'], published: false, vis: 'EVERYONE' as const, access: 'ON_PAYMENT' as const, price: 2999, inst: 0, cover: 0, certTemplate: null, certThreshold: null },
    { title: 'Mobile App Development with Flutter', desc: 'Build beautiful cross-platform mobile apps with Dart and Flutter. State management with Riverpod, Firebase integration, and App Store deployment.', tags: ['flutter', 'dart', 'mobile', 'cross-platform'], published: false, vis: 'EVERYONE' as const, access: 'OPEN' as const, price: null, inst: 1, cover: 1, certTemplate: null, certThreshold: null },
  ];

  const courses: { id: number; title: string }[] = [];
  for (const [i, c] of courseDefs.entries()) {
    const course = await prisma.course.upsert({
      where: { id: ID_OFFSET + i + 1 },
      update: { isPublished: c.published, title: c.title },
      create: {
        id: ID_OFFSET + i + 1,
        title: c.title,
        description: c.desc,
        tags: c.tags,
        isPublished: c.published,
        visibility: c.vis,
        accessRule: c.access,
        price: c.price,
        coverImage: COVERS[c.cover],
        instructorId: instructors[c.inst].id,
        courseAdminId: adminUsers[0].id,
        certificateTemplate: c.certTemplate,
        certThreshold: c.certThreshold,
        earlyBirdPrice: (c as any).earlyBirdPrice ?? null,
        earlyBirdLimit: (c as any).earlyBirdLimit ?? null,
      },
    });
    courses.push(course);
  }

  console.log('✓ 12 courses seeded');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SECTIONS & LESSONS (~100 lessons across 10 published courses)
  // ═══════════════════════════════════════════════════════════════════════════

  let lessonId = ID_OFFSET + 1;
  let sectionId = ID_OFFSET + 1;
  const allLessons: { id: number; courseId: number }[] = [];

  async function createSection(
    courseId: number,
    sectionTitle: string,
    sectionOrder: number,
    lessonsData: { title: string; type: string; desc: string; extra?: any }[],
  ) {
    const section = await prisma.section.upsert({
      where: { id: sectionId },
      update: {},
      create: { id: sectionId, courseId, title: sectionTitle, order: sectionOrder },
    });
    const curSectionId = sectionId;
    sectionId++;

    for (const [li, l] of lessonsData.entries()) {
      const v = pickVid(lessonId);
      const base: any = {
        id: lessonId,
        courseId,
        sectionId: curSectionId,
        title: l.title,
        type: l.type as any,
        order: li + 1,
        description: `<p>${l.desc}</p>`,
      };

      if (l.type === 'VIDEO') {
        base.videoUrl = vUrl(v.id);
        base.thumbnailUrl = tUrl(v.id);
        base.videoStatus = 'READY';
        base.videoId = v.id;
        base.duration = v.duration;
      } else if (l.type === 'DOCUMENT' || l.type === 'PDF') {
        base.filePath = l.extra?.filePath || FILES.PDF_LEARNOVA;
        base.allowDownload = true;
      } else if (l.type === 'IMAGE') {
        base.filePath = l.extra?.filePath || FILES.IMG_OUTPUT;
      } else if (l.type === 'AUDIO') {
        base.filePath = FILES.MP3_NOISE;
      } else if (l.type === 'ARTICLE') {
        base.richContent = l.extra?.richContent || { html: `<h2>${l.title}</h2><p>${l.desc}</p><p>This is a comprehensive article covering all key concepts with examples, code snippets, and diagrams.</p>` };
      } else if (l.type === 'LINK_BLOCK') {
        base.richContent = l.extra?.richContent || { url: 'https://developer.mozilla.org', label: l.title };
      } else if (l.type === 'IFRAME') {
        base.iframeUrl = l.extra?.iframeUrl || 'https://codepen.io/pen/';
      } else if (l.type === 'ASSIGNMENT') {
        base.richContent = l.extra?.richContent || {
          instructions: l.desc,
          checklist: ['Complete the task', 'Test your implementation', 'Submit your solution'],
        };
      } else if (l.type === 'SURVEY') {
        base.richContent = {
          questions: [
            { q: 'How would you rate this section?', type: 'rating' },
            { q: 'What could be improved?', type: 'text' },
          ],
        };
      } else if (l.type === 'FEEDBACK_GATE') {
        base.richContent = { minRating: 3, message: 'Please share your feedback to unlock the next section.' };
      }

      await prisma.lesson.upsert({
        where: { id: lessonId },
        update: {},
        create: base,
      });
      allLessons.push({ id: lessonId, courseId });
      lessonId++;
    }
  }

  // ── Course 1: Full Stack MERN ──
  await createSection(courses[0].id, 'Getting Started', 1, [
    { title: 'Course Overview & Setup', type: 'VIDEO', desc: 'Setting up your development environment with Node.js, VS Code, and MongoDB Atlas.' },
    { title: 'How the Internet Works', type: 'ARTICLE', desc: 'Understanding HTTP, DNS, TCP/IP, and the request-response cycle that powers every web application.' },
    { title: 'Development Tools Checklist', type: 'ASSIGNMENT', desc: 'Install all required tools and verify your development environment is correctly configured.' },
  ]);
  await createSection(courses[0].id, 'Backend with Node.js & Express', 2, [
    { title: 'Introduction to Node.js', type: 'VIDEO', desc: 'Event loop, modules, npm, and building your first HTTP server from scratch.' },
    { title: 'Express.js Deep Dive', type: 'VIDEO', desc: 'Routing, middleware, error handling, and RESTful API design patterns with Express.' },
    { title: 'MongoDB & Mongoose', type: 'VIDEO', desc: 'Schema design, CRUD operations, indexing, and aggregation pipelines with Mongoose ODM.' },
    { title: 'API Documentation Reference', type: 'PDF', desc: 'Complete REST API reference with endpoints, request/response examples, and authentication flows.', extra: { filePath: FILES.PDF_QML } },
    { title: 'Authentication & JWT', type: 'VIDEO', desc: 'Implementing secure JWT-based authentication with refresh tokens, bcrypt hashing, and RBAC.' },
  ]);
  await createSection(courses[0].id, 'Frontend with React', 3, [
    { title: 'React Fundamentals', type: 'VIDEO', desc: 'JSX, components, props, state, and the virtual DOM reconciliation algorithm.' },
    { title: 'State Management Patterns', type: 'VIDEO', desc: 'Context API, useReducer, Zustand, and when to use each state management approach.' },
    { title: 'Architecture Diagram', type: 'IMAGE', desc: 'Visual overview of the MERN stack architecture and data flow between client and server.', extra: { filePath: FILES.IMG_HEADER } },
    { title: 'Course Feedback', type: 'FEEDBACK_GATE', desc: 'Share your learning experience before accessing the final project section.' },
  ]);

  // ── Course 2: Python for Data Science ──
  await createSection(courses[1].id, 'Python Basics', 1, [
    { title: 'Python Setup & Environment', type: 'VIDEO', desc: 'Installing Python, Jupyter Notebook, virtual environments, and pip package management.' },
    { title: 'Variables, Data Types & Control Flow', type: 'VIDEO', desc: 'Strings, lists, dictionaries, loops, conditionals, and comprehensions in Python.' },
    { title: 'Functions & OOP in Python', type: 'VIDEO', desc: 'Defining functions, classes, inheritance, decorators, and magic methods.' },
    { title: 'Python Cheat Sheet', type: 'PDF', desc: 'Quick reference for Python syntax, built-in functions, and common patterns.', extra: { filePath: FILES.PDF_LEARNOVA2 } },
  ]);
  await createSection(courses[1].id, 'Data Analysis', 2, [
    { title: 'NumPy Arrays & Operations', type: 'VIDEO', desc: 'N-dimensional arrays, broadcasting, vectorized operations, and linear algebra with NumPy.' },
    { title: 'Pandas DataFrames Masterclass', type: 'VIDEO', desc: 'Loading CSVs, filtering, groupby, merge, pivot tables, and handling missing data.' },
    { title: 'Data Visualization with Matplotlib', type: 'VIDEO', desc: 'Line plots, bar charts, histograms, scatter plots, and customizing plot aesthetics.' },
    { title: 'Interactive Notebook Exercise', type: 'LINK_BLOCK', desc: 'Practice data analysis with a live Jupyter notebook.', extra: { richContent: { url: 'https://jupyter.org/try', label: 'Try Jupyter Online' } } },
    { title: 'Section Survey', type: 'SURVEY', desc: 'Help us improve this section with your feedback.' },
  ]);
  await createSection(courses[1].id, 'Machine Learning Intro', 3, [
    { title: 'Intro to Scikit-learn', type: 'VIDEO', desc: 'Training your first ML model — linear regression, decision trees, and model evaluation metrics.' },
    { title: 'Capstone Project Brief', type: 'ASSIGNMENT', desc: 'Analyze a real-world Kaggle dataset, build a predictive model, and present your findings.' },
  ]);

  // ── Course 3: UI/UX Design ──
  await createSection(courses[2].id, 'Design Thinking', 1, [
    { title: 'What is UX Design?', type: 'VIDEO', desc: 'User experience fundamentals, the double diamond process, and empathy mapping.' },
    { title: 'User Research Methods', type: 'ARTICLE', desc: 'Surveys, interviews, personas, journey mapping, and card sorting techniques for understanding users.' },
    { title: 'Design Thinking Framework', type: 'IMAGE', desc: 'Visual guide to the 5-stage design thinking process.', extra: { filePath: FILES.IMG_OUTPUT } },
  ]);
  await createSection(courses[2].id, 'Figma & Prototyping', 2, [
    { title: 'Figma Basics', type: 'VIDEO', desc: 'Frames, auto layout, components, variants, and design tokens in Figma.' },
    { title: 'Building a Design System', type: 'VIDEO', desc: 'Color palettes, typography scales, spacing systems, and component libraries.' },
    { title: 'Interactive Prototype', type: 'IFRAME', desc: 'Explore this interactive Figma prototype demonstrating micro-interactions and transitions.', extra: { iframeUrl: 'https://www.figma.com/proto/example' } },
    { title: 'Accessibility Guidelines', type: 'PDF', desc: 'WCAG 2.1 checklist and best practices for inclusive design.', extra: { filePath: FILES.PDF_QML } },
    { title: 'Design Portfolio Assignment', type: 'ASSIGNMENT', desc: 'Create a case study for your portfolio including problem statement, research, wireframes, and final designs.' },
  ]);

  // ── Course 4: Cloud Computing ──
  await createSection(courses[3].id, 'Cloud Fundamentals', 1, [
    { title: 'What is Cloud Computing?', type: 'VIDEO', desc: 'IaaS, PaaS, SaaS models, shared responsibility, and comparing AWS, Azure, and GCP.' },
    { title: 'Setting Up AWS Account', type: 'VIDEO', desc: 'Creating an AWS free tier account, IAM users, MFA setup, and billing alerts.' },
    { title: 'Cloud Architecture Overview', type: 'IMAGE', desc: 'Diagram showing typical three-tier cloud architecture with load balancers and auto-scaling.', extra: { filePath: FILES.IMG_HEADER } },
  ]);
  await createSection(courses[3].id, 'Compute & Storage', 2, [
    { title: 'EC2 & Lambda Functions', type: 'VIDEO', desc: 'Virtual machines vs serverless, instance types, cold starts, and cost optimization.' },
    { title: 'S3 & Storage Services', type: 'VIDEO', desc: 'Object storage, lifecycle policies, CloudFront CDN, and static website hosting with S3.' },
    { title: 'AWS Documentation', type: 'LINK_BLOCK', desc: 'Official AWS documentation for further reference.', extra: { richContent: { url: 'https://docs.aws.amazon.com', label: 'AWS Documentation' } } },
  ]);
  await createSection(courses[3].id, 'Containers & Deployment', 3, [
    { title: 'Docker on AWS', type: 'VIDEO', desc: 'ECS, ECR, Fargate, and deploying containerized applications to AWS.' },
    { title: 'Infrastructure as Code', type: 'ARTICLE', desc: 'CloudFormation and Terraform basics for managing infrastructure declaratively.' },
    { title: 'Podcast: Cloud Trends 2025', type: 'AUDIO', desc: 'Industry experts discuss multi-cloud strategies, edge computing, and FinOps.' },
    { title: 'Deploy Your First App', type: 'ASSIGNMENT', desc: 'Deploy a Node.js application using EC2 or Lambda, configure a custom domain, and set up HTTPS.' },
  ]);

  // ── Course 5: Advanced React & Next.js ──
  await createSection(courses[4].id, 'Server Components & App Router', 1, [
    { title: 'Next.js 14+ Architecture', type: 'VIDEO', desc: 'App Router, layouts, loading states, error boundaries, and parallel routes.' },
    { title: 'React Server Components', type: 'VIDEO', desc: 'Server vs client components, use server directive, and streaming SSR with Suspense.' },
    { title: 'Data Fetching Patterns', type: 'ARTICLE', desc: 'Server actions, revalidation strategies, ISR, and parallel data fetching patterns.' },
  ]);
  await createSection(courses[4].id, 'Advanced State & Performance', 2, [
    { title: 'Zustand & Jotai Deep Dive', type: 'VIDEO', desc: 'Atomic state management, derived state, persistence middleware, and DevTools integration.' },
    { title: 'React Performance Optimization', type: 'VIDEO', desc: 'React Compiler, useMemo, useCallback, virtualization, and bundle analysis techniques.' },
    { title: 'Performance Audit Checklist', type: 'PDF', desc: 'Step-by-step guide to auditing and optimizing Next.js application performance.', extra: { filePath: FILES.PDF_LEARNOVA } },
  ]);
  await createSection(courses[4].id, 'Production SaaS Project', 3, [
    { title: 'Building the Dashboard', type: 'VIDEO', desc: 'Full SaaS dashboard with authentication, role-based access, real-time data, and Stripe payments.' },
    { title: 'Deployment & Monitoring', type: 'VIDEO', desc: 'Vercel deployment, environment variables, error tracking with Sentry, and analytics.' },
    { title: 'SaaS Dashboard Assignment', type: 'ASSIGNMENT', desc: 'Build and deploy a complete SaaS dashboard with all features covered in this course.' },
    { title: 'Course Survey', type: 'SURVEY', desc: 'Help us improve this premium course with your detailed feedback.' },
  ]);

  // ── Course 6: System Design ──
  await createSection(courses[5].id, 'Fundamentals', 1, [
    { title: 'System Design Framework', type: 'VIDEO', desc: 'The 4-step approach: requirements, estimation, high-level design, and deep dive.' },
    { title: 'Scalability Concepts', type: 'VIDEO', desc: 'Horizontal vs vertical scaling, load balancing algorithms, and caching strategies.' },
    { title: 'CAP Theorem Explained', type: 'ARTICLE', desc: 'Understanding consistency, availability, partition tolerance trade-offs with real-world examples.' },
  ]);
  await createSection(courses[5].id, 'Real System Designs', 2, [
    { title: 'Design a URL Shortener', type: 'VIDEO', desc: 'Hash functions, base62 encoding, database choice, cache layer, and analytics.' },
    { title: 'Design a Chat System', type: 'VIDEO', desc: 'WebSockets, message queues, presence service, and group chat architecture.' },
    { title: 'Design a Video Streaming Platform', type: 'VIDEO', desc: 'CDN, adaptive bitrate streaming, video processing pipeline, and recommendation engine.' },
    { title: 'System Design Templates', type: 'PDF', desc: 'Reusable templates for common system design interview patterns.', extra: { filePath: FILES.PDF_LEARNOVA2 } },
  ]);
  await createSection(courses[5].id, 'Mock Interviews', 3, [
    { title: 'Mock Interview: E-commerce', type: 'VIDEO', desc: 'Complete mock interview designing a large-scale e-commerce platform like Flipkart.' },
    { title: 'Design Challenge', type: 'ASSIGNMENT', desc: 'Pick any system and create a detailed design document with diagrams and trade-off analysis.' },
    { title: 'Interview Tips Podcast', type: 'AUDIO', desc: 'Senior engineers share their system design interview tips and common mistakes to avoid.' },
  ]);

  // ── Course 7: ML with TensorFlow ──
  await createSection(courses[6].id, 'Neural Network Basics', 1, [
    { title: 'Introduction to Neural Networks', type: 'VIDEO', desc: 'Perceptrons, activation functions, forward propagation, and backpropagation from scratch.' },
    { title: 'TensorFlow & Keras Setup', type: 'VIDEO', desc: 'Installing TensorFlow, GPU configuration, and building your first model with Keras Sequential API.' },
    { title: 'Neural Network Visualizer', type: 'IFRAME', desc: 'Interactive visualization of how neural networks learn and classify data.', extra: { iframeUrl: 'https://playground.tensorflow.org' } },
  ]);
  await createSection(courses[6].id, 'Computer Vision', 2, [
    { title: 'Convolutional Neural Networks', type: 'VIDEO', desc: 'Convolution layers, pooling, feature maps, and building image classifiers with CNNs.' },
    { title: 'Transfer Learning', type: 'VIDEO', desc: 'Using pre-trained models like ResNet and EfficientNet for custom image classification tasks.' },
    { title: 'Image Classification Project', type: 'ASSIGNMENT', desc: 'Build an image classifier that can distinguish between 10 categories of Indian street food.' },
  ]);
  await createSection(courses[6].id, 'NLP & Transformers', 3, [
    { title: 'Recurrent Neural Networks', type: 'VIDEO', desc: 'RNNs, LSTMs, GRUs, and sequence-to-sequence models for text processing.' },
    { title: 'Attention & Transformers', type: 'VIDEO', desc: 'Self-attention mechanism, transformer architecture, and fine-tuning BERT for text classification.' },
    { title: 'Research Papers', type: 'LINK_BLOCK', desc: 'Key papers: Attention Is All You Need, BERT, GPT series.', extra: { richContent: { url: 'https://arxiv.org/abs/1706.03762', label: 'Attention Is All You Need' } } },
    { title: 'NLP Sentiment Analysis Project', type: 'ASSIGNMENT', desc: 'Build a sentiment analyzer for Hindi-English code-mixed social media text.' },
  ]);

  // ── Course 8: DevOps & CI/CD ──
  await createSection(courses[7].id, 'Docker & Containers', 1, [
    { title: 'Docker Fundamentals', type: 'VIDEO', desc: 'Images, containers, Dockerfiles, multi-stage builds, and Docker Compose for local development.' },
    { title: 'Docker Cheat Sheet', type: 'PDF', desc: 'Quick reference for common Docker commands and Dockerfile best practices.', extra: { filePath: FILES.PDF_QML } },
    { title: 'Container Security', type: 'ARTICLE', desc: 'Image scanning, non-root containers, secrets management, and network policies.' },
  ]);
  await createSection(courses[7].id, 'Kubernetes', 2, [
    { title: 'Kubernetes Architecture', type: 'VIDEO', desc: 'Pods, Services, Deployments, ConfigMaps, Secrets, and the Kubernetes control plane.' },
    { title: 'Helm Charts & GitOps', type: 'VIDEO', desc: 'Package management with Helm, ArgoCD for GitOps, and Kubernetes deployment strategies.' },
    { title: 'K8s Cluster Diagram', type: 'IMAGE', desc: 'Detailed Kubernetes cluster architecture showing all components and their interactions.', extra: { filePath: FILES.IMG_OUTPUT } },
  ]);
  await createSection(courses[7].id, 'CI/CD & Monitoring', 3, [
    { title: 'GitHub Actions Mastery', type: 'VIDEO', desc: 'Writing workflows, matrix builds, caching, secrets, reusable workflows, and composite actions.' },
    { title: 'Terraform Infrastructure', type: 'VIDEO', desc: 'HCL syntax, providers, modules, state management, and provisioning cloud infrastructure.' },
    { title: 'Monitoring with Prometheus & Grafana', type: 'VIDEO', desc: 'Metrics collection, PromQL queries, alert rules, and building Grafana dashboards.' },
    { title: 'DevOps Pipeline Assignment', type: 'ASSIGNMENT', desc: 'Create a complete CI/CD pipeline that builds, tests, and deploys a containerized application.' },
    { title: 'DevOps Feedback', type: 'FEEDBACK_GATE', desc: 'Share your feedback on the CI/CD section before accessing advanced monitoring content.' },
  ]);

  // ── Course 9: Git & GitHub ──
  await createSection(courses[8].id, 'Git Basics', 1, [
    { title: 'Git Init to First Commit', type: 'VIDEO', desc: 'Installing Git, configuration, staging area, commits, and understanding the .git directory.' },
    { title: 'Branching & Merging', type: 'VIDEO', desc: 'Creating branches, merge strategies, resolving conflicts, and branch management workflows.' },
    { title: 'Git Command Reference', type: 'PDF', desc: 'Comprehensive reference for all Git commands with examples and common use cases.', extra: { filePath: FILES.PDF_LEARNOVA } },
  ]);
  await createSection(courses[8].id, 'Advanced Git & GitHub', 2, [
    { title: 'Rebasing & Cherry-picking', type: 'VIDEO', desc: 'Interactive rebase, cherry-pick, bisect, reflog, and recovering from mistakes.' },
    { title: 'GitHub Pull Requests & Reviews', type: 'VIDEO', desc: 'Creating PRs, code review best practices, protected branches, and CODEOWNERS.' },
    { title: 'GitHub Actions CI', type: 'VIDEO', desc: 'Setting up automated testing, linting, and deployment workflows with GitHub Actions.' },
    { title: 'Open Source Contribution Guide', type: 'ARTICLE', desc: 'Finding good first issues, fork workflow, writing quality PRs, and contributing to OSS.' },
    { title: 'Git Workflow Assignment', type: 'ASSIGNMENT', desc: 'Simulate a team workflow: create branches, make PRs, handle conflicts, and use CI checks.' },
  ]);

  // ── Course 10: Competitive Programming ──
  await createSection(courses[9].id, 'Foundations', 1, [
    { title: 'Time & Space Complexity', type: 'VIDEO', desc: 'Big O notation, amortized analysis, and choosing the right algorithm based on constraints.' },
    { title: 'Arrays, Strings & Sorting', type: 'VIDEO', desc: 'Two pointers, sliding window, prefix sums, and comparison-based vs counting sorts.' },
    { title: 'Practice Problems', type: 'LINK_BLOCK', desc: 'Curated problem sets on Codeforces.', extra: { richContent: { url: 'https://codeforces.com/problemset', label: 'Codeforces Problem Set' } } },
  ]);
  await createSection(courses[9].id, 'Advanced Algorithms', 2, [
    { title: 'Graph Algorithms', type: 'VIDEO', desc: 'BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, and topological sorting.' },
    { title: 'Dynamic Programming', type: 'VIDEO', desc: 'Memoization, tabulation, knapsack, LIS, LCS, matrix chain, and bitmask DP.' },
    { title: 'Segment Trees & BIT', type: 'VIDEO', desc: 'Range queries, point updates, lazy propagation, and Fenwick trees.' },
    { title: 'Contest Strategy Guide', type: 'ARTICLE', desc: 'Time management, problem selection, debugging strategies, and stress testing.' },
    { title: 'Virtual Contest Assignment', type: 'ASSIGNMENT', desc: 'Participate in a 3-hour virtual contest and solve at least 4 out of 6 problems.' },
  ]);

  console.log(`✓ ${lessonId - 1} lessons in ${sectionId - 1} sections seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ATTACHMENTS (15 total)
  // ═══════════════════════════════════════════════════════════════════════════

  const attachmentDefs = [
    { lessonId: ID_OFFSET + 4, type: 'LINK' as const, label: 'Node.js Official Docs', externalUrl: 'https://nodejs.org/docs/latest/api/' },
    { lessonId: ID_OFFSET + 5, type: 'LINK' as const, label: 'Express.js Guide', externalUrl: 'https://expressjs.com/en/guide/routing.html' },
    { lessonId: ID_OFFSET + 6, type: 'LINK' as const, label: 'MongoDB University', externalUrl: 'https://university.mongodb.com' },
    { lessonId: ID_OFFSET + 7, type: 'FILE' as const, label: 'API Endpoints Reference', filePath: FILES.PDF_QML },
    { lessonId: ID_OFFSET + 9, type: 'LINK' as const, label: 'React Official Docs', externalUrl: 'https://react.dev' },
    { lessonId: ID_OFFSET + 16, type: 'FILE' as const, label: 'Python Quick Reference', filePath: FILES.PDF_LEARNOVA2 },
    { lessonId: ID_OFFSET + 20, type: 'FILE' as const, label: 'Pandas Cookbook', filePath: FILES.DOCX_PRD },
    { lessonId: ID_OFFSET + 25, type: 'FILE' as const, label: 'UX Research Templates', filePath: FILES.PDF_LEARNOVA },
    { lessonId: ID_OFFSET + 26, type: 'LINK' as const, label: 'Figma Community', externalUrl: 'https://www.figma.com/community' },
    { lessonId: ID_OFFSET + 33, type: 'LINK' as const, label: 'AWS Free Tier', externalUrl: 'https://aws.amazon.com/free/' },
    { lessonId: ID_OFFSET + 38, type: 'LINK' as const, label: 'Next.js Documentation', externalUrl: 'https://nextjs.org/docs' },
    { lessonId: ID_OFFSET + 44, type: 'LINK' as const, label: 'System Design Primer', externalUrl: 'https://github.com/donnemartin/system-design-primer' },
    { lessonId: ID_OFFSET + 51, type: 'LINK' as const, label: 'TensorFlow Tutorials', externalUrl: 'https://www.tensorflow.org/tutorials' },
    { lessonId: ID_OFFSET + 58, type: 'LINK' as const, label: 'Docker Hub', externalUrl: 'https://hub.docker.com' },
    { lessonId: ID_OFFSET + 63, type: 'LINK' as const, label: 'Pro Git Book', externalUrl: 'https://git-scm.com/book/en/v2' },
  ];

  for (const [i, a] of attachmentDefs.entries()) {
    await prisma.attachment.upsert({
      where: { id: ID_OFFSET + i + 1 },
      update: {},
      create: { id: ID_OFFSET + i + 1, ...a },
    });
  }

  console.log('✓ 15 attachments seeded');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. QUIZZES + QUESTIONS + REWARDS (10 quizzes, ~40 questions)
  // ═══════════════════════════════════════════════════════════════════════════

  const quizDefs = [
    {
      courseId: courses[0].id, title: 'MERN Stack Fundamentals Quiz',
      reward: { a1: 20, a2: 14, a3: 8, a4: 2 },
      questions: [
        { text: 'What does MERN stand for?', options: ['MongoDB, Express, React, Node', 'MySQL, Express, React, Next', 'MongoDB, Ember, React, Node', 'MongoDB, Express, Redux, Node'], correct: [0] },
        { text: 'Which HTTP method is used to update a resource?', options: ['GET', 'POST', 'PUT', 'DELETE'], correct: [2] },
        { text: 'What is the purpose of middleware in Express?', options: ['Database queries', 'Request/response processing pipeline', 'Frontend rendering', 'CSS styling'], correct: [1] },
        { text: 'In React, what hook manages side effects?', options: ['useState', 'useEffect', 'useMemo', 'useRef'], correct: [1] },
      ],
    },
    {
      courseId: courses[1].id, title: 'Python Data Science Quiz',
      reward: { a1: 15, a2: 10, a3: 5, a4: 1 },
      questions: [
        { text: 'Which library is used for data manipulation in Python?', options: ['NumPy', 'Pandas', 'Matplotlib', 'Scikit-learn'], correct: [1] },
        { text: 'What does df.groupby() do in Pandas?', options: ['Sorts data', 'Groups data by column values', 'Filters null values', 'Merges dataframes'], correct: [1] },
        { text: 'Which plot type is best for showing distribution?', options: ['Line plot', 'Bar chart', 'Histogram', 'Pie chart'], correct: [2] },
        { text: 'What is a DataFrame?', options: ['A Python function', 'A 2D labeled data structure', 'A plotting tool', 'A machine learning model'], correct: [1] },
      ],
    },
    {
      courseId: courses[2].id, title: 'UI/UX Design Principles Quiz',
      reward: { a1: 15, a2: 10, a3: 5, a4: 1 },
      questions: [
        { text: 'What are the 5 stages of Design Thinking?', options: ['Plan, Build, Test, Deploy, Monitor', 'Empathize, Define, Ideate, Prototype, Test', 'Research, Design, Develop, Test, Launch', 'Discover, Define, Develop, Deliver, Iterate'], correct: [1] },
        { text: 'What is the minimum contrast ratio for normal text (WCAG AA)?', options: ['2:1', '3:1', '4.5:1', '7:1'], correct: [2] },
        { text: 'What is a design token?', options: ['Authentication key', 'Reusable design value', 'Component name', 'CSS framework'], correct: [1] },
      ],
    },
    {
      courseId: courses[3].id, title: 'Cloud Computing Basics Quiz',
      reward: { a1: 20, a2: 14, a3: 8, a4: 2 },
      questions: [
        { text: 'What is IaaS?', options: ['Infrastructure as a Service', 'Internet as a Service', 'Integration as a Service', 'Information as a Service'], correct: [0] },
        { text: 'Which AWS service provides serverless compute?', options: ['EC2', 'S3', 'Lambda', 'RDS'], correct: [2] },
        { text: 'What does CDN stand for?', options: ['Cloud Data Network', 'Content Delivery Network', 'Central DNS Node', 'Cloud Distribution Network'], correct: [1] },
        { text: 'Which storage class is cheapest for infrequent access?', options: ['S3 Standard', 'S3 Glacier', 'S3 Intelligent-Tiering', 'EBS'], correct: [1] },
      ],
    },
    {
      courseId: courses[4].id, title: 'Advanced React & Next.js Quiz',
      reward: { a1: 25, a2: 18, a3: 10, a4: 3 },
      questions: [
        { text: 'What directive marks a Server Component in Next.js?', options: ['use client', 'use server', 'No directive needed', 'export server'], correct: [2] },
        { text: 'What is streaming SSR?', options: ['Video streaming', 'Progressive HTML rendering with Suspense', 'Server-side CSS', 'WebSocket connections'], correct: [1] },
        { text: 'Which state manager uses atoms?', options: ['Redux', 'Zustand', 'Jotai', 'MobX'], correct: [2] },
        { text: 'What does ISR stand for?', options: ['Incremental Static Regeneration', 'Initial Server Render', 'Instant State Revalidation', 'Integrated Server Route'], correct: [0] },
      ],
    },
    {
      courseId: courses[5].id, title: 'System Design Concepts Quiz',
      reward: { a1: 25, a2: 18, a3: 10, a4: 3 },
      questions: [
        { text: 'What does CAP theorem state?', options: ['Choose 2 of 3: Consistency, Availability, Partition tolerance', 'All systems must be consistent', 'Cache Always Persists', 'Compute Available Permanently'], correct: [0] },
        { text: 'Which is a write-through caching strategy?', options: ['Write to cache only', 'Write to DB, then cache', 'Write to cache and DB simultaneously', 'Write to message queue'], correct: [2] },
        { text: 'What is database sharding?', options: ['Replication', 'Horizontal partitioning of data', 'Vertical scaling', 'Index optimization'], correct: [1] },
        { text: 'Which algorithm distributes load evenly?', options: ['FIFO', 'Round Robin', 'Stack-based', 'Depth-first'], correct: [1] },
      ],
    },
    {
      courseId: courses[6].id, title: 'Machine Learning Fundamentals Quiz',
      reward: { a1: 20, a2: 14, a3: 8, a4: 2 },
      questions: [
        { text: 'What activation function is commonly used in hidden layers?', options: ['Sigmoid', 'ReLU', 'Softmax', 'Linear'], correct: [1] },
        { text: 'What is the purpose of dropout?', options: ['Speed up training', 'Prevent overfitting', 'Increase accuracy', 'Reduce dataset size'], correct: [1] },
        { text: 'Which architecture is best for image classification?', options: ['RNN', 'CNN', 'Transformer', 'GAN'], correct: [1] },
        { text: 'What does BERT stand for?', options: ['Binary Encoded Representation Tokens', 'Bidirectional Encoder Representations from Transformers', 'Basic Entity Recognition Tool', 'Batch Encoded Recurrent Transformer'], correct: [1] },
      ],
    },
    {
      courseId: courses[7].id, title: 'DevOps Practices Quiz',
      reward: { a1: 20, a2: 14, a3: 8, a4: 2 },
      questions: [
        { text: 'What is a Docker image?', options: ['A running container', 'A read-only template for containers', 'A virtual machine', 'A network config'], correct: [1] },
        { text: 'What Kubernetes object manages stateless apps?', options: ['Pod', 'Deployment', 'StatefulSet', 'DaemonSet'], correct: [1] },
        { text: 'What does Terraform use for configuration?', options: ['YAML', 'JSON', 'HCL', 'XML'], correct: [2] },
        { text: 'What is GitOps?', options: ['Git hosting', 'Using Git as source of truth for infrastructure', 'GitHub API', 'Git branching strategy'], correct: [1] },
      ],
    },
    {
      courseId: courses[8].id, title: 'Git Mastery Quiz',
      reward: { a1: 15, a2: 10, a3: 5, a4: 1 },
      questions: [
        { text: 'What does git rebase do?', options: ['Deletes branches', 'Replays commits on top of another branch', 'Creates a new repository', 'Merges with a merge commit'], correct: [1] },
        { text: 'What is the staging area?', options: ['Remote server', 'Where changes are prepared for commit', 'Branch listing', 'Conflict zone'], correct: [1] },
        { text: 'What does git bisect help with?', options: ['Merging', 'Finding the commit that introduced a bug', 'Branch cleanup', 'Remote sync'], correct: [1] },
      ],
    },
    {
      courseId: courses[9].id, title: 'DSA & Competitive Programming Quiz',
      reward: { a1: 25, a2: 18, a3: 10, a4: 3 },
      questions: [
        { text: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correct: [1] },
        { text: 'Which data structure uses FIFO?', options: ['Stack', 'Queue', 'Priority Queue', 'Deque'], correct: [1] },
        { text: 'What technique solves the 0/1 Knapsack problem?', options: ['Greedy', 'Dynamic Programming', 'BFS', 'Binary Search'], correct: [1] },
        { text: 'What is the shortest path algorithm for weighted graphs?', options: ['BFS', 'DFS', 'Dijkstra', 'Topological Sort'], correct: [2] },
      ],
    },
  ];

  let questionId = ID_OFFSET + 1;
  const quizzes: { id: number; courseId: number }[] = [];
  for (const [qi, qd] of quizDefs.entries()) {
    const quiz = await prisma.quiz.upsert({
      where: { id: ID_OFFSET + qi + 1 },
      update: {},
      create: { id: ID_OFFSET + qi + 1, courseId: qd.courseId, title: qd.title },
    });
    quizzes.push(quiz);

    await prisma.quizReward.upsert({
      where: { quizId: quiz.id },
      update: {},
      create: { quizId: quiz.id, attempt1Points: qd.reward.a1, attempt2Points: qd.reward.a2, attempt3Points: qd.reward.a3, attempt4PlusPoints: qd.reward.a4 },
    });

    for (const [i, q] of qd.questions.entries()) {
      await prisma.question.upsert({
        where: { id: questionId },
        update: {},
        create: { id: questionId, quizId: quiz.id, text: q.text, options: q.options, correctOptions: q.correct, order: i + 1 },
      });
      questionId++;
    }
  }

  console.log(`✓ ${quizzes.length} quizzes with ${questionId - 1} questions seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ENROLLMENTS + LESSON PROGRESS (~150 enrollments)
  // ═══════════════════════════════════════════════════════════════════════════

  let enrollmentId = ID_OFFSET + 1;

  async function enroll(
    userId: number,
    courseId: number,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
    completedLessonCount: number,
  ) {
    const daysAgo = Math.floor(Math.random() * 60) + 5;
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status },
      create: {
        id: enrollmentId,
        userId,
        courseId,
        status,
        enrolledAt: new Date(Date.now() - daysAgo * 86400000),
        startedAt: status !== 'NOT_STARTED' ? new Date(Date.now() - (daysAgo - 2) * 86400000) : null,
        completedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000) : null,
        timeSpent: status === 'COMPLETED' ? Math.floor(Math.random() * 7200) + 3600 : Math.floor(Math.random() * 3600),
      },
    });
    enrollmentId++;

    const courseLessons = allLessons.filter(l => l.courseId === courseId);
    const toComplete = courseLessons.slice(0, Math.min(completedLessonCount, courseLessons.length));

    for (const lesson of toComplete) {
      await prisma.lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
        update: { isCompleted: true },
        create: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          userId,
          isCompleted: true,
          completedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
        },
      });
    }

    return enrollment;
  }

  const publishedCourseIds = courses.slice(0, 10).map(c => c.id);

  // Top learners (0-4): completed most courses
  for (let li = 0; li < 5; li++) {
    for (const cid of publishedCourseIds) {
      const cl = allLessons.filter(l => l.courseId === cid);
      if (li < 2) {
        await enroll(learners[li].id, cid, 'COMPLETED', cl.length);
      } else if (li < 4) {
        const idx = publishedCourseIds.indexOf(cid);
        if (idx < 7) await enroll(learners[li].id, cid, 'COMPLETED', cl.length);
        else await enroll(learners[li].id, cid, 'IN_PROGRESS', Math.floor(cl.length / 2));
      } else {
        const idx = publishedCourseIds.indexOf(cid);
        if (idx < 5) await enroll(learners[li].id, cid, 'COMPLETED', cl.length);
        else if (idx < 8) await enroll(learners[li].id, cid, 'IN_PROGRESS', Math.floor(cl.length / 3));
        else await enroll(learners[li].id, cid, 'NOT_STARTED', 0);
      }
    }
  }

  // Mid learners (5-14): 4-6 courses each
  for (let li = 5; li < 15; li++) {
    const numCourses = 4 + (li % 3);
    const selected = publishedCourseIds.slice(0, numCourses);
    for (const [ci, cid] of selected.entries()) {
      const cl = allLessons.filter(l => l.courseId === cid);
      if (ci < 2) await enroll(learners[li].id, cid, 'COMPLETED', cl.length);
      else if (ci < numCourses - 1) await enroll(learners[li].id, cid, 'IN_PROGRESS', Math.floor(cl.length * 0.6));
      else await enroll(learners[li].id, cid, 'NOT_STARTED', 0);
    }
  }

  // New learners (15-24): 1-3 courses each
  for (let li = 15; li < 25; li++) {
    const numCourses = 1 + (li % 3);
    const startCourse = li % publishedCourseIds.length;
    for (let ci = 0; ci < numCourses; ci++) {
      const cid = publishedCourseIds[(startCourse + ci) % publishedCourseIds.length];
      const cl = allLessons.filter(l => l.courseId === cid);
      if (ci === 0 && li < 20) await enroll(learners[li].id, cid, 'IN_PROGRESS', Math.floor(cl.length * 0.4));
      else await enroll(learners[li].id, cid, 'NOT_STARTED', 0);
    }
  }

  console.log(`✓ ${enrollmentId - 1} enrollments seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. QUIZ ATTEMPTS (~50 attempts)
  // ═══════════════════════════════════════════════════════════════════════════

  let attemptId = ID_OFFSET + 1;

  async function createAttempt(userId: number, quizId: number, attemptNum: number, scorePercent: number, pointsEarned: number) {
    const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: 'asc' } });
    const answers: Record<string, number[]> = {};
    for (const q of questions) {
      if (Math.random() * 100 < scorePercent) answers[q.id.toString()] = q.correctOptions;
      else answers[q.id.toString()] = [(q.correctOptions[0] + 1) % q.options.length];
    }

    await prisma.quizAttempt.upsert({
      where: { id: attemptId },
      update: {},
      create: {
        id: attemptId, userId, quizId, attemptNumber: attemptNum, answers, pointsEarned, scorePercent,
        scorePct: scorePercent / 100,
        completedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
      },
    });
    attemptId++;
  }

  // Top learners: high scores
  for (let li = 0; li < 5; li++) {
    for (const [qi, quiz] of quizzes.entries()) {
      if (qi < 8) {
        const score = li < 2 ? 100 : 75 + Math.floor(Math.random() * 25);
        const points = li < 2 ? quizDefs[qi].reward.a1 : quizDefs[qi].reward.a2;
        await createAttempt(learners[li].id, quiz.id, 1, score, points);
      }
    }
  }

  // Mid learners: some quiz attempts
  for (let li = 5; li < 15; li++) {
    const numAttempts = 2 + (li % 3);
    for (let qi = 0; qi < numAttempts; qi++) {
      const score = 50 + Math.floor(Math.random() * 50);
      await createAttempt(learners[li].id, quizzes[qi].id, 1, score, quizDefs[qi].reward.a2);
    }
  }

  console.log(`✓ ${attemptId - 1} quiz attempts seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. REVIEWS (~40 reviews)
  // ═══════════════════════════════════════════════════════════════════════════

  const reviewTexts = [
    { rating: 5, text: 'Exceptional course! The instructor explains complex topics in a very digestible way. Highly recommend for anyone starting out.' },
    { rating: 5, text: 'Best course I have taken on this platform. The projects are practical and the content is up to date.' },
    { rating: 4, text: 'Very well structured and easy to follow. Could use a few more practice exercises, but overall excellent.' },
    { rating: 4, text: 'Great content and pacing. The quizzes really help reinforce the concepts learned in each module.' },
    { rating: 5, text: 'The instructor is clearly an expert. Every topic is covered thoroughly with real-world examples.' },
    { rating: 3, text: 'Good course but some sections feel a bit rushed. Would appreciate more depth in the advanced topics.' },
    { rating: 4, text: 'Solid course. I learned a lot and the assignments were challenging but doable.' },
    { rating: 5, text: 'This course changed my career trajectory. I got my first developer job after completing this.' },
    { rating: 4, text: 'Well-produced videos and clear audio. The supplementary materials are very helpful.' },
    { rating: 3, text: 'Decent course but the difficulty ramp-up is a bit steep in the middle sections.' },
    { rating: 5, text: 'Pure gold. Every rupee spent was worth it. The instructor responds to doubts quickly.' },
    { rating: 4, text: 'Comprehensive coverage of the subject. The hands-on projects make all the difference.' },
  ];

  let reviewIdx = 0;
  for (let li = 0; li < 12; li++) {
    const numReviews = li < 5 ? 4 : 2;
    for (let ri = 0; ri < numReviews; ri++) {
      const cid = publishedCourseIds[(li + ri) % publishedCourseIds.length];
      const rv = reviewTexts[reviewIdx % reviewTexts.length];
      try {
        await prisma.review.upsert({
          where: { userId_courseId: { userId: learners[li].id, courseId: cid } },
          update: { rating: rv.rating, reviewText: rv.text },
          create: { userId: learners[li].id, courseId: cid, rating: rv.rating, reviewText: rv.text },
        });
        reviewIdx++;
      } catch { /* skip if constraint fails */ }
    }
  }

  console.log(`✓ ${reviewIdx} reviews seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. CERTIFICATES (~30)
  // ═══════════════════════════════════════════════════════════════════════════

  let certCount = 0;
  for (let li = 0; li < 5; li++) {
    for (const [ci, cd] of courseDefs.entries()) {
      if (cd.certTemplate && ci < 10) {
        try {
          await prisma.certificate.upsert({
            where: { userId_courseId: { userId: learners[li].id, courseId: courses[ci].id } },
            update: {},
            create: {
              userId: learners[li].id, courseId: courses[ci].id,
              templateKey: cd.certTemplate,
              scorePercent: 75 + Math.floor(Math.random() * 25),
              pointsEarned: 15 + Math.floor(Math.random() * 15),
            },
          });
          certCount++;
        } catch { /* skip */ }
      }
    }
  }

  for (let li = 5; li < 10; li++) {
    const cid = courses[li % 4].id;
    const template = courseDefs[li % 4].certTemplate;
    if (template) {
      try {
        await prisma.certificate.upsert({
          where: { userId_courseId: { userId: learners[li].id, courseId: cid } },
          update: {},
          create: {
            userId: learners[li].id, courseId: cid,
            templateKey: template,
            scorePercent: 70 + Math.floor(Math.random() * 20),
            pointsEarned: 10 + Math.floor(Math.random() * 10),
          },
        });
        certCount++;
      } catch { /* skip */ }
    }
  }

  console.log(`✓ ${certCount} certificates seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. BADGES
  // ═══════════════════════════════════════════════════════════════════════════

  const badgeEntries: { userId: number; badgeKey: string; category: string }[] = [];

  // Top 2: all badges
  for (let li = 0; li < 2; li++) {
    badgeEntries.push(
      { userId: learners[li].id, badgeKey: 'tier:newbie', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:explorer', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:achiever', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:specialist', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:expert', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:master', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'achievement:first-step', category: 'COURSE_MILESTONE' },
      { userId: learners[li].id, badgeKey: 'achievement:on-fire', category: 'COURSE_MILESTONE' },
      { userId: learners[li].id, badgeKey: 'achievement:scholar', category: 'COURSE_MILESTONE' },
      { userId: learners[li].id, badgeKey: 'achievement:quiz-master', category: 'QUIZ_EXCELLENCE' },
      { userId: learners[li].id, badgeKey: 'achievement:perfect-run', category: 'QUIZ_EXCELLENCE' },
      { userId: learners[li].id, badgeKey: 'achievement:certified', category: 'CERTIFICATION' },
      { userId: learners[li].id, badgeKey: 'achievement:multi-cert', category: 'CERTIFICATION' },
      { userId: learners[li].id, badgeKey: 'achievement:dedicated', category: 'DEDICATION' },
      { userId: learners[li].id, badgeKey: 'achievement:reviewer', category: 'DEDICATION' },
    );
  }

  // Learners 2-4: moderate badges
  for (let li = 2; li < 5; li++) {
    badgeEntries.push(
      { userId: learners[li].id, badgeKey: 'tier:newbie', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:explorer', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:achiever', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:specialist', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'achievement:first-step', category: 'COURSE_MILESTONE' },
      { userId: learners[li].id, badgeKey: 'achievement:on-fire', category: 'COURSE_MILESTONE' },
      { userId: learners[li].id, badgeKey: 'achievement:quiz-master', category: 'QUIZ_EXCELLENCE' },
      { userId: learners[li].id, badgeKey: 'achievement:certified', category: 'CERTIFICATION' },
    );
  }

  // Learners 5-9: a few badges
  for (let li = 5; li < 10; li++) {
    badgeEntries.push(
      { userId: learners[li].id, badgeKey: 'tier:newbie', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'tier:explorer', category: 'TIER' },
      { userId: learners[li].id, badgeKey: 'achievement:first-step', category: 'COURSE_MILESTONE' },
    );
  }

  // Learners 10-14: just tier:newbie
  for (let li = 10; li < 15; li++) {
    badgeEntries.push(
      { userId: learners[li].id, badgeKey: 'tier:newbie', category: 'TIER' },
    );
  }

  for (const b of badgeEntries) {
    await prisma.userBadge.upsert({
      where: { userId_badgeKey: { userId: b.userId, badgeKey: b.badgeKey } },
      update: {},
      create: { userId: b.userId, badgeKey: b.badgeKey, category: b.category as any },
    });
  }

  console.log(`✓ ${badgeEntries.length} badges seeded`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. COUPONS (6)
  // ═══════════════════════════════════════════════════════════════════════════

  const couponDefs = [
    { code: 'WELCOME50', courseId: null, discountAmount: 50, expiresAt: new Date('2026-12-31'), usageLimit: 100, usedCount: 12 },
    { code: 'REACT30', courseId: courses[4].id, discountAmount: 30, expiresAt: new Date('2026-06-30'), usageLimit: 50, usedCount: 8 },
    { code: 'SYSDESIGN20', courseId: courses[5].id, discountAmount: 20, expiresAt: new Date('2026-09-30'), usageLimit: null, usedCount: 15 },
    { code: 'ML500OFF', courseId: courses[6].id, discountAmount: 500, expiresAt: new Date('2026-08-15'), usageLimit: 25, usedCount: 3 },
    { code: 'DEVOPS40', courseId: courses[7].id, discountAmount: 40, expiresAt: new Date('2026-07-31'), usageLimit: 30, usedCount: 5 },
    { code: 'EARLYBIRD', courseId: null, discountAmount: 100, expiresAt: new Date('2026-04-30'), usageLimit: 200, usedCount: 45 },
  ];

  for (const c of couponDefs) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { usedCount: c.usedCount },
      create: {
        code: c.code, courseId: c.courseId, discountAmount: c.discountAmount,
        expiresAt: c.expiresAt, isActive: true, usageLimit: c.usageLimit,
        usedCount: c.usedCount, createdBy: adminUsers[0].id,
      },
    });
  }

  console.log('✓ 6 coupons seeded');

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🌱 Seed complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  All accounts use password: Test@1234');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nAdmin accounts:');
  console.log('  ridhampatel2k4@gmail.com       (ADMIN)');
  console.log('  harsh888dodiya@gmail.com       (ADMIN)');
  console.log('  kandarp.gajjar.460@gmail.com   (ADMIN)');
  console.log('  learnova.admin@yopmail.com     (ADMIN)');
  console.log('\nInstructor accounts:');
  for (const i of instructorData) console.log(`  ${i.email.padEnd(38)} (INSTRUCTOR)`);
  console.log('\nLearner accounts (25):');
  for (const l of learnerData.slice(0, 5)) console.log(`  ${l.email.padEnd(38)} ${l.points} pts (${l.badge})`);
  console.log('  ... and 20 more learners');
  console.log('\nCoupon codes: WELCOME50, REACT30, SYSDESIGN20, ML500OFF, DEVOPS40, EARLYBIRD');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().finally(() => prisma.$disconnect());
