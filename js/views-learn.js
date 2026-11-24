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
  var own = F.state.notes.map(function (n) { return { id: n.id, fach: n.fach, titel: n.titel, text: n.text, beispiel: n.beispiel, schritte: n.schritte, beispielSchritte: n.beispielSchritte, emoji: n.schritte ? '📘' : '⭐', own: true, quelle: n.quelle }; });
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
    F.themeStepsHtml(n) +
    (n.beispiel && !(n.beispielSchritte && n.beispielSchritte.length) ? '<div class="card soft" style="margin-bottom:0"><b>Beispiel:</b><p style="font-size:1.3rem;margin:6px 0 0">' + F.esc(n.beispiel) + '</p></div>' : '') +
    '</div>' +
    '<div class="btn-row"><button class="btn light" data-action="readNote" data-id="' + F.esc(n.id) + '">🔊 Vorlesen</button>' +
    (n.own ? '<button class="btn danger" data-action="deleteNote" data-id="' + F.esc(n.id) + '">🗑️ Löschen</button>' : '') + '</div>' +
    (n.quelle ? '<p class="muted small">Aus: ' + F.esc(n.quelle) + '</p>' : '');
};
/* Erklärung "So rechnest du" mit Schritten und durchgerechnetem Beispiel */
F.themeStepsHtml = function (n) {
  var h = '';
  if (n.schritte && n.schritte.length) h += '<div class="steps-box"><b>📘 So geht’s:</b><ol>' + n.schritte.map(function (x) { return '<li>' + F.esc(x) + '</li>'; }).join('') + '</ol></div>';
  if (n.beispielSchritte && n.beispielSchritte.length) h += '<div class="steps-box example"><b>✏️ Beispiel' + (n.beispiel ? ': ' + F.esc(n.beispiel) : '') + '</b><ol>' +
    n.beispielSchritte.map(function (x) { return '<li>' + F.esc(x) + '</li>'; }).join('') + '</ol></div>';
  return h;
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
    var karten = (j.karten || []).filter(function (k) { return k && (k.text || k.schritte); });
    karten.forEach(function (k) {
      F.state.notes.push({ id: F.uid(), fach: fach, titel: k.titel || 'Merksatz', text: k.text, beispiel: k.beispiel || '',
        schritte: F.mtask.steps({ schritte: k.schritte || [] }), beispielSchritte: F.mtask.steps({ schritte: k.beispielSchritte || [] }), created: Date.now(), quelle: j.titel || '' });
    });
    F.save();
    F.toast(karten.length + ' Merkkarten gespeichert! ⭐');
    F.go('notesHome', { fach: fach }, { replace: true });
  }).catch(function (e) { F.showAiError(e); });
};

/* ---------------- Lernpakete (Übungen aus Fotos, alle Fächer) ---------------- */
F.getPack = function (id) {
  if (id === 'local' && F.tempPack) return F.tempPack;
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
      '<span class="li-sub">' + s.name + (x.quelle === 'checkliste' ? ' · 📝 Checkliste' : '') + ' · ' + F.nAufgaben(x.aufgaben.length) + (x.best != null ? ' · Bestes: ' + x.best + '%' : '') + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  return F.topbar('Üben mit Fotos', { home: true }) +
    F.countdownHtml() +
    '<p class="muted">Fotografiere Seiten aus Mappe oder Buch – oder gib die Checkliste für die Klassenarbeit ein. ' + F.esc(F.fox()) + ' macht daraus Übungen wie in einer Klassenarbeit.</p>' +
    F.subjectChips('packsFilter', fach, true) +
    (items || '<div class="card soft"><p>Noch keine Übungen. Los geht’s mit dem ersten Foto! 📷</p></div>') +
    '<div class="btn-row mt">' + F.goBtn('packNew', { fach: fach || 'mathe', mode: 'fotos' }, '📷 Aus Fotos von Aufgaben', 'btn big fuchs') +
    F.goBtn('packNew', { fach: fach || 'mathe', mode: 'checkliste' }, '📝 Aus einer Checkliste', 'btn big') + '</div>';
};

