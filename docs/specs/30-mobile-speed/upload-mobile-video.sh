#!/usr/bin/env bash
# Issue #30: upload the mobile hero videos (cs, en) and set them on the home page hero
# through the Payload REST API. Run it after the deploy and the migration.
#
#   SITE=https://robopipe.io EMAIL=… PASSWORD=… \
#     docs/specs/30-mobile-speed/upload-mobile-video.sh hero-v3-cs-mobile.mp4 hero-v3-en-mobile.mp4
#
# DRY_RUN=1 uploads nothing and changes nothing. It prints the hero before and after.
# The script stops when the home page has an unpublished draft, because publishing
# would replace the draft.
set -euo pipefail

: "${SITE:?SITE is required, e.g. https://robopipe.io}"
: "${EMAIL:?EMAIL is required}"
: "${PASSWORD:?PASSWORD is required}"
CS_FILE=${1:?first argument: the cs mobile video}
EN_FILE=${2:?second argument: the en mobile video}
DRY_RUN=${DRY_RUN:-0}

for file in "$CS_FILE" "$EN_FILE"; do
  [ -f "$file" ] || { echo "No file: $file" >&2; exit 1; }
done

TOKEN=$(curl -sf -X POST "$SITE/api/users/login" -H 'Content-Type: application/json' \
  -d "$(jq -n --arg email "$EMAIL" --arg password "$PASSWORD" '{email: $email, password: $password}')" |
  jq -r .token)
[ -n "$TOKEN" ] && [ "$TOKEN" != null ] || { echo "Login failed" >&2; exit 1; }
AUTH="Authorization: JWT $TOKEN"

PAGE_ID=$(curl -sf -H "$AUTH" -G "$SITE/api/pages" \
  --data-urlencode 'where[slug][equals]=home' -d locale=cs -d depth=0 -d limit=1 |
  jq -r '.docs[0].id')
[ -n "$PAGE_ID" ] && [ "$PAGE_ID" != null ] || { echo "No home page" >&2; exit 1; }

# A newer draft than the published version would be overwritten by the publish below.
DRAFT_STATUS=$(curl -sf -H "$AUTH" "$SITE/api/pages/$PAGE_ID?draft=true&depth=0" | jq -r ._status)
if [ "$DRAFT_STATUS" != published ]; then
  echo "The home page has an unpublished draft. Publish or discard it in the admin first." >&2
  exit 1
fi

# Uploads one file with a localized alt text and prints the new media ID.
upload() {
  local file=$1 locale=$2 alt=$3
  curl -sf -X POST -H "$AUTH" "$SITE/api/media?locale=$locale" \
    -F "file=@$file;type=video/mp4" \
    -F "_payload=$(jq -nc --arg alt "$alt" '{alt: $alt}')" | jq -r .doc.id
}

# Sets `mobileVideo` on the hero block in one locale. `fallback-locale=none` reads only
# the values of this locale, so the PATCH never copies Czech text into empty English fields.
set_mobile_video() {
  local locale=$1 media_id=$2 layout
  layout=$(curl -sf -H "$AUTH" "$SITE/api/pages/$PAGE_ID?locale=$locale&fallback-locale=none&depth=0" |
    jq -c --argjson id "$media_id" \
      '[.layout[] | if .blockType == "hero" then .mobileVideo = $id else . end]')
  curl -sf -X PATCH -H "$AUTH" -H 'Content-Type: application/json' \
    "$SITE/api/pages/$PAGE_ID?locale=$locale&fallback-locale=none&depth=0" \
    -d "$(jq -nc --argjson layout "$layout" '{layout: $layout, _status: "published"}')" >/dev/null
}

show_hero() {
  local locale=$1
  curl -sf "$SITE/api/pages/$PAGE_ID?locale=$locale&depth=1" |
    jq -c --arg locale "$locale" \
      '.layout[] | select(.blockType == "hero") |
       {locale: $locale, video: .video.filename, mobileVideo: .mobileVideo.filename, image: .image.filename}'
}

echo "Home page $PAGE_ID, before:"
show_hero cs
show_hero en
if [ "$DRY_RUN" = 1 ]; then
  echo "Dry run: nothing uploaded."
  exit 0
fi

CS_ID=$(upload "$CS_FILE" cs 'Video kontroly kvality na lince, verze pro mobil')
EN_ID=$(upload "$EN_FILE" en 'Quality inspection video on a production line, mobile version')
echo "Uploaded media cs=$CS_ID en=$EN_ID"

set_mobile_video cs "$CS_ID"
set_mobile_video en "$EN_ID"

echo "After:"
show_hero cs
show_hero en
