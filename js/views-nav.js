/* Aufbau wie in LernBeat: untere Navigationsleiste (Start · Termine · Diktat · Erfolge · Mehr),
   Startseite mit nächsten Arbeiten und "Deine Themen", Termine als Zentrale, Einstellungen unter "Mehr". */

F.TABS = [['home', '🏠', 'Start'], ['termine', '📅', 'Termine'], ['diktatHome', '📝', 'Diktat'], ['trophies', '🏆', 'Erfolge'], ['mehr', '⚙️', 'Mehr']];
/* Übungs-Bildschirme ohne Leiste – damit nichts ablenkt */
F.FOCUS_VIEWS = ['diktatPlay', 'trainPlay', 'packPlay', 'mathePlay', 'roundDone', 'welcome', 'matheAgain', 'matheLocal'];
F.isFocusView = function (name) { return F.FOCUS_VIEWS.indexOf(name) >= 0; };
F.tabOf = function (name) {
  if (/^(termine|exam|arbeit)/.test(name)) return 'termine';
  if (/^(diktat|train)/.test(name)) return 'diktatHome';
  if (name === 'trophies') return 'trophies';
  if (/^(mehr|parent|sound|checkEdit)/.test(name)) return 'mehr';
  return 'home';
};
F.navFor = function (name) {
  if (F.isFocusView(name) || !F.state.profile.foxName) return '';
  var active = F.tabOf(name);
  return '<nav class="nav">' + F.TABS.map(function (t) {
    return '<button class="' + (active === t[0] ? 'on' : '') + '" data-action="tab" data-view="' + t[0] + '"><span>' + t[1] + '</span>' + t[2] + '</button>';
  }).join('') + '</nav>';
};
F.actions.tab = function (el) {
  var v = el.getAttribute('data-view');
  F.history = v === 'home' ? [] : [{ name: 'home', params: {} }];
  F.current = null;
  F.go(v, {});
};

/* ---------------- Lern-Serie (🔥 Tage hintereinander) ---------------- */
F.dayStr = function (offset) {
  var d = new Date(); d.setDate(d.getDate() + (offset || 0));
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
};
F.touchStreak = function () {
  var st = F.state.streak = F.state.streak || { last: '', n: 0, best: 0 };
  var today = F.dayStr(0);
  if (st.last === today) return;
  st.n = st.last === F.dayStr(-1) ? st.n + 1 : 1;
  st.last = today;
  st.best = Math.max(st.best || 0, st.n);
  F.save();
};
F.streakNow = function () {
  var st = F.state.streak;
  if (!st || !st.last) return 0;
  return st.last === F.dayStr(0) || st.last === F.dayStr(-1) ? st.n : 0;
};

