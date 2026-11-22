/* Mathe: Zahlen bis 1000 – mit Hunderter-Platten, Zehner-Stangen und Einer-Würfeln.
   Läuft komplett ohne KI und ohne Internet. */

F.mathe = {};

F.mathe.blocksHtml = function (n) {
  var h = Math.floor(n / 100), z = Math.floor((n % 100) / 10), e = n % 10;
  var rep = function (cls, k) { var s = ''; for (var i = 0; i < k; i++) s += '<div class="' + cls + '"></div>'; return s; };
  return '<div class="blocks">' +
    (h ? '<div class="blk-group">' + rep('h-block', h) + '</div>' : '') +
    (z ? '<div class="blk-group">' + rep('z-block', z) + '</div>' : '') +
    (e ? '<div class="blk-group" style="max-width:90px">' + rep('e-block', e) + '</div>' : '') +
    '</div>';
};
F.mathe.tafelHtml = function (n, hide) {
  var h = Math.floor(n / 100), z = Math.floor((n % 100) / 10), e = n % 10;
  var cell = function (cls, v) { return '<td class="' + cls + '">' + (hide ? '' : v) + '</td>'; };
  return '<table class="stellentafel"><tr><th class="H">H</th><th class="Z">Z</th><th class="E">E</th></tr>' +
    '<tr>' + cell('H', h) + cell('Z', z) + cell('E', e) + '</tr></table>';
};
F.mathe.hze = function (n) { return { h: Math.floor(n / 100), z: Math.floor((n % 100) / 10), e: n % 10 }; };
F.mathe.randNum = function () {
  var n = F.randInt(101, 989);
  // manchmal eine 0 als Platzhalter einbauen
  var r = Math.random();
  if (r < 0.15) n = Math.floor(n / 100) * 100 + (n % 10);
  else if (r < 0.25) n = Math.floor(n / 10) * 10;
  return n;
};

F.mathe.TYPES = [
  { id: 'stellen', name: 'Zahlen bauen', emoji: '🧱', sub: 'Platten, Stangen und Würfel zählen' },
  { id: 'stelle', name: 'H, Z und E', emoji: '🧮', sub: 'Stellenwert-Tafel' },
  { id: 'nachbar', name: 'Nachbarzahlen', emoji: '👣', sub: 'Vorgänger, Nachfolger, Nachbarzehner' },
  { id: 'vergleich', name: 'Größer oder kleiner?', emoji: '🐊', sub: '<, > oder =' },
  { id: 'rechnen', name: 'Rechnen bis 1000', emoji: '➕', sub: 'Mit Hundertern und Zehnern' }
];

