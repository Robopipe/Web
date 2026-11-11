# Úvodní stránka: Filipovy komentáře 11. 11. 2026

Issue: Robopipe/Web#9. Zdroj: komentáře Filipa k https://robopipe.io/cs z doplňku onUI.

## Cíl

Úvodní stránka je podle Filipa vizuálně přeplácaná. Návštěvník má nahoře vidět méně prvků.
Karta „Kontrola etiket“ má ukazovat skutečný záběr z provozu, ne ilustraci.

## Komentáře (číslování podle Filipa)

1. Selektor `section.container-site.py-12:nth-of-type(3) > div.border-t.border-border-12`.
   Pruh „Jsme součástí“ (logo Česká inovační platforma) pod logy zákazníků.
   Filip: „toto bych chtel na uvodni strance presunout nekam vic dolu at to tady neni tak vizualne preplacane“.
2. Selektor `section:nth-of-type(6) … a:nth-of-type(4) … img`. Obrázek karty „Kontrola etiket“
   v sekci „Kontrola kvality ve výrobě podle úlohy“.
   Filip: „sem dat nejaky obrazek z provozu, pozuij nejaky zaber z videa na kterem jde videt carovy kod,
   pridej overlay s OCR vyctenim toho kodu“.
3. Selektor `section.bg-surface-dark:nth-of-type(8)`. Sekce „Automatická anotace: rámečky navrhne AI,
   vy je schválíte.“
   Filip: „tuto sekci bych vynechal uz mi to prijde dost preplacane, auto anotaci muzem spis zminovat
   nekde v textu s hyperlinkem“.
4. Selektor `div.space-y-5 > div:nth-of-type(2)`. Blok „Jsme součástí“ v patičce (`src/components/Footer.tsx`).
   Filip: „toto je vizualne trochu nanahnane, pridal bych white-space ze shora“.

## Akceptační kritéria

1.1 Pruh „Jsme součástí“ není mezi logy zákazníků a sekcí „AI kontrola kvality, kterou zvládne váš vlastní tým“.
1.2 Pruh je na úvodní stránce níž: za sekcí „Příběh zákazníka“ a před sekcí „Z blogu“. Vzhled pruhu se nemění.
2.1 Karta „Kontrola etiket“ na úvodní stránce má obrázek ze skutečného záběru z provozu s čitelným čárovým kódem.
2.2 Obrázek má překryv ve stylu značky (lime `#cef94c`, tmavý text `#1a2410`, písmo Space Mono):
    rámeček kolem kódu a štítek s vyčtenou hodnotou.
2.3 Hodnota ve štítku je skutečně vyčtená z toho snímku (dekodér čárových kódů nebo OCR) a ověřená druhým
    způsobem. Vymyšlená hodnota je chyba. Když žádný záběr nemá čitelný kód, vývojář to napíše a nic nevymýšlí.
2.4 Obrázek je ostrý v poměru stran karty (4:3), bez procent a bez skóre.
2.5 Stejný obrázek platí pro českou i anglickou verzi. Alt text zůstává.
3.1 Sekce „Automatická anotace: rámečky navrhne AI, vy je schválíte.“ na úvodní stránce není (cs, en).
3.2 Stránka `/cs/automaticka-anotace` (a anglická verze) funguje dál. Karta „Automatická anotace“
    v sekci úloh zůstává.
3.3 V textu úvodní stránky je jedna věta o automatické anotaci s odkazem na stránku automatické anotace
    (cs i en). Doporučené místo: karta „Nastavíte si sami“ nebo krok o označení produktu.
4.1 Blok „Jsme součástí“ v patičce má nad sebou zřetelně víc volného místa než dnes, na mobilu i na počítači.
5.1 Změny platí pro `/cs` i `/en`. Ostatní stránky se nemění (kromě patičky, která je společná).
5.2 Nic se nedostane do produkce bez Filipova pokynu. To platí i pro obsah v Payload (produkční databáze).

## Kolo 2 (Filip 11. 11. 2026, 12:51)

Filip: sekce „AI kontrola kvality, kterou zvládne váš vlastní tým“, „Postaveno pro váš obor“ a „Kontrola kvality
ve výrobě podle úlohy“ jsou si podobné (mřížky karet) a jdou hned za sebou. Nepůsobí to hezky. Chce je rozložit
po stránce.

### Akceptační kritéria kola 2

6.1 Pořadí úvodní stránky (cs i en): úvod s videem, loga zákazníků, „AI kontrola kvality, kterou zvládne váš
    vlastní tým“, „AI kontrola v provozu za jediný den“ (tmavá sekce s čísly), „Postaveno pro váš obor“,
    příběh zákazníka, „Kontrola kvality ve výrobě podle úlohy“, „Jsme součástí“, Z blogu a časté otázky, výzva k akci.
6.2 Žádné dvě mřížky karet nejdou hned za sebou.
6.3 Střídání pozadí sekcí zůstane čisté: žádné dvě sousední sekce nemají rušivý přechod (dvojitý okraj, dvojitá
    mezera, stejné tmavé pozadí hned za sebou). Platí na 375 px i 1440 px.
6.4 Skript obsahu nastaví pořadí idempotentně. Pořadí, které Filip ručně změnil v administraci, skript nepřepíše
    (stejný princip jako u pruhu „Jsme součástí“).
6.5 Texty a obsah sekcí se nemění. Ostatní kritéria kola 1 platí dál (pruh „Jsme součástí“ je za sekcí úloh
    a před blogem).
6.6 Chyby C1, C2 a C3 z `test-report.md` jsou opravené a mají testy.

## Kolo 3 (Filip 11. 11. 2026, 13:01)

Filip poslal 6 komentářů ke stránce `/cs/case-studies`. Platí i pro `/en/case-studies`.

### Akceptační kritéria kola 3

7.1 Hlavní fotka hlavního případu (Crocodille) je skutečný záběr z videa z provozu, ne obrázek vygenerovaný AI.
    Na fotce nejsou tváře lidí ani cizí značky. Alt text popisuje fotku v cs i en.
7.2 Karta hlavního případu v seznamu neukazuje údaj „95 % přesnost detekce“.
7.3 Třetí karta v seznamu neukazuje údaj „95 % přesnost detekce“. Údaj „5 různých kontrol na balení“ zůstane.
7.4 Údaje na kartě v seznamu jsou na 1440 px vedle sebe v jednom řádku (druhá karta: „< 1 min“ a „1 ušetřený
    celý úvazek“). Na 375 px se smí zalomit pod sebe. Nic nepřeteče z karty.
7.5 Citát (Vedoucí kvality, Crocodille) je nad sekcí „Řešení podle úlohy“.
7.6 Nadpis výzvy je „Třeba je na řadě právě váš provoz.“, anglicky „Your operation could be next.“
7.7 Detail případu se nemění: údaj „95 %“ tam zůstane. Skript obsahu běží idempotentně a nepřepíše fotku
    ani údaje, které někdo změnil ručně v administraci. Kritéria kol 1 a 2 platí dál.

## Mimo rozsah

- Nové video na úvodní stránku (samostatný úkol).
- Jiné úpravy textů a pořadí sekcí (kromě kol 2 a 3).

## Vstupy

- Videa z provozu: `~/.openclaw/workspace/output/robopipe-web/hero-video/src/` (popis v `../catalogue.md`).
  Čárový kód je vidět například na vaničkách na pásu.
- Barvy a písmo překryvu: `~/.openclaw/workspace/output/robopipe-web/hero-video/scripts/` a `fonts/`.
