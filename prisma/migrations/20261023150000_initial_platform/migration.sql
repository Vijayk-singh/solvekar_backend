CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'multiple_choice', 'numerical');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired');

CREATE TABLE "users" ("id" UUID NOT NULL, "fullName" VARCHAR(100) NOT NULL, "email" VARCHAR(254) NOT NULL, "password_hash" VARCHAR(255) NOT NULL, "role" "UserRole" NOT NULL, "status" "UserStatus" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3), CONSTRAINT "users_pkey" PRIMARY KEY ("id"));
CREATE TABLE "plans" ("id" UUID NOT NULL, "title" VARCHAR(160) NOT NULL, "description" TEXT, "price" DECIMAL(10,2) NOT NULL DEFAULT 0, "currency" VARCHAR(3) NOT NULL DEFAULT 'INR', "is_free" BOOLEAN NOT NULL DEFAULT false, "status" "ContentStatus" NOT NULL DEFAULT 'draft', "created_by_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "plans_pkey" PRIMARY KEY ("id"));
CREATE TABLE "tests" ("id" UUID NOT NULL, "title" VARCHAR(160) NOT NULL, "description" TEXT, "duration_minutes" INTEGER NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'draft', "created_by_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "tests_pkey" PRIMARY KEY ("id"));
CREATE TABLE "test_sections" ("id" UUID NOT NULL, "test_id" UUID NOT NULL, "title" VARCHAR(160) NOT NULL, "sort_order" INTEGER NOT NULL, CONSTRAINT "test_sections_pkey" PRIMARY KEY ("id"));
CREATE TABLE "questions" ("id" UUID NOT NULL, "type" "QuestionType" NOT NULL, "stem" TEXT NOT NULL, "options" JSONB, "correct_answer" JSONB NOT NULL, "explanation" TEXT, "subject" VARCHAR(120), "topic" VARCHAR(120), "status" "ContentStatus" NOT NULL DEFAULT 'draft', "created_by_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "questions_pkey" PRIMARY KEY ("id"));
CREATE TABLE "test_questions" ("id" UUID NOT NULL, "section_id" UUID NOT NULL, "question_id" UUID NOT NULL, "sort_order" INTEGER NOT NULL, "marks" DECIMAL(6,2) NOT NULL DEFAULT 1, "negative_marks" DECIMAL(6,2) NOT NULL DEFAULT 0, CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id"));
CREATE TABLE "plan_tests" ("plan_id" UUID NOT NULL, "test_id" UUID NOT NULL, "sort_order" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "plan_tests_pkey" PRIMARY KEY ("plan_id","test_id"));
CREATE TABLE "subscriptions" ("id" UUID NOT NULL, "user_id" UUID NOT NULL, "plan_id" UUID NOT NULL, "status" "SubscriptionStatus" NOT NULL DEFAULT 'active', "source" VARCHAR(30) NOT NULL DEFAULT 'demo', "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expires_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"));
CREATE TABLE "audit_logs" ("id" UUID NOT NULL, "actor_id" UUID, "action" VARCHAR(100) NOT NULL, "target_type" VARCHAR(80) NOT NULL, "target_id" UUID, "metadata" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "users_email_key" ON "users"("email"); CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX "plans_status_idx" ON "plans"("status"); CREATE INDEX "plans_created_by_id_idx" ON "plans"("created_by_id");
CREATE INDEX "tests_status_idx" ON "tests"("status"); CREATE INDEX "tests_created_by_id_idx" ON "tests"("created_by_id");
CREATE UNIQUE INDEX "test_sections_test_id_sort_order_key" ON "test_sections"("test_id", "sort_order");
CREATE INDEX "questions_created_by_id_idx" ON "questions"("created_by_id"); CREATE INDEX "questions_subject_topic_idx" ON "questions"("subject", "topic");
CREATE UNIQUE INDEX "test_questions_section_id_question_id_key" ON "test_questions"("section_id", "question_id"); CREATE UNIQUE INDEX "test_questions_section_id_sort_order_key" ON "test_questions"("section_id", "sort_order");
CREATE UNIQUE INDEX "plan_tests_plan_id_sort_order_key" ON "plan_tests"("plan_id", "sort_order");
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status"); CREATE UNIQUE INDEX "subscriptions_user_id_plan_id_key" ON "subscriptions"("user_id", "plan_id");
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at"); CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tests" ADD CONSTRAINT "tests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "test_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plan_tests" ADD CONSTRAINT "plan_tests_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_tests" ADD CONSTRAINT "plan_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
