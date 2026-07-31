Robopipe běží na čtyřfázové pipeline a každé nasazení — sendvičová linka i třídička balíků — jede ve stejné smyčce. Pojďme se podívat, co jednotlivé fáze doopravdy dělají.

## 1 — Snímání

12MP kamera (1/2,3", pixely 1,55 µm) streamuje snímky spouštěné linkou: pulzem enkodéru, světelnou závorou, nebo prostě snímkovou frekvencí. Nasnímané série se označují produktem a šarží — dataset tedy sestavíte tak, že necháte linku pár minut běžet jako obvykle. Surové snímky se ukládají do lokálního úložiště řídicí jednotky — nic neopouští závod, pokud sami nechcete.

## 2 — Označování

Anotační rozhraní je navržené pro obsluhu linky, ne pro anotační farmy. U klasifikace třídíte náhledy na hromádky OK/NOK; u detekce kreslíte rámečky kolem typů vad, na kterých vám záleží. Augmentace — rotace, expozice, rozostření — se generují automaticky, takže stovka označených snímků v tréninku obvykle vydá za tisícovku.

## 3 — Trénování

Trénink běží na GPU řídicí jednotky nebo ve vaší vlastní infrastruktuře — konfigurace tréninku je JSON, který si můžete prohlédnout, přednastavit nebo přepsat klíč po klíči. Typický model produktu se natrénuje za 15–40 minut. Každý běh loguje metriky a dashboard vám ukáže precision a recall na odložené testovací sadě dřív, než model pustíte do výroby.

> [!callout]
> Všechno je verzované: datasety, anotace, konfigurace i váhy. K předchozímu modelu se vrátíte jedním kliknutím a dva modely můžete nechat běžet A/B na stejném streamu, dokud se nerozhodnete.

## 4 — Inference

Za provozu klasifikuje model každý kus do 50 ms přímo na jednotce AI PLC. Verdikty spínají fyzické výstupy — vyhazovač, signální maják — a publikují se přes Modbus nebo EtherCAT jako jakákoli jiná hodnota ze senzoru. Stejné události se objevují na displeji na hale i v analytickém portálu, takže data o kvalitě mají jediný zdroj pravdy od pásu po zasedačku.

Protože je celá smyčka otevřená, mezi vámi a vašimi rozhodnutími o kvalitě nestojí žádná černá skříňka: konfigurace si přečtete, datasety vyexportujete a modely si odnesete s sebou. Přesně o to jde.
