# #43 Konverze „Uzavřený zákazník“: implementace

## Co je hotové

- `leads` má v postranním panelu pole `closedCustomer` (Customer closed) a `closedAt` (Closed at). Hook `closedAtOnChange` vyplní čas při prvním zaškrtnutí. Další uložení, odškrtnutí a nové zaškrtnutí čas nemění. Kolekce je jen pro přihlášené, anonymní REST dá 403.
- `site-settings.measurement` má `leadConversionValue` (5000), `closedCustomerConversionName` (`Uzavreny zakaznik`), `closedCustomerConversionValue` (25000), `conversionCurrency` (`CZK`).
- Export má na konci dva nové sloupce: `Conversion Value`, `Conversion Currency`. Řádek poptávky má hodnotu 5000 a čas `createdAt`, jinak beze změny.
- Druhý řádek `lead-<id>-closed`, akce `Uzavreny zakaznik`, hodnota 25000, čas `closedAt`. Vznikne jen pro poptávku, která projde pravidlem z #26, má zaškrtnuté pole, čas uzavření a `gclid`. Samotný `gbraid` nebo `wbraid` řádek nedá.
- Chybí-li název, hodnota nebo měna (kód ISO o 3 písmenech), export vrátí 500.
- Migrace `20261113_081752_closed_customer`. Nové sloupce mají výchozí hodnoty, existující řádky se vyplní samy.
- Přihlášení exportu (#28) je beze změny.

## Odchylky

- Text chyby 500 je nyní `Conversion name, value or currency missing in site-settings.measurement` (dříve jen název).
- Poptávka bez `gclid` dál dává řádek „Firemni poptavka (import)“ (scénář 4 z #26, jen otisk e-mailu). Řádek „Uzavreny zakaznik“ nedá.

## Jak ověřit

1. `pnpm payload migrate`, potom `pnpm test:int` (soubor `tests/int/closedCustomer.int.spec.ts`).
2. V administraci otevřete poptávku a zaškrtněte „Customer closed“. Uložte. „Closed at“ má čas uložení.
3. Stáhněte `/api/google-ads/company-leads.csv` s přihlášením. Poptávka s `gclid` bez zaškrtnutí má 1 řádek, se zaškrtnutím 2 řádky.

Ověřeno 13. 11. 2026 na místní instanci (DB `robopipe_43`, port 3943): lead 90 (gclid, bez zaškrtnutí) 1 řádek 5000. Lead 91 (gclid, zaškrtnuto) 2 řádky 5000 + 25000, druhý s časem uzavření. Lead 92 (bez gclid, zaškrtnuto) jen řádek poptávky. Snímek: `screens/lead-detail-closed.png`.

## Kroky v Google Ads (Arthur, po nasazení)

Neověřil jsem je v rozhraní Google Ads. Postup je podle kapitoly „Kroky v Google Ads“ v `docs/specs/26-offline-conversions/implementation.md`.

1. Tools, Data manager, připojení `robopipe.io company leads`. Do mapování přidejte `Conversion Value` → Conversion value a `Conversion Currency` → Currency code. Uložte.
2. Akce `Firemni poptavka (import)`: Value změňte na „Use different values for each conversion“. Starší importované konverze hodnotu nedostanou. Stejné Order ID Google zahodí jako kopii, nic se nepřepíše (žádný RESTATE).
3. Vytvořte novou akci: Import, „CRMs, files, or other data sources“, „Track conversions from clicks“. Data source: stejné připojení HTTPS.
4. Nastavení nové akce: název přesně `Uzavreny zakaznik`, cíl „Converted lead“ (nebo „Purchase“), Value „Use different values for each conversion“, Count „One“, okno 90 dní, Attribution Data-driven, Primary action.
5. Když připojení filtruje řádky podle `Conversion Name`, přidejte filtr i pro `Uzavreny zakaznik`.
6. Goals, Summary: akci `robopipe.io (web) generate_lead` nastavte jako Secondary action, pokud už není.
7. Po prvním běhu ověřte v Diagnostics obou akcí přijaté řádky bez chyby formátu.

## Co nešlo ověřit

- Rozhraní Google Ads a skutečný import souboru s novými sloupci.
- E2E: 192 prošlo, 1 skip. 1 test (`seo-stage2` odkazy) selhal na 404 blogového článku, který v místní kopii databáze chybí. Změna se ho netýká.

## Dodatek #46: hodnota uzavřeného zákazníka

- Pole `leads.closedValue` („Closed value“, číslo, minimum 0) je v postranním panelu pod „Closed at“. Admin ho ukáže jen při zaškrtnutém `closedCustomer`.
- Řádek „Uzavreny zakaznik“ má hodnotu `closedValue`. Prázdné pole dá výchozí `closedCustomerConversionValue` (25 000). Řádek poptávky má dál 5 000.
- Migrace `20261113_090651_closed_value` přidá sloupec `leads.closed_value` bez výchozí hodnoty.
- Ověřeno na místní instanci: hodnota 90 000 dá 90 000, prázdné pole dá 25 000, záporné číslo vrátí 400. Snímek: `docs/specs/46-closed-value/screens/lead-closed-value.png`.
- V Google Ads není třeba nic měnit: akce už má „Use different values for each conversion“.
