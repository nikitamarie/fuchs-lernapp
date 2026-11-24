/* Echte, korrigierte Klassenarbeiten, Tests und Diktate hochladen: motivierende Auswertung, Tore, Auszeichnungen
   und eine Fehler-Übung zu den Sachen, die noch nicht so gut geklappt haben. */

/* ---------------- Auszeichnungen (Pokalregal) ---------------- */
F.AWARDS = [
  { id: 'mutig', e: '🦁', name: 'Mutig-Medaille', how: 'Deine erste zurückbekommene Arbeit, Test oder Diktat hochgeladen' },
  { id: 'dabei', e: '🤾‍♀️', name: 'Team-Spielerin', how: 'Jede hochgeladene Arbeit zählt – auch diese!' },
  { id: 'aufsteiger', e: '📈', name: 'Aufsteiger-Pokal', how: 'Besser als die letzte Arbeit im gleichen Fach' },
  { id: 'stark', e: '💪', name: 'Starke Leistung', how: 'Mindestens drei Viertel geschafft (75 %)' },
  { id: 'sterne', e: '🌟', name: 'Sterne-Arbeit', how: 'Fast alles richtig (90 % oder Note 1)' },
  { id: 'detektiv', e: '🔍', name: 'Fehler-Detektivin', how: 'Die Fehler-Übung nach einer Arbeit geschafft' },
  { id: 'sammlerin', e: '📚', name: 'Arbeiten-Sammlerin', how: '3 Arbeiten, Tests oder Diktate hochgeladen' },
  { id: 'champion', e: '🦊', name: 'Fuchs-Champion', how: '5 Arbeiten, Tests oder Diktate hochgeladen' },
  { id: 'allrounder', e: '🎯', name: 'Allrounderin', how: 'Arbeiten aus 3 verschiedenen Fächern hochgeladen' }
];
F.award = function (id) {
  for (var i = 0; i < F.AWARDS.length; i++) if (F.AWARDS[i].id === id) return F.AWARDS[i];
  return null;
};
F.giveAward = function (id) {
  var s = F.state;
  s.awards = s.awards || {};
  var first = !s.awards[id];
  s.awards[id] = { n: (s.awards[id] ? s.awards[id].n : 0) + 1, last: Date.now() };
  F.save();
  return { id: id, first: first, n: s.awards[id].n };
};
F.awardCardsHtml = function (list) {
  if (!list || !list.length) return '';
  return '<div class="award-row">' + list.map(function (g) {
    var a = F.award(g.id);
    return '<div class="award pop"><div class="award-e">' + a.e + '</div><div class="award-n">' + F.esc(a.name) + '</div>' +
      '<div class="award-s">' + (g.first ? 'NEU!' : g.n + '× bekommen') + '</div></div>';
  }).join('') + '</div>';
};
F.awardShelfHtml = function () {
  var have = F.state.awards || {};
  return '<h2 class="mt">🏆 Mein Pokalregal</h2><div class="award-row shelf">' + F.AWARDS.map(function (a) {
    var g = have[a.id];
    return '<div class="award ' + (g ? '' : 'locked') + '"><div class="award-e">' + (g ? a.e : '🔒') + '</div><div class="award-n">' + F.esc(a.name) + '</div>' +
      '<div class="award-s">' + (g ? (g.n > 1 ? g.n + '×' : '✓') : F.esc(a.how)) + '</div></div>';
  }).join('') + '</div>';
};

/* kurze, ruhige Konfetti-Feier (fällt bei "weniger Bewegung" weg) */
F.confetti = function () {
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  var box = document.createElement('div');
  box.className = 'confetti';
  var items = ['⚽', '🦊', '⭐', '🥊', '🏆', '🐶', '💜'];
  for (var i = 0; i < 26; i++) {
    var sp = document.createElement('span');
    sp.textContent = items[i % items.length];
    sp.style.left = Math.round(Math.random() * 96) + '%';
    sp.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
    sp.style.fontSize = (18 + Math.round(Math.random() * 18)) + 'px';
    box.appendChild(sp);
  }
  document.body.appendChild(box);
  setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 3600);
};

/* ---------------- Daten ---------------- */
F.NOTE_PROZENT = { 1: 95, 2: 82, 3: 67, 4: 54, 5: 35, 6: 15 };
F.arbeitProzent = function (j) {
  var p = parseFloat(j.punkte), m = parseFloat(j.maxPunkte);
  if (!isNaN(p) && !isNaN(m) && m > 0) return Math.max(0, Math.min(100, Math.round(p / m * 100)));
  var n = String(j.note || '').match(/[1-6]/);
  if (n) {
    var v = F.NOTE_PROZENT[n[0]];
    if (/\+/.test(j.note)) v += 4;
    if (/-|−/.test(j.note)) v -= 4;
    return v;
  }
  var w = String(j.note || '').toLowerCase();
  var words = { 'sehr gut': 95, 'gut': 82, 'befriedigend': 67, 'ausreichend': 54, 'mangelhaft': 35 };
  for (var k in words) if (w.indexOf(k) >= 0) return words[k];
  return null;
};
F.getArbeit = function (id) {
  var l = F.state.arbeiten || [];
  for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
  return null;
};

