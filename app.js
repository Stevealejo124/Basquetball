(function() {
  "use strict";
  var T = window.LBJ;
  if (!T || !T.liga) return;

  var app = document.getElementById("app");
  var EQ = {};
  for (var i = 0; i < T.equipos.length; i++) { EQ[T.equipos[i].id] = T.equipos[i]; }
  
  var NJ = T.liga.totalJornadas;
  var CLAS = T.liga.clasifican;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) { return {"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]; }); }
  function dos2(n) { return String(n).padStart(2, "0"); }
  function esperar(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function fecha(iso) {
    var d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long" });
  }

  function escudo(id, grande) {
    var e = EQ[id];
    if (!e) return '<span class="escudo' + (grande ? " grande" : "") + '" style="background:#5a4a33">?</span>';
    return '<span class="escudo' + (grande ? " grande" : "") + '" style="background:radial-gradient(circle at 32% 28%,' + e.color + ',' + e.color2 + ')">' + esc(e.corto) + '</span>';
  }

  function calcularTabla() {
    var filas = [];
    for (var i = 0; i < T.equipos.length; i++) {
      filas.push({ id: T.equipos[i].id, nombre: T.equipos[i].nombre, pj: 0, g: 0, p: 0, pf: 0, pc: 0, forma: [] });
    }
    var por = {};
    for (var i = 0; i < filas.length; i++) { por[filas[i].id] = filas[i]; }

    for (var j = 0; j < T.jornadas.length; j++) {
      var parts = T.jornadas[j].partidos;
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        if (p.pl == null || p.pv == null) continue;
        var L = por[p.local], V = por[p.visita];
        L.pj++; V.pj++; L.pf += p.pl; L.pc += p.pv; V.pf += p.pv; V.pc += p.pl;
        if (p.pl > p.pv) { L.g++; V.p++; L.forma.push("G"); V.forma.push("P"); }
        else { V.g++; L.p++; V.forma.push("G"); L.forma.push("P"); }
      }
    }
    for (var i = 0; i < filas.length; i++) {
      filas[i].dif = filas[i].pf - filas[i].pc;
      filas[i].pts = filas[i].g * 2 + filas[i].p;
    }
    filas.sort(function(a, b) { return b.pts - a.pts || b.dif - a.dif || b.pf - a.pf; });
    return filas;
  }

  function jornadaActual() {
    var ult = 0;
    for (var j = 0; j < T.jornadas.length; j++) {
      var parts = T.jornadas[j].partidos;
      for (var k = 0; k < parts.length; k++) {
        if (parts[k].pl != null) ult = Math.max(ult, T.jornadas[j].numero);
      }
    }
    return ult;
  }

  var JA = jornadaActual();
  var TABLA = calcularTabla();
  var CATS_LID = [
    { k: "pts", nombre: "Anotadores", unidad: "PTS" },
    { k: "reb", nombre: "Reboteros", unidad: "REB" },
    { k: "ast", nombre: "Asistidores", unidad: "AST" },
    { k: "rob", nombre: "Robos", unidad: "ROB" },
    { k: "tap", nombre: "Tapones", unidad: "TAP" }
  ];

  function lideres(k, n) {
    var arr = T.jugadores.slice();
    arr.sort(function(a, b) { return b[k] - a[k]; });
    return arr.slice(0, n || 10);
  }

  function proxima() {
    var ahora = Date.now();
    var pend = [];
    for (var j = 0; j < T.jornadas.length; j++) {
      var tiene = false;
      for (var k = 0; k < T.jornadas[j].partidos.length; k++) { if (T.jornadas[j].partidos[k].pl != null) tiene = true; }
      if (!tiene) pend.push(T.jornadas[j]);
    }
    if (pend.length === 0) return null;
    var target = pend[0];
    var t = new Date(target.fecha + "T17:00:00").getTime();
    if (ahora >= t && ahora < t + 4 * 3600000) return { modo: "vivo", j: target };
    if (t > ahora) return { modo: "cuenta", j: target, t: t };
    return null;
  }

  function partes(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  function tic() {
    var P = proxima();
    var fc = document.getElementById("fr-cuenta");
    if (fc) {
      if (!P) fc.innerHTML = "";
      else if (P.modo === "vivo") fc.innerHTML = "🏀 J" + P.j.numero + " en juego";
      else {
        var c = partes(P.t - Date.now());
        fc.innerHTML = "J" + P.j.numero + " en <b>" + c.d + "d " + dos2(c.h) + "h " + dos2(c.m) + "m</b>";
      }
    }
  }
  setInterval(tic, 1000);

  var estado = { tab: "inicio", jornada: Math.min(JA + 1, NJ), lid: "pts" };
  var animando = false;

  function conCortina(tab, callback) {
    if (animando) return;
    var ov = document.getElementById("wipe");
    animando = true;
    var btns = document.querySelectorAll("#tabs button");
    var txt = tab;
    for (var i = 0; i < btns.length; i++) { if (btns[i].getAttribute("data-tab") === tab) txt = btns[i].innerText; }
    document.getElementById("wipe-titulo").innerText = txt;
    
    ov.classList.add("is-active", "cover");
    ov.classList.remove("leave");
    
    setTimeout(function() {
      callback();
      ov.classList.remove("cover");
      ov.classList.add("leave");
      setTimeout(function() {
        ov.classList.remove("is-active", "leave");
        animando = false;
      }, 560);
    }, 560);
  }

  function irATab(tab, extra) {
    if (tab === estado.tab) { if (extra) extra(); render(); return; }
    conCortina(tab, function() {
      estado.tab = tab;
      if (extra) extra();
      render();
      window.scrollTo(0, 0);
    });
  }

  function formaHTML(f) {
    var html = '<span class="forma">';
    var slice = f.slice(-5);
    for (var i = 0; i < slice.length; i++) { html += '<i class="' + slice[i] + '">' + slice[i] + '</i>'; }
    return html + '</span>';
  }

  function renderInicio() {
    var P = proxima();
    var jugados = 0, puntos = 0;
    for (var j = 0; j < T.jornadas.length; j++) {
      for (var k = 0; k < T.jornadas[j].partidos.length; k++) {
        if (T.jornadas[j].partidos[k].pl != null) { jugados++; puntos += T.jornadas[j].partidos[k].pl + T.jornadas[j].partidos[k].pv; }
      }
    }
    var cuenta = "";
    if (P) {
      var cruces = "";
      for (var k = 0; k < P.j.partidos.length; k++) {
        var p = P.j.partidos[k];
        cruces += '<div style="display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.05);padding:8px;border-radius:5px;margin-bottom:5px;">' + escudo(p.local) + ' <span>' + esc(EQ[p.local].nombre) + '</span> <em style="color:var(--naranja)">vs</em> <span>' + esc(EQ[p.visita].nombre) + '</span> ' + escudo(p.visita) + ' <span style="margin-left:auto;color:var(--ambar)">' + esc(p.hora) + '</span></div>';
      }
      var reloj = P.modo === "vivo" ? '<div style="color:var(--verde);font-weight:bold;margin-bottom:10px;">Se está jugando hoy</div>' : (function() {
        var c = partes(P.t - Date.now());
        return '<div class="cuenta-reloj"><div class="dig"><b>' + c.d + '</b><span>Días</span></div><div class="dig"><b>' + dos2(c.h) + '</b><span>Horas</span></div><div class="dig"><b>' + dos2(c.m) + '</b><span>Min</span></div><div class="dig"><b>' + dos2(c.s) + '</b><span>Seg</span></div></div>';
      })();
      cuenta = '<section class="cuenta"><div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="color:var(--turquesa);font-weight:bold;text-transform:uppercase;">' + (P.modo === "vivo" ? "En juego" : "Próxima jornada") + '</span><span style="font-family:var(--titular);font-size:1.5rem;">J' + dos2(P.j.numero) + '</span></div>' + reloj + '<p style="margin:10px 0;color:var(--arena);">' + fecha(P.j.fecha) + ' · Parque Roberto Edmundo Canessa</p><div>' + cruces + '</div></section>';
    }

    var top5 = "";
    for (var i = 0; i < 5 && i < TABLA.length; i++) {
      var f = TABLA[i];
      top5 += '<button class="lider-fila" onclick="irATab(\'posiciones\')"><span class="lider-pos">' + (i + 1) + 'º</span>' + escudo(f.id, true) + '<span class="lider-info"><b>' + esc(f.nombre) + '</b><small>DIF ' + (f.dif > 0 ? "+" : "") + f.dif + ' · ' + f.g + 'G ' + f.p + 'P</small></span><span class="lider-pts">' + f.pts + '<small style="font-size:.7rem;color:var(--arena);margin-left:2px;">pts</small></span></button>';
    }

    var statsHtml = '<div class="stats"><div class="stat"><b>' + T.equipos.length + '</b><span>Equipos</span></div><div class="stat"><b>' + jugados + '</b><span>Partidos</span></div><div class="stat"><b>' + puntos + '</b><span>Puntos</span></div><div class="stat"><b>' + T.jugadores.length + '</b><span>Jugadores</span></div></div>';

    app.innerHTML = '<div class="inicio-grid"><div class="tarjeta fase-caja"><span style="color:var(--verde);font-weight:bold;text-transform:uppercase;font-size:.8rem;">Fase regular · Todos contra todos</span><div class="fase-num"><b>' + dos2(JA) + '</b><span>Jornada<small>de ' + NJ + ' jugadas</small></span></div><div class="fase-barra">' + Array.from({length: NJ}, function(_, i) { return '<i class="' + (i < JA ? "ok" : "") + '"></i>'; }).join("") + '</div><p style="color:var(--arena);font-size:.88rem;margin-bottom:16px;">Demo actualizada al ' + fecha(T.liga.actualizado) + '</p><div style="display:flex;gap:10px;"><button class="btn" onclick="irATab(\'posiciones\')">Ver posiciones</button><button class="btn btn--fantasma" onclick="irATab(\'resultados\', function(){estado.jornada=' + JA + '})">Resultados J' + JA + '</button></div></div><div class="lideres-caja"><div class="lideres-cab"><h2>Tabla <span style="color:var(--ambar)">· J' + JA + '</span></h2><small style="color:var(--arena);text-transform:uppercase;font-size:.7rem;">Toca para ver completa</small></div>' + top5 + '</div></div>' + cuenta + statsHtml;
  }

  function renderPosiciones() {
    var rows = "";
    for (var i = 0; i < TABLA.length; i++) {
      var f = TABLA[i];
      rows += '<tr class="' + (i < CLAS ? "clasifica" : "") + '"><td class="pos">' + (i + 1) + '</td><td class="izq"><span class="equipo-celda">' + escudo(f.id) + '<span>' + esc(f.nombre) + '</span></span></td><td>' + f.pj + '</td><td>' + f.g + '</td><td>' + f.p + '</td><td>' + f.pf + '</td><td>' + f.pc + '</td><td style="color:' + (f.dif > 0 ? "var(--verde)" : f.dif < 0 ? "var(--rojo)" : "inherit") + ';font-weight:bold;">' + (f.dif > 0 ? "+" : "") + f.dif + '</td><td class="pts">' + f.pts + '</td><td>' + formaHTML(f.forma) + '</td></tr>';
    }
    app.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:14px;"><h2 style="font-family:var(--titular);font-size:2rem;">Posiciones <span style="color:var(--naranja)">· J' + JA + '</span></h2><span style="color:var(--arena);font-size:.88rem;">Tras la jornada ' + JA + ' de ' + NJ + '</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>#</th><th class="izq">Equipo</th><th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>DIF</th><th class="th-pts">PTS</th><th>Últimos 5</th></tr></thead><tbody>' + rows + '</tbody></table></div><p style="font-size:.8rem;color:var(--arena);margin-top:10px;">Las primeras ' + CLAS + ' posiciones clasifican a semifinales. Puntuación estilo FIBA: 2 pts victoria, 1 pt derrota.</p>';
  }

  function renderResultados() {
    var j = null;
    for (var i = 0; i < T.jornadas.length; i++) { if (T.jornadas[i].numero === estado.jornada) j = T.jornadas[i]; }
    if (!j) j = T.jornadas[0];

    var nav = '<div class="jornadas-nav"><button class="flecha" onclick="estado.jornada=Math.max(1,estado.jornada-1);render()" ' + (j.numero <= 1 ? "disabled" : "") + '>‹</button><div class="jornadas-lista">';
    for (var n = 1; n <= NJ; n++) {
      var hasData = false;
      for (var k = 0; k < T.jornadas[n-1].partidos.length; k++) { if (T.jornadas[n-1].partidos[k].pl != null) hasData = true; }
      nav += '<button onclick="estado.jornada=' + n + ';render()" class="' + (n === j.numero ? "active" : "") + '" style="' + (!hasData ? "opacity:.5;border-style:dashed;" : "") + '">' + n + '</button>';
    }
    nav += '</div><button class="flecha" onclick="estado.jornada=Math.min(' + NJ + ',estado.jornada+1);render()" ' + (j.numero >= NJ ? "disabled" : "") + '>›</button></div>';

    var parts = "";
    for (var i = 0; i < j.partidos.length; i++) {
      var p = j.partidos[i];
      var marc = p.pl != null ? '<div class="marcador">' + p.pl + ' <span style="color:var(--ambar)">–</span> ' + p.pv + '</div>' : '<div class="marcador pendiente">' + esc(p.hora) + '</div>';
      parts += '<article class="tarjeta partido"><div style="font-size:.72rem;color:var(--arena);text-align:center;margin-bottom:9px;text-transform:uppercase;">🏀 <b style="color:var(--turquesa)">Parque R. E. Canessa</b> · ' + esc(p.hora) + '</div><div class="partido-fila"><div class="eq local"><span>' + esc(EQ[p.local].nombre) + '</span>' + escudo(p.local) + '</div>' + marc + '<div class="eq">' + escudo(p.visita) + '<span>' + esc(EQ[p.visita].nombre) + '</span></div></div></article>';
    }

    app.innerHTML = nav + '<div style="display:flex;justify-content:space-between;margin-bottom:14px;"><h2 style="font-family:var(--titular);font-size:2rem;">Jornada ' + j.numero + ' <span style="color:var(--naranja)">Navideño</span></h2><span style="color:var(--arena);font-size:.88rem;">' + fecha(j.fecha) + '</span></div><div class="partidos">' + parts + '</div>';
  }

  function renderLideres() {
    var cat = null;
    for (var i = 0; i < CATS_LID.length; i++) { if (CATS_LID[i].k === estado.lid) cat = CATS_LID[i]; }
    var lista = lideres(estado.lid, 10);
    var max = 1;
    for (var i = 0; i < lista.length; i++) { if (lista[i][estado.lid] > max) max = lista[i][estado.lid]; }

    var tabs = '<div class="lid-tabs">';
    for (var i = 0; i < CATS_LID.length; i++) {
      tabs += '<button class="lid-tab ' + (CATS_LID[i].k === estado.lid ? "active" : "") + '" onclick="estado.lid=\'' + CATS_LID[i].k + '\';render()">' + CATS_LID[i].nombre + '</button>';
    }
    tabs += '</div>';

    var rows = "";
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      var w = (p[estado.lid] / max).toFixed(2);
      rows += '<div class="tarjeta lid-fila"><span style="font-family:var(--titular);font-size:1.35rem;color:' + (i === 0 ? "var(--ambar)" : "var(--arena)") + ';width:32px;text-align:center;">' + (i === 0 ? "👑" : i + 1) + '</span>' + escudo(p.equipo, true) + '<span style="flex:1;min-width:0;"><b style="display:block;font-size:.98rem;">' + esc(p.nombre) + ' <span style="color:var(--arena);font-weight:500;font-size:.8rem;">#' + p.num + '</span></b><small style="color:var(--arena);font-size:.78rem;">' + esc(EQ[p.equipo].nombre) + ' · ' + p.pos + ' · ' + p.pj + ' PJ</small></span><span class="lid-barra"><i style="transform:scaleX(' + w + ')"></i></span><span class="lid-num">' + p[estado.lid].toFixed(1) + '<small style="font-size:.62rem;color:var(--arena);display:block;line-height:.6;">' + cat.unidad + '/J</small></span></div>';
    }

    app.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:14px;"><h2 style="font-family:var(--titular);font-size:2rem;">Líderes <span style="color:var(--naranja)">· ' + esc(cat.nombre) + '</span></h2><span style="color:var(--arena);font-size:.88rem;">tras J' + JA + '</span></div>' + tabs + '<div style="display:grid;gap:9px;">' + rows + '</div><p style="font-size:.8rem;color:var(--arena);margin-top:10px;">Promedios por partido. Estadísticas ficticias.</p>';
  }

  function renderEquipos() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:14px;"><h2 style="font-family:var(--titular);font-size:2rem;">Los 8 equipos <span style="color:var(--naranja)">del Navideño</span></h2><span style="color:var(--arena);font-size:.88rem;">Rosters demo</span></div><div class="eq-grid">';
    for (var i = 0; i < T.equipos.length; i++) {
      var e = T.equipos[i];
      var f = null, pos = 0;
      for (var j = 0; j < TABLA.length; j++) { if (TABLA[j].id === e.id) { f = TABLA[j]; pos = j + 1; } }
      var roster = "";
      for (var k = 0; k < T.jugadores.length; k++) {
        if (T.jugadores[k].equipo === e.id) {
          var p = T.jugadores[k];
          roster += '<div class="eq-jug"><span style="font-family:var(--titular);color:' + e.color + ';width:26px;text-align:center;">#' + p.num + '</span><span>' + esc(p.nombre) + '</span><span style="margin-left:auto;color:var(--arena);font-size:.78rem;">' + p.pts.toFixed(1) + ' pts</span><span style="font-family:var(--sub);font-weight:700;font-size:.7rem;color:var(--turquesa);margin-left:10px;">' + p.pos + '</span></div>';
        }
      }
      html += '<article class="tarjeta eq-card" style="border-top:5px solid ' + e.color + '"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' + escudo(e.id, true) + '<div><h3 style="font-family:var(--titular);font-size:1.5rem;">' + esc(e.nombre) + '</h3><small style="color:var(--arena);font-size:.78rem;">' + esc(e.barrio) + ' · ' + pos + 'º tabla</small></div><span style="margin-left:auto;text-align:right;font-family:var(--titular);font-size:1.4rem;color:var(--ambar);">' + f.g + '–' + f.p + '<small style="display:block;font-family:var(--sub);font-size:.65rem;color:var(--arena);">REC</small></span></div><div class="eq-roster">' + roster + '</div></article>';
    }
    app.innerHTML = html + '</div>';
  }

  function renderPlayoffs() {
    var completa = JA >= NJ;
    function seed(n) { return TABLA[n - 1] ? { id: TABLA[n-1].id, nombre: TABLA[n-1].nombre, pos: n } : null; }
    function fila(s) { return s ? '<div class="fila"><span style="font-family:var(--titular);color:var(--arena);width:24px;">' + s.pos + 'º</span>' + escudo(s.id) + '<span style="flex:1;font-weight:650;">' + esc(s.nombre) + '</span></div>' : '<div class="fila"><span style="font-family:var(--titular);color:var(--arena);width:24px;">–</span><span style="flex:1;color:#93826a;font-style:italic;">Por definir</span></div>'; }

    app.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:14px;"><h2 style="font-family:var(--titular);font-size:2rem;">Playoffs <span style="color:var(--naranja)">Navideño</span></h2></div><div style="background:var(--superficie);border-left:5px solid var(--ambar);padding:11px 15px;border-radius:var(--radio);font-size:.88rem;margin-bottom:18px;">📊 <b>' + (completa ? "Cruces confirmados." : "Proyección:") + '</b> ' + (completa ? "Así quedaron los cruces." : "Así quedarían las semifinales si terminara hoy.") + '</div><div style="overflow-x:auto;"><div class="bracket"><div><h3 style="text-align:center;color:var(--turquesa);font-family:var(--sub);text-transform:uppercase;margin-bottom:12px;">Semifinales</h3><div style="display:flex;flex-direction:column;gap:14px;height:calc(100% - 34px);justify-content:space-around;"><div class="llave"><div class="llave-id">Semifinal 1</div>' + fila(seed(1)) + fila(seed(4)) + '</div><div class="llave"><div class="llave-id">Semifinal 2</div>' + fila(seed(2)) + fila(seed(3)) + '</div></div></div><div><h3 style="text-align:center;color:var(--turquesa);font-family:var(--sub);text-transform:uppercase;margin-bottom:12px;">Gran Final</h3><div style="display:flex;flex-direction:column;gap:14px;height:calc(100% - 34px);justify-content:space-around;"><div class="llave" style="border:2px solid var(--ambar);box-shadow:5px 5px 0 var(--naranja);"><div class="llave-id" style="background:var(--ambar);color:var(--tinta);">🏆 Final</div><div class="fila"><span style="flex:1;color:#93826a;font-style:italic;">Ganadora SF 1</span></div><div class="fila"><span style="flex:1;color:#93826a;font-style:italic;">Ganadora SF 2</span></div></div></div></div><div><h3 style="text-align:center;color:var(--turquesa);font-family:var(--sub);text-transform:uppercase;margin-bottom:12px;">Campeón</h3><div style="display:flex;flex-direction:column;gap:14px;height:calc(100% - 34px);justify-content:space-around;"><div style="text-align:center;padding:24px;background:linear-gradient(140deg,#33210f,var(--tinta));border:1px solid rgba(255,197,61,.3);border-radius:var(--radio);"><b style="font-family:var(--titular);font-size:1.7rem;color:var(--ambar);">Copa Navideña</b><p style="margin-top:6px;font-size:.9rem;color:var(--arena);">El trofeo espera ✨</p></div></div></div></div></div>';
  }

  function renderTorneo() {
    app.innerHTML = '<article class="tarjeta" style="padding:26px;"><h2 style="font-family:var(--titular);font-size:2.1rem;margin-bottom:4px;">El Torneo · Formato</h2><p class="muted" style="margin-bottom:20px;">Liga Local de Baloncesto de Jiquilisco · Torneo Navideño 2026 · <b style="color:var(--ambar)">demo ficticia</b></p><h3 style="font-family:var(--sub);text-transform:uppercase;color:var(--naranja);margin:24px 0 8px;">Las Tardes Alegres</h3><p style="margin-bottom:10px;max-width:70ch;">Cada domingo, el Parque Roberto Edmundo Canessa se convierte en la casa del baloncesto jiquilisense.</p><div style="display:grid;gap:14px;margin:14px 0;" class="info-grid"><div style="border:1px solid var(--linea);border-radius:var(--radio);padding:16px 18px;background:rgba(246,237,223,.03);"><span style="font-family:var(--sub);font-weight:700;text-transform:uppercase;font-size:.75rem;color:var(--turquesa);">Fase I</span><h4 style="font-family:var(--titular);font-size:1.25rem;margin:4px 0 8px;">Todos contra todos</h4><ul style="margin:0 0 10px 20px;"><li><b>Participantes:</b> ' + T.equipos.length + ' equipos.</li><li><b>Formato:</b> una vuelta de ' + NJ + ' jornadas.</li><li><b>Puntuación:</b> 2 pts victoria, 1 pt derrota (FIBA).</li></ul></div><div style="border:1px solid var(--linea);border-radius:var(--radio);padding:16px 18px;background:rgba(246,237,223,.03);"><span style="font-family:var(--sub);font-weight:700;text-transform:uppercase;font-size:.75rem;color:var(--turquesa);">Fase II</span><h4 style="font-family:var(--titular);font-size:1.25rem;margin:4px 0 8px;">La fiesta grande</h4><ul style="margin:0 0 10px 20px;"><li>Clasifican los <b>' + CLAS + ' primeros</b>.</li><li><b>Semifinales:</b> 1º vs 4º y 2º vs 3º.</li><li><b>Gran final:</b> Copa Navideña LBJ.</li></ul></div></div><div style="margin-top:22px;padding:20px;border-radius:var(--radio);background:linear-gradient(140deg,#33210f,var(--tinta));border:1.5px solid rgba(255,197,61,.4);display:flex;gap:16px;align-items:center;flex-wrap:wrap;"><div class="patro-logo grande" style="width:84px;height:84px;"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="none" stroke="#FFC53D" stroke-width="3"/><circle cx="32" cy="32" r="22" fill="#F07C1F"/><path d="M10 32h44M32 10v44M17 17c9 8 9 22 0 30M47 17c-9 8-9 22 0 30" stroke="#171009" stroke-width="2.6" fill="none"/><path d="M6 44 Q32 58 58 44" stroke="#2EC4B6" stroke-width="3" fill="none"/></svg></div><div style="flex:1;min-width:220px;"><small style="font-family:var(--sub);font-weight:700;text-transform:uppercase;font-size:.7rem;color:var(--turquesa);">Patrocinador oficial</small><b style="font-family:var(--titular);font-size:1.4rem;color:var(--ambar);display:block;">Comité Hermanos Lejanos</b><p style="font-size:.9rem;color:var(--arena);margin:6px 0 0;">Iniciativa que busca fomentar el crecimiento integral de los jóvenes mediante el baloncesto.</p></div></div><h3 style="font-family:var(--sub);text-transform:uppercase;color:var(--naranja);margin:24px 0 8px;">Sobre esta demo</h3><p style="margin-bottom:10px;max-width:70ch;">Este sitio fue construido como demostración técnica gratuita.</p></article>';
  }

  function render() {
    var btns = document.querySelectorAll("#tabs button");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-tab") === estado.tab) btns[i].classList.add("active");
      else btns[i].classList.remove("active");
    }
    if (estado.tab === "inicio") renderInicio();
    else if (estado.tab === "posiciones") renderPosiciones();
    else if (estado.tab === "resultados") renderResultados();
    else if (estado.tab === "lideres") renderLideres();
    else if (estado.tab === "equipos") renderEquipos();
    else if (estado.tab === "playoffs") renderPlayoffs();
    else if (estado.tab === "torneo") renderTorneo();
    tic();
  }

  // Eventos
  var tabsContainer = document.getElementById("tabs");
  tabsContainer.addEventListener("click", function(e) {
    if (e.target.tagName === "BUTTON") {
      irATab(e.target.getAttribute("data-tab"));
    }
  });

  var chip = document.getElementById("patro-chip");
  var hoja = document.getElementById("patro-hoja");
  chip.addEventListener("click", function() { hoja.classList.add("visible"); });
  document.getElementById("patro-cerrar").addEventListener("click", function() { hoja.classList.remove("visible"); });
  hoja.addEventListener("click", function(e) { if (e.target === hoja) hoja.classList.remove("visible"); });

  // Arranque
  document.getElementById("fr-ja").innerText = JA;
  var ticks = "";
  for (var i = 0; i < NJ; i++) { ticks += '<i class="' + (i < JA ? "ok" : "") + '"></i>'; }
  document.getElementById("fr-ticks").innerHTML = ticks;
  document.getElementById("pie-act").innerText = "Demo actualizada: " + fecha(T.liga.actualizado);
  
  render();
})();