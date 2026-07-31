/**
 * 2026-07-31 Czech copy pass: the original cs texts read like translated
 * English (calques such as „umývané zóny", „skóre kvality", „plán",
 * „poinstalační", „Otázky, zodpovězené."). Each pair below is an exact
 * full-string replacement [old, new] applied
 *  - to the cs locale of the production database via src/seed/updateCsCopy.ts,
 *  - textually to src/seed/index.ts, so a fresh seed produces the same copy.
 * Slugs and URLs are deliberately untouched.
 */
export const CS_COPY_FIXES: [string, string][] = [
  // --- FAQs (home) ---
  [
    'Ano. Přidání produktu je samoobslužné — ukažte pár správných kusů a kontrola začne. Žádní inženýři ani návštěvy dodavatele.',
    'Ano. Nový produkt si přidáte sami — kameře stačí ukázat několik správných kusů a kontrola může začít. Bez techniků a bez čekání na výjezd dodavatele.',
  ],
  ['Přežije to naši umývanou zónu?', 'Vydrží to sanitaci a tlakové mytí?'],
  [
    'Hardware má krytí IP67 a je plně utěsněný proti páře, ostřiku i chladírnám.',
    'Ano. Hardware má krytí IP67 a je plně utěsněný — nevadí mu pára, tlakové mytí ani mráz v chladírně.',
  ],
  [
    'Živý dashboard na hale s dnešní úspěšností, nejčastějšími vadami a okamžitou zpětnou vazbou.',
    'Velký přehled přímo na hale: kolik kusů dnes prošlo, jaké vady se objevují nejčastěji a okamžitou zpětnou vazbu k právě běžící výrobě.',
  ],
  [
    'Většina linek jede do jednoho dne — namontovat, přidat produkt, spustit.',
    'Většina linek kontroluje do jednoho dne od instalace — namontujeme kameru, vy přidáte produkt a jede se.',
  ],

  // --- FAQs (pricing) ---
  [
    'Ano. IP67 kamera i AI PLC kontrolér jsou v každém plánu zahrnuty formou pronájmu — žádný samostatný nákup hardwaru.',
    'Ano. Kamera s krytím IP67 i řídicí jednotka AI PLC jsou v každém tarifu zahrnuté formou pronájmu — hardware zvlášť nekupujete.',
  ],
  ['Co zahrnuje instalace na místě?', 'Co všechno instalace zahrnuje?'],
  [
    'Náš tým namontuje utěsněnou kameru nad vaši linku, zapojí ji a zaškolí operátory. V ceně u plánů Pro a Enterprise.',
    'Přijedeme k vám, namontujeme utěsněnou kameru nad linku, zapojíme ji a zaškolíme obsluhu. U tarifů Pro a Enterprise je instalace v ceně.',
  ],
  ['Můžeme začít v malém a škálovat?', 'Můžeme začít s jednou kamerou a postupně přidávat?'],
  [
    'Přesně k tomu je plán Standard — ověřte si to na jedné kameře a kdykoli budete připraveni, přidávejte další kamery nebo přejděte výš, bez nutnosti nové instalace.',
    'Přesně na to je tarif Standard — všechno si vyzkoušíte na jedné kameře a další můžete kdykoli přidat, případně přejít na vyšší tarif. Nic se znovu neinstaluje.',
  ],
  ['Integrujete se s naším ERP?', 'Napojíte se na naše ERP?'],
  [
    'V plánu Enterprise propojíme Robopipe s vaším ERP a MES přes Modbus, EtherCAT a Ethernet a přizpůsobíme modely i hardware vaší lince.',
    'Ano. V tarifu Enterprise propojíme Robopipe s vaším ERP i MES přes Modbus, EtherCAT nebo Ethernet a modely i hardware přizpůsobíme přímo vaší lince.',
  ],

  // --- Testimonials ---
  [
    'Tým na hale konečně vidí své skóre kvality živě. Na reklamaci od zákazníka už nikdo nečeká.',
    'Lidé na hale konečně vidí kvalitu své práce v reálném čase. Nikdo už nečeká, až přijde reklamace od zákazníka.',
  ],
  [
    'Tým na hale konečně vidí své skóre kvality živě — a kvalita díky tomu šla nahoru. Ukázali nám, jak označit jeden produkt; všechny další už přidáváme sami.',
    'Lidé na hale konečně vidí kvalitu své práce v reálném čase — a kvalita díky tomu šla nahoru. Stačilo, aby nám ukázali, jak označit první produkt; všechny další už si přidáváme sami.',
  ],

  // --- Case studies ---
  [
    'Crocodille vyrábí čerstvé sendviče a bagety rychlostí 3 600 kusů za hodinu na linku. Instalace kamery zvedla kvalitu samotné výroby: operátoři vidí kvalitu své práce v reálném čase na displeji na hale — a jsou podle ní hodnoceni. Ukázali jsme týmu, jak označit jeden produkt; každý další už si přidali sami.',
    'Crocodille vyrábí čerstvé sendviče a bagety tempem 3 600 kusů za hodinu na každé lince. Kamera nad linkou zvedla kvalitu samotné výroby: obsluha vidí výsledky své práce v reálném čase na displeji přímo na hale — a je podle nich hodnocená. Týmu jsme ukázali, jak označit první produkt; každý další už si přidali sami.',
  ],
  ['Každá dóza naplněná přesným počtem kapslí.', 'V každé dóze přesně tolik kapslí, kolik má být.'],
  [
    'Wolfberry plní doplňky stravy do dóz. Robopipe sleduje plnicí linku a ověřuje, že každá dóza odchází s přesným počtem kapslí. Každé plnění navíc dokumentuje obrazový záznam, takže špatně napočítaná dóza se k zákazníkovi nikdy nedostane.',
    'Wolfberry plní doplňky stravy do dóz. Robopipe hlídá plnicí linku a u každé dózy ověří, že odchází se správným počtem kapslí. Každé plnění je navíc doložené snímkem, takže špatně naplněná dóza se k zákazníkovi vůbec nedostane.',
  ],
  ['dóz zdokumentováno', 'zdokumentovaných dóz'],
  [
    'Celý úvazek ručního zadávání dat převzala AI.',
    'Zalistování produktů: práci na celý úvazek převzala AI.',
  ],
  [
    'Zalistovat nový produkt bývalo prací na celý úvazek jednoho člověka: vyfotit ho, identifikovat, dohledat parametry na webu a přepsat všechno do systému — pořád dokola. Robopipe dnes fotku pořídí, položku klasifikuje, informace dohledá online a záznam vyplní automaticky.',
    'Zalistování nových produktů dřív vytížilo jednoho člověka na plný úvazek: produkt vyfotit, poznat, dohledat parametry na webu a všechno přepsat do systému — pořád dokola. Dnes Robopipe fotku pořídí, položku rozpozná, informace si dohledá na internetu a záznam vyplní sám.',
  ],
  ['automatizovaný celý úvazek', 'ušetřený celý úvazek'],
  [
    'Kvalita balení kontrolovaná na 100 % — bez nákladů na ruční kontrolu.',
    'Stoprocentní kontrola balení — bez jediného člověka u pásu navíc.',
  ],
  [
    'Zákazníci vracejí produkty, které nejsou stoprocentní — a ruční kontroly kvality jsou drahé a nikdy nezachytí všechno. Robopipe kontroluje každé balení: těsnost svaru, fazole správně zabalené ve slanině a žádné cizí předměty uvnitř obalu.',
    'Zákazníci vracejí každý kus, který není stoprocentní — a ruční kontrola je drahá a stejně nikdy nezachytí všechno. Robopipe proto kontroluje každé balení: těsnost svaru, fazole správně zabalené ve slanině i to, že se do obalu nedostal žádný cizí předmět.',
  ],

  // --- Blog posts (title / excerpt / SEO stored in the DB) ---
  [
    'Technický průchod otevřenou smyčkou nasnímat → označit → natrénovat → vyhodnotit, která pohání každé nasazení.',
    'Technická procházka otevřenou smyčkou nasnímat → označit → natrénovat → vyhodnotit, na které stojí každé nasazení.',
  ],
  [
    'Srozumitelný průchod čtyřmi fázemi Robopipe — snímání, označení, trénink, inference — a tím, co každá z nich skutečně dělá na reálné výrobní lince.',
    'Srozumitelně o čtyřech fázích Robopipe — snímání, označování, trénink a inference — a o tom, co každá z nich doopravdy dělá na reálné výrobní lince.',
  ],
  [
    'Jak se samoobslužná inspekce zaplatí v prvním měsíci — aniž by taktu přidala jedinou sekundu.',
    'Jak se kamerová kontrola zaplatí už v prvním měsíci — aniž by k taktu linky přidala jedinou sekundu.',
  ],
  [
    'Proč zmetkovitost ve výrobě potravin snižuje okamžité zachycení vad — ne přesnější kontrola — a jak živé skóre kvality mění chování operátorů.',
    'Zmetkovitost ve výrobě potravin nesnižuje přesnější kontrola, ale okamžité zachycení vad. A živý přehled kvality mění i to, jak se chová obsluha linky.',
  ],
  [
    'Proč zpětná vazba v reálném čase poráží směnové reporty — a co se změnilo, když operátoři viděli svou úspěšnost živě.',
    'Proč zpětná vazba v reálném čase vyhrává nad směnovými reporty — a co všechno se změnilo, když obsluha uviděla svou úspěšnost naživo.',
  ],
  [
    'Jak zobrazení skóre kvality v reálném čase na hale mění inspekci ze směnového reportu v něco, na co operátoři reagují okamžitě.',
    'Jak živé skóre kvality na hale mění kontrolu ze směnového reportu v něco, na co obsluha reaguje okamžitě.',
  ],
  [
    'Automatické tagování produktů: nechte počítačové vidění spravovat metadata katalogu',
    'Automatické tagování produktů: svěřte metadata katalogu počítačovému vidění',
  ],
  [
    'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a chybové — a špatná metadata pohřbí produkty ve vyhledávání. AI označování řeší všechny tři problémy.',
    'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a plné chyb — a kvůli špatným metadatům se produkty ztrácejí ve vyhledávání. AI tagování řeší všechny tři problémy najednou.',
  ],
  [
    'Jak AI označování obrázků nahrazuje pomalé a chybové ruční tagování — extrahuje barvu, materiál a styl a zlepšuje vyhledávání i SEO e-shopu ve velkém.',
    'Jak AI tagování obrázků nahrazuje pomalé a chybové ruční tagování — rozpozná barvu, materiál i styl a ve velkém zlepšuje vyhledávání i SEO e-shopu.',
  ],

  // --- Contact page ---
  ['Pojďme dát kameru na váš proces.', 'Pojďme dát kameru na vaši linku.'],
  [
    'Napište nám, co vyrábíte, a ozveme se do jednoho pracovního dne — obvykle rovnou s první představou, jak by inspekce fungovala na vašem produktu.',
    'Napište nám, co vyrábíte, a do jednoho pracovního dne se vám ozveme — většinou rovnou s první představou, jak by kontrola vašeho produktu mohla vypadat.',
  ],
  ['Váš první krok k vizuální kontrole 24/7.', 'První krok ke kontrole kvality, která běží 24/7.'],
  [
    'Promluvte si s Robopipe o vizuální kontrole kvality ve vašem provozu. Objednejte si 30minutové demo, napište obchodu nebo zavolejte do pražského sídla.',
    'Domluvte si s Robopipe půlhodinové demo vizuální kontroly kvality pro váš provoz, napište obchodnímu týmu nebo zavolejte do naší pražské kanceláře.',
  ],

  // --- Pricing page ---
  [
    'Hardware, instalace i deep-learning inspekce v jedné předvídatelné měsíční ceně. Začněte s jednou kamerou a rozšiřujte, až budete připraveni.',
    'Hardware, instalace i AI kontrola kvality v jedné pevné měsíční ceně. Začnete s jednou kamerou a další přidáte, kdy budete chtít.',
  ],
  [
    'Ověřte si to na jedné kameře, než začnete škálovat.',
    'Vyzkoušejte si všechno na jedné kameře, než přidáte další.',
  ],
  [
    'Samoobslužné nastavení produktů v aplikaci Studio',
    'Nové produkty si nastavíte sami v aplikaci Studio',
  ],
  [
    'Dashboard na halu v reálném čase — funguje na jakémkoli tabletu',
    'Živý přehled výroby na hale — poběží na jakémkoli tabletu',
  ],
  ['E-mailová podpora', 'Podpora e-mailem'],
  ['Vše z plánu Standard a navíc', 'Vše z tarifu Standard a navíc'],
  [
    'Pokročilá analytika (prostoje, porovnání závodů, statistiky po kusech)',
    'Pokročilá analytika (prostoje, porovnání závodů, statistiky po jednotlivých kusech)',
  ],
  ['Neomezené tréninky modelů', 'Neomezený počet tréninků modelu'],
  ['Instalace na místě a zaškolení operátorů', 'Instalace u vás a zaškolení obsluhy'],
  ['Poinstalační servis a prioritní podpora', 'Servis po instalaci a prioritní podpora'],
  [
    'Nasazení napříč závody, zapojené do vašich systémů.',
    'Nasazení napříč závody, napojené na vaše systémy.',
  ],
  [
    'objemové ceny · vyhrazený success manažer',
    'množstevní ceny · vyhrazená kontaktní osoba',
  ],
  ['Vše z plánu Pro a navíc', 'Vše z tarifu Pro a navíc'],
  ['Integrace ERP a MES', 'Napojení na ERP a MES'],
  [
    'Všechny plány zahrnují hardware s krytím IP67 do umývaných provozů, OTA aktualizace a neomezený počet operátorů. Ceny bez DPH.',
    'Všechny tarify zahrnují hardware s krytím IP67 pro mokré provozy, aktualizace na dálku a neomezený počet operátorů. Ceny jsou uvedené bez DPH.',
  ],
  ['Porovnání plánů', 'Porovnání tarifů'],
  ['Inspekce', 'Kontrola'],
  ['Kamery a lokality', 'Kamery a závody'],
  [
    'Pokročilá analytika (porovnání závodů, statistiky po kusech)',
    'Pokročilá analytika (porovnání závodů, statistiky po jednotlivých kusech)',
  ],
  ['Dashboard na halu v reálném čase', 'Živý přehled výroby na hale'],
  ['Tréninky modelů', 'Tréninky modelu'],
  ['5 / měsíc', '5 měsíčně'],
  ['Instalace a zaškolení na místě', 'Instalace a zaškolení u vás'],
  ['Poinstalační servis a podpora', 'Servis a podpora po instalaci'],
  ['Integrace ERP / MES', 'Napojení na ERP / MES'],
  [
    'S plánem Pro jsou instalace a podpora na nás.',
    'S tarifem Pro necháte instalaci i podporu na nás.',
  ],
  [
    'Přijedeme do vašeho závodu, namontujeme utěsněnou kameru nad váš proces a všechno na místě nastavíme — a pak jsme vám dál k dispozici se servisem a podporou ještě dlouho po spuštění.',
    'Přijedeme k vám do závodu, namontujeme utěsněnou kameru nad linku a všechno rovnou na místě zprovozníme. Se servisem a podporou jsme vám pak k ruce ještě dlouho po spuštění.',
  ],
  [
    'Instalace na místě v mokrých, chladných i prašných provozech — zapojená do systémů, které už používáte.',
    'Nainstalujeme kameru i v mokrém, chladném nebo prašném provozu a napojíme ji na systémy, které už používáte.',
  ],
  ['Poinstalační podpora', 'Servis i po instalaci'],
  [
    'Průběžný servis, ladění a prioritní podpora v ceně od plánu Pro výš.',
    'Průběžný servis, dolaďování a prioritní podpora — od tarifu Pro v ceně.',
  ],
  [
    'OTA aktualizace modelů i softwaru udrží inspekci přesnou, i když se vaše produkty mění.',
    'Modely i software aktualizujeme na dálku, takže kontrola zůstává přesná, i když se váš sortiment mění.',
  ],
  ['Otázky k ceně, zodpovězené.', 'Nejčastější otázky k ceně.'],
  ['Nevíte, který plán sedí?', 'Nevíte, který tarif vybrat?'],
  [
    'Objednejte si 30minutové demo a společně ho nastavíme podle vašeho provozu a produktů.',
    'Domluvte si půlhodinové demo a společně vybereme tarif, který sedne vašemu provozu i produktům.',
  ],
  ['Ceník — plány vizuální inspekce Robopipe', 'Ceník — tarify vizuální kontroly Robopipe'],
  [
    'Ceník Robopipe: Standard 9 900 Kč, Pro 14 900 Kč za kameru měsíčně a Enterprise na míru. Utěsněný IP67 hardware, instalace na místě a deep-learning inspekce v jedné předvídatelné ceně.',
    'Ceník Robopipe: Standard za 9 900 Kč, Pro za 14 900 Kč za kameru a měsíc, Enterprise na míru. Utěsněný hardware IP67, instalace u vás a AI kontrola kvality v jedné pevné měsíční ceně.',
  ],

  // --- Industries page ---
  [
    'Nasnímat, označit, natrénovat, vyhodnotit — stejná otevřená pipeline za každým nasazením, vyladěná podle toho, co vaše linka skutečně vyrábí, balí nebo expeduje.',
    'Nasnímat, označit, natrénovat, vyhodnotit — každé nasazení stojí na stejné otevřené pipeline, vyladěné podle toho, co vaše linka opravdu vyrábí, balí nebo expeduje.',
  ],
  [
    'Od kompletace sendvičů po třídění ovoce — Robopipe kontroluje úplně každý produkt, který projde kolem kamery, ať už v umývaných zónách, chladírnách, nebo v moučném prachu.',
    'Od kompletace sendvičů po třídění ovoce — Robopipe zkontroluje úplně každý kus, který projede pod kamerou, ať jde o mokrý provoz, chladírnu, nebo pekárnu plnou moučného prachu.',
  ],
  [
    'Chybějící, špatně umístěné nebo záměněné suroviny na kompletovaných produktech',
    'Chybějící, špatně umístěné nebo zaměněné suroviny na kompletovaných produktech',
  ],
  [
    'Kontrola porcí, odhad hmotnosti kamerou a úrovně naplnění',
    'Kontrola porcí, odhad hmotnosti z obrazu a míry naplnění',
  ],
  [
    'Počítání kusů, úspěšnost a takt na displeji na hale',
    'Počítání kusů, podíl OK kusů a takt linky na displeji přímo na hale',
  ],
  [
    'Farmacie a zdravotnictví: ověřená plnění, uzávěry a etikety.',
    'Farmacie a zdravotnictví: zkontrolované plnění, uzávěry i etikety.',
  ],
  [
    'Plnění kapslí, blistrování a etiketování ověřené kus po kusu — s obrazovým záznamem každé kontroly pro vaši dokumentaci kvality.',
    'Plnění kapslí, blistrování i etiketování zkontrolované kus po kusu — a ke každé kontrole obrazový záznam do vaší dokumentace kvality.',
  ],
  ['Úroveň plnění, úplnost kapslí a blistrů', 'Míra naplnění, kompletnost kapslí a blistrů'],
  [
    'Přítomnost a pozice víček, plomb a uzávěrů',
    'Přítomnost a správná pozice víček, plomb a uzávěrů',
  ],
  [
    'Obrazový archiv všech OK i NOK kusů, exportovatelný pro audity',
    'Obrazový archiv všech OK i NOK kusů, připravený k exportu pro audit',
  ],
  ['kusů zdokumentováno', 'zdokumentovaných kusů'],
  [
    'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a náchylné k chybám — a špatná metadata pohřbí produkty ve vyhledávání. Robopipe čte vaše produktové fotky a tagy píše za vás, aby katalog zůstal prohledávatelný, i když roste.',
    'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a náchylné k chybám — a kvůli špatným metadatům se produkty ztrácejí ve vyhledávání. Robopipe si vaše produktové fotky prohlédne a tagy doplní za vás, aby katalog zůstal přehledný a dohledatelný, i když roste.',
  ],
  [
    'Jednotná terminologie napříč celým katalogem — bez překlepů, opomenutí a míchaných štítků',
    'Jednotné názvosloví napříč celým katalogem — bez překlepů, vynechávek a nejednotných štítků',
  ],
  [
    'Zvládne sezónní kolekce i desítky tisíc SKU bez nutnosti najímat další lidi',
    'Zvládne sezónní kolekce i desítky tisíc SKU, aniž byste museli nabírat další lidi',
  ],
  [
    'Pokryjeme i fulfilment: obsah objednávky ověříme a doložíme fotografií každé odeslané krabice',
    'Pokryjeme i fulfilment: obsah objednávky ověříme a každou odeslanou krabici doložíme fotografií',
  ],
  [
    'Analýza regálů: digitalizované kontroly prodejen — fotky regálů automaticky vyhodnocené, aby zboží nikdy nechybělo na svém místě',
    'Analýza regálů: kontrola prodejen v digitální podobě — fotky regálů se vyhodnotí automaticky, aby zboží na svém místě nikdy nechybělo',
  ],
  [
    'Logistika: bezpečnější a měřitelný sklad.',
    'Logistika: bezpečnější sklad, který máte v číslech.',
  ],
  [
    'Kamery nepřetržitě sledují uličky, doky a dopravníky — hlásí bezpečnostní rizika v okamžiku vzniku a mění každý pohyb v provozní statistiky.',
    'Kamery nepřetržitě hlídají uličky, doky i dopravníky — bezpečnostní rizika nahlásí hned, jak vzniknou, a každý pohyb ve skladu promění v provozní statistiku.',
  ],
  [
    'Skoronehody vysokozdvižných vozíků a chodců — detekované, počítané a mapované na riziková místa',
    'Skoronehody vysokozdvižných vozíků a chodců — systém je rozpozná, spočítá a vyznačí riziková místa',
  ],
  [
    'Zablokované únikové východy, rozlité kapaliny a překážky v uličkách hlášené okamžitě',
    'Zablokované únikové východy, rozlité kapaliny a překážky v uličkách nahlášené okamžitě',
  ],
  [
    'Překračování rychlosti a jízda v protisměru zaznamenané podle vozíku a směny',
    'Překročení rychlosti a jízda v protisměru dohledatelné podle vozíku i směny',
  ],
  [
    'Heatmapy provozu, prostoje na docích a špičky — podklady pro změny layoutu',
    'Mapy vytížení, prostoje na docích a špičky — podklady pro změnu uspořádání skladu',
  ],
  [
    'Statistiky průchodnosti a skoronehod napojené do WMS a bezpečnostního reportingu',
    'Statistiky průchodnosti a skoronehod napojené na WMS a bezpečnostní reporting',
  ],
  [
    'Pokud to kamera vidí, Robopipe se to naučí. Napište nám, co vyrábíte, a ukážeme vám, jak by inspekce vypadala.',
    'Co kamera uvidí, to se Robopipe naučí. Napište nám, co vyrábíte, a ukážeme vám, jak by kontrola vypadala u vás.',
  ],
  [
    'Jak strojové vidění Robopipe řeší kontrolu kvality v potravinářství, farmacii a zdravotnictví, retailu a e-commerce i logistice — kusová inspekce, počítání, tagování a bezpečnost skladu.',
    'Jak strojové vidění Robopipe řeší kontrolu kvality v potravinářství, farmacii a zdravotnictví, retailu a e-commerce i logistice — kontrola každého kusu, počítání, tagování produktů a bezpečnost skladu.',
  ],

  // --- Privacy policy (hosting moved from Google Cloud to Vercel) ---
  [
    'Web běží na infrastruktuře Google Cloud v EU. E-maily odesíláme přes službu Resend. Údaje neprodáváme ani nesdílíme pro marketing třetích stran.',
    'Web provozujeme na platformě Vercel a data ukládáme v EU. E-maily odesíláme přes službu Resend. Údaje neprodáváme ani je nepředáváme třetím stranám pro marketing.',
  ],

  // --- Home page ---
  [
    'Robopipe — Vizuální kontrola kvality, která se naučí váš produkt',
    'Robopipe — Vizuální kontrola kvality, která se váš produkt naučí sama',
  ],
  [
    'AI vizuální kontrola, která se naučí váš produkt.',
    'AI kontrola kvality, která se váš produkt naučí sama.',
  ],
  [
    'Robopipe nasazuje deep-learning inspekci všude, kudy prochází vaše produkty — v potravinářských provozech, farmaceutickém balení, retailovém fulfillmentu i logistických skladech. Zachyťte vady v reálném čase. Bez datových vědců.',
    'Robopipe přináší AI kontrolu kvality všude, kudy procházejí vaše produkty — do potravinářské výroby, farmaceutického balení, e-commerce fulfilmentu i logistických skladů. Vady zachytíte hned, jak vzniknou. A nepotřebujete k tomu datové vědce.',
  ],
  [
    'Deep-learning inspekce, kterou zvládne váš vlastní tým.',
    'AI kontrola kvality, kterou zvládne váš vlastní tým.',
  ],
  ['Samoobslužné nastavení', 'Nastavíte si sami'],
  [
    'Nový produkt ke kontrole přidáte sami během minut. Vyfoťte pár správných kusů, potvrďte, jak vypadá „OK", a Robopipe začne kontrolovat — žádní inženýři, žádné tickety, žádné čekání.',
    'Nový produkt přidáte do kontroly za pár minut. Vyfotíte několik správných kusů, potvrdíte, jak má vypadat kus, který je v pořádku, a Robopipe začne kontrolovat — bez techniků, bez ticketů a bez čekání.',
  ],
  ['Monitoring výroby v reálném čase', 'Přehled o výrobě v reálném čase'],
  [
    'Displej na hale ukazuje operátorům, jak běží dnešní šarže — počty kusů, úspěšnost, nejčastější vady, prostoje a takt, s okamžitou zpětnou vazbou, na kterou tým reaguje přímo u linky.',
    'Displej na hale ukazuje obsluze, jak běží dnešní šarže — počty kusů, podíl OK kusů, nejčastější vady, prostoje i takt. Zpětná vazba přichází okamžitě a tým na ni reaguje přímo u linky.',
  ],
  [
    'Plně utěsněný hardware s krytím IP67 do umývaných provozů přežije páru, ostřik, prach i chladírny. Namontujte ho přímo nad linku a umyjte ho spolu se zbytkem haly.',
    'Plně utěsněný hardware s krytím IP67 vydrží páru, tlakové mytí, prach i mráz v chladírně. Namontujete ho přímo nad linku a při sanitaci ho umyjete spolu se zbytkem haly.',
  ],
  [
    'Volitelný univerzální AI PLC kontrolér s analogovými i digitálními I/O, RS485/RS232, Modbus a EtherCAT po Ethernetu — zapojený do systémů, které už provozujete, včetně ERP a WMS.',
    'Volitelná univerzální řídicí jednotka AI PLC s analogovými i digitálními vstupy a výstupy, RS485/RS232, Modbus a EtherCAT po Ethernetu — napojí se na systémy, které už provozujete, včetně ERP a WMS.',
  ],
  ['Připraveno předefinovat vaše odvětví.', 'Postaveno pro váš obor.'],
  [
    'Vady, cizí předměty a kontrola porcí v rychlosti linky.',
    'Vady, cizí předměty a kontrola porcí v tempu linky.',
  ],
  [
    'Ověření plnění, uzávěrů a etiket s kompletní auditní stopou.',
    'Kontrola plnění, uzávěrů a etiket s kompletní auditní stopou.',
  ],
  [
    'Produktové fotky tagované AI — katalogy, které zůstanou prohledávatelné.',
    'Produktové fotky otaguje AI — katalog zůstane přehledný a dohledatelný.',
  ],
  [
    'Bezpečnostní rizika hlášená živě, pohyby proměněné ve statistiky.',
    'Bezpečnostní rizika hlášená okamžitě a provoz skladu přehledně v číslech.',
  ],
  ['AI inspekce v provozu za jediný den.', 'AI kontrola v provozu za jediný den.'],
  [
    'Žádní integrátoři, žádné dlouhé projekty. Váš tým to vlastní od prvního dne.',
    'Žádní integrátoři, žádné dlouhé projekty. Všechno máte od prvního dne ve svých rukou.',
  ],
  [
    'Náš tým přijede do vašeho závodu nebo skladu, namontuje utěsněnou kameru nad linku a všechno na místě zprovozní — včetně mokrých, chladných a prašných provozů.',
    'Přijedeme k vám do závodu nebo skladu, namontujeme utěsněnou kameru nad linku a všechno rovnou na místě zprovozníme — i v mokrém, chladném nebo prašném provozu.',
  ],
  [
    'Nasnímejte dávku obrázků, označte je a natrénujte model — s průvodcem od začátku do konce, bez znalostí ML. Co projde, určujete vy.',
    'Nasnímáte sadu snímků, označíte je a natrénujete model — průvodce vás provede od začátku do konce a strojové učení znát nepotřebujete. Co projde, určujete vy.',
  ],
  ['Spusťte — s podporou', 'Spusťte — s podporou v zádech'],
  [
    'Operátoři vidí kvalitu na displeji na hale; manažeři sledují trendy v analytickém portálu. Zůstáváme k dispozici s poinstalačním servisem, kdykoli nás potřebujete.',
    'Obsluha vidí kvalitu na displeji přímo na hale, vedoucí sledují trendy v analytickém portálu. A my jsme vám i po spuštění k ruce se servisem a podporou.',
  ],
  ['do první inspekce', 'do první kontroly'],
  ['krytí do umývaných provozů', 'krytí i pro mokré provozy'],
  ['potřebných datových vědců', 'datových vědců potřeba'],
  ['funguje offline', 'funguje i offline'],
  ['Otázky a odpovědi.', 'Na co se ptáte nejčastěji.'],
  [
    'Podívejte se na AI kontrolu kvality na vlastních produktech.',
    'Vyzkoušejte AI kontrolu kvality na vlastních produktech.',
  ],
  [
    'Objednejte si 30minutové demo a sledujte, jak deep-learning inspekce zachytí vady na vašem vlastním produktu.',
    'Domluvte si půlhodinové demo a na vlastní oči uvidíte, jak AI najde vady přímo na vašem produktu.',
  ],
  [
    'Robopipe nasazuje deep-learning vizuální inspekci v potravinářství, farmacii, retailu i logistice. Utěsněná IP67 kamera, samoobslužný trénink, živý dashboard na hale. Objednejte si demo.',
    'Robopipe přináší AI vizuální kontrolu kvality do potravinářství, farmacie, retailu i logistiky. Utěsněná kamera IP67, trénink modelů svépomocí, živý přehled na hale. Domluvte si demo.',
  ],

  // --- Globals (footer, site settings) ---
  [
    'Deep-learning kontrola kvality pro průmyslové provozy.',
    'AI kontrola kvality pro průmyslové provozy.',
  ],
  [
    'Deep-learning vizuální inspekce pro potravinářství, farmacii, retail a logistiku. Utěsněná IP67 kamera, samoobslužný trénink, živý dashboard na hale.',
    'AI vizuální kontrola kvality pro potravinářství, farmacii, retail a logistiku. Utěsněná kamera IP67, trénink modelů svépomocí, živý přehled na hale.',
  ],

  // --- CTA labels (site-wide) ---
  ['Objednat demo', 'Domluvit demo'],

  // --- Round 2 (2026-07-31 feedback): chained on top of the pairs above.
  // The old strings here are the *new* values of earlier pairs — the DB is
  // already at that state; the seed was edited to the final wording directly.
  [
    // "learns your product by itself" was untrue — capture/annotate/train is
    // done by the customer's team; keep the self-service angle instead.
    'Robopipe — Vizuální kontrola kvality, která se váš produkt naučí sama',
    'Robopipe — Vizuální kontrola kvality, kterou svůj produkt naučíte sami',
  ],
  [
    'AI kontrola kvality, která se váš produkt naučí sama.',
    'AI kontrola kvality, kterou svůj produkt naučíte sami.',
  ],
  ['Pojďme dát kameru na vaši linku.', 'Pojďme dát kameru do vašeho provozu.'],
  [
    // pricing hero: "grows with your operation" sounded like ever-rising cost;
    // sell 24/7 operation cheaper than manual inspection instead.
    'Ceník, který roste s vaším provozem.',
    'Kontrola kvality 24/7 — levněji, než vyjde ruční kontrola.',
  ],
  [
    // …and round 3: don't state "cheaper than people" outright — personify
    // the camera as shift labor and let the price below imply the comparison.
    'Kontrola kvality 24/7 — levněji, než vyjde ruční kontrola.',
    'Kontrola kvality, která nemarodí, nebere dovolenou a jede tři směny denně.',
  ],
  [
    // round 4: tighter — "zaměstnejte" alone implies the wage comparison.
    'Kontrola kvality, která nemarodí, nebere dovolenou a jede tři směny denně.',
    'Zaměstnejte AI, která nespí.',
  ],
]

