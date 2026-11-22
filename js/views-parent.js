/* Eltern-Bereich (mit PIN): KI-Schlüssel, Termine, Diktat-Ergebnisse, Stimme, Datensicherung */

F.views.parentGate = function () {
  var hasPin = !!F.state.settings.pin;
  F.pinInput = F.pinInput || '';
  var title = hasPin ? 'Eltern-PIN eingeben' : (F.pinFirst ? 'PIN noch einmal eingeben' : 'Eltern-PIN festlegen (4 Ziffern)');
  var dots = '';
  for (var i = 0; i < 4; i++) dots += '<span class="' + (i < F.pinInput.length ? 'on' : '') + '"></span>';
  return F.topbar('Eltern-Bereich', { home: true }) +
    '<div class="card center"><div style="font-size:3rem">🔒</div><h2>' + title + '</h2>' +
    (!hasPin ? '<p class="muted small">Die PIN schützt Einstellungen und den KI-Schlüssel.</p>' : '') +
    '<div class="pin-dots">' + dots + '</div>' +
    '<div class="keypad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<button data-action="pinKey" data-k="' + k + '">' + k + '</button>'; }).join('') +
    '<button data-action="pinKey" data-k="del">⌫</button><button data-action="pinKey" data-k="0">0</button><span></span></div>' +
    (hasPin ? '<button class="btn ghost small" data-action="pinForgot">PIN vergessen?</button>' : '') +
    '</div>';
};
F.actions.pinKey = function (el) {
  var k = el.getAttribute('data-k');
  if (k === 'del') F.pinInput = F.pinInput.slice(0, -1);
  else if (F.pinInput.length < 4) F.pinInput += k;
  if (F.pinInput.length === 4) {
    var s = F.state.settings;
    var entered = F.pinInput;
    F.pinInput = '';
    if (s.pin) {
      if (entered === s.pin) { F.go('parentHome', {}, { replace: true }); return; }
      F.toast('Die PIN stimmt nicht.');
    } else if (!F.pinFirst) {
      F.pinFirst = entered;
    } else {
      if (entered === F.pinFirst) {
        s.pin = entered; F.pinFirst = null; F.save();
        F.toast('PIN gespeichert ✓');
        F.go('parentHome', {}, { replace: true });
        return;
      }
      F.pinFirst = null;
      F.toast('Die beiden PINs waren verschieden. Bitte nochmal.');
    }
  }
  F.render();
};
F.actions.pinForgot = function () {
  var a = prompt('Zum Zurücksetzen der PIN bitte das Wort ZURÜCKSETZEN eintippen. (Alle Daten bleiben erhalten.)');
  if (a && a.trim().toUpperCase() === 'ZURÜCKSETZEN') {
    F.state.settings.pin = ''; F.save(); F.pinInput = ''; F.render();
    F.toast('PIN gelöscht – bitte neue festlegen.');
  }
};

F.views.parentHome = function () {
  var s = F.state.settings;
  var hasKey = F.ai.hasKey();
  return F.topbar('Eltern-Bereich', { home: true }) +
    '<button class="list-item" data-action="go" data-view="parentAI"><span class="li-emoji">🤖</span><span class="li-main"><span class="li-title">KI einrichten (kostenlos)</span>' +
    '<span class="li-sub">' + (hasKey ? '✅ eingerichtet' + (s.model ? ' · ' + F.esc(s.model) : '') : '⚠️ noch nicht eingerichtet – nötig für Fotos') + '</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="go" data-view="parentExams"><span class="li-emoji">📅</span><span class="li-main"><span class="li-title">Klassenarbeiten & Diktat-Termine</span>' +
    '<span class="li-sub">' + F.nextExams().length + ' anstehend</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="go" data-view="parentChecks"><span class="li-emoji">📋</span><span class="li-main"><span class="li-title">Diktat-Ergebnisse & Fehlermuster</span>' +
    '<span class="li-sub">KI-Auswertung prüfen und korrigieren</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="go" data-view="parentVoice"><span class="li-emoji">🔊</span><span class="li-main"><span class="li-title">Stimme & Vorlesen</span>' +
    '<span class="li-sub">Stimme, Tempo, Anzeige</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="go" data-view="parentData"><span class="li-emoji">💾</span><span class="li-main"><span class="li-title">Datensicherung & Sonstiges</span>' +
    '<span class="li-sub">Sichern, Wiederherstellen, Fuchs umbenennen, PIN</span></span><span class="li-arrow">›</span></button>' +
    '<div class="card soft mt small"><b>Lernstand:</b> ' + F.state.tore + ' Tore · ' + F.esc(F.beltFor(F.state.tore).name) + ' · ' +
    (F.state.stats.runden || 0) + ' Runden · ' + F.state.diktate.length + ' Diktate · ' + F.state.checks.length + ' Diktat-Prüfungen · ' +
    F.state.trainWords.length + ' offene Übungswörter</div>' +
    '<p class="center muted small">App-Version ' + F.VERSION + '</p>' +
    '<div class="center"><button class="btn ghost small" data-action="forceUpdate">🔄 App aktualisieren</button></div>';
};

