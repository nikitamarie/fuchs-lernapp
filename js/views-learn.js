/* Nachlesen (Merkkarten) und Lernpakete aus Fotos für alle Fächer */

F.subjectChips = function (group, selected, withAll) {
  var chips = withAll ? '<button class="chip ' + (!selected ? 'on' : '') + '" data-action="filterSubject" data-group="' + group + '" data-val="">Alle</button>' : '';
  return '<div class="chips" id="' + group + '">' + chips + F.SUBJECTS.map(function (s) {
    return '<button class="chip ' + (selected === s.id ? 'on' : '') + '" data-action="filterSubject" data-group="' + group + '" data-val="' + s.id + '">' + s.emoji + ' ' + s.name + '</button>';
  }).join('') + '</div>';
};
F.actions.filterSubject = function (el) {
  var g = el.getAttribute('data-group');
  var v = el.getAttribute('data-val');
  if (g === 'notesFilter' || g === 'packsFilter') {
    F.current.params.fach = v;
    F.render();
  } else {
    F.$$('#' + g + ' .chip').forEach(function (c) { c.className = 'chip' + (c === el ? ' on' : ''); });
  }
};

/* ---------------- Nachlesen ---------------- */
F.allNotes = function () {
  var own = F.state.notes.map(function (n) { return { id: n.id, fach: n.fach, titel: n.titel, text: n.text, beispiel: n.beispiel, emoji: '⭐', own: true, quelle: n.quelle }; });
  return own.reverse().concat(F.BUILTIN_NOTES);
};
F.getNote = function (id) {
  var all = F.allNotes();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
};

