import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_blog_topics_status" AS ENUM('queued', 'generating', 'ready', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_workflow_slug" AS ENUM('generate-blog-post');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline');
  CREATE TABLE "blog_topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"extra_instructions" varchar,
  	"target_publish_date" timestamp(3) with time zone,
  	"status" "enum_blog_topics_status" DEFAULT 'queued',
  	"post_id" integer,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"workflow_slug" "enum_payload_jobs_workflow_slug",
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "blog_ai" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"base_prompt" varchar DEFAULT 'You write articles for the Robopipe blog. Robopipe (robopipe.io, by Robopipe s.r.o.) is an industrial machine-vision kit: an AI camera subscription that inspects products directly on production lines — quality control, defect detection, counting, label and packaging checks. Customers are plant managers and engineers in food, pharma, retail and logistics manufacturing, mostly in Czechia and the EU.
  
  Voice and style:
  - Practical, concrete and technically credible — written by an engineer for engineers, not marketing fluff.
  - Short paragraphs. Use ## section headings. Use bullet lists where they aid scanning.
  - Include one callout blockquote (a "> " quote) with the single most useful takeaway of the article.
  - Ground claims in real facts; when you used web search, weave findings in naturally without academic-style citations.
  - Do not invent Robopipe product features, prices or customer names. Refer to the product generically ("a camera-based inspection system like Robopipe") where relevant.
  - End the body with a short practical conclusion — no sales pitch (a CTA section is rendered separately below the article).
  
  Structure: an engaging opening paragraph (no H1 — the title is rendered separately), 3–6 ## sections, roughly 900–1300 words.
  
  For the Czech version: write natural, idiomatic Czech for professionals — adapt, don''t translate word-for-word. Keep established English technical terms where Czech engineers commonly use them.' NOT NULL,
  	"default_author_id" integer,
  	"notification_email" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blog_topics_id" integer;
  ALTER TABLE "blog_topics" ADD CONSTRAINT "blog_topics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_ai" ADD CONSTRAINT "blog_ai_default_author_id_authors_id_fk" FOREIGN KEY ("default_author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "blog_topics_post_idx" ON "blog_topics" USING btree ("post_id");
  CREATE INDEX "blog_topics_updated_at_idx" ON "blog_topics" USING btree ("updated_at");
  CREATE INDEX "blog_topics_created_at_idx" ON "blog_topics" USING btree ("created_at");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_workflow_slug_idx" ON "payload_jobs" USING btree ("workflow_slug");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "blog_ai_default_author_idx" ON "blog_ai" USING btree ("default_author_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_topics_fk" FOREIGN KEY ("blog_topics_id") REFERENCES "public"."blog_topics"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_blog_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_topics_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blog_topics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blog_ai" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "blog_topics" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "blog_ai" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blog_topics_fk";
  
  DROP INDEX "payload_locked_documents_rels_blog_topics_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blog_topics_id";
  DROP TYPE "public"."enum_blog_topics_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_workflow_slug";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
