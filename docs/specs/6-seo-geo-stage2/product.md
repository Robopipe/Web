# SEO a GEO etapa 2: stránky podle úlohy, klíčová slova, O nás

Issue: Robopipe/Web#6. Navazuje na `docs/specs/2-seo-geo/` (PR #5, nasazeno 10. 11. 2026).
Zadal Filip 10. 11. 2026 21:04 („Etapa 2: vše“). Tento dokument pokrývá body 4 až 6 a část bodu 3.

## Cíl

Robopipe se má ukázat na česká slova, kterými výrobní firmy hledají kamerovou kontrolu.
Jazykové modely mají Robopipe jmenovat u dotazů „kdo v Česku dodává kamerovou kontrolu kvality“.

## Komu to pomáhá

- Vedoucí výroby nebo kvality hledá řešení jedné úlohy (například kontrolu etiket). Najde stránku o své úloze s referencí a cenou.
- Jazykový model hledá fakta o firmě. Najde je na jedné stránce a ve strukturovaných datech.

## Dnešní stav (měření 10. 11. 2026)

Zdroj: workspace Arthura, `output/robopipe-web/visibility/` (`baseline-2026-11-10.md`, `keywords.md`).

- Robopipe se umisťuje jen díky článkům na blogu (srovnání s Cognex, Keyence, Roboflow).
- Na „kamerová kontrola kvality“, „AI kontrola kvality“ a „strojové vidění“ není v prvních 20 výsledcích Googlu ani Seznamu.
- Jazykové modely Robopipe u 20 českých dotazů téměř nejmenují (Gemini 0, ChatGPT 1, Perplexity 1).
- Web nemá stránku „O nás“.
- Bing a Seznam web přihlášený nemají.

## Body

### 1. Stránka řešení „Kamerová kontrola kvality“

- Hlavní slovo: kamerová kontrola kvality.
- Varianty v textu: kamerový systém pro kontrolu výroby, vizuální kontrola kvality, optická kontrola kvality, automatická vizuální kontrola výrobků, průmyslová kamera s AI.
- Obsah: co to je, jak Robopipe úlohu řeší, pro jaké úlohy (odkazy na stránky z bodu 2), reference, cena z ceníku, otázky a odpovědi.
- Česky a anglicky.

### 2. Případy užití podle úlohy

Čtyři stránky. Každá odkazuje na existující referenci nebo článek, pokud na webu je.

| Stránka | Hlavní slovo | Varianty |
|---|---|---|
| Detekce vad | detekce vad na výrobní lince | detekce vad kamerou, kontrola povrchu |
| Počítání kusů | počítání kusů kamerou | aplikace na počítání kusů |
| Kontrola etiket | kontrola etiket | kontrola etiket kamerou, kontrola potisku, čtení data spotřeby |
| Kontrola kompletnosti balení | kontrola kompletnosti balení | kontrola balení kamerou, kontrola plnění |

- Stránky použijí existující mechanismus případů užití z PR #5. Nový typ obsahu vzniká jen tehdy, když architekt doloží, že existující nestačí.
- Stránka bez reference to řekne otevřeně a odkáže na demo. Nevymýšlí zákazníka.

### 3. Úvodní stránka a existující obsah

- Úvodní stránka cílí na „AI kontrola kvality“ (titulek a nadpis už slovo mají). Doplnit varianty: kontrola kvality ve výrobě, AI kamera.
- České stránky uvedou u prvního výskytu anglický název „machine vision“ nebo „computer vision“ jako druhý název.
- Existující průvodce „Co je vizuální systém“ rozšířit o „strojové vidění“ a „počítačové vidění“. Novou stránku nedělat.
- Ceník: doplnit krátké otázky a odpovědi o ceně („kolik stojí kamerová kontrola kvality“).
- Odkázat nové stránky z úvodní stránky, z výpisu případů užití, z patičky a z `llms.txt`.

### 4. Stránka „O nás“ a fakta o firmě

- Stránka „O nás“ česky a anglicky: co Robopipe dělá, pro koho, kde sídlí, kdo za ním stojí, kontakt.
- Strukturovaná data `Organization` na celém webu: název, adresa, logo, kontakt, `sameAs` (GitHub, LinkedIn a další profily, které existují).
- Fakta jen z produkčního webu, patičky, obchodního rejstříku a GitHubu organizace. Chybějící fakt se označí `[doplnit Filip]` a stránka zůstane konceptem.

### 5. Ověřovací značky Bing a Seznam

- Web umí vložit značky `msvalidate.01` a `seznam-wmt` do `<head>` z jednoho místa nastavení (proměnná prostředí nebo globální nastavení v Payload).
- Bez hodnoty se značka nevykreslí.

## Pravidla obsahu (platí z etapy 1)

- Auto anotace je jen v tarifech Pro a Enterprise. Člověk návrhy kontroluje a schvaluje.
- Nejmenovat poskytovatele modelu ani umístění dat. Netvrdit, že snímky neopouštějí provoz.
- Žádná nová jména zákazníků ani čísla, která nejsou na produkčním webu.
- Ceny jen z ceníku v Payload. Nic natvrdo v kódu.
- Každý fakt existuje jednou. Texty neopakují celé odstavce jiných stránek.
- Nový obsah vzniká seed skriptem jako koncept. Publikace je samostatný krok.

## Akceptační kritéria

1. Stránka řešení a čtyři stránky úloh vrací 200 v `/cs` i `/en`, jsou v `sitemap.xml` s hreflang a v `llms.txt`.
2. Každá nová stránka má vlastní titulek do 60 znaků, meta popis do 160 znaků, canonical, og:image s odpovědí 200 a platné JSON-LD.
3. Hlavní slovo stránky je v titulku, v nadpisu H1 a v prvním odstavci.
4. Každá stránka úlohy má aspoň jeden odkaz na referenci nebo článek, nebo otevřeně říká, že referenci nemá.
5. Stránka „O nás“ vrací 200 v obou jazycích. `Organization` JSON-LD je na všech stránkách jednou a projde validací.
6. Značky Bing a Seznam se vykreslí jen s nastavenou hodnotou. Test pokrývá oba stavy.
7. Ceny na nových stránkách a v JSON-LD se shodují s ceníkem.
8. Texty neobsahují `[ověřit]` ani `[doplnit Filip]` v publikovaném stavu. Test to hlídá.
9. Mobil 320 a 390 px bez vodorovného posouvání na nových stránkách.
10. Stávající testy, lint, kontrola typů a build projdou. Lighthouse SEO aspoň 95 na stránce řešení a jedné stránce úlohy.

## Jak se pozná úspěch

Měsíční měření stejnou sadou dotazů (`scripts/robopipe_visibility/` ve workspace Arthura). Cíl do 10. 12. 2026:
Robopipe v prvních 20 výsledcích Googlu nebo Seznamu aspoň u 12 z 20 českých dotazů (dnes 7 a 8).

## Mimo rozsah

- Zmínky mimo web (Firmy.cz, LinkedIn, Crunchbase, CzechInvest). Řeší Arthur s Filipem zvlášť.
- Přístup do Google Search Console a zakládání účtů Microsoft a Seznam.
- Srovnání s PEKAT VISION (článek na blogu, samostatný úkol).
- Stránky oborů, redesign, nový jazyk, placená reklama.
- Nízké chyby testera z etapy 1 (T5, T7, T8, T10 až T12).
