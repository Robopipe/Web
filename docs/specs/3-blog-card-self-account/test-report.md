# Test report: blog featured card height, editors edit their own account

Issue: [#3](https://github.com/Robopipe/Web/issues/3) · PR [#4](https://github.com/Robopipe/Web/pull/4) · tested commit `df6bf68`

## Verdict

**Can merge.** Both acceptance criteria pass. The tester found no blocking or medium defect. The three low findings below are older layout and image issues that the PR does not cause. The tester recommends a follow-up for them.

## Test setup

- Own worktree `~/Projects/robopipe-web-fix-test` (detached at `origin/fix/blog-card-self-account`). A second worktree at `origin/master` (`215363b`) gives the comparison.
- Own Postgres 17 container `robopipe-test-pg` on port 55434. The tester ran `payload migrate` and `pnpm seed` on it. The production database and content were not touched.
- Dev servers: the branch on port 3400, `master` on port 3401. Both use the same local database.
- Browser: Google Chrome through Playwright (`channel: 'chrome'`). The Playwright headless shell download did not finish on this machine.
- Test photos (made with `sharp`): 800×2000 (portrait), 1600×1067 (landscape), 3000×500 (very wide). Each photo has a red top band and a green bottom band, so the crop is visible.
- Test post: newest post (`publishedAt` 2026-12-31), cs and en, with each photo, with no photo, with a long title and with one long unbroken word.

## Criterion A: featured card height

Card and photo box size in px, cs locale. The en locale gives the same values.

| Photo | 1440 | 1024 | 768 | 390 | 320 |
| --- | --- | --- | --- | --- | --- |
| 800×2000, **master** | card 1483, box 592×1481 | 1308 | 1979 | 1108 | 958 |
| 800×2000, branch | card 335, box 592×333 | 296, 523×294 | 588, 718×404 | 419, 356×200 | 404, 286×161 |
| 1600×1067, branch | 335, 592×333 | 296, 523×294 | 588, 718×404 | 419, 356×200 | 404, 286×161 |
| 3000×500, **master** | box 1920×373 (photo pushes text to 192 px) | same | box 1320×220 (wider than card) | 1320×237 | 1320×249 |
| 3000×500, branch | 335, 592×333 | 296, 523×294 | 588, 718×404 | 419, 356×200 | 404, 286×161 |
| no photo, branch | 188 | 188 | 184 | 218 | 243 |
| long title + portrait, branch | 340, box 592×338 | 378, box 523×376 | 656, 718×404 | 589, 356×200 | 608, 286×161 |

Results:

| Check | Result | Evidence |
| --- | --- | --- |
| Portrait photo does not set the card height | Pass | 1483 → 335 px at 1440, 1108 → 419 px at 390 |
| Landscape and very wide photos | Pass | Box is 16:9 at every width. On `master` a 3000×500 photo made the box wider than the card. |
| No photo | Pass | Text-only card, 184 to 243 px high, no empty box |
| Long title (normal words) | Pass | Desktop: the box grows to the text height (ratio 1.39 at 1024). Mobile: the photo stays 16:9 and the text wraps. |
| No horizontal page scroll | Pass | `scrollWidth - innerWidth = 0` in all 70 measurements |
| Photo loads | Pass | `naturalWidth > 0` for every photo (`/_next/image?…-768x…jpg&w=828`) |
| Other blog cards, article detail, home page blog teaser | Pass | Card and image sizes are equal on branch and `master` at 1440 and 390 |
| Long unbroken word in the title | Fail (older defect, see L1 and L2) | Mobile box 979×551 on a 358 px card |

Screenshots: `/Users/m1/.openclaw/workspace/output/robopipe-web/blog-card/`. The best two are `portrait-cs-1440.png` (desktop) and `portrait-cs-390.png` (mobile). The `card-<case>-<locale>-<width>.png` files show each card alone. `page-*.png` are full pages. `master-before/` shows `master` with the same data. The photo file is missing in the `master` worktree, so those images show the layout without the photo.

## Criterion B: editor edits own account

Tested through REST and GraphQL on the branch (`/api/users`, `/api/graphql`). GraphQL is on.

| # | Request | Expected | Result |
| --- | --- | --- | --- |
| B1 | Editor `PATCH /api/users/<self>` `{password}` | 200, new password works, old does not | Pass: 200, login with new password 200, old password "incorrect" |
| B1-UI | Editor changes the password on `/admin/account` | Save works | Pass: login with the new password works, the old one fails. The role field is read-only. |
| B2 | Editor `PATCH /api/users/<other editor>` and `<admin>` (name, password) | 403 | Pass: 403 for all three |
| B3 | Editor `PATCH /api/users/<self>` `{role: "admin"}`, also with `?depth=0&draft=false` | role stays `editor` | Pass: 200, role `editor` in response and database |
| B4 | Editor bulk `PATCH /api/users?where[id][in]=1,2,3,4` | only own account changes | Pass: "Updated 1 User", other names unchanged |
| B4b | Editor bulk `PATCH ?where[role][equals]=admin` | nothing changes | Pass: "Updated 0 Users" |
| G1 | GraphQL `updateUser(id: self, data: {role: admin})` | role stays `editor` | Pass |
| G2 | GraphQL `updateUser(id: other)` | Forbidden | Pass |
| G4, G5 | GraphQL `createUser`, `deleteUser` as editor | Forbidden | Pass |
| E1 | Editor sets own email to another user's email (also in upper case) | rejected | Pass: 400 "Value must be unique" |
| E2 | Editor sets own email to a new unique address | allowed | Pass: 200 |
| S1 | Editor sends `hash`, `salt`, `loginAttempts`, `lockUntil`, `resetPasswordToken`, `sessions` | ignored | Pass: login still works, account not locked |
| C1 to C4 | Editor create user, delete other, delete self, bulk delete | 403 | Pass: 403 for all |
| A1 to A3 | Admin changes another editor's name, role and password, and another admin | 200 | Pass, login with the new password works |
| N1 to N6 | Anonymous or invalid token: update, bulk update, create, delete, read, GraphQL update | 403 | Pass: 403 for all |
| UI | Editor opens another user in the admin panel | read-only | Pass: no Save button, fields disabled |

## Automated checks

| Check | Branch | `master` |
| --- | --- | --- |
| `pnpm test:int` | 3 files, **10 passed** (8 from the developer + 2 new) | `userAccess.int.spec.ts` on `master` source: 3 failed, 7 passed (expected, the feature is missing). Other files pass. |
| `pnpm test:e2e` (full run) | 4 passed, 3 failed | 5 failed, 2 did not run |
| `pnpm lint` | 0 errors, 4 warnings (older) | 0 errors |
| `tsc --noEmit` | passed | not run |
| `pnpm build` | passed (36 static pages) | not run |

The three e2e failures on the branch:

1. `Frontend › can go on homepage`: template test, expects "Payload Blank Template". It fails on `master` too. The developer claim is correct.
2. `Admin Panel › can navigate to list view`: the error is "Cannot assign to read only property 'i18n'" in dev mode. It also fails on `master`. It is flaky, not only a full-run issue. When run alone it failed 1 of 2 times on the branch and 1 of 2 times on `master`. The developer said that it passes alone. That is only partly true.
3. `Blog featured card › keeps the photo inside the card on mobile with a long unbroken title`: the new tester test for L1. It fails on purpose until L1 is fixed (received 749 px, expected ≤ 359 px).

The developer's two blog featured card tests fail on `master` (photo height 1481 and 690 px) and pass on the branch. The `master` e2e run used the branch test files (relative URLs, `PORT`), because the `master` tests point at port 3000, which another process uses on this machine. In that run the first admin test hit the 30 s `beforeAll` timeout during the first cold compile. A second run passed.

## Findings

### L1 (low, older defect): long unbroken word widens the card on mobile

Steps:

1. Set the title of the newest post to one long word, for example `Tester: Superkalifragilistikexpialidociózníautomatizacevýrobníchlinekpočítačovýmviděním`.
2. Open `/cs/blog` at a width below 1024 px (768, 390 or 320).

Result: the grid column takes the width of the word. The photo box is 979×551 px on a 358 px card. The card clips the photo and the title, and the card is 769 px high. On `master` the box is 979×652 px. The PR does not cause this, but it does not fix it either. `minmax(0, …)` is only on the `lg:` columns.

Evidence: `card-longword-cs-390.png`. The new e2e test catches it.

Possible fix: add `grid-cols-[minmax(0,1fr)]` below `lg` and `break-words` (or `hyphens-auto`) on the `h2`.

### L2 (low, older defect): long unbroken word is cut on desktop

At 1440 and 1024 px the same title overflows its column (`h2` `scrollWidth` 1055 px, column 430 px), and the card edge cuts it. The photo box stays correct. On `master` the word made the text column 1119 px wide and squeezed the photo to 128 px. `break-words` on the `h2` fixes L1 and L2.

Evidence: `card-longword-cs-1440.png`.

### L3 (low, older choice, more visible now): very wide photos are blurry

The featured card uses the `card` image size (768 px wide). A 3000×500 photo gives a 768×128 file. The 16:9 crop then scales it up about 2.6 times, so the photo is visibly blurry. On a retina desktop a normal photo also needs 1184 device px from a 768 px file. `master` uses the same `card` size, but without the crop the wide photo did not need to scale up as much.

Evidence: `card-wide-cs-768.png`, `card-longtitle-wide-cs-1024.png`.

Possible fix: use `size="hero"` (1600 px) for the featured variant.

### Notes (no change needed for this PR)

- An editor can unlock another user's locked account with `POST /api/users/unlock`. The same is true on `master`, because the Payload default for `access.unlock` is "logged in". If only admins must unlock accounts, add `unlock: admins` to `Users.access`.
- After a password change, older JWTs of the same user stay valid until they expire. An editor can change their own email without the current password. Both are Payload defaults and apply to admins too.
- At 320 px the header logo and the "Domluvit demo" button overlap. The same happens on `master`. The PR does not touch the header.
- The featured case study card has the same `min-h` pattern as the old blog card. The developer listed this in the limits of the implementation.

## Tests added by the tester

- `tests/int/userAccess.int.spec.ts`:
  - `limits an editor bulk update to their own account` (bulk update with `where`, passes).
  - `stops an editor from creating or deleting users` (create, delete other, delete self, passes).
- `tests/e2e/blogFeaturedCard.e2e.spec.ts`: `keeps the photo inside the card on mobile with a long unbroken title` (fails until L1 is fixed).
