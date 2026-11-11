import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" ADD COLUMN "attribution_consent_analytics" boolean DEFAULT false;
  ALTER TABLE "leads" ADD COLUMN "attribution_consent_marketing" boolean DEFAULT false;
  ALTER TABLE "leads" ADD COLUMN "attribution_gclid" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_gbraid" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_wbraid" varchar;
  ALTER TABLE "leads" ADD COLUMN "attribution_clicked_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings" ADD COLUMN "measurement_lead_conversion_name" varchar DEFAULT 'Firemni poptavka (import)' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" DROP COLUMN "attribution_consent_analytics";
  ALTER TABLE "leads" DROP COLUMN "attribution_consent_marketing";
  ALTER TABLE "leads" DROP COLUMN "attribution_gclid";
  ALTER TABLE "leads" DROP COLUMN "attribution_gbraid";
  ALTER TABLE "leads" DROP COLUMN "attribution_wbraid";
  ALTER TABLE "leads" DROP COLUMN "attribution_clicked_at";
  ALTER TABLE "site_settings" DROP COLUMN "measurement_lead_conversion_name";`)
}
