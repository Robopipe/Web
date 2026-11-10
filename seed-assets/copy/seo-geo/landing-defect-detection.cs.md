## Jaké vady kamera najde

Detekce vad kamerou hlídá to, co by jinak musel vidět člověk u pásu. Kamera nasnímá každý kus a model na snímku pozná, jestli kus odpovídá dobrému vzoru. Typické úlohy z provozů, kde Robopipe běží:

- **Kontrola povrchu.** Kamera pozná, když povrch výrobku neodpovídá dobrému kusu.
- **Tvar a vzhled výrobku.** Chybějící, špatně umístěné nebo zaměněné suroviny na kompletovaném produktu.
- **Cizí předmět v balení.** Do obalu se nesmí dostat nic, co tam nepatří.
- **Těsnost svaru obalu.** Kamera zkontroluje svar u každého balení.

## Jak detekce vad kamerou funguje

O každém kusu rozhoduje model hlubokého učení. Model se učí na snímcích vašich dobrých a vadných kusů. Pravidla pro každou vadu proto nikdo nepíše. Když se objeví nový druh vady, přidáte snímky a model přetrénujete.

Obor, do kterého detekce vad patří, se česky jmenuje strojové vidění (anglicky machine vision). Co to znamená a jak se liší od počítačového vidění, vysvětluje [průvodce strojovým viděním](/cs/blog/co-je-vizualni-system-srozumitelny-pruvodce-strojovym-videnim-ve-vyrobe). Kameru, řídicí jednotku a postup nasazení popisuje stránka [kamerová kontrola kvality](/cs/kamerova-kontrola-kvality).

## Co se stane s vadným kusem

Obsluha vidí výsledek každého kusu na displeji přímo na hale. Řídicí jednotka může sepnout váš stávající vyhazovač nebo signální maják, takže vadný kus z linky odejde hned. Snímek každého kusu zůstane v archivu a vadu dohledáte i zpětně.

Vedoucí výroby sleduje nejčastější vady a podíl OK kusů v analytickém portálu. Jak živá kontrola pomáhá snížit zmetkovitost, popisuje článek [Jak živá inspekce snižuje zmetkovitost](/cs/blog/snizte-zmetkovitost).

Když je vadou chybějící nebo přebývající díl v balení, jde o [kontrolu kompletnosti balení](/cs/kontrola-kompletnosti-baleni).
