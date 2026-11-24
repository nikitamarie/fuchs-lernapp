/* Unterseiten von "⚙️ Mehr": KI-Schlüssel, Diktat-Ergebnisse, Stimme, Datensicherung */

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
    F.aiUsageHtml() +
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
      (d < 0 ? ' · vorbei' : d === 0 ? ' · heute' : ' · in ' + d + ' Tagen') + ' · ' + (e.themen || []).length + ' Themen</span></span>' +
      F.goBtn('examDetail', { id: e.id }, 'Öffnen', 'btn light small') +
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
  F.state.exams.push({ id: F.uid(), fach: fach, titel: F.$('#examTitel').value.trim() || F.subject(fach).name + '-Arbeit', datum: datum, themen: [], created: Date.now() });
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
    '<button class="list-item" data-action="go" data-view="soundTest" style="border:3px solid #e9782f"><span class="li-emoji">🩺</span>' +
    '<span class="li-main"><span class="li-title">Ton-Test</span><span class="li-sub">Wenn gar nichts zu hören ist – findet die Ursache</span></span><span class="li-arrow">›</span></button>' +
    '<div class="card">' +
    (voices.length ? '<label class="field"><span>Stimme</span><select id="voiceSel">' + voices.map(function (v) {
      return '<option value="' + F.esc(v.name) + '" ' + (v.name === cur ? 'selected' : '') + '>' + F.esc(v.name + ' (' + v.lang + ')') + '</option>';
    }).join('') + '</select></label>' :
      '<p class="hinweis">Keine deutsche Stimme gefunden. Auf dem iPad: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch → z. B. „Anna (Erweitert)“ laden.</p>') +
    '<label class="field"><span>Tempo: <b id="rateVal">' + s.rate + '</b></span><input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="' + s.rate + '" style="width:100%"></label>' +
    '<button class="btn light" data-action="voiceTest">🔊 Probehören</button> <button class="btn gut" data-action="voiceSave">Speichern</button>' +
    '</div>' +
    '<div class="card"><h3>Welche Stimme?</h3><div class="chips" id="ttsMode">' +
    [['auto', '🦊 Automatisch'], ['geraet', '📱 Nur iPad-Stimme'], ['online', '🌐 Online-Stimme']].map(function (m) {
      return '<button class="chip ' + (F.speech.mode() === m[0] ? 'on' : '') + '" data-action="setTtsMode" data-val="' + m[0] + '">' + m[1] + '</button>';
    }).join('') + '</div>' +
    '<p class="small muted">Automatisch: erst die iPad-Stimme (offline); bleibt sie stumm, wird die Online-Stimme genommen (braucht WLAN).</p>' +
    '<p class="small"><b>Gerade aktiv:</b> ' + (F.speech.useOnline() ? '🌐 Online-Stimme' : '📱 iPad-Stimme') +
    ' · Stimmen auf dem Gerät: ' + F.speech.voices.length + ' (deutsch: ' + voices.length + ')' +
    (F.speech.status ? ' · ' + F.esc(F.speech.status) : '') + '</p>' +
    (F.state.settings.ttsDeviceFailed || F.state.settings.ttsNoVoiceSel ? '<button class="btn small light" data-action="retryDeviceVoice">iPad-Stimme nochmal versuchen</button>' : '') +
    '</div>' +
    '<div class="card"><div class="switch-row"><span>Beim Diktat das Stück anzeigen</span><input type="checkbox" id="optShow" ' + (s.showText ? 'checked' : '') + '></div>' +
    '<div class="switch-row"><span>Satzzeichen ansagen</span><input type="checkbox" id="optPunct" ' + (s.speakPunct ? 'checked' : '') + '></div></div>' +
    '<p class="muted small">Tipp fürs iPad: Unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch gibt es schönere „Erweitert“-Stimmen zum Laden (kostenlos).</p>';
};
F.actions.voiceTest = function () {
  F.actions.voiceSave(true);
  F.speech.speak('Der Fuchs läuft schnell über die Wiese. Im Herbst fallen die bunten Blätter.');
  setTimeout(function () { if (F.current.name === 'parentVoice') F.render(); }, 4000);
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
  return F.topbar('Datensicherung') +
    '<div class="card"><h2>💾 Sichern</h2><p>Alle Daten liegen nur auf diesem Tablet. Mach ab und zu eine Sicherung (z. B. in „Dateien“ oder per Mail an dich).</p>' +
    '<button class="btn gut" data-action="exportData">Sicherung herunterladen</button></div>' +
    '<div class="card"><h2>♻️ Wiederherstellen</h2><p>Eine Sicherungsdatei auswählen. Achtung: Ersetzt die aktuellen Daten.</p>' +
    F.fileButton('', 'Datei auswählen', 'btn light', '.json,application/json', 'importFile') + '</div>' +
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

F.actions.setTtsMode = function (el) {
  F.state.settings.ttsMode = el.getAttribute('data-val');
  F.save();
  F.render();
  F.speech.speak('So klinge ich jetzt.');
};
F.actions.retryDeviceVoice = function () {
  F.state.settings.ttsDeviceFailed = false;
  F.state.settings.ttsNoVoiceSel = false;
  F.save();
  F.speech.speak('Hallo, hier ist die iPad-Stimme.');
  setTimeout(function () { if (F.current.name === 'parentVoice') F.render(); }, 3500);
};

/* ---------------- Ton-Test (Diagnose) ---------------- */
F.beepUrl = function () {
  if (F._beep) return F._beep;
  var rate = 8000, n = rate * 0.6, buf = new Uint8Array(44 + n);
  var w = function (o, str) { for (var i = 0; i < str.length; i++) buf[o + i] = str.charCodeAt(i); };
  var dv = new DataView(buf.buffer);
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  w(36, 'data'); dv.setUint32(40, n, true);
  for (var i = 0; i < n; i++) buf[44 + i] = 128 + Math.round(90 * Math.sin(2 * Math.PI * 660 * i / rate) * Math.min(1, (n - i) / 800));
  var bin = ''; for (var j = 0; j < buf.length; j++) bin += String.fromCharCode(buf[j]);
  F._beep = 'data:audio/wav;base64,' + btoa(bin);
  return F._beep;
};
F.soundResults = F.soundResults || {};
F.views.soundTest = function () {
  var r = F.soundResults;
  var row = function (id, nr, title, desc) {
    var res = r[id];
    return '<div class="card"><h3>' + nr + '. ' + title + '</h3><p class="small muted">' + desc + '</p>' +
      '<button class="btn" data-action="sndTest" data-t="' + id + '">▶️ Test starten</button>' +
      (res ? '<p class="small" style="margin-top:8px"><b>Technik:</b> ' + F.esc(res) + '</p>' +
        '<div class="btn-row"><button class="btn small gut" data-action="sndHeard" data-t="' + id + '" data-v="ja">Ich habe es gehört ✓</button>' +
        '<button class="btn small light" data-action="sndHeard" data-t="' + id + '" data-v="nein">Nichts gehört ✗</button></div>' : '') +
      (r[id + '_heard'] ? '<p><b>' + (r[id + '_heard'] === 'ja' ? '✅ gehört' : '❌ nicht gehört') + '</b></p>' : '') +
      '</div>';
  };
  var v = F.speech.voices;
  var info = 'Version ' + F.VERSION + ' · ' + navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 120) +
    ' · Home-Bildschirm-App: ' + ((window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? 'ja' : 'nein') +
    ' · Sprachausgabe vorhanden: ' + (F.speech.supported ? 'ja' : 'nein') +
    ' · Stimmen: ' + v.length + ' (deutsch: ' + F.speech.germanVoices().length + ')' +
    ' · Modus: ' + F.speech.mode() + (F.state.settings.ttsDeviceFailed ? ' (iPad-Stimme als stumm erkannt)' : '');
  return F.topbar('Ton-Test', { home: true }) +
    '<p>Mach die Tests nacheinander und tippe danach an, ob du etwas gehört hast. Danach bitte ein <b>Bildschirmfoto</b> von dieser Seite machen.</p>' +
    row('beep', 1, 'Piepton', 'Prüft, ob das iPad in dieser App überhaupt Töne abspielt.') +
    row('device', 2, 'iPad-Stimme', 'Die eingebaute deutsche Stimme (geht ohne Internet).') +
    row('online', 3, 'Online-Stimme', 'Die Ersatz-Stimme aus dem Internet.') +
    '<div class="card soft small"><b>Geräte-Infos:</b> ' + F.esc(info) + '</div>';
};
F.actions.sndHeard = function (el) {
  F.soundResults[el.getAttribute('data-t') + '_heard'] = el.getAttribute('data-v');
  F.render();
};
F.actions.sndTest = function (el) {
  var t = el.getAttribute('data-t');
  var r = F.soundResults;
  var done = function (msg) { r[t] = msg; if (F.current.name === 'soundTest') F.render(); };
  F.speech.stop();
  if (t === 'beep' || t === 'online') {
    var a = F.speech.audio || new Audio();
    var src = t === 'beep' ? F.beepUrl() : 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=de&q=' + encodeURIComponent('Hallo, das ist die Online-Stimme.');
    var started = false;
    a.onplaying = function () { started = true; };
    a.onerror = function () { var c = a.error ? a.error.code : '?'; done('Fehler beim Abspielen (Code ' + c + (c === 2 ? ' = Netzwerk' : c === 4 ? ' = Quelle nicht erlaubt/erreichbar' : '') + ')'); };
    a.onended = function () { done('abgespielt bis zum Ende (Lautstärke ' + Math.round((a.volume || 0) * 100) + ' %, stumm: ' + (a.muted ? 'ja' : 'nein') + ')'); };
    a.src = src;
    try { a.playbackRate = 1; } catch (e) {}
    var pr;
    try { pr = a.play(); } catch (e) { done('play() Fehler: ' + e.name); return; }
    if (pr && pr.then) pr.then(function () { setTimeout(function () { if (!r[t]) done(started ? 'spielt …' : 'gestartet, aber noch kein Ton'); }, 2500); },
      function (err) { done('vom iPad blockiert: ' + ((err && err.name) || '') + ' ' + ((err && err.message) || '')); });
    return;
  }
  // iPad-Stimme direkt testen (ohne Ersatz-Logik)
  if (!F.speech.supported) { done('Diese Safari-Version hat keine Sprachausgabe.'); return; }
  var synth = window.speechSynthesis;
  var u = new SpeechSynthesisUtterance('Hallo, das ist die iPad-Stimme.');
  u.lang = 'de-DE';
  var st = false;
  u.onstart = function () { st = true; };
  u.onend = function () { done('fertig gesprochen (Start gemeldet: ' + (st ? 'ja' : 'nein') + ')'); };
  u.onerror = function (ev) { done('Fehler: ' + ((ev && ev.error) || '?')); };
  F.speech._u = u;
  try { if (synth.paused) synth.resume(); synth.speak(u); } catch (e) { done('speak() Fehler: ' + e.name); return; }
  setTimeout(function () { if (!r[t]) done('nach 4 s: spricht=' + synth.speaking + ', wartet=' + synth.pending + ', Start gemeldet=' + (st ? 'ja' : 'nein')); }, 4000);
};

F.actions.saveSchoolParent = function () { F.readSchoolForm(); F.toast('Gespeichert ✓'); };

F.aiUsageHtml = function () {
  var s = F.state.settings;
  var n = s.usage && s.usage.day === F.today() ? s.usage.n : 0;
  var b = s.blocked || {}, now = Date.now();
  var gesperrt = Object.keys(b).filter(function (k) { return b[k] > now; });
  return '<div class="card soft small"><b>📊 Heute:</b> ' + n + ' KI-Anfragen. ' +
    'Das kostenlose Kontingent wird jeden Tag zurückgesetzt – bei uns gegen <b>' + F.ai.timeText(F.ai.pacificReset()).replace(/^(heute|morgen) um /, '') + '</b>.' +
    (gesperrt.length ? '<br>Gerade pausiert: ' + gesperrt.map(function (k) { return F.esc(k) + ' (bis ' + F.ai.timeText(b[k]) + ')'; }).join(', ') +
      '<br><button class="btn small light" style="margin-top:6px" data-action="unblockAI">Trotzdem nochmal probieren</button>' : '') + '</div>';
};
F.actions.unblockAI = function () {
  F.state.settings.blocked = {};
  F.save();
  F.render();
  F.toast('OK – beim nächsten Mal wird wieder probiert.');
};
