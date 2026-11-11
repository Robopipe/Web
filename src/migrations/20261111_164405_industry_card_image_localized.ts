import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The industry card `image` becomes localized (issue #17). The column moves from the card
 * tables to their `_locales` tables. The generated migration only dropped the old column,
 * so the existing image is copied to every locale first, in pages and in versions.
 * Cards with an image and without a row for a locale get that row.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "pages_blocks_industry_cards_cards_locales" ADD COLUMN "image_id" integer;
  ALTER TABLE "_pages_v_blocks_industry_cards_cards_locales" ADD COLUMN "image_id" integer;
  ALTER TABLE "pages_blocks_industry_cards_cards_locales" ADD CONSTRAINT "pages_blocks_industry_cards_cards_locales_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_industry_cards_cards_locales" ADD CONSTRAINT "_pages_v_blocks_industry_cards_cards_locales_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

  INSERT INTO "pages_blocks_industry_cards_cards_locales" ("_locale", "_parent_id", "image_id")
  SELECT l."code", c."id", c."image_id"
  FROM "pages_blocks_industry_cards_cards" c CROSS JOIN unnest(enum_range(NULL::"_locales")) AS l("code")
  WHERE c."image_id" IS NOT NULL
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "image_id" = EXCLUDED."image_id";

  INSERT INTO "_pages_v_blocks_industry_cards_cards_locales" ("_locale", "_parent_id", "image_id")
  SELECT l."code", c."id", c."image_id"
  FROM "_pages_v_blocks_industry_cards_cards" c CROSS JOIN unnest(enum_range(NULL::"_locales")) AS l("code")
  WHERE c."image_id" IS NOT NULL
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "image_id" = EXCLUDED."image_id";

  ALTER TABLE "pages_blocks_industry_cards_cards" DROP CONSTRAINT "pages_blocks_industry_cards_cards_image_id_media_id_fk";
  ALTER TABLE "_pages_v_blocks_industry_cards_cards" DROP CONSTRAINT "_pages_v_blocks_industry_cards_cards_image_id_media_id_fk";
  DROP INDEX "pages_blocks_industry_cards_cards_image_idx";
  DROP INDEX "_pages_v_blocks_industry_cards_cards_image_idx";
  CREATE INDEX "pages_blocks_industry_cards_cards_image_idx" ON "pages_blocks_industry_cards_cards_locales" USING btree ("image_id","_locale");
  CREATE INDEX "_pages_v_blocks_industry_cards_cards_image_idx" ON "_pages_v_blocks_industry_cards_cards_locales" USING btree ("image_id","_locale");
  ALTER TABLE "pages_blocks_industry_cards_cards" DROP COLUMN "image_id";
  ALTER TABLE "_pages_v_blocks_industry_cards_cards" DROP COLUMN "image_id";`)
}

/** Restores the shared column with the Czech image (the English one when Czech has none). */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "pages_blocks_industry_cards_cards" ADD COLUMN "image_id" integer;
  ALTER TABLE "_pages_v_blocks_industry_cards_cards" ADD COLUMN "image_id" integer;
  ALTER TABLE "pages_blocks_industry_cards_cards" ADD CONSTRAINT "pages_blocks_industry_cards_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_industry_cards_cards" ADD CONSTRAINT "_pages_v_blocks_industry_cards_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

  UPDATE "pages_blocks_industry_cards_cards" c SET "image_id" = COALESCE(
    (SELECT "image_id" FROM "pages_blocks_industry_cards_cards_locales" WHERE "_parent_id" = c."id" AND "_locale" = 'cs'),
    (SELECT "image_id" FROM "pages_blocks_industry_cards_cards_locales" WHERE "_parent_id" = c."id" AND "_locale" = 'en'));
  UPDATE "_pages_v_blocks_industry_cards_cards" c SET "image_id" = COALESCE(
    (SELECT "image_id" FROM "_pages_v_blocks_industry_cards_cards_locales" WHERE "_parent_id" = c."id" AND "_locale" = 'cs'),
    (SELECT "image_id" FROM "_pages_v_blocks_industry_cards_cards_locales" WHERE "_parent_id" = c."id" AND "_locale" = 'en'));

  ALTER TABLE "pages_blocks_industry_cards_cards_locales" DROP CONSTRAINT "pages_blocks_industry_cards_cards_locales_image_id_media_id_fk";
  ALTER TABLE "_pages_v_blocks_industry_cards_cards_locales" DROP CONSTRAINT "_pages_v_blocks_industry_cards_cards_locales_image_id_media_id_fk";
  DROP INDEX "pages_blocks_industry_cards_cards_image_idx";
  DROP INDEX "_pages_v_blocks_industry_cards_cards_image_idx";
  CREATE INDEX "pages_blocks_industry_cards_cards_image_idx" ON "pages_blocks_industry_cards_cards" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_industry_cards_cards_image_idx" ON "_pages_v_blocks_industry_cards_cards" USING btree ("image_id");
  ALTER TABLE "pages_blocks_industry_cards_cards_locales" DROP COLUMN "image_id";
  ALTER TABLE "_pages_v_blocks_industry_cards_cards_locales" DROP COLUMN "image_id";`)
}
