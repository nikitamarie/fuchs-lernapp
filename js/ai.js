/* KI-Anbindung: Google Gemini (kostenloses Kontingent, eigener Schlüssel).
   Der Schlüssel bleibt nur auf diesem Tablet gespeichert. */
F.ai = {
  base: 'https://generativelanguage.googleapis.com/v1beta',

  hasKey: function () { return !!(F.state.settings.apiKey || '').trim(); },
  key: function () { return encodeURIComponent((F.state.settings.apiKey || '').trim()); },

  /* Reserve-Liste, falls die Modell-Liste nicht geladen werden kann */
  FALLBACK: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],

  /* Holt alle "Flash"-Modelle, die dieser Schlüssel nutzen darf, sortiert nach Eignung */
  listCandidates: function () {
    var self = this;
    return fetch(this.base + '/models?pageSize=200&key=' + this.key()).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }, function () { return { ok: false, status: r.status, j: null }; });
    }).then(function (res) {
      if (!res.ok) throw self.httpError(res.status, res.j);
      var names = (res.j.models || []).filter(function (m) {
        var n = m.name || '';
        var methods = m.supportedGenerationMethods || [];
        return methods.indexOf('generateContent') >= 0 && /gemini/i.test(n) && /flash/i.test(n) &&
          !/image|tts|live|audio|embed|native|8b|computer|robotics|veo|omni/i.test(n);
      }).map(function (m) { return m.name.replace(/^models\//, ''); });
      var score = function (n) {
        var v = n.match(/gemini-(\d+(?:\.\d+)?)/);
        var num = v ? parseFloat(v[1]) : 0;
        if (/^gemini-flash-latest$/.test(n)) num = 50;
        if (/^gemini-flash-lite-latest$/.test(n)) num = 49;
        if (/lite/.test(n)) num -= 0.4;          // "lite" ist etwas schwächer, aber sparsam
        if (/preview|exp/.test(n)) num -= 20;    // Vorschau-Modelle nur als letzte Wahl
        if (/-\d{3}$/.test(n)) num -= 0.05;      // feste Versionsnummern nach den Hauptnamen
        return num;
      };
      names.sort(function (a, b) { return score(b) - score(a); });
      if (!names.length) names = self.FALLBACK.slice();
      return names;
    });
  },

  httpError: function (status, body) {
    var msg = (body && body.error && body.error.message) || '';
    var e;
    if (status === 400 && /api key/i.test(msg)) e = new Error('Der KI-Schlüssel stimmt nicht. Bitte im Eltern-Bereich prüfen (ganz kopiert, ohne Leerzeichen?).');
    else if (status === 403) e = new Error('Der KI-Schlüssel hat keinen Zugriff. Bitte im Eltern-Bereich einen neuen Schlüssel erstellen.');
    else if (status === 429) e = new Error('Die kostenlose KI braucht gerade eine Pause (zu viele Anfragen oder Tageslimit erreicht). Bitte in ein paar Minuten nochmal versuchen – oder morgen.');
    else if (status >= 500) e = new Error('Die KI ist gerade überlastet. Bitte gleich nochmal versuchen.');
    else e = new Error('Die KI hat nicht geantwortet (' + status + '). ' + msg);
    e.status = status;
    e.detail = msg;
    e.badKey = (status === 400 && /api key/i.test(msg)) || status === 403;
    return e;
  },

  /* eine Anfrage an genau ein Modell */
  /* Denk-Modus der neueren Modelle möglichst kurz halten – sonst dauert die Antwort
     bei Fotos sehr lange und ältere iPads brechen die Verbindung ab. */
  thinkingFor: function (model) {
    var no = F.state.settings.noThink || {};
    if (no[model]) return null;
    if (/gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
    if (/gemini-(3|4|5|6|7|8|9)/.test(model) || /latest$/.test(model)) return { thinkingLevel: 'low' };
    return null;
  },

  /* eine Anfrage an genau ein Modell */
  callModel: function (model, body) {
    var self = this;
    var payload = JSON.parse(JSON.stringify(body));
    var think = this.thinkingFor(model);
    if (think) payload.generationConfig.thinkingConfig = think;

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timedOut = false;
    var timer = ctrl ? setTimeout(function () { timedOut = true; ctrl.abort(); }, 120000) : null;
    var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    if (ctrl) opts.signal = ctrl.signal;

    return fetch(this.base + '/models/' + model + ':generateContent?key=' + this.key(), opts).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }, function () { return { ok: false, status: r.status, j: null }; });
    }, function (netErr) {
      clearTimeout(timer);
      var e = new Error(timedOut ? 'Die KI hat zu lange gebraucht.' : 'Verbindung zur KI hat nicht geklappt. Ist das WLAN an?');
      e.network = !timedOut;
      e.timeout = timedOut;
      e.detail = String((netErr && (netErr.message || netErr.name)) || '');
      throw e;
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) {
        var msg = JSON.stringify(res.j || '');
        // Modell kennt die Denk-Einstellung nicht → ohne nochmal probieren
        if (res.status === 400 && think && /thinking/i.test(msg)) {
          var s = F.state.settings;
          s.noThink = s.noThink || {};
          s.noThink[model] = true;
          F.save();
          return self.callModel(model, body);
        }
        throw self.httpError(res.status, res.j);
      }
      var cand = res.j.candidates && res.j.candidates[0];
      var text = '';
      if (cand && cand.content && cand.content.parts) {
        cand.content.parts.forEach(function (p) { if (p.text && !p.thought) text += p.text; });
      }
      if (!text) {
        var e2 = new Error('Die KI konnte mit den Fotos nichts anfangen. Vielleicht nochmal heller oder schärfer fotografieren?');
        e2.empty = true;
        e2.detail = (cand && cand.finishReason) || (res.j.promptFeedback && res.j.promptFeedback.blockReason) || '';
        throw e2;
      }
      return self.parseJSON(text);
    });
  },

  /* schickt Text + Bilder an die KI und erwartet eine JSON-Antwort.
     Klappt ein Modell nicht (Kontingent leer, überlastet, nicht verfügbar),
     wird automatisch das nächste kostenlose Modell probiert. */
  generateJSON: function (prompt, images, opts) {
    opts = opts || {};
    var self = this;
    var s = F.state.settings;
    if (!this.hasKey()) return Promise.reject(new Error('Es fehlt noch der KI-Schlüssel. Bitte Mama oder Papa: Eltern-Bereich → KI einrichten.'));
    if (navigator.onLine === false) return Promise.reject(new Error('Kein Internet – für die Foto-Auswertung braucht das Tablet WLAN.'));

    var tried = [];
    var log = opts.log || function () {};
    var body = null;
    var getList = (s.model && !opts.fresh) ? Promise.resolve([s.model]) : Promise.resolve([]);

    return F.fitImages(images || []).then(function (imgs) {
      var parts = [{ text: prompt }];
      imgs.forEach(function (im) { parts.push({ inline_data: { mime_type: 'image/jpeg', data: im.data } }); });
      body = { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } };
      return getList;
    }).then(function (first) {
      var listPromise = null;
      var queue = first.slice();
      var lastErr = null;

      var next = function () {
        if (!queue.length) {
          if (!listPromise) {
            listPromise = self.listCandidates().catch(function (e) {
              if (e && e.badKey) throw e;
              return self.FALLBACK.slice();
            });
            return listPromise.then(function (names) {
              queue = names.filter(function (n) { return tried.indexOf(n) < 0; }).slice(0, 10);
              if (!queue.length) throw lastErr || new Error('Kein passendes KI-Modell gefunden.');
              return next();
            });
          }
          throw lastErr || new Error('Kein passendes KI-Modell gefunden.');
        }
        var model = queue.shift();
        tried.push(model);
        log('⏳ Probiere ' + model + ' …');
        var attempt = function (n) {
          return self.callModel(model, body).catch(function (err) {
            // überlastet → kurz warten und dasselbe Modell noch einmal probieren
            if (err.status >= 500 && n < 2) {
              log('… ' + model + ' ist überlastet, warte kurz …');
              return new Promise(function (res) { setTimeout(res, 2500 * (n + 1)); }).then(function () { return attempt(n + 1); });
            }
            // Verbindung kurz weg → einmal nochmal versuchen
            if (err.network && n < 1) {
              log('… Verbindung abgebrochen, versuche es nochmal …');
              return new Promise(function (res) { setTimeout(res, 2000); }).then(function () { return attempt(n + 1); });
            }
            throw err;
          });
        };
        return attempt(0).then(function (result) {
          if (s.model !== model) { s.model = model; F.save(); }
          log('✅ ' + model + ' klappt.');
          return result;
        }, function (err) {
          // Diese Fehler lassen sich mit einem anderen Modell nicht lösen
          if (err.badKey || err.network || err.empty) throw err;
          log('⚠️ ' + model + ': ' + (err.status || '') + ' ' + String(err.detail || err.message).slice(0, 140));
          // vorher gespeichertes Modell geht nicht mehr → vergessen
          if (s.model === model) { s.model = ''; F.save(); }
          // 429 heißt bei einem echten Ratenlimit oft "kurz warten" – trotzdem erst andere Modelle probieren
          if (!lastErr || lastErr.status !== 429) lastErr = err;
          return new Promise(function (res) { setTimeout(res, 500); }).then(next);
        });
      };
      return next();
    });
  },

  parseJSON: function (text) {
    var t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      var a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) {} }
      var e3 = new Error('Die Antwort der KI war durcheinander. Bitte nochmal versuchen.');
      e3.empty = true;
      throw e3;
    }
  },

  /* Schlüssel testen (Eltern-Bereich): probiert alle Modelle von vorn durch */
  test: function (log) {
    F.state.settings.model = '';
    return this.generateJSON('Antworte nur mit JSON: {"ok": true, "gruss": "kurzer Gruß für ein Kind, max 6 Wörter"}', [], { fresh: true, log: log })
      .then(function (j) { return { model: F.state.settings.model, gruss: j.gruss || 'Hallo!' }; });
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
