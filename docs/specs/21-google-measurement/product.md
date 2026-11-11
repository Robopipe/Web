# #21 Měření návštěvnosti: Google Analytics 4, značka Google Ads, cookie lišta

Zadání schválil Filip 11. 11. 2026 (režim C, plný postup s testerem).

## Cíl

Web robopipe.io měří návštěvy a konverze v Google Analytics 4 a ve značce Google Ads.
Data poslouží pro vyhodnocení SEO a pro kampaně Google Ads.
Návštěvník rozhoduje o cookies v liště se souhlasem.

## Komu to pomáhá

- Filip vidí, kolik lidí přišlo, odkud a kolik jich požádalo o demo.
- Google Ads dostane konverze a seznamy návštěvníků pro cílení.
- Návštěvník má jasnou volbu a web jeho volbu dodrží.

## Uživatelské scénáře

1. Nový návštěvník otevře libovolnou stránku. Vidí lištu s tlačítky „Přijmout vše“, „Odmítnout“ a „Nastavení“.
2. Návštěvník klikne „Přijmout vše“. Lišta zmizí. Web měří v Analytics i ve značce Ads s cookies.
3. Návštěvník klikne „Odmítnout“. Lišta zmizí. Web neuloží žádné měřicí cookies.
4. Návštěvník otevře „Nastavení“. Zvolí zvlášť analytiku a marketing. Uloží volbu.
5. Návštěvník se vrátí později. Web si volbu pamatuje a lištu neukáže.
6. Návštěvník změní volbu přes odkaz „Nastavení cookies“ v patičce.
7. Návštěvník odešle formulář pro demo. Analytics i Ads zaznamenají konverzi.
8. Návštěvník klikne na e-mail nebo telefon. Analytics zaznamená vedlejší událost.

## Rozhodnutí Filipa

- Lišta je vlastní, ve vzhledu webu, bez placené služby (bod 7).
- „Přijmout vše“ a „Odmítnout“ jsou stejně výrazné (bod 8).
- Consent mode v2 v rozšířené podobě (bod 9): značka Google se načte vždy. Před volbou a po odmítnutí je vše
  nastavené na „denied“. Google pak dostává jen anonymní signály bez cookies a chybějící návštěvy dopočítá.
  Filip tuto cestu zvolil s vědomím, že je právně sporná.
- Konverze: odeslání formuláře pro demo je hlavní. Klik na e-mail a telefon je vedlejší (bod 10).
- Arthur založí službu Google Analytics 4 pro robopipe.io a propojí ji s Google Ads (bod 11). Není to práce vývojáře.
- Stránka Ochrana osobních údajů dostane odstavec o cookies a měření. Text schvaluje Filip (bod 12).

## Akceptační kritéria

1. Lišta se ukáže při první návštěvě na každé stránce, česky na /cs a anglicky na /en.
2. Lišta má tři tlačítka. „Přijmout vše“ a „Odmítnout“ mají stejnou velikost a stejnou váhu vzhledu.
3. „Nastavení“ nabízí dvě kategorie: analytika a marketing. Obě jsou ve výchozím stavu vypnuté.
4. Před volbou a po odmítnutí neexistuje žádná cookie `_ga`, `_gid`, `_gcl_*` ani jiná cookie Google.
5. Před volbou a po odmítnutí má consent mode hodnoty `ad_storage`, `ad_user_data`, `ad_personalization`
   a `analytics_storage` rovné `denied`. Výchozí stav se nastaví dřív, než se značka Google načte.
6. Po „Přijmout vše“ jsou všechny čtyři hodnoty `granted` a vznikne cookie `_ga`.
7. Volba „jen analytika“ nastaví `analytics_storage` na `granted` a tři reklamní hodnoty nechá `denied`.
8. Volba se uloží na 6 měsíců. Při další návštěvě se lišta neukáže a volba platí.
9. Patička má odkaz „Nastavení cookies“ (en „Cookie settings“). Otevře nastavení a změna volby platí hned.
10. Odeslání formuláře pro demo pošle událost konverze do Analytics a konverzi do Google Ads. Událost se pošle
    jen po úspěšném odeslání, jednou.
11. Klik na odkaz `mailto:` a `tel:` pošle událost do Analytics.
12. ID měření Analytics a ID značky Ads jsou v nastavení prostředí nebo v administraci, ne natvrdo v kódu.
    Bez vyplněného ID se značka nenačte a lišta se neukáže.
13. Lišta nezakrývá obsah tak, aby nešel použít. Funguje na telefonu (390 px) i na počítači a jde ovládat klávesnicí.
14. Lišta nezhorší rychlost: skript Google se načte až po vykreslení stránky. Lighthouse mobil výkon neklesne
    o víc než 3 body proti stavu před změnou.
15. Stránka Ochrana osobních údajů (cs i en) popisuje cookies, měření Google a způsob změny volby.
16. Stávající funkce webu fungují dál: formulář, přepínač jazyka, video v úvodu.

## Mimo rozsah

- Kampaně, rozpočty a jakékoli změny v účtu Google Ads kromě propojení s Analytics a konverze.
- Jiné měřicí nástroje (Umami, Meta Pixel, LinkedIn Insight).
- Google Tag Manager. Stačí značka Google (gtag.js).
