/* KI-Anbindung: Google Gemini (kostenloses Kontingent, eigener Schlüssel).
   Der Schlüssel bleibt nur auf diesem Tablet gespeichert. */
F.ai = {
  base: 'https://generativelanguage.googleapis.com/v1beta',

  hasKey: function () { return !!(F.state.settings.apiKey || '').trim(); },

  /* sucht automatisch ein aktuelles, kostenloses "Flash"-Modell aus */
  pickModel: function (force) {
    var s = F.state.settings;
    if (s.model && !force) return Promise.resolve(s.model);
    var url = this.base + '/models?pageSize=200&key=' + encodeURIComponent(s.apiKey.trim());
    return fetch(url).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
    }).then(function (res) {
      if (!res.ok) throw F.ai.httpError(res.status, res.j);
      var models = (res.j.models || []).filter(function (m) {
        var n = m.name || '';
        var methods = m.supportedGenerationMethods || [];
        return methods.indexOf('generateContent') >= 0 && /flash/i.test(n) &&
          !/lite|image|tts|live|audio|embed|exp|thinking|8b|native/i.test(n);
      });
      var score = function (m) {
        var n = m.name;
        var v = n.match(/gemini-(\d+(?:\.\d+)?)/);
        var num = v ? parseFloat(v[1]) : 0;
        if (/flash-latest$/.test(n)) return 100;      // Alias, zeigt immer auf das aktuelle stabile Modell
        if (/latest/.test(n)) num += 0.05;
        if (/preview/.test(n)) num -= 10;             // Vorschau-Modelle nur, wenn nichts anderes da ist
        return num;
      };
      models.sort(function (a, b) { return score(b) - score(a); });
      var name = models.length ? models[0].name.replace(/^models\//, '') : 'gemini-2.5-flash';
      s.model = name;
      F.save();
      return name;
    });
  },

  httpError: function (status, body) {
    var msg = (body && body.error && body.error.message) || '';
    var e;
    if (status === 400 && /api key/i.test(msg)) e = new Error('Der KI-Schlüssel stimmt nicht. Bitte im Eltern-Bereich prüfen.');
    else if (status === 403) e = new Error('Der KI-Schlüssel hat keinen Zugriff. Bitte im Eltern-Bereich prüfen.');
    else if (status === 429) e = new Error('Die kostenlose KI braucht gerade eine Pause (Tageslimit oder zu viele Anfragen). Bitte in ein paar Minuten nochmal versuchen – oder morgen.');
    else if (status >= 500) e = new Error('Die KI ist gerade überlastet. Bitte gleich nochmal versuchen.');
    else e = new Error('Die KI hat nicht geantwortet (' + status + '). ' + msg);
    e.status = status;
    return e;
  },

  /* schickt Text + Bilder an die KI und erwartet eine JSON-Antwort */
  generateJSON: function (prompt, images, _retried) {
    var self = this;
    if (!this.hasKey()) return Promise.reject(new Error('Es fehlt noch der KI-Schlüssel. Bitte Mama oder Papa: Eltern-Bereich → KI einrichten.'));
    if (!navigator.onLine) return Promise.reject(new Error('Kein Internet – für die Foto-Auswertung braucht das Tablet WLAN.'));
    return this.pickModel().then(function (model) {
      var parts = [{ text: prompt }];
      (images || []).forEach(function (im) {
        parts.push({ inline_data: { mime_type: 'image/jpeg', data: im.data } });
      });
      var body = {
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      };
      var url = self.base + '/models/' + model + ':generateContent?key=' + encodeURIComponent(F.state.settings.apiKey.trim());
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }, function () { return { ok: false, status: r.status, j: null }; });
      });
    }).then(function (res) {
      if (!res.ok) {
        // Modell nicht (mehr) verfügbar → einmal neu aussuchen
        if ((res.status === 404 || (res.status === 400 && /model/i.test(JSON.stringify(res.j || '')))) && !_retried) {
          F.state.settings.model = '';
          return self.generateJSON(prompt, images, true);
        }
        throw self.httpError(res.status, res.j);
      }
      var cand = res.j.candidates && res.j.candidates[0];
      var text = '';
      if (cand && cand.content && cand.content.parts) {
        cand.content.parts.forEach(function (p) { if (p.text && !p.thought) text += p.text; });
      }
      if (!text) throw new Error('Die KI konnte mit den Fotos nichts anfangen. Vielleicht nochmal heller oder schärfer fotografieren?');
      return self.parseJSON(text);
    }, function (err) {
      if (err && err.status) throw err;
      if (err && /Schlüssel|KI/.test(err.message || '')) throw err;
      throw new Error('Verbindung zur KI hat nicht geklappt. Ist das WLAN an?');
    });
  },

  parseJSON: function (text) {
    var t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      var a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) {} }
      throw new Error('Die Antwort der KI war durcheinander. Bitte nochmal versuchen.');
    }
  },

  /* Schlüssel testen (Eltern-Bereich) */
  test: function () {
    return this.pickModel(true).then(function (m) {
      return F.ai.generateJSON('Antworte nur mit JSON: {"ok": true, "gruss": "kurzer Gruß für ein Kind, max 6 Wörter"}', []).then(function (j) {
        return { model: m, gruss: j.gruss || 'Hallo!' };
      });
    });
  }
};

