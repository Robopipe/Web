# Místní verze webu s komentáři pro Arthura

Zadání odsouhlasil Filip Molčík 11. 11. 2026 (issue #8).

## Cíl

Filip otevře místní verzi webu Robopipe, klikne na místo na stránce a napíše komentář. Arthur komentář hned zapracuje. Filip vidí výsledek na stejné stránce bez dalšího kroku.

## Komu to pomáhá

Filipovi. Dnes popisuje úpravu slovy v Chatu a čeká na nasazení. Nově ukáže přímo na místo a vidí výsledek do minuty.

## Dnešní stav (zjištěno 11. 11.)

- Web je Next.js 16 a Payload 3.86 (repo `Robopipe/Web`, produkce z větve `master` přes Coolify).
- Místní verze na Mac mini neběží trvale.
- Mac mini má adresu 192.168.1.62. Filip se do té sítě připojí přes VPN.

## Filipova rozhodnutí

1. Přístup: Filip otevírá web přes VPN na adrese Mac mini v místní síti. Tailscale ani veřejná adresa se nezřizují.
2. Hotové úpravy: Arthur je sbírá na vedlejší větvi. Na produkci jdou až po Filipově pokynu „nasaď“.
3. Rozsah úprav: vzhled a kód i texty a obrázky z administrace. Obsah z místní administrace přenese Arthur na produkci stejným pokynem „nasaď“.
4. Rychlost: malá úprava je vidět ideálně do 1 minuty od odeslání komentáře.

## Uživatelské scénáře

1. Filip otevře místní web. Vidí stejný obsah jako na produkci v den kopie.
2. Filip zapne režim komentářů, klikne na prvek a napíše „tenhle nadpis zkrať“. Odešle.
3. U komentáře vidí stav: čeká, pracuji, hotovo, nebo nejde (s důvodem).
4. Po úpravě se stránka sama načte znovu. Komentář zůstane připnutý u prvku se stavem hotovo.
5. Filip napíše větší požadavek (nová sekce). Arthur u komentáře odpoví, že úprava potrvá déle, a udělá ji s testem.
6. Filip s úpravou nesouhlasí. Odpoví u stejného komentáře a Arthur úpravu změní nebo vrátí.
7. Filip napíše v Chatu „nasaď“. Arthur pošle seznam úprav, po souhlasu je sloučí a přenese obsah na produkci.

## Akceptační kritéria

1. Místní web běží trvale na Mac mini a přežije restart stroje. Filip ho otevře přes VPN na adrese v místní síti.
2. Z internetu mimo místní síť není místní web dostupný.
3. Komentář se váže ke konkrétnímu prvku a ke stránce (adresa, jazyk). Arthur dostane text, adresu, prvek a jeho okolní text.
4. Komentář dorazí k Arthurovi do 10 sekund od odeslání bez Filipova dalšího kroku.
5. Malá úprava (text, barva, odsazení, výměna obrázku) je na stránce vidět do 60 sekund od odeslání. Měří se na 5 různých komentářích. Když Arthur lhůtu nestihne, stav u komentáře to říká.
6. Stav komentáře se mění bez ručního načtení stránky. Stránka se po úpravě načte znovu sama.
7. Úprava kódu vzniká jako commit na vedlejší větvi. Každý commit odkazuje na komentář.
8. Úprava obsahu (texty, obrázky v administraci) se zapisuje jen do místní databáze. Arthur vede seznam změn obsahu, podle kterého je přenese na produkci.
9. Vrstva komentářů není v kódu webu. Větev `master` ani obraz pro produkci neobsahují žádný její soubor ani závislost. Ověřuje to automatická kontrola před sloučením.
10. Místní web nemá přístup k zápisu do produkční databáze ani do produkčního úložiště médií. Místní prostředí neobsahuje produkční přístupové údaje k zápisu.
11. Bez Filipova pokynu „nasaď“ se na produkci nezmění nic: žádné sloučení do `master`, žádný zápis obsahu.
12. Komentáře a jejich historie přežijí restart. Filip vidí seznam všech komentářů se stavem.
13. Dva komentáře odeslané rychle po sobě se zpracují oba a ve správném pořadí.
14. Komentář funguje na počítači i na mobilu (šířka 390 bodů).

## Mimo rozsah

- Více uživatelů a přihlašování do vrstvy komentářů. Přístup chrání síť.
- Komentáře na produkčním webu.
- Automatické nasazení na produkci bez Filipova pokynu.
- Kreslení do stránky a nahrávání snímků ke komentáři.

## Otevřené body pro architekta

- Kde běží vrstva komentářů (samostatný program mimo repo webu, který ji do stránky vloží) a kde žije její kód.
- Jak komentář vzbudí Arthura tak, aby malá úprava stihla 60 sekund (Mac mini má 8 GB paměti).
- Jak vznikne kopie produkčního obsahu a jak se obnoví po nasazení.
- Jak se obsah z místní databáze přenese na produkci bez přepsání ručních změn v produkci.
- Režim místního webu: vývojový server s okamžitým načtením změn proti sestavené verzi.
