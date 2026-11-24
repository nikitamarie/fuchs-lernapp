/* Diktat-Bereich: Diktate anlegen (Foto/abtippen), vorlesen lassen, mit Foto prüfen */

F.getDiktat = function (id) {
  for (var i = 0; i < F.state.diktate.length; i++) if (F.state.diktate[i].id === id) return F.state.diktate[i];
  return null;
};
F.getCheck = function (id) {
  for (var i = 0; i < F.state.checks.length; i++) if (F.state.checks[i].id === id) return F.state.checks[i];
  return null;
};
F.diktatWords = function (d) {
  if (d.woerter && d.woerter.length) return d.woerter;
  return F.spell.wordsFromText(d.text).map(function (x) { return x.wort; });
};

/* ---------------- Übersicht ---------------- */
F.views.diktatHome = function () {
  var list = F.state.diktate.slice().sort(function (a, b) { return b.created - a.created; });
  var items = list.map(function (d) {
    var n = F.state.checks.filter(function (c) { return c.diktatId === d.id; }).length;
    return '<button class="list-item" data-action="go" data-view="diktatDetail" data-params="' + F.esc(JSON.stringify({ id: d.id })) + '">' +
      '<span class="li-emoji">' + (d.art === 'woerter' ? '🔤' : '📝') + '</span>' +
      '<span class="li-main"><span class="li-title">' + F.esc(d.titel) + '</span>' +
      '<span class="li-sub">' + (d.art === 'woerter' ? (d.woerter || []).length + ' Wörter' : F.splitSentences(d.text).length + ' Sätze') +
      (n ? ' · ' + n + '× geprüft' : '') + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  var tw = F.state.trainWords.length;
  return F.topbar('Diktat-Training', { home: true }) +
    F.countdownHtml() +
    (tw ? '<button class="tile wichtig wide mb" data-action="go" data-view="trainSetup" data-params="' + F.esc(JSON.stringify({ source: 'train' })) + '">' +
      '<span class="emoji">💪</span><span class="label">Meine Übungswörter</span><span class="sub">' + tw + ' Wörter aus deinen Diktaten – kurz trainieren</span></button>' : '') +
    '<h2>Meine Diktate</h2>' +
    (items || '<div class="card soft"><p>Noch kein Diktat da. Fotografiere das Übungsdiktat oder die Lernwörter aus der Mappe! 📷</p></div>') +
    '<div class="btn-row mt">' +
    F.goBtn('diktatNew', { mode: 'foto' }, '📷 Neues Diktat vom Foto', 'btn big fuchs') +
    F.goBtn('diktatEdit', { neu: true }, '⌨️ Abtippen', 'btn big light') +
    '</div>';
};

/* ---------------- Neues Diktat vom Foto ---------------- */
F.views.diktatNew = function () {
  var imgs = F.pendingImages.diktatNew || [];
  return F.topbar('Neues Diktat') +
    '<div class="card"><h2>1. Foto machen</h2>' +
    '<p>Fotografiere das Übungsdiktat, den Diktattext oder die Lernwörter-Liste.</p>' +
    F.photoPicker('diktatNew') + '</div>' +
    '<div class="card"><h2>2. Text auslesen</h2>' +
    '<p>' + F.esc(F.fox()) + ' liest den Text vom Foto ab. Danach kannst du alles nochmal prüfen.</p>' +
    '<button class="btn big block" data-action="extractDiktat" ' + (imgs.length ? '' : 'disabled') + '>🦊 Text auslesen</button></div>' +
    (!F.ai.hasKey() ? '<div class="card hinweis"><p><b>Hinweis für Eltern:</b> Für das Auslesen vom Foto muss einmal der kostenlose KI-Schlüssel eingetragen werden (⚙️ Mehr → KI-Schlüssel). ' +
      'Ohne Schlüssel kannst du den Text auch abtippen.</p></div>' : '');
};

F.actions.extractDiktat = function () {
  var imgs = F.pendingImages.diktatNew || [];
  if (!imgs.length) return;
  document.getElementById('app').innerHTML = F.loadingHtml('Neues Diktat', F.fox() + ' liest den Text …');
  F.ai.generateJSON(F.prompts.diktatExtract(), imgs).then(function (j) {
    F.pendingImages.diktatNew = [];
    var draft = {
      titel: j.titel || 'Diktat',
      art: j.art === 'woerter' ? 'woerter' : 'text',
      text: j.text || '',
      woerter: (j.woerter || []).filter(Boolean),
      merksaetze: j.merksaetze || []
    };
    F.go('diktatEdit', { draft: draft }, { replace: true });
  }).catch(function (e) {
    F.showAiError(e);
  });
};

/* ---------------- Diktat bearbeiten / abtippen ---------------- */
F.views.diktatEdit = function (p) {
  var d = p.id ? F.getDiktat(p.id) : (p.draft || { titel: '', art: 'text', text: '', woerter: [] });
  if (!d) return F.topbar('Diktat') + '<p>Nicht gefunden.</p>';
  var fromPhoto = !!p.draft;
  return F.topbar(p.id ? 'Diktat bearbeiten' : 'Diktat prüfen & speichern') +
    (fromPhoto ? '<div class="card gut"><p><b>Fertig gelesen!</b> Bitte kurz kontrollieren (am besten Mama oder Papa) und bei Bedarf verbessern.</p></div>' : '') +
    '<div class="card">' +
    '<label class="field"><span>Titel</span><input type="text" id="dTitel" value="' + F.esc(d.titel) + '" placeholder="z. B. Diktat: Im Herbst"></label>' +
    '<div class="chips" id="dArt">' +
    '<button class="chip ' + (d.art !== 'woerter' ? 'on' : '') + '" data-action="setArt" data-art="text">Text mit Sätzen</button>' +
    '<button class="chip ' + (d.art === 'woerter' ? 'on' : '') + '" data-action="setArt" data-art="woerter">Nur Wörter</button>' +
    '</div>' +
    '<label class="field ' + (d.art === 'woerter' ? 'hidden' : '') + '" id="dTextWrap"><span>Diktattext</span>' +
    '<textarea id="dText" autocapitalize="sentences" spellcheck="true">' + F.esc(d.text) + '</textarea></label>' +
    '<label class="field"><span>Lernwörter <span class="muted small">(ein Wort pro Zeile – bei Text optional)</span></span>' +
    '<textarea id="dWoerter" style="min-height:120px" autocapitalize="off">' + F.esc((d.woerter || []).join('\n')) + '</textarea></label>' +
    ((d.merksaetze && d.merksaetze.length) ? '<p class="muted small">✨ ' + d.merksaetze.length + ' Merksatz/Merksätze vom Blatt werden im Bereich „Nachlesen“ gespeichert.</p>' : '') +
    '<button class="btn big block gut" data-action="saveDiktat">✓ Speichern</button>' +
    '</div>';
};
F.actions.setArt = function (el) {
  F.$$('#dArt .chip').forEach(function (c) { c.className = 'chip' + (c === el ? ' on' : ''); });
  var isWords = el.getAttribute('data-art') === 'woerter';
  F.$('#dTextWrap').className = 'field' + (isWords ? ' hidden' : '');
};
F.actions.saveDiktat = function () {
  var p = F.current.params;
  var art = F.$('#dArt .chip.on').getAttribute('data-art');
  var titel = F.$('#dTitel').value.trim() || 'Diktat';
  var text = art === 'woerter' ? '' : F.$('#dText').value.trim();
  var woerter = F.$('#dWoerter').value.split(/[\n,;]+/).map(function (w) { return w.trim(); }).filter(Boolean);
  if (art === 'text' && !text) { F.toast('Bitte den Diktattext eintragen.'); return; }
  if (art === 'woerter' && !woerter.length) { F.toast('Bitte mindestens ein Wort eintragen.'); return; }
  var d;
  if (p.id) {
    d = F.getDiktat(p.id);
    d.titel = titel; d.art = art; d.text = text; d.woerter = woerter;
  } else {
    d = { id: F.uid(), titel: titel, art: art, text: text, woerter: woerter, created: Date.now() };
    F.state.diktate.push(d);
    var ms = (p.draft && p.draft.merksaetze) || [];
    ms.forEach(function (m) {
      if (!m || !m.text) return;
      F.state.notes.push({ id: F.uid(), fach: 'deutsch', titel: m.titel || 'Merksatz', text: m.text, beispiel: m.beispiel || '', created: Date.now(), quelle: titel });
    });
  }
  F.save();
  F.toast('Gespeichert! 🦊');
  F.history = [{ name: 'home', params: {} }, { name: 'diktatHome', params: {} }];
  F.current = null;
  F.go('diktatDetail', { id: d.id });
};

/* ---------------- Diktat-Detail ---------------- */
F.views.diktatDetail = function (p) {
  var d = F.getDiktat(p.id);
  if (!d) return F.topbar('Diktat') + '<p>Nicht gefunden.</p>';
  var checks = F.state.checks.filter(function (c) { return c.diktatId === d.id; }).sort(function (a, b) { return b.date - a.date; });
  var checkList = checks.map(function (c) {
    var f = F.activeErrors(c).length;
    return '<button class="list-item" data-action="go" data-view="diktatResult" data-params="' + F.esc(JSON.stringify({ id: c.id })) + '">' +
      '<span class="li-emoji">' + (f === 0 ? '🌟' : '📋') + '</span><span class="li-main"><span class="li-title">' +
      F.formatDate(new Date(c.date).toISOString()) + '</span><span class="li-sub">' +
      (f === 0 ? 'Fehlerfrei!' : f + (f === 1 ? ' Übungswort' : ' Übungswörter')) + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  var words = F.diktatWords(d);
  var idp = { id: d.id };
  return F.topbar(d.titel, { home: true }) +
    '<div class="tiles">' +
    '<button class="tile wichtig wide" data-action="go" data-view="diktatSetup" data-params="' + F.esc(JSON.stringify(idp)) + '">' +
    '<span class="emoji">🔊</span><span class="label">Diktat schreiben</span><span class="sub">' + F.esc(F.fox()) + ' liest vor, du schreibst auf Papier</span></button>' +
    (words.length ? '<button class="tile" data-action="go" data-view="trainSetup" data-params="' + F.esc(JSON.stringify({ source: 'diktat', id: d.id })) + '">' +
      '<span class="emoji">💪</span><span class="label">Wörter üben</span><span class="sub">' + words.length + ' schwierige Wörter</span></button>' : '') +
    '<button class="tile" data-action="go" data-view="diktatCheck" data-params="' + F.esc(JSON.stringify(idp)) + '">' +
    '<span class="emoji">📷</span><span class="label">Mit Foto prüfen</span><span class="sub">Geschriebenes Diktat kontrollieren</span></button>' +
    '</div>' +
    (checkList ? '<h2 class="mt">Bisher geprüft</h2>' + checkList : '') +
    '<div class="card soft mt"><details><summary style="cursor:pointer;font-weight:700;color:#3f2270">Text ansehen (zum Nachlesen nach dem Schreiben)</summary>' +
    (d.text ? '<p class="diktat-text mt">' + F.esc(d.text) + '</p>' : '') +
    (words.length ? '<div class="mt">' + words.map(function (w) { return '<span class="word-chip">' + F.esc(w) + '</span>'; }).join('') + '</div>' : '') +
    '</details></div>' +
    '<div class="btn-row">' +
    F.goBtn('diktatEdit', idp, '✏️ Bearbeiten', 'btn light small') +
    '<button class="btn danger small" data-action="deleteDiktat" data-id="' + d.id + '">🗑️ Löschen</button>' +
    '</div>';
};
F.actions.deleteDiktat = function (el) {
  if (!confirm('Dieses Diktat wirklich löschen?')) return;
  var id = el.getAttribute('data-id');
  F.state.diktate = F.state.diktate.filter(function (d) { return d.id !== id; });
  F.save();
  F.back();
};

/* ---------------- Vorlesen: Einstellungen ---------------- */
F.views.diktatSetup = function (p) {
  var d = F.getDiktat(p.id);
  if (!d) return F.topbar('Diktat') + '<p>Nicht gefunden.</p>';
  var s = F.state.settings;
  var hasText = d.art !== 'woerter' && d.text;
  var rate = s.rate || 0.85;
  return F.topbar('Diktat schreiben') +
    '<div class="card center"><div style="font-size:3rem">✏️📄</div>' +
    '<h2>Leg Papier und Stift bereit!</h2>' +
    '<p>' + F.esc(F.fox()) + ' liest dir alles in kleinen Stücken vor. Du bestimmst das Tempo mit dem Knopf <b>„Weiter“</b>. ' +
    'Mit 🔊 hörst du ein Stück nochmal.</p></div>' +
    '<div class="card">' +
    (hasText ? '<h3>Was soll vorgelesen werden?</h3><div class="chips" id="dpMode">' +
      '<button class="chip on" data-action="chipPick" data-group="dpMode" data-val="text">Ganzer Text</button>' +
      '<button class="chip" data-action="chipPick" data-group="dpMode" data-val="woerter">Nur schwierige Wörter</button></div>' : '') +
    '<h3>Tempo</h3><div class="chips" id="dpRate">' +
    '<button class="chip ' + (rate < 0.8 ? 'on' : '') + '" data-action="chipPick" data-group="dpRate" data-val="0.7">🐢 Langsam</button>' +
    '<button class="chip ' + (rate >= 0.8 && rate < 0.95 ? 'on' : '') + '" data-action="chipPick" data-group="dpRate" data-val="0.85">🦊 Normal</button>' +
    '<button class="chip ' + (rate >= 0.95 ? 'on' : '') + '" data-action="chipPick" data-group="dpRate" data-val="1">🐆 Schneller</button></div>' +
    (hasText ? '<div class="switch-row"><span>Satzzeichen ansagen („Komma“, „Punkt“)</span><input type="checkbox" id="dpPunct" ' + (s.speakPunct ? 'checked' : '') + '></div>' : '') +
    '<div class="switch-row"><span>Geschriebenes Stück auf dem Bildschirm zeigen</span><input type="checkbox" id="dpShow" ' + (s.showText ? 'checked' : '') + '></div>' +
    '<button class="btn big block fuchs mt" data-action="startDiktat" data-id="' + d.id + '">Los geht’s! 🔊</button>' +
    '<button class="btn small light" data-action="testVoice">🔊 Ton testen</button>' +
    '</div>' +
    '<div class="card soft small"><b>Hörst du nichts?</b><ol class="steps" style="margin:6px 0 0">' +
    '<li>Lautstärke-Taste am iPad nach oben drücken.</li>' +
    '<li>Stumm-Schalter an der Seite (falls vorhanden) bzw. die Glocke im Kontrollzentrum ausschalten.</li>' +
    '<li>Bluetooth-Kopfhörer verbunden? Dann kommt der Ton dort.</li>' +
    '<li>Immer noch still? <button class="btn small fuchs" style="margin:6px 0 0" data-action="useOnlineVoice">Online-Stimme benutzen</button></li></ol></div>' +
    (!F.speech.supported ? '<div class="card hinweis">Dieses Gerät kann leider nicht vorlesen.</div>' : '');
};
F.actions.chipPick = function (el) {
  var g = el.getAttribute('data-group');
  F.$$('#' + g + ' .chip').forEach(function (c) { c.className = 'chip' + (c === el ? ' on' : ''); });
  if (g === 'dpRate') {
    F.state.settings.rate = parseFloat(el.getAttribute('data-val'));
    F.save();
  }
};
F.actions.testVoice = function () {
  F.speech.speak('Hallo! Ich bin ' + F.fox() + '. So schnell lese ich vor.');
};
F.actions.useOnlineVoice = function () {
  F.state.settings.ttsMode = 'online';
  F.save();
  F.speech.speak('Hallo! Jetzt lese ich mit der Online-Stimme vor.');
  F.toast('Online-Stimme ist an (braucht WLAN). Ändern: ⚙️ Mehr → Stimme.', 4500);
};

F.actions.startDiktat = function (el) {
  var d = F.getDiktat(el.getAttribute('data-id'));
  var modeEl = F.$('#dpMode .chip.on');
  var mode = modeEl ? modeEl.getAttribute('data-val') : (d.art === 'woerter' ? 'woerter' : 'text');
  var s = F.state.settings;
  s.speakPunct = !!(F.$('#dpPunct') && F.$('#dpPunct').checked);
  s.showText = !!(F.$('#dpShow') && F.$('#dpShow').checked);
  F.save();
  var items;
  if (mode === 'text') {
    items = F.splitSentences(d.text).map(function (sent) { return { satz: sent, teile: F.chunkSentence(sent) }; });
  } else {
    items = F.diktatWords(d).map(function (w) { return { wort: w }; });
  }
  if (!items.length) { F.toast('Hier gibt es nichts vorzulesen.'); return; }
  F.dp = { id: d.id, mode: mode, items: items, i: 0, phase: mode === 'text' ? 'ganz' : 'wort', c: 0 };
  F.go('diktatPlay', {}, { replace: true });
};

/* ---------------- Vorlesen: der eigentliche Diktat-Bildschirm ---------------- */
F.dpCurrentText = function () {
  var dp = F.dp;
  if (!dp) return '';
  var punct = F.state.settings.speakPunct;
  if (dp.phase === 'ende') {
    return dp.items.map(function (it) { return it.satz || it.wort; }).join(' ');
  }
  var it = dp.items[dp.i];
  if (dp.mode === 'woerter') return it.wort;
  if (dp.phase === 'ganz' || dp.phase === 'nochmal') return it.satz;
  return it.teile[dp.c];
};
F.dpSpeak = function () {
  var dp = F.dp;
  if (!dp) return;
  var t = F.dpCurrentText();
  var punct = F.state.settings.speakPunct;
  if (dp.mode === 'woerter' && dp.phase === 'wort') {
    // Wort zweimal mit kurzer Pause
    F.speech.speak(t).then(function () {
      if (F.dp !== dp || F.current.name !== 'diktatPlay') return;
      setTimeout(function () { if (F.dp === dp && F.current.name === 'diktatPlay') F.speech.speak(t); }, 900);
    });
    return;
  }
  if (dp.phase === 'ende') {
    // Satz für Satz mit kleinen Pausen vorlesen
    var list = dp.items.map(function (it) { return it.satz || it.wort; });
    var k = 0;
    var nextOne = function () {
      if (k >= list.length || F.dp !== dp || F.current.name !== 'diktatPlay') return;
      F.speech.speak(F.speakable(list[k++], false)).then(function () { setTimeout(nextOne, 700); });
    };
    nextOne();
    return;
  }
  // Teilstücke: Satzzeichen nur beim Schreiben (Teile) ansagen
  var withPunct = punct && dp.phase === 'teil';
  F.speech.speak(F.speakable(t, withPunct));
};

F.views.diktatPlay = function () {
  var dp = F.dp;
  if (!dp) { setTimeout(F.back, 0); return ''; }
  var total = dp.items.length;
  var pct = dp.phase === 'ende' ? 100 : Math.round((dp.i / total) * 100);
  var it = dp.items[dp.i];
  var showText = F.state.settings.showText;
  var head, instr, nextLabel;
  var halbzeit = dp.i === Math.floor(total / 2) && total >= 4 && (dp.phase === 'ganz' || dp.phase === 'wort');

  if (dp.phase === 'ende') {
    head = 'Fast fertig! 🎉';
    instr = 'Jetzt lese ich dir alles nochmal vor. Fahr mit dem Finger mit und schau: Stimmt alles?';
    nextLabel = 'Fertig ✓';
  } else if (dp.mode === 'woerter') {
    head = 'Wort ' + (dp.i + 1) + ' von ' + total;
    instr = 'Hör gut zu und schreib das Wort auf.';
    nextLabel = 'Geschrieben ✓ Weiter';
  } else if (dp.phase === 'ganz') {
    head = 'Satz ' + (dp.i + 1) + ' von ' + total;
    instr = 'Hör dir erst den ganzen Satz an. Noch nicht schreiben!';
    nextLabel = 'Jetzt schreiben ✏️';
  } else if (dp.phase === 'teil') {
    head = 'Satz ' + (dp.i + 1) + ' · Stück ' + (dp.c + 1) + ' von ' + it.teile.length;
    instr = 'Schreib dieses Stück auf.';
    nextLabel = 'Geschrieben ✓ Weiter';
  } else {
    head = 'Satz ' + (dp.i + 1) + ' von ' + total;
    instr = 'Hör nochmal den ganzen Satz. Fehlt etwas? Großer Anfang? Punkt am Ende?';
    nextLabel = dp.i + 1 < total ? 'Nächster Satz ›' : 'Weiter ›';
  }

  var html = F.topbar('Diktat', { home: true }) +
    '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
    '<div class="stage">' +
    '<h2>' + F.esc(head) + '</h2>' +
    (halbzeit ? '<p class="small" style="color:#9a4a12;font-weight:700">Halbzeit! 🤾‍♀️ Du machst das super!</p>' : '') +
    '<p class="prompt" style="font-size:1.25rem">' + F.esc(instr) + '</p>' +
    '<button class="speak-btn" data-action="dpRepeat" aria-label="Nochmal vorlesen">🔊</button>' +
    '<p class="muted small">Tippe auf 🔊, um es nochmal zu hören.</p>' +
    (showText && dp.phase !== 'ende' ? '<div class="card soft"><p class="diktat-text" style="font-size:1.6rem;font-weight:700">' + F.esc(F.dpCurrentText()) + '</p></div>' : '') +
    '<button class="btn big block gut" data-action="dpNext">' + nextLabel + '</button>' +
    (dp.phase === 'teil' || dp.phase === 'nochmal' ? '<button class="btn small light" data-action="dpWhole">Ganzen Satz nochmal hören</button>' : '') +
    '</div>';
  F.afterRender = F.dpSpeak;
  return html;
};

F.actions.dpRepeat = function () { F.dpSpeak(); };
F.actions.dpWhole = function () {
  var it = F.dp.items[F.dp.i];
  F.speech.speak(F.speakable(it.satz, false));
};
F.actions.dpNext = function () {
  var dp = F.dp;
  F.speech.stop();
  if (dp.phase === 'ende') {
    var d = F.getDiktat(dp.id);
    F.dp = null;
    F.finishRound({
      titel: 'Diktat geschafft! 🎉',
      text: 'Toll durchgehalten! Jetzt kannst du dein Diktat mit einem Foto prüfen lassen.',
      tore: 5 + Math.min(10, dp.items.length),
      extraHtml: '<div class="btn-row">' + F.goBtnR('diktatCheck', { id: d.id }, '📷 Jetzt mit Foto prüfen', 'btn big block fuchs') + '</div>'
    });
    return;
  }
  if (dp.mode === 'woerter') {
    dp.i++;
    if (dp.i >= dp.items.length) dp.phase = 'ende';
  } else if (dp.phase === 'ganz') {
    dp.phase = 'teil'; dp.c = 0;
  } else if (dp.phase === 'teil') {
    var it = dp.items[dp.i];
    if (dp.c + 1 < it.teile.length) dp.c++;
    else dp.phase = it.teile.length > 1 ? 'nochmal' : 'nochmal';
  } else if (dp.phase === 'nochmal') {
    dp.i++; dp.c = 0;
    dp.phase = dp.i >= dp.items.length ? 'ende' : 'ganz';
  }
  F.render();
};

/* ---------------- Diktat mit Foto prüfen ---------------- */
F.views.diktatCheck = function (p) {
  var d = p.id ? F.getDiktat(p.id) : null;
  if (!d) {
    var list = F.state.diktate.map(function (x) {
      return F.goBtn('diktatCheck', { id: x.id }, '📝 ' + F.esc(x.titel), 'list-item');
    }).join('');
    return F.topbar('Diktat prüfen') + '<h2>Welches Diktat hast du geschrieben?</h2>' + (list || '<p>Noch keine Diktate vorhanden.</p>');
  }
  var imgs = F.pendingImages.check || [];
  return F.topbar('Diktat prüfen') +
    '<div class="card"><h2>📷 Foto von deinem Diktat</h2>' +
    '<p>Leg dein Blatt auf den Tisch und fotografiere es von oben – schön hell und gerade. Bei mehreren Seiten: alle fotografieren.</p>' +
    F.photoPicker('check') + '</div>' +
    '<button class="btn big block fuchs" data-action="runCheck" data-id="' + d.id + '" ' + (imgs.length ? '' : 'disabled') + '>🦊 Prüfen lassen</button>' +
    '<p class="muted small center">' + F.esc(F.fox()) + ' liest deine Schreibschrift. Manchmal irrt sich die KI – Mama oder Papa können das Ergebnis unter ⚙️ Mehr → Diktat-Ergebnisse verbessern.</p>';
};

F.actions.runCheck = function (el) {
  var d = F.getDiktat(el.getAttribute('data-id'));
  var imgs = F.pendingImages.check || [];
  if (!imgs.length) return;
  var original = d.art === 'woerter' ? d.woerter.join('\n') : d.text;
  document.getElementById('app').innerHTML = F.loadingHtml('Diktat prüfen', F.fox() + ' liest dein Diktat …');
  F.ai.generateJSON(F.prompts.diktatCheck(original), imgs).then(function (j) {
    F.pendingImages.check = [];
    var fehler = (j.fehler || []).filter(function (f) { return f && (f.soll || f.ist); }).map(function (f) {
      return {
        soll: String(f.soll || ''), ist: String(f.ist || ''),
        kategorie: F.prompts.KATEGORIEN.indexOf(f.kategorie) >= 0 ? f.kategorie : 'Sonstiges',
        tipp: String(f.tipp || ''), unsicher: !!f.unsicher, ignored: false
      };
    });
    var total = parseInt(j.woerterGesamt, 10);
    if (!total || total < 1) total = original.split(/\s+/).filter(Boolean).length;
    var c = {
      id: F.uid(), diktatId: d.id, date: Date.now(),
      erkannt: String(j.erkannt || ''), woerterGesamt: total,
      fehler: fehler, lob: String(j.lob || ''), muster: String(j.muster || ''), toreGiven: false
    };
    F.state.checks.push(c);
    F.syncTrainWords(c);
    F.save();
    F.go('diktatResult', { id: c.id }, { replace: true });
  }).catch(function (e) {
    F.showAiError(e);
  });
};

F.activeErrors = function (c) { return c.fehler.filter(function (f) { return !f.ignored; }); };

/* Fehlerwörter in die Übungsliste übernehmen (oder entfernen, wenn Eltern sie streichen) */
F.syncTrainWords = function (c) {
  c.fehler.forEach(function (f) {
    var w = F.spell.clean(f.soll);
    if (!w || w.length < 2 || f.kategorie === 'Satzzeichen') return;
    var idx = -1;
    for (var i = 0; i < F.state.trainWords.length; i++) if (F.state.trainWords[i].wort === w) idx = i;
    if (f.ignored || f.unsicher) {
      if (f.ignored && idx >= 0 && F.state.trainWords[idx].checkId === c.id) F.state.trainWords.splice(idx, 1);
      return;
    }
    if (idx < 0) {
      F.state.trainWords.push({ wort: w, tipp: f.tipp, kategorie: f.kategorie, added: Date.now(), richtigInFolge: 0, checkId: c.id });
    } else {
      F.state.trainWords[idx].richtigInFolge = 0;
      F.state.trainWords[idx].tipp = f.tipp || F.state.trainWords[idx].tipp;
    }
  });
};

F.errorCardHtml = function (f, idx, parentMode) {
  var written = f.ist ? F.esc(f.ist) : '<i>(vergessen)</i>';
  return '<div class="err-card ' + (f.unsicher ? 'unsicher ' : '') + (f.ignored ? 'ignored' : '') + '">' +
    '<span class="cat">' + F.spell.catEmoji(f.kategorie) + ' ' + F.esc(f.kategorie) + '</span>' +
    '<div class="btn-row" style="align-items:center">' +
    '<div style="flex:1"><div class="small muted">Du hast geschrieben:</div><div class="written">' + written + '</div>' +
    '<div class="small muted" style="margin-top:6px">So schreibt man es:</div>' +
    '<div class="correct">' + (f.ist ? F.spell.diffHtml(f.ist, f.soll) : F.esc(f.soll)) + '</div></div>' +
    '<button class="btn light small" style="flex:0 0 auto" data-action="sayWord" data-word="' + F.esc(f.soll) + '">🔊</button>' +
    '</div>' +
    (f.tipp ? '<p style="margin-top:8px">💡 ' + F.esc(f.tipp) + '</p>' : '') +
    (f.unsicher ? '<p class="small muted">🤔 Das konnte ' + F.esc(F.fox()) + ' nicht genau lesen. Schau mit Mama oder Papa nach.</p>' : '') +
    (parentMode ? '<button class="btn small ' + (f.ignored ? 'gut' : 'light') + '" data-action="toggleErr" data-idx="' + idx + '">' +
      (f.ignored ? '↩️ Doch ein Fehler' : '✓ War doch richtig (KI hat sich geirrt)') + '</button>' : '') +
    '</div>';
};
F.actions.sayWord = function (el) { F.speech.speak(el.getAttribute('data-word')); };

F.views.diktatResult = function (p) {
  var c = F.getCheck(p.id);
  if (!c) return F.topbar('Ergebnis') + '<p>Nicht gefunden.</p>';
  var d = F.getDiktat(c.diktatId);
  var errs = F.activeErrors(c);
  var real = errs.filter(function (f) { return !f.unsicher; }).length;
  var richtig = Math.max(0, c.woerterGesamt - real);
  var newBelt = null;
  if (!c.toreGiven) {
    c.toreGiven = true;
    newBelt = F.addTore(10);
    F.save();
  }
  var top;
  if (errs.length === 0) {
    top = '<div class="celebrate"><div class="big pop">🌟🦊🌟</div><h1>Fehlerfrei! Wahnsinn!</h1>' +
      '<p style="font-size:1.2rem">Alle ' + c.woerterGesamt + ' Wörter richtig. Das ist ein echter Volltreffer! ⚽</p></div>';
  } else {
    var ratio = richtig / Math.max(1, c.woerterGesamt);
    var emoji = ratio >= 0.9 ? '🏆' : ratio >= 0.75 ? '💪' : '🦊';
    top = '<div class="celebrate"><div class="big pop">' + emoji + '</div>' +
      '<h1>' + richtig + ' von ' + c.woerterGesamt + ' Wörtern richtig!</h1>' +
      (c.lob ? '<p style="font-size:1.15rem">' + F.esc(c.lob) + '</p>' : '') +
      '<p>' + (errs.length === 1 ? 'Ein Wort' : errs.length + ' Wörter') + ' schauen wir uns jetzt zusammen an – ganz in Ruhe.</p></div>';
  }
  var cards = errs.map(function (f) { return F.errorCardHtml(f, c.fehler.indexOf(f), false); }).join('');
  var trainable = errs.filter(function (f) { return !f.unsicher && f.kategorie !== 'Satzzeichen'; }).length;
  return F.topbar('Ergebnis', { home: true }) +
    top +
    (newBelt ? '<div class="card fuchs center"><h2>🥋 Neuer Gürtel: ' + F.esc(newBelt.name) + '!</h2></div>' : '<p class="center tore">+10 Tore fürs Prüfen ⚽</p>') +
    cards +
    (trainable ? F.goBtn('trainSetup', { source: 'check', id: c.id }, '💪 Diese Wörter jetzt üben', 'btn big block fuchs') : '') +
    '<button class="btn big block light" data-action="back">Fertig</button>' +
    '<div class="card soft mt"><details><summary style="cursor:pointer;font-weight:700;color:#3f2270">Für Eltern: Was die KI gelesen hat</summary>' +
    '<p class="mt"><b>Erkannt:</b></p><p class="diktat-text">' + F.esc(c.erkannt) + '</p>' +
    (d ? '<p><b>Original:</b></p><p class="diktat-text">' + F.esc(d.text || (d.woerter || []).join(', ')) + '</p>' : '') +
    (c.muster ? '<p><b>Fehlermuster:</b> ' + F.esc(c.muster) + '</p>' : '') +
    '<p class="small muted">Hat sich die KI geirrt? Unter ⚙️ Mehr → „Diktat-Ergebnisse“ können einzelne Fehler gestrichen werden.</p>' +
    '</details></div>';
};
