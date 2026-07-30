Robopipe běží na čtyřfázové pipeline a každé nasazení — sendvičová linka i třídička balíků — jede ve stejné smyčce. Tady je, co jednotlivé fáze skutečně dělají.

## 1 — Snímání

12MP kamera (1/2,3", pixely 1,55 µm) streamuje snímky spouštěné linkou: pulzem enkodéru, světelnou závorou, nebo prostě snímkovou frekvencí. Snímací relace se značkují podle produktu a šarže, takže sestavit dataset znamená nechat linku pár minut běžet jako obvykle. Surové snímky se ukládají do lokálního úložiště kontroléru — nic neopouští závod, pokud sami nechcete.

## 2 — Označování

Anotační rozhraní je navržené pro obsluhu linky, ne pro anotační farmy. U klasifikace třídíte náhledy na hromádky OK/NOK; u detekce kreslíte rámečky kolem několika tříd vad, na kterých vám záleží. Augmentace — rotace, expozice, rozostření — se generuje automaticky, takže stovka označených snímků v tréninku obvykle vydá za tisícovku.

## 3 — Trénování

Trénink běží na GPU kontroléru nebo ve vaší vlastní infrastruktuře — konfigurace tréninku je JSON, který si můžete prohlédnout, přednastavit nebo přepsat klíč po klíči. Typický model produktu zkonverguje za 15–40 minut. Každý běh loguje metriky a dashboard ukazuje precision/recall na odložené sadě, než vám dovolí nasadit.

> [!callout]
> Všechno je verzované: datasety, anotace, konfigurace i váhy. Návrat k předchozímu modelu je jedno kliknutí a dva modely mohou běžet A/B na stejném streamu, zatímco se rozhodujete.

## 4 — Inference

Za běhu model klasifikuje každý kus do 50 ms přímo na AI PLC kontroléru. Verdikty spínají fyzické výstupy — vyhazovač, signální maják — a publikují se přes Modbus nebo EtherCAT jako jakákoli jiná hodnota ze senzoru. Stejné události se objevují na displeji na hale i v analytickém portálu, takže data o kvalitě mají jediný zdroj pravdy od pásu po zasedačku.

Protože je celá smyčka otevřená, mezi vámi a vašimi rozhodnutími o kvalitě není žádná černá skříňka: konfigurace si přečtete, datasety vyexportujete a modely si odnesete s sebou. Přesně o to jde.
