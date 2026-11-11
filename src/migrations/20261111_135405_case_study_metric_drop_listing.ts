import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "case_studies_metrics" DROP COLUMN "hide_in_listing";
  ALTER TABLE "_case_studies_v_version_metrics" DROP COLUMN "hide_in_listing";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "case_studies_metrics" ADD COLUMN "hide_in_listing" boolean DEFAULT false;
  ALTER TABLE "_case_studies_v_version_metrics" ADD COLUMN "hide_in_listing" boolean DEFAULT false;`)
}