F.views.notesHome = function (p) {
  var fach = p.fach || '';
  var list = F.allNotes().filter(function (n) { return !fach || n.fach === fach; });
  var items = list.map(function (n) {
    return '<button class="list-item" data-action="go" data-view="noteDetail" data-params="' + F.esc(JSON.stringify({ id: n.id })) + '">' +
      '<span class="li-emoji">' + (n.emoji || F.subject(n.fach).emoji) + '</span>' +
      '<span class="li-main"><span class="li-title">' + F.esc(n.titel) + '</span>' +
      '<span class="li-sub">' + F.subject(n.fach).name + (n.own ? ' · von deinem Foto' : '') + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  return F.topbar('Nachlesen', { home: true }) +
    '<p class="muted">Hier stehen Regeln und Merksätze. Lies in Ruhe – eine Karte nach der anderen.</p>' +
    F.subjectChips('notesFilter', fach, true) +
    (items || '<div class="card soft"><p>Für dieses Fach gibt es noch keine Karten. Mach ein Foto von der Mappe! 📷</p></div>') +
    F.goBtn('noteNew', {}, '📷 Merkkarten aus Foto machen', 'btn big block fuchs mt');
};

F.views.noteDetail = function (p) {
  var n = F.getNote(p.id);
  if (!n) return F.topbar('Nachlesen') + '<p>Nicht gefunden.</p>';
  return F.topbar(F.subject(n.fach).name) +
    '<div class="card"><div style="font-size:3rem">' + (n.emoji || F.subject(n.fach).emoji) + '</div>' +
    '<h1>' + F.esc(n.titel) + '</h1>' +
    '<p style="font-size:1.35rem;line-height:1.6">' + F.esc(n.text) + '</p>' +
    (n.beispiel ? '<div class="card soft" style="margin-bottom:0"><b>Beispiel:</b><p style="font-size:1.3rem;margin:6px 0 0">' + F.esc(n.beispiel) + '</p></div>' : '') +
    '</div>' +
    '<div class="btn-row"><button class="btn light" data-action="readNote" data-id="' + F.esc(n.id) + '">🔊 Vorlesen</button>' +
    (n.own ? '<button class="btn danger" data-action="deleteNote" data-id="' + F.esc(n.id) + '">🗑️ Löschen</button>' : '') + '</div>' +
    (n.quelle ? '<p class="muted small">Aus: ' + F.esc(n.quelle) + '</p>' : '');
};
F.actions.readNote = function (el) {
  var n = F.getNote(el.getAttribute('data-id'));
  F.speech.speak(n.titel + '. ' + n.text + (n.beispiel ? ' Beispiel: ' + n.beispiel : ''));
};
F.actions.deleteNote = function (el) {
  if (!confirm('Diese Merkkarte löschen?')) return;
  var id = el.getAttribute('data-id');
  F.state.notes = F.state.notes.filter(function (n) { return n.id !== id; });
  F.save();
  F.back();
};

F.views.noteNew = function () {
  var imgs = F.pendingImages.note || [];
  return F.topbar('Merkkarten aus Foto') +
    '<div class="card"><h2>1. Welches Fach?</h2>' + F.subjectChips('noteFach', 'deutsch', false) + '</div>' +
    '<div class="card"><h2>2. Foto machen</h2><p>Fotografiere Regeln, Merksätze oder Lösungswege aus Mappe oder Buch.</p>' + F.photoPicker('note') + '</div>' +
    '<button class="btn big block fuchs" data-action="makeNotes" ' + (imgs.length ? '' : 'disabled') + '>🦊 Merkkarten erstellen</button>';
};
F.actions.makeNotes = function () {
  var imgs = F.pendingImages.note || [];
  var fachEl = F.$('#noteFach .chip.on');
  var fach = fachEl ? fachEl.getAttribute('data-val') : 'deutsch';
  document.getElementById('app').innerHTML = F.loadingHtml('Merkkarten', F.fox() + ' schreibt Merkkarten …');
  F.ai.generateJSON(F.prompts.merkzettel(F.subject(fach).name), imgs).then(function (j) {
    F.pendingImages.note = [];
    var karten = (j.karten || []).filter(function (k) { return k && k.text; });
    karten.forEach(function (k) {
      F.state.notes.push({ id: F.uid(), fach: fach, titel: k.titel || 'Merksatz', text: k.text, beispiel: k.beispiel || '', created: Date.now(), quelle: j.titel || '' });
    });
    F.save();
    F.toast(karten.length + ' Merkkarten gespeichert! ⭐');
    F.go('notesHome', { fach: fach }, { replace: true });
  }).catch(function (e) { F.showAiError(e); });
};

/* ---------------- Lernpakete (Übungen aus Fotos, alle Fächer) ---------------- */
F.getPack = function (id) {
  for (var i = 0; i < F.state.packs.length; i++) if (F.state.packs[i].id === id) return F.state.packs[i];
  return null;
};

F.views.packsHome = function (p) {
  var fach = p.fach || '';
  var list = F.state.packs.filter(function (x) { return !fach || x.fach === fach; }).sort(function (a, b) { return b.created - a.created; });
  var items = list.map(function (x) {
    var s = F.subject(x.fach);
    return '<button class="list-item" data-action="go" data-view="packDetail" data-params="' + F.esc(JSON.stringify({ id: x.id })) + '">' +
      '<span class="li-emoji">' + s.emoji + '</span><span class="li-main"><span class="li-title">' + F.esc(x.titel) + '</span>' +
      '<span class="li-sub">' + s.name + ' · ' + x.aufgaben.length + ' Aufgaben' + (x.best != null ? ' · Bestes: ' + x.best + '%' : '') + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  return F.topbar('Üben mit Fotos', { home: true }) +
    F.countdownHtml() +
    '<p class="muted">Fotografiere Seiten aus Mappe oder Buch – ' + F.esc(F.fox()) + ' macht daraus Übungen wie in einer Klassenarbeit.</p>' +
    F.subjectChips('packsFilter', fach, true) +
    (items || '<div class="card soft"><p>Noch keine Übungen. Los geht’s mit dem ersten Foto! 📷</p></div>') +
    F.goBtn('packNew', { fach: fach || 'mathe' }, '📷 Neue Übung aus Foto', 'btn big block fuchs mt');
};

F.views.packNew = function (p) {
  var imgs = F.pendingImages.pack || [];
  return F.topbar('Neue Übung') +
    '<div class="card"><h2>1. Welches Fach?</h2>' + F.subjectChips('packFach', p.fach || 'mathe', false) + '</div>' +
    '<div class="card"><h2>2. Fotos machen</h2><p>Am besten die Seiten, die in der Klassenarbeit drankommen.</p>' + F.photoPicker('pack') + '</div>' +
    '<button class="btn big block fuchs" data-action="makePack" ' + (imgs.length ? '' : 'disabled') + '>🦊 Übung erstellen</button>';
};
F.actions.makePack = function () {
  var imgs = F.pendingImages.pack || [];
  var fachEl = F.$('#packFach .chip.on');
  var fach = fachEl ? fachEl.getAttribute('data-val') : 'mathe';
  document.getElementById('app').innerHTML = F.loadingHtml('Neue Übung', F.fox() + ' denkt sich Aufgaben aus …');
  F.ai.generateJSON(F.prompts.lernpaket(F.subject(fach).name, 12), imgs).then(function (j) {
    F.pendingImages.pack = [];
    var aufgaben = (j.aufgaben || []).filter(function (a) { return a && a.frage && a.antwort != null; }).map(function (a) {
      var typ = a.typ === 'auswahl' && a.optionen && a.optionen.length >= 2 ? 'auswahl' : 'eingabe';
      var opts = typ === 'auswahl' ? a.optionen.map(String) : [];
      if (typ === 'auswahl' && opts.indexOf(String(a.antwort)) < 0) opts.push(String(a.antwort));
      return { typ: typ, frage: String(a.frage), optionen: opts, antwort: String(a.antwort), hilfe: String(a.hilfe || ''), erklaerung: String(a.erklaerung || '') };
    });
    if (!aufgaben.length) throw new Error('Aus diesen Fotos konnten keine Aufgaben gemacht werden. Vielleicht ein anderes Foto probieren?');
    var pack = { id: F.uid(), fach: fach, titel: j.titel || F.subject(fach).name, aufgaben: aufgaben, created: Date.now(), best: null };
    F.state.packs.push(pack);
    (j.merkkarten || []).forEach(function (k) {
      if (k && k.text) F.state.notes.push({ id: F.uid(), fach: fach, titel: k.titel || 'Merksatz', text: k.text, beispiel: k.beispiel || '', created: Date.now(), quelle: pack.titel });
    });
    F.save();
    F.go('packDetail', { id: pack.id }, { replace: true });
  }).catch(function (e) { F.showAiError(e); });
};

F.views.packDetail = function (p) {
  var x = F.getPack(p.id);
  if (!x) return F.topbar('Übung') + '<p>Nicht gefunden.</p>';
  var s = F.subject(x.fach);
  var rounds = Math.ceil(x.aufgaben.length / 5);
  return F.topbar(s.name, { home: true }) +
    '<div class="card center"><div style="font-size:3rem">' + s.emoji + '</div><h1>' + F.esc(x.titel) + '</h1>' +
    '<p>' + x.aufgaben.length + ' Aufgaben · in ' + rounds + (rounds === 1 ? ' kurzen Runde' : ' kurzen Runden') + ' zu je 5</p>' +
    (x.best != null ? '<p class="muted">Dein bestes Ergebnis: ' + x.best + '%</p>' : '') + '</div>' +
    '<button class="btn big block fuchs" data-action="startPack" data-id="' + x.id + '" data-mode="runde">🎯 Trainingsrunde (5 Aufgaben)</button>' +
    '<button class="btn big block" data-action="startPack" data-id="' + x.id + '" data-mode="probe">📋 Probe-Klassenarbeit (alle Aufgaben)</button>' +
    '<p class="muted small center">Bei der Probe-Klassenarbeit gibt es erst am Ende die Auswertung – wie in echt. Aber ohne Zeitdruck!</p>' +
    '<div class="btn-row mt"><button class="btn danger small" data-action="deletePack" data-id="' + x.id + '">🗑️ Übung löschen</button></div>';
};
F.actions.deletePack = function (el) {
  if (!confirm('Diese Übung löschen?')) return;
  var id = el.getAttribute('data-id');
  F.state.packs = F.state.packs.filter(function (x) { return x.id !== id; });
  F.save();
  F.back();
};

F.actions.startPack = function (el) {
  var x = F.getPack(el.getAttribute('data-id'));
  var mode = el.getAttribute('data-mode');
  var list = mode === 'probe' ? x.aufgaben.slice() : F.shuffle(x.aufgaben).slice(0, 5);
  F.lp = { packId: x.id, mode: mode, list: list.map(function (a) { return { a: a, opts: a.typ === 'auswahl' ? F.shuffle(a.optionen) : null }; }),
    idx: 0, richtig: 0, state: 'frage', hintShown: false, tries: 0, results: [] };
  F.go('packPlay', {});
};

F.lpCheck = function (given, correct, fach) {
  var g = F.spell.norm(given), c = F.spell.norm(correct);
  if (g === c) return 'ok';
  var num = function (s) { return s.replace(/\s/g, '').replace(',', '.').replace(/\.$/, ''); };
  if (/^-?[\d\s.,]+$/.test(g) && /^-?[\d\s.,]+$/.test(c)) {
    var gn = parseFloat(num(g).replace(/\.(?=\d{3}\b)/g, '')), cn = parseFloat(num(c).replace(/\.(?=\d{3}\b)/g, ''));
    if (!isNaN(gn) && gn === cn) return 'ok';
  }
  var strip = function (s) { return s.replace(/[.!?]+$/, '').trim(); };
  if (strip(g) === strip(c)) return 'ok';
  if (strip(g).toLowerCase() === strip(c).toLowerCase()) return fach === 'deutsch' ? 'case' : 'ok';
  return 'no';
};

F.views.packPlay = function () {
  var lp = F.lp;
  if (!lp) { setTimeout(F.back, 0); return ''; }
  var x = F.getPack(lp.packId);
  var item = lp.list[lp.idx];
  var a = item.a;
  var dots = lp.list.map(function (q, i) { return '<span class="' + (i < lp.idx ? 'done' : i === lp.idx ? 'now' : '') + '"></span>'; }).join('');
  var html = F.topbar(F.subject(x.fach).name, { home: true }) +
    (lp.list.length > 12 ? '<div class="progress"><div style="width:' + Math.round(lp.idx / lp.list.length * 100) + '%"></div></div>' : '<div class="dots">' + dots + '</div>') +
    '<div class="stage">';
  if (lp.state === 'feedback') {
    return html + lp.fbHtml + '<button class="btn big block gut" data-action="lpNext">Weiter ›</button></div>';
  }
  html += '<p class="small muted">Aufgabe ' + (lp.idx + 1) + ' von ' + lp.list.length + '</p>' +
    '<p class="prompt">' + F.esc(a.frage) + '</p>';
  if (a.typ === 'auswahl') {
    html += '<div class="options">' + item.opts.map(function (o) {
      return '<button class="option ' + (o.length > 18 ? 'text-left' : '') + '" data-action="lpPick" data-val="' + F.esc(o) + '">' + F.esc(o) + '</button>';
    }).join('') + '</div>';
  } else {
    html += '<input type="text" class="answer-input" id="lpInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Deine Antwort">' +
      '<button class="btn big block" data-action="lpType">Fertig ✓</button>';
  }
  if (lp.hintShown && a.hilfe) html += '<div class="feedback fast"><span class="fb-title">💡 Tipp</span>' + F.esc(a.hilfe) + '</div>';
  else if (a.hilfe && lp.mode !== 'probe') html += '<button class="btn light small" data-action="lpHint">💡 Ich brauche einen Tipp</button>';
  html += '</div>';
  if (a.typ !== 'auswahl') setTimeout(function () { var i = F.$('#lpInput'); if (i) i.focus(); }, 300);
  return html;
};
F.actions.lpHint = function () { F.lp.hintShown = true; F.render(); };

F.lpAnswer = function (given) {
  var lp = F.lp;
  var x = F.getPack(lp.packId);
  var a = lp.list[lp.idx].a;
  var res = F.lpCheck(given, a.antwort, x.fach);
  if (lp.mode === 'probe') {
    lp.results.push({ frage: a.frage, given: given, antwort: a.antwort, ok: res === 'ok', erklaerung: a.erklaerung });
    if (res === 'ok') lp.richtig++;
    F.actions.lpNext();
    return;
  }
  if (res === 'ok') {
    if (lp.tries === 0) lp.richtig++;
    lp.fbHtml = '<div class="big-emoji pop">' + F.rand(['⚽', '🥊', '🦊', '🐶', '⭐', '🤾‍♀️']) + '</div>' +
      '<div class="feedback gut"><span class="fb-title">' + F.rand(F.LOB) + '</span>' + F.esc(a.antwort) +
      (a.erklaerung ? '<div class="small mt">' + F.esc(a.erklaerung) + '</div>' : '') + '</div>';
    lp.state = 'feedback';
  } else if (lp.tries === 0 && a.typ === 'eingabe') {
    // erster Fehlversuch: Tipp zeigen und nochmal probieren lassen
    lp.tries = 1;
    lp.hintShown = true;
    F.toast(res === 'case' ? 'Fast! Achte auf groß und klein.' : 'Fast! Schau dir den Tipp an und probier es nochmal 🦊', 3500);
    F.render();
    return;
  } else {
    lp.fbHtml = '<div class="feedback fast"><span class="fb-title">' + F.rand(F.FAST) + '</span>' +
      'Richtig ist: <span class="fb-word">' + F.esc(a.antwort) + '</span>' +
      (a.erklaerung ? '<div><b>So geht’s:</b> ' + F.esc(a.erklaerung) + '</div>' : '') + '</div>';
    lp.state = 'feedback';
  }
  F.render();
};
F.actions.lpPick = function (el) { F.lpAnswer(el.getAttribute('data-val')); };
F.actions.lpType = function () {
  var v = F.$('#lpInput') ? F.$('#lpInput').value : '';
  if (!F.spell.norm(v)) { F.toast('Schreib deine Antwort ins Feld 🙂'); return; }
  F.lpAnswer(v);
};
F.actions.lpNext = function () {
  var lp = F.lp;
  lp.idx++;
  lp.state = 'frage'; lp.hintShown = false; lp.tries = 0;
  if (lp.idx >= lp.list.length) {
    var x = F.getPack(lp.packId);
    var pct = Math.round(lp.richtig / lp.list.length * 100);
    if (x.best == null || pct > x.best) x.best = pct;
    F.save();
    F.lp = null;
    var extra = '';
    if (lp.mode === 'probe') {
      var wrong = lp.results.filter(function (r) { return !r.ok; });
      extra = wrong.length ? '<h2>Das schauen wir uns nochmal an:</h2>' + wrong.map(function (r) {
        return '<div class="err-card"><p><b>' + F.esc(r.frage) + '</b></p>' +
          '<div class="small muted">Deine Antwort: ' + F.esc(r.given) + '</div>' +
          '<div class="correct">' + F.esc(r.antwort) + '</div>' +
          (r.erklaerung ? '<p>💡 ' + F.esc(r.erklaerung) + '</p>' : '') + '</div>';
      }).join('') : '';
    }
    F.finishRound({
      titel: lp.mode === 'probe' ? 'Probe-Klassenarbeit geschafft!' : 'Runde geschafft!',
      text: lp.richtig + ' von ' + lp.list.length + ' richtig' + (lp.mode === 'probe' ? ' (' + pct + '%).' : ' beim ersten Versuch.'),
      tore: lp.richtig + (lp.mode === 'probe' ? 5 : 2),
      again: null,
      extraHtml: extra
    });
    return;
  }
  F.render();
};
