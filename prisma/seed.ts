import "dotenv/config"
import { PrismaClient, Role, CommentTarget } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // ── Clear existing data (reverse FK order) ────────────────────
  await prisma.comment.deleteMany()
  await prisma.visitRecord.deleteMany()
  await prisma.dailyReport.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.salesStaff.deleteMany()

  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  // ── Staff accounts ───────────────────────────────────────────
  const [staff1, staff2, supervisor] = await Promise.all([
    prisma.salesStaff.create({
      data: {
        name: "홍길동",
        email: "staff1@test.com",
        password: hash("password123"),
        role: Role.STAFF,
        department: "영업1팀",
      },
    }),
    prisma.salesStaff.create({
      data: {
        name: "김영수",
        email: "staff2@test.com",
        password: hash("password123"),
        role: Role.STAFF,
        department: "영업2팀",
      },
    }),
    prisma.salesStaff.create({
      data: {
        name: "이상급",
        email: "super@test.com",
        password: hash("password123"),
        role: Role.SUPERVISOR,
        department: "영업본부",
      },
    }),
  ])

  // ── Customer master ───────────────────────────────────────────
  const [custA, custB, custC, custD, custE] = await Promise.all([
    prisma.customer.create({
      data: {
        companyName: "A주식회사",
        contactName: "김철수",
        phone: "02-1234-5678",
        address: "서울시 강남구",
      },
    }),
    prisma.customer.create({
      data: {
        companyName: "B주식회사",
        contactName: "박영희",
        phone: "031-000-1111",
        address: "경기도 성남시",
      },
    }),
    prisma.customer.create({
      data: {
        companyName: "C주식회사",
        contactName: "최담당",
        phone: "02-9876-5432",
        address: "서울시 서초구",
      },
    }),
    prisma.customer.create({
      data: {
        companyName: "D주식회사",
        contactName: "이담당",
        phone: "032-555-6666",
        address: "인천시 남동구",
      },
    }),
    prisma.customer.create({
      data: {
        companyName: "E주식회사",
        contactName: "정담당",
        phone: "051-777-8888",
        address: "부산시 해운대구",
      },
    }),
  ])

  // ── staff1 daily reports (3건) ────────────────────────────────
  const report1 = await prisma.dailyReport.create({
    data: {
      salesStaffId: staff1.id,
      reportDate: new Date("2026-05-19"),
      problem: "A사 계약 조건 협의가 법무 검토 단계에서 지연되고 있음",
      plan: "B사 담당자에게 견적서 재발송 및 납기 재협의",
      visitRecords: {
        create: [
          {
            customerId: custA.id,
            visitContent: "신규 제품 제안 미팅 — 담당자 긍정적 반응, 견적서 요청",
          },
          {
            customerId: custB.id,
            visitContent: "계약서 최종 검토 및 서명 완료",
          },
        ],
      },
    },
  })

  const report2 = await prisma.dailyReport.create({
    data: {
      salesStaffId: staff1.id,
      reportDate: new Date("2026-05-16"),
      problem: "C사 예산 편성 지연으로 계약 일정 조정 필요",
      plan: "D사에 제품 데모 일정 잡기",
      visitRecords: {
        create: [
          {
            customerId: custC.id,
            visitContent: "분기 결산 미팅 — 하반기 구매 예산 확인",
          },
        ],
      },
    },
  })

  await prisma.dailyReport.create({
    data: {
      salesStaffId: staff1.id,
      reportDate: new Date("2026-05-15"),
      problem: null,
      plan: "D사 데모 후속 견적서 작성",
      visitRecords: {
        create: [
          {
            customerId: custD.id,
            visitContent: "제품 데모 발표 — Q&A 진행, 후속 견적서 요청",
          },
          {
            customerId: custE.id,
            visitContent: "신규 거래처 초도 미팅 — 회사 소개 및 제품 카탈로그 전달",
          },
        ],
      },
    },
  })

  // ── staff2 daily reports (3건) ────────────────────────────────
  await prisma.dailyReport.create({
    data: {
      salesStaffId: staff2.id,
      reportDate: new Date("2026-05-19"),
      problem: "B사 2차 납품 일정 관련 물류 일정 조율 필요",
      plan: "E사 신규 제안서 작성",
      visitRecords: {
        create: [
          {
            customerId: custB.id,
            visitContent: "2차 납품 일정 확인 미팅",
          },
          {
            customerId: custC.id,
            visitContent: "추가 주문 건 협의",
          },
        ],
      },
    },
  })

  await prisma.dailyReport.create({
    data: {
      salesStaffId: staff2.id,
      reportDate: new Date("2026-05-16"),
      problem: null,
      plan: "A사 하반기 계약 갱신 준비",
      visitRecords: {
        create: [
          {
            customerId: custA.id,
            visitContent: "하반기 계약 갱신 사전 미팅",
          },
        ],
      },
    },
  })

  await prisma.dailyReport.create({
    data: {
      salesStaffId: staff2.id,
      reportDate: new Date("2026-05-15"),
      problem: "D사 계약 조건 중 결제 조건 이견",
      plan: "D사 결제 조건 조율을 위한 내부 협의 요청",
      visitRecords: {
        create: [
          {
            customerId: custD.id,
            visitContent: "계약 조건 협의 — 결제 조건 이견으로 추가 논의 필요",
          },
          {
            customerId: custE.id,
            visitContent: "신규 제품 라인업 소개 미팅",
          },
        ],
      },
    },
  })

  // ── Supervisor comments ────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        dailyReportId: report1.id,
        authorId: supervisor.id,
        targetType: CommentTarget.PROBLEM,
        content:
          "법무팀에 검토 요청해 보세요. 계약서 초안도 함께 전달하면 좋겠습니다.",
      },
      {
        dailyReportId: report1.id,
        authorId: supervisor.id,
        targetType: CommentTarget.PLAN,
        content: "오늘 중으로 연락해 보세요. 필요하면 제가 동행하겠습니다.",
      },
      {
        dailyReportId: report2.id,
        authorId: supervisor.id,
        targetType: CommentTarget.PROBLEM,
        content: "C사 구매팀장에게 직접 연락해 보는 것도 방법입니다.",
      },
    ],
  })

  console.log("Seed completed:")
  console.log(
    `  Staff   : ${staff1.name} (${staff1.email}), ${staff2.name} (${staff2.email}), ${supervisor.name} (${supervisor.email})`
  )
  console.log(
    `  Customers: ${[custA, custB, custC, custD, custE].map((c) => c.companyName).join(", ")}`
  )
  console.log("  Reports : staff1×3, staff2×3")
  console.log("  Comments: 3건 (supervisor)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
