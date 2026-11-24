/* Kommende Klassenarbeiten: das Kind trägt sie selbst ein, sammelt die Themen
   und übt gezielt. Nach dem Termin kann die korrigierte Arbeit dazu hochgeladen werden. */

F.getExam = function (id) {
  for (var i = 0; i < F.state.exams.length; i++) if (F.state.exams[i].id === id) return F.state.exams[i];
  return null;
};
F.examPacks = function (e) { return F.state.packs.filter(function (x) { return x.examId === e.id; }); };
F.whenText = function (datum) {
  var d = F.daysUntil(datum);
  return d < 0 ? 'war am ' + F.formatDate(datum) : d === 0 ? 'heute' : d === 1 ? 'morgen' : 'in ' + d + ' Tagen';
};

/* Lernstand eines Themas über alle Übungen dieser Arbeit */
F.themaStatus = function (e, thema) {
  var st = { ok: 0, n: 0 }, count = 0, packId = '';
  F.examPacks(e).forEach(function (x) {
    Object.keys(x.stats || {}).forEach(function (k) { if (F.sameThema(k, thema)) { st.ok += x.stats[k].ok; st.n += x.stats[k].n; } });
    var c = x.aufgaben.filter(function (a) { return F.sameThema(a.thema, thema); }).length;
    if (c && !packId) packId = x.id;
    count += c;
  });
  var icon = !st.n ? '⚪' : (st.ok / st.n >= 0.8 && st.n >= 2 ? '🟢' : '🟡');
  var label = !count ? 'noch keine Übung' : !st.n ? 'noch nicht geübt' : (icon === '🟢' ? 'kann ich schon gut!' : 'weiter üben (' + st.ok + ' von ' + st.n + ' richtig)');
  return { icon: icon, label: label, packId: packId };
};

