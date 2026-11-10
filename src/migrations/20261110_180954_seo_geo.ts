import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_logo_cloud_source" AS ENUM('custom', 'memberships');
  CREATE TYPE "public"."enum__pages_v_blocks_logo_cloud_source" AS ENUM('custom', 'memberships');
  CREATE TABLE "case_studies_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"faqs_id" integer
  );
  
  CREATE TABLE "_case_studies_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"faqs_id" integer
  );
  
  CREATE TABLE "site_settings_memberships" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"logo_id" integer NOT NULL,
  	"logo_on_dark_id" integer
  );
  
  ALTER TABLE "pages_blocks_logo_cloud" ADD COLUMN "source" "enum_pages_blocks_logo_cloud_source" DEFAULT 'custom';
  ALTER TABLE "_pages_v_blocks_logo_cloud" ADD COLUMN "source" "enum__pages_v_blocks_logo_cloud_source" DEFAULT 'custom';
  ALTER TABLE "case_studies_locales" ADD COLUMN "problem" jsonb;
  ALTER TABLE "case_studies_locales" ADD COLUMN "solution" jsonb;
  ALTER TABLE "case_studies_locales" ADD COLUMN "result" jsonb;
  ALTER TABLE "case_studies_locales" ADD COLUMN "technique" jsonb;
  ALTER TABLE "_case_studies_v_locales" ADD COLUMN "version_problem" jsonb;
  ALTER TABLE "_case_studies_v_locales" ADD COLUMN "version_solution" jsonb;
  ALTER TABLE "_case_studies_v_locales" ADD COLUMN "version_result" jsonb;
  ALTER TABLE "_case_studies_v_locales" ADD COLUMN "version_technique" jsonb;
  ALTER TABLE "case_studies_rels" ADD CONSTRAINT "case_studies_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_rels" ADD CONSTRAINT "case_studies_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_rels" ADD CONSTRAINT "_case_studies_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_rels" ADD CONSTRAINT "_case_studies_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_memberships" ADD CONSTRAINT "site_settings_memberships_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_memberships" ADD CONSTRAINT "site_settings_memberships_logo_on_dark_id_media_id_fk" FOREIGN KEY ("logo_on_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_memberships" ADD CONSTRAINT "site_settings_memberships_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "case_studies_rels_order_idx" ON "case_studies_rels" USING btree ("order");
  CREATE INDEX "case_studies_rels_parent_idx" ON "case_studies_rels" USING btree ("parent_id");
  CREATE INDEX "case_studies_rels_path_idx" ON "case_studies_rels" USING btree ("path");
  CREATE INDEX "case_studies_rels_faqs_id_idx" ON "case_studies_rels" USING btree ("faqs_id");
  CREATE INDEX "_case_studies_v_rels_order_idx" ON "_case_studies_v_rels" USING btree ("order");
  CREATE INDEX "_case_studies_v_rels_parent_idx" ON "_case_studies_v_rels" USING btree ("parent_id");
  CREATE INDEX "_case_studies_v_rels_path_idx" ON "_case_studies_v_rels" USING btree ("path");
  CREATE INDEX "_case_studies_v_rels_faqs_id_idx" ON "_case_studies_v_rels" USING btree ("faqs_id");
  CREATE INDEX "site_settings_memberships_order_idx" ON "site_settings_memberships" USING btree ("_order");
  CREATE INDEX "site_settings_memberships_parent_id_idx" ON "site_settings_memberships" USING btree ("_parent_id");
  CREATE INDEX "site_settings_memberships_logo_idx" ON "site_settings_memberships" USING btree ("logo_id");
  CREATE INDEX "site_settings_memberships_logo_on_dark_idx" ON "site_settings_memberships" USING btree ("logo_on_dark_id");
  ALTER TABLE "case_studies_locales" DROP COLUMN "content";
  ALTER TABLE "_case_studies_v_locales" DROP COLUMN "version_content";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "case_studies_rels" CASCADE;
  DROP TABLE "_case_studies_v_rels" CASCADE;
  DROP TABLE "site_settings_memberships" CASCADE;
  ALTER TABLE "case_studies_locales" ADD COLUMN "content" jsonb;
  ALTER TABLE "_case_studies_v_locales" ADD COLUMN "version_content" jsonb;
  ALTER TABLE "pages_blocks_logo_cloud" DROP COLUMN "source";
  ALTER TABLE "_pages_v_blocks_logo_cloud" DROP COLUMN "source";
  ALTER TABLE "case_studies_locales" DROP COLUMN "problem";
  ALTER TABLE "case_studies_locales" DROP COLUMN "solution";
  ALTER TABLE "case_studies_locales" DROP COLUMN "result";
  ALTER TABLE "case_studies_locales" DROP COLUMN "technique";
  ALTER TABLE "_case_studies_v_locales" DROP COLUMN "version_problem";
  ALTER TABLE "_case_studies_v_locales" DROP COLUMN "version_solution";
  ALTER TABLE "_case_studies_v_locales" DROP COLUMN "version_result";
  ALTER TABLE "_case_studies_v_locales" DROP COLUMN "version_technique";
  DROP TYPE "public"."enum_pages_blocks_logo_cloud_source";
  DROP TYPE "public"."enum__pages_v_blocks_logo_cloud_source";`)
}
