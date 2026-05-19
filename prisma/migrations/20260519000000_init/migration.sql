-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "CommentTarget" AS ENUM ('PROBLEM', 'PLAN');

-- CreateTable
CREATE TABLE "sales_staff" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "department" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report" (
    "id" SERIAL NOT NULL,
    "sales_staff_id" INTEGER NOT NULL,
    "report_date" DATE NOT NULL,
    "problem" TEXT,
    "plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_record" (
    "id" SERIAL NOT NULL,
    "daily_report_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "visit_content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" SERIAL NOT NULL,
    "daily_report_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "target_type" "CommentTarget" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_staff_email_key" ON "sales_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "daily_report_sales_staff_id_report_date_key" ON "daily_report"("sales_staff_id", "report_date");

-- AddForeignKey
ALTER TABLE "daily_report" ADD CONSTRAINT "daily_report_sales_staff_id_fkey" FOREIGN KEY ("sales_staff_id") REFERENCES "sales_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_record" ADD CONSTRAINT "visit_record_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_record" ADD CONSTRAINT "visit_record_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "sales_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
