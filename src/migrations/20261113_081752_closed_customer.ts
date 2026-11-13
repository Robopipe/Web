import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" ADD COLUMN "closed_customer" boolean DEFAULT false;
  ALTER TABLE "leads" ADD COLUMN "closed_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings" ADD COLUMN "measurement_lead_conversion_value" numeric DEFAULT 5000 NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "measurement_closed_customer_conversion_name" varchar DEFAULT 'Uzavreny zakaznik' NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "measurement_closed_customer_conversion_value" numeric DEFAULT 25000 NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "measurement_conversion_currency" varchar DEFAULT 'CZK' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" DROP COLUMN "closed_customer";
  ALTER TABLE "leads" DROP COLUMN "closed_at";
  ALTER TABLE "site_settings" DROP COLUMN "measurement_lead_conversion_value";
  ALTER TABLE "site_settings" DROP COLUMN "measurement_closed_customer_conversion_name";
  ALTER TABLE "site_settings" DROP COLUMN "measurement_closed_customer_conversion_value";
  ALTER TABLE "site_settings" DROP COLUMN "measurement_conversion_currency";`)
}
