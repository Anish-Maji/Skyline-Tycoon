"use strict";
/* ================= DRAWING KIT (isometric, plane units) ================= */
const D = 1.6, ROAD = .42, S = 2*D + 7, TH = .32;
const V = {ctx:null, k:40, ox:0, oy:0, lift:0};
const HUB_AT = .63;   // where the move buttons sit on the board: .5 is the middle, higher is toward the front
function P(X, Y, Z){ return [V.ox + (X - Y)*V.k, V.oy + (X + Y)*V.k/2 - ((Z||0) + V.lift)*V.k]; }
/* Tiles are raised blocks. TILE_H is their height above the road, TILE_DIP how far one sinks when a character lands. */
const TILE_H = .14, TILE_DIP = .08, TILE_REST = .025;
/* Opacity of characters waiting for their turn */
const IDLE_ALPHA = .6;
function poly(pts, fill, stroke, lw){ const c = V.ctx; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill){ c.fillStyle = fill; c.fill(); } if (stroke){ c.strokeStyle = stroke; c.lineWidth = lw||1; c.lineJoin = "round"; c.stroke(); } }
/* ================= ASSET LOADER ================= */
const IMG = {};
function loadAssets(){
  Object.entries(ASSETS).forEach(([kind, slots]) => Object.entries(slots).forEach(([key, path]) => {
    if (!path) return; const im = new Image(); im.onerror = () => console.warn("Asset not found:", path); im.src = path; IMG[kind + ":" + key] = im;
  }));
}
function assetReady(kind, key){ const im = IMG[kind + ":" + key]; return im && im.complete && im.naturalWidth ? im : null; }
/* Draws an image with its bottom-center on screen point (x, y). Returns false when no image is set. */
function drawAsset(kind, key, x, y, h, c){
  const im = assetReady(kind, key); if (!im) return false;
  const w = h * im.naturalWidth / im.naturalHeight; (c || V.ctx).drawImage(im, x - w/2, y - h, w, h); return true;
}
loadAssets();

function rect3(X0, Y0, X1, Y1, z, fill, stroke, lw){ poly([P(X0,Y0,z), P(X1,Y0,z), P(X1,Y1,z), P(X0,Y1,z)], fill, stroke, lw); }
/* Lightens (amt > 0) or darkens (amt < 0) a color. Takes "#rrggbb", "#rgb" or "rgb(r,g,b)". */
function shade(hex, amt){ let r, g, b; const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(hex);
  if (m){ r = +m[1]; g = +m[2]; b = +m[3]; } else { let c = hex.replace("#",""); if (c.length === 3) c = c.split("").map(x => x+x).join(""); const n = parseInt(c, 16); r = n>>16; g = (n>>8)&255; b = n&255; }
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt); r = Math.round(r + (f-r)*p); g = Math.round(g + (f-g)*p); b = Math.round(b + (f-b)*p); return `rgb(${r},${g},${b})`; }
function box3(X, Y, w, d, h, col, z){ z = z || 0;
  poly([P(X,Y+d,z), P(X+w,Y+d,z), P(X+w,Y+d,z+h), P(X,Y+d,z+h)], shade(col, -.12));
  poly([P(X+w,Y+d,z), P(X+w,Y,z), P(X+w,Y,z+h), P(X+w,Y+d,z+h)], shade(col, -.32));
  poly([P(X,Y,z+h), P(X+w,Y,z+h), P(X+w,Y+d,z+h), P(X,Y+d,z+h)], shade(col, .14));
}
function house(cx, cy, s, wall, roof){
  const w = s, d = s*.85, h = s*.55, X = cx - w/2, Y = cy - d/2, r = h + s*.42, ov = s*.08;
  box3(X, Y, w, d, h, wall);
  poly([P(X+w*.38, Y+d, 0), P(X+w*.62, Y+d, 0), P(X+w*.62, Y+d, h*.62), P(X+w*.38, Y+d, h*.62)], shade(roof, -.25));
  poly([P(X+w, Y+d*.3, h*.35), P(X+w, Y+d*.7, h*.35), P(X+w, Y+d*.7, h*.72), P(X+w, Y+d*.3, h*.72)], "#bfe3f5");
  poly([P(X-ov, Y-ov, h), P(X+w+ov, Y-ov, h), P(X+w+ov, Y+d/2, r), P(X-ov, Y+d/2, r)], shade(roof, -.2));
  poly([P(X+w, Y, h), P(X+w, Y+d, h), P(X+w, Y+d/2, r)], shade(wall, -.3));
  poly([P(X-ov, Y+d+ov, h), P(X+w+ov, Y+d+ov, h), P(X+w+ov, Y+d/2, r), P(X-ov, Y+d/2, r)], roof);
}
function tower(cx, cy, s, col){
  const w = s, X = cx - w/2, Y = cy - w/2, h = s*3;
  box3(X, Y, w, w, h, col);
  for (let f = 1; f < 6; f++){ const z = h*f/6; poly([P(X+w, Y+w*.15, z), P(X+w, Y+w*.85, z), P(X+w, Y+w*.85, z+h*.07), P(X+w, Y+w*.15, z+h*.07)], "rgba(220,240,255,.85)"); poly([P(X+w*.15, Y+w, z), P(X+w*.85, Y+w, z), P(X+w*.85, Y+w, z+h*.07), P(X+w*.15, Y+w, z+h*.07)], "rgba(220,240,255,.7)"); }
  box3(X + w*.2, Y + w*.2, w*.6, w*.6, s*.35, "#f2b51c", h);
  const a = P(cx, cy, h + s*.35), b = P(cx, cy, h + s*1.1); const c = V.ctx; c.strokeStyle = "#f2b51c"; c.lineWidth = Math.max(1.5, V.k*.04); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
}
function flag(X, Y, col, hgt){ const c = V.ctx, a = P(X, Y, 0), b = P(X, Y, hgt || .6);
  c.strokeStyle = "#5b4636"; c.lineWidth = Math.max(1.5, V.k*.035); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  poly([b, [b[0] + V.k*.32, b[1] + V.k*.08], [b[0], b[1] + V.k*.2]], col); }
function plot(X, Y, s){ rect3(X - s/2, Y - s/2, X + s/2, Y + s/2, .005, "#f6f2e7", "#d9d0bb", 1); }
function building(level, X, Y, col, along){
  { const [sx, sy] = P(X, Y); if (drawAsset("buildings", level, sx, sy, V.k*ASSET_HEIGHTS.buildings[level])) return; }
  const ax = along === "X" ? [1, 0] : [0, 1];
  if (level <= 1){ plot(X, Y, .34); flag(X, Y, col); return; }
  if (level === 2){ house(X, Y, .36, "#fffaf2", col); return; }
  if (level === 3){ house(X - ax[0]*.2, Y - ax[1]*.2, .32, "#fffaf2", col); house(X + ax[0]*.2, Y + ax[1]*.2, .32, "#fffaf2", col); return; }
  if (level === 4){
    box3(X - .17 - ax[0]*.22, Y - .17 - ax[1]*.22, .34, .34, .62, "#f2efe8"); poly([P(X - .17 - ax[0]*.22 + .34, Y - ax[1]*.22 - .1, .3), P(X - .17 - ax[0]*.22 + .34, Y - ax[1]*.22 + .1, .3), P(X - .17 - ax[0]*.22 + .34, Y - ax[1]*.22 + .1, .5), P(X - .17 - ax[0]*.22 + .34, Y - ax[1]*.22 - .1, .5)], col);
    house(X + ax[0]*.22, Y + ax[1]*.22, .3, "#fffaf2", col); return;
  }
  tower(X, Y, .34, col);
}
function pine(X, Y, s){ { const [sx, sy] = P(X, Y); if (drawAsset("props", "pine", sx, sy, V.k*ASSET_HEIGHTS.props.pine*s)) return; } const c = V.ctx; box3(X - .04*s, Y - .04*s, .08*s, .08*s, .18*s, "#7a5232");
  for (let k = 0; k < 3; k++){ const z = .14*s + k*.2*s, r = (.32 - k*.08)*s; const base = P(X, Y, z), top = P(X, Y, z + .38*s);
    c.fillStyle = shade("#2f8f4e", -k*.05); c.beginPath(); c.moveTo(base[0] - r*V.k, base[1]); c.lineTo(top[0], top[1]); c.lineTo(base[0] + r*V.k, base[1]); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.16)"; c.beginPath(); c.moveTo(base[0] - r*V.k, base[1]); c.lineTo(top[0], top[1]); c.lineTo(base[0] - r*V.k*.1, base[1]); c.closePath(); c.fill(); } }
function palm(X, Y, s){ { const [sx, sy] = P(X, Y); if (drawAsset("props", "palm", sx, sy, V.k*ASSET_HEIGHTS.props.palm*s)) return; } const c = V.ctx, a = P(X, Y, 0), top = P(X + .12*s, Y - .05*s, .95*s);
  c.strokeStyle = "#8a6239"; c.lineWidth = Math.max(2, V.k*.07*s); c.lineCap = "round"; c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(a[0] - V.k*.05, (a[1] + top[1])/2, top[0], top[1]); c.stroke();
  c.strokeStyle = "#2f9a4a"; c.lineWidth = Math.max(2, V.k*.08*s);
  [[-.5,.15],[.5,.12],[-.35,-.22],[.38,-.25],[0,.3],[0,-.3]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(top[0], top[1]); c.quadraticCurveTo(top[0] + dx*V.k*.25*s, top[1] - V.k*.22*s, top[0] + dx*V.k*.55*s, top[1] + (dy + .1)*V.k*.4*s); c.stroke(); });
  c.fillStyle = "#6b4a2a"; c.beginPath(); c.arc(top[0], top[1] + V.k*.04, V.k*.05*s, 0, Math.PI*2); c.fill(); c.lineCap = "butt"; }
