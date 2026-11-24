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
  var t = F.state.tore;
  var rows = F.BELTS.map(function (b) {
    var have = t >= b.min;
    return '<div class="list-item" style="cursor:default;opacity:' + (have ? 1 : 0.5) + '">' +
      '<span class="li-emoji">' + (have ? '🥋' : '🔒') + '</span>' +
      '<span class="li-main"><span class="li-title"><span class="belt" style="background:' + b.color + ';color:' + b.text + ';border-color:#ddd">' + F.esc(b.name) + '</span></span>' +
      '<span class="li-sub">' + (have ? 'Geschafft!' : 'ab ' + b.min + ' Tore') + '</span></span></div>';
  }).join('');
  var next = F.nextBelt(t);
  var sn = F.streakNow ? F.streakNow() : 0, best = (F.state.streak && F.state.streak.best) || 0;
  return F.topbar('🏆 Erfolge', { noBack: true }) +
    '<div class="card center"><div style="font-size:2.6rem">🔥</div><h2>' + sn + (sn === 1 ? ' Tag' : ' Tage') + ' am Stück geübt</h2>' +
    '<p class="muted small">Dein Rekord: ' + best + (best === 1 ? ' Tag' : ' Tage') + '. Jeden Tag eine kleine Runde reicht!</p></div>' +
    '<div class="card center"><div style="font-size:3.5rem">⚽</div><h1>' + t + ' Tore</h1>' +
    '<p>' + (next ? 'Noch ' + (next.min - t) + ' Tore bis zum ' + F.esc(F.beltDativ(next.name)) + '!' : 'Du hast den schwarzen Gürtel! Du bist eine echte Lern-Meisterin! 🦊') + '</p>' +
    '<p class="muted small">Tore bekommst du für jede geschaffte Aufgabe, jedes Diktat und jede hochgeladene Klassenarbeit.</p></div>' +
    (F.awardShelfHtml ? F.awardShelfHtml() : '') + '<h2 class="mt">🥋 Meine Gürtel</h2>' + rows;
};