/**
 * Fixes for strings that exist only in the production DB (edited in the admin
 * after seeding, so they drifted from the seed). Applied by updateCsCopy.ts
 * on top of CS_COPY_FIXES; not present in src/seed/index.ts.
 */
export const CS_COPY_FIXES_DB_ONLY: [string, string][] = [
  [
    'Pokročilá analytika (Prostoje, takt výroby, ...)',
    'Pokročilá analytika (prostoje, takt výroby a další)',
  ],
  [
    'Nasnímat, označit, natrénovat, vyhodnotit — stejná otevřená pipeline za každým nasazením, vyladěná podle toho, co váš provoz skutečně vyrábí, balí nebo expeduje.',
    'Nasnímat, označit, natrénovat, vyhodnotit — každé nasazení stojí na stejné otevřené pipeline, vyladěné podle toho, co váš provoz opravdu vyrábí, balí nebo expeduje.',
  ],
]

/**
 * Factual fix for the en locale: hosting moved from Google Cloud to Vercel
 * (2026-07-30). Applied to the privacy-policy page only.
 */
export const EN_COPY_FIXES: [string, string][] = [
  [
    'The site runs on Google Cloud infrastructure in the EU. Emails are delivered via Resend. We do not sell your data or share it for third-party marketing.',
    'The site runs on Vercel; data is stored in the EU. Emails are delivered via Resend. We do not sell your data or share it for third-party marketing.',
  ],

  // 2026-07-31: mirror the Czech rounds 2-4 (see CS_COPY_FIXES above) —
  // truthful self-service claim, "operation" instead of "process", and the
  // pricing hero selling tireless AI labor instead of scaling cost.
  [
    'Robopipe — Visual quality control that learns your product',
    'Robopipe — Visual quality control your own team trains',
  ],
  [
    'AI visual control that learns your product.',
    'AI quality control your own team trains.',
  ],
  [
    "Let's put a camera on your process.",
    "Let's put a camera in your operation.",
  ],
  [
    'Pricing that scales with your operation.',
    'Hire AI that never sleeps.',
  ],
]

