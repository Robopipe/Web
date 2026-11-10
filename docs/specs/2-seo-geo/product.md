# SEO a GEO pro Česko: případy užití, auto anotace, Česká inovační platforma

Zadání odsouhlasil Filip Molčík 10. 11. 2026.

## Cíl

Robopipe se má co nejčastěji objevovat ve vyhledávačích a v odpovědích jazykových modelů (ChatGPT, Perplexity, Gemini, Claude) na dotazy typu „kamerová kontrola kvality“, „AI kontrola kvality“, „počítačové vidění“, „strojové vidění“. Hlavní trh je Česká republika. Web zůstává dvojjazyčný (cs, en).

## Komu to pomáhá

Výrobní firmě v Česku, která hledá automatickou vizuální kontrolu kvality, a jazykovému modelu, který jí odpověď skládá.

## Dnešní stav (zjištěno 10. 11.)

- Žádná strukturovaná data schema.org.
- `/llms.txt` vrací 500.
- `robopipe.io` přesměruje každého na `/en`.
- 4 případové studie jsou jen na jedné stránce `/cs/case-studies` bez vlastních URL.
- Auto anotace na webu chybí úplně.

## Body

### 1. SEO a GEO pro Česko

- Pro každý dotaz (kamerová kontrola kvality, AI kontrola kvality, počítačové vidění, strojové vidění) samostatná vstupní stránka v češtině s anglickým protějškem: srozumitelné vysvětlení, jak to řeší Robopipe, odkazy na případy užití, sekce častých otázek.
- Strukturovaná data JSON-LD: Organization, WebSite, Product nebo SoftwareApplication, BlogPosting, FAQPage, BreadcrumbList.
- `/llms.txt` vrací 200: shrnutí firmy a produktu a odkazy na klíčové stránky.
- Kořen `robopipe.io` posílá podle jazyka prohlížeče: čeština (a slovenština) na `/cs`, ostatní na `/en`. hreflang včetně x-default.
- Titulky a meta popisy českých stránek obsahují cílové výrazy. Canonical a Open Graph na všech stránkách.

### 2. Případové studie jako případy užití

- Každá ze 4 dnešních studií (potraviny, kapsle v dóze, zalistování produktů, kontrola balení) má vlastní stránku cs i en: problém, řešení, výsledek, použitá technika, časté otázky.
- Zákazníci se jmenují jen tak, jak jsou na webu dnes. Žádná nová jména ani čísla.
- Výpis stránek případů užití nahradí dnešní stránku studií. Staré URL fungují dál (přesměrování nebo výpis).

### 3. Auto anotace

- Sekce na úvodní stránce, vlastní stránka (cs, en) a koncept článku na blog (nepublikovat, Filip text schválí).
- Fakta jen z kódu Robopipe Studia, nic nevymýšlet.

### 4. Česká inovační platforma

- Logo s odkazem na https://innovationczechia.cz v pásu „Jsme součástí“ na úvodní stránce a v patičce. Logo z jejich oficiálních podkladů.

### 5. Blog Manufacturing Forum

Řeší jiný agent, mimo tento úkol.

## Rozhodnutí Filipa 10. 11.

Mají přednost před doporučeními v `architecture.md`, kapitola 13.

- **Otázky z kapitoly 13:** 1 ano (koncepty v produkci smí vzniknout po dokončení PR, před schválením). 2 předanotaci mají všichni zákazníci. 3 adresa `/case-studies` zůstává. 4 ceny do JSON-LD `Product` ano (`offers`), jeden zdroj je obsah ceníku v Payload, nic natvrdo v kódu. 5 ano (úvod a výpis případů užití). 6 šedé logo platformy je v pořádku.
- **Jazyk:** cookie jazyka se nevypíná. Uložená volba uživatele je správná (mění ji v patičce). Kořen přesměruje podle jazyka prohlížeče jen tehdy, když volba uložená není. Kritérium s `Accept-Language` se ověřuje bez cookie.
- **Auto anotace** (předanotace) je v proprietární verzi Studia. Web ji popisuje jako funkci produktu Robopipe Studio, ne jako součást open-source repozitáře.
- **og:image:** opravit zdvojenou adresu (`https://robopipe.iohttps//storage...`) na všech stránkách včetně blogu.
- **Přesměrování ze starého obchodu** na `/en/ai-product-tagging` (404) opravit. Cíl podle obsahu: případ užití zalistování produktů.
- **Nový claim**, v produkci už změněný (úvodní stránka: nadpis hero, `title`, `seo.title`): cs „AI kontrola kvality, která se váš produkt naučí sama.“, en „AI quality control that learns your product on its own.“ Seed a opravy textů nesmí claim vrátit.

## Akceptační kritéria

- Všechny nové stránky vrací 200, jsou v `sitemap.xml` s hreflang a mají vlastní titulek, meta popis, canonical a JSON-LD, které projde validací (schema.org validator nebo Google Rich Results test).
- `/llms.txt` vrací 200 a obsahuje odkazy na vstupní stránky a případy užití.
- Požadavek s `Accept-Language: cs` na `/` skončí na `/cs`, bez hlavičky na `/en` (obojí bez cookie s uloženou volbou).
- Staré URL `/cs/case-studies` a `/en/case-studies` nevrací 404.
- Logo platformy je na úvodní stránce i v patičce v obou jazycích.
- Stávající stránky a testy fungují, build projde, Lighthouse SEO aspoň 95 na úvodní stránce a jedné vstupní stránce, mobil bez rozbitého layoutu.

## Mimo rozsah

- Placená reklama.
- Sbírání zpětných odkazů.
- Redesign.
- Nový jazyk.
- Publikace článku o auto anotaci bez Filipova schválení.
- Změny produkčního obsahu před Filipovým schválením.
