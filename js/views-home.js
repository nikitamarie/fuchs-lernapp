/* Begrüßung (Fuchs benennen) und Startseite */

F.views.welcome = function (p) {
  var step = p.step || 1;
  if (step === 1) {
    return '<div class="celebrate"><div class="big pop">🦊</div>' +
      '<h1>Hallo! Ich bin dein Lern-Fuchs.</h1>' +
      '<p style="font-size:1.2rem">Ich helfe dir beim Üben – für Diktate, Mathe und alles andere aus der Fuchsklasse.</p>' +
      '<p style="font-size:1.2rem"><b>Aber ich habe noch keinen Namen!</b> Wie soll ich heißen?</p></div>' +
      '<div class="card"><label class="field"><span>Name für deinen Fuchs</span>' +
      '<input type="text" id="foxName" maxlength="20" autocomplete="off" placeholder="z. B. Flitzi"></label>' +
      '<label class="field"><span>Und wie heißt du? <span class="muted small">(darfst du auch leer lassen)</span></span>' +
      '<input type="text" id="kidName" maxlength="20" autocomplete="off"></label>' +
      '<button class="btn big block fuchs" data-action="saveNames">Los geht’s! 🐾</button></div>';
  }
  return '';
};

F.actions.saveNames = function () {
  var fox = F.$('#foxName').value.trim();
  if (!fox) { F.toast('Gib deinem Fuchs einen Namen 🦊'); return; }
  F.state.profile.foxName = fox;
  F.state.profile.kidName = F.$('#kidName').value.trim();
  F.save();
  F.speech.speak('Juhu! Ich heiße jetzt ' + fox + '!');
  F.home();
};

F.nextExams = function () {
  return F.state.exams
    .filter(function (e) { return F.daysUntil(e.datum) >= 0; })
    .sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
};

F.countdownHtml = function () {
  var ex = F.nextExams().slice(0, 2);
  return ex.map(function (e) {
    var d = F.daysUntil(e.datum);
    var when = d === 0 ? 'heute' : d === 1 ? 'morgen' : 'in ' + d + ' Tagen';
    var subj = F.subject(e.fach);
    var n = (e.themen || []).length;
    return '<button class="countdown" style="width:100%;border:none;font:inherit;text-align:left;cursor:pointer" data-action="go" data-view="examDetail" data-params="' +
      F.esc(JSON.stringify({ id: e.id })) + '"><span class="cd-emoji">' + subj.emoji + '</span><span style="flex:1">' +
      F.esc(e.titel || subj.name) + ' ist <b>' + when + '</b> (' + F.formatDate(e.datum) + ').' +
      (d <= 1 ? ' Du schaffst das! 💪' : ' Jeden Tag ein bisschen üben!') +
      (n ? '' : ' <span style="font-weight:600">→ Themen eintragen</span>') + '</span><span class="li-arrow">›</span></button>';
  }).join('');
};

F.views.trophies = function () {
  var sn = F.streakNow ? F.streakNow() : 0, best = (F.state.streak && F.state.streak.best) || 0;
  var cards = F.SUBJECTS.map(function (sb) {
    var bp = F.beltProgress(sb.id);
    return '<div class="fach-belt"><div class="fb-head"><span class="fb-e">' + sb.emoji + '</span><b>' + F.esc(sb.name) + '</b>' +
      '<span class="fb-t">⚽ ' + bp.tore + '</span></div>' + F.beltHtml(bp.tore) +
      '<div class="bar"><i style="width:' + bp.pct + '%"></i></div>' +
      '<span class="muted small">Noch ' + bp.fehlt + ' Tore bis zum ' + F.esc(F.beltDativ(bp.next.name)) + '</span></div>';
  }).join('');
  var ladder = F.BELTS.map(function (b) {
    return '<div class="ladder-row"><span class="belt" style="background:' + b.color + ';color:' + b.text + ';border-color:#ddd">' + F.esc(b.name) + '</span><span class="muted small">ab ' + b.min + ' Tore</span></div>';
  }).join('') + '<div class="ladder-row"><span class="belt" style="background:#222;color:#fff">Schwarzer Gürtel · 1. Dan, 2. Dan …</span><span class="muted small">alle ' + F.DAN_STEP + ' Tore eine Stufe mehr</span></div>';
  return F.topbar('🏆 Erfolge', { noBack: true }) +
    '<div class="card center"><div style="font-size:2.6rem">🔥</div><h2>' + sn + (sn === 1 ? ' Tag' : ' Tage') + ' am Stück geübt</h2>' +
    '<p class="muted small">Dein Rekord: ' + best + (best === 1 ? ' Tag' : ' Tage') + '. Jeden Tag eine kleine Runde reicht! · Zusammen: ⚽ ' + F.state.tore + ' Tore</p></div>' +
    '<h2>🥋 Meine Gürtel – für jedes Fach</h2><div class="fach-grid">' + cards + '</div>' +
    '<p class="small muted">Tore gibt es für jede richtig gelöste Aufgabe, jedes Diktat (Deutsch) und jede hochgeladene Klassenarbeit – immer in dem Fach, in dem du übst. ' +
    'Fächer auswählen: ⚙️ Mehr → Meine Fächer.</p>' +
    (F.awardShelfHtml ? F.awardShelfHtml() : '') +
    '<details class="card mt"><summary>🥋 Alle Gürtel und wie viele Tore man braucht</summary><div class="mt">' + ladder + '</div></details>';
};