F.examListHtml = function (list, emptyText) {
  if (!list.length) return emptyText ? '<div class="card soft"><p>' + emptyText + '</p></div>' : '';
  return list.map(function (e) {
    var s = F.subject(e.fach);
    var n = (e.themen || []).length;
    return '<button class="list-item" data-action="go" data-view="examDetail" data-params="' + F.esc(JSON.stringify({ id: e.id })) + '">' +
      '<span class="li-emoji">' + s.emoji + '</span><span class="li-main"><span class="li-title">' + F.esc(e.titel || s.name + '-Arbeit') + '</span>' +
      '<span class="li-sub">' + F.art(F.artOf(e)).name + ' · ' + F.whenText(e.datum) + ' · ' + (n ? n + (n === 1 ? ' Thema' : ' Themen') : 'noch keine Themen') + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
};

/* ---------------- Neuen Termin eintragen (Klassenarbeit, Test, Diktat) ---------------- */
F.addDays = function (n) {
  var d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
};
F.views.examNew = function (p) {
  var quick = [['morgen', 1], ['in 3 Tagen', 3], ['in 1 Woche', 7], ['in 2 Wochen', 14]];
  var fach0 = p.fach || 'mathe';
  return F.topbar('Neuer Termin') +
    '<div class="card"><h2>1. Welches Fach?</h2>' + F.subjectChips('exFach', fach0, false) +
    '<h3 class="mt">Was schreibst du?</h3>' + F.artChipsHtml('exArt', p.art || 'arbeit', fach0) + '</div>' +
    '<div class="card"><h2>2. Wann ist es?</h2><div class="chips">' +
    quick.map(function (q) { return '<button class="chip" data-action="exQuick" data-d="' + F.addDays(q[1]) + '">' + q[0] + '</button>'; }).join('') + '</div>' +
    '<label class="field"><span>Datum</span><input type="date" id="exDatum" value="' + F.addDays(7) + '"></label></div>' +
    '<div class="card"><h2>3. Wie heißt es? <span class="muted small">(darfst du leer lassen)</span></h2>' +
    '<input type="text" id="exTitel" maxlength="50" placeholder="z. B. Mathe: Zahlen bis 1000"></div>' +
    '<div class="card"><h2>4. Welche Themen kommen dran? <span class="muted small">(geht auch später)</span></h2>' +
    '<textarea id="exThemen" style="min-height:120px" placeholder="Ein Thema pro Zeile, z. B.\nZahlen bis 1000\nPlus und Minus\nSachaufgaben"></textarea></div>' +
    '<button class="btn big block fuchs" data-action="saveExam">✓ Eintragen</button>';
};
F.actions.exQuick = function (el) {
  F.$('#exDatum').value = el.getAttribute('data-d');
  F.$$('.chip[data-action=exQuick]').forEach(function (c) { c.className = 'chip' + (c === el ? ' on' : ''); });
};
F.splitThemen = function (txt) {
  return String(txt || '').split(/\n+/).map(function (t) { return t.replace(/^[\s•\-–*·\d.)]+/, '').trim(); }).filter(Boolean);
};
F.actions.saveExam = function () {
  var fachEl = F.$('#exFach .chip.on');
  var fach = fachEl ? fachEl.getAttribute('data-val') : 'mathe';
  var datum = F.$('#exDatum').value;
  if (!datum) { F.toast('Bitte das Datum eintragen 📅'); return; }
  var art = F.chosenArt('exArt');
  if (art === 'diktat' && fach !== 'deutsch') art = 'arbeit';
  var e = { id: F.uid(), fach: fach, art: art, titel: F.$('#exTitel').value.trim() || F.defaultTitel(fach, art), datum: datum,
    themen: F.splitThemen(F.$('#exThemen').value).slice(0, 20), created: Date.now() };
  F.state.exams.push(e);
  F.save();
  F.toast('Eingetragen! Jetzt kannst du dafür üben 💪');
  F.go('examDetail', { id: e.id }, { replace: true });
};

/* ---------------- Ein Termin ---------------- */
F.views.examDetail = function (p) {
  var e = F.getExam(p.id);
  if (!e) return F.topbar('Termin') + '<p>Nicht gefunden.</p>';
  var art = F.artOf(e);
  e.themen = e.themen || [];
  var s = F.subject(e.fach);
  var d = F.daysUntil(e.datum);
  var packs = F.examPacks(e);
  var arbeit = (F.state.arbeiten || []).filter(function (x) { return x.examId === e.id; })[0];
  var html = F.topbar(s.name, { home: true }) +
    '<div class="card center"><div style="font-size:3rem">' + s.emoji + '</div><h1>' + F.esc(e.titel) + '</h1>' +
    '<p><span class="art-tag">' + F.artLabel(e) + '</span></p>' +
    '<p style="font-size:1.2rem">' + (d >= 0 ? '📅 ' + F.formatDate(e.datum) + ' – <b>' + F.whenText(e.datum) + '</b>' + (d <= 1 ? ' – du schaffst das! 💪' : '') :
      '📅 ' + F.whenText(e.datum)) + '</p></div>';

  // Nach dem Termin: korrigierte Arbeit
  if (d < 0 || arbeit) {
    html += arbeit ?
      '<button class="list-item" data-action="go" data-view="arbeitResult" data-params="' + F.esc(JSON.stringify({ id: arbeit.id })) + '" style="border:3px solid #f2c94c">' +
        '<span class="li-emoji">🏅</span><span class="li-main"><span class="li-title">' + (art === 'diktat' ? 'Dein korrigiertes Diktat' : art === 'test' ? 'Dein korrigierter Test' : 'Deine korrigierte Arbeit') + '</span><span class="li-sub">' +
        (arbeit.note ? 'Note ' + F.esc(arbeit.note) + ' · ' : '') + (arbeit.awards || []).map(function (g) { return F.award(g.id).e; }).join('') + '</span></span><span class="li-arrow">›</span></button>' :
      '<div class="card fuchs center"><h2>' + F.art(art).name + ' schon zurückbekommen?</h2><p>Zeig ' + (art === 'test' ? 'ihn' : art === 'diktat' ? 'es' : 'sie') + ' ' + F.esc(F.fox()) + ' – dafür gibt es Tore und Auszeichnungen! ⚽</p>' +
        F.goBtn('arbeitNew', { fach: e.fach, examId: e.id, art: art }, '📷 Korrigiert hochladen', 'btn big block fuchs') + '</div>';
  }
  // Diktat: Lernwörter und Diktat-Training direkt hier
  if (art === 'diktat' && d >= 0) {
    html += '<h2 class="mt">🔤 Fürs Diktat üben</h2><div class="g2">' +
      F.goBtn('diktatNew', { mode: 'foto' }, '📷 Lernwörter / Übungsdiktat fotografieren', 'btn big fuchs') +
      F.goBtn('diktatHome', {}, '📝 Diktat üben' + (F.state.trainWords.length ? ' (' + F.state.trainWords.length + ' Übungswörter)' : ''), 'btn big') + '</div>';
  }

  // Themen
  html += '<h2 class="mt">📋 Themen für die Arbeit</h2>' +
    (e.themen.length ? e.themen.map(function (t, i) {
      var st = F.themaStatus(e, t);
      return '<div class="list-item" style="cursor:default"><span class="li-emoji">' + st.icon + '</span>' +
        '<span class="li-main"><span class="li-title" style="font-weight:600">' + F.esc(t) + '</span><span class="li-sub">' + st.label + '</span></span>' +
        (st.packId ? '<button class="btn small light" style="margin:0 8px 0 0" data-action="startPack" data-id="' + st.packId + '" data-mode="runde" data-thema="' + F.esc(t) + '">Üben</button>' : '') +
        '<button class="btn small ghost" style="margin:0;min-width:48px" data-action="delThema" data-i="' + i + '" aria-label="Thema löschen">✕</button></div>';
    }).join('') : '<div class="card soft"><p>Noch keine Themen. Schreib auf, was in der Arbeit drankommt – oder fotografiere die Checkliste von deiner Lehrerin!</p></div>') +
    '<div class="card"><div class="btn-row" style="align-items:center"><input type="text" id="newThema" maxlength="80" placeholder="Neues Thema, z. B. Zahlen am Zahlenstrahl" style="flex:1 1 240px;margin:0 8px 10px 0">' +
    '<button class="btn gut" style="flex:0 0 auto" data-action="addThema">+ Hinzufügen</button></div>' +
    F.fileButton('examCk', '📷 Checkliste fotografieren', 'btn light small') +
    ((F.pendingImages.examCk || []).length ? '<button class="btn small fuchs" data-action="themenAusFoto">🦊 Themen aus Foto übernehmen (' + F.pendingImages.examCk.length + ' Foto)</button>' : '') +
    F.aiErrorHtml() + '</div>';

  // Üben
  var newer = packs.length && e.themen.some(function (t) { return !F.themaStatus(e, t).packId; });
  var nAuf = packs.reduce(function (n, x) { return n + x.aufgaben.length; }, 0);
  if (nAuf) html += '<h2 class="mt">🎤 Üben für den großen Tag</h2><div class="g2">' +
    '<button class="btn big fuchs" data-action="examPractice" data-id="' + e.id + '" data-mode="probe">📋 Probearbeit (' + Math.min(15, nAuf) + ' Aufgaben)</button>' +
    '<button class="btn big" data-action="examPractice" data-id="' + e.id + '" data-mode="runde">⚡ Kurztest (5 Aufgaben)</button></div>' +
    '<p class="small muted center">Aufgaben aus allen Themen dieser Arbeit gemischt – ohne Zeitdruck.</p>';
  html += '<h2 class="mt">📚 Themen & Übungen</h2>' +
    (e.themen.length ? '<button class="btn big block fuchs" data-action="examMakePack">' +
      (packs.length ? (newer ? '🦊 Neue Übung (mit den neuen Themen)' : '🦊 Noch eine Übung zu meinen Themen') : '🦊 Übungen zu meinen Themen erstellen') + '</button>' : '') +
    F.goBtn('packNew', { fach: e.fach, mode: 'fotos', examId: e.id }, '📸 Thema dafür fotografieren', 'btn big block light') +
    packs.map(function (x) {
      return '<button class="list-item" data-action="go" data-view="packDetail" data-params="' + F.esc(JSON.stringify({ id: x.id })) + '">' +
        '<span class="li-emoji">' + (x.quelle === 'fotos' ? '📷' : '📝') + '</span><span class="li-main"><span class="li-title">' + F.esc(x.titel) + '</span>' +
        '<span class="li-sub">' + F.nAufgaben(x.aufgaben.length) + (x.best != null ? ' · Bestes: ' + x.best + '%' : '') + '</span></span><span class="li-arrow">›</span></button>';
    }).join('');

  html += '<details class="card mt"><summary>✏️ Arbeit bearbeiten</summary>' +
    '<label class="field mt"><span>Name</span><input type="text" id="edTitel" value="' + F.esc(e.titel) + '"></label>' +
    '<label class="field"><span>Art</span><select id="edArt">' + F.ARTEN.filter(function (a) { return !a.nurFach || a.nurFach === e.fach; }).map(function (a) {
      return '<option value="' + a.id + '" ' + (a.id === art ? 'selected' : '') + '>' + a.emoji + ' ' + a.name + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>Datum</span><input type="date" id="edDatum" value="' + F.esc(e.datum) + '"></label>' +
    '<button class="btn gut small" data-action="editExam">Speichern</button>' +
    '<button class="btn danger small" data-action="delExamKid">🗑️ Arbeit löschen</button></details>';
  return html;
};

F.actions.addThema = function () {
  var e = F.getExam(F.current.params.id);
  var inp = F.$('#newThema');
  var t = inp.value.trim();
  if (!t) { F.toast('Schreib zuerst ein Thema ins Feld 🙂'); inp.focus(); return; }
  e.themen = (e.themen || []).concat(F.splitThemen(t)).slice(0, 20);
  F.save();
  F.render();
  F.toast('Thema hinzugefügt ✓');
  var n = F.$('#newThema'); if (n) n.focus();
};
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'newThema') { ev.preventDefault(); F.actions.addThema(); }
});
F.actions.delThema = function (el) {
  var e = F.getExam(F.current.params.id);
  e.themen.splice(+el.getAttribute('data-i'), 1);
  F.save();
  F.render();
};
F.actions.editExam = function () {
  var e = F.getExam(F.current.params.id);
  e.titel = F.$('#edTitel').value.trim() || e.titel;
  if (F.$('#edArt')) e.art = F.$('#edArt').value;
  if (F.$('#edDatum').value) e.datum = F.$('#edDatum').value;
  F.save();
  F.render();
  F.toast('Gespeichert ✓');
};
F.actions.delExamKid = function () {
  if (!confirm('Diesen Termin löschen? (Übungen bleiben unter „Deine Themen“.)')) return;
  var id = F.current.params.id;
  F.state.exams = F.state.exams.filter(function (e) { return e.id !== id; });
  F.save();
  F.back();
};

