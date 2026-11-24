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
  /* Angaben zum Kind (Eltern-Bereich → Schule) */
  alter: function () { return parseInt(F.state.profile.alter, 10) || 8; },
  land: function () { return F.state.profile.bundesland || 'Niedersachsen'; },
  kind: function () {
    var p = F.state.profile;
    return F.prompts.alter() + ' Jahre alt, ' + (parseInt(p.klasse, 10) || 3) + '. Klasse, ' + (p.schulform || 'Grundschule') + ' in ' + F.prompts.land();
  },

  KATEGORIEN: ['Groß/klein', 'Doppelter Mitlaut', 'ie/i', 'ck/tz', 'ß/ss/s', 'Dehnungs-h', 'ä/e oder äu/eu',
    'b/p, d/t, g/k am Ende', 'Buchstabe fehlt/vertauscht', 'Wort fehlt', 'Satzzeichen', 'Sonstiges'],

  diktatExtract: function () {
    return 'Du hilfst einem Elternteil. Das Kind: ' + F.prompts.kind() + '. ' +
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
    return 'Ein Kind (' + F.prompts.kind() + ', schreibt per Hand, oft in Schreibschrift) hat ein Diktat auf Papier geschrieben. ' +
      'Die Fotos zeigen, was das Kind geschrieben hat.\n\n' +
      'ORIGINAL (so wäre es richtig):\n"""\n' + original + '\n"""\n\n' +
      'Aufgaben:\n' +
      '1. Lies die Handschrift sehr sorgfältig und schreibe auf, was das Kind WIRKLICH geschrieben hat – mit allen Fehlern. NICHT verbessern!\n' +
      '2. Vergleiche Wort für Wort mit dem Original (auch Groß-/Kleinschreibung und Satzzeichen am Satzende).\n' +
      '3. Liste jeden echten Fehler auf. Sei fair: Wenn ein Buchstabe nur schwer lesbar ist, erfinde keinen Fehler, sondern setze "unsicher": true. ' +
      'Unschöne Schrift ist kein Fehler. Verbesserte/durchgestrichene Stellen zählen so, wie es am Ende dasteht.\n' +
      '4. Schreibe zu jedem Fehler einen kurzen, freundlichen Tipp für ein ' + F.prompts.alter() + '-jähriges Kind (höchstens 2 kurze Sätze, nutze Rechtschreib-Strategien aus der Schule: ' +
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
    return 'Du hilfst einem Kind beim Lernen (' + F.prompts.kind() + '). Fach: ' + fach + '.\n' +
      'Auf den Fotos sind Seiten aus Mappe, Arbeitsblatt oder Schulbuch. Erkläre die Themen so, dass das Kind sie selbst anwenden kann. ' +
      'WICHTIG: Keine reinen Begriffs-Definitionen! Erkläre, WIE man vorgeht (bei Mathe: wie man solche Aufgaben rechnet, Schritt für Schritt), ' +
      'und rechne/zeige ein Beispiel komplett vor. Nutze genau die Methode und Schreibweise, die auf den Fotos zu sehen ist. ' +
      'Sehr einfache Sprache, kurze Sätze, ermutigend.\n' +
      'Antworte NUR mit JSON: {"titel": "Thema, max. 5 Wörter", "karten": [{"titel": "z. B. So rechnest du …", ' +
      '"text": "1–2 kurze Sätze: Worum geht es?", "schritte": ["Schritt 1 …", "Schritt 2 …"], ' +
      '"beispiel": "die Beispielaufgabe, z. B. 456 + 237", "beispielSchritte": ["vorgerechneter Schritt 1 mit den Zahlen des Beispiels", "…", "Ergebnis: …"]}]}\n' +
      'Erstelle 2 bis 6 Karten. Nichts erfinden, was nicht zum Inhalt passt.';
  },

  MATHE_TYPEN: function () {
    return '' +
      'Benutze diese Aufgabentypen (Rechenzeichen immer: + − · :  und für die Lücke einen Unterstrich _ ):\n' +
      '1. "rechnung": eine Rechnung mit EINER Lücke, die das Kind ausfüllt. Die Lücke kann am Ende oder in der Mitte stehen. ' +
      'Beispiel: {"typ":"rechnung","frage":"Rechne.","aufgabe":"345 + 230 = _","antwort":"575"} oder {"typ":"rechnung","frage":"Ergänze.","aufgabe":"345 + _ = 575","antwort":"230"}\n' +
      '2. "paeckchen": 3 bis 5 zusammengehörende Rechnungen wie ein Päckchen im Heft (gern „schöne Päckchen“ mit Muster). ' +
      'Beispiel: {"typ":"paeckchen","frage":"Rechne das Päckchen. Was fällt dir auf?","zeilen":[{"aufgabe":"300 + 200 = _","antwort":"500"},{"aufgabe":"310 + 200 = _","antwort":"510"}]}\n' +
      '3. "schriftlich": schriftlich rechnen in Spalten (nur wenn schriftliches Rechnen auf den Fotos bzw. in der Checkliste vorkommt). ' +
      '"aufschreiben": true heißt, das Kind muss die Zahlen selbst richtig untereinander schreiben. ' +
      'Beispiel: {"typ":"schriftlich","frage":"Rechne schriftlich.","operator":"+","zahlen":["456","278"],"antwort":"734","aufschreiben":false}\n' +
      '4. "sachaufgabe": eine kurze Text-Aufgabe (max. 3 Sätze, Alltag eines Kindes, z. B. Handball, Kickboxen, Tiere, Einkaufen). ' +
      'Das Kind schreibt Rechnung, Ergebnis und Antwortsatz. Beispiel: {"typ":"sachaufgabe","frage":"Im Verein sind 124 Kinder. 38 spielen Handball. Wie viele machen etwas anderes?",' +
      '"rechnung":"124 − 38 = 86","antwort":"86","einheit":"Kinder","antwortsatz":"86 Kinder machen etwas anderes."}\n' +
      '5. "auswahl": nur für Aufgaben, bei denen man wirklich auswählt (z. B. <, > oder =; welche Zahl ist größer). Genau 3 Optionen, "antwort" genau wie eine Option.\n\n' +
      'Mische die Typen passend zu den Fotos (vor allem rechnung, paeckchen und – falls auf den Fotos bzw. in der Checkliste – schriftlich und sachaufgabe).\n' +
      'Zu JEDER Aufgabe:\n' +
      '- "hilfe": ein kleiner Tipp, ohne die Lösung zu verraten (z. B. „Rechne erst die Hunderter.“)\n' +
      '- "loesungsweg": 2 bis 5 kurze Schritte, wie man GENAU DIESE Aufgabe rechnet – mit den Zahlen der Aufgabe (z. B. ["300 + 200 = 500", "45 + 30 = 75", "500 + 75 = 575"]). ' +
      'KEINE Begriffserklärungen wie „Addieren heißt plus rechnen“, sondern der Rechenweg. Nutze die Rechenwege/Strategien, die auf den Fotos bzw. in der Checkliste zu sehen sind ' +
      '(z. B. Stellenwerte, schrittweise, Hilfsaufgabe, Umkehraufgabe, beim schriftlichen Rechnen den Übertrag).\n' +
      '- "thema": kurzer Name des Themas.\n' +
      'Prüfe jede Lösung zweimal nach – sie muss stimmen!\n\n';
  },

  THEMEN_JSON: '"themen": [{"titel": "So rechnest du … / So geht …", "erklaerung": "1–2 kurze Sätze, worum es geht", ' +
    '"schritte": ["3 bis 6 kurze Schritte: WIE man solche Aufgaben löst"], "beispiel": "eine Beispielaufgabe", ' +
    '"beispielSchritte": ["das Beispiel komplett vorgerechnet, Schritt für Schritt, mit Ergebnis"]}]',

  lernpaket: function (fach, anzahl) {
    return 'Du bist eine freundliche Lehrerin in ' + F.prompts.land() + ' und bereitest ein Kind (' + F.prompts.kind() + ') auf eine Klassenarbeit vor. Fach: ' + fach + '.\n' +
      'Auf den Fotos sind Seiten aus Mappe, Arbeitsblatt oder Schulbuch. Erstelle daraus ' + anzahl + ' Übungsaufgaben, die genau diesen Stoff üben ' +
      '(ähnlich wie in einer Klassenarbeit, aber nicht dieselben Aufgaben abschreiben). Altersgerecht, kurze Fragen, eindeutige Antworten. ' +
      'Beginne leicht und werde langsam etwas schwerer. Das Kind hat Konzentrationsschwierigkeiten: eine Sache pro Aufgabe, keine langen Texte.\n' +
      'Aufgabentypen: "auswahl" (genau 3 Antwortmöglichkeiten, eine richtig) oder "eingabe" (kurze Antwort: eine Zahl oder ein einzelnes Wort). ' +
      'Bei Englisch: Wörter, einfache Sätze, Bedeutungen.\n' +
      'Zu jeder Aufgabe: "hilfe" = ein kleiner Tipp, der hilft OHNE die Lösung zu verraten; ' +
      '"loesungsweg" = 2 bis 4 kurze Schritte, wie man auf GENAU DIESE Lösung kommt (z. B. „Suche das Wort, das man tun kann …“). Keine reine Begriffs-Definition!\n' +
      'Zusätzlich "themen": Erkläre jedes Thema der Fotos so, dass das Kind solche Aufgaben selbst lösen kann (Vorgehen in Schritten + vorgemachtes Beispiel).\n' +
      'Antworte NUR mit JSON: {"titel": "Thema, max. 5 Wörter", ' +
      '"aufgaben": [{"typ": "auswahl" oder "eingabe", "frage": "...", "optionen": ["...", "...", "..."] (nur bei auswahl), "antwort": "die richtige Antwort, genau wie in optionen", ' +
      '"hilfe": "...", "loesungsweg": ["...", "..."]}], ' + this.THEMEN_JSON + '}';
  },

  lernpaketMathe: function (anzahl) {
    return 'Du bist eine freundliche Lehrerin in ' + F.prompts.land() + ' und bereitest ein Kind (' + F.prompts.kind() + ') auf eine MATHEARBEIT vor.\n' +
      'Auf den Fotos sind Seiten aus Mappe, Arbeitsheft oder Schulbuch (z. B. „Flex und Flo“). Schau genau hin: Welche Themen und welche Aufgabenformate sind zu sehen? ' +
      'Erstelle daraus ' + anzahl + ' NEUE Aufgaben im GLEICHEN Format wie auf den Fotos (andere Zahlen, gleicher Schwierigkeitsgrad, Zahlenraum wie auf den Fotos, meist bis 1000). ' +
      'Beginne leicht, werde langsam schwerer. Das Kind hat Konzentrationsschwierigkeiten: kurze, klare Aufgaben.\n\n' +
      F.prompts.MATHE_TYPEN() +
      'Zusätzlich "themen": Für jedes Thema auf den Fotos eine Erklärung „So rechnest du …“: wie man solche Aufgaben Schritt für Schritt löst, ' +
      'und ein komplett vorgerechnetes Beispiel. Benutze die Methode von den Fotos.\n' +
      'Antworte NUR mit JSON: {"titel": "Thema, max. 5 Wörter", "aufgaben": [ ... ], ' + this.THEMEN_JSON + '}';
  },

  /* Übung aus einer Checkliste / Themenliste (ohne Aufgaben-Fotos) */
  checkliste: function (fach, text, hatFotos) {
    var mathe = fach === 'Mathe';
    return 'Du bist eine freundliche, erfahrene Lehrerin in ' + F.prompts.land() + ' und bereitest ein Kind (' + F.prompts.kind() + ') auf eine Klassenarbeit im Fach ' + fach + ' vor.\n' +
      'Es gibt KEINE Aufgaben-Fotos, nur eine Checkliste (Lernziele / Themen, die in der Arbeit drankommen)' +
      (hatFotos ? ' – sie ist auf den Fotos zu sehen' : '') + (text ? (hatFotos ? ', dazu diese Notizen' : '') + ':\n"""\n' + text + '\n"""' : '.') + '\n\n' +
      'Aufgaben:\n' +
      '1. Lies die Checkliste und schreibe jeden Punkt kurz und kindgerecht in "checkliste" (so wie „Ich kann …“).\n' +
      '2. Erstelle zu JEDEM Punkt 2 bis 3 passende Übungsaufgaben (insgesamt höchstens 24), so wie sie typischerweise in einer Klassenarbeit dieser Klassenstufe in ' + F.prompts.land() +
      ' vorkommen – passend zum Kerncurriculum/Lehrplan des Bundeslandes und zum Alter (Zahlenraum, Wortschatz, Schwierigkeit). Beginne leicht, werde langsam schwerer. ' +
      'Das Kind hat Konzentrationsschwierigkeiten: kurze, klare Aufgaben.\n' +
      '3. Gib bei jeder Aufgabe in "thema" GENAU den passenden Checklisten-Punkt an (wortgleich wie in "checkliste").\n' +
      '4. Erkläre jeden Checklisten-Punkt in "themen": wie man solche Aufgaben löst (Schritte) und ein komplett vorgemachtes Beispiel. Keine reinen Begriffs-Definitionen.\n\n' +
      (mathe ? F.prompts.MATHE_TYPEN() +
        'Zu JEDER Aufgabe: "hilfe" (Tipp ohne Lösung), "loesungsweg" (2 bis 5 Schritte mit den Zahlen der Aufgabe), "thema". Prüfe jede Lösung zweimal nach!\n' :
        'Aufgabentypen: "auswahl" (genau 3 Antwortmöglichkeiten, eine richtig) oder "eingabe" (kurze Antwort: eine Zahl oder ein Wort). ' +
        'Zu JEDER Aufgabe: "hilfe" (Tipp ohne Lösung), "loesungsweg" (2 bis 4 Schritte, wie man auf genau diese Lösung kommt), "thema".\n') +
      'Antworte NUR mit JSON: {"titel": "Thema der Arbeit, max. 5 Wörter", "checkliste": ["Ich kann …", "…"], ' +
      '"aufgaben": [{"typ": "...", "frage": "...", "thema": "Checklisten-Punkt", ...}], ' + this.THEMEN_JSON + '}';
  }
};
