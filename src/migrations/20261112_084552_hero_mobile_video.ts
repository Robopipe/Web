import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero_locales" ADD COLUMN "mobile_video_id" integer;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD COLUMN "mobile_video_id" integer;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_mobile_video_id_media_id_fk" FOREIGN KEY ("mobile_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_mobile_video_id_media_id_fk" FOREIGN KEY ("mobile_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_mobile_video_idx" ON "pages_blocks_hero_locales" USING btree ("mobile_video_id","_locale");
  CREATE INDEX "_pages_v_blocks_hero_mobile_video_idx" ON "_pages_v_blocks_hero_locales" USING btree ("mobile_video_id","_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero_locales" DROP CONSTRAINT "pages_blocks_hero_locales_mobile_video_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero_locales" DROP CONSTRAINT "_pages_v_blocks_hero_locales_mobile_video_id_media_id_fk";
  
  DROP INDEX "pages_blocks_hero_mobile_video_idx";
  DROP INDEX "_pages_v_blocks_hero_mobile_video_idx";
  ALTER TABLE "pages_blocks_hero_locales" DROP COLUMN "mobile_video_id";
  ALTER TABLE "_pages_v_blocks_hero_locales" DROP COLUMN "mobile_video_id";`)
}
