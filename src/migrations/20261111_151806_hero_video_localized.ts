import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Hero `video` becomes localized (issue #13). The column moves from the block tables
 * to their `_locales` tables. The generated migration only dropped the old column,
 * so the existing video is copied to every locale first, in pages and in versions.
 * Hero blocks with a video and without a row for a locale get that row.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "pages_blocks_hero_locales" ADD COLUMN "video_id" integer;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD COLUMN "video_id" integer;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

  INSERT INTO "pages_blocks_hero_locales" ("_locale", "_parent_id", "video_id")
  SELECT l."code", h."id", h."video_id"
  FROM "pages_blocks_hero" h CROSS JOIN unnest(enum_range(NULL::"_locales")) AS l("code")
  WHERE h."video_id" IS NOT NULL
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "video_id" = EXCLUDED."video_id";

  INSERT INTO "_pages_v_blocks_hero_locales" ("_locale", "_parent_id", "video_id")
  SELECT l."code", h."id", h."video_id"
  FROM "_pages_v_blocks_hero" h CROSS JOIN unnest(enum_range(NULL::"_locales")) AS l("code")
  WHERE h."video_id" IS NOT NULL
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "video_id" = EXCLUDED."video_id";

  ALTER TABLE "pages_blocks_hero" DROP CONSTRAINT "pages_blocks_hero_video_id_media_id_fk";
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_video_id_media_id_fk";
  DROP INDEX "pages_blocks_hero_video_idx";
  DROP INDEX "_pages_v_blocks_hero_video_idx";
  CREATE INDEX "pages_blocks_hero_video_idx" ON "pages_blocks_hero_locales" USING btree ("video_id","_locale");
  CREATE INDEX "_pages_v_blocks_hero_video_idx" ON "_pages_v_blocks_hero_locales" USING btree ("video_id","_locale");
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "video_id";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "video_id";`)
}

/** Restores the shared column with the Czech video (the English one when Czech has none). */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

  UPDATE "pages_blocks_hero" h SET "video_id" = COALESCE(
    (SELECT "video_id" FROM "pages_blocks_hero_locales" WHERE "_parent_id" = h."id" AND "_locale" = 'cs'),
    (SELECT "video_id" FROM "pages_blocks_hero_locales" WHERE "_parent_id" = h."id" AND "_locale" = 'en'));
  UPDATE "_pages_v_blocks_hero" h SET "video_id" = COALESCE(
    (SELECT "video_id" FROM "_pages_v_blocks_hero_locales" WHERE "_parent_id" = h."id" AND "_locale" = 'cs'),
    (SELECT "video_id" FROM "_pages_v_blocks_hero_locales" WHERE "_parent_id" = h."id" AND "_locale" = 'en'));

  ALTER TABLE "pages_blocks_hero_locales" DROP CONSTRAINT "pages_blocks_hero_locales_video_id_media_id_fk";
  ALTER TABLE "_pages_v_blocks_hero_locales" DROP CONSTRAINT "_pages_v_blocks_hero_locales_video_id_media_id_fk";
  DROP INDEX "pages_blocks_hero_video_idx";
  DROP INDEX "_pages_v_blocks_hero_video_idx";
  CREATE INDEX "pages_blocks_hero_video_idx" ON "pages_blocks_hero" USING btree ("video_id");
  CREATE INDEX "_pages_v_blocks_hero_video_idx" ON "_pages_v_blocks_hero" USING btree ("video_id");
  ALTER TABLE "pages_blocks_hero_locales" DROP COLUMN "video_id";
  ALTER TABLE "_pages_v_blocks_hero_locales" DROP COLUMN "video_id";`)
}
