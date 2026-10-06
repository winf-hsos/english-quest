# English Quest

Lern-App für die Englischarbeit (Klasse 6, Green Line 2, Unit 1 „The new boy“): Simple Past mit Fragen, Kurzantworten und Verneinung, unregelmäßige Verben sowie die Vokabeln von S. 209–217. Die App besteht nur aus HTML, CSS und JavaScript und braucht keinen Server.

## Inhalt

| Bereich | Was geübt wird |
|---|---|
| Vokabeln | Karteikarten, Deutsch → Englisch tippen, Multiple Choice, schwache Wörter, Wortliste mit Aussprache |
| Unregelmäßige Verben | Simple Past bilden, Grundform finden, Verb-Blitz (60 Sekunden), Liste |
| Grammatik | Spickzettel, regelmäßige Formen, Signalwörter, Fragen mit did und was/were, Kurzantworten, Fehler-Detektiv, Verneinung, Satzbauer |
| Lückentexte | Sieben Geschichten rund um Ty, Ryan, Lily und Sherlock |
| Hören | Fünf Hörtexte (true/false, wie in der Arbeit 2× hören) und ein Hör-Diktat über die Sprachausgabe des Browsers |
| Text-Check | Verständnisfragen zu den Buchtexten S. 15, 20 und 22 |
| Extras | Schreibwerkstatt (didn't-Sätze mit Fehlererkennung), British vs. American (Memory, Quiz, Schreibweise), Würfelspiel |
| Probearbeit | Listening, Grammar, Writing, Lückentext und Vokabeln mit Punkten und geschätzter Note |

Für richtige Antworten gibt es XP, für Antworten am Stück Combo-Boni. Dazu kommen elf Ränge vom „New Kid“ bis zum „Sherlock Genius“, 16 Abzeichen, drei Tagesmissionen, eine Tagesserie und ein Fehler-Training, das falsch beantwortete Aufgaben so lange wiederholt, bis sie sitzen.

## Spielstand

Der Fortschritt wird automatisch im `localStorage` des Browsers gespeichert. Um den Spielstand in einen anderen Browser oder auf ein anderes Gerät zu übertragen, erzeugt man unter 💾 einen Code, kopiert ihn oder lädt ihn als TXT-Datei herunter und fügt ihn im anderen Browser unter „Spielstand laden“ ein (oder wählt dort die TXT-Datei). Der Code ist komprimiert und enthält eine Prüfsumme, damit unvollständig kopierte Codes erkannt werden.

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen, z. B. `english-quest`.
2. Im Projektordner:
   ```bash
   git init
   git add .
   git commit -m "English Quest"
   git branch -M main
   git remote add origin https://github.com/BENUTZERNAME/english-quest.git
   git push -u origin main
   ```
3. Auf GitHub unter **Settings → Pages** bei „Source“ den Branch `main` und den Ordner `/ (root)` wählen.
4. Nach etwa einer Minute ist die App unter `https://BENUTZERNAME.github.io/english-quest/` erreichbar.

Der Ordner `quellen/` mit den Buchfotos steht in der `.gitignore` und wird nicht hochgeladen, weil die Buchseiten urheberrechtlich geschützt sind. Die Übungstexte in der App sind eigene Texte, die Vokabelliste enthält nur Wort und Übersetzung.

## Lokal testen

```bash
python -m http.server 8765
```

Danach `http://localhost:8765` im Browser öffnen. Die Datei `index.html` lässt sich auch direkt per Doppelklick öffnen.

## Hinweise

- Die Hörtexte nutzen die Sprachausgabe des Browsers. Chrome, Edge und Safari bringen englische Stimmen mit; fehlt eine Stimme, lässt sich der Text stattdessen lesen.
- Inhalte anpassen: Alle Vokabeln, Verben, Aufgaben und Texte stehen in `js/data.js`.