F.views.packNew = function (p) {
  var imgs = F.pendingImages.pack || [];
  var mode = p.mode || 'fotos';
  var modeChip = function (m, label) {
    return '<button class="chip ' + (mode === m ? 'on' : '') + '" data-action="packMode" data-mode="' + m + '">' + label + '</button>';
  };
  var html = F.topbar('Neue Übung') +
    '<div class="card"><h2>Woraus soll ich Aufgaben machen?</h2><div class="chips">' +
    modeChip('fotos', '📷 Fotos von Aufgaben') + modeChip('checkliste', '📝 Checkliste / Themenliste') + '</div>' +
    '<p class="small muted">' + (mode === 'fotos' ? 'Arbeitsblätter, Buch- oder Heftseiten fotografieren – ' + F.esc(F.fox()) + ' macht ähnliche Aufgaben.' :
      'Nur eine Checkliste für die Klassenarbeit (z. B. „Ich kann …“) oder eine Themenliste? ' + F.esc(F.fox()) + ' denkt sich passende Aufgaben für Klasse und Bundesland aus.') + '</p></div>' +
    '<div class="card"><h2>1. Welches Fach?</h2>' + F.subjectChips('packFach', p.fach || 'mathe', false) +
    '<h3 class="mt">Für welche Klassenarbeit?</h3><select id="pkExam"><option value="">– keine bestimmte –</option>' +
    F.nextExams().map(function (e) { return '<option value="' + e.id + '" ' + (p.examId === e.id ? 'selected' : '') + '>' + F.subject(e.fach).emoji + ' ' + F.esc(e.titel) + ' (' + F.formatDate(e.datum) + ')</option>'; }).join('') +
    '</select></div>';
  if (mode === 'fotos') {
    html += '<div class="card"><h2>2. Fotos machen</h2><p>Am besten die Seiten, die in der Klassenarbeit drankommen.</p>' + F.photoPicker('pack') + '</div>' +
      '<button class="btn big block fuchs" data-action="makePack" ' + (imgs.length ? '' : 'disabled') + '>🦊 Übung erstellen</button>';
    return html;
  }
  html += '<div class="card"><h2>2. Für wen?</h2>' +
    (p.editSchool ? F.schoolFormHtml() + '<button class="btn small gut" data-action="saveSchool">Übernehmen</button>' :
      '<p style="font-size:1.1rem"><b>' + F.schoolLine() + '</b></p><button class="btn small light" data-action="editSchool">Ändern</button>') + '</div>' +
    '<div class="card"><h2>3. Die Checkliste</h2>' +
    '<p>Fotografiere die Checkliste <b>oder</b> tippe die Themen ein (ein Punkt pro Zeile). Beides zusammen geht auch.</p>' +
    F.photoPicker('pack', 'Checkliste fotografieren') +
    '<label class="field"><span>Themen / Checkliste eintippen</span><textarea id="ckText" style="min-height:150px" ' +
    'placeholder="z. B.\nIch kann Zahlen bis 1000 lesen und schreiben.\nIch kann Zahlen am Zahlenstrahl finden.\nIch kann Plus- und Minusaufgaben bis 1000 rechnen.">' + F.esc(F.ckDraft || '') + '</textarea></label></div>' +
    '<button class="btn big block fuchs" data-action="makePack">🦊 Aufgaben zur Checkliste erstellen</button>';
  return html;
};
F.actions.packMode = function (el) {
  F.current.params.mode = el.getAttribute('data-mode');
  F.render();
};
F.actions.editSchool = function () { F.saveCkDraft(); F.current.params.editSchool = true; F.render(); };
F.actions.saveSchool = function () { F.saveCkDraft(); F.readSchoolForm(); F.current.params.editSchool = false; F.render(); F.toast('Gespeichert ✓'); };
F.saveCkDraft = function () { var t = F.$('#ckText'); if (t) F.ckDraft = t.value; };
document.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'ckText') F.ckDraft = ev.target.value; });

