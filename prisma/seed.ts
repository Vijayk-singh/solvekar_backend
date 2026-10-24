import { PrismaClient, UserRole, UserStatus, ContentStatus, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing test data...');
  // Delete in reverse dependency order
  await prisma.testQuestion.deleteMany();
  await prisma.testSection.deleteMany();
  await prisma.planTest.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding dummy users...');
  const defaultPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.create({
    data: {
      fullName: 'System Administrator',
      email: 'admin@solvekar.com',
      passwordHash,
      role: UserRole.admin,
      status: UserStatus.active,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      fullName: 'Prof. Ramesh Verma',
      email: 'teacher@solvekar.com',
      passwordHash,
      role: UserRole.teacher,
      status: UserStatus.active,
    },
  });

  const student = await prisma.user.create({
    data: {
      fullName: 'Aarav Patel',
      email: 'student@solvekar.com',
      passwordHash,
      role: UserRole.student,
      status: UserStatus.active,
    },
  });

  console.log(`Created users:
  - Admin:   ${admin.email}
  - Teacher: ${teacher.email}
  - Student: ${student.email}`);

  console.log('Seeding dummy plan...');
  const plan = await prisma.plan.create({
    data: {
      title: 'JEE Main 2026 Comprehensive Test Series',
      description: 'Complete physics, chemistry, and mathematics full mock tests for JEE aspirants.',
      price: 999.0,
      currency: 'INR',
      isFree: false,
      status: ContentStatus.published,
      createdById: teacher.id,
    },
  });

  console.log(`Created plan: "${plan.title}" (ID: ${plan.id})`);

  console.log('Seeding dummy test...');
  const test = await prisma.test.create({
    data: {
      title: 'Physics - Kinematics & Laws of Motion',
      description: 'Practice test covering 1D/2D motion and Newton laws.',
      durationMinutes: 60,
      status: ContentStatus.published,
      createdById: teacher.id,
    },
  });

  console.log(`Created test: "${test.title}" (ID: ${test.id})`);

  // Link test to plan
  await prisma.planTest.create({
    data: {
      planId: plan.id,
      testId: test.id,
      sortOrder: 1,
    },
  });

  console.log('Seeding test section...');
  const section = await prisma.testSection.create({
    data: {
      testId: test.id,
      title: 'Section A - Mechanics',
      sortOrder: 1,
    },
  });

  console.log('Seeding dummy questions...');
  const question1 = await prisma.question.create({
    data: {
      type: QuestionType.single_choice,
      stem: 'What is the SI unit of force?',
      options: [
        { id: '1', text: 'Newton' },
        { id: '2', text: 'Joule' },
        { id: '3', text: 'Pascal' },
        { id: '4', text: 'Watt' },
      ],
      correctAnswer: { answer: '1' },
      explanation: 'Force is measured in Newtons (N), which equals kg·m/s².',
      subject: 'Physics',
      topic: 'Mechanics',
      status: ContentStatus.published,
      createdById: teacher.id,
    },
  });

  const question2 = await prisma.question.create({
    data: {
      type: QuestionType.numerical,
      stem: 'A car accelerates uniformly from rest to 20 m/s in 5 seconds. What is its acceleration in m/s²?',
      correctAnswer: { value: 4 },
      explanation: 'Acceleration a = (v - u) / t = (20 - 0) / 5 = 4 m/s².',
      subject: 'Physics',
      topic: 'Kinematics',
      status: ContentStatus.published,
      createdById: teacher.id,
    },
  });

  // Link questions to section
  await prisma.testQuestion.createMany({
    data: [
      {
        sectionId: section.id,
        questionId: question1.id,
        sortOrder: 1,
        marks: 4,
        negativeMarks: 1,
      },
      {
        sectionId: section.id,
        questionId: question2.id,
        sortOrder: 2,
        marks: 4,
        negativeMarks: 0,
      },
    ],
  });

  console.log('Seeding initial audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: 'system.initial_seed',
        targetType: 'system',
        metadata: { environment: 'development' },
      },
      {
        actorId: admin.id,
        action: 'user.created',
        targetType: 'user',
        targetId: teacher.id,
        metadata: { email: teacher.email, role: 'teacher' },
      },
      {
        actorId: teacher.id,
        action: 'plan.created',
        targetType: 'plan',
        targetId: plan.id,
        metadata: { title: plan.title, price: 999 },
      },
      {
        actorId: teacher.id,
        action: 'test.created',
        targetType: 'test',
        targetId: test.id,
        metadata: { title: test.title, durationMinutes: 60 },
      },
      {
        actorId: teacher.id,
        action: 'question.created',
        targetType: 'question',
        targetId: question1.id,
        metadata: { subject: 'Physics', type: 'single_choice' },
      },
      {
        actorId: teacher.id,
        action: 'question.created',
        targetType: 'question',
        targetId: question2.id,
        metadata: { subject: 'Physics', type: 'numerical' },
      },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
