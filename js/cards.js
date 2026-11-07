"use strict";
/* ================= CHANCE CARD ART =================
   One small illustration per Chance card, drawn in code on a 240 x 170 canvas.
   To use your own picture instead, set a path in ASSETS.cards in config.js (same id as in CARDS).
   Each drawer gets the canvas context, the center point (x, y) and the card kind color. */

/* Little shape helpers */
function cRound(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function cFill(c, color, stroke, lw){ c.fillStyle = color; c.fill(); if (stroke){ c.strokeStyle = stroke; c.lineWidth = lw || 3; c.lineJoin = "round"; c.stroke(); } }
function cCircle(c, x, y, r, color, stroke, lw){ c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); cFill(c, color, stroke, lw); }
function cPoly(c, pts, color, stroke, lw){ c.beginPath(); pts.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); cFill(c, color, stroke, lw); }
function cText(c, txt, x, y, size, color, rot){ c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.font = `900 ${size}px Figtree, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = color; c.fillText(txt, 0, 0); c.restore(); }
function cStar(c, x, y, r, color){ const pts = []; for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, rr = k % 2 ? r*.45 : r; pts.push([x + Math.cos(a)*rr, y + Math.sin(a)*rr]); } cPoly(c, pts, color); }
function cStamp(c, txt, x, y, color, rot){ c.save(); c.translate(x, y); c.rotate(rot); cRound(c, -46, -16, 92, 32, 6); c.strokeStyle = color; c.lineWidth = 4; c.stroke(); cText(c, txt, 0, 1, 19, color); c.restore(); }
const INK = "#3a2a1c";

const CARD_ART = {
  shield(c, x, y){
    cPoly(c, [[x, y - 56], [x + 46, y - 40], [x + 40, y + 14], [x, y + 54], [x - 40, y + 14], [x - 46, y - 40]], "#2f7fe0", INK, 4);
    cPoly(c, [[x, y - 42], [x + 32, y - 31], [x + 28, y + 9], [x, y + 39], [x - 28, y + 9], [x - 32, y - 31]], "#6fb2ff");
    cStar(c, x, y - 4, 22, "#ffd23f");
  },
  freebuild(c, x, y){
    c.fillStyle = "#7cc36a"; c.fillRect(x - 70, y + 38, 140, 10);
    cRound(c, x - 40, y - 8, 80, 48, 3); cFill(c, "#f4ede0", INK, 3);
    cPoly(c, [[x - 50, y - 6], [x, y - 46], [x + 50, y - 6]], "#e5484d", INK, 3);
    cRound(c, x - 10, y + 12, 20, 28, 3); cFill(c, "#8a5a34", INK, 2);
    cRound(c, x - 32, y + 4, 14, 14, 2); cFill(c, "#9fd4ff", INK, 2); cRound(c, x + 18, y + 4, 14, 14, 2); cFill(c, "#9fd4ff", INK, 2);
    cCircle(c, x + 52, y - 38, 20, "#23915a", INK, 3); cText(c, "+1", x + 52, y - 37, 18, "#fff");
  },
  taxfree(c, x, y){
    c.save(); c.translate(x - 8, y); c.rotate(-.08);
    cRound(c, -42, -54, 84, 108, 6); cFill(c, "#ffffff", INK, 3);
    cText(c, "TAX", 0, -34, 22, INK);
    c.strokeStyle = "#b9b0a2"; c.lineWidth = 4; for (let k = 0; k < 4; k++){ c.beginPath(); c.moveTo(-28, -10 + k*15); c.lineTo(28 - (k % 2)*16, -10 + k*15); c.stroke(); }
    c.restore();
    cStamp(c, "WAIVED", x + 16, y + 14, "#23915a", -.35);
  },
  pass(c, x, y){
    cRound(c, x - 70, y - 38, 140, 76, 10); cFill(c, "#ffb347", INK, 3);
    cCircle(c, x - 70, y, 11, "#f6ead8"); cCircle(c, x + 70, y, 11, "#f6ead8");
    c.setLineDash([5, 5]); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 30, y - 32); c.lineTo(x + 30, y + 32); c.stroke(); c.setLineDash([]);
    cPoly(c, [[x - 48, y + 8], [x + 12, y + 8], [x + 2, y + 24], [x - 38, y + 24]], "#8a5a34", INK, 2.5);
    cPoly(c, [[x - 20, y + 4], [x - 20, y - 30], [x + 4, y + 4]], "#ffffff", INK, 2.5);
    cText(c, "FREE", x + 50, y, 15, INK, -Math.PI/2);
  },
  forward(c, x, y){
    cRound(c, x - 80, y + 14, 160, 30, 6); cFill(c, "#5d6b74");
    c.fillStyle = "#fff"; for (let k = 0; k < 4; k++) c.fillRect(x - 70 + k*40, y + 27, 22, 4);
    cPoly(c, [[x - 54, y - 30], [x + 14, y - 30], [x + 14, y - 52], [x + 62, y - 12], [x + 14, y + 28], [x + 14, y + 6], [x - 54, y + 6]], "#23915a", INK, 4);
    cText(c, "+4", x - 18, y - 12, 26, "#fff");
  },
  bonus(c, x, y){
    for (let k = 0; k < 4; k++){ cRound(c, x - 62, y + 26 - k*14, 92, 22, 4); cFill(c, k % 2 ? "#4cae5b" : "#5fc46e", INK, 2.5); }
    cCircle(c, x - 16, y - 21, 7, "#2f8a3e");
    [[x + 44, y + 30], [x + 56, y + 14], [x + 40, y - 2]].forEach(([a, b]) => { cCircle(c, a, b, 17, "#ffd23f", INK, 2.5); cText(c, "₹", a, b + 1, 18, "#a0700a"); });
  },
  bday(c, x, y){
    cRound(c, x - 56, y + 4, 112, 40, 6); cFill(c, "#f39ac2", INK, 3);
    cRound(c, x - 40, y - 26, 80, 32, 6); cFill(c, "#fff1d6", INK, 3);
    c.fillStyle = "#fff"; c.beginPath(); for (let k = 0; k < 6; k++) c.arc(x - 46 + k*18.4, y + 6, 9, 0, Math.PI); c.fill();
    [-22, 0, 22].forEach(dx => { cRound(c, x + dx - 4, y - 50, 8, 24, 2); cFill(c, "#6fb2ff", INK, 2); cPoly(c, [[x + dx, y - 66], [x + dx + 6, y - 54], [x + dx, y - 50], [x + dx - 6, y - 54]], "#ffb020"); });
  },
  jail(c, x, y){
    cRound(c, x - 90, y + 26, 180, 30, 4); cFill(c, "#2f7fe0");
    c.beginPath(); c.ellipse(x + 30, y + 28, 36, 10, 0, 0, Math.PI*2); cFill(c, "#f1d38b", INK, 2.5);
    c.strokeStyle = "#7a5230"; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 32, y + 24); c.quadraticCurveTo(x + 28, y, x + 40, y - 18); c.stroke();
    cPoly(c, [[x + 40, y - 18], [x + 66, y - 10], [x + 42, y - 14], [x + 58, y + 6], [x + 38, y - 12], [x + 20, y - 2]], "#3ea65a");
    [[x - 50, y - 38, 24], [x - 22, y - 46, 30], [x + 8, y - 38, 22]].forEach(([a, b, r]) => cCircle(c, a, b, r, "#69757e"));
    cPoly(c, [[x - 26, y - 22], [x - 12, y - 22], [x - 22, y - 4], [x - 10, y - 4], [x - 34, y + 22], [x - 26, y]], "#ffd23f", INK, 2);
  },
  quake(c, x, y){
    cRound(c, x - 36, y - 52, 72, 96, 4); cFill(c, "#b8c2c9", INK, 3);
    c.fillStyle = "#6b7880"; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) c.fillRect(x - 26 + k*20, y - 42 + r*20, 12, 12);
    c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 4, y - 52); c.lineTo(x - 6, y - 26); c.lineTo(x + 8, y - 8); c.lineTo(x - 4, y + 16); c.lineTo(x + 6, y + 44); c.stroke();
    c.lineWidth = 3; [[-70, -52], [52, 70]].forEach(([a, b]) => { for (let k = 0; k < 3; k++){ c.beginPath(); c.moveTo(x + a, y - 20 + k*16); c.lineTo(x + b, y - 20 + k*16); c.stroke(); } });
    cRound(c, x - 90, y + 44, 180, 8, 3); cFill(c, "#8a5a34");
  },
  blackout(c, x, y){
    cRound(c, x - 90, y - 60, 180, 120, 10); cFill(c, "#1f2a44");
    cCircle(c, x + 56, y - 34, 16, "#fff3b0"); cCircle(c, x + 64, y - 40, 14, "#1f2a44");
    [[-80, -10, 30, 60], [-46, -34, 34, 84], [-8, -18, 28, 68], [24, 2, 36, 48]].forEach(([a, b, w, h]) => { c.fillStyle = "#0e1424"; c.fillRect(x + a, y + b, w, h); c.fillStyle = "#2b3550"; for (let r = 0; r < h/14 - 1; r++) for (let k = 0; k < w/12 - 1; k++) c.fillRect(x + a + 5 + k*11, y + b + 6 + r*14, 5, 6); });
    cCircle(c, x + 50, y + 18, 18, "#d8dde2", INK, 3); cRound(c, x + 42, y + 34, 16, 10, 2); cFill(c, "#8a949b", INK, 2);
    c.strokeStyle = "#e5484d"; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 36, y + 4); c.lineTo(x + 64, y + 32); c.moveTo(x + 64, y + 4); c.lineTo(x + 36, y + 32); c.stroke();
  },
  fine(c, x, y){
    c.save(); c.translate(x, y); c.rotate(.06);
    cRound(c, -50, -56, 100, 112, 6); cFill(c, "#ffffff", INK, 3);
    cText(c, "FINE", 0, -36, 20, INK);
    c.strokeStyle = "#c9c0b2"; c.lineWidth = 3; for (let k = 0; k < 2; k++){ c.beginPath(); c.moveTo(-34, -14 + k*12); c.lineTo(34, -14 + k*12); c.stroke(); }
    cText(c, "₹100K", 0, 26, 24, "#c9423a"); c.restore();
  },
  back(c, x, y){
    c.fillStyle = "#7a8890"; c.fillRect(x - 4, y + 10, 8, 50);
    cRound(c, x - 50, y - 58, 100, 74, 10); cFill(c, "#e5484d", INK, 4);
    c.strokeStyle = "#fff"; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.moveTo(x + 22, y + 2); c.lineTo(x + 22, y - 22); c.arc(x + 4, y - 22, 18, 0, Math.PI, true); c.lineTo(x - 14, y - 10); c.stroke(); c.lineCap = "butt";
    cPoly(c, [[x - 28, y - 14], [x, y - 14], [x - 14, y + 4]], "#fff");
    cCircle(c, x + 52, y + 32, 18, "#fff", INK, 3); cText(c, "-3", x + 52, y + 33, 17, "#c9423a");
  },
  epidemic(c, x, y){
    [[x - 64, y - 40, 12], [x + 62, y - 36, 9], [x + 58, y + 40, 11], [x - 60, y + 38, 8]].forEach(([a, b, r]) => { c.strokeStyle = "#3ea65a"; c.lineWidth = 3; for (let k = 0; k < 8; k++){ const t = k*Math.PI/4; c.beginPath(); c.moveTo(a, b); c.lineTo(a + Math.cos(t)*(r + 6), b + Math.sin(t)*(r + 6)); c.stroke(); } cCircle(c, a, b, r, "#7bd389", INK, 2); });
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 46, y - 10); c.quadraticCurveTo(x - 66, y - 2, x - 50, y + 20); c.moveTo(x + 46, y - 10); c.quadraticCurveTo(x + 66, y - 2, x + 50, y + 20); c.stroke();
    cRound(c, x - 46, y - 24, 92, 54, 16); cFill(c, "#cfe9ff", INK, 3);
    c.strokeStyle = "#8fbbe0"; c.lineWidth = 3; [-8, 4, 16].forEach(d => { c.beginPath(); c.moveTo(x - 34, y + d); c.lineTo(x + 34, y + d); c.stroke(); });
  },
  forcesale(c, x, y){
    c.fillStyle = "#8a5a34"; c.fillRect(x - 54, y - 30, 8, 90);
    cRound(c, x - 46, y - 26, 104, 52, 6); cFill(c, "#ffffff", INK, 3);
    cText(c, "SOLD", x + 6, y, 28, "#c9423a");
    cRound(c, x + 26, y + 34, 38, 14, 4); cFill(c, "#8a5a34", INK, 2.5);
    c.save(); c.translate(x + 50, y + 34); c.rotate(-.6); cRound(c, -8, -40, 16, 36, 4); cFill(c, "#a06a3c", INK, 2.5); c.restore();
  },
  demolish(c, x, y){
    c.fillStyle = "#8a5a34"; c.fillRect(x - 90, y + 44, 180, 8);
    cRound(c, x + 4, y - 44, 56, 88, 4); cFill(c, "#b8c2c9", INK, 3);
    c.fillStyle = "#6b7880"; for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) c.fillRect(x + 14 + k*22, y - 34 + r*19, 12, 11);
    cPoly(c, [[x + 4, y - 44], [x + 22, y - 44], [x + 12, y - 28], [x + 18, y - 16], [x + 4, y - 10]], "#f6ead8");   // the chunk knocked out
    [[x - 6, y - 30, 6], [x - 14, y - 12, 4], [x - 2, y - 4, 3]].forEach(([a, b, r]) => cCircle(c, a, b, r, "#b8c2c9", INK, 2));
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 70, y - 62); c.lineTo(x - 22, y - 30); c.stroke();
    cCircle(c, x - 22, y - 30, 17, "#3a3f45", INK, 3); cCircle(c, x - 27, y - 35, 5, "#6b7480");
    c.strokeStyle = "#ffd23f"; c.lineWidth = 3; [[-2, -52, 8, -60], [6, -36, 16, -38], [-2, -14, 6, -6]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(x + a, y + b); c.lineTo(x + d, y + e); c.stroke(); });
  },
  jet(c, x, y){
    cCircle(c, x, y + 6, 46, "#4aa3e8", INK, 3);
    c.save(); c.beginPath(); c.arc(x, y + 6, 44, 0, Math.PI*2); c.clip();
    [[x - 20, y - 8, 22, 14], [x + 22, y + 22, 18, 12], [x - 10, y + 38, 14, 8]].forEach(([a, b, rx, ry]) => { c.beginPath(); c.ellipse(a, b, rx, ry, .4, 0, Math.PI*2); c.fillStyle = "#5fc46e"; c.fill(); });
    c.restore();
    c.setLineDash([6, 6]); c.strokeStyle = "#ffffff"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 86, y + 40); c.quadraticCurveTo(x - 40, y - 60, x + 30, y - 46); c.stroke(); c.setLineDash([]);
    c.save(); c.translate(x + 52, y - 46); c.rotate(.15);
    cPoly(c, [[-30, -4], [22, -6], [32, 0], [22, 6], [-30, 4]], "#ffffff", INK, 2.5);
    cPoly(c, [[-4, -4], [-16, -26], [-6, -26], [10, -4]], "#e5484d", INK, 2);
    cPoly(c, [[-4, 4], [-16, 22], [-6, 22], [10, 4]], "#e5484d", INK, 2);
    cPoly(c, [[-30, -2], [-36, -16], [-28, -16], [-20, -2]], "#e5484d", INK, 2);
    c.restore();
  }
};

/* Returns a canvas (or <img> from ASSETS.cards) with the art for card id, on a soft background in the kind color */
function chanceArt(id, kindColor){
  const path = ASSETS.cards && ASSETS.cards[id];
  if (path){ const im = new Image(); im.alt = ""; im.src = path; return im; }
  const W = 240, H = 170, dpr = Math.min(2, devicePixelRatio || 1), cv = document.createElement("canvas");
  cv.width = W*dpr; cv.height = H*dpr; cv.setAttribute("aria-hidden", "true");
  const c = cv.getContext("2d"); c.scale(dpr, dpr);
  const g = c.createRadialGradient(W/2, H/2, 10, W/2, H/2, 150); g.addColorStop(0, "#ffffff"); g.addColorStop(1, kindColor + "55");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.globalAlpha = .18; for (let k = 0; k < 12; k++){ c.save(); c.translate(W/2, H/2); c.rotate(k*Math.PI/6); c.fillStyle = kindColor; c.beginPath(); c.moveTo(0, 0); c.lineTo(160, -18); c.lineTo(160, 18); c.fill(); c.restore(); } c.globalAlpha = 1;
  (CARD_ART[id] || CARD_ART.shield)(c, W/2, H/2 + 4, kindColor);
  return cv;
}
