# #26 Offline konverze: poptávky s firemním e-mailem do Google Ads

Zadání schválil Filip 11. 11. 2026 (Chat, vlákno LmOQkyzfRvs, body 31, 31.2, 32, 33). Režim C.

## Cíl

Google Ads má řídit nabídky podle poptávek, které mají obchodní hodnotu.
Poptávka s firemním e-mailem je hlavní konverze. Každý odeslaný formulář zůstává jako vedlejší konverze.

## Komu to pomáhá

- Filip: reklama se učí z firemních poptávek, ne z každého odeslaného formuláře.
- Obchod: nic se pro něj nemění. Poptávky chodí jako dnes.

## Pojmy

- **Poptávka**: záznam v kolekci `leads` po odeslání formuláře.
- **Firemní e-mail**: e-mail, jehož doména není veřejná poštovní služba (například gmail.com, seznam.cz, email.cz,
  centrum.cz, post.cz, volny.cz, atlas.cz, outlook.com, hotmail.com, yahoo.com, icloud.com, proton.me).
  Seznam domén je v kódu na jednom místě.
- **Značka kliknutí**: parametr `gclid` (také `gbraid`, `wbraid`), který Google Ads přidá do adresy po kliknutí na reklamu.
- **Zkušební poptávka**: e-mail z domény koala42.com nebo robopipe.io, nebo jméno začíná „TEST“.

## Scénáře

1. Návštěvník klikne na reklamu, přijme cookies a odešle formulář s adresou novak@firma.cz.
   Web uloží k poptávce značku kliknutí. Řádek je v exportu hned. Google Ads ukáže konverzi „firemní poptávka“ nejpozději za 3 dny.
2. Stejný návštěvník s adresou novak@gmail.com. Poptávka se uloží, do Google Ads jako firemní poptávka nejde.
3. Návštěvník odmítne cookies. Poptávka se uloží bez značky kliknutí. Web nepošle do Googlu otisk e-mailu.
   Poptávka do Google Ads nejde.
4. Návštěvník přišel mimo reklamu (bez značky kliknutí). Poptávka se uloží. Do Google Ads jde jen tehdy,
   když to rozšířené konverze pro zájemce umožní (otisk e-mailu se souhlasem). Rozhodne architekt podle dokumentace Googlu.

## Akceptační kritéria

1. Kolekce `leads` ukládá značku kliknutí (`gclid`, `gbraid`, `wbraid`) a stav souhlasu v okamžiku odeslání.
   Značka se uloží jen se souhlasem pro reklamu (`ad_storage`).
2. Značka kliknutí přežije přechod mezi stránkami od vstupu na web po odeslání formuláře.
   Bez souhlasu ji web nikam neukládá.
3. Se souhlasem `ad_user_data` pošle web při odeslání formuláře do Google značky otisk e-mailu jako uživatelská data
   (rozšířené konverze pro zájemce), jen u poptávky, která jde do exportu. Bez souhlasu nepošle nic. Čitelný e-mail neodchází v adrese ani v parametru události.
4. Jedna funkce rozhoduje, jestli je e-mail firemní. Používá ji export i každé další místo. Má testy.
5. Web vystavuje export firemních poptávek pro plánované nahrání v Google Ads, ve formátu, který Google Ads přijímá.
   Přednost má zdroj bez nového přístupu k API (soubor přes HTTPS s přihlášením, nebo Google tabulka). Rozhodne architekt.
6. Export obsahuje jen firemní poptávky se souhlasem, bez zkušebních poptávek. Čas konverze je čas odeslání formuláře.
7. Export není veřejný. Bez přihlášení vrací 401. Přihlašovací údaje jsou v proměnných prostředí, ne v repu.
8. Opakované nahrání stejné poptávky nevytvoří druhou konverzi.
9. Název konverzní akce je v nastavení na jednom místě a shoduje se s akcí v Google Ads.
10. Stávající měření z #21 funguje beze změny: lišta cookies, `generate_lead`, `contact_click`, žádná cookie před volbou.
11. Formulář funguje stejně pro návštěvníka. Chyba měření nikdy nezabrání odeslání poptávky.
12. Text stránky Ochrana osobních údajů (cs, en) má větu o předání otisku e-mailu a značky kliknutí do Google Ads.
    Text nesmí obsahovat hvězdičky (převodník seedu `src/seed/lexical.ts`).
13. Administrace Payload ukazuje u poptávky, jestli je firemní a jestli má značku kliknutí. Pole jsou jen pro čtení.
14. Testy: jednotkové pro funkci firemního e-mailu a export, e2e pro scénáře 1 až 3 (cs i en).
15. `implementation.md` popisuje kroky na produkci a přesné kroky v Google Ads (viz níže).

## Kroky v Google Ads (dělá Arthur po nasazení, ne vývojář)

- Přijmout podmínky pro zákaznická data a zapnout rozšířené konverze pro zájemce (Filip schválil, bod 31.2).
- Založit konverzní akci pro firemní poptávku (import, z kliknutí), primární.
- Změnit `robopipe.io (web) generate_lead` na sekundární.
- Nastavit plánované nahrání ze zdroje z kritéria 5.

Architekt popíše přesné nastavení (typ akce, počítání, okno, formát souboru, plán), aby to šlo udělat bez otázek.

## Mimo rozsah

- Hodnocení kvality poptávky obchodem, hodnota konverze, napojení na CRM.
- Změny kampaní, rozpočtů a nabídek.
- Přístup přes Google Ads API (nemáme developer token).
- Zpětné nahrání starých poptávek (nemají značku kliknutí ani souhlas).

## Jak se pozná úspěch

Zkušební průchod s testovací značkou kliknutí skončí řádkem v exportu. Google Ads přijme plánované nahrání bez chyby formátu.