/* ---------------- Start ---------------- */
F.views.home = function () {
  if (!F.state.profile.foxName) return F.views.welcome({ step: 1 });
  var s = F.state, kid = s.profile.kidName;
  // Fach, das dem nächsten Gürtel am nächsten ist
  var progs = F.SUBJECTS.map(function (sb) { var bp = F.beltProgress(sb.id); bp.sb = sb; return bp; });
  var close = progs.slice().sort(function (a, b) { return a.fehlt - b.fehlt; })[0];
  var sn = F.streakNow();
  var up = F.nextExams();
  var html = '<div class="hero"><div class="fox">🦊</div><div style="flex:1">' +
    '<span class="hi">Hallo' + (kid ? ' ' + F.esc(kid) : '') + '!</span>' +
    '<div class="pills"><span class="pill">⚽ ' + s.tore + ' Tore</span>' +
    '<span class="pill">🔥 ' + sn + (sn === 1 ? ' Tag' : ' Tage') + '</span></div>' +
    '<button class="mini-belts" data-action="tab" data-view="trophies" aria-label="Meine Gürtel">' + progs.map(function (bp) {
      return '<span class="mini-belt" style="background:' + bp.belt.color + ';color:' + bp.belt.text + '" title="' + F.esc(bp.sb.name + ': ' + bp.belt.name) + '">' + bp.sb.emoji + '</span>';
    }).join('') + '</button>' +
    (close ? '<div class="xp"><i style="width:' + close.pct + '%"></i></div>' +
      '<span class="hi-sub">' + close.sb.emoji + ' Noch ' + close.fehlt + ' Tore bis zum ' + F.esc(F.beltDativ(close.next.name)) + ' in ' + F.esc(close.sb.name) + '</span>' : '') +
    '</div></div>';

  // Arbeit schon zurück?
  var pe = s.exams.filter(function (e) {
    var d = F.daysUntil(e.datum);
    return d < 0 && d >= -45 && !(s.arbeiten || []).some(function (x) { return x.examId === e.id; });
  }).sort(function (a, b) { return a.datum < b.datum ? 1 : -1; })[0];
  if (pe) html += '<button class="card tip" data-action="go" data-view="arbeitNew" data-params="' + F.esc(JSON.stringify({ fach: pe.fach, examId: pe.id })) + '">' +
    '<b>📬 ' + F.esc(pe.titel) + ' schon zurück?</b><p>Zeig ' + F.esc(F.fox()) + ' deine Arbeit und hol dir Tore und Auszeichnungen – egal welche Note! 💪</p></button>';

  // Tipp zur nächsten Arbeit
  if (up.length) {
    var e = up[0], d = F.daysUntil(e.datum), packs = F.examPacks(e);
    var tip = !(e.themen || []).length && !packs.length ? 'Trag ein, welche Themen drankommen – dann mache ich dir passende Übungen.' :
      !packs.length ? 'Lass dir Übungen zu deinen Themen erstellen und mach eine Trainingsrunde.' :
      d <= 1 ? 'Mach heute noch einen Kurztest und schau dir die Erklärungen an. Du schaffst das! 💪' :
      'Tipp für heute: eine kurze Trainingsrunde – jeden Tag ein bisschen!';
    html += '<button class="card tip" data-action="go" data-view="examDetail" data-params="' + F.esc(JSON.stringify({ id: e.id })) + '">' +
      '<b>' + F.subject(e.fach).emoji + ' ' + (d === 0 ? 'Heute' : d === 1 ? 'Morgen' : 'In ' + d + ' Tagen') + ': ' + F.esc(e.titel) + '</b><p>' + tip + '</p></button>';
  }

  html += '<div class="g2">' +
    F.goBtn('packNew', { mode: 'fotos' }, '📸 Neues Thema fotografieren', 'btn big fuchs') +
    F.goBtn('diktatHome', {}, '📝 Diktat üben' + (s.trainWords.length ? ' (' + s.trainWords.length + ' Übungswörter)' : ''), 'btn big') + '</div>';

  html += '<h2>📅 Nächste Termine</h2>' + F.examListHtml(up.slice(0, 4), 'Keine Arbeit, kein Test und kein Diktat eingetragen.') +
    F.goBtn('termine', {}, 'Alle Termine / neuen Termin eintragen', 'btn light small');

  // Deine Themen, nach Fach sortiert
  var order = F.SUBJECTS.map(function (sb) { return sb.id; });
  s.packs.forEach(function (x) { if (order.indexOf(x.fach) < 0) order.push(x.fach); });
  var groups = order.map(function (id) { return [F.subject(id), s.packs.filter(function (x) { return x.fach === id; }).sort(function (a, b) { return b.created - a.created; })]; })
    .filter(function (g) { return g[1].length; });
  html += '<h2 class="mt">📚 Deine Themen</h2>' +
    (groups.length ? groups.map(function (g) {
      return g[1].map(function (x) {
        var ex = x.examId ? F.getExam(x.examId) : null;
        return '<button class="list-item" data-action="go" data-view="packDetail" data-params="' + F.esc(JSON.stringify({ id: x.id })) + '">' +
          '<span class="li-emoji">' + g[0].emoji + '</span><span class="li-main"><span class="li-title">' + F.esc(x.titel) + '</span>' +
          '<span class="li-sub">' + g[0].name + ' · ' + F.nAufgaben(x.aufgaben.length) + (x.best != null ? ' · Bestes: ' + x.best + ' %' : '') +
          (ex ? ' · für ' + F.esc(ex.titel) : '') + '</span></span><span class="li-arrow">›</span></button>';
      }).join('');
    }).join('') : '<div class="card soft"><p>Noch keine Themen. Tippe auf „Neues Thema fotografieren“ und mach Fotos von Arbeitsblättern – oder gib eine Checkliste ein. ✨</p></div>') +
    '<div class="btn-row mt">' +
    F.goBtn('packNew', { mode: 'checkliste' }, '📝 Thema aus Checkliste', 'btn light') +
    F.goBtn('matheHome', {}, '🔢 Mathe-Trainer', 'btn light') +
    F.goBtn('notesHome', {}, '💡 Nachlesen', 'btn light') + '</div>';
  return html;
};

