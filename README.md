# MultiSelect.js

A simple extension to make your life with `<select multiple>` easier.
Native JavaScript, raw and unoptimized.

## Download

[Downloads](https://github.com/Werninator/MultiSelect.js/releases)

## Usage

```javascript
multiSelect('selector'[, options]);
```

`options` (defaults and descriptions only available in german atm, sry lol)

| option | default | description |
| :----- | :------ | :---------- |
| `searchBar` | true | Gibt an, ob die Suchfunktion genutzt werden soll oder nicht |
| `useOptGroups` | true | Gibt an, ob <optgroup>-Elemente dargestellt werden sollen |
| `elementString` | 'Elemente' | Bezeichnung der Elemente (X Elemente ausgewählt) |
| `selectedString` | 'ausgewählt' | Bezeichnung des Verbs (X Elemente ausgewählt) |
| `ofString` | 'von' | Bezeichnung (X von Y ausgewählt) |
| `searchString` | 'Suche...' | Platzhalter der Suchleiste |
| `resultString` | 'Suchergebnisse' | Text für die Suchergebnisse |
| `selectAllString` | 'ALLE AUSWÄHLEN' | Text zum Auswählen aller Optionen |
| `unselectAllString` | 'ALLE ABWÄHLEN' | Text zum Abwählen aller Optionen |
| `discardString` | 'ABBRECHEN' | Text zum Abbrechen/Verwerfen aller Aktionen |
| `saveString` | 'SPEICHERN' | Text zum Speichern aller Aktionen |
| `preInit` | null | Funktions-Hook für Aktionen die vor der Initalisierung von multiSelect passieren sollen |
| `postInit` | null | Funktions-Hook für Aktionen die nach der Initalisierung von multiSelect passieren sollen |
| `onDiscard` | null | Funktions-Hook falls Änderungen verworfen werden |
| `onSave` | null | Funktions-Hook falls Änderungen angewendet werden |
| `onDropdownOpen` | null | Funktions-Hook falls Dropdown geöffnet wird |
| `onDropdownClose` | null | Funktions-Hook falls Dropdown geschlossen wird |
 

