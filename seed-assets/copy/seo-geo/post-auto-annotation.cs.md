---
title: Automatická anotace dat: jak Robopipe Vision označí snímky za vás
slug: automaticka-anotace-dat
excerpt: Označování snímků je nejpracnější část přípravy modelu. Robopipe Studio teď umí navrhnout rámečky samo. Člověk je zkontroluje, upraví a schválí.
seoTitle: Automatická anotace dat pro trénink modelů | Robopipe
seoDescription: Jak funguje automatická anotace v Robopipe Studiu: popis štítků, návrh rámečků od Robopipe Vision, kontrola a schválení člověkem.
---
Každý model pro kontrolu kvality začíná u označených snímků. U detekce to znamená nakreslit rámeček kolem každé vady, každé suroviny nebo každé kapsle. Na desítkách snímků je to otrava. Na stovkách je to týden práce.

Od vydání 30. 10. 2026 má aplikace Robopipe Studio automatickou anotaci. Rámečky navrhne Robopipe Vision. Člověk je zkontroluje, upraví a schválí.

## Začíná se popisem štítku

Robopipe Vision hledá objekty podle toho, jak je popíšete. V Nastavení automatické anotace napíšete ke štítku jednu nebo dvě věty o tom, podle čeho ho poznat a čím se liší od ostatních štítků. Štítek bez popisu se přeskočí.

Psát popis nemusíte od nuly. Tlačítko Vygenerovat napíše popis z příkladu, který už máte označený. Text se vloží jen jako návrh a uloží se, až když ho potvrdíte.

## Rámečky se kreslí živě

Tlačítko „Automaticky anotovat pomocí Robopipe Vision“ v liště spustí anotaci aktuálního snímku. Rámečky se objevují postupně, jak je Robopipe Vision najde. U složitých scén to může trvat několik minut. Výsledek se uloží, i když mezitím odejdete jinam.

Víc snímků najednou spustíte ze seznamu dat. Vyberete snímky a zvolíte automatickou anotaci vybraných obrázků. Snímky se zpracují souběžně a ty, které už jsou označené, se přeskočí.

## Člověk má poslední slovo

Návrhy se neukládají jako hotové anotace. Čekají na kontrolu. Jednotlivé rámečky upravíte nebo smažete a tlačítkem Schválit je uložíte.

> Automatická anotace dnes kreslí rámečky, tedy detekci objektů. Segmentace bude brzy k dispozici.

## Zpětná vazba, která se pamatuje

Když návrh nesedí, napíšete Robopipe Vision, co je špatně. Anotace proběhne znovu a vrátí opravenou sadu rámečků. Pokud vaše připomínka platí pro celý projekt, Robopipe Vision ji navrhne uložit jako poznámku projektu. Uložené poznámky pak dostane při každé další anotaci.

## Co je dobré vědět

Pro automatickou anotaci můžete použít offline model. Případně Robopipe nasadí celé řešení přímo u vás (on-premise). Automatická anotace je v tarifech [Pro a Enterprise](/cs/cenik). Open-source verze ani tarif Standard ji neobsahují.

Podrobný popis najdete na stránce [automatická anotace](/cs/automaticka-anotace). Jak z označených snímků vznikne kontrola na lince, popisuje stránka [AI kontrola kvality](/cs/ai-kontrola-kvality).
