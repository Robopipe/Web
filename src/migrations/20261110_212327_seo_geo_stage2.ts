import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_industry_cards_source" AS ENUM('custom', 'solutions');
  CREATE TYPE "public"."enum_pages_blocks_pricing_table_source" AS ENUM('custom', 'pricingPage');
  CREATE TYPE "public"."enum__pages_v_blocks_industry_cards_source" AS ENUM('custom', 'solutions');
  CREATE TYPE "public"."enum__pages_v_blocks_pricing_table_source" AS ENUM('custom', 'pricingPage');
  CREATE TABLE "site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer
  );
  
  ALTER TABLE "pages_blocks_industry_cards" ADD COLUMN "source" "enum_pages_blocks_industry_cards_source" DEFAULT 'custom';
  ALTER TABLE "pages_blocks_pricing_table" ADD COLUMN "source" "enum_pages_blocks_pricing_table_source" DEFAULT 'custom';
  ALTER TABLE "_pages_v_blocks_industry_cards" ADD COLUMN "source" "enum__pages_v_blocks_industry_cards_source" DEFAULT 'custom';
  ALTER TABLE "_pages_v_blocks_pricing_table" ADD COLUMN "source" "enum__pages_v_blocks_pricing_table_source" DEFAULT 'custom';
  ALTER TABLE "site_settings" ADD COLUMN "company_legal_name" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "company_company_id" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "verification_bing" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "verification_seznam" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "company_registration" varchar;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_pages_id_idx" ON "site_settings_rels" USING btree ("pages_id");
  -- The footer © line now reads site-settings.company.legalName. Copy the value before the column goes.
  UPDATE "site_settings" SET "company_legal_name" = (SELECT "copyright" FROM "footer" LIMIT 1)
    WHERE "company_legal_name" IS NULL;
  ALTER TABLE "footer" DROP COLUMN "copyright";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_rels" CASCADE;
  ALTER TABLE "footer" ADD COLUMN "copyright" varchar;
  UPDATE "footer" SET "copyright" = (SELECT "company_legal_name" FROM "site_settings" LIMIT 1)
    WHERE "copyright" IS NULL;
  ALTER TABLE "pages_blocks_industry_cards" DROP COLUMN "source";
  ALTER TABLE "pages_blocks_pricing_table" DROP COLUMN "source";
  ALTER TABLE "_pages_v_blocks_industry_cards" DROP COLUMN "source";
  ALTER TABLE "_pages_v_blocks_pricing_table" DROP COLUMN "source";
  ALTER TABLE "site_settings" DROP COLUMN "company_legal_name";
  ALTER TABLE "site_settings" DROP COLUMN "company_company_id";
  ALTER TABLE "site_settings" DROP COLUMN "verification_bing";
  ALTER TABLE "site_settings" DROP COLUMN "verification_seznam";
  ALTER TABLE "site_settings_locales" DROP COLUMN "company_registration";
  DROP TYPE "public"."enum_pages_blocks_industry_cards_source";
  DROP TYPE "public"."enum_pages_blocks_pricing_table_source";
  DROP TYPE "public"."enum__pages_v_blocks_industry_cards_source";
  DROP TYPE "public"."enum__pages_v_blocks_pricing_table_source";`)
}
