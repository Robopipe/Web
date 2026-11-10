# Blog featured card height, editors edit their own account

Issue: [#3](https://github.com/Robopipe/Web/issues/3)

## What is done

### A. Featured blog card

The newest post on `/cs/blog` and `/en/blog` uses the `featured` variant of `src/components/PostCard.tsx`. The hero photo used to set the card height, so a portrait photo made the card several screens tall.

- The photo now sits in a 16:9 box (`aspect-video`) and fills it with `object-fit: cover` (`Media` with `fill`). The photo dimensions no longer change the card height.
- Mobile (stacked layout): the box is the full card width and exactly 16:9.
- Desktop (two columns): the box is 16:9 of its column. When the text column is taller (a very long title), the box stretches to the text height, so no white gap shows under the photo.
- `w-full` and `minmax(0, …)` columns keep the box inside its column. Without them a stretched 16:9 box widens itself and pushes the text out of the card.

Measured on the local site with an 800×2000 photo:

| Viewport | Card height before | Card height after | Photo box after |
| --- | --- | --- | --- |
| 1440 px | 1483 px | 335 px | 592 × 333 (16:9) |
| 390 px | 1235 px | 545 px | 356 × 200 (16:9) |

A normal 1600×1067 photo gives the same result after the change.

### B. Editors edit their own account

- New access helper `adminsOrSelf` in `src/access/index.ts`: admins get every user, other logged-in users only the document with their own `id`, anonymous requests get nothing.
- `Users.access.update` uses `adminsOrSelf` instead of `admins`. An editor can now change their own name, email and password.
- The field access on `role` is unchanged, so only an admin can change a role. Payload drops a `role` value from a non-admin update without an error.
- `read`, `create` and `delete` are unchanged.

### Test infrastructure

- `playwright.config.ts` reads the dev server port from `PORT` (default 3000) and sets `baseURL`. The e2e specs and `tests/helpers/login.ts` use relative URLs.
- Playwright runs with one worker. Two specs that boot Payload at the same time race on the dev schema push (`DROP INDEX` errors). Vitest has `fileParallelism: false` for the same reason.

## How to check it

Automated:

1. Start the local database and seed it (see `README.md`).
2. Run `pnpm test:int`. `tests/int/userAccess.int.spec.ts` covers: editor edits self and logs in with the new password, editor cannot edit another user (`Forbidden`), editor cannot change their own role, admin edits any user and role, anonymous update is denied.
3. Run `PORT=<port> pnpm test:e2e`. `tests/e2e/blogFeaturedCard.e2e.spec.ts` creates a post with an 800×2000 photo and checks the photo box at 1440 px and 390 px.

Manual, on a local site:

1. Upload a portrait photo and set it as the hero of the newest published post.
2. Open `/cs/blog` and `/en/blog` on desktop and on a phone width. The photo is cropped to 16:9.
3. Log in as an editor and open the account page. Change the password and save. The save succeeds.
4. As the same editor, send `PATCH /api/users/<other id>`. The response is 403.

Screenshots (local site, 800×2000 photo unless noted): `screenshots/before-tall-cs-desktop.png`, `screenshots/after-tall-cs-desktop.png`, `screenshots/before-tall-cs-mobile.png`, `screenshots/after-tall-cs-mobile.png`, `screenshots/after-normal-cs-desktop.png` and `screenshots/after-normal-cs-mobile.png` (1600×1067 photo).

## Test results

| Check | Result |
| --- | --- |
| `pnpm test:int` | 3 files, 8 tests passed |
| `pnpm test:e2e` | 4 passed, 2 failed (both fail on `master` too, see below) |
| `pnpm lint` | 0 errors, 4 warnings (older unused variables in `postcss.config.mjs` and the template e2e specs) |
| `tsc --noEmit` | passed |
| `pnpm build` | passed |

The new e2e spec fails on the `master` source (photo box 0.40 ratio) and passes with this change.

## Limits

- `tests/e2e/frontend.e2e.spec.ts` is the Payload template test. It expects the title "Payload Blank Template" and fails on `master` too.
- `Admin Panel › can navigate to list view` fails in a full e2e run in dev mode with the Next.js runtime error "Cannot assign to read only property 'i18n'". It fails the same way on the `master` source and passes when `admin.e2e.spec.ts` runs alone.
- On desktop the photo box is taller than 16:9 only when the text column is taller. The card height then follows the text, never the photo.
- The featured case study card (`src/components/CaseStudyCard.tsx`, `featured`) uses the same `min-h` pattern and has the same problem with portrait photos. This change does not touch it.
