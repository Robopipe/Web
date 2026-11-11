import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_feature_grid_features_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum__pages_v_blocks_feature_grid_features_link_type" AS ENUM('internal', 'external');
  ALTER TABLE "pages_blocks_feature_grid_features" ADD COLUMN "link_type" "enum_pages_blocks_feature_grid_features_link_type" DEFAULT 'internal';
  ALTER TABLE "pages_blocks_feature_grid_features" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "pages_blocks_feature_grid_features" ADD COLUMN "link_new_tab" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_feature_grid_features_locales" ADD COLUMN "link_label" varchar;
  ALTER TABLE "pages_blocks_feature_grid_features_locales" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ADD COLUMN "link_type" "enum__pages_v_blocks_feature_grid_features_link_type" DEFAULT 'internal';
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ADD COLUMN "link_new_tab" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_feature_grid_features_locales" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_pages_v_blocks_feature_grid_features_locales" ADD COLUMN "link_url" varchar;
  ALTER TABLE "pages_blocks_feature_grid_features" ADD CONSTRAINT "pages_blocks_feature_grid_features_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ADD CONSTRAINT "_pages_v_blocks_feature_grid_features_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_feature_grid_features_link_link_page_idx" ON "pages_blocks_feature_grid_features" USING btree ("link_page_id");
  CREATE INDEX "_pages_v_blocks_feature_grid_features_link_link_page_idx" ON "_pages_v_blocks_feature_grid_features" USING btree ("link_page_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_feature_grid_features" DROP CONSTRAINT "pages_blocks_feature_grid_features_link_page_id_pages_id_fk";
  
  ALTER TABLE "_pages_v_blocks_feature_grid_features" DROP CONSTRAINT "_pages_v_blocks_feature_grid_features_link_page_id_pages_id_fk";
  
  DROP INDEX "pages_blocks_feature_grid_features_link_link_page_idx";
  DROP INDEX "_pages_v_blocks_feature_grid_features_link_link_page_idx";
  ALTER TABLE "pages_blocks_feature_grid_features" DROP COLUMN "link_type";
  ALTER TABLE "pages_blocks_feature_grid_features" DROP COLUMN "link_page_id";
  ALTER TABLE "pages_blocks_feature_grid_features" DROP COLUMN "link_new_tab";
  ALTER TABLE "pages_blocks_feature_grid_features_locales" DROP COLUMN "link_label";
  ALTER TABLE "pages_blocks_feature_grid_features_locales" DROP COLUMN "link_url";
  ALTER TABLE "_pages_v_blocks_feature_grid_features" DROP COLUMN "link_type";
  ALTER TABLE "_pages_v_blocks_feature_grid_features" DROP COLUMN "link_page_id";
  ALTER TABLE "_pages_v_blocks_feature_grid_features" DROP COLUMN "link_new_tab";
  ALTER TABLE "_pages_v_blocks_feature_grid_features_locales" DROP COLUMN "link_label";
  ALTER TABLE "_pages_v_blocks_feature_grid_features_locales" DROP COLUMN "link_url";
  DROP TYPE "public"."enum_pages_blocks_feature_grid_features_link_type";
  DROP TYPE "public"."enum__pages_v_blocks_feature_grid_features_link_type";`)
}
