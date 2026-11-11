# Doplnění zadání: skript obsahu přes REST API (issue #6, krok 12)

Zadal Arthur 10. 11. 2026 po rozhodnutí Filipa: texty vložit přes administraci Payload, bez Coolify.

**Skript obsahu musí umět běžet přes REST API Payload, bez přístupu k databázi.** Produkční databáze je dostupná jen z Coolify, kam přístup není. Účet `arthur@robopipe.io` (role editor) má podle `/api/access` právo create/update na `pages`, `case-studies`, `faqs`, `media`, `posts`, `redirects` a update na globály `header`, `footer`, `site-settings`.

1. Nový přepínač `pnpm seed:seo-geo --remote=<URL>` (například `--remote=https://robopipe.io`). V tomto režimu skript nevolá `getPayload` ani databázi. Použije tenkého klienta se stejným rozhraním, jaké skript dnes používá (`find`, `create`, `update`, `findGlobal`, `updateGlobal`, nahrání média), nad REST (`/api/<collection>`, `/api/globals/<slug>`, `locale`, `depth`, `draft`, `where`). Logika skriptu zůstane jedna, mění se jen klient.
2. Přihlášení: `POST /api/users/login`. E-mail z proměnné `SEED_REMOTE_EMAIL`, heslo z proměnné `SEED_REMOTE_PASSWORD`. Heslo nikdy nevypisuj a neukládej.
3. `--dry-run` a `--status=draft|published` fungují stejně jako lokálně. Pojistka značek `[doplnit Filip]` a `[ověřit]` platí i zde.
4. Chyba HTTP (401, 403, 400 s validací) zastaví běh s čitelnou hláškou: metoda, cesta, stav, text chyby. Žádné tiché přeskočení.
5. Test: běh `--remote=http://localhost:<port>` s účtem role editor na databázi po `pnpm seed` z `master` dá stejný výsledek jako lokální běh (stejné slugy, stavy a počty bloků). Druhý běh nic nezmění.
6. Proti produkci je dovolený jen `--remote=https://robopipe.io --dry-run` (jen čtení). Údaje: `SEED_REMOTE_EMAIL=arthur@robopipe.io SEED_REMOTE_PASSWORD="$(security find-generic-password -a arthur@robopipe.io -s robopipe-payload-password -w)"` přímo v příkazu, bez výpisu. Výstup ulož do `/tmp`. Do závěrečné zprávy dej jen souhrn: počty vytvořit a změnit, chyby práv. Skutečný zápis do produkce nespouštěj.
7. Popiš režim v README a v `implementation.md`. Když některý zápis přes REST nejde, zapiš přesně který a proč.

# Doplnění 2: odpovědi Filipa na otázky z kapitoly 16 architektury (10. 11. 2026 22:24)

Tyto odpovědi mají přednost před architekturou a před původním zadáním vývojáře.

- **Otázka 4 (etikety):** Robopipe umí přečíst datum spotřeby z etikety. Na stránku „Kontrola etiket“ přidej variantu „čtení data spotřeby“ (text, FAQ, varianty slov). Neuváděj přesnost ani čísla.
- **Název firmy:** v právních údajích piš „robopipe s.r.o.“ s malým r, podle rejstříku (`company.legalName`, patička, `Organization.legalName`). Značka v textu zůstává „Robopipe“.
- **Fakta pro stránku „O nás“** (nahraď jimi značky `[doplnit Filip]`):
  - Filip Molčík: produkt a technické řešení.
  - Jan Jelínek: obchod.
  - Robopipe je spin-off firmy KOALA42. Vznikl, protože KOALA42 řešila podobné úlohy pro zákazníky stále znovu.
  - Práce na produktu začala kolem roku 2024. Piš „v roce 2024“.
  - Tým má dnes 5 lidí.
  - Nevymýšlej další životopisné údaje. Medailonek je jedna věta o roli.
- **Otázky 1 až 3:** Filip nenamítal, platí doporučení architekta. Adresa pro kontakt zůstává Sokolovská 81/55, sídlo z rejstříku je jen v řádku o zápisu. Tři stránky etapy 1 odstranit. LinkedIn beze změny dat.
- Stránka „O nás“ tím nemá žádnou povinnou značku `[doplnit Filip]`. Skript ji smí publikovat.