/* ---------------- KI ---------------- */
F.views.parentAI = function () {
  var s = F.state.settings;
  return F.topbar('KI einrichten', { home: true }) +
    '<div class="card"><h2>So geht’s (einmalig, ca. 3 Minuten)</h2><ol class="steps">' +
    '<li>Öffne <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> und melde dich mit deinem Google-Konto an.</li>' +
    '<li>Bestätige die Nutzungsbedingungen und tippe auf <b>„API-Schlüssel erstellen“</b> („Create API key“).</li>' +
    '<li>Kopiere den Schlüssel (beginnt meist mit <code>AIza…</code>) und füge ihn unten ein.</li>' +
    '<li>Tippe auf <b>„Speichern & testen“</b>.</li></ol>' +
    '<p class="small muted">Kostenlos: Ohne hinterlegte Zahlungsdaten fallen keine Kosten an – bei zu vielen Anfragen pausiert die KI einfach bis später. ' +
    'Datenschutz: Im kostenlosen Tarif darf Google die Fotos zur Verbesserung seiner Dienste nutzen. Deshalb: keine Namen, Gesichter oder Adressen mit fotografieren. ' +
    'Der Schlüssel wird nur auf diesem Tablet gespeichert.</p></div>' +
    '<div class="card"><label class="field"><span>KI-Schlüssel</span>' +
    '<input type="password" id="apiKey" value="' + F.esc(s.apiKey) + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…"></label>' +
    '<div class="btn-row"><button class="btn gut" data-action="saveKey">Speichern & testen</button>' +
    '<button class="btn light" data-action="toggleKey">👁️ Anzeigen</button></div>' +
    '<p class="muted small">App-Version ' + F.VERSION + ' · <button class="btn ghost small" style="margin:0" data-action="forceUpdate">🔄 App aktualisieren</button></p>' +
    '<p id="aiStatus" class="small">' + (s.model ? 'Verwendetes Modell: <b>' + F.esc(s.model) + '</b>' : '') + '</p>' +
    '<details><summary class="small" style="cursor:pointer">Erweitert: Modell selbst wählen</summary>' +
    '<label class="field mt"><span class="small">Modellname (leer = automatisch)</span><input type="text" id="aiModel" value="' + F.esc(s.model) + '" autocapitalize="off" spellcheck="false"></label>' +
    '<button class="btn small light" data-action="saveModel">Modell übernehmen</button></details></div>';
};
F.actions.toggleKey = function () { var i = F.$('#apiKey'); i.type = i.type === 'password' ? 'text' : 'password'; };
F.actions.saveKey = function () {
  var s = F.state.settings;
  s.apiKey = F.$('#apiKey').value.replace(/\s+/g, '');
  s.model = '';
  F.save();
  var st = F.$('#aiStatus');
  if (!s.apiKey) { st.textContent = 'Schlüssel gelöscht.'; return; }
  var lines = [];
  var log = function (t) { lines.push(F.esc(t)); st.innerHTML = lines.join('<br>'); };
  log('⏳ Teste die Verbindung …');
  F.ai.test(log).then(function (r) {
    log('');
    log('🎉 Fertig eingerichtet! Modell: ' + r.model + ' · Die KI sagt: „' + r.gruss + '“');
  }).catch(function (e) {
    log('');
    log('❌ ' + e.message);
    log('Wenn das so bleibt: Mach bitte ein Bildschirmfoto von diesem Text und schick es mir.');
  });
};
F.actions.saveModel = function () {
  F.state.settings.model = F.$('#aiModel').value.trim();
  F.save();
  F.toast('Gespeichert');
  F.render();
};

