# 🦊 Fuchs-Lernapp

Eine kostenlose Lern-App fürs Tablet (Web-App/PWA) für die 3. Klasse (Grundschule Niedersachsen).

## Was die App kann

- **Diktat-Training:**
  - Lernwörter oder ein Übungsdiktat abfotografieren. Die KI liest den Text ab, du kannst ihn danach kontrollieren.
  - Der Fuchs liest das Diktat Stück für Stück vor, das Kind schreibt auf Papier. Das Tempo bestimmt das Kind selbst mit „Weiter“ und „Nochmal“.
  - Das geschriebene Diktat abfotografieren. Die KI liest die Schreibschrift, findet die Fehler und erklärt sie freundlich, mit Rechtschreib-Strategie.
  - Fehlerwörter landen automatisch in „Meine Übungswörter“. Ein Wort gilt als geschafft, wenn es 3-mal hintereinander richtig war.
- **Mathe: Zahlen bis 1000**
  - Mit Hunderter-Platten, Zehner-Stangen, Einer-Würfeln und Stellenwert-Tafel.
  - Tipps und Lösungen Schritt für Schritt.
  - Läuft ohne KI und ohne Internet.
- **Üben mit Fotos (alle Fächer):** Aus Seiten aus Mappe oder Buch macht die KI kurze Trainingsrunden oder eine Probe-Klassenarbeit.
- **Nachlesen:** Fertige Merkkarten (Rechtschreibung, Zahlen bis 1000) und eigene Merkkarten aus Fotos.
- **Motivation:** Tore ⚽, Kickbox-Gürtel 🥋, Bewegungspausen nach jeder Runde und Countdown bis zur nächsten Klassenarbeit.
- **Eltern-Bereich (PIN):**
  - KI-Schlüssel, Termine und Stimme einstellen.
  - Diktat-Ergebnisse korrigieren, wenn sich die KI geirrt hat.
  - Fehlermuster ansehen und Daten sichern.

## Einrichten (einmalig)

1. **App öffnen:** Auf dem iPad in **Safari** die Adresse der App öffnen (GitHub Pages, siehe unten).
2. **Auf den Home-Bildschirm legen:** Teilen-Knopf (□↑) → „Zum Home-Bildschirm“. Danach startet die App wie eine richtige App. Außerdem bleiben die Daten so dauerhaft gespeichert.
3. **Fuchs benennen:** Das Kind gibt dem Fuchs einen Namen.
4. **KI einrichten (kostenlos):**
   - Eltern-Bereich öffnen, PIN festlegen, dann „KI einrichten“ wählen.
   - Unter <https://aistudio.google.com/apikey> mit einem Google-Konto einen API-Schlüssel erstellen.
   - Den Schlüssel einfügen und auf „Speichern & testen“ tippen.
5. **Schönere Stimme (optional):**
   - iPad-Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch.
   - Dort z. B. „Anna (Erweitert)“ laden.
   - Danach in der App: Eltern-Bereich → Stimme & Vorlesen.

## Kosten & Datenschutz

- Hosting über GitHub Pages: kostenlos.
- KI: kostenloses Kontingent von Google Gemini.
  - Ohne hinterlegte Zahlungsdaten entstehen keine Kosten. Bei zu vielen Anfragen pausiert die KI einfach bis später.
  - Im kostenlosen Tarif darf Google Inhalte zur Verbesserung seiner Dienste nutzen. Deshalb: **keine Namen, Gesichter oder Adressen fotografieren.**
- Alle Daten (Diktate, Fortschritt, Schlüssel) liegen **nur auf dem Tablet**. Fotos werden nicht gespeichert, nur der Text daraus.
- Ab und zu im Eltern-Bereich eine Sicherung machen.

## Veröffentlichen über GitHub Pages

1. Auf github.com im Repository: **Settings → Pages**.
2. Unter „Build and deployment“: Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)**, dann **Save**.
3. Nach 1–2 Minuten ist die App unter `https://<benutzername>.github.io/fuchs-lernapp/` erreichbar.

## Technik

- Reines HTML/CSS/JavaScript ohne Build-Schritt und ohne Abhängigkeiten.
- Bewusst kompatibel mit älteren iPads (Safari 12+).
- Vorlesen: eingebaute Sprachausgabe des Geräts (Web Speech API).
- KI: Gemini API direkt aus dem Browser. Die App wählt automatisch ein aktuelles „Flash“-Modell.
- Offline: Service Worker (`sw.js`). Bei Änderungen an Dateien `VERSION` in `sw.js` hochzählen.