F.mathe.make = function (typ) {
  var n, d, t;
  if (typ === 'mix') typ = F.rand(['stellen', 'stelle', 'nachbar', 'vergleich', 'rechnen']);
  if (typ === 'stellen') {
    n = F.mathe.randNum(); d = F.mathe.hze(n);
    if (Math.random() < 0.6) {
      return { typ: typ, frage: 'Welche Zahl ist das?', bild: F.mathe.blocksHtml(n), antwort: String(n), eingabe: 'zahl',
        hilfe: 'Zähle zuerst die großen Platten (Hunderter), dann die Stangen (Zehner), dann die kleinen Würfel (Einer).' + F.mathe.tafelHtml(n, true),
        erklaerung: d.h + ' Hunderter, ' + d.z + ' Zehner, ' + d.e + ' Einer → ' + n + F.mathe.tafelHtml(n) };
    }
    return { typ: typ, frage: 'Welche Zahl hat ' + d.h + ' Hunderter, ' + d.z + ' Zehner und ' + d.e + ' Einer?', bild: '', antwort: String(n), eingabe: 'zahl',
      hilfe: 'Trag die Ziffern in die Stellenwert-Tafel ein: H – Z – E.' + (d.z === 0 || d.e === 0 ? ' Denk an die 0 als Platzhalter!' : ''),
      erklaerung: d.h * 100 + ' + ' + d.z * 10 + ' + ' + d.e + ' = ' + n + F.mathe.tafelHtml(n) };
  }
  if (typ === 'stelle') {
    n = F.mathe.randNum(); d = F.mathe.hze(n);
    var which = F.rand([['Hunderter', d.h], ['Zehner', d.z], ['Einer', d.e]]);
    return { typ: typ, frage: 'Wie viele ' + which[0] + ' hat die Zahl ' + n + '?', bild: '', antwort: String(which[1]), eingabe: 'zahl',
      hilfe: 'Schreib die Zahl in die Tafel: Die erste Ziffer sind die Hunderter, dann Zehner, dann Einer.' + F.mathe.tafelHtml(n, true),
      erklaerung: n + ' hat ' + d.h + ' H, ' + d.z + ' Z und ' + d.e + ' E.' + F.mathe.tafelHtml(n) };
  }
  if (typ === 'nachbar') {
    var kind = F.rand(['vor', 'nach', 'zehner', 'hunderter']);
    n = F.randInt(101, 989);
    if (kind === 'vor') {
      if (Math.random() < 0.5) n = Math.floor(n / 10) * 10; // knifflig: 470 → 469
      return { typ: typ, frage: 'Was ist der Vorgänger von ' + n + '?', bild: '', antwort: String(n - 1), eingabe: 'zahl',
        hilfe: 'Der Vorgänger ist 1 weniger. Rechne: ' + n + ' − 1', erklaerung: n + ' − 1 = ' + (n - 1) };
    }
    if (kind === 'nach') {
      if (Math.random() < 0.5) n = Math.floor(n / 10) * 10 + 9; // knifflig: 399 → 400
      return { typ: typ, frage: 'Was ist der Nachfolger von ' + n + '?', bild: '', antwort: String(n + 1), eingabe: 'zahl',
        hilfe: 'Der Nachfolger ist 1 mehr. Rechne: ' + n + ' + 1', erklaerung: n + ' + 1 = ' + (n + 1) };
    }
    if (n % 10 === 0) n += F.randInt(1, 9);
    if (kind === 'zehner') {
      var lo = Math.floor(n / 10) * 10;
      return { typ: typ, frage: 'Welcher Zehner kommt nach ' + n + '?  (' + lo + ' < ' + n + ' < ?)', bild: '', antwort: String(lo + 10), eingabe: 'zahl',
        hilfe: 'Zehnerzahlen enden mit 0. Welche ist die nächste nach ' + lo + '?', erklaerung: lo + ' < ' + n + ' < ' + (lo + 10) };
    }
    var lo2 = Math.floor(n / 100) * 100;
    return { typ: typ, frage: 'Welcher Hunderter kommt nach ' + n + '?  (' + lo2 + ' < ' + n + ' < ?)', bild: '', antwort: String(lo2 + 100), eingabe: 'zahl',
      hilfe: 'Hunderterzahlen enden mit 00. Welche ist die nächste nach ' + lo2 + '?', erklaerung: lo2 + ' < ' + n + ' < ' + (lo2 + 100) };
  }
  if (typ === 'vergleich') {
    var a = F.randInt(100, 999), b;
    var r = Math.random();
    if (r < 0.35) { var da = F.mathe.hze(a); b = da.h * 100 + da.e * 10 + da.z; }       // Zehner/Einer vertauscht
    else if (r < 0.55) b = a;
    else if (r < 0.75) b = a + F.rand([-10, 10, -1, 1, 100, -100]);
    else b = F.randInt(100, 999);
    if (b < 100 || b > 999) b = a;
    var ans = a > b ? '>' : a < b ? '<' : '=';
    var A = F.mathe.hze(a), B = F.mathe.hze(b);
    var why = a === b ? 'Beide Zahlen sind gleich.' :
      A.h !== B.h ? 'Vergleiche die Hunderter: ' + A.h + ' H und ' + B.h + ' H.' :
      A.z !== B.z ? 'Die Hunderter sind gleich. Vergleiche die Zehner: ' + A.z + ' Z und ' + B.z + ' Z.' :
      'Hunderter und Zehner sind gleich. Vergleiche die Einer: ' + A.e + ' E und ' + B.e + ' E.';
    return { typ: typ, frage: 'Welches Zeichen passt?', bild: '<div style="font-size:2.6rem;font-weight:800;color:#2e1850;margin-bottom:14px">' + a + ' &nbsp;☐&nbsp; ' + b + '</div>',
      antwort: ans, eingabe: 'auswahl', optionen: ['<', '>', '='],
      hilfe: 'Vergleiche zuerst die Hunderter, dann die Zehner, dann die Einer. Das Krokodil 🐊 frisst die größere Zahl.',
      erklaerung: why + ' Also: ' + a + ' ' + ans + ' ' + b };
  }
  // rechnen
  var art = F.rand(['hh+', 'hh-', 'hz+z', 'hz-z', 'zerlegt', 'hze+e']);
  var x, y, res, steps;
  if (art === 'hh+') { x = F.randInt(1, 8) * 100; y = F.randInt(1, (1000 - x) / 100) * 100; res = x + y; t = x + ' + ' + y;
    steps = 'Rechne ' + x / 100 + ' + ' + y / 100 + ' = ' + res / 100 + ' und hänge zwei Nullen an: ' + res; }
  else if (art === 'hh-') { x = F.randInt(3, 9) * 100; y = F.randInt(1, x / 100 - 1) * 100; res = x - y; t = x + ' − ' + y;
    steps = 'Rechne ' + x / 100 + ' − ' + y / 100 + ' = ' + res / 100 + ' und hänge zwei Nullen an: ' + res; }
  else if (art === 'hz+z') { var hz = F.randInt(1, 9) * 100 + F.randInt(1, 7) * 10; y = F.randInt(1, 9 - (hz % 100) / 10) * 10; x = hz; res = x + y; t = x + ' + ' + y;
    steps = 'Die Hunderter bleiben. Zehner: ' + (x % 100) / 10 + ' Z + ' + y / 10 + ' Z = ' + ((x % 100) + y) / 10 + ' Z → ' + res; }
  else if (art === 'hz-z') { x = F.randInt(1, 9) * 100 + F.randInt(3, 9) * 10; y = F.randInt(1, (x % 100) / 10 - 1) * 10; res = x - y; t = x + ' − ' + y;
    steps = 'Die Hunderter bleiben. Zehner: ' + (x % 100) / 10 + ' Z − ' + y / 10 + ' Z = ' + ((x % 100) - y) / 10 + ' Z → ' + res; }
  else if (art === 'zerlegt') { var h = F.randInt(1, 9), z = F.randInt(0, 9), e = F.randInt(1, 9); res = h * 100 + z * 10 + e;
    t = h * 100 + ' + ' + z * 10 + ' + ' + e; if (z === 0) t = h * 100 + ' + ' + e;
    steps = 'Schreib die Ziffern in die Tafel: ' + h + ' H, ' + z + ' Z, ' + e + ' E → ' + res; }
  else { x = F.randInt(1, 9) * 100 + F.randInt(0, 9) * 10 + F.randInt(0, 6); y = F.randInt(1, 9 - x % 10); res = x + y; t = x + ' + ' + y;
    steps = 'Nur die Einer ändern sich: ' + x % 10 + ' + ' + y + ' = ' + (x % 10 + y) + ' → ' + res; }
  return { typ: 'rechnen', frage: 'Rechne:', bild: '<div style="font-size:2.6rem;font-weight:800;color:#2e1850;margin-bottom:10px">' + t + ' = ?</div>',
    antwort: String(res), eingabe: 'zahl',
    hilfe: 'Denk an Hunderter, Zehner und Einer. Rechne erst mit den kleinen Zahlen.',
    erklaerung: steps };
};