/* ---------------- Termine ---------------- */
F.views.parentExams = function () {
  var list = F.state.exams.slice().sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
  var items = list.map(function (e) {
    var d = F.daysUntil(e.datum);
    return '<div class="list-item" style="cursor:default"><span class="li-emoji">' + F.subject(e.fach).emoji + '</span>' +
      '<span class="li-main"><span class="li-title">' + F.esc(e.titel) + '</span><span class="li-sub">' + F.formatDate(e.datum) +
      (d < 0 ? ' · vorbei' : d === 0 ? ' · heute' : ' · in ' + d + ' Tagen') + '</span></span>' +
      '<button class="btn danger small" style="margin:0" data-action="delExam" data-id="' + e.id + '">🗑️</button></div>';
  }).join('');
  return F.topbar('Termine', { home: true }) +
    (items || '<p class="muted">Noch keine Termine eingetragen.</p>') +
    '<div class="card mt"><h2>Neuer Termin</h2>' + F.subjectChips('examFach', 'deutsch', false) +
    '<label class="field"><span>Was?</span><input type="text" id="examTitel" placeholder="z. B. Diktat oder Mathe-Arbeit"></label>' +
    '<label class="field"><span>Wann?</span><input type="date" id="examDatum" value="' + F.today() + '"></label>' +
    '<button class="btn gut block" data-action="addExam">+ Termin speichern</button></div>';
};
F.actions.addExam = function () {
  var fachEl = F.$('#examFach .chip.on');
  var fach = fachEl ? fachEl.getAttribute('data-val') : 'deutsch';
  var datum = F.$('#examDatum').value;
  if (!datum) { F.toast('Bitte ein Datum wählen.'); return; }
  F.state.exams.push({ id: F.uid(), fach: fach, titel: F.$('#examTitel').value.trim() || F.subject(fach).name + '-Arbeit', datum: datum });
  F.save();
  F.render();
  F.toast('Termin gespeichert 📅');
};
F.actions.delExam = function (el) {
  var id = el.getAttribute('data-id');
  F.state.exams = F.state.exams.filter(function (e) { return e.id !== id; });
  F.save(); F.render();
};