/* ---------------- Ansichten ---------------- */
F.views.arbeitNew = function (p) {
  var imgs = F.pendingImages.arbeit || [];
  var fach0 = p.fach || 'mathe';
  return F.topbar('Zurückbekommen – hochladen') +
    '<div class="card"><h2>1. Welches Fach?</h2>' + F.subjectChips('arbFach', fach0, false) +
    '<h3 class="mt">Was hast du zurückbekommen?</h3>' + F.artChipsHtml('arbArt', p.art || 'arbeit', fach0) + '</div>' +
    '<div class="card"><h2>2. Fotos machen</h2>' +
    '<p>Alle Seiten fotografieren – auch die Seite mit der Note, den Punkten oder der Fehlerzahl.</p>' +
    '<p class="small"><b>Wichtig:</b> Deinen Namen und die Unterschrift der Lehrerin bitte vorher abdecken (z. B. mit einem Zettel).</p>' +
    F.photoPicker('arbeit', 'Fotografieren') + '</div>' +
    '<button class="btn big block fuchs" data-action="runArbeit" ' + (imgs.length ? '' : 'disabled') + '>🦊 Anschauen lassen</button>';
};

F.actions.runArbeit = function () {
  var imgs = F.pendingImages.arbeit || [];
  if (!imgs.length) return;
  var fachEl = F.$('#arbFach .chip.on');
  var fach = fachEl ? fachEl.getAttribute('data-val') : 'mathe';
  var art = F.chosenArt('arbArt');
  if (art === 'diktat' && fach !== 'deutsch') art = 'arbeit';
  document.getElementById('app').innerHTML = F.loadingHtml('Anschauen', F.fox() + ' schaut sich ' + (art === 'diktat' ? 'dein Diktat' : art === 'test' ? 'deinen Test' : 'deine Arbeit') + ' an …');
  F.ai.generateJSON(F.prompts.arbeit(F.subject(fach).name, art), imgs).then(function (j) {
    F.pendingImages.arbeit = [];
    var prozent = F.arbeitProzent(j);
    // verglichen wird nur mit der gleichen Art im gleichen Fach (Diktat mit Diktat, Test mit Test)
    var prev = (F.state.arbeiten || []).filter(function (x) { return x.fach === fach && F.artOf(x) === art && x.prozent != null; })
      .sort(function (a, b) { return b.date - a.date; })[0];
    var arr = function (x) { return (x || []).map(function (t) { return typeof t === 'string' ? t : (t && (t.text || t.titel)) || ''; }).filter(Boolean).slice(0, 6); };
    var x = {
      id: F.uid(), fach: fach, art: art, date: Date.now(), titel: String(j.titel || F.defaultTitel(fach, art)).slice(0, 60),
      note: String(j.note || '').slice(0, 20), punkte: j.punkte != null ? String(j.punkte) : '', maxPunkte: j.maxPunkte != null ? String(j.maxPunkte) : '',
      prozent: prozent, lob: String(j.lob || ''), lehrerKommentar: String(j.lehrerKommentar || ''),
      gutGemacht: arr(j.gutGemacht),
      ueben: (j.ueben || []).filter(function (u) { return u && (u.thema || u.erklaerung); }).slice(0, 4).map(function (u) {
        return { thema: String(u.thema || ''), erklaerung: String(u.erklaerung || ''), schritte: F.mtask.steps({ schritte: u.schritte || [] }), beispiel: String(u.beispiel || '') };
      }),
      fehler: (j.fehler || []).filter(function (f) { return f && (f.aufgabe || f.richtig); }).slice(0, 6).map(function (f) {
        return { aufgabe: String(f.aufgabe || ''), kindAntwort: String(f.kindAntwort || ''), richtig: String(f.richtig || ''), erklaerung: String(f.erklaerung || '') };
      }),
      vorher: prev ? { prozent: prev.prozent, titel: prev.titel } : null,
      packId: '', awards: [], tore: 0, detektiv: false, examId: F.current.params.examId || ''
    };
    // Tore: immer fürs Hochladen, Bonus für gute Ergebnisse und fürs Besserwerden
    var tore = 20;
    var gained = [];
    var count = (F.state.arbeiten || []).length + 1;
    gained.push(F.giveAward(count === 1 ? 'mutig' : 'dabei'));
    if (prozent != null) {
      if (prozent >= 90) { tore += 15; gained.push(F.giveAward('sterne')); }
      else if (prozent >= 75) { tore += 10; gained.push(F.giveAward('stark')); }
      else if (prozent >= 50) tore += 5;
      if (prev && prozent > prev.prozent) { tore += 10; gained.push(F.giveAward('aufsteiger')); }
    }
    if (count === 3) gained.push(F.giveAward('sammlerin'));
    if (count === 5) gained.push(F.giveAward('champion'));
    var faecher = {};
    (F.state.arbeiten || []).forEach(function (a) { faecher[a.fach] = 1; });
    faecher[fach] = 1;
    if (Object.keys(faecher).length === 3 && !(F.state.awards && F.state.awards.allrounder)) gained.push(F.giveAward('allrounder'));
    x.awards = gained; x.tore = tore;
    // Diktat: angestrichene Wörter werden Übungswörter im Diktat-Training
    x.uebungswoerter = 0;
    if (art === 'diktat') {
      (j.falscheWoerter || []).forEach(function (w) {
        var wort = F.spell.clean(w && (w.richtig || w.soll));
        if (!wort || wort.length < 2) return;
        if (F.state.trainWords.some(function (t) { return t.wort === wort; })) return;
        F.state.trainWords.push({ wort: wort, tipp: String(w.tipp || ''), kategorie: String(w.kategorie || 'Sonstiges'), added: Date.now(), richtigInFolge: 0, arbeitId: x.id });
        x.uebungswoerter++;
      });
    }
    // Fehler-Übung
    if (j.aufgaben && j.aufgaben.length) {
      var pack = F.buildPack(j, fach, { titel: 'Fehler-Übung: ' + x.titel, quelle: 'arbeit', arbeitId: x.id });
      if (pack) x.packId = pack.id;
    }
    F.state.arbeiten = (F.state.arbeiten || []).concat([x]);
    x.belt = F.addTore(tore, fach);
    x.belt = x.belt ? x.belt.name : '';
    F.save();
    F.go('arbeitResult', { id: x.id, fresh: true }, { replace: true });
  }).catch(function (e) { F.showAiError(e); });
};