F.views.matheHome = function () {
  var items = F.mathe.TYPES.map(function (t) {
    return '<button class="list-item" data-action="startMathe" data-typ="' + t.id + '">' +
      '<span class="li-emoji">' + t.emoji + '</span><span class="li-main"><span class="li-title">' + t.name + '</span>' +
      '<span class="li-sub">' + t.sub + '</span></span><span class="li-arrow">›</span></button>';
  }).join('');
  return F.topbar('Mathe: Zahlen bis 1000', { home: true }) +
    '<button class="tile wichtig wide mb" data-action="startMathe" data-typ="mix">' +
    '<span class="emoji">🎯</span><span class="label">Trainingseinheit: gemischt</span><span class="sub">6 Aufgaben von allem etwas</span></button>' +
    items +
    '<div class="card soft mt"><p>📷 Neue Mathe-Themen aus der Schule? Unter <b>„Üben mit Fotos“</b> macht ' + F.esc(F.fox()) + ' Aufgaben aus deinen Arbeitsblättern.</p></div>';
};

F.actions.startMathe = function (el) {
  var typ = el.getAttribute('data-typ');
  var list = [];
  for (var i = 0; i < 6; i++) list.push(F.mathe.make(typ));
  F.mt = { typ: typ, list: list, idx: 0, richtig: 0, tries: 0, input: '', state: 'frage', hint: false };
  F.go('mathePlay', {});
};