/* A beach resort: a wooden deck with a striped parasol over a round beach bar, a sun lounger and a little pool.
   The parasol and bar take the owner's color. (X, Y) is the middle of the deck, s the size. */
function resort(X, Y, s, color){
  const c = V.ctx, k = V.k, R2 = Math.SQRT2;
  box3(X - .38*s, Y - .38*s, .76*s, .76*s, .035*s, "#d9ac72");                                     // deck
  rect3(X + .06*s, Y - .34*s, X + .34*s, Y - .06*s, .036*s, "#5cc8e8", "#ffffff", Math.max(1, k*.02)); // pool
  /* sun lounger on the front corner */
  box3(X - .3*s, Y + .14*s, .3*s, .12*s, .05*s, "#ffffff", .035*s); box3(X - .3*s, Y + .14*s, .08*s, .12*s, .1*s, "#ffffff", .085*s);
  /* round beach bar */
  const r = .2*s, rx = r*k*R2, ry = r*k*R2/2, b0 = P(X, Y, .035*s), b1 = P(X, Y, .2*s);
  c.fillStyle = shade(color, -.12); c.beginPath(); c.ellipse(b0[0], b0[1], rx, ry, 0, 0, Math.PI); c.lineTo(b1[0] - rx, b1[1]); c.ellipse(b1[0], b1[1], rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
  c.fillStyle = "#ffffff"; c.fillRect(b0[0] - rx, b1[1] + (b0[1] - b1[1])*.45, rx*2, Math.max(1.5, k*.03*s));
  c.fillStyle = "#f6e7c8"; c.beginPath(); c.ellipse(b1[0], b1[1], rx, ry, 0, 0, Math.PI*2); c.fill();
  /* parasol pole and striped canopy with a scalloped edge */
  const H = .7*s, top = P(X, Y, H + .18*s), mid = P(X, Y, H); c.strokeStyle = "#6b4a2a"; c.lineWidth = Math.max(1.5, k*.035*s);
  c.beginPath(); c.moveTo(b1[0], b1[1]); c.lineTo(top[0], top[1]); c.stroke();
  const CR = .42*s, crx = CR*k*R2, cry = CR*k*R2/2, n = 12, edge = a => [mid[0] + Math.cos(a)*crx, mid[1] + Math.sin(a)*cry];
  const wedges = []; for (let q = 0; q < n; q++){ const a0 = q*2*Math.PI/n, a1 = (q + 1)*2*Math.PI/n; wedges.push({q, a0, a1, d:Math.sin((a0 + a1)/2)}); }
  wedges.sort((a, b) => a.d - b.d).forEach(w => { const e0 = edge(w.a0), e1 = edge(w.a1); c.fillStyle = w.q % 2 ? "#ffffff" : color;
    c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(e0[0], e0[1]); c.lineTo(e1[0], e1[1]); c.closePath(); c.fill(); });
  for (let q = 0; q < n; q++){ const a0 = q*2*Math.PI/n, a1 = (q + 1)*2*Math.PI/n; if (Math.sin((a0 + a1)/2) < -.2) continue; const e0 = edge(a0), e1 = edge(a1);
    c.fillStyle = q % 2 ? shade(color, -.15) : "#f2f2f2"; c.beginPath(); c.moveTo(e0[0], e0[1]); c.quadraticCurveTo((e0[0] + e1[0])/2, (e0[1] + e1[1])/2 + k*.09*s, e1[0], e1[1]); c.closePath(); c.fill(); }
  c.fillStyle = shade(color, -.25); c.beginPath(); c.arc(top[0], top[1], Math.max(1.5, k*.035*s), 0, Math.PI*2); c.fill();
}
function bush(X, Y, s){ const c = V.ctx, p = P(X, Y, .08*s); c.fillStyle = "#3f9b4f"; [[-.1,0,.12],[.08,.02,.1],[0,-.06,.11]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(p[0] + dx*V.k*s, p[1] + dy*V.k*s, r*V.k*s, 0, Math.PI*2); c.fill(); }); }
/* A player's money pile. One brick is about ₹50K, so it grows and shrinks with their cash.
   Bills fill six stacks evenly (up to 8 high), and a few gold and silver bars sit in front. */
function moneyPile(X, Y, cash){
  if (cash <= 0) return;
  const bricks = Math.max(1, Math.round(cash/50));
  { const [sx, sy] = P(X + .8, Y + .6); if (drawAsset("props", "money", sx, sy, V.k*ASSET_HEIGHTS.props.money*Math.min(1.6, Math.max(.35, Math.sqrt(cash/START_CASH))))) return; }
  const bars = Math.min(4, Math.floor(bricks/8)), bills = Math.min(48, bricks - bars);
  const items = [];
  for (let n = 0; n < 6; n++){ const layers = Math.floor(bills/6) + (n < bills % 6 ? 1 : 0); if (!layers) continue; const gx = n % 3, gy = Math.floor(n/3); items.push({X:X + gx*.55, Y:Y + gy*.34, layers, kind:"bill"}); }
  const BAR = [{X:X + .1, Y:Y + .78, kind:"gold"}, {X:X + .52, Y:Y + .78, kind:"silver"}, {X:X + .94, Y:Y + .78, kind:"gold"}, {X:X + .3, Y:Y + .78, z:.12, kind:"gold"}];
  for (let k = 0; k < bars; k++) items.push(BAR[k]);
  items.sort((a, b) => (a.X + a.Y) - (b.X + b.Y) || (a.z||0) - (b.z||0)).forEach(it => {
    if (it.kind === "bill"){
      for (let l = 0; l < it.layers; l++){ box3(it.X, it.Y, .5, .28, .05, l % 2 ? "#6cbf58" : "#5aad49", l*.05); }
      const z = it.layers*.05; poly([P(it.X + .2, it.Y, z), P(it.X + .3, it.Y, z), P(it.X + .3, it.Y + .28, z), P(it.X + .2, it.Y + .28, z)], "#e9e2c0");
      poly([P(it.X + .2, it.Y + .28, 0), P(it.X + .3, it.Y + .28, 0), P(it.X + .3, it.Y + .28, z), P(it.X + .2, it.Y + .28, z)], "#d8cfa6"); }
    else box3(it.X, it.Y, .36, .2, .12, it.kind === "gold" ? "#f2c230" : "#c9d1d8", it.z||0);
  });
}
/* Characters are drawn in js/chars.js. The sidebar avatar is a head-and-shoulders crop. */
function avatarCanvas(p){
  const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); cv.width = 44*dpr; cv.height = 44*dpr;
  const c = cv.getContext("2d"); c.scale(dpr, dpr); c.fillStyle = shade(p.color, .72); c.fillRect(0, 0, 44, 44);
  drawTycoon(c, 21, 86, 84, p.look ?? 0, {facing:"right", t:0}); return cv;
}

/* ================= BOARD RENDERER ================= */
function tileRect(i){
  if (i === 0) return {X0:S-D, X1:S, Y0:S-D, Y1:S, side:"c"};
  if (i === 8) return {X0:0, X1:D, Y0:S-D, Y1:S, side:"c"};
  if (i === 16) return {X0:0, X1:D, Y0:0, Y1:D, side:"c"};
  if (i === 24) return {X0:S-D, X1:S, Y0:0, Y1:D, side:"c"};
  if (i < 8){ const X1 = S-D-(i-1); return {X0:X1-1, X1, Y0:S-D, Y1:S, side:0}; }
  if (i < 16){ const Y1 = S-D-(i-9); return {X0:0, X1:D, Y0:Y1-1, Y1, side:1}; }
  if (i < 24){ const X0 = D+(i-17); return {X0, X1:X0+1, Y0:0, Y1:D, side:2}; }
  const Y0 = D+(i-25); return {X0:S-D, X1:S, Y0, Y1:Y0+1, side:3};
}
function along(r, f){ const mx = (r.X0 + r.X1)/2, my = (r.Y0 + r.Y1)/2;
  if (r.side === 0) return [mx, S - f*D]; if (r.side === 1) return [f*D, my]; if (r.side === 2) return [mx, f*D]; if (r.side === 3) return [S - f*D, my]; return [mx, my]; }
function sub(r, f0, f1){ const a = along(r, f0), b = along(r, f1);
  if (r.side === 0 || r.side === 2) return {X0:r.X0, X1:r.X1, Y0:Math.min(a[1], b[1]), Y1:Math.max(a[1], b[1])};
  return {X0:Math.min(a[0], b[0]), X1:Math.max(a[0], b[0]), Y0:r.Y0, Y1:r.Y1}; }