F.views.arbeitResult = function (p) {
  var x = F.getArbeit(p.id);
  if (!x) return F.topbar('Arbeit') + '<p>Nicht gefunden.</p>';
  var s = F.subject(x.fach);
  if (p.fresh) {
    p.fresh = false;
    F.afterRender = function () { F.confetti(); F.speech.speak('Juhu! Super, dass du sie mir zeigst!'); };
  }
  var vergleich = '';
  if (x.vorher && x.prozent != null) {
    var d = x.prozent - x.vorher.prozent;
    vergleich = d > 0 ? '<div class="card gut center"><b>📈 Besser als letztes Mal!</b> ' + x.vorher.prozent + ' % → ' + x.prozent + ' % – das ist dein Training! 💪</div>' :
      d === 0 ? '<div class="card soft center"><b>➡️ Genauso stark wie letztes Mal.</b> Mit der Fehler-Übung geht’s weiter nach oben!</div>' :
      '<div class="card soft center"><b>Diesmal war es schwieriger.</b> Das passiert den Besten! Mit der Fehler-Übung holst du es dir zurück. 🦊</div>';
  }
  var was = F.artOf(x) === 'diktat' ? 'dein Diktat' : F.artOf(x) === 'test' ? 'deinen Test' : 'deine Arbeit';
  var head = '<div class="celebrate"><div class="big pop">🏆</div><h1>Danke, dass du ' + was + ' zeigst!</h1>' +
    (x.lob ? '<p style="font-size:1.25rem">' + F.esc(x.lob) + '</p>' : '') +
    '<p class="tore" style="font-size:1.3rem">+' + x.tore + ' Tore ⚽ in ' + s.emoji + ' ' + F.esc(s.name) + '</p>' +
    (x.note || x.maxPunkte ? '<p class="muted">' + (x.note ? 'Note: <b>' + F.esc(x.note) + '</b>' : '') +
      (x.maxPunkte && x.punkte !== '' ? (x.note ? ' · ' : '') + '<b>' + F.esc(x.punkte) + '</b> von ' + F.esc(x.maxPunkte) + ' Punkten' : '') + '</p>' : '') +
    '</div>';
  var html = F.topbar(s.name + ' · ' + F.art(F.artOf(x)).name, { home: true }) + head +
    (x.belt ? '<div class="card fuchs center"><h2>🥋 Neuer Gürtel: ' + F.esc(x.belt) + '!</h2></div>' : '') +
    (x.awards.length ? '<h2 class="center">Deine Auszeichnungen</h2>' + F.awardCardsHtml(x.awards) : '') +
    vergleich +
    (x.uebungswoerter ? '<div class="card fuchs center"><h2>🔤 ' + x.uebungswoerter + (x.uebungswoerter === 1 ? ' Wort ist' : ' Wörter sind') + ' jetzt in deinen Übungswörtern</h2>' +
      F.goBtn('trainSetup', { source: 'train' }, '💪 Übungswörter trainieren', 'btn big block fuchs') + '</div>' : '') +
    (x.gutGemacht.length ? '<div class="card gut"><h2>⭐ Das kannst du schon super</h2><ul class="big-list">' +
      x.gutGemacht.map(function (g) { return '<li>' + F.esc(g) + '</li>'; }).join('') + '</ul></div>' : '') +
    (x.lehrerKommentar ? '<div class="card soft"><b>✍️ Deine Lehrerin schreibt:</b><p style="margin:6px 0 0">„' + F.esc(x.lehrerKommentar) + '“</p></div>' : '') +
    (x.ueben.length ? '<div class="card"><h2>💪 Das üben wir noch</h2>' + x.ueben.map(function (u) {
      return '<div style="margin-bottom:14px"><h3 style="margin-bottom:4px">' + F.esc(u.thema) + '</h3>' + (u.erklaerung ? '<p style="margin:0">' + F.esc(u.erklaerung) + '</p>' : '') +
        (u.schritte.length ? F.mtask.stepsHtml({ loesungsweg: u.schritte }) : '') + (u.beispiel ? '<p class="small"><b>Beispiel:</b> ' + F.esc(u.beispiel) + '</p>' : '') + '</div>';
    }).join('') + '</div>' : '') +
    (x.fehler.length ? '<details class="card"><summary>🔍 Die Fehler genau anschauen (' + x.fehler.length + ')</summary>' + x.fehler.map(function (f) {
      return '<div class="err-card" style="margin-top:12px"><p><b>' + F.esc(f.aufgabe) + '</b></p>' +
        (f.kindAntwort ? '<div class="small muted">Du hattest: <span style="text-decoration:line-through">' + F.esc(f.kindAntwort) + '</span></div>' : '') +
        (f.richtig ? '<div class="correct" style="font-size:1.3rem">' + F.esc(f.richtig) + '</div>' : '') +
        (f.erklaerung ? '<p>💡 ' + F.esc(f.erklaerung) + '</p>' : '') + '</div>';
    }).join('') + '</details>' : '');
  var pack = x.packId ? F.getPack(x.packId) : null;
  if (pack) {
    html += '<div class="card fuchs center"><h2>🎯 Fehler-Übung</h2><p>' + F.nAufgaben(pack.aufgaben.length) + ' zu den Sachen, die noch nicht so gut geklappt haben.' +
      (x.detektiv ? ' <b>✓ Schon geschafft – du bist eine Fehler-Detektivin! 🔍</b>' : ' Schaffst du sie, bekommst du die <b>🔍 Fehler-Detektivin</b>-Auszeichnung und +15 Tore!') + '</p>' +
      '<button class="btn big block fuchs" data-action="startPack" data-id="' + pack.id + '" data-mode="runde">💪 Fehler-Übung starten</button></div>';
  }
  html += '<button class="btn big block light" data-action="back">Fertig</button>' +
    '<p class="small muted center">Hat ' + F.esc(F.fox()) + ' etwas falsch gelesen? Die Note und Punkte siehst du nur zur Erinnerung – wichtig ist, dass du übst! 🦊</p>' +
    '<button class="btn danger small" data-action="delArbeit" data-id="' + x.id + '">🗑️ Löschen</button>';
  return html;
};
F.actions.delArbeit = function (el) {
  if (!confirm('Wirklich löschen? (Tore und Auszeichnungen bleiben.)')) return;
  var id = el.getAttribute('data-id');
  F.state.arbeiten = (F.state.arbeiten || []).filter(function (x) { return x.id !== id; });
  F.save();
  F.back();
};

/* Wird nach jeder Übung aufgerufen: Fehler-Übung geschafft → Auszeichnung */
F.onPackFinished = function (pack, lp, pct) {
  if (!pack || !pack.arbeitId) return null;
  var x = F.getArbeit(pack.arbeitId);
  if (!x || x.detektiv) return null;
  if (pct < 50) return { tore: 0, html: '<div class="card soft center"><p>Noch ' + (50 - pct) + ' % bis zur 🔍 <b>Fehler-Detektivin</b>-Auszeichnung. Probier die Fehler-Übung nochmal – du schaffst das!</p></div>' };
  x.detektiv = true;
  var g = F.giveAward('detektiv');
  x.awards.push(g);
  F.save();
  setTimeout(F.confetti, 300);
  return { tore: 15, html: '<h2 class="center">Neue Auszeichnung!</h2>' + F.awardCardsHtml([g]) + '<p class="center">Du hast aus deinen Fehlern gelernt – genau so werden Champions gemacht! 🏆</p>' };
};