/* ---------------- Diktat-Ergebnisse ---------------- */
F.views.parentChecks = function () {
  var counts = {};
  var totalErr = 0;
  F.state.checks.forEach(function (c) {
    F.activeErrors(c).forEach(function (f) { if (f.unsicher) return; counts[f.kategorie] = (counts[f.kategorie] || 0) + 1; totalErr++; });
  });
  var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  var max = cats.length ? counts[cats[0]] : 1;
  var stats = cats.map(function (k) {
    return '<div class="stat-row"><span class="s-label">' + F.spell.catEmoji(k) + ' ' + F.esc(k) + '</span>' +
      '<span class="s-bar"><div style="width:' + Math.round(counts[k] / max * 100) + '%"></div></span><span class="s-num">' + counts[k] + '</span></div>';
  }).join('');
  var tips = cats.slice(0, 3).map(function (k) { return F.CATEGORY_HELP[k] ? '<li><b>' + F.esc(k) + ':</b> ' + F.esc(F.CATEGORY_HELP[k]) + '</li>' : ''; }).join('');
  var list = F.state.checks.slice().sort(function (a, b) { return b.date - a.date; }).map(function (c) {
    var d = F.getDiktat(c.diktatId);
    var n = F.activeErrors(c).length;
    return '<button class="list-item" data-action="go" data-view="checkEdit" data-params="' + F.esc(JSON.stringify({ id: c.id })) + '">' +
      '<span class="li-emoji">📋</span><span class="li-main"><span class="li-title">' + F.esc(d ? d.titel : 'Diktat') + '</span>' +
      '<span class="li-sub">' + F.formatDate(new Date(c.date).toISOString()) + ' · ' + n + ' Fehler von ' + c.woerterGesamt + ' Wörtern</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  return F.topbar('Diktat-Ergebnisse', { home: true }) +
    (stats ? '<div class="card"><h2>Fehlermuster (alle Diktate)</h2>' + stats +
      (tips ? '<h3 class="mt">Übungs-Tipps</h3><ul>' + tips + '</ul>' : '') + '</div>' : '') +
    (list || '<p class="muted">Noch keine geprüften Diktate.</p>');
};

F.views.checkEdit = function (p) {
  var c = F.getCheck(p.id);
  if (!c) return F.topbar('Ergebnis', { home: true }) + '<p>Nicht gefunden.</p>';
  var d = F.getDiktat(c.diktatId);
  return F.topbar('Ergebnis prüfen', { home: true }) +
    '<div class="card soft"><p><b>Original:</b></p><p class="diktat-text">' + F.esc(d ? (d.text || d.woerter.join(', ')) : '') + '</p>' +
    '<p><b>Von der KI gelesen:</b></p><p class="diktat-text">' + F.esc(c.erkannt) + '</p>' +
    (c.muster ? '<p><b>Einschätzung:</b> ' + F.esc(c.muster) + '</p>' : '') + '</div>' +
    '<p class="muted">Hat die KI einen Fehler „erfunden“? Dann auf „War doch richtig“ tippen – das Wort verschwindet auch aus den Übungswörtern. ' +
    'Fehlt ein Fehler? Unten von Hand ergänzen.</p>' +
    c.fehler.map(function (f, i) { return F.errorCardHtml(f, i, true); }).join('') +
    '<div class="card"><h3>Fehler ergänzen</h3>' +
    '<label class="field"><span>Richtig wäre</span><input type="text" id="addSoll" autocapitalize="off"></label>' +
    '<label class="field"><span>Geschrieben wurde</span><input type="text" id="addIst" autocapitalize="off"></label>' +
    '<button class="btn gut" data-action="addErr">+ Fehler hinzufügen</button></div>' +
    '<button class="btn danger small" data-action="delCheck">🗑️ Diese Prüfung löschen</button>';
};
F.actions.toggleErr = function (el) {
  var c = F.getCheck(F.current.params.id);
  var f = c.fehler[+el.getAttribute('data-idx')];
  f.ignored = !f.ignored;
  F.syncTrainWords(c);
  F.save();
  F.render();
};
F.actions.addErr = function () {
  var c = F.getCheck(F.current.params.id);
  var soll = F.$('#addSoll').value.trim(), ist = F.$('#addIst').value.trim();
  if (!soll) { F.toast('Bitte das richtige Wort eintragen.'); return; }
  var kat = 'Sonstiges';
  if (ist && soll.toLowerCase() === ist.toLowerCase()) kat = 'Groß/klein';
  c.fehler.push({ soll: soll, ist: ist, kategorie: kat, tipp: '', unsicher: false, ignored: false });
  F.syncTrainWords(c);
  F.save();
  F.render();
};
F.actions.delCheck = function () {
  if (!confirm('Diese Prüfung löschen?')) return;
  var id = F.current.params.id;
  F.state.checks = F.state.checks.filter(function (c) { return c.id !== id; });
  F.save();
  F.back();
};

/* ---------------- Stimme ---------------- */
F.views.parentVoice = function () {
  var s = F.state.settings;
  var voices = F.speech.germanVoices();
  var cur = F.speech.voice ? F.speech.voice.name : '';
  return F.topbar('Stimme & Vorlesen', { home: true }) +
    '<div class="card">' +
    (voices.length ? '<label class="field"><span>Stimme</span><select id="voiceSel">' + voices.map(function (v) {
      return '<option value="' + F.esc(v.name) + '" ' + (v.name === cur ? 'selected' : '') + '>' + F.esc(v.name + ' (' + v.lang + ')') + '</option>';
    }).join('') + '</select></label>' :
      '<p class="hinweis">Keine deutsche Stimme gefunden. Auf dem iPad: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch → z. B. „Anna (Erweitert)“ laden.</p>') +
    '<label class="field"><span>Tempo: <b id="rateVal">' + s.rate + '</b></span><input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="' + s.rate + '" style="width:100%"></label>' +
    '<button class="btn light" data-action="voiceTest">🔊 Probehören</button> <button class="btn gut" data-action="voiceSave">Speichern</button>' +
    '</div>' +
    '<div class="card"><div class="switch-row"><span>Beim Diktat das Stück anzeigen</span><input type="checkbox" id="optShow" ' + (s.showText ? 'checked' : '') + '></div>' +
    '<div class="switch-row"><span>Satzzeichen ansagen</span><input type="checkbox" id="optPunct" ' + (s.speakPunct ? 'checked' : '') + '></div></div>' +
    '<p class="muted small">Tipp fürs iPad: Unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch gibt es schönere „Erweitert“-Stimmen zum Laden (kostenlos).</p>';
};
F.actions.voiceTest = function () {
  F.actions.voiceSave(true);
  F.speech.speak('Der Fuchs läuft schnell über die Wiese. Im Herbst fallen die bunten Blätter.');
};
F.actions.voiceSave = function (silent) {
  var s = F.state.settings;
  var sel = F.$('#voiceSel');
  if (sel) { s.voiceName = sel.value; F.speech.voice = F.speech.pickVoice(); }
  s.rate = parseFloat(F.$('#rate').value);
  s.showText = F.$('#optShow').checked;
  s.speakPunct = F.$('#optPunct').checked;
  F.$('#rateVal').textContent = s.rate;
  F.save();
  if (silent !== true) F.toast('Gespeichert ✓');
};

/* ---------------- Daten ---------------- */
F.views.parentData = function () {
  return F.topbar('Datensicherung', { home: true }) +
    '<div class="card"><h2>💾 Sichern</h2><p>Alle Daten liegen nur auf diesem Tablet. Mach ab und zu eine Sicherung (z. B. in „Dateien“ oder per Mail an dich).</p>' +
    '<button class="btn gut" data-action="exportData">Sicherung herunterladen</button></div>' +
    '<div class="card"><h2>♻️ Wiederherstellen</h2><p>Eine Sicherungsdatei auswählen. Achtung: Ersetzt die aktuellen Daten.</p>' +
    '<label class="btn light file-btn">Datei auswählen<input type="file" accept=".json,application/json" id="importFile"></label></div>' +
    '<div class="card"><h2>🦊 Fuchs</h2><label class="field"><span>Name des Fuchses</span><input type="text" id="foxRename" value="' + F.esc(F.state.profile.foxName) + '"></label>' +
    '<label class="field"><span>Name des Kindes</span><input type="text" id="kidRename" value="' + F.esc(F.state.profile.kidName) + '"></label>' +
    '<button class="btn" data-action="renameFox">Speichern</button></div>' +
    '<div class="card"><h2>🔒 PIN</h2><button class="btn light" data-action="resetPin">PIN ändern</button></div>' +
    '<div class="card"><h2>⚠️ Alles löschen</h2><button class="btn danger" data-action="resetAll">App komplett zurücksetzen</button></div>';
};
F.actions.exportData = function () {
  var copy = JSON.parse(JSON.stringify(F.state));
  copy.settings.apiKey = ''; // Schlüssel nicht mit sichern
  var blob = new Blob([JSON.stringify(copy, null, 1)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fuchs-lernapp-sicherung-' + F.today() + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
document.addEventListener('change', function (ev) {
  if (!ev.target || ev.target.id !== 'importFile' || !ev.target.files.length) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var data = JSON.parse(r.result);
      if (!data || !data.profile || !data.settings) throw new Error('x');
      if (!confirm('Daten aus der Sicherung übernehmen? Die aktuellen Daten werden ersetzt.')) return;
      var key = F.state.settings.apiKey, pin = F.state.settings.pin;
      localStorage.setItem(F.STORE_KEY, JSON.stringify(data));
      F.state = F.load();
      if (!F.state.settings.apiKey) F.state.settings.apiKey = key;
      if (!F.state.settings.pin) F.state.settings.pin = pin;
      F.save();
      F.toast('Sicherung wiederhergestellt ✓');
      F.home();
    } catch (e) { F.toast('Das ist keine gültige Sicherungsdatei.'); }
  };
  r.readAsText(ev.target.files[0]);
});
F.actions.renameFox = function () {
  var n = F.$('#foxRename').value.trim();
  if (!n) { F.toast('Der Fuchs braucht einen Namen 🦊'); return; }
  F.state.profile.foxName = n;
  F.state.profile.kidName = F.$('#kidRename').value.trim();
  F.save();
  F.toast('Gespeichert ✓');
};
F.actions.resetPin = function () {
  F.state.settings.pin = ''; F.save(); F.pinInput = ''; F.pinFirst = null;
  F.go('parentGate', {}, { replace: true });
};
F.actions.resetAll = function () {
  var a = prompt('Wirklich ALLES löschen (Diktate, Tore, Einstellungen)? Dann LÖSCHEN eintippen.');
  if (a && a.trim().toUpperCase() === 'LÖSCHEN') {
    localStorage.removeItem(F.STORE_KEY);
    F.state = F.defaultState();
    F.home();
  }
};

/* Holt die neueste Version vom Server (Offline-Speicher leeren, neu laden). Daten bleiben erhalten. */
F.actions.forceUpdate = function () {
  F.toast('Lade neueste Version …');
  var jobs = [];
  if (window.caches && caches.keys) jobs.push(caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); }));
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) { return Promise.all(regs.map(function (r) { return r.unregister(); })); }));
  }
  Promise.all(jobs).catch(function () {}).then(function () {
    location.replace(location.pathname + '?u=' + Date.now());
  });
};