function ptext(X, Y, dir, text, size, weight, color, maxW, family){
  const c = V.ctx, F = 100, [sx, sy] = P(X, Y), k = V.k;
  const u = dir === "Y" ? [k, -k/2] : [k, k/2], v = dir === "Y" ? [k, k/2] : [-k, k/2];
  c.save(); c.translate(sx, sy); c.transform(u[0]/F, u[1]/F, v[0]/F, v[1]/F, 0, 0);
  c.font = `${weight} ${size*F}px ${family || "Figtree, sans-serif"}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = color;
  c.fillText(text, 0, 0, maxW ? maxW*F : undefined); c.restore();
}
/* Names run along the board edge so every side reads left to right: bottom sides stand toward the center, top sides toward the outside. */
const fitSize = (txt, size) => Math.min(size, .9 / Math.max(1, txt.length * .66));
const edgeDir = side => (side === 0 || side === 2) ? "X" : "Y";

const board = (() => {
  const cv = document.getElementById("board"), ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let thought = null, headPt = null;
  const flights = [];   // money stacks flying between piles, see moneyFly below   // the thinking bubble text, and where the current player's head is this frame
  let W = 600, H = 400, state = null, disp = {}, lastSeq = -1, hover = -1, selectable = null, sel = -1, onBusyEnd = null, wasBusy = false;
  const HOP = 190;
  function resize(){
    /* The board fills the window. TOP leaves room for the toolbar; the board is centered in what is left. */
    const r = cv.parentElement.getBoundingClientRect(), TOP = 48; W = Math.max(280, r.width); H = Math.max(320, r.height);
    const availH = H - TOP; V.k = Math.min(W/(2*S + .8), availH/(S + 2.4));
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    V.ctx = ctx; V.ox = W/2; V.oy = TOP + (availH - (S + 2.4)*V.k)/2 + 1.6*V.k;
    const c = P(S*HUB_AT, S*HUB_AT); const hub = document.getElementById("hub"); hub.style.left = c[0] + "px"; hub.style.top = c[1] + "px";
  }
  function setState(s, opts){
    const first = !state || (opts && opts.reset); state = s; if (opts && opts.reset){ flights.length = 0; moneyCount = null; }
    let walkAt = performance.now();
    if (first){ lastRollId = s.rollId; diceRest(s); }
    else if (s.rollId !== lastRollId){ lastRollId = s.rollId; throwDice(s); walkAt += reduce.matches ? 0 : DICE_TOTAL; }
    if (!first) popNewBuildings(s); else prevLevels = levelsOf(s);
    s.players.forEach(p => {
      const d = disp[p.id];
      if (!d || first){ disp[p.id] = {pos:p.pos, path:null}; return; }
      const lm = s.lastMove;
      if (lm && lm.seq !== lastSeq && lm.pid === p.id && lm.kind === "walk" && !reduce.matches){
        const steps = (lm.to - d.pos + N) % N;
        if (steps > 0 && steps <= 12){ const path = [d.pos]; for (let k = 1; k <= steps; k++) path.push((d.pos + k) % N);
          if (p.pos !== lm.to) path.push(p.pos);
          d.path = path; d.t0 = walkAt; d.hopsDone = 0; return; }
      }
      if (d.pos !== p.pos && !d.path){ d.pos = p.pos; playLanding(p.pos); }
      else if (d.path && d.path[d.path.length-1] !== p.pos) d.path.push(p.pos);
    });
    if (s.lastMove) lastSeq = s.lastMove.seq;
  }
  /* One reusable side canvas per seat for faded characters */
  const fadeLayers = [];
  function fadeLayer(idx, w, h){ let c = fadeLayers[idx]; if (!c) c = fadeLayers[idx] = document.createElement("canvas"); if (c.width !== w || c.height !== h){ c.width = w; c.height = h; } return c; }
  /* ---------- Festivals ----------
     Two poles with pennants and a banner across the outer part of the tile. When a game begins, they rise out of
     their tiles one after another, with a burst of confetti and a FESTIVAL! label (see celebrate below). */
  const festAnim = {};
  const FEST_COLORS = ["#e5484d", "#f2b51c", "#25a86a", "#2f7fe0", "#d4468c", "#f0832a", "#7c5cd6"];
  const easeBack = f => { f = Math.min(1, Math.max(0, f)); const c = 1.7; return 1 + (c + 1)*Math.pow(f - 1, 3) + c*Math.pow(f - 1, 2); };
  const festRise = (i, now) => festAnim[i] == null ? 1 : easeBack((now - festAnim[i])/700);
  function festPoles(i){ const r = tileRect(i), c = along(r, .16), ax = edgeDir(r.side) === "X" ? [1, 0] : [0, 1];
    return [[c[0] - ax[0]*.42, c[1] - ax[1]*.42], [c[0] + ax[0]*.42, c[1] + ax[1]*.42]]; }
  function drawFestival(i, now){
    const rise = festRise(i, now); if (rise <= .01) return;
    const [A, B] = festPoles(i), H = .95*rise, x = V.ctx, k = V.k;
    [A, B].forEach((p, n) => { const a = P(p[0], p[1], 0), b = P(p[0], p[1], H);
      x.strokeStyle = "#f4f6f8"; x.lineWidth = Math.max(1.5, k*.035); x.lineCap = "round"; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      x.fillStyle = "#c9cfd6"; x.beginPath(); x.ellipse(a[0], a[1], k*.05, k*.025, 0, 0, Math.PI*2); x.fill();
      const wave = Math.sin(now/260 + n*1.7 + i)*k*.04; x.fillStyle = FEST_COLORS[(i + n*3) % FEST_COLORS.length];
      x.beginPath(); x.moveTo(b[0], b[1]); x.quadraticCurveTo(b[0] + k*.14, b[1] + k*.04 + wave, b[0] + k*.3, b[1] + k*.08 + wave); x.lineTo(b[0], b[1] + k*.16); x.closePath(); x.fill(); });
    if (rise < .55) return;
    /* banner: hangs between the poles with a little sag and sway */
    const sway = Math.sin(now/600 + i)*k*.015, t1 = P(A[0], A[1], H*.9), t2 = P(B[0], B[1], H*.9), b1 = P(A[0], A[1], H*.66), b2 = P(B[0], B[1], H*.66), sag = k*.07;
    const mt = [(t1[0] + t2[0])/2, (t1[1] + t2[1])/2 + sag + sway], mb = [(b1[0] + b2[0])/2, (b1[1] + b2[1])/2 + sag + sway];
    x.fillStyle = "#f0832a"; x.beginPath(); x.moveTo(t1[0], t1[1]); x.quadraticCurveTo(mt[0], mt[1], t2[0], t2[1]); x.lineTo(b2[0], b2[1]); x.quadraticCurveTo(mb[0], mb[1], b1[0], b1[1]); x.closePath(); x.fill();
    x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = Math.max(1, k*.025); x.beginPath();
    const qp = (p0, m, p1, f) => [(1 - f)*(1 - f)*p0[0] + 2*(1 - f)*f*m[0] + f*f*p1[0], (1 - f)*(1 - f)*p0[1] + 2*(1 - f)*f*m[1] + f*f*p1[1]];
    for (const yy of [.3, .7]){ const a0 = [t1[0] + (b1[0] - t1[0])*yy, t1[1] + (b1[1] - t1[1])*yy], a1 = [t2[0] + (b2[0] - t2[0])*yy, t2[1] + (b2[1] - t2[1])*yy], am = [mt[0] + (mb[0] - mt[0])*yy, mt[1] + (mb[1] - mt[1])*yy];
      x.moveTo(a0[0], a0[1]); x.quadraticCurveTo(am[0], am[1], a1[0], a1[1]); }
    x.stroke();
    for (let d = 1; d <= 5; d++){ const f = d/6, a = qp(t1, mt, t2, f), b = qp(b1, mb, b2, f); x.fillStyle = "#ffffff"; x.beginPath(); x.arc((a[0] + b[0])/2, (a[1] + b[1])/2, k*.025, 0, Math.PI*2); x.fill(); }
    /* bunting under the banner */
    const s1 = P(A[0], A[1], H*.5), s2 = P(B[0], B[1], H*.5), ms = [(s1[0] + s2[0])/2, (s1[1] + s2[1])/2 + sag*1.2];
    x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 1; x.beginPath(); x.moveTo(s1[0], s1[1]); x.quadraticCurveTo(ms[0], ms[1], s2[0], s2[1]); x.stroke();
    for (let d = 1; d <= 6; d++){ const p = qp(s1, ms, s2, d/7); x.fillStyle = FEST_COLORS[(d + i) % FEST_COLORS.length]; x.beginPath(); x.moveTo(p[0] - k*.04, p[1]); x.lineTo(p[0] + k*.04, p[1]); x.lineTo(p[0], p[1] + k*.09); x.closePath(); x.fill(); }
  }
  /* confetti and the FESTIVAL! label, drawn over everything for a few seconds after a festival starts */
  function festivalBursts(now){
    const x = V.ctx, k = V.k;
    Object.keys(festAnim).forEach(key => {
      const i = +key, t = (now - festAnim[i])/1000; if (t < 0) return; if (t > 3){ delete festAnim[i]; return; }
      const r = tileRect(i), c = along(r, .3), lift = tileTop(i, now);
      for (let n = 0; n < 36; n++){
        const h1 = Math.sin(i*97 + n*13.1)*43758.5453 % 1, h2 = Math.sin(i*31 + n*7.7)*24634.6345 % 1, h3 = Math.sin(i*11 + n*3.3)*12345.678 % 1;
        const tt = Math.min(t, 2.2), X = c[0] + h1*.9*tt, Y = c[1] + h2*.9*tt, Z = Math.max(0, .9 + (1.6 + Math.abs(h3))*tt - 2.4*tt*tt);
        const p = P(X, Y, Z + lift); x.globalAlpha = Math.max(0, Math.min(1, (2.6 - t)/.6)); x.fillStyle = FEST_COLORS[n % FEST_COLORS.length];
        x.save(); x.translate(p[0], p[1]); x.rotate(now/150 + n); x.fillRect(-k*.035, -k*.018, k*.07, k*.036); x.restore();
      }
      if (t < 1.9){ const p = P(c[0], c[1], lift + 1.25 + t*.35), fs = Math.max(11, k*.32)*(t < .2 ? .6 + 2*t : 1);
        x.globalAlpha = t < .2 ? t/.2 : t > 1.3 ? Math.max(0, 1 - (t - 1.3)/.6) : 1;
        x.font = `400 ${fs}px Bungee, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
        x.lineWidth = Math.max(2, fs*.25); x.strokeStyle = "#7a2f12"; x.strokeText("FESTIVAL!", p[0], p[1]); x.fillStyle = "#ffffff"; x.fillText("FESTIVAL!", p[0], p[1]); }
      x.globalAlpha = 1;
    });
  }
  /* Busy while anything is still playing out: walking, dice, a cash stack in the air or a building popping up.
     Buttons, popups and bots wait for it. */
  /* noMoney: ignore cash stacks still waiting (the Chance card shows first, then the money) */
  function busy(noMoney){ const now = performance.now(); return Object.values(disp).some(d => d.path) || now < diceUntil
    || (!noMoney && flights.some(f => now < f.t0 + (f.dur || MONEY_FLY_MS))) || Object.values(buildPop).some(b => now < b.t + BUILD_POP_MS); }
  const OFFS = [[-.2,-.14],[.18,-.16],[-.14,.16],[.2,.12]];
  /* Height of a tile's top right now: tiles with someone on them rest a little lower, and dip when a character lands. */
  const pressT = {}; let occupied = new Set();
  function press(i){ pressT[i] = performance.now(); }
  function tileTop(i, now){
    let top = TILE_H - (occupied.has(i) ? TILE_REST : 0); const dt = now - (pressT[i] || -1e9);
    if (dt < 480){ const q = dt < 90 ? dt/90 : 1 - (dt - 90)/390; top -= TILE_DIP*Math.sin(q*Math.PI/2); }
    return top;
  }
  /* Draws fn with everything lifted to tile i's top */
  const onTile = (i, fn) => () => { V.lift = tileTop(i, performance.now()); fn(); V.lift = 0; };
  function stand(i, idx){ const r = tileRect(i); const a = r.side === "c" ? [(r.X0 + r.X1)/2, (r.Y0 + r.Y1)/2] : along(r, .5); const o = OFFS[idx % 4]; return [a[0] + o[0], a[1] + o[1]]; }
  function charPos(p, idx, now){
    const d = disp[p.id]; if (!d) return null;
    if (d.path && now < d.t0){ const a = stand(d.path[0], idx); return {X:a[0], Y:a[1], z:tileTop(d.path[0], now), walking:false, tile:d.path[0]}; }   // waiting for the dice
    if (d.path){
      const el = now - d.t0, k = Math.floor(el / HOP);
      if (k >= d.path.length - 1){ d.pos = d.path[d.path.length-1]; d.path = null; press(d.pos); playLanding(d.pos); }
      else {
        if (k > (d.hopsDone||0)){ d.hopsDone = k; sfx("hop"); press(d.path[k]); }
        const f = (el % HOP)/HOP, a = stand(d.path[k], idx), b = stand(d.path[k+1], idx);
        const lift = tileTop(d.path[k], now) + (tileTop(d.path[k+1], now) - tileTop(d.path[k], now))*f;
        return {X:a[0] + (b[0]-a[0])*f, Y:a[1] + (b[1]-a[1])*f, z:lift + Math.sin(Math.PI*f)*.25, walking:true, tile:d.path[k+1]};
      }
    }
    const a = stand(d.pos, idx); return {X:a[0], Y:a[1], z:tileTop(d.pos, now), walking:false, tile:d.pos};
  }
  const TILE_ORDER = TILES.map((t, i) => i).sort((a, b) => { const ra = tileRect(a), rb = tileRect(b); return (ra.X0 + ra.X1 + ra.Y0 + ra.Y1) - (rb.X0 + rb.X1 + rb.Y0 + rb.Y1); });
  const SPECIAL = {start:"#7fcf6a", jail:"#6cc6e8", expo:"#c9a4ec", jet:"#b9c3cc", fortune:"#f6e6c8", tax:"#efe4d4"};
  /* One tile. From the outer edge toward the road: owner band, buildings, name, price strip. */
  function drawTileTop(i, now){
    const t = TILES[i], r = tileRect(i), st = state.own[i], g = .035;
    const T = {X0:r.X0 + g, X1:r.X1 - g, Y0:r.Y0 + g, Y1:r.Y1 - g, side:r.side}, e = edgeDir(r.side);
    const top = tileTop(i, now), base = t.type === "city" ? GROUPS[t.g].tint : t.type === "beach" ? "#f3d79a" : SPECIAL[t.type];
    box3(T.X0, T.Y0, T.X1 - T.X0, T.Y1 - T.Y0, top, shade(base, -.18));
    V.lift = top;
    rect3(T.X0, T.Y0, T.X1, T.Y1, 0, base);
    if (t.type === "city"){
      const o = sub(T, 0, .1); rect3(o.X0, o.Y0, o.X1, o.Y1, .002, st ? byId(state, st.o).color : shade(GROUPS[t.g].color, .25));
      const nc = along(r, .62); const small = V.k < 30;
      const nm = small ? t.code : t.name.toUpperCase();
      ptext(nc[0], nc[1], e, nm, fitSize(nm, small ? .26 : .19), 900, shade(GROUPS[t.g].color, -.55), .84);
    } else if (t.type === "beach"){
      const w = sub(T, 0, .3); rect3(w.X0, w.Y0, w.X1, w.Y1, .002, "#58b8e0");
      if (t.region && GROUPS[t.region]){ const band = sub(T, .71, .75); rect3(band.X0, band.Y0, band.X1, band.Y1, .0025, GROUPS[t.region].color); }   // which coastal stack it belongs to
      const foam = sub(T, .28, .34); rect3(foam.X0, foam.Y0, foam.X1, foam.Y1, .003, "#e8f7fd");
      for (let k = 0; k < 2; k++){ const p0 = along(r, .07 + k*.11); const ends = e === "X" ? [[p0[0] - .3, p0[1]], [p0[0] + .3, p0[1]]] : [[p0[0], p0[1] - .3], [p0[0], p0[1] + .3]];
        const p1 = P(ends[0][0], ends[0][1], .004), p2 = P(ends[1][0], ends[1][1], .004); V.ctx.strokeStyle = "rgba(255,255,255,.75)"; V.ctx.lineWidth = Math.max(1, V.k*.03); V.ctx.beginPath(); V.ctx.moveTo(p1[0], p1[1]); V.ctx.quadraticCurveTo((p1[0]+p2[0])/2, (p1[1]+p2[1])/2 - V.k*.06, p2[0], p2[1]); V.ctx.stroke(); }
      if (st) rect3(T.X0, T.Y0, T.X1, T.Y1, .004, null, byId(state, st.o).color, Math.max(2, V.k*.07));
      const nc = along(r, .62); const bn = V.k < 30 ? t.code : t.name.replace(" Beach", "").toUpperCase(); ptext(nc[0], nc[1], e, bn, fitSize(bn, V.k < 30 ? .26 : .19), 900, "#7a5521", .84);
    } else if (t.type === "fortune"){
      const c0 = along(r, .45), rad = .32, cols = ["#e5484d","#f2b51c","#25a86a","#2f7fe0","#d4468c","#f0832a"], rot = now/2400;
      for (let k = 0; k < 6; k++){ const pts = [P(c0[0], c0[1], .004)]; for (let q = 0; q <= 6; q++){ const an = rot + (k + q/6)*Math.PI/3; pts.push(P(c0[0] + Math.cos(an)*rad, c0[1] + Math.sin(an)*rad, .004)); } poly(pts, cols[k]); }
      const cc = P(c0[0], c0[1], .005); V.ctx.fillStyle = "#fff"; V.ctx.beginPath(); V.ctx.ellipse(cc[0], cc[1], V.k*.08, V.k*.04, 0, 0, Math.PI*2); V.ctx.fill();
      const nc = along(r, .86); ptext(nc[0], nc[1], e, "CHANCE", .15, 900, "#8a5a20", .9);
    } else if (t.type === "tax"){
      const nc = along(r, .8); ptext(nc[0], nc[1], e, t.id === "income" ? "INCOME TAX" : "LUXURY TAX", .12, 900, "#6a4a32", .9);
    } else if (t.type === "start"){
      for (let k = 0; k < 6; k++) for (let q = 0; q < 2; q++) if ((k + q) % 2 === 0) rect3(r.X0 + .15 + k*.22, r.Y0 + .15 + q*.18, r.X0 + .37 + k*.22, r.Y0 + .33 + q*.18, .003, "#ffffff");
      ptext(r.X0 + .8, r.Y0 + 1.0, "X", "START", .3, 400, "#ffffff", 1.3, "Bungee, sans-serif");
      ptext(r.X0 + .95, r.Y0 + 1.32, "X", "+" + money(rules(state).lapBonus), .18, 900, "#1f5c2c", 1.2);
    } else if (t.type === "jail"){
      /* Lost Island: shallow water with ripples and a sandy island. Palms and the label are drawn in cornerProps. */
      const cx = r.X0 + D/2, cy = r.Y0 + D/2, ring = (rx, ry, wob) => { const pts = []; for (let k = 0; k < 18; k++){ const a = k*Math.PI/9, w = 1 + wob*Math.sin(k*2.3); pts.push(P(cx + Math.cos(a)*rx*w, cy + Math.sin(a)*ry*w, .004)); } return pts; };
      rect3(T.X0 + .06, T.Y0 + .06, T.X1 - .06, T.Y1 - .06, .002, "#86d3ef");
      [[.25, .3], [1.3, .35], [.35, 1.3], [1.25, 1.25]].forEach(([dx, dy]) => { const p1 = P(r.X0 + dx - .14, r.Y0 + dy, .004), p2 = P(r.X0 + dx + .14, r.Y0 + dy, .004);
        V.ctx.strokeStyle = "rgba(255,255,255,.8)"; V.ctx.lineWidth = Math.max(1, V.k*.03); V.ctx.beginPath(); V.ctx.moveTo(p1[0], p1[1]); V.ctx.quadraticCurveTo((p1[0] + p2[0])/2, (p1[1] + p2[1])/2 - V.k*.05, p2[0], p2[1]); V.ctx.stroke(); });
      poly(ring(.6, .56, .06), "#bfe9f7"); poly(ring(.5, .46, .07), "#f3d79a"); poly(ring(.32, .3, .1), "#e8c47e");
    } else if (t.type === "expo"){
      ptext(r.X0 + 1.05, r.Y0 + .8, "Y", "GRAND EXPO", .2, 400, "#4d2c7a", 1.4, "Bungee, sans-serif");
    } else if (t.type === "jet"){
      const p1 = P(r.X0 + .25, r.Y0 + .8, .003), p2 = P(r.X1 - .25, r.Y0 + .8, .003);
      rect3(r.X0 + .15, r.Y0 + .62, r.X1 - .15, r.Y0 + .98, .002, "#6f7b86");
      V.ctx.setLineDash([V.k*.12, V.k*.1]); V.ctx.strokeStyle = "#fff"; V.ctx.lineWidth = Math.max(1, V.k*.03); V.ctx.beginPath(); V.ctx.moveTo(p1[0], p1[1]); V.ctx.lineTo(p2[0], p2[1]); V.ctx.stroke(); V.ctx.setLineDash([]);
      ptext(r.X0 + .8, r.Y0 + 1.35, "X", "JET PORT", .24, 400, "#2c3a46", 1.3, "Bungee, sans-serif");
    }
    /* price strip along the inner edge: blank until the city is bought, then the rent in the owner's color, same size on every tile */
    if (t.type === "city" || t.type === "beach"){
      const pl = sub(T, .75, .97), ins = e === "X" ? {X0:pl.X0 + .05, X1:pl.X1 - .05, Y0:pl.Y0, Y1:pl.Y1} : {X0:pl.X0, X1:pl.X1, Y0:pl.Y0 + .05, Y1:pl.Y1 - .05};
      const pc = along(r, .86);
      if (st){ rect3(ins.X0, ins.Y0, ins.X1, ins.Y1, .004, byId(state, st.o).color); ptext(pc[0], pc[1], e, money(rentOf(state, i)).replace("₹", ""), .24, 900, "#ffffff", .8); }
      else rect3(ins.X0, ins.Y0, ins.X1, ins.Y1, .004, "#fffdf6");   // prices stay hidden until someone buys the city
    }
    /* Chance events: an epidemic tints the whole region green, a blackout darkens one city */
    if (t.type === "city"){ const rd = state.round || 1;
      if (state.epidemics && state.epidemics[t.g] >= rd){ rect3(T.X0, T.Y0, T.X1, T.Y1, .0052, "rgba(110,190,60,.45)"); const ec = along(r, .4); ptext(ec[0], ec[1], e, "EPIDEMIC", .13, 900, "#1f4d12", .9); }
      if (state.blackouts && state.blackouts[i] >= rd){ rect3(T.X0, T.Y0, T.X1, T.Y1, .0054, "rgba(10,16,30,.58)"); const bc = along(r, .4); ptext(bc[0], bc[1], e, "NO POWER", .13, 900, "#ffe27a", .9); } }
    if (state.expo === i) rect3(T.X0, T.Y0, T.X1, T.Y1, .006, null, "#f2b51c", Math.max(2, V.k*.06));
    if (selectable && selectable.has(i)) rect3(T.X0, T.Y0, T.X1, T.Y1, .008, null, "#ff6a3d", 2 + (.5 + .5*Math.sin(now/220))*3);
    if (i === hover && selectable && selectable.has(i)) rect3(T.X0, T.Y0, T.X1, T.Y1, .009, null, "#1c2a33", 2.5);
    V.lift = 0;
  }
  function cornerProps(items){
    items.push({dep:S - D/2 + S - D/2 + .2, f:onTile(0, () => { flag(S - .35, S - D + .3, "#e5484d", .9); flag(S - D + .3, S - .35, "#2f7fe0", .9); })});
    /* Lost Island: palms on the sand, then the name written straight across the screen */
    items.push({dep:D/2 + S - D/2 - .6, f:onTile(8, () => { const cx = D/2, cy = S - D/2; palm(cx - .32, cy - .3, 1.05); palm(cx + .02, cy - .4, .8); bush(cx - .38, cy + .02, .7); })});
    items.push({dep:D/2 + S - D/2 + .6, f:onTile(8, () => { const cx = D/2, cy = S - D/2;
      const p = P(cx + .42, cy + .42, .05), x = V.ctx, fs = Math.max(9, V.k*.25);
      x.save(); x.font = `400 ${fs}px Bungee, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
      x.lineWidth = Math.max(2, fs*.28); x.strokeStyle = "#1f4f63"; x.strokeText("LOST ISLAND", p[0], p[1]); x.fillStyle = "#ffffff"; x.fillText("LOST ISLAND", p[0], p[1]); x.restore(); })});
    items.push({dep:.9 + .9, f:onTile(16, () => { const c = P(.75, .75, 0), top = P(.75, .75, 1.05), R = V.k*.52, x = V.ctx;
      x.strokeStyle = "#6b4c9a"; x.lineWidth = Math.max(2, V.k*.05); x.beginPath(); x.moveTo(c[0] - V.k*.3, c[1]); x.lineTo(top[0], top[1]); x.lineTo(c[0] + V.k*.3, c[1]); x.stroke();
      x.strokeStyle = "#f2b51c"; x.beginPath(); x.arc(top[0], top[1], R, 0, Math.PI*2); x.stroke();
      const cols = ["#e5484d","#2f7fe0","#25a86a","#f0832a","#d4468c","#7c5cd6","#f2b51c","#1f9c8c"];
      for (let k = 0; k < 8; k++){ const a = k*Math.PI/4 + performance.now()/4000; x.strokeStyle = "rgba(107,76,154,.6)"; x.lineWidth = 1; x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(top[0] + Math.cos(a)*R, top[1] + Math.sin(a)*R); x.stroke();
        x.fillStyle = cols[k]; x.beginPath(); x.roundRect(top[0] + Math.cos(a)*R - V.k*.07, top[1] + Math.sin(a)*R, V.k*.14, V.k*.12, V.k*.03); x.fill(); } })});
    items.push({dep:S - D/2 + D/2 + .3, f:onTile(24, () => { box3(S - .55, .3, .3, .3, .9, "#dfe5ea"); box3(S - .62, .23, .44, .44, .2, "#7fb6d9", .9);
      const c = P(S - D/2 - .1, .8, .45), x = V.ctx, k = V.k, fly = Math.sin(performance.now()/700)*k*.05;
      x.save(); x.translate(c[0], c[1] + fly); x.rotate(-.46); x.fillStyle = "#ffffff"; x.beginPath(); x.ellipse(0, 0, k*.55, k*.1, 0, 0, Math.PI*2); x.fill();
      x.fillStyle = "#2f7fe0"; x.beginPath(); x.moveTo(-k*.05, 0); x.lineTo(-k*.25, k*.42); x.lineTo(k*.1, 0); x.closePath(); x.fill(); x.beginPath(); x.moveTo(-k*.05, 0); x.lineTo(-k*.2, -k*.32); x.lineTo(k*.08, 0); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(-k*.42, 0); x.lineTo(-k*.55, -k*.2); x.lineTo(-k*.35, 0); x.closePath(); x.fill(); x.fillStyle = "#cfe8f7"; for (let w = 0; w < 5; w++){ x.beginPath(); x.arc(k*(.05 + w*.07), -k*.02, k*.018, 0, Math.PI*2); x.fill(); } x.restore(); })});
    for (let i = 0; i < N; i++){ const t = TILES[i]; if (t.type === "beach"){ const r = tileRect(i), a = along(r, .42), e = edgeDir(r.side);
      const pp = e === "X" ? [a[0] + .28, a[1]] : [a[0], a[1] + .28]; items.push({dep:pp[0] + pp[1], f:onTile(i, () => palm(pp[0], pp[1], .7))}); } }
    for (let i of [11, 28]){ const r = tileRect(i), a = along(r, .38); items.push({dep:a[0] + a[1], f:onTile(i, () => { box3(a[0] - .18, a[1] - .14, .36, .28, .16, "#ffffff"); box3(a[0] - .16, a[1] - .12, .32, .24, .06, "#f2e9d8", .16); ptext(a[0], a[1], edgeDir(r.side), "₹", .12, 900, "#c9423a", .3); })}); }
  }
  /* Money piles, one per seat, next to that seat's corner panel: top-left, top-right, bottom-right, bottom-left */
  const PILES = [{X:-2.2, Y:S/2 - .6}, {X:S/2 - .7, Y:-2.1}, {X:S + .55, Y:S/2 - .5}, {X:S/2 - .8, Y:S + .5}];
  const SCENERY = [
    /* only outside the board: the grass in the middle stays clear for the dice and buttons */
    {k:"pine", X:-.7, Y:1.2, s:.9}, {k:"pine", X:-.55, Y:2.1, s:.7}, {k:"palm", X:S + .6, Y:S - 1.6, s:.9}, {k:"pine", X:1.4, Y:-.6, s:.8}, {k:"bush", X:S - 1.2, Y:S + .55, s:1.1}
  ];
  function draw(now){
    if (!state){ requestAnimationFrame(draw); return; }
    V.ctx = ctx; ctx.clearRect(0, 0, W, H);
    /* board slab */
    poly([P(0,S,0), P(S,S,0), P(S,S,-TH), P(0,S,-TH)], "#c9b99f"); poly([P(S,S,0), P(S,0,0), P(S,0,-TH), P(S,S,-TH)], "#ae9e84");
    rect3(0, 0, S, S, 0, "#a99b82");
    rect3(D, D, S-D, S-D, .001, "#9aa3ab");
    const g0 = D + ROAD, g1 = S - D - ROAD; rect3(g0, g0, g1, g1, .002, "#8fcf6b");
    for (let k = 0; k < 40; k++){ const X = g0 + .2 + ((k*37) % 97)/97*(g1 - g0 - .4), Y = g0 + .2 + ((k*61) % 89)/89*(g1 - g0 - .4); const p = P(X, Y, .003); ctx.fillStyle = "#7cc05a"; ctx.beginPath(); ctx.ellipse(p[0], p[1], V.k*.08, V.k*.04, 0, 0, Math.PI*2); ctx.fill(); }
    ctx.setLineDash([V.k*.18, V.k*.16]); ctx.strokeStyle = "#f5f5f0"; ctx.lineWidth = Math.max(1, V.k*.035);
    const m0 = D + ROAD/2, m1 = S - D - ROAD/2; ctx.beginPath(); [P(m0,m0,.003), P(m1,m0,.003), P(m1,m1,.003), P(m0,m1,.003)].forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    occupied = new Set(state.players.filter(p => !p.bankrupt && disp[p.id] && !disp[p.id].path).map(p => disp[p.id].pos));
    TILE_ORDER.forEach(i => drawTileTop(i, now));
    /* standing things, painter sorted */
    const items = [];
    state.players.forEach((p, idx) => { const pile = PILES[idx]; if (!pile || p.bankrupt) return; const d = disp[p.id]; if (!d) return;
      const target = p.cash + cashPending(idx); d.cash = d.cash == null ? target : d.cash + (target - d.cash)*.06; if (Math.abs(target - d.cash) < 1) d.cash = target;
      items.push({dep:pile.X + pile.Y + 1, f:() => moneyPile(pile.X, pile.Y, d.cash)}); });
    SCENERY.forEach(o => items.push({dep:o.X + o.Y, f:() => o.k === "pine" ? pine(o.X, o.Y, o.s) : o.k === "palm" ? palm(o.X, o.Y, o.s) : bush(o.X, o.Y, o.s)}));
    cornerProps(items);
    (state.festivals || []).forEach(i => { const p = festPoles(i); items.push({dep:Math.min(p[0][0] + p[0][1], p[1][0] + p[1][1]) - .05, f:onTile(i, () => drawFestival(i, now))}); });
    Object.keys(state.own).forEach(k => { const i = +k, st = state.own[i]; if (!st || TILES[i].type !== "city") return; const owner = byId(state, st.o); if (!owner) return; const r = tileRect(i), a = along(r, .3);
      items.push({dep:a[0] + a[1], f:onTile(i, () => { popBuilding(i, st.l, a[0], a[1], owner.color, edgeDir(r.side));
        if (state.expo === i){ const p = P(a[0], a[1], st.l === 5 ? 1.55 : 1.0), x = V.ctx; x.fillStyle = "#f2b51c"; x.beginPath(); x.arc(p[0], p[1], V.k*.16, 0, Math.PI*2); x.fill(); x.fillStyle = "#1c2a33"; x.font = `900 ${Math.max(8, V.k*.15)}px Figtree, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("2×", p[0], p[1] + .5); } })}); });
    Object.keys(state.own).forEach(k => { const i = +k, st = state.own[i]; if (!st || TILES[i].type !== "beach") return; const owner = byId(state, st.o); const r = tileRect(i), a = along(r, .42), e = edgeDir(r.side);
      const pp = e === "X" ? [a[0] - .22, a[1]] : [a[0], a[1] - .22]; items.push({dep:pp[0] + pp[1], f:onTile(i, () => popResort(i, pp[0], pp[1], owner.color))}); });
    const cur = state.players[state.turn];
    state.players.forEach((p, idx) => { if (p.bankrupt) return; const cp = charPos(p, idx, now); if (!cp) return;
      items.push({dep:cp.X + cp.Y + .05, f:() => { const b = P(cp.X, cp.Y, cp.z), h = V.k*1.05;
        const y0 = b[1] - (cp.walking ? Math.abs(Math.sin(now/70))*h*.04 : 0), opts = {facing:facingOn(cp.tile), t:now/1000 + idx*1.3, walking:cp.walking, ring:p.color};
        /* Only the player whose turn it is shows at full strength. Everyone else is drawn on a side layer
           and pasted at IDLE_ALPHA, so the whole figure fades evenly. */
        if (p === cur || state.status === "over") drawTycoon(V.ctx, b[0], y0, h, p.look ?? idx, opts);
        else {
          const dpr = Math.min(2, devicePixelRatio || 1), w = Math.ceil(h*1.4), ht = Math.ceil(h*1.3), lay = fadeLayer(idx, w*dpr, ht*dpr), lc = lay.getContext("2d");
          lc.setTransform(dpr, 0, 0, dpr, 0, 0); lc.clearRect(0, 0, w, ht); drawTycoon(lc, w/2, ht - h*.12, h, p.look ?? idx, opts);
          V.ctx.globalAlpha = IDLE_ALPHA; V.ctx.drawImage(lay, b[0] - w/2, y0 - ht + h*.12, w, ht); V.ctx.globalAlpha = 1;
        }
        if (p === cur && !cp.walking) headPt = [b[0], b[1] - h*1.12];
        if (p === cur && (state.status === "playing" || state.status === "demo")){ const y = b[1] - h*1.12 - Math.abs(Math.sin(now/320))*V.k*.12, x = V.ctx, s = V.k*.14;
          x.fillStyle = p.color; x.beginPath(); x.moveTo(b[0], y + s*1.6); x.lineTo(b[0] - s, y); x.lineTo(b[0] - s*.55, y - s*.6); x.lineTo(b[0] + s*.55, y - s*.6); x.lineTo(b[0] + s, y); x.closePath(); x.fill();
          x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.moveTo(b[0], y + s*1.6); x.lineTo(b[0] - s, y); x.lineTo(b[0] - s*.2, y); x.closePath(); x.fill(); } }}); });
    headPt = null; items.sort((a, b) => a.dep - b.dep).forEach(it => it.f());
    festivalBursts(now);
    drawDice(now);
    if (thought && headPt && !busy()) thinkBubble(headPt[0], headPt[1], thought, now);
    drawFlights(now); drawMoneyCount(now);
    const isBusy = busy(); if (wasBusy && !isBusy && onBusyEnd) onBusyEnd(); wasBusy = isBusy;
    requestAnimationFrame(draw);
  }
  /* A cartoon thought bubble above the current player while they decide: "Thinking about buying..." with bobbing dots */
  function thinkBubble(x, y, text, now){
    const c = V.ctx, f = Math.max(11, Math.min(17, V.k*.2)), dots = ".".repeat(1 + Math.floor(now/400) % 3);
    c.save(); c.font = `700 ${f}px Figtree, sans-serif`;
    const lines = text.length > 18 ? splitTwo(text) : [text], w = Math.max(...lines.map(l => c.measureText(l + "...").width)) + f*2.2, h = lines.length*f*1.25 + f*1.4;
    const cx = Math.max(w/2 + 6, Math.min(W - w/2 - 6, x + w*.18)), cy = Math.max(h/2 + 6, y - f*1.4 - h/2 + Math.sin(now/600)*2);
    c.shadowColor = "rgba(0,0,0,.25)"; c.shadowBlur = 10; c.shadowOffsetY = 3; c.fillStyle = "#ffffff";
    c.beginPath(); c.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(x + f*.5, y - f*.75, f*.32, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(x + f*.15, y - f*.15, f*.18, 0, Math.PI*2); c.fill();
    c.shadowColor = "transparent"; c.fillStyle = "#1c2a33"; c.textAlign = "center"; c.textBaseline = "middle";
    lines.forEach((l, k) => { const last = k === lines.length - 1, ly = cy + (k - (lines.length - 1)/2)*f*1.25;
      if (last){ const lw = c.measureText(l + "...").width; c.textAlign = "left"; c.fillText(l + dots, cx - lw/2, ly); c.textAlign = "center"; } else c.fillText(l, cx, ly); });
    c.restore();
  }
  function splitTwo(t){ const words = t.split(" "); let best = [t], diff = 1e9; for (let k = 1; k < words.length; k++){ const a = words.slice(0, k).join(" "), b = words.slice(k).join(" "), d = Math.abs(a.length - b.length); if (d < diff){ diff = d; best = [a, b]; } } return best; }
  /* ---------- Money flights ----------
     When someone pays for a city, a cash stack fades in at their pile, slides to the middle of the board and fades out there.
     When they pay another player (a buyout), it slides from the payer's pile through the middle to the other player's pile.
     MONEY_FLY_MS is the whole trip. */
  const MONEY_FLY_MS = 1800;
  const pileCenter = idx => { const p = PILES[idx]; return p ? [p.X + .8, p.Y + .5] : [S/2, S/2]; };
  /* Payments play one at a time, in order. Each waits for the walk, the dice and any Chance card in the middle. */
  const FLIGHT_GAP = 250;
  function cashPending(idx){ const now = performance.now(); let a = 0;
    flights.forEach(f => { const end = f.t0 + (f.dur || MONEY_FLY_MS); if (f.from === idx && !f.started) a += f.amt; if (f.to === idx && (!f.started || now < end)) a -= f.amt; }); return a; }
  let moneyHold = () => false;
  function drawFlights(now){
    for (let k = flights.length - 1; k >= 0; k--){ const f = flights[k]; if (f.started && now >= f.t0 + (f.dur || MONEY_FLY_MS)) flights.splice(k, 1); }
    const f = flights[0]; if (!f) return;
    if (!f.started){
      if (Object.values(disp).some(d => d.path) || now < diceUntil || moneyHold()){ f.t0 = now + FLIGHT_GAP; return; }
      if (now < f.t0) return;
      f.started = true; f.t0 = now; moneyCount = {amt:f.amt, t0:now, dur:f.dur || MONEY_FLY_MS, f};
    }
    const t = (now - f.t0)/(f.dur || MONEY_FLY_MS); if (t < 0 || t >= 1) return;
    {
      const mid = [S/2, S/2]   /* the center of the board */, a = f.from == null ? mid : pileCenter(f.from), b = f.to == null ? mid : pileCenter(f.to);
      const ease = u => u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
      let X, Y, z, alpha;
      if (f.from == null){ // from the bank: appears in the middle, slides to the player's pile
        const u = ease(Math.min(1, Math.max(0, (t - .15)/.85))); X = a[0] + (b[0] - a[0])*u; Y = a[1] + (b[1] - a[1])*u; z = .3 + Math.sin(Math.PI*u)*.9;
        alpha = t < .15 ? t/.15 : t > .85 ? Math.max(0, 1 - (t - .85)/.15) : 1;
      } else if (f.to == null){   // to the bank: in, slide to the middle, hold, fade out
        const u = ease(Math.min(1, t/.55)); X = a[0] + (mid[0] - a[0])*u; Y = a[1] + (mid[1] - a[1])*u; z = .3 + Math.sin(Math.PI*u)*.9 + (t > .55 ? (t - .55)*.8 : 0);
        alpha = t < .12 ? t/.12 : t > .7 ? Math.max(0, 1 - (t - .7)/.3) : 1;
      } else {             // to a player: payer to the middle, then on to the other pile
        const leg = t < .5 ? 0 : 1, u = ease(leg ? (t - .5)/.5 : t/.5), p0 = leg ? mid : a, p1 = leg ? b : mid;
        X = p0[0] + (p1[0] - p0[0])*u; Y = p0[1] + (p1[1] - p0[1])*u; z = .3 + Math.sin(Math.PI*u)*.8;
        alpha = t < .12 ? t/.12 : t > .85 ? Math.max(0, 1 - (t - .85)/.15) : 1;
      }
      const c = V.ctx; c.save(); c.globalAlpha = alpha;
      for (let l = 0; l < 5; l++) box3(X - .4, Y - .22, .8, .44, .07, l % 2 ? "#6cbf58" : "#5aad49", z + l*.07);
      const top = z + .35; poly([P(X - .08, Y - .22, top), P(X + .08, Y - .22, top), P(X + .08, Y + .22, top), P(X - .08, Y + .22, top)], "#e9e2c0");
      c.restore();
    }
  }
  /* ================= DICE =================
     Two dice drawn as real 3D cubes on the grass. When someone rolls, they are thrown from that player's corner,
     tumble and bounce across the board and land in the middle showing the roll. The character starts walking once
     they land (DICE_MS). Faces: 1 top, 6 bottom, 2 and 5, 3 and 4 opposite, like a real die. */
  const DICE_MS = 1150, DIE = .3;                       // throw time, and half the die size in board units
  const DICE_HOLD = 750, DICE_FADE = 250;               // how long the dice stay after landing, then fade away before the walk
  const DICE_TOTAL = DICE_MS + DICE_HOLD + DICE_FADE;
  const DICE_REST = [[S*.515 - .55, S*.515 + .55], [S*.515 + .55, S*.515 - .55]];   // where the two dice settle, just above the buttons
  let lastRollId = null, diceUntil = 0;
  const dice = [{}, {}];
  const FACES = [   // normal, two edge directions, value
    {n:[0, 0, 1], u:[1, 0, 0], v:[0, 1, 0], val:1}, {n:[0, 0, -1], u:[1, 0, 0], v:[0, 1, 0], val:6},
    {n:[1, 0, 0], u:[0, 1, 0], v:[0, 0, 1], val:2}, {n:[-1, 0, 0], u:[0, 1, 0], v:[0, 0, 1], val:5},
    {n:[0, 1, 0], u:[1, 0, 0], v:[0, 0, 1], val:3}, {n:[0, -1, 0], u:[1, 0, 0], v:[0, 0, 1], val:4}];
  const PIP_AT = {1:[[0, 0]], 2:[[-.5, -.5], [.5, .5]], 3:[[-.5, -.5], [0, 0], [.5, .5]], 4:[[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]],
    5:[[-.5, -.5], [.5, -.5], [0, 0], [-.5, .5], [.5, .5]], 6:[[-.5, -.55], [.5, -.55], [-.5, 0], [.5, 0], [-.5, .55], [.5, .55]]};
  const mul = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0]*B[0][j] + r[1]*B[1][j] + r[2]*B[2][j]));
  const app3 = (M, v) => [M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2], M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2], M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2]];
  function rot(ax, a){ const [x, y, z] = ax, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [[t*x*x + c, t*x*y - s*z, t*x*z + s*y], [t*x*y + s*z, t*y*y + c, t*y*z - s*x], [t*x*z - s*y, t*y*z + s*x, t*z*z + c]]; }
  /* Turns the die so face "val" points up, then spins it around the vertical by yaw */
  function faceUp(val, yaw){
    const R = {1:rot([1, 0, 0], 0), 6:rot([1, 0, 0], Math.PI), 2:rot([0, 1, 0], -Math.PI/2), 5:rot([0, 1, 0], Math.PI/2), 3:rot([1, 0, 0], Math.PI/2), 4:rot([1, 0, 0], -Math.PI/2)}[val];
    return mul(rot([0, 0, 1], yaw), R);
  }
  /* A little seeded random, so every player sees the same throw */
  const rand = seed => () => { seed = (seed*16807) % 2147483647; return seed / 2147483647; };
  /* Between rolls the board stays clear: no dice until someone rolls */
  function diceRest(){ dice[0] = {}; dice[1] = {}; counter = null; }
  function throwDice(s){
    const seat = Math.max(0, s.players.findIndex(p => p.id === s.roller)), pile = PILES[seat] || PILES[2], now = performance.now();
    moneyCount = null;   // a new roll clears the last amount
    (s.dice || [3, 4]).forEach((v, i) => {
      const r = rand(1013 + i*577 + (s.rollId || 0)*131);
      const ax = [r() - .5, r() - .5, r() - .5], L = Math.hypot(...ax) || 1;
      const X1 = DICE_REST[i][0] + (r() - .5)*.5, Y1 = DICE_REST[i][1] + (r() - .5)*.5;
      dice[i] = {X0:pile.X + .8 + (i ? .5 : -.5)*.6, Y0:pile.Y + .5 + (i ? -.5 : .5)*.6, X1, Y1, Rf:faceUp(v, r()*1.4 - .7), axis:ax.map(a => a/L), spin:(5 + r()*3)*Math.PI, t0:now + i*60};
    });
    diceUntil = now + (reduce.matches ? 0 : DICE_TOTAL + 40); if (!reduce.matches) diceSettled = false;
    /* the total shows over the dice when they land, and on the tile the player is heading to, until they get there */
    const lm = s.lastMove, target = lm && lm.pid === s.roller && lm.kind === "walk" ? lm.to : null;
    counter = {sum:(s.dice || [0, 0])[0] + (s.dice || [0, 0])[1], at:now + (reduce.matches ? 0 : DICE_MS), walkAt:now + (reduce.matches ? 0 : DICE_TOTAL), pid:s.roller, tile:target};
  }
  let diceSettled = true, counter = null;
  function drawDice(now){
    if (!state || state.status === "lobby") return;
    let landed = true;
    dice.forEach(d => {
      if (d.Rf == null) return;
      const u = reduce.matches ? 1 : Math.max(0, Math.min(1, (now - d.t0)/DICE_MS)); if (u < 1) landed = false;
      const gone = now - (d.t0 + DICE_MS + DICE_HOLD); if (gone >= DICE_FADE) return;   // faded away
      V.ctx.save(); V.ctx.globalAlpha = gone > 0 ? 1 - gone/DICE_FADE : 1;
      const e = 1 - Math.pow(1 - u, 3);                                     // fast out, slow settle
      const X = d.X0 + (d.X1 - d.X0)*e, Y = d.Y0 + (d.Y1 - d.Y0)*e;
      const z = 1.6*Math.pow(1 - u, 1.6)*Math.abs(Math.cos(3*Math.PI*u));  // bounces that die down
      const M = mul(d.Rf, rot(d.axis, d.spin*Math.pow(1 - u, 2)));        // tumbling, ending on the rolled face
      const c = V.ctx;
      /* soft shadow on the grass */
      const sh = P(X, Y, 0); c.fillStyle = `rgba(0,0,0,${.22*(1 - Math.min(1, z/1.6))})`; c.beginPath(); c.ellipse(sh[0], sh[1], V.k*DIE*1.5, V.k*DIE*.75, 0, 0, Math.PI*2); c.fill();
      /* the faces that look toward the camera, lit from the top left */
      FACES.forEach(F => {
        const n = app3(M, F.n); if (n[0] + n[1] + n[2] <= .02) return;
        const u3 = app3(M, F.u), v3 = app3(M, F.v), at = (a, b, out) => { const w = [0, 1, 2].map(j => (n[j]*out + u3[j]*a + v3[j]*b)*DIE); return P(X + w[0], Y + w[1], z + DIE + w[2]); };
        const lit = .72 + .28*Math.max(0, (n[2]*.85 - n[0]*.35 + n[1]*.15));
        const g = Math.round(255*lit), b = Math.round(250*lit);
        poly([at(-1, -1, 1), at(1, -1, 1), at(1, 1, 1), at(-1, 1, 1)], `rgb(${g},${g},${b})`, "rgba(40,50,60,.55)", Math.max(1, V.k*.02));
        PIP_AT[F.val].forEach(([pa, pb]) => { const pts = []; for (let k = 0; k < 12; k++){ const t = k*Math.PI/6; pts.push(at(pa*1.1 + Math.cos(t)*.17, pb*1.1 + Math.sin(t)*.17, 1.002)); } poly(pts, F.val === 1 ? "#e5484d" : "#1c2a33"); });
      });
      V.ctx.restore();
    });
    drawCounter(now);
    if (landed && !diceSettled){ diceSettled = true; sfx("hop"); }
  }
  /* The roll total: a white box over the dice, and a round badge on the tile the player is walking to.
     Both appear when the dice land and go away when the player arrives. */
  function drawCounter(now){
    const C = counter; if (!C || now < C.at) return;
    const d = disp[C.pid], walking = d && d.path;
    if (now > C.walkAt + 120 && !walking){ counter = null; return; }
    const pop = Math.min(1, (now - C.at)/220), sc = pop < 1 ? .6 + .4*(1 + 2.2*Math.pow(pop - 1, 3) + 1.2*Math.pow(pop - 1, 2)) : 1;
    const c = V.ctx, mid = (DICE_REST[0][0] + DICE_REST[1][0])/2, [x, y] = P(mid, mid, 1.55), f = Math.max(16, V.k*.36), w = f*1.6, h = f*1.4;
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.shadowColor = "rgba(0,0,0,.3)"; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = "#ffffff";
    c.beginPath(); c.roundRect(-w/2, -h/2, w, h, f*.3); c.fill(); c.shadowColor = "transparent";
    c.lineWidth = Math.max(2, f*.1); c.strokeStyle = "#1c2a33"; c.stroke();
    c.fillStyle = "#1c2a33"; c.font = `400 ${f}px Bungee, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(C.sum), 0, f*.06);
    c.restore();
    if (C.tile == null) return;
    /* outline the destination tile and float a badge over it */
    const r = tileRect(C.tile), z = tileTop(C.tile, now) + .005; const keep = V.lift; V.lift = 0;
    poly([P(r.X0, r.Y0, z), P(r.X1, r.Y0, z), P(r.X1, r.Y1, z), P(r.X0, r.Y1, z)], null, "#ffffff", Math.max(2, V.k*.06));
    const a = r.side === "c" ? [(r.X0 + r.X1)/2, (r.Y0 + r.Y1)/2] : along(r, .55), [bx, by] = P(a[0], a[1], z + .7 + Math.sin(now/260)*.05), br = Math.max(10, V.k*.2);
    V.lift = keep;
    c.save(); c.fillStyle = "#ffffff"; c.strokeStyle = "#c9423a"; c.lineWidth = Math.max(2, br*.16);
    c.beginPath(); c.arc(bx, by, br*sc, 0, Math.PI*2); c.fill(); c.stroke();
    c.fillStyle = "#1c2a33"; c.font = `900 ${br*1.05*sc}px Figtree, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(C.sum), bx, by + 1);
    c.restore();
  }
  /* The amount paid: big white digits over the middle of the board that count up while the cash slides in,
     then stay for MONEY_HOLD_MS after the stack has gone. */
  const MONEY_HOLD_MS = 2600;
  let moneyCount = null;
  function drawMoneyCount(now){
    const M = moneyCount; if (!M || now < M.t0) return;
    const el = now - M.t0, end = M.dur + MONEY_HOLD_MS; if (el > end + 400){ moneyCount = null; return; }
    const u = Math.min(1, el/(M.dur*.6)), shown = Math.round(M.amt*(1 - Math.pow(1 - u, 3)));
    const c = V.ctx, [x, y] = P(S/2, S/2, 2.1), fs = Math.max(20, Math.min(40, V.k*.5));
    c.save(); c.globalAlpha = el > end ? 1 - (el - end)/400 : Math.min(1, el/150);
    c.font = `400 ${fs}px Bungee, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = Math.max(4, fs*.2); c.lineJoin = "round"; c.strokeStyle = "rgba(20,32,40,.55)"; c.strokeText(moneyFull(shown), x, y);
    c.fillStyle = "#ffffff"; c.fillText(moneyFull(shown), x, y); c.restore();
  }
  /* New buildings pop up on their tile (a quick grow with a little overshoot) a moment after they are bought */
  const BUILD_POP_DELAY = 1500, BUILD_POP_MS = 450;
  let prevLevels = {}; const buildPop = {};
  const levelsOf = s => Object.fromEntries(Object.entries(s.own).map(([i, st]) => [i, st ? st.l : 0]));
  function popNewBuildings(s){
    const now = performance.now(), lv = levelsOf(s);
    Object.keys(lv).forEach(i => { if ((TILES[i].type === "city" || TILES[i].type === "beach") && lv[i] > (prevLevels[i] || 0) && !reduce.matches) buildPop[i] = {t:now + BUILD_POP_DELAY, from:prevLevels[i] || 0}; });
    prevLevels = lv;
  }
  /* A newly bought beach resort pops up the same way as a building */
  function popResort(i, X, Y, color){
    const P0 = buildPop[i], now = performance.now();
    if (P0 && now < P0.t) return;
    if (!P0 || now - P0.t >= BUILD_POP_MS){ if (P0) delete buildPop[i]; return resort(X, Y, .8, color); }
    const u = (now - P0.t)/BUILD_POP_MS, s = 1 + 2.7*Math.pow(u - 1, 3) + 1.7*Math.pow(u - 1, 2), [bx, by] = P(X, Y, 0), c = V.ctx;
    c.save(); c.translate(bx, by); c.scale(s, s); c.translate(-bx, -by); resort(X, Y, .8, color); c.restore();
  }
  function popBuilding(i, l, X, Y, color, e){
    const P0 = buildPop[i], now = performance.now();
    if (!P0) return building(l, X, Y, color, e);
    if (now < P0.t){ if (P0.from) building(P0.from, X, Y, color, e); return; }
    const u = (now - P0.t)/BUILD_POP_MS; if (u >= 1){ delete buildPop[i]; return building(l, X, Y, color, e); }
    const s = 1 + 2.7*Math.pow(u - 1, 3) + 1.7*Math.pow(u - 1, 2), [bx, by] = P(X, Y, 0), c = V.ctx;
    c.save(); c.translate(bx, by); c.scale(s, s); c.translate(-bx, -by); building(l, X, Y, color, e); c.restore();
  }
  function hit(mx, my){
    const a = (mx - V.ox)/V.k, b = (my - V.oy + TILE_H*V.k)*2/V.k, X = (a + b)/2, Y = (b - a)/2;
    for (let i = 0; i < N; i++){ const r = tileRect(i); if (X >= r.X0 && X <= r.X1 && Y >= r.Y0 && Y <= r.Y1) return i; }
    return -1;
  }
  let clickCb = null;
  cv.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); V.ctx = ctx; hover = hit(e.clientX - r.left, e.clientY - r.top); cv.style.cursor = hover >= 0 && selectable && selectable.has(hover) ? "pointer" : "default"; });
  cv.addEventListener("pointerleave", () => { hover = -1; });
  cv.addEventListener("click", e => { const r = cv.getBoundingClientRect(); const i = hit(e.clientX - r.left, e.clientY - r.top); if (i >= 0 && clickCb) clickCb(i); });
  addEventListener("resize", resize);
  return { start(){ resize(); requestAnimationFrame(draw); }, setState, busy, resize,
    setSelectable(set){ selectable = set; },
    /* Pops the festival flags up on these tiles, one after another */
    celebrate(tiles){ const t0 = performance.now() + 450; (tiles || []).forEach((i, n) => { festAnim[i] = t0 + n*350; }); if ((tiles || []).length) setTimeout(() => sfx("festival"), 450); },
    /* Screen point (CSS px) just above tile i, for labels such as the sell tags */
    screenOf(i){ const r = tileRect(i), a = r.side === "c" ? [(r.X0 + r.X1)/2, (r.Y0 + r.Y1)/2] : along(r, .45); const keep = V.lift; V.lift = 0; const p = P(a[0], a[1], TILE_H + (i % 2 ? 1.3 : .5)); V.lift = keep; return p; },   /* neighbours alternate heights so labels do not overlap */
    setSel(i){ sel = i; },
    /* Text for the thinking bubble over the current player, or null to hide it */
    think(t){ thought = t || null; },
    /* Fly a cash stack from seat "from" to seat "to" (null = the bank, in the middle of the board) */
    moneyFly(from, to, amt, dur){ if (from < 0 && to < 0) return; flights.push({from:from < 0 ? null : from, to:to < 0 ? null : to, amt, t0:performance.now() + 320, dur}); },
    /* Money still on its way for seat idx: + what it hasn't paid out yet, - what it hasn't received yet */
    cashPending,
    holdMoney(fn){ moneyHold = fn; }, onClick(f){ clickCb = f; }, onIdle(f){ onBusyEnd = f; } };
})();

/* mini illustration for the build cards */
function levelArt(level, color, kind, zoom){
  zoom = zoom || 1;   // 2 draws it twice as big (the beach card)
  const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1), Wc = 130*zoom, Hc = 100*zoom; cv.width = Wc*dpr; cv.height = Hc*dpr;
  const c = cv.getContext("2d"); c.scale(dpr, dpr);
  const save = {ctx:V.ctx, k:V.k, ox:V.ox, oy:V.oy}; V.ctx = c; V.k = 46*zoom; V.ox = Wc/2; V.oy = 30*zoom;
  box3(0, 0, 1.2, 1.2, .1, kind === "beach" ? "#f3d79a" : "#8fcf6b", -.1);
  if (kind === "beach"){ rect3(0, .85, 1.2, 1.2, .001, "#58b8e0"); palm(1.0, .12, .7); resort(.55, .55, .95, color); }
  else building(level, .6, .6, color, "X");
  Object.assign(V, save); return cv;
}
