## Co je počítačové vidění

Počítačové vidění (computer vision) je obor umělé inteligence, který z obrazu získává informace. Kamera dodá snímek a model řekne, co na něm je, kde to je a kolik toho je. Když se stejná technika použije na výrobní lince, říká se jí [strojové vidění](/cs/strojove-videni).

## Co počítačové vidění umí

- **Klasifikace.** Model zařadí celý snímek do kategorie, třeba OK nebo NOK. Takto Robopipe rozpozná i produkt na fotce a doplní k němu údaje do katalogu.
- **Detekce objektů.** Model najde na snímku jednotlivé objekty a označí je rámečkem. Tak se hledají vady, cizí předměty nebo chybějící suroviny.
- **Počítání.** Z detekce je jen krok k počtu kusů. Tak Robopipe ověřuje, že v každé dóze je správný počet kapslí.

Z těchto úloh se skládají konkrétní kontroly. Na jedné bagetě jich Robopipe u zákazníka Crocodille dělá 19.

## Kde se počítačové vidění použije v průmyslu

- **Potravinářství:** chybějící, špatně umístěné nebo zaměněné suroviny, cizí předměty, kontrola porcí a míry naplnění.
- **Farmacie a zdravotnictví:** míra naplnění, kompletnost kapslí a blistrů, víčka, plomby a uzávěry, etikety a čitelnost kódu šarže. Ke každé kontrole vzniká obrazový záznam pro audit.
- **Retail a e-commerce:** tagování produktových fotek a zalistování nových produktů z fotky.
- **Logistika:** skoronehody vysokozdvižných vozíků a chodců, chybějící ochranné pomůcky, zablokované únikové východy a překážky v uličkách.

## Jak počítačové vidění nasadí Robopipe

Robopipe spojuje celý postup do jedné pipeline: nasnímat, označit, natrénovat a vyhodnotit. Utěsněná kamera snímá na lince, snímky označíte v aplikaci Studio a model běží na řídicí jednotce AI PLC přímo u linky.

Celá pipeline je otevřená. Konfigurace si přečtete, datasety vyexportujete a modely si odnesete s sebou. Robopipe je i jako open source, takže si ho můžete provozovat na vlastní infrastruktuře. Běží i na Raspberry Pi.

Jak se z počítačového vidění stane kontrola kvality na vaší lince, popisují stránky [AI kontrola kvality](/cs/ai-kontrola-kvality) a [kamerová kontrola kvality](/cs/kamerova-kontrola-kvality).
