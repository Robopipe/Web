# Content change files

`pnpm content:apply` writes these files to a Payload site through REST. One file holds the content changes of one comment on the local site (issue #8). The same file goes first to the local site and, after "deploy", to production.

## File name

`NNNN-c<commentId>.json`. `NNNN` is the order: `0001`, `0002` and so on. The script runs the files by name. Images go to `media/` in this folder.

## Format

```json
{
  "comment": 12,
  "changes": [
    { "op": "set", "collection": "pages", "slug": "home", "locale": "cs",
      "path": "layout.<blockId>.heading", "from": "Old heading", "to": "New heading" },
    { "op": "set", "global": "header", "locale": "en",
      "path": "navItems.<rowId>.link.label", "from": "Pricing", "to": "Prices" },
    { "op": "upload", "ref": "hero-line", "file": "media/hero-line.jpg",
      "alt": { "cs": "Kamera nad linkou", "en": "Camera above the line" } },
    { "op": "set", "collection": "pages", "slug": "home", "locale": "cs",
      "path": "layout.<blockId>.image", "from": 45, "to": { "$media": "hero-line" } },
    { "op": "insert", "collection": "pages", "slug": "cenik", "locale": "cs",
      "path": "layout", "after": "<blockId>", "value": { "id": "<new id>", "blockType": "cta" } },
    { "op": "remove", "collection": "pages", "slug": "cenik", "locale": "cs",
      "path": "layout.<blockId>", "from": { "id": "<blockId>", "blockType": "cta" } }
  ]
}
```

- A collection document is found by `slug` in the given `locale`. Collections without a slug (`faqs`, `testimonials`) use `"id": <number>` instead.
- `path` is a list of field names separated by dots. Inside an array or blocks field, the segment is the row `id`, not the index.
- Values are what the REST API returns with `depth=0`: a relation is an ID.

## Rules

1. `set`: the current value equals `from` → write `to`. It equals `to` → skip (already written). Anything else is a conflict.
2. `insert`: skip when a row with the same `id` exists. Without `after` the row goes to the end.
3. `remove`: delete only when the current row equals `from`. A missing row is skipped.
4. `upload`: reuse a media document with the same `filename`. Else upload the file with both alt texts. `{ "$media": "<ref>" }` becomes the media ID.
5. A conflict anywhere in a file writes nothing from that file. After a conflict, later files are only checked. The exit code is 1.
6. A document with a draft newer than its published version is a conflict ("rozpracovaný koncept v produkci"). The script never publishes someone else's draft.
7. Changes to one document and locale go out as one write of each changed top-level field, with `_status: published`.
8. A second run changes nothing.

## Commands

```bash
# Local site (the comment layer runs this through `comments apply-content`)
SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm content:apply --remote=http://127.0.0.1:3810 --file=seed-assets/content-changes/0001-c12.json

# Production after "deploy": always a dry run first
SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm content:apply --remote=https://robopipe.io --dry-run
```
