/* Mathe-Aufgaben wie in einer echten Mathearbeit:
   - "rechnung":    345 + 230 = ☐   (Lücke kann auch vorne/in der Mitte sein: 345 + ☐ = 575)
   - "paeckchen":   mehrere Rechnungen untereinander
   - "schriftlich": schriftlich rechnen in Spalten (H Z E), optional Zahlen selbst untereinander schreiben
   - "sachaufgabe": Text lesen, Rechnung aufschreiben, Ergebnis + Antwortsatz
   Eingabe über eine eigene große Zahlen-Tastatur (keine iPad-Tastatur nötig).
   Die App rechnet jede Lösung selbst nach, damit keine falschen KI-Lösungen durchrutschen. */
F.mtask = {};
F.mtask.TYPES = ['rechnung', 'paeckchen', 'schriftlich', 'sachaufgabe'];
F.mtask.isMath = function (a) { return a && F.mtask.TYPES.indexOf(a.typ) >= 0; };

/* ---------------- Rechnen & Prüfen ---------------- */
/* Rechenzeichen vereinheitlichen: + − · : */
F.mtask.normOps = function (s) {
  return String(s == null ? '' : s)
    .replace(/[×xX*]/g, '·').replace(/[÷\/]/g, ':')
    .replace(/[–—-]/g, '−')
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')       // 1.000 → 1000
    .replace(/_+|□|☐|\?{1,3}|…|\.\.\./g, '_')
    .replace(/\s+/g, ' ').trim();
};
/* Zahl aus Text holen ("20 €" → 20, "1.000" → 1000) */
F.mtask.num = function (s) {
  var t = String(s == null ? '' : s).replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2').replace(',', '.');
  var m = t.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
/* kleiner, sicherer Rechner für + − · : und Klammern */
F.mtask.evalExpr = function (str) {
  var s = F.mtask.normOps(str).replace(/\s/g, '');
  if (!s || /[^0-9+−·:().,]/.test(s)) return NaN;
  var pos = 0;
  var peek = function () { return s.charAt(pos); };
  var number = function () {
    var st = pos;
    while (/[0-9.,]/.test(peek())) pos++;
    if (st === pos) return NaN;
    return parseFloat(s.slice(st, pos).replace(',', '.'));
  };
  var factor = function () {
    if (peek() === '(') { pos++; var v = expr(); if (peek() === ')') pos++; else return NaN; return v; }
    if (peek() === '−') { pos++; return -factor(); }
    return number();
  };
  var term = function () {
    var v = factor();
    while (peek() === '·' || peek() === ':') {
      var op = s.charAt(pos++);
      var r = factor();
      v = op === '·' ? v * r : (r === 0 ? NaN : v / r);
    }
    return v;
  };
  var expr = function () {
    var v = term();
    while (peek() === '+' || peek() === '−') {
      var op = s.charAt(pos++);
      var r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  var res = expr();
  if (pos !== s.length) return NaN;
  return Math.round(res * 1000) / 1000;
};
/* Gleichung mit einer Lücke: stimmt sie, wenn man "wert" einsetzt? */
F.mtask.fits = function (aufgabe, wert) {
  var t = F.mtask.normOps(aufgabe);
  if (t.indexOf('_') < 0 || String(wert).trim() === '') return false;
  var filled = t.replace('_', '(' + String(wert).trim() + ')');
  var sides = filled.split('=');
  if (sides.length !== 2) return false;
  var l = F.mtask.evalExpr(sides[0]), r = F.mtask.evalExpr(sides[1]);
  return !isNaN(l) && !isNaN(r) && Math.abs(l - r) < 1e-9;
};
/* Lücke ausrechnen */
F.mtask.solve = function (aufgabe) {
  var t = F.mtask.normOps(aufgabe);
  var sides = t.split('=');
  if (sides.length !== 2 || t.split('_').length !== 2) return null;
  if (sides[1].trim() === '_') { var v = F.mtask.evalExpr(sides[0]); return isNaN(v) ? null : String(v); }
  if (sides[0].trim() === '_') { var v2 = F.mtask.evalExpr(sides[1]); return isNaN(v2) ? null : String(v2); }
  for (var i = 0; i <= 10000; i++) if (F.mtask.fits(t, i)) return String(i);
  return null;
};

/* ---------------- Aufgaben aus der KI prüfen und aufbereiten ---------------- */
F.mtask.steps = function (a) {
  var st = a.loesungsweg || a.schritte || a.erklaerung || [];
  if (typeof st === 'string') st = st.split(/\n+|(?:^|\s)(?=\d+\.\s)/);
  return st.map(function (x) { return String(x).replace(/^\s*\d+[.)]\s*/, '').trim(); }).filter(Boolean).slice(0, 8);
};
F.mtask.normalize = function (a) {
  if (!a || !a.typ) return null;
  var base = { typ: a.typ, frage: String(a.frage || ''), hilfe: String(a.hilfe || ''), loesungsweg: F.mtask.steps(a), thema: String(a.thema || '') };
  var fixRow = function (aufgabe, antwort) {
    var t = F.mtask.normOps(aufgabe);
    if (t.indexOf('_') < 0) {
      if (t.indexOf('=') < 0) t = t + ' = _';
      else return null;
    }
    if (t.split('_').length !== 2) return null;
    var ans = String(antwort == null ? '' : antwort).trim();
    if (!F.mtask.fits(t, F.mtask.num(ans))) {
      var solved = F.mtask.solve(t);
      if (solved == null) return null;      // nicht nachprüfbar → lieber weglassen
      ans = solved;
    } else ans = String(F.mtask.num(ans));
    return { aufgabe: t, antwort: ans };
  };
  if (a.typ === 'rechnung') {
    var r = fixRow(a.aufgabe || a.frage, a.antwort);
    if (!r) return null;
    base.aufgabe = r.aufgabe; base.antwort = r.antwort;
    if (!base.frage || base.frage === a.aufgabe) base.frage = 'Rechne.';
    return base;
  }
  if (a.typ === 'paeckchen') {
    var rows = (a.zeilen || a.aufgaben || []).map(function (z) {
      return typeof z === 'string' ? fixRow(z, null) : fixRow(z.aufgabe, z.antwort);
    }).filter(Boolean).slice(0, 6);
    if (!rows.length) return null;
    base.zeilen = rows;
    if (!base.frage) base.frage = 'Rechne das Päckchen.';
    return base;
  }
  if (a.typ === 'schriftlich') {
    var op = F.mtask.normOps(a.operator || a.rechenzeichen || '+') === '−' ? '−' : '+';
    var zahlen = (a.zahlen || []).map(function (z) { return String(Math.round(F.mtask.num(z))); })
      .filter(function (z) { return z !== 'NaN' && +z >= 0; }).slice(0, 3);
    if (zahlen.length < 2) return null;
    if (op === '−') zahlen = zahlen.slice(0, 2);
    var res = op === '+' ? zahlen.reduce(function (s, z) { return s + (+z); }, 0) : (+zahlen[0]) - (+zahlen[1]);
    if (res < 0 || res > 99999) return null;
    base.operator = op; base.zahlen = zahlen; base.antwort = String(res);
    base.aufschreiben = !!a.aufschreiben;
    if (!base.frage) base.frage = 'Rechne schriftlich.';
    if (!base.loesungsweg.length && op === '+') base.loesungsweg = F.mtask.addSteps(zahlen);
    return base;
  }
  if (a.typ === 'sachaufgabe') {
    if (!base.frage) return null;
    var rech = F.mtask.normOps(a.rechnung || '');
    var left = rech.split('=')[0];
    var v = F.mtask.evalExpr(left);
    var ans2 = F.mtask.num(a.antwort);
    if (!isNaN(v)) ans2 = v;
    if (isNaN(ans2)) return null;
    base.rechnung = isNaN(v) ? '' : left.trim() + ' = ' + v;
    base.antwort = String(ans2);
    base.einheit = String(a.einheit || '').slice(0, 12);
    base.antwortsatz = String(a.antwortsatz || '');
    return base;
  }
  return null;
};

/* Lösungsweg fürs schriftliche Addieren selbst erzeugen */
F.mtask.addSteps = function (zahlen) {
  var names = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender'];
  var len = Math.max.apply(null, zahlen.map(function (z) { return z.length; }));
  var carry = 0, steps = ['Schreibe die Zahlen genau untereinander: Einer unter Einer, Zehner unter Zehner, Hunderter unter Hunderter.'];
  for (var i = 0; i < len; i++) {
    var digits = zahlen.map(function (z) { var d = z.charAt(z.length - 1 - i); return d ? +d : 0; });
    var sum = digits.reduce(function (s, d) { return s + d; }, 0) + carry;
    var txt = (names[i] || 'Stelle') + ': ' + digits.join(' + ') + (carry ? ' + ' + carry + ' (Übertrag)' : '') + ' = ' + sum + '.';
    var last = i === len - 1;
    if (sum >= 10 && !last) txt += ' Schreibe ' + (sum % 10) + ' und merke dir ' + Math.floor(sum / 10) + ' als Übertrag.';
    else txt += ' Schreibe ' + sum + '.';
    steps.push(txt);
    carry = Math.floor(sum / 10);
  }
  var res = zahlen.reduce(function (s, z) { return s + (+z); }, 0);
  steps.push('Ergebnis: ' + zahlen.join(' + ') + ' = ' + res);
  return steps;
};

/* ---------------- Anzeige ---------------- */
F.mtask.field = function (st, key, cls) {
  var val = st.f[key] || '';
  var mark = st.marks && st.marks[key] ? ' ' + st.marks[key] : '';
  return '<button class="mfield ' + (cls || '') + (st.af === key ? ' on' : '') + mark + '" data-action="mfSel" data-k="' + key + '">' +
    (val ? F.esc(val) : '&nbsp;') + '</button>';
};
F.mtask.lineHtml = function (st, aufgabe, key) {
  var parts = aufgabe.split('_');
  return '<div class="mline">' + F.esc(parts[0]) + F.mtask.field(st, key, 'num') + F.esc(parts[1] || '') + '</div>';
};
F.mtask.cols = function (a) {
  return Math.max(a.antwort.length, Math.max.apply(null, a.zahlen.map(function (z) { return z.length; })));
};
F.mtask.gridHtml = function (a, st, solved) {
  var cols = F.mtask.cols(a);
  var html = '<table class="schriftlich"><tr><td></td>';
  var labels = ['E', 'Z', 'H', 'T', 'ZT'];
  for (var c = 0; c < cols; c++) html += '<th>' + (labels[cols - 1 - c] || '') + '</th>';
  html += '</tr>';
  a.zahlen.forEach(function (z, i) {
    var pad = new Array(cols - z.length + 1).join(' ') + z;
    html += '<tr><td class="op">' + (i === a.zahlen.length - 1 ? a.operator : '') + '</td>';
    for (var c2 = 0; c2 < cols; c2++) {
      if (a.aufschreiben && !solved) html += '<td>' + F.mtask.field(st, 'n' + i + '_' + c2, 'digit') + '</td>';
      else html += '<td class="d">' + F.esc(pad.charAt(c2).trim()) + '</td>';
    }
    html += '</tr>';
  });
  // Übertrag (klein, freiwillig)
  html += '<tr class="carry"><td class="op small muted">' + (solved ? '' : 'Ü') + '</td>';
  for (var c3 = 0; c3 < cols; c3++) html += '<td>' + (solved ? '' : F.mtask.field(st, 'u_' + c3, 'carry')) + '</td>';
  html += '</tr><tr class="result"><td class="op">=</td>';
  var resPad = new Array(cols - a.antwort.length + 1).join(' ') + a.antwort;
  for (var c4 = 0; c4 < cols; c4++) {
    if (solved) html += '<td class="d sol">' + F.esc(resPad.charAt(c4).trim()) + '</td>';
    else html += '<td>' + F.mtask.field(st, 'e_' + c4, 'digit') + '</td>';
  }
  return html + '</tr></table>';
};

F.mtask.keypadHtml = function (withOps) {
  var k = function (v, label, cls) { return '<button class="' + (cls || '') + '" data-action="mfKey" data-k="' + v + '">' + (label || v) + '</button>'; };
  var rows = withOps ?
    [k('7'), k('8'), k('9'), k('+', '+', 'opk'), k('4'), k('5'), k('6'), k('−', '−', 'opk'), k('1'), k('2'), k('3'), k('·', '·', 'opk'),
      k('del', '⌫'), k('0'), k('next', '→', 'opk'), k(':', ':', 'opk')] :
    [k('7'), k('8'), k('9'), k('4'), k('5'), k('6'), k('1'), k('2'), k('3'), k('del', '⌫'), k('0'), k('next', '→')];
  return '<div class="keypad ' + (withOps ? 'ops' : '') + '">' + rows.join('') + '</div>' +
    '<button class="btn big block gut" data-action="mfDone">Fertig ✓</button>';
};

/* erstes aktives Feld */
F.mtask.firstField = function (a) {
  if (a.typ === 'rechnung') return 'b';
  if (a.typ === 'paeckchen') return 'r0';
  if (a.typ === 'sachaufgabe') return 'rech';
  if (a.typ === 'schriftlich') return a.aufschreiben ? 'n0_0' : 'e_' + (F.mtask.cols(a) - 1);
  return null;
};
F.mtask.order = function (a) {
  if (a.typ === 'rechnung') return ['b'];
  if (a.typ === 'paeckchen') return a.zeilen.map(function (z, i) { return 'r' + i; });
  if (a.typ === 'sachaufgabe') return ['rech', 'erg'];
  var cols = F.mtask.cols(a), out = [];
  if (a.aufschreiben) a.zahlen.forEach(function (z, i) { for (var c = 0; c < cols; c++) out.push('n' + i + '_' + c); });
  for (var c2 = cols - 1; c2 >= 0; c2--) out.push('e_' + c2);   // Ergebnis von rechts nach links
  return out;
};

F.mtask.render = function (a, st) {
  if (st.af == null) st.af = F.mtask.firstField(a);
  var html = '<p class="prompt">' + F.esc(a.frage) + '</p>';
  if (a.typ === 'rechnung') html += F.mtask.lineHtml(st, a.aufgabe, 'b');
  if (a.typ === 'paeckchen') html += '<div class="paeckchen">' + a.zeilen.map(function (z, i) { return F.mtask.lineHtml(st, z.aufgabe, 'r' + i); }).join('') + '</div>';
  if (a.typ === 'schriftlich') {
    html += (a.aufschreiben ? '<p class="small"><b>Schreib die Zahlen ' + a.zahlen.join(' und ') + ' selbst untereinander</b> – Einer unter Einer! Dann rechne von rechts nach links.</p>' :
      '<p class="small muted">Rechne von rechts nach links: erst Einer, dann Zehner, dann Hunderter. Den Übertrag kannst du klein in die Ü-Zeile schreiben.</p>') +
      F.mtask.gridHtml(a, st, false);
  }
  if (a.typ === 'sachaufgabe') {
    html += '<div class="sach"><div class="sach-row"><span class="sach-lbl">Rechnung:</span>' + F.mtask.field(st, 'rech', 'wide') +
      '<span class="sach-eq">=</span>' + F.mtask.field(st, 'erg', 'num') + (a.einheit ? '<span class="sach-eq">' + F.esc(a.einheit) + '</span>' : '') + '</div>' +
      '<label class="field" style="text-align:left;margin-top:10px"><span>Antwort: <span class="muted small">(ganzer Satz)</span></span>' +
      '<input type="text" id="mfSatz" value="' + F.esc(st.satz || '') + '" autocomplete="off" placeholder="z. B. Sie hat … "></label></div>';
  }
  return html + F.mtask.keypadHtml(a.typ === 'sachaufgabe');
};

/* fertige Lösung zeigen */
F.mtask.solutionHtml = function (a) {
  var h = '';
  if (a.typ === 'rechnung') h = '<div class="mline sol">' + F.esc(a.aufgabe.replace('_', a.antwort)) + '</div>';
  if (a.typ === 'paeckchen') h = '<div class="paeckchen">' + a.zeilen.map(function (z) { return '<div class="mline sol">' + F.esc(z.aufgabe.replace('_', z.antwort)) + '</div>'; }).join('') + '</div>';
  if (a.typ === 'schriftlich') h = F.mtask.gridHtml(a, { f: {} }, true);
  if (a.typ === 'sachaufgabe') h = '<div class="card soft" style="text-align:left"><p><b>Rechnung:</b> ' + F.esc(a.rechnung || ('… = ' + a.antwort)) + (a.einheit ? ' ' + F.esc(a.einheit) : '') + '</p>' +
    (a.antwortsatz ? '<p style="margin:0"><b>Antwort:</b> ' + F.esc(a.antwortsatz) + '</p>' : '') + '</div>';
  return h;
};
F.mtask.stepsHtml = function (a) {
  if (!a.loesungsweg || !a.loesungsweg.length) return '';
  return '<div class="steps-box"><b>📘 So rechnest du:</b><ol>' + a.loesungsweg.map(function (s) { return '<li>' + F.esc(s) + '</li>'; }).join('') + '</ol></div>';
};

/* ---------------- Prüfen ---------------- */
F.mtask.check = function (a, st) {
  var f = st.f;
  st.marks = {};
  if (a.typ === 'rechnung') {
    var ok = F.mtask.fits(a.aufgabe, f.b || '');
    st.marks.b = ok ? 'ok' : 'no';
    return { ok: ok, empty: !f.b, given: a.aufgabe.replace('_', f.b || '?') };
  }
  if (a.typ === 'paeckchen') {
    var all = true, any = false, given = [];
    a.zeilen.forEach(function (z, i) {
      var v = f['r' + i] || '';
      if (v) any = true;
      var good = F.mtask.fits(z.aufgabe, v);
      st.marks['r' + i] = good ? 'ok' : 'no';
      if (!good) all = false;
      given.push(z.aufgabe.replace('_', v || '?'));
    });
    var n = a.zeilen.filter(function (z, i) { return st.marks['r' + i] === 'ok'; }).length;
    return { ok: all, empty: !any, given: given.join(' · '), msg: all ? '' : n + ' von ' + a.zeilen.length + ' stimmen schon. Schau dir die gelben nochmal an!' };
  }
  if (a.typ === 'schriftlich') {
    var cols = F.mtask.cols(a);
    var res = '';
    for (var c = 0; c < cols; c++) res += (f['e_' + c] || ' ');
    var resNum = res.replace(/\s/g, '');
    var msg = '';
    var placeOk = true;
    if (a.aufschreiben) {
      a.zahlen.forEach(function (z, i) {
        var pad = new Array(cols - z.length + 1).join(' ') + z, row = '';
        for (var c2 = 0; c2 < cols; c2++) row += (f['n' + i + '_' + c2] || ' ');
        var good = row === pad;
        for (var c3 = 0; c3 < cols; c3++) st.marks['n' + i + '_' + c3] = good ? 'ok' : (row.replace(/\s/g, '') === z ? 'no' : 'no');
        if (!good) {
          placeOk = false;
          msg = row.replace(/\s/g, '') === z ? 'Die Zahl ' + z + ' steht noch nicht richtig: Einer unter Einer, Zehner unter Zehner!' : 'Schreib die Zahl ' + z + ' genau ab.';
        }
      });
    }
    var resOk = resNum === a.antwort && /^\s*\d+$/.test(res);
    var resPad = new Array(cols - a.antwort.length + 1).join(' ') + a.antwort;
    for (var c4 = 0; c4 < cols; c4++) if (f['e_' + c4] || resPad.charAt(c4) !== ' ') st.marks['e_' + c4] = (f['e_' + c4] || ' ') === resPad.charAt(c4) ? 'ok' : 'no';
    if (!resOk && !msg) msg = 'Schau dir die gelben Stellen nochmal an. Hast du an den Übertrag gedacht?';
    return { ok: resOk && placeOk, empty: !resNum, given: a.zahlen.join(' ' + a.operator + ' ') + ' = ' + (resNum || '?'), msg: msg };
  }
  if (a.typ === 'sachaufgabe') {
    var erg = F.mtask.num(f.erg);
    var rech = f.rech || '';
    var ergOk = !isNaN(erg) && Math.abs(erg - (+a.antwort)) < 1e-9;
    var rv = F.mtask.evalExpr(rech.split('=')[0]);
    var rechOk = !isNaN(rv) && Math.abs(rv - (+a.antwort)) < 1e-9 && /[+−·:]/.test(F.mtask.normOps(rech));
    st.marks.erg = ergOk ? 'ok' : 'no';
    st.marks.rech = rechOk ? 'ok' : 'no';
    var m2 = '';
    if (!rech) m2 = 'Schreib auch die Rechnung auf – so wie in der Mathearbeit!';
    else if (isNaN(rv)) m2 = 'Deine Rechnung kann ich nicht lesen. Benutze die Zeichen + − · : auf der Tastatur.';
    else if (!rechOk) m2 = 'Deine Rechnung ergibt ' + rv + '. Lies die Aufgabe nochmal: Welche Zahlen brauchst du?';
    else if (!ergOk) m2 = 'Die Rechnung stimmt! Rechne sie nochmal genau aus.';
    var satz = st.satz || '';
    var satzHint = rechOk && ergOk && satz && isNaN(F.mtask.num(satz)) ? ' Tipp: In den Antwortsatz gehört auch das Ergebnis.' : '';
    return { ok: ergOk && rechOk, empty: !rech && !f.erg, given: (rech || '?') + ' = ' + (f.erg || '?'), msg: m2, extra: satzHint, noSatz: !satz };
  }
  return { ok: false };
};

/* ---------------- Tastatur-Aktionen ---------------- */
F.mtask.updateField = function (key) {
  var st = F.lp;
  F.$$('.mfield').forEach(function (b) {
    var k = b.getAttribute('data-k');
    b.className = b.className.replace(/\s?\bon\b/g, '') + (k === st.af ? ' on' : '');
    if (k === key) b.innerHTML = st.f[k] ? F.esc(st.f[k]) : '&nbsp;';
  });
};
F.actions.mfSel = function (el) {
  F.lp.af = el.getAttribute('data-k');
  F.mtask.updateField(null);
};
F.actions.mfKey = function (el) {
  var st = F.lp, a = st.list[st.idx].a, k = el.getAttribute('data-k'), key = st.af;
  if (!key) return;
  var order = F.mtask.order(a);
  var isCell = /^(e_|n\d+_|u_)/.test(key);
  var cur = st.f[key] || '';
  if (k === 'del') { st.f[key] = cur.replace(/\s+$/, '').slice(0, -1).replace(/\s+$/, ''); F.mtask.updateField(key); return; }
  if (k === 'next') {
    var i = order.indexOf(key);
    st.af = order[(i + 1) % order.length] || key;
    F.mtask.updateField(null);
    return;
  }
  if (/[+−·:]/.test(k) && key !== 'rech') return;     // Rechenzeichen nur in der Rechnung
  if (isCell) {
    if (!/\d/.test(k)) return;
    st.f[key] = k;
    F.mtask.updateField(key);
    if (/^u_/.test(key)) return;
    var j = order.indexOf(key);
    if (j >= 0 && j + 1 < order.length) { st.af = order[j + 1]; F.mtask.updateField(null); }
    return;
  }
  var max = key === 'rech' ? 30 : 6;
  if (cur.length >= max) return;
  st.f[key] = key === 'rech' && /[+−·:]/.test(k) ? cur + ' ' + k + ' ' : cur + k;
  st.f[key] = st.f[key].replace(/\s+/g, ' ').replace(/^\s/, '');
  F.mtask.updateField(key);
};
document.addEventListener('input', function (ev) {
  if (ev.target && ev.target.id === 'mfSatz' && F.lp) F.lp.satz = ev.target.value;
});
