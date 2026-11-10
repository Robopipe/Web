## Proč anotace zdržuje

Než se model naučí poznávat vady, potřebuje označené snímky. U detekce to znamená nakreslit rámeček kolem každého objektu na každém snímku. Je to nejpracnější část přípravy modelu.

Automatická anotace v aplikaci Robopipe Studio tuto práci obrací. Rámečky navrhne Robopipe Vision a člověk je jen zkontroluje, opraví a schválí.

## Jak automatická anotace funguje

1. **Popíšete štítky.** V Nastavení automatické anotace napíšete ke štítku jednu nebo dvě věty o tom, podle čeho ho poznat. Štítek bez popisu se přeskočí. Popis vám může napsat i Robopipe Vision z příkladu, který už máte označený.
2. **Spustíte anotaci.** Tlačítko „Automaticky anotovat pomocí Robopipe Vision“ v liště spustí anotaci aktuálního snímku. V seznamu dat můžete vybrat víc snímků a spustit je najednou. Snímky se zpracují souběžně a už označené snímky se přeskočí.
3. **Rámečky se kreslí živě.** Robopipe Vision posílá rámečky postupně, jak je najde. U složitých scén to může trvat několik minut. Výsledek se uloží, i když mezitím odejdete.
4. **Zkontrolujete a schválíte.** Návrhy čekají na kontrolu. Jednotlivé rámečky upravíte nebo smažete. Tlačítkem Schválit je uložíte jako anotace snímku.

## Zpětná vazba a poznámky projektu

Když návrh nesedí, napíšete Robopipe Vision, co je špatně. Anotace proběhne znovu a vrátí opravenou sadu rámečků.

Pokud zpětná vazba platí pro celý projekt, Robopipe Vision ji uloží jako poznámku projektu. Poznámku můžete vyřadit. Uložené poznámky se použijí při každé další anotaci.

## Co je dobré vědět

- Automatická anotace dnes kreslí rámečky (detekce objektů).
- Návrhy rámečků vždy kontroluje, upravuje a schvaluje člověk. Žádný návrh se neuloží bez vašeho schválení.
- Pro automatickou anotaci můžete použít offline model. Případně Robopipe nasadí celé řešení přímo u vás (on-premise).
- Automatická anotace je v tarifech [Pro a Enterprise](/cs/cenik). Open-source verze ani tarif Standard ji neobsahují.

## Kde se anotace hodí

Označené snímky jsou základ [AI kontroly kvality](/cs). Čím dřív je máte, tím dřív může na vaší lince začít [kamerová kontrola kvality](/cs/kamerova-kontrola-kvality).
