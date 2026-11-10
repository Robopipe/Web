## Co je AI kontrola kvality

AI kontrola kvality je vizuální kontrola, ve které o výsledku rozhoduje model hlubokého učení (deep learning). Model se z označených snímků naučí, jak vypadá dobrý kus a jak vypadají vady. Pak posoudí každý další kus, který projede pod kamerou.

## V čem se liší od pravidlového strojového vidění

Klasické strojové vidění pracuje s pravidly. Někdo nastaví, kde na snímku hledat hranu, jaký odstín má mít barva nebo jak velká smí být skvrna. To funguje u pevných dílů, které vypadají pokaždé stejně.

Sendvič, bageta nebo ručně skládané balení ale vypadají pokaždé trochu jinak. AI model se proto neučí pravidla, ale příklady. Když se změní produkt nebo dodavatel suroviny, přidáte nové snímky a model přetrénujete. Pravidla nepřepisujete.

## Jak se Robopipe učí na vašich vzorcích

1. **Nasnímáte** sadu snímků přímo na lince.
2. **Označíte** je v aplikaci Studio. U klasifikace třídíte náhledy na OK a NOK. U detekce kreslíte rámečky kolem vad.
3. **Natrénujete** model. Trénink běží na řídicí jednotce nebo ve vaší vlastní infrastruktuře.
4. **Kontrolujete.** Model za provozu vyhodnotí každý kus do 50 ms přímo u linky.

Průvodce vás provede od začátku do konce a strojové učení znát nepotřebujete. Co projde, určujete vy. Všechno je verzované: datasety, anotace, konfigurace i váhy modelu. K předchozímu modelu se vrátíte jedním kliknutím.

Označování snímků zrychlí [automatická anotace](/cs/automaticka-anotace). Robopipe Vision navrhne rámečky a vy je jen zkontrolujete.

## Co to přineslo zákazníkům

- **Crocodille** nasadila Robopipe na tři sendvičové linky a v prvním měsíci snížila zmetkovitost zhruba o třetinu. Týmu jsme ukázali, jak označit první produkt. Každý další si přidali sami.
- **Wolfberry** počítá kapsle v každé dóze s přesností 99,5 %.
- **MG Servis** kontroluje každé balení s přesností detekce 95 %.

## Kamera a model patří k sobě

Model potřebuje dobré snímky. Jak vypadá kamera na lince, popisuje stránka [kamerová kontrola kvality](/cs/kamerova-kontrola-kvality). Širší souvislosti najdete na stránkách [strojové vidění](/cs/strojove-videni) a [počítačové vidění](/cs/pocitacove-videni).