/* Themen von einer fotografierten Checkliste übernehmen */
F.actions.themenAusFoto = function () {
  var e = F.getExam(F.current.params.id);
  var imgs = F.pendingImages.examCk || [];
  if (!imgs.length) return;
  document.getElementById('app').innerHTML = F.loadingHtml('Themen', F.fox() + ' liest die Checkliste …');
  F.ai.generateJSON(F.prompts.themenAusFoto(F.subject(e.fach).name), imgs).then(function (j) {
    F.pendingImages.examCk = [];
    var neu = (j.themen || []).map(function (t) { return String(t).trim(); }).filter(Boolean);
    if (!neu.length) throw new Error('Auf dem Foto habe ich keine Themen gefunden. Vielleicht nochmal heller fotografieren?');
    neu.forEach(function (t) { if (!e.themen.some(function (x) { return F.sameThema(x, t); })) e.themen.push(t); });
    e.themen = e.themen.slice(0, 20);
    F.save();
    F.render();
    F.toast(neu.length + ' Themen übernommen ✓', 3500);
  }).catch(function (err) { F.showAiError(err); });
};

/* Übung zu den Themen der Arbeit erstellen */
F.actions.examMakePack = function () {
  var e = F.getExam(F.current.params.id);
  if (!e.themen.length) return;
  document.getElementById('app').innerHTML = F.loadingHtml('Übung erstellen', F.fox() + ' denkt sich Aufgaben zu deinen Themen aus …');
  F.ai.generateJSON(F.prompts.checkliste(F.subject(e.fach).name, e.themen.join('\n'), false, e.themen), []).then(function (j) {
    j.checkliste = e.themen.slice();
    var pack = F.buildPack(j, e.fach, { titel: 'Übung: ' + e.titel, quelle: 'checkliste', fuer: F.prompts.kind(), examId: e.id });
    if (!pack) throw new Error('Zu diesen Themen konnte ich keine Aufgaben machen. Schreib die Themen vielleicht etwas genauer?');
    F.save();
    F.go('packDetail', { id: pack.id }, { replace: false });
  }).catch(function (err) { F.showAiError(err); });
};