/* ---------------- Termine ---------------- */
F.views.termine = function () {
  var s = F.state;
  var kommend = F.nextExams();
  var vorbei = s.exams.filter(function (e) { return F.daysUntil(e.datum) < 0 && !(s.arbeiten || []).some(function (x) { return x.examId === e.id; }); })
    .sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
  var zurueck = (s.arbeiten || []).slice().sort(function (a, b) { return b.date - a.date; });
  return F.topbar('📅 Termine', { noBack: true }) +
    '<p class="muted small">Klassenarbeiten, Tests und Diktate – alles an einem Ort.</p>' +
    F.examListHtml(kommend, 'Nichts eingetragen. Weißt du schon, wann die nächste Arbeit, der nächste Test oder das nächste Diktat ist?') +
    F.goBtn('examNew', {}, '➕ Neuen Termin eintragen', 'btn big block fuchs') +
    (vorbei.length ? '<h2 class="mt">⏳ Schon geschrieben – zurückbekommen?</h2>' + F.examListHtml(vorbei.slice(0, 8)) : '') +
    '<h2 class="mt">🏅 Zurückbekommen</h2>' +
    (zurueck.length ? zurueck.map(function (x) {
      var sb = F.subject(x.fach);
      return '<button class="list-item" data-action="go" data-view="arbeitResult" data-params="' + F.esc(JSON.stringify({ id: x.id })) + '">' +
        '<span class="li-emoji">' + sb.emoji + '</span><span class="li-main"><span class="li-title">' + F.esc(x.titel || sb.name) + '</span>' +
        '<span class="li-sub">' + F.art(F.artOf(x)).name + ' · ' + F.formatDate(new Date(x.date).toISOString()) + (x.note ? ' · Note ' + F.esc(x.note) : '') + ' · ' +
        (x.awards || []).map(function (g) { return F.award(g.id).e; }).join('') + '</span></span><span class="li-arrow">›</span></button>';
    }).join('') : '<p class="muted">Noch nichts. Wenn du eine Arbeit, einen Test oder ein Diktat zurückbekommst: Foto machen und Tore holen! ⚽</p>') +
    F.goBtn('arbeitNew', {}, '📷 Arbeit, Test oder Diktat hochladen', 'btn light block');
};
F.views.arbeitHome = F.views.termine;
F.views.parentExams = F.views.termine;

/* ---------------- Mehr (Einstellungen) ---------------- */
F.views.mehr = function () {
  var s = F.state.settings, p = F.state.profile;
  var item = function (view, e, t, sub) {
    return '<button class="list-item" data-action="go" data-view="' + view + '"><span class="li-emoji">' + e + '</span><span class="li-main"><span class="li-title">' + t + '</span>' +
      '<span class="li-sub">' + sub + '</span></span><span class="li-arrow">›</span></button>';
  };
  return F.topbar('⚙️ Mehr', { noBack: true }) +
    '<div class="card"><h2>🦊 Du und dein Fuchs</h2>' +
    '<label class="field"><span>Name des Fuchses</span><input type="text" id="foxRename" value="' + F.esc(p.foxName) + '"></label>' +
    '<label class="field"><span>Dein Name</span><input type="text" id="kidRename" value="' + F.esc(p.kidName) + '"></label>' +
    '<h3>🏫 Schule</h3><p class="small muted">Damit die Aufgaben zu Alter, Klasse und Lehrplan passen.</p>' + F.schoolFormHtml() +
    '<button class="btn gut" data-action="saveProfile">Speichern</button></div>' +
    F.faecherCardHtml() +
    item('parentAI', '🤖', 'KI-Schlüssel (kostenlos, für Eltern)', F.ai.hasKey() ? '✅ eingerichtet' + (s.model ? ' · ' + F.esc(s.model) : '') : '⚠️ noch nicht eingerichtet – nötig für Fotos') +
    item('parentVoice', '🔊', 'Stimme & Vorlesen', 'Stimme, Tempo, Ton-Test') +
    item('parentChecks', '📋', 'Diktat-Ergebnisse & Fehlermuster', 'KI-Auswertung prüfen und korrigieren') +
    item('parentData', '💾', 'Datensicherung', 'Sichern, Wiederherstellen, Zurücksetzen') +
    '<div class="card soft mt small"><b>Lernstand:</b> ' + F.state.tore + ' Tore · ' +
    F.SUBJECTS.map(function (sb) { return sb.emoji + ' ' + F.esc(F.beltFor(F.toreIn(sb.id)).name); }).join(' · ') + ' · ' +
    (F.state.stats.runden || 0) + ' Runden · ' + F.state.packs.length + ' Themen · ' + F.state.diktate.length + ' Diktate · ' +
    (F.state.arbeiten || []).length + ' zurückbekommene Arbeiten · ' + F.state.trainWords.length + ' offene Übungswörter</div>' +
    '<p class="center muted small">App-Version ' + F.VERSION + '</p>' +
    '<div class="center"><button class="btn ghost small" data-action="forceUpdate">🔄 App aktualisieren</button></div>';
};
F.actions.saveProfile = function () {
  var n = F.$('#foxRename').value.trim();
  if (!n) { F.toast('Der Fuchs braucht einen Namen 🦊'); return; }
  F.state.profile.foxName = n;
  F.state.profile.kidName = F.$('#kidRename').value.trim();
  F.readSchoolForm();
  F.save();
  F.toast('Gespeichert ✓');
};
/* früherer Eltern-Bereich mit PIN → jetzt direkt "Mehr" */
F.views.parentGate = function () { setTimeout(function () { F.go('mehr', {}, { replace: true }); }, 0); return ''; };
F.views.parentHome = F.views.mehr;