/**
 * Czech alt texts for seeded media, keyed by the original upload filename.
 * The seed created media with English alt in the default (cs) locale; these
 * give the cs locale proper Czech while the English text moves to en.
 */
export const MEDIA_ALT_CS: Record<string, string> = {
  'line-loop.mp4': 'Výrobní linka pod kamerovou kontrolou',
  'logo-crocodille.png': 'Crocodille',
  'logo-bageterie.jpg': 'Bageterie Boulevard',
  'logo-mgservis.png': 'MG Servis',
  'logo-wolfberry.png': 'Wolfberry',
  'logo-foodstr.png': 'Foodstr',
  'annotate-ui.png': 'Anotační studio Robopipe',
  'dashboard-ui.png': 'Přehled výroby v reálném čase',
  'camera-line.jpeg': 'Utěsněná kamera namontovaná nad výrobní linkou',
  'controller-box.png': 'Řídicí jednotka Robopipe AI PLC',
  'inspection-detection.jpg': 'Detekce vad na potravinářské lince',
  'pharma-hmi.jpeg': 'HMI panel farmaceutické linky',
  'retail-packing.jpg': 'Balicí stanoviště e-shopových objednávek',
  'logistics-warehouse.png': 'Ulička logistického skladu',
  'inspection-identify.webp': 'Kamera rozpoznává produkty na lince',
  'tablet-line.png': 'Tablet na hale se živým skóre kvality',
  'use-case-food.png': 'Linka na výrobu sendvičů',
  'sandwich-line-inspection.jpg': 'Kontrola sendvičů na lince',
  'product-classification-screen.jpeg': 'Obrazovka klasifikace produktů',
  'retail-tagging.jpeg': 'Stanoviště AI tagování produktů',
  'food-baguette-inspection.png': 'Kontrola bagety s vyznačenými kontrolními body',
  'contact-map.webp': 'Mapa sídla Robopipe v Praze — Karlíně',
}
