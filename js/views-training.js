/* Wörter-Training: kurze Runden mit 6 Wörtern (hören & wählen, hören & tippen, auf Papier) */

F.trainSource = function (p) {
  var words = [];
  if (p.source === 'train') {
    words = F.shuffle(F.state.trainWords).sort(function (a, b) { return (a.richtigInFolge || 0) - (b.richtigInFolge || 0); })
      .map(function (t) { return { wort: t.wort, tipp: t.tipp, kategorie: t.kategorie }; });
  } else if (p.source === 'check') {
    var c = F.getCheck(p.id);
    if (c) words = F.activeErrors(c).filter(function (f) { return !f.unsicher && f.kategorie !== 'Satzzeichen'; })
      .map(function (f) { return { wort: F.spell.clean(f.soll), tipp: f.tipp, kategorie: f.kategorie }; })
      .filter(function (w) { return w.wort.length > 1; });
  } else if (p.source === 'diktat') {
    var d = F.getDiktat(p.id);
    if (d) words = F.shuffle(F.diktatWords(d)).map(function (w) { return { wort: F.spell.clean(w) || w, tipp: '', kategorie: '' }; });
  }
  return words;
};

F.views.trainSetup = function (p) {
  var words = F.trainSource(p);
  if (!words.length) return F.topbar('Wörter üben') + '<div class="card soft"><p>Hier gibt es gerade keine Wörter zum Üben. 🎉</p></div>';
  var n = Math.min(6, words.length);
  var pj = function (typ) { return F.esc(JSON.stringify({ source: p.source, id: p.id || '', typ: typ })); };
  return F.topbar('Wörter üben') +
    '<div class="card center"><div style="font-size:3rem">💪🦊</div>' +
    '<h2>Trainingseinheit: ' + n + ' Wörter</h2><p class="muted">Dauert nur ein paar Minuten.</p></div>' +
    '<button class="list-item" data-action="startTrain" data-params="' + pj('mix') + '" style="border:3px solid #e9782f">' +
    '<span class="li-emoji">🎯</span><span class="li-main"><span class="li-title">Gemischt (empfohlen)</span><span class="li-sub">Hören & wählen, tippen und auf Papier</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="startTrain" data-params="' + pj('waehlen') + '">' +
    '<span class="li-emoji">👂</span><span class="li-main"><span class="li-title">Hören & richtiges Wort wählen</span><span class="li-sub">Am leichtesten</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="startTrain" data-params="' + pj('tippen') + '">' +
    '<span class="li-emoji">⌨️</span><span class="li-main"><span class="li-title">Hören & selbst tippen</span><span class="li-sub">Für Profis</span></span><span class="li-arrow">›</span></button>' +
    '<button class="list-item" data-action="startTrain" data-params="' + pj('papier') + '">' +
    '<span class="li-emoji">✍️</span><span class="li-main"><span class="li-title">Auf Papier schreiben</span><span class="li-sub">In Schreibschrift – wie im echten Diktat</span></span><span class="li-arrow">›</span></button>';
};

F.actions.startTrain = function (el) {
  var p = JSON.parse(el.getAttribute('data-params'));
  var words = F.trainSource(p).slice(0, 6);
  var typen = p.typ === 'mix' ? ['waehlen', 'tippen', 'papier'] : [p.typ];
  var queue = words.map(function (w, i) {
    return { w: w, typ: typen[i % typen.length], retry: false };
  });
  F.tr = { p: p, queue: queue, idx: 0, firstTry: 0, total: words.length, state: 'frage', mastered: 0, revealed: false };
  F.go('trainPlay', {}, { replace: true });
};

F.views.trainPlay = function () {
  var tr = F.tr;
  if (!tr) { setTimeout(F.back, 0); return ''; }
  var q = tr.queue[tr.idx];
  var dots = tr.queue.map(function (x, i) {
    return '<span class="' + (i < tr.idx ? 'done' : i === tr.idx ? 'now' : '') + '"></span>';
  }).join('');
  var html = F.topbar('Wörter üben', { home: true }) + '<div class="dots">' + dots + '</div><div class="stage">';

  if (tr.state === 'feedback') {
    html += tr.fbHtml + '<button class="btn big block gut" data-action="trNext">Weiter ›</button></div>';
    return html;
  }

  if (q.typ === 'waehlen') {
    if (!q.opts) q.opts = F.shuffle([q.w.wort].concat(F.spell.distractors(q.w.wort, 2)));
    html += '<p class="prompt">Hör zu: Welches Wort ist richtig geschrieben?</p>' +
      '<button class="speak-btn" data-action="trSay" aria-label="Wort anhören">🔊</button>' +
      '<div class="options">' + q.opts.map(function (o) {
        return '<button class="option" data-action="trPick" data-val="' + F.esc(o) + '">' + F.esc(o) + '</button>';
      }).join('') + '</div>';
  } else if (q.typ === 'tippen') {
    html += '<p class="prompt">Hör zu und tippe das Wort.</p>' +
      '<button class="speak-btn" data-action="trSay" aria-label="Wort anhören">🔊</button>' +
      '<input type="text" class="answer-input" id="trInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="…">' +
      '<button class="btn big block" data-action="trType">Fertig ✓</button>' +
      '<p class="muted small">Denk an groß und klein!</p>';
  } else {
    if (!tr.revealed) {
      html += '<p class="prompt">Hör zu und schreib das Wort auf dein Papier.</p>' +
        '<button class="speak-btn" data-action="trSay" aria-label="Wort anhören">🔊</button>' +
        '<button class="btn big block" data-action="trReveal">Geschrieben – zeig mir das Wort 👀</button>';
    } else {
      html += '<p class="prompt">Vergleiche Buchstabe für Buchstabe:</p>' +
        '<div class="card soft"><div style="font-size:2.6rem;font-weight:800;color:#2e1850">' + F.esc(q.w.wort) + '</div></div>' +
        (q.w.tipp ? '<p>💡 ' + F.esc(q.w.tipp) + '</p>' : '') +
        '<div class="btn-row"><button class="btn big gut" data-action="trSelf" data-ok="1">Hatte ich richtig ✓</button>' +
        '<button class="btn big light" data-action="trSelf" data-ok="0">Übe ich nochmal</button></div>';
    }
  }
  html += '</div>';
  if (!(q.typ === 'papier' && tr.revealed)) F.afterRender = function () { F.speech.speak(q.w.wort); };
  if (q.typ === 'tippen') setTimeout(function () { var i = F.$('#trInput'); if (i) i.focus(); }, 500);
  return html;
};