/* Übung aus einer KI-Antwort bauen und speichern (auch für Fehler-Übungen nach echten Klassenarbeiten) */
F.buildPack = function (j, fach, extra) {
  var aufgaben = (j.aufgaben || []).map(function (a) {
    if (!a) return null;
    if (F.mtask.isMath(a)) return F.mtask.normalize(a);
    if (!a.frage || a.antwort == null) return null;
    var typ = a.typ === 'auswahl' && a.optionen && a.optionen.length >= 2 ? 'auswahl' : 'eingabe';
    var opts = typ === 'auswahl' ? a.optionen.map(String) : [];
    if (typ === 'auswahl' && opts.indexOf(String(a.antwort)) < 0) opts.push(String(a.antwort));
    return { typ: typ, frage: String(a.frage), optionen: opts, antwort: String(a.antwort), hilfe: String(a.hilfe || ''),
      erklaerung: String(a.erklaerung || ''), loesungsweg: F.mtask.steps(a), thema: String(a.thema || '') };
  }).filter(Boolean);
  if (!aufgaben.length) return null;
  var themen = (j.themen || []).filter(function (t) { return t && t.titel && (t.schritte || t.erklaerung); }).map(function (t) {
    return { titel: String(t.titel), text: String(t.erklaerung || ''), schritte: F.mtask.steps({ schritte: t.schritte || [] }),
      beispiel: String(t.beispiel || ''), beispielSchritte: F.mtask.steps({ schritte: t.beispielSchritte || t.beispielRechnung || [] }) };
  });
  var checkliste = (j.checkliste || []).map(function (c) { return String(c).trim(); }).filter(Boolean).slice(0, 15);
  var pack = { id: F.uid(), fach: fach, titel: (extra && extra.titel) || j.titel || F.subject(fach).name, aufgaben: aufgaben, themen: themen, created: Date.now(), best: null,
    checkliste: checkliste, quelle: 'fotos', fuer: '', stats: {} };
  for (var k in (extra || {})) pack[k] = extra[k];
  F.state.packs.push(pack);
  themen.forEach(function (t) {
    F.state.notes.push({ id: F.uid(), fach: fach, titel: t.titel, text: t.text, schritte: t.schritte, beispiel: t.beispiel, beispielSchritte: t.beispielSchritte, created: Date.now(), quelle: pack.titel });
  });
  (j.merkkarten || []).forEach(function (k2) {
    if (k2 && k2.text) F.state.notes.push({ id: F.uid(), fach: fach, titel: k2.titel || 'Merksatz', text: k2.text, beispiel: k2.beispiel || '', created: Date.now(), quelle: pack.titel });
  });
  return pack;
};

