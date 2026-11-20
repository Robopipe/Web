import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leads_attribution_source_from" AS ENUM('landing', 'formPage');
  ALTER TABLE "leads" ADD COLUMN "attribution_utm_source" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_utm_medium" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_utm_campaign" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_utm_term" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_utm_content" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_referrer" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_source_from" "enum_leads_attribution_source_from";
  ALTER TABLE "leads" ADD COLUMN "attribution_landed_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" DROP COLUMN "attribution_utm_source";
  ALTER TABLE "leads" DROP COLUMN "attribution_utm_medium";
  ALTER TABLE "leads" DROP COLUMN "attribution_utm_campaign";
  ALTER TABLE "leads" DROP COLUMN "attribution_utm_term";
  ALTER TABLE "leads" DROP COLUMN "attribution_utm_content";
  ALTER TABLE "leads" DROP COLUMN "attribution_referrer";
  ALTER TABLE "leads" DROP COLUMN "attribution_source_from";
  ALTER TABLE "leads" DROP COLUMN "attribution_landed_at";
  DROP TYPE "public"."enum_leads_attribution_source_from";`)
}