F.actions.trSay = function () { F.speech.speak(F.tr.queue[F.tr.idx].w.wort); };
F.actions.trReveal = function () { F.tr.revealed = true; F.render(); };

F.trAnswer = function (ok, extra) {
  var tr = F.tr;
  var q = tr.queue[tr.idx];
  var w = q.w;
  if (ok) {
    if (!q.retry) tr.firstTry++;
    tr.fbHtml = '<div class="big-emoji pop">' + F.rand(['⚽', '🥊', '🦊', '🐶', '⭐']) + '</div>' +
      '<div class="feedback gut"><span class="fb-title">' + F.rand(F.LOB) + '</span>' +
      '<span class="fb-word">' + F.esc(w.wort) + '</span></div>';
  } else {
    tr.fbHtml = '<div class="feedback fast"><span class="fb-title">' + F.esc(extra || F.rand(F.FAST)) + '</span>' +
      (q.given ? '<div class="small">Du hast: <span style="text-decoration:line-through">' + F.esc(q.given) + '</span></div>' : '') +
      '<span class="fb-word">' + (q.given ? F.spell.diffHtml(q.given, w.wort) : F.esc(w.wort)) + '</span>' +
      (w.tipp ? '<div>💡 ' + F.esc(w.tipp) + '</div>' : '') +
      '<div class="small mt">Das Wort kommt am Ende nochmal – dann klappt es bestimmt!</div></div>' +
      '<button class="btn light small" data-action="trSay">🔊 Nochmal hören</button>';
    if (!q.retry) tr.queue.push({ w: w, typ: 'waehlen', retry: true });
  }
  // Übungsliste aktualisieren
  if (!q.retry) {
    F.state.trainWords.forEach(function (t, i) {
      if (t.wort !== w.wort) return;
      if (ok) t.richtigInFolge = (t.richtigInFolge || 0) + 1; else t.richtigInFolge = 0;
    });
    var before = F.state.trainWords.length;
    F.state.trainWords = F.state.trainWords.filter(function (t) { return (t.richtigInFolge || 0) < 3; });
    tr.mastered += before - F.state.trainWords.length;
    F.save();
  }
  tr.state = 'feedback';
  F.render();
};

F.actions.trPick = function (el) {
  var q = F.tr.queue[F.tr.idx];
  var v = el.getAttribute('data-val');
  q.given = v === q.w.wort ? '' : v;
  F.trAnswer(v === q.w.wort);
};
F.actions.trType = function () {
  var q = F.tr.queue[F.tr.idx];
  var v = F.spell.norm(F.$('#trInput').value);
  if (!v) { F.toast('Tippe das Wort ein 🙂'); return; }
  var ok = v === q.w.wort;
  q.given = ok ? '' : v;
  var extra = '';
  if (!ok && v.toLowerCase() === q.w.wort.toLowerCase()) extra = 'Fast! Nur groß oder klein ist anders:';
  F.trAnswer(ok, extra);
};
F.actions.trSelf = function (el) {
  var q = F.tr.queue[F.tr.idx];
  q.given = '';
  F.trAnswer(el.getAttribute('data-ok') === '1', 'Gut, dass du so ehrlich geprüft hast! Schau nochmal:');
};
F.actions.trNext = function () {
  var tr = F.tr;
  F.hideToast();
  tr.idx++;
  tr.state = 'frage';
  tr.revealed = false;
  if (tr.idx >= tr.queue.length) {
    var p = tr.p;
    F.tr = null;
    F.finishRound({
      titel: 'Training geschafft!',
      text: tr.firstTry + ' von ' + tr.total + ' Wörtern gleich beim ersten Mal richtig.' +
        (tr.mastered ? ' 🌟 ' + tr.mastered + (tr.mastered === 1 ? ' Wort hast du' : ' Wörter hast du') + ' jetzt richtig drauf!' : ''),
      tore: tr.firstTry + 2,
      again: { view: 'trainSetup', params: { source: p.source, id: p.id } }
    });
    return;
  }
  F.render();
};

/* Enter-Taste im Eingabefeld = Fertig */
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'trInput') { ev.preventDefault(); F.actions.trType(); }
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'lpInput') { ev.preventDefault(); if (F.actions.lpType) F.actions.lpType(); }
});
