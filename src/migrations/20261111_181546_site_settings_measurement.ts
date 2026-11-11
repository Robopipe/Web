import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "measurement_google_analytics_id" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "measurement_google_ads_id" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "measurement_google_analytics_id";
  ALTER TABLE "site_settings" DROP COLUMN "measurement_google_ads_id";`)
}
