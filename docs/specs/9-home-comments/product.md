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

## Mimo rozsah

- Nové video na úvodní stránku (samostatný úkol).
- Jiné úpravy textů a pořadí sekcí.

## Vstupy

- Videa z provozu: `~/.openclaw/workspace/output/robopipe-web/hero-video/src/` (popis v `../catalogue.md`).
  Čárový kód je vidět například na vaničkách na pásu.
- Barvy a písmo překryvu: `~/.openclaw/workspace/output/robopipe-web/hero-video/scripts/` a `fonts/`.