F.views.mathePlay = function () {
  var mt = F.mt;
  if (!mt) { setTimeout(F.back, 0); return ''; }
  var q = mt.list[mt.idx];
  var dots = mt.list.map(function (x, i) { return '<span class="' + (i < mt.idx ? 'done' : i === mt.idx ? 'now' : '') + '"></span>'; }).join('');
  var html = F.topbar('Mathe', { home: true }) + '<div class="dots">' + dots + '</div><div class="stage">';
  if (mt.state === 'feedback') return html + mt.fbHtml + '<button class="btn big block gut" data-action="mtNext">Weiter ›</button></div>';
  html += '<p class="prompt">' + F.esc(q.frage) + '</p>' + q.bild;
  if (q.eingabe === 'auswahl') {
    html += '<div class="btn-row" style="justify-content:center">' + q.optionen.map(function (o) {
      return '<button class="option" style="flex:0 0 110px;margin:0 8px 12px;font-size:2.4rem" data-action="mtPick" data-val="' + F.esc(o) + '">' + F.esc(o) + '</button>';
    }).join('') + '</div>';
  } else {
    html += '<div class="num-display" id="mtDisplay">' + F.esc(mt.input || '') + '&nbsp;</div>' +
      '<div class="keypad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<button data-action="mtKey" data-k="' + k + '">' + k + '</button>'; }).join('') +
      '<button data-action="mtKey" data-k="del" aria-label="Löschen">⌫</button><button data-action="mtKey" data-k="0">0</button>' +
      '<button class="ok" data-action="mtKey" data-k="ok" aria-label="Fertig">✓</button></div>';
  }
  if (mt.hint) html += '<div class="feedback fast"><span class="fb-title">💡 Tipp</span>' + q.hilfe + '</div>';
  else html += '<button class="btn light small" data-action="mtHint">💡 Tipp</button>';
  return html + '</div>';
};
F.actions.mtHint = function () { F.mt.hint = true; F.render(); };
F.actions.mtKey = function (el) {
  var mt = F.mt, k = el.getAttribute('data-k');
  if (k === 'del') mt.input = mt.input.slice(0, -1);
  else if (k === 'ok') { if (mt.input) F.mtAnswer(mt.input); return; }
  else if (mt.input.length < 4) mt.input += k;
  var d = F.$('#mtDisplay');
  if (d) d.innerHTML = F.esc(mt.input) + '&nbsp;';
};
F.actions.mtPick = function (el) { F.mtAnswer(el.getAttribute('data-val')); };

F.mtAnswer = function (val) {
  var mt = F.mt, q = mt.list[mt.idx];
  if (String(val) === q.antwort) {
    if (mt.tries === 0) mt.richtig++;
    mt.fbHtml = '<div class="big-emoji pop">' + F.rand(['⚽', '🥊', '🦊', '🐶', '⭐', '🤾‍♀️']) + '</div>' +
      '<div class="feedback gut"><span class="fb-title">' + F.rand(F.LOB) + '</span><span class="fb-word">' + F.esc(q.antwort) + '</span></div>';
    mt.state = 'feedback';
  } else if (mt.tries === 0) {
    mt.tries = 1; mt.hint = true; mt.input = '';
    F.toast('Fast! Schau dir den Tipp an und probier es nochmal 🦊', 3200);
  } else {
    mt.fbHtml = '<div class="feedback fast"><span class="fb-title">' + F.rand(F.FAST) + '</span>' +
      '<span class="fb-word">' + F.esc(q.antwort) + '</span><div>' + q.erklaerung + '</div></div>';
    mt.state = 'feedback';
  }
  F.render();
};
F.actions.mtNext = function () {
  var mt = F.mt;
  mt.idx++; mt.tries = 0; mt.input = ''; mt.hint = false; mt.state = 'frage';
  if (mt.idx >= mt.list.length) {
    F.mt = null;
    F.state.mathe.geloest = (F.state.mathe.geloest || 0) + mt.richtig;
    F.finishRound({
      titel: 'Mathe-Training geschafft!',
      text: mt.richtig + ' von ' + mt.list.length + ' gleich beim ersten Mal richtig.',
      tore: mt.richtig + 2,
      again: { view: 'matheAgain', params: { typ: mt.typ } }
    });
    return;
  }
  F.render();
};
/* "Noch eine Runde" startet direkt eine neue Mathe-Runde */
F.views.matheAgain = function (p) {
  setTimeout(function () {
    var list = [];
    for (var i = 0; i < 6; i++) list.push(F.mathe.make(p.typ));
    F.mt = { typ: p.typ, list: list, idx: 0, richtig: 0, tries: 0, input: '', state: 'frage', hint: false };
    F.go('mathePlay', {}, { replace: true });
  }, 0);
  return '';
};