/* ---------------- Klassenarbeit: Üben über alle Themen ---------------- */
F.actions.examPractice = function (el) {
  var e = F.getExam(el.getAttribute('data-id'));
  var mode = el.getAttribute('data-mode');
  var packs = F.examPacks(e);
  var all = [], themen = [];
  packs.forEach(function (x) {
    x.aufgaben.forEach(function (a) { all.push({ a: a, src: x.id }); });
    (x.themen || []).forEach(function (t) { themen.push(t); });
  });
  if (!all.length) return;
  var list = mode === 'probe' ? F.shuffle(all).slice(0, 15) : F.shuffle(all).slice(0, 5);
  F.tempPack = { id: 'local', fach: e.fach, titel: e.titel, aufgaben: all.map(function (i) { return i.a; }), themen: themen, best: null };
  F.lp = { packId: 'local', mode: mode, list: list.map(function (i) { return { a: i.a, src: i.src, opts: i.a.typ === 'auswahl' ? F.shuffle(i.a.optionen) : null }; }),
    idx: 0, richtig: 0, state: 'frage', hintShown: false, tries: 0, results: [], f: {}, af: null, marks: {}, satz: '' };
  F.go('packPlay', {});
};

/* ---------------- Meine Fächer ---------------- */
F.EMOJI_WAHL = ['📚', '🎵', '🎨', '🌍', '🧪', '🗣️', '🧮', '🐾', '🌳', '💻', '🏃‍♀️', '✏️'];
F.faecherCardHtml = function () {
  var on = F.SUBJECTS.map(function (s) { return s.id; });
  return '<div class="card"><h2>📚 Meine Fächer</h2><p class="small muted">Tippe an, welche Fächer du hast. Für jedes Fach gibt es einen eigenen Gürtel.</p>' +
    '<div class="chips">' + F.allFaecher().map(function (s) {
      return '<button class="chip ' + (on.indexOf(s.id) >= 0 ? 'on' : '') + '" data-action="toggleFach" data-id="' + F.esc(s.id) + '">' + s.emoji + ' ' + F.esc(s.name) + '</button>';
    }).join('') + '</div>' +
    '<h3>Eigenes Fach hinzufügen</h3><div class="btn-row" style="align-items:center">' +
    '<select id="ownEmoji" style="flex:0 0 90px;margin:0 8px 10px 0">' + F.EMOJI_WAHL.map(function (e) { return '<option>' + e + '</option>'; }).join('') + '</select>' +
    '<input type="text" id="ownFach" maxlength="30" placeholder="z. B. Werken" style="flex:1 1 180px;margin:0 8px 10px 0">' +
    '<button class="btn gut" style="flex:0 0 auto" data-action="addFach">+ Hinzufügen</button></div></div>';
};
F.actions.toggleFach = function (el) {
  var id = el.getAttribute('data-id');
  var p = F.state.profile;
  var list = (p.faecher && p.faecher.length ? p.faecher : F.DEFAULT_FAECHER).slice();
  var i = list.indexOf(id);
  if (i >= 0) { if (list.length === 1) { F.toast('Mindestens ein Fach brauchst du 🙂'); return; } list.splice(i, 1); }
  else list.push(id);
  p.faecher = list;
  F.save();
  F.render();
};
F.actions.addFach = function () {
  var name = F.$('#ownFach').value.trim();
  if (!name) { F.toast('Schreib den Namen des Fachs ins Feld 🙂'); return; }
  var p = F.state.profile;
  p.eigeneFaecher = p.eigeneFaecher || [];
  var id = 'x_' + F.uid();
  p.eigeneFaecher.push({ id: id, name: name.slice(0, 30), emoji: F.$('#ownEmoji').value });
  p.faecher = (p.faecher && p.faecher.length ? p.faecher : F.DEFAULT_FAECHER).concat([id]);
  F.save();
  F.render();
  F.toast(name + ' hinzugefügt ✓');
};