F.actions.makePack = function () {
  var imgs = F.pendingImages.pack || [];
  var fachEl = F.$('#packFach .chip.on');
  var fach = fachEl ? fachEl.getAttribute('data-val') : 'mathe';
  var ckMode = F.current.params.mode === 'checkliste';
  // Eingaben lesen, bevor der Lade-Bildschirm sie ersetzt
  var ckText = ckMode && F.$('#ckText') ? F.$('#ckText').value.trim() : '';
  if (ckMode && F.$('#scLand')) { F.readSchoolForm(); F.current.params.editSchool = false; }
  if (ckMode && !ckText && !imgs.length) { F.toast('Bitte die Checkliste fotografieren oder Themen eintippen 🙂', 4000); return; }
  if (!ckMode && !imgs.length) return;
  if (F.$('#pkExam')) F.current.params.examId = F.$('#pkExam').value;
  F.saveCkDraft();
  document.getElementById('app').innerHTML = F.loadingHtml('Neue Übung', F.fox() + ' denkt sich Aufgaben aus …');
  var prompt = ckMode ? F.prompts.checkliste(F.subject(fach).name, ckText, imgs.length > 0) :
    (fach === 'mathe' ? F.prompts.lernpaketMathe(12) : F.prompts.lernpaket(F.subject(fach).name, 12));
  F.ai.generateJSON(prompt, imgs).then(function (j) {
    F.pendingImages.pack = [];
    F.ckDraft = '';
    var pack = F.buildPack(j, fach, { quelle: ckMode ? 'checkliste' : 'fotos', fuer: ckMode ? F.prompts.kind() : '', examId: F.current.params.examId || '' });
    if (!pack) throw new Error('Aus diesen Fotos konnten keine Aufgaben gemacht werden. Vielleicht ein anderes Foto probieren?');
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
    (x.best != null ? '<p class="muted">Dein bestes Ergebnis: ' + x.best + '%</p>' : '') +
    (x.fuer ? '<p class="small muted">Aufgaben passend für: ' + F.esc(x.fuer) + '</p>' : '') + '</div>' +
    F.checklistHtml(x) +
    ((x.themen && x.themen.length) ? F.goBtn('packThemes', { id: x.id }, '📚 Lernen & Nachlesen: So geht’s', 'btn big block light') : '') +
    '<button class="btn big block fuchs" data-action="startPack" data-id="' + x.id + '" data-mode="runde">🎯 Trainingsrunde (5 Aufgaben)</button>' +
    '<button class="btn big block" data-action="startPack" data-id="' + x.id + '" data-mode="probe">📋 Probe-Klassenarbeit (alle Aufgaben)</button>' +
    '<p class="muted small center">Bei der Probe-Klassenarbeit gibt es erst am Ende die Auswertung – wie in echt. Aber ohne Zeitdruck!</p>' +
    '<div class="card mt"><label class="field" style="margin:0"><span>Gehört zur Klassenarbeit</span><select id="pkLink" data-pack="' + x.id + '">' +
    '<option value="">– keine –</option>' + F.state.exams.slice().sort(function (a, b) { return a.datum < b.datum ? 1 : -1; }).map(function (e) {
      return '<option value="' + e.id + '" ' + (x.examId === e.id ? 'selected' : '') + '>' + F.subject(e.fach).emoji + ' ' + F.esc(e.titel) + ' (' + F.formatDate(e.datum) + ')</option>';
    }).join('') + '</select></label></div>' +
    '<div class="btn-row mt"><button class="btn danger small" data-action="deletePack" data-id="' + x.id + '">🗑️ Thema löschen</button></div>';
};
F.sameThema = function (a, b) {
  var n = function (t) { return String(t || '').toLowerCase().replace(/^ich kann\s+/, '').replace(/[^a-zäöüß0-9]+/g, ' ').trim(); };
  if (!a || !b) return false;
  var x = n(a), y = n(b);
  if (x === y) return true;
  // "Zahlen bis 1000" passt auch zu "Ich kann Zahlen bis 1000 lesen."
  return x.length >= 6 && y.length >= 6 && (x.indexOf(y) >= 0 || y.indexOf(x) >= 0);
};
F.checklistHtml = function (x) {
  if (!x.checkliste || !x.checkliste.length) return '';
  var rows = x.checkliste.map(function (punkt) {
    var st = { ok: 0, n: 0 };
    Object.keys(x.stats || {}).forEach(function (k) { if (F.sameThema(k, punkt)) { st.ok += x.stats[k].ok; st.n += x.stats[k].n; } });
    var count = x.aufgaben.filter(function (a) { return F.sameThema(a.thema, punkt); }).length;
    var icon = !st.n ? '⚪' : (st.ok / st.n >= 0.8 && st.n >= 2 ? '🟢' : '🟡');
    var label = !st.n ? 'noch nicht geübt' : (icon === '🟢' ? 'kann ich schon gut!' : 'weiter üben (' + st.ok + ' von ' + st.n + ' richtig)');
    return '<div class="list-item" style="cursor:default"><span class="li-emoji">' + icon + '</span>' +
      '<span class="li-main"><span class="li-title" style="font-weight:600">' + F.esc(punkt) + '</span><span class="li-sub">' + label + '</span></span>' +
      (count ? '<button class="btn small light" style="margin:0" data-action="startPack" data-id="' + x.id + '" data-mode="runde" data-thema="' + F.esc(punkt) + '">Üben</button>' : '') +
      '</div>';
  }).join('');
  return '<h2>✅ Deine Checkliste</h2>' + rows;
};
F.views.packThemes = function (p) {
  var x = F.getPack(p.id);
  if (!x) return F.topbar('Erklärung') + '<p>Nicht gefunden.</p>';
  var cards = (x.themen || []).map(function (t) {
    return '<div class="card"><h2>' + F.esc(t.titel) + '</h2>' + (t.text ? '<p style="font-size:1.2rem">' + F.esc(t.text) + '</p>' : '') + F.themeStepsHtml(t) + '</div>';
  }).join('');
  return F.topbar('So geht’s') + (cards || '<p>Keine Erklärung vorhanden.</p>') +
    '<button class="btn big block light" data-action="back">Verstanden – zurück</button>';
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
  var thema = el.getAttribute('data-thema');
  var pool = thema ? x.aufgaben.filter(function (a) { return F.sameThema(a.thema, thema); }) : x.aufgaben;
  if (!pool.length) pool = x.aufgaben;
  var list = mode === 'probe' ? pool.slice() : F.shuffle(pool).slice(0, 5);
  F.lp = { packId: x.id, mode: mode, list: list.map(function (a) { return { a: a, opts: a.typ === 'auswahl' ? F.shuffle(a.optionen) : null }; }),
    idx: 0, richtig: 0, state: 'frage', hintShown: false, tries: 0, results: [], f: {}, af: null, marks: {}, satz: '' };
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
  html += '<p class="small muted">Aufgabe ' + (lp.idx + 1) + ' von ' + lp.list.length + '</p>';
  if (F.mtask.isMath(a)) {
    html += F.mtask.render(a, lp);
    if (lp.hintShown && a.hilfe) html += '<div class="feedback fast"><span class="fb-title">💡 Tipp</span>' + F.esc(a.hilfe) + '</div>';
    else if (a.hilfe && lp.mode !== 'probe') html += '<button class="btn light small" data-action="lpHint">💡 Ich brauche einen Tipp</button>';
    if (lp.mode !== 'probe' && x.themen && x.themen.length) html += F.goBtn('packThemes', { id: x.id }, '📘 Wie ging das nochmal?', 'btn light small');
    return html + '</div>';
  }
  html += '<p class="prompt">' + F.esc(a.frage) + '</p>';
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

/* Ergebnis je Checklisten-Punkt merken (nur der erste Versuch zählt) */
F.packStat = function (a, ok) {
  var lp = F.lp;
  if (lp.counted || !a.thema) return;
  lp.counted = true;
  var item = lp.list[lp.idx];
  var x = F.getPack((item && item.src) || lp.packId);
  if (!x || x.id === 'local') return;
  x.stats = x.stats || {};
  var st = x.stats[a.thema] = x.stats[a.thema] || { ok: 0, n: 0 };
  st.n++;
  if (ok) st.ok++;
  F.save();
};

/* Mathe-Aufgabe abgeben */
F.actions.mfDone = function () {
  var lp = F.lp, a = lp.list[lp.idx].a;
  var r = F.mtask.check(a, lp);
  if (r.empty) { F.toast('Trag zuerst dein Ergebnis ein 🙂'); return; }
  F.packStat(a, r.ok);
  var lob = function () { return '<div class="big-emoji pop">' + F.rand(['⚽', '🥊', '🦊', '🐶', '⭐', '🤾‍♀️']) + '</div>'; };
  if (lp.mode === 'probe') {
    lp.results.push({ frage: a.frage, given: r.given, ok: r.ok, a: a });
    if (r.ok) lp.richtig++;
    F.actions.lpNext();
    return;
  }
  if (r.ok) {
    if (lp.tries === 0) lp.richtig++;
    lp.fbHtml = lob() + '<div class="feedback gut"><span class="fb-title">' + F.rand(F.LOB) + '</span>' + F.mtask.solutionHtml(a) +
      (r.extra ? '<div class="small">' + F.esc(r.extra) + '</div>' : '') +
      (a.typ === 'sachaufgabe' && r.noSatz && a.antwortsatz ? '<div class="small mt">So kann dein Antwortsatz aussehen: <i>' + F.esc(a.antwortsatz) + '</i></div>' : '') +
      '</div>' + (a.loesungsweg && a.loesungsweg.length ? '<details class="mt" style="text-align:left"><summary>📘 Rechenweg ansehen</summary>' + F.mtask.stepsHtml(a) + '</details>' : '');
    lp.state = 'feedback';
  } else if (lp.tries === 0) {
    lp.tries = 1;
    lp.hintShown = true;
    F.toast(r.msg || 'Fast! Schau dir den Tipp an und probier es nochmal 🦊', 4500);
    F.render();
    return;
  } else {
    lp.fbHtml = '<div class="feedback fast"><span class="fb-title">' + F.rand(F.FAST) + '</span>So ist es richtig:' + F.mtask.solutionHtml(a) + '</div>' +
      F.mtask.stepsHtml(a);
    lp.state = 'feedback';
  }
  F.render();
};

F.lpAnswer = function (given) {
  var lp = F.lp;
  var x = F.getPack(lp.packId);
  var a = lp.list[lp.idx].a;
  var res = F.lpCheck(given, a.antwort, x.fach);
  F.packStat(a, res === 'ok');
  if (lp.mode === 'probe') {
    lp.results.push({ frage: a.frage, given: given, antwort: a.antwort, ok: res === 'ok', erklaerung: a.erklaerung, steps: a.loesungsweg });
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
      (a.erklaerung ? '<div><b>So geht’s:</b> ' + F.esc(a.erklaerung) + '</div>' : '') + '</div>' +
      (a.loesungsweg && a.loesungsweg.length ? F.mtask.stepsHtml(a) : '');
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
  F.hideToast();
  lp.idx++;
  lp.state = 'frage'; lp.hintShown = false; lp.tries = 0;
  lp.f = {}; lp.af = null; lp.marks = {}; lp.satz = ''; lp.counted = false;
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
        if (r.a) return '<div class="err-card"><p><b>' + F.esc(r.frage) + '</b></p><div class="small muted">Deine Antwort: ' + F.esc(r.given) + '</div>' +
          F.mtask.solutionHtml(r.a) + F.mtask.stepsHtml(r.a) + '</div>';
        return '<div class="err-card"><p><b>' + F.esc(r.frage) + '</b></p>' +
          '<div class="small muted">Deine Antwort: ' + F.esc(r.given) + '</div>' +
          '<div class="correct">' + F.esc(r.antwort) + '</div>' +
          (r.erklaerung ? '<p>💡 ' + F.esc(r.erklaerung) + '</p>' : '') + (r.steps && r.steps.length ? F.mtask.stepsHtml({ loesungsweg: r.steps }) : '') + '</div>';
      }).join('') : '';
    }
    var bonus = F.onPackFinished ? F.onPackFinished(x, lp, pct) : null;
    if (bonus) extra = bonus.html + extra;
    F.finishRound({
      titel: lp.mode === 'probe' ? 'Probe-Klassenarbeit geschafft!' : 'Runde geschafft!',
      text: lp.richtig + ' von ' + lp.list.length + ' richtig' + (lp.mode === 'probe' ? ' (' + pct + '%).' : ' beim ersten Versuch.'),
      tore: lp.richtig + (lp.mode === 'probe' ? 5 : 2) + (bonus ? bonus.tore : 0),
      again: x.id === 'local' && x.localTyp ? { view: 'matheLocal', params: { typ: x.localTyp } } : null,
      extraHtml: extra
    });
    return;
  }
  F.render();
};

document.addEventListener('change', function (ev) {
  if (!ev.target || ev.target.id !== 'pkLink') return;
  var x = F.getPack(ev.target.getAttribute('data-pack'));
  if (!x) return;
  x.examId = ev.target.value;
  F.save();
  F.toast(x.examId ? 'Zur Klassenarbeit hinzugefügt ✓' : 'Zuordnung entfernt');
});