/* ---------------- Vorlagen für die KI-Aufträge ---------------- */
F.prompts = {
  KATEGORIEN: ['Groß/klein', 'Doppelter Mitlaut', 'ie/i', 'ck/tz', 'ß/ss/s', 'Dehnungs-h', 'ä/e oder äu/eu',
    'b/p, d/t, g/k am Ende', 'Buchstabe fehlt/vertauscht', 'Wort fehlt', 'Satzzeichen', 'Sonstiges'],

  diktatExtract: function () {
    return 'Du hilfst einem Elternteil eines 8-jährigen Kindes (3. Klasse, Grundschule in Niedersachsen). ' +
      'Auf den Fotos ist ein Übungsdiktat, ein Diktattext, Lernwörter oder eine Rechtschreib-Seite aus Mappe oder Schulbuch.\n' +
      'Aufgabe: Schreibe den Diktat-Text bzw. die Lernwörter GENAU ab – in korrekter deutscher Rechtschreibung. ' +
      'Ignoriere Aufgabenstellungen, Seitenzahlen, Namen von Personen, Nummerierungen und Bilder. ' +
      'Wenn es mehrere Seiten sind, setze den Text in der richtigen Reihenfolge zusammen.\n' +
      'Antworte NUR mit JSON in genau diesem Format:\n' +
      '{"titel": "kurzer Titel, max. 5 Wörter", ' +
      '"art": "text" (zusammenhängender Text/Sätze) oder "woerter" (nur eine Wörterliste), ' +
      '"text": "der Diktattext als Fließtext mit Satzzeichen (bei art=woerter: leerer String)", ' +
      '"woerter": ["Lernwörter. Bei art=text: die 8 bis 15 schwierigsten Wörter aus dem Text"], ' +
      '"merksaetze": [{"titel": "kurzer Titel", "text": "Rechtschreib-Regel oder Merksatz, der auf dem Blatt steht, kindgerecht", "beispiel": "Beispielwörter"}]}\n' +
      'Wenn keine Merksätze auf dem Blatt stehen, ist "merksaetze" eine leere Liste.';
  },

  diktatCheck: function (original) {
    return 'Ein 8-jähriges Kind (3. Klasse, Grundschule Niedersachsen, schreibt in Schreibschrift) hat ein Diktat auf Papier geschrieben. ' +
      'Die Fotos zeigen, was das Kind geschrieben hat.\n\n' +
      'ORIGINAL (so wäre es richtig):\n"""\n' + original + '\n"""\n\n' +
      'Aufgaben:\n' +
      '1. Lies die Handschrift sehr sorgfältig und schreibe auf, was das Kind WIRKLICH geschrieben hat – mit allen Fehlern. NICHT verbessern!\n' +
      '2. Vergleiche Wort für Wort mit dem Original (auch Groß-/Kleinschreibung und Satzzeichen am Satzende).\n' +
      '3. Liste jeden echten Fehler auf. Sei fair: Wenn ein Buchstabe nur schwer lesbar ist, erfinde keinen Fehler, sondern setze "unsicher": true. ' +
      'Unschöne Schrift ist kein Fehler. Verbesserte/durchgestrichene Stellen zählen so, wie es am Ende dasteht.\n' +
      '4. Schreibe zu jedem Fehler einen kurzen, freundlichen Tipp für ein 8-jähriges Kind (höchstens 2 kurze Sätze, nutze Grundschul-Strategien: ' +
      'Silben schwingen, Verlängern (Hund – Hunde), Ableiten (Bäume – Baum), Nomen-Probe (der/die/das), kurzer Vokal → doppelter Mitlaut, Merkwort). ' +
      'Niemals schimpfen, kein Wort wie "falsch".\n\n' +
      'Antworte NUR mit JSON in genau diesem Format:\n' +
      '{"erkannt": "der Text, wie das Kind ihn geschrieben hat", ' +
      '"woerterGesamt": Anzahl der Wörter im Original (Zahl), ' +
      '"fehler": [{"soll": "richtiges Wort", "ist": "so hat das Kind geschrieben (leer, wenn vergessen)", ' +
      '"kategorie": eine aus ' + JSON.stringify(this.KATEGORIEN) + ', ' +
      '"tipp": "kurzer kindgerechter Tipp", "unsicher": true oder false}], ' +
      '"lob": "ein ehrlicher, ermutigender Satz an das Kind, was schon richtig gut geklappt hat", ' +
      '"muster": "1–2 Sätze für die Eltern: welches Fehlermuster fällt auf und was sollte geübt werden"}';
  },

  merkzettel: function (fach) {
    return 'Du hilfst einem 8-jährigen Kind (3. Klasse, Grundschule Niedersachsen) beim Lernen. Fach: ' + fach + '.\n' +
      'Auf den Fotos sind Seiten aus Mappe, Arbeitsblatt oder Schulbuch. Fasse die wichtigsten Regeln, Merksätze, Begriffe und Lösungswege ' +
      'als kurze Merkkarten zusammen. Sehr einfache Sprache, kurze Sätze, ermutigend. Bei Mathe: Lösungsweg Schritt für Schritt mit Beispiel.\n' +
      'Antworte NUR mit JSON: {"titel": "Thema, max. 5 Wörter", "karten": [{"titel": "kurzer Titel", "text": "höchstens 3 kurze Sätze", "beispiel": "ein Beispiel"}]}\n' +
      'Erstelle 2 bis 8 Karten. Nichts erfinden, was nicht zum Inhalt passt.';
  },

  lernpaket: function (fach, anzahl) {
    return 'Du bist eine freundliche Grundschul-Lehrerin in Niedersachsen und bereitest ein 8-jähriges Kind (3. Klasse) auf eine Klassenarbeit vor. Fach: ' + fach + '.\n' +
      'Auf den Fotos sind Seiten aus Mappe, Arbeitsblatt oder Schulbuch. Erstelle daraus ' + anzahl + ' Übungsaufgaben, die genau diesen Stoff üben ' +
      '(ähnlich wie in einer Klassenarbeit, aber nicht dieselben Aufgaben abschreiben). Altersgerecht, kurze Fragen, eindeutige Antworten. ' +
      'Beginne leicht und werde langsam etwas schwerer. Das Kind hat Konzentrationsschwierigkeiten: eine Sache pro Aufgabe, keine langen Texte.\n' +
      'Aufgabentypen: "auswahl" (genau 3 Antwortmöglichkeiten, eine richtig) oder "eingabe" (kurze Antwort: eine Zahl oder ein einzelnes Wort). ' +
      'Bei Mathe meistens "eingabe" mit einer Zahl als Antwort. Bei Englisch: Wörter, einfache Sätze, Bedeutungen.\n' +
      'Zu jeder Aufgabe: "hilfe" = ein kleiner Tipp, der hilft OHNE die Lösung zu verraten (bei Mathe gern ein Bild in Worten, z. B. mit Hundertern, Zehnern, Einern), ' +
      '"erklaerung" = kurze Schritt-für-Schritt-Erklärung der Lösung (max. 3 kurze Sätze).\n' +
      'Antworte NUR mit JSON: {"titel": "Thema, max. 5 Wörter", ' +
      '"aufgaben": [{"typ": "auswahl" oder "eingabe", "frage": "...", "optionen": ["...", "...", "..."] (nur bei auswahl), "antwort": "die richtige Antwort, genau wie in optionen", "hilfe": "...", "erklaerung": "..."}], ' +
      '"merkkarten": [{"titel": "...", "text": "höchstens 3 kurze Sätze", "beispiel": "..."}]}';
  }
};
