import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo accounts...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kiyovn.com' },
    update: { password: passwordHash, role: Role.ADMIN },
    create: {
      email: 'admin@kiyovn.com',
      password: passwordHash,
      role: Role.ADMIN,
      profile: {
        create: { name: 'Quản Trị Viên Kiyo' },
      },
    },
  });

  // 2. Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@kiyovn.com' },
    update: { password: passwordHash, role: Role.TEACHER },
    create: {
      email: 'teacher@kiyovn.com',
      password: passwordHash,
      role: Role.TEACHER,
      profile: {
        create: { name: 'Thầy Nguyễn Văn Giáo' },
      },
    },
  });

  // 3. Student
  const student = await prisma.user.upsert({
    where: { email: 'student@kiyovn.com' },
    update: { password: passwordHash, role: Role.STUDENT },
    create: {
      email: 'student@kiyovn.com',
      password: passwordHash,
      role: Role.STUDENT,
      profile: {
        create: { name: 'Em Nguyễn Văn Học' },
      },
    },
  });

  // 4. Sample Class
  let sampleClass = await prisma.class.findFirst({ where: { teacherId: teacher.id } });
  if (!sampleClass) {
    sampleClass = await prisma.class.create({
      data: {
        name: 'Lớp Toán 12A1',
        code: '123456',
        teacherId: teacher.id,
        members: {
          create: {
            studentId: student.id,
          },
        },
      },
    });
  }

  // 5. Sample Question Bank & Questions
  let bank = await prisma.questionBank.findFirst({ where: { teacherId: teacher.id } });
  if (!bank) {
    bank = await prisma.questionBank.create({
      data: {
        name: 'Toán Học & Kiến Thức Chung',
        description: 'Ngân hàng câu hỏi trắc nghiệm ôn tập',
        teacherId: teacher.id,
      },
    });

    const sampleQuestions = [
      {
        content: 'Một năm có bao nhiêu quý?',
        difficulty: 'EASY',
        points: 1,
        timeLimit: 20,
        explanation: 'Một năm có 4 quý, mỗi quý 3 tháng.',
        options: [
          { content: '4 quý', isCorrect: true },
          { content: '12 quý', isCorrect: false },
          { content: '6 quý', isCorrect: false },
          { content: '2 quý', isCorrect: false },
        ],
      },
      {
        content: 'Thủ đô của Việt Nam là thành phố nào?',
        difficulty: 'EASY',
        points: 1,
        timeLimit: 15,
        explanation: 'Hà Nội là thủ đô của Việt Nam.',
        options: [
          { content: 'Hà Nội', isCorrect: true },
          { content: 'TP. Hồ Chí Minh', isCorrect: false },
          { content: 'Đà Nẵng', isCorrect: false },
          { content: 'Cần Thơ', isCorrect: false },
        ],
      },
      {
        content: 'Kết quả của phép tính 25 x 4 là bao nhiêu?',
        difficulty: 'EASY',
        points: 1,
        timeLimit: 15,
        explanation: '25 x 4 = 100.',
        options: [
          { content: '100', isCorrect: true },
          { content: '90', isCorrect: false },
          { content: '125', isCorrect: false },
          { content: '75', isCorrect: false },
        ],
      },
      {
        content: 'Nguyên tố hóa học có ký hiệu H là gì?',
        difficulty: 'EASY',
        points: 1,
        timeLimit: 15,
        explanation: 'H là ký hiệu của Hydro.',
        options: [
          { content: 'Hydro (Hydrogen)', isCorrect: true },
          { content: 'Heli (Helium)', isCorrect: false },
          { content: 'Sắt (Ferrum)', isCorrect: false },
          { content: 'Vàng (Aurum)', isCorrect: false },
        ],
      },
      {
        content: 'Tác phẩm "Truyện Kiều" là của đại thi hào nào?',
        difficulty: 'MEDIUM',
        points: 1,
        timeLimit: 20,
        explanation: 'Nguyễn Du là tác giả của Đoạn trường tân thanh (Truyện Kiều).',
        options: [
          { content: 'Nguyễn Du', isCorrect: true },
          { content: 'Nguyễn Trãi', isCorrect: false },
          { content: 'Hồ Xuân Hương', isCorrect: false },
          { content: 'Nguyễn Đình Chiểu', isCorrect: false },
        ],
      },
    ];

    for (const q of sampleQuestions) {
      await prisma.question.create({
        data: {
          questionBankId: bank.id,
          content: q.content,
          type: 'MULTIPLE_CHOICE',
          difficulty: q.difficulty,
          points: q.points,
          timeLimit: q.timeLimit,
          explanation: q.explanation,
          options: {
            create: q.options,
          },
        },
      });
    }
  }

  // 6. Sample Quiz
  let quiz = await prisma.quiz.findFirst({ where: { teacherId: teacher.id } });
  if (!quiz) {
    const questions = await prisma.question.findMany({ where: { questionBankId: bank?.id } });
    quiz = await prisma.quiz.create({
      data: {
        title: 'Đề Thi Thử Nghiệm Chaos Quiz',
        description: 'Đề thi trắc nghiệm tổng hợp kiến thức',
        teacherId: teacher.id,
        classId: sampleClass.id,
        timeLimit: 15,
        questions: {
          create: questions.map((q, idx) => ({
            questionId: q.id,
            orderIndex: idx,
          })),
        },
      },
    });
  }

  console.log('Seeding completed successfully!');
  console.log('Demo Accounts (Password for all: 123456):');
  console.log('- Admin: admin@kiyovn.com');
  console.log('- Teacher: teacher@kiyovn.com');
  console.log('- Student: student@kiyovn.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
