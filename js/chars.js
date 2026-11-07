"use strict";
/* ================= TYCOON ART =================
   Twelve original characters, drawn in code. Names and gestures are in CHARACTERS in config.js.
   Each one is drawn facing the bottom-right of the screen and mirrored to face the bottom-left.
   Units: the feet sit at (0, 0) and the top of the head is about 100 units up. The front of the body is +x.
   Change colors and outfits here. Hand gestures live in GESTURES below. */
const TYCOON_ART = [
  /* 0 Rohan, the tourist */ {skin:"#f1c9a5", hair:"#6b4429", hairStyle:"tuft", eyes:"shades",
    top:{kind:"shirt", color:"#e0457b", flowers:true}, legs:{kind:"shorts", color:"#8a6a45", socks:"#ffffff"}, shoes:{kind:"shoe", color:"#7a4a2a"},
    backpack:"#8a6440", item:"camera"},
  /* 1 Tara, the star */ {skin:"#f6d6be", hair:"#f2c94c", hairStyle:"pony", bow:"#2f6fd6", eyes:"blue", lashes:true, earrings:"star",
    top:{kind:"dress", color:"#2f7fe0", trim:"#ffffff"}, legs:{kind:"bare"}, shoes:{kind:"heel", color:"#23232b"}, item:"umbrella"},
  /* 2 Mira, the thinker */ {skin:"#f3cfb0", hair:"#4b2a7d", hairStyle:"bob", eyes:"brown", lashes:true, earrings:"hoop",
    top:{kind:"blazer", color:"#f2b51c", inner:"#ffffff"}, legs:{kind:"pants", color:"#26262c"}, shoes:{kind:"heel", color:"#1c1c22"}},
  /* 3 Leela, the banker */ {skin:"#f3cfb0", hair:"#4b2a7d", hairStyle:"bun", sticks:"#9a5a2a", eyes:"brown", lashes:true, glasses:true, earrings:"hoop",
    top:{kind:"blazer", color:"#7cb82f", inner:"#ffffff", tie:"#2a2a2a"}, legs:{kind:"skirt", color:"#7cb82f", tights:"#77777f"}, shoes:{kind:"heel", color:"#2a2a30"}},
  /* 4 Bilal, the backpacker */ {skin:"#e8b48c", hair:"#3b2618", hairStyle:"beanie", hat:"#f07a1a", beard:true, eyes:"dark",
    top:{kind:"hoodie", color:"#f1e6cf"}, legs:{kind:"pants", color:"#5a5446", cargo:true}, shoes:{kind:"sneaker", color:"#f07a1a", sole:"#ffffff"},
    backpack:"#3a4656", neckphones:"#2d3640"},
  /* 5 Sofia, the jetsetter */ {skin:"#f1c9a5", hair:"#8a5a35", hairStyle:"wavy", hat:"#f0dcb8", band:"#8a5a35", eyes:"shades", earrings:"hoop",
    top:{kind:"blouse", color:"#fffaf2"}, legs:{kind:"longskirt", color:"#f08a2a"}, shoes:{kind:"heel", color:"#3a2a22"}, item:"handbag"},
  /* 6 Kai, the rookie */ {skin:"#f1c9a5", hair:"#2a221e", hairStyle:"cap", hat:"#ffffff", brim:"#2a3d7a", eyes:"dark",
    top:{kind:"varsity", color:"#2f6fd6", sleeve:"#ffffff"}, legs:{kind:"shorts", color:"#26262c"}, shoes:{kind:"sneaker", color:"#2f7fe0", sole:"#ffffff"},
    backpack:"#2d3640", headphones:"#e9edf2"},
  /* 7 Pia, the rebel */ {skin:"#f6d6be", hair:"#f06a9a", hairStyle:"twinbuns", eyes:"blue", lashes:true, gloves:"#2a2a2a",
    top:{kind:"crop", color:"#26262c", star:"#f2b51c"}, legs:{kind:"pants", color:"#9a3fc0", cargo:true, baggy:true}, shoes:{kind:"sneaker", color:"#f4f4f4", sole:"#dcdcdc"}},
  /* 8 Arjun, the boss */ {skin:"#f1c9a5", hair:"#6b4429", hairStyle:"tuft", eyes:"shades",
    top:{kind:"suit", color:"#2a3560", inner:"#ffffff", tie:"#3a4a8a"}, legs:{kind:"pants", color:"#2a3560"}, shoes:{kind:"shoe", color:"#4a2a1a"}, item:"briefcase"},
  /* 9 Rani, the heiress */ {skin:"#e8b48c", hair:"#4a2418", hairStyle:"highbun", band:"#e9b52c", eyes:"shades", lips:true, earrings:"gold", necklace:true,
    top:{kind:"gown", color:"#c0262d"}, legs:{kind:"bare"}, shoes:{kind:"heel", color:"#1c1c22"}, item:"clutch"},
  /* 10 Doc, the inventor */ {skin:"#f6d6be", hair:"#ececf1", hairStyle:"wild", goggles:true, mustache:true, eyes:"dark",
    top:{kind:"labcoat", color:"#f6f3ea", inner:"#6b5a3a", tie:"#4a3a24"}, legs:{kind:"pants", color:"#2a3048"}, shoes:{kind:"shoe", color:"#2a2a30"}},
  /* 11 Zane, the gamer */ {skin:"#f1c9a5", hair:"#1f1f24", hairStyle:"spiky", streak:"#9ad12a", eyes:"dark",
    top:{kind:"hoodie", color:"#8ccc2a", pad:true}, legs:{kind:"pants", color:"#5a5446", cargo:true}, shoes:{kind:"sneaker", color:"#26262c", sole:"#9ad12a"},
    backpack:"#2d3a2a", headphones:"#9ad12a"}
];

const tycoonArt = (() => {
  const OL = "rgba(48,32,26,.55)", PI2 = Math.PI*2;
  let K = null;   // the canvas being drawn on
  /* --- tiny drawing helpers, all in character units --- */
  function fill(col, outline){ K.fillStyle = col; K.fill(); if (outline !== false){ K.strokeStyle = OL; K.lineWidth = 1.3; K.lineJoin = "round"; K.stroke(); } }
  function ell(x, y, rx, ry, rot){ K.beginPath(); K.ellipse(x, y, rx, ry, rot || 0, 0, PI2); }
  function rr(x, y, w, h, r){ K.beginPath(); K.roundRect(x, y, w, h, r); }
  function poly(pts){ K.beginPath(); pts.forEach((p, i) => i ? K.lineTo(p[0], p[1]) : K.moveTo(p[0], p[1])); K.closePath(); }
  /* smooth closed shape through the midpoints of a control polygon */
  function blob(pts){ const n = pts.length, mid = (a, b) => [(a[0] + b[0])/2, (a[1] + b[1])/2]; const m = mid(pts[n-1], pts[0]);
    K.beginPath(); K.moveTo(m[0], m[1]); for (let i = 0; i < n; i++){ const p = pts[i], q = mid(p, pts[(i + 1) % n]); K.quadraticCurveTo(p[0], p[1], q[0], q[1]); } K.closePath(); }
  function line(pts, w, col){ K.lineCap = "round"; K.lineJoin = "round"; K.beginPath(); pts.forEach((p, i) => i ? K.lineTo(p[0], p[1]) : K.moveTo(p[0], p[1])); K.strokeStyle = col; K.lineWidth = w; K.stroke(); }
  /* a limb: thick rounded line with an outline */
  function limb(pts, w, col){ line(pts, w + 2.4, OL); line(pts, w, col); }
  function star(x, y, r, col){ const pts = []; for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, q = k % 2 ? r*.45 : r; pts.push([x + Math.cos(a)*q, y + Math.sin(a)*q]); } poly(pts); fill(col, false); }
  const at = (H, offs) => offs.map(([a, b]) => [H.x + a, H.y + b]);

  /* --- arms: two-bone reach from shoulder to hand --- */
  function reach(sx, sy, tx, ty){
    const L1 = 11, L2 = 10; let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const m = L1 + L2 - .3;
    if (d > m){ dx *= m/d; dy *= m/d; d = m; } d = Math.max(d, 2);
    const a = Math.atan2(dy, dx), A = Math.acos(Math.max(-1, Math.min(1, (L1*L1 + d*d - L2*L2)/(2*L1*d))));
    return {e:[sx + Math.cos(a + A)*L1, sy + Math.sin(a + A)*L1], h:[sx + dx, sy + dy]};
  }
  const LONG = {blazer:1, suit:1, hoodie:1, varsity:1, labcoat:1};
  function arm(A, sh, hand, pose){
    const r = reach(sh[0], sh[1], hand[0], hand[1]), T = A.top, sleeve = T.sleeve || T.color;
    limb([sh, r.e, r.h], 5.2, A.skin);
    if (T.kind === "gown" || T.kind === "crop"){}                       // bare arms
    else if (LONG[T.kind]){ const k = .82, end = [r.e[0] + (r.h[0] - r.e[0])*k, r.e[1] + (r.h[1] - r.e[1])*k]; limb([sh, r.e, end], 7, sleeve); }
    else { const end = [sh[0] + (r.e[0] - sh[0])*.6, sh[1] + (r.e[1] - sh[1])*.6]; limb([sh, end], 8, T.kind === "dress" ? T.trim : sleeve); }
    const hc = A.gloves || A.skin; ell(r.h[0], r.h[1], 3.5, 3.5); fill(hc);
    if (pose === "thumb"){ ell(r.h[0] + .5, r.h[1] - 4, 1.5, 2.6); fill(hc); }
    return r.h;
  }

  /* --- held items, anchored on the front hand --- */
  function item(kind, h, t, raised){
    const [x, y] = h;
    if (kind === "camera"){
      if (!raised){ line([[-1, -58], [x - 2, y - 2]], 1, "#3a2a22"); line([[11, -58], [x + 7, y - 2]], 1, "#3a2a22"); }
      rr(x - 3, y - 5, 12, 9, 2); fill("#2b2b30"); rr(x - 1, y - 7.5, 4, 3, 1); fill("#2b2b30");
      ell(x + 6, y - .5, 3.6, 3.6); fill("#55575e"); ell(x + 6, y - .5, 1.8, 1.8); fill("#9fc6e6", false);
    } else if (kind === "umbrella"){
      K.save(); K.translate(x, y); K.rotate(Math.sin(t*2.2)*.3);
      K.beginPath(); K.arc(-2.5, -1, 2.6, Math.PI, 0); K.strokeStyle = "#7a4a2a"; K.lineWidth = 1.6; K.stroke();
      line([[0, -1], [0, 30]], 1.4, "#7a4a2a");
      blob([[-1.5, 3], [1.5, 3], [5, 11], [3, 22], [0, 29], [-3, 22], [-5, 11]]); fill("#efe1c2");
      line([[0, 4], [0, 27]], .8, "#c9b48a"); line([[-2.4, 8], [-1, 25]], .8, "#c9b48a");
      line([[2, 14], [5, 18]], .6, "#7a4a2a"); star(5.5, 20, 3.4, "#f2b51c");
      K.restore();
    } else if (kind === "handbag"){
      K.beginPath(); K.moveTo(x - 4, y + 4); K.quadraticCurveTo(x, y - 4, x + 4, y + 4); K.strokeStyle = "#6a3e1e"; K.lineWidth = 1.5; K.stroke();
      rr(x - 7, y + 3, 14, 11, 3); fill("#a8743f");
      line([[x - 4, y + 4], [x + 3, y + 13]], .6, "#7a5028"); line([[x + 2, y + 4], [x - 5, y + 12]], .6, "#7a5028"); ell(x, y + 6, 1.2, 1.2); fill("#e9b52c", false);
    } else if (kind === "briefcase"){
      K.beginPath(); K.moveTo(x - 3, y + 3); K.lineTo(x - 3, y - 1); K.lineTo(x + 3, y - 1); K.lineTo(x + 3, y + 3); K.strokeStyle = "#4a2a14"; K.lineWidth = 1.6; K.stroke();
      rr(x - 9, y + 2, 18, 13, 2); fill("#8a4e26"); rr(x - 9, y + 6, 18, 2.4, 1); fill("#6a3a1a", false); rr(x - 1.6, y + 5.5, 3.2, 3.4, .8); fill("#e9b52c", false);
    } else if (kind === "clutch"){
      rr(x - 6, y - 3, 13, 7, 3); fill("#5a3018"); rr(x - 1, y - 3, 3, 2.4, 1); fill("#e9b52c", false);
    }
  }

  /* --- head, face and hair --- */
  function hairBack(A, H){
    const s = A.hairStyle, c = A.hair;
    if (s === "pony"){ blob(at(H, [[-6, -22], [-2, -36], [-16, -42], [-30, -30], [-31, -10], [-27, 10], [-21, 16], [-19, -6]])); fill(c); }
    else if (s === "bob"){ blob(at(H, [[22, -8], [18, -22], [0, -27], [-18, -22], [-26, -4], [-25, 14], [-14, 19], [-4, 15]])); fill(c); }
    else if (s === "bun"){ ell(H.x - 6, H.y - 25, 9.5, 9); fill(c); line([[H.x - 14, H.y - 36], [H.x + 2, H.y - 18]], 1.6, A.sticks); line([[H.x - 9, H.y - 38], [H.x + 4, H.y - 22]], 1.6, A.sticks); }
    else if (s === "wavy"){ blob(at(H, [[14, -12], [4, -24], [-14, -22], [-27, -6], [-31, 12], [-26, 26], [-31, 40], [-16, 45], [-8, 31], [-4, 18], [4, 10]])); fill(c); }
    else if (s === "twinbuns"){ ell(H.x - 13, H.y - 22, 9, 9); fill(c); ell(H.x + 9, H.y - 27, 9, 9); fill(c); }
    else if (s === "highbun"){ ell(H.x - 6, H.y - 30, 11, 10); fill(c); line([[H.x - 15, H.y - 25], [H.x + 3, H.y - 23]], 3, A.band); }
    else if (s === "wild"){ const pts = []; for (let k = 0; k <= 14; k++){ const a = Math.PI*.6 + k*Math.PI*1.2/14, q = k % 2 ? 29 : 22; pts.push([H.x - 3 + Math.cos(a)*q, H.y - 4 + Math.sin(a)*q]); } poly(pts); fill(c); }
  }
  function hairFront(A, H){
    const s = A.hairStyle, c = A.hair;
    const cap = [[21, -6], [16, -19], [2, -24], [-14, -20], [-22, -6], [-21, 8], [-15, 8], [-12, -4], [-2, -9], [10, -8]];
    if (s === "tuft"){ blob(at(H, [[22, -8], [22, -24], [10, -33], [-4, -32], [-17, -30], [-27, -15], [-23, 2], [-16, 6], [-12, -8], [2, -12], [12, -10]])); fill(c);
      line(at(H, [[-4, -24], [6, -18]]), 1, "rgba(0,0,0,.18)"); line(at(H, [[-14, -20], [-6, -14]]), 1, "rgba(0,0,0,.18)"); }
    else if (s === "pony"){ blob(at(H, cap)); fill(c); blob(at(H, [[20, -4], [21, 8], [17, 8], [15, -4]])); fill(c);
      poly(at(H, [[-6, -27], [-14, -34], [-15, -21]])); fill(A.bow); poly(at(H, [[-6, -27], [3, -33], [3, -21]])); fill(A.bow); ell(H.x - 6, H.y - 27, 2.4, 2.4); fill(A.bow); }
    else if (s === "bob"){ blob(at(H, [[22, -4], [18, -19], [4, -25], [-12, -21], [-20, -8], [-10, -5], [2, -8], [14, -5]])); fill(c); blob(at(H, [[18, -6], [24, 0], [23, 14], [16, 15], [16, 0]])); fill(c); }
    else if (s === "bun" || s === "highbun"){ blob(at(H, [[21, -6], [16, -19], [2, -24], [-14, -20], [-22, -6], [-21, 6], [-15, 6], [-12, -6], [0, -12], [12, -9]])); fill(c);
      if (s === "bun"){ blob(at(H, [[19, -4], [22, 6], [18, 10], [16, 0]])); fill(c); } }
    else if (s === "beanie"){ blob(at(H, [[-20, 0], [-22, 10], [-15, 10], [-14, 2]])); fill(c);
      blob(at(H, [[22, -6], [20, -22], [6, -32], [-10, -31], [-22, -20], [-24, -6]])); fill(A.hat);
      for (let k = -16; k <= 16; k += 5) line(at(H, [[k, -9], [k*.7, -26]]), .7, "rgba(0,0,0,.14)");
      rr(H.x - 24, H.y - 10, 47, 8, 3.5); fill(shade(A.hat, -.12)); }
    else if (s === "wavy"){ blob(at(H, cap)); fill(c); }
    else if (s === "cap"){ blob(at(H, [[-20, 0], [-21, 10], [-14, 10], [-13, 2]])); fill(c); blob(at(H, [[12, -4], [16, 2], [12, 4]])); fill(c); }
    else if (s === "twinbuns"){ blob(at(H, [[21, -4], [16, -19], [2, -24], [-14, -20], [-22, -6], [-21, 8], [-15, 8], [-12, -2], [-3, -6], [5, -3], [12, -6], [17, -2]])); fill(c);
      blob(at(H, [[18, -4], [23, 4], [21, 14], [16, 6]])); fill(c); }
    else if (s === "wild"){ blob(at(H, [[18, -10], [10, -22], [-6, -24], [-18, -16], [-14, -10], [-2, -16], [10, -14]])); fill(c); }
    else if (s === "spiky"){ poly(at(H, [[22, -6], [27, -18], [16, -20], [19, -33], [6, -27], [2, -39], [-6, -28], [-17, -35], [-16, -23], [-29, -22], [-22, -11], [-31, -4], [-21, 4], [-15, 8], [-13, -5], [0, -10], [12, -8]])); fill(c);
      poly(at(H, [[6, -27], [2, -39], [-6, -28], [-2, -16], [6, -15]])); fill(A.streak); }
  }
  function hat(A, H){
    if (A.hairStyle === "wavy" && A.hat){
      ell(H.x + 1, H.y - 13, 35, 10, -.06); fill(A.hat); ell(H.x + 1, H.y - 14, 26, 6.5, -.06); fill(shade(A.hat, -.06), false);
      blob(at(H, [[17, -14], [14, -30], [0, -35], [-14, -30], [-16, -14]])); fill(A.hat);
      K.beginPath(); K.ellipse(H.x, H.y - 17, 16.5, 4, -.06, 0, Math.PI); K.strokeStyle = A.band; K.lineWidth = 3; K.stroke();
    }
    if (A.hairStyle === "cap"){
      blob(at(H, [[22, -6], [18, -22], [4, -29], [-12, -26], [-22, -12], [-23, -2]])); fill(A.hat);
      blob(at(H, [[21, -6], [18, -22], [8, -28], [8, -6]])); fill(A.brim); ell(H.x + 13, H.y - 15, 4, 4); fill(A.hat, false);
      ell(H.x + 23, H.y - 6, 12, 4, .12); fill(A.brim);
    }
  }
  function face(A, H){
    const e1 = [H.x + 1, H.y + 2], e2 = [H.x + 14, H.y + 1];
    if (A.eyes !== "shades"){
      const iris = {blue:"#2f7fe0", brown:"#6b3e1e"}[A.eyes];
      [e1, e2].forEach(([x, y], i) => {
        if (iris){ ell(x, y, 2.9, 3.7); fill(iris, false); ell(x + .3, y + .6, 1.6, 2.2); fill("#1b130f", false); }
        else { ell(x, y, 2.5, 3.3); fill("#2b1d16", false); }
        ell(x + .9, y - 1.3, 1, 1); fill("#ffffff", false);
        if (A.lashes) line([[x + 1.5, y - 3.2], [x + 4.2, y - 5]], 1, "#1b130f");
        K.beginPath(); K.arc(x, y - 2, 6, 1.3*Math.PI, 1.7*Math.PI); K.strokeStyle = A.hairStyle === "wild" ? "#c9c9d0" : shade(A.hair, -.2); K.lineWidth = 1.3; K.stroke();
      });
    }
    K.beginPath(); K.arc(H.x + 10, H.y + 5.5, 1.4, -.4, 1.4); K.strokeStyle = "rgba(120,70,50,.6)"; K.lineWidth = 1; K.stroke();
    if (A.lips){ ell(H.x + 9, H.y + 11, 2.6, 1.6); fill("#b8232c", false); }
    else { K.beginPath(); K.arc(H.x + 9, H.y + 9, 3, .15*Math.PI, .85*Math.PI); K.strokeStyle = "#6a2b20"; K.lineWidth = 1.3; K.stroke(); }
    ell(H.x - 4, H.y + 8, 3.2, 2); fill("rgba(240,110,110,.32)", false); ell(H.x + 19, H.y + 7, 2.4, 1.8); fill("rgba(240,110,110,.32)", false);
    if (A.eyes === "shades"){
      rr(H.x - 4, H.y - 2, 10, 7.5, 3); fill("#1d1d22", false); rr(H.x + 9, H.y - 3, 12, 7.5, 3); fill("#1d1d22", false);
      line([[H.x + 5, H.y], [H.x + 10, H.y - 1]], 1.3, "#1d1d22"); line([[H.x - 4, H.y], [H.x - 16, H.y + 1]], 1.3, "#1d1d22");
      line([[H.x - 2, H.y], [H.x + 1, H.y - 1]], .9, "rgba(255,255,255,.45)"); line([[H.x + 11, H.y - 1], [H.x + 14, H.y - 2]], .9, "rgba(255,255,255,.45)");
    }
    if (A.glasses){ K.strokeStyle = "#1d1d22"; K.lineWidth = 1.4; K.beginPath(); K.arc(e1[0], e1[1], 5, 0, PI2); K.moveTo(e2[0] + 5, e2[1]); K.arc(e2[0], e2[1], 5, 0, PI2); K.stroke();
      line([[e1[0] + 5, e1[1]], [e2[0] - 5, e2[1]]], 1.2, "#1d1d22"); line([[e1[0] - 5, e1[1]], [H.x - 16, H.y + 1]], 1.2, "#1d1d22"); }
    if (A.beard){ blob(at(H, [[-17, 2], [-15, 14], [-4, 23], [9, 25], [19, 16], [22, 4], [17, 8], [9, 13], [1, 11], [-8, 6]])); fill(A.hair);
      ell(H.x + 9, H.y + 8, 5.5, 2.2); fill(A.hair, false); ell(H.x + 9, H.y + 11.5, 2.4, 1.3); fill("#5a2a20", false); }
    if (A.mustache){ ell(H.x + 5, H.y + 9, 5.5, 3, .25); fill(A.hair); ell(H.x + 14, H.y + 8.5, 5, 3, -.3); fill(A.hair); }
  }
  function head(A, H){
    hairBack(A, H);
    const hideEar = A.hairStyle === "bob" || A.hairStyle === "wavy";
    if (!hideEar){ ell(H.x - 18, H.y + 3, 4, 5); fill(A.skin); }
    ell(H.x, H.y, 21, 20); fill(A.skin);
    ell(H.x + 7, H.y - 9, 10, 6, -.3); fill("rgba(255,255,255,.18)", false);
    face(A, H); hairFront(A, H); hat(A, H);
    if (A.goggles){ K.beginPath(); K.ellipse(H.x, H.y - 9, 21.5, 7, -.05, Math.PI*.95, Math.PI*2.05); K.strokeStyle = "#6a4a2a"; K.lineWidth = 3; K.stroke();
      [[H.x + 3, H.y - 13, 5.6], [H.x + 15, H.y - 14, 5]].forEach(([x, y, r]) => { ell(x, y, r, r); fill("#c9963a"); ell(x, y, r*.68, r*.68); fill("#3b4a52", false); ell(x - 1, y - 1.3, r*.25, r*.25); fill("rgba(255,255,255,.6)", false); }); }
    if (A.headphones){ K.beginPath(); K.ellipse(H.x - 2, H.y - 2, 22, 23, 0, Math.PI*1.08, Math.PI*1.9); K.strokeStyle = OL; K.lineWidth = 4.6; K.stroke(); K.strokeStyle = A.headphones; K.lineWidth = 3; K.stroke();
      ell(H.x - 17, H.y + 2, 6.5, 8.5); fill(A.headphones); ell(H.x - 16, H.y + 2, 3.5, 5.5); fill(shade(A.headphones, -.3), false); }
    if (A.earrings && !A.headphones){ const x = H.x - 17, y = H.y + 12;
      if (A.earrings === "hoop"){ K.beginPath(); K.arc(x, y, 2.6, 0, PI2); K.strokeStyle = "#e9b52c"; K.lineWidth = 1.4; K.stroke(); }
      else if (A.earrings === "star") star(x, y + 1, 3, "#f2b51c");
      else { ell(x, y + 1, 1.8, 2.6); fill("#e9b52c", false); } }
  }

  /* --- body: legs, shoes, outfit --- */
  function shoe(S, fx, fy){
    if (S.kind === "sneaker"){ ell(fx + 2, fy + .5, 6.6, 4); fill(S.color); rr(fx - 4.6, fy + 1.6, 13.4, 2.6, 1.3); fill(S.sole); }
    else if (S.kind === "heel"){ line([[fx - 2, fy + 1], [fx - 2, fy + 4]], 1.4, S.color); ell(fx + 2, fy + 1.5, 4.6, 2.6); fill(S.color); }
    else { ell(fx + 2, fy + 1, 6.2, 3.8); fill(S.color); }
  }
  function legs(A, feet){
    const L = A.legs, hips = [[-5, -34], [5, -34]];
    feet.forEach(([fx, fy], i) => {
      const hip = hips[i], foot = [fx, fy - 2];
      if (L.kind === "pants"){ limb([hip, foot], L.baggy ? 10.5 : 8.4, i ? L.color : shade(L.color, -.1)); if (L.cargo && i) { rr(fx - 2, -22, 6, 6, 1.5); fill(shade(L.color, -.12)); } }
      else if (L.kind === "shorts"){ limb([[hip[0], -24], foot], 5.6, A.skin); if (L.socks) limb([[fx, -8], foot], 5.8, L.socks); limb([hip, [hip[0] + (fx - hip[0])*.4, -21]], 10.5, i ? L.color : shade(L.color, -.1)); }
      else limb([hip, foot], 5.2, L.tights || A.skin);
      shoe(A.shoes, fx, fy - 3);
    });
  }
  function lower(A){
    const L = A.legs, T = A.top;
    if (L.kind === "skirt"){ rr(-12, -37, 25, 16, 4); fill(L.color); }
    if (L.kind === "longskirt"){ blob([[-11, -42], [12, -42], [18, -24], [20, -11], [2, -9], [-17, -11], [-15, -26]]); fill(L.color); line([[3, -38], [6, -12]], .8, "rgba(0,0,0,.12)"); line([[-6, -38], [-9, -12]], .8, "rgba(0,0,0,.12)"); }
    if (T.kind === "dress"){ K.beginPath(); K.moveTo(-11, -40); K.lineTo(12, -40); K.quadraticCurveTo(16, -30, 21, -21); K.quadraticCurveTo(1, -15, -19, -21); K.quadraticCurveTo(-15, -30, -11, -40); fill(T.color);
      line([[1, -38], [1, -18]], .8, "rgba(0,0,0,.14)"); line([[-8, -38], [-12, -20]], .8, "rgba(0,0,0,.14)"); line([[9, -38], [13, -19]], .8, "rgba(0,0,0,.14)"); }
    if (T.kind === "gown"){ K.beginPath(); K.moveTo(-11, -42); K.lineTo(12, -42); K.quadraticCurveTo(15, -20, 17, -3); K.lineTo(-14, -3); K.quadraticCurveTo(-13, -22, -11, -42); fill(T.color); }
    if (T.kind === "labcoat"){ blob([[-14, -46], [15, -46], [17, -18], [1, -16], [-16, -18]]); fill(T.color); line([[6, -44], [7, -18]], 1, OL); }
  }
  function torso(A){
    const T = A.top, c = T.color;
    if (T.kind === "crop"){ rr(-11, -60, 23, 26, 8); fill(A.skin); rr(-11, -60, 23, 15, 7); fill(c); star(5, -53, 3.6, T.star); return; }
    if (T.kind === "gown"){ rr(-11, -60, 23, 9, 4); fill(A.skin, false); K.beginPath(); K.moveTo(-11, -54); K.quadraticCurveTo(0, -57, 1, -53); K.quadraticCurveTo(6, -57, 12, -54); K.lineTo(12, -40); K.lineTo(-11, -40); K.closePath(); fill(c); return; }
    const wide = T.kind === "hoodie" || T.kind === "varsity";
    rr(wide ? -13 : -12, -60, wide ? 27 : 25, T.kind === "dress" || T.kind === "blouse" ? 22 : 29, 9); fill(T.kind === "labcoat" ? T.inner : c);
    if (T.kind === "shirt"){
      poly([[1, -60], [6, -52], [11, -60]]); fill("#fff3f6", false); poly([[0, -60], [-3, -55], [4, -54]]); fill(shade(c, .2)); poly([[12, -60], [13, -55], [8, -54]]); fill(shade(c, .2));
      line([[6, -52], [6, -33]], .8, "rgba(0,0,0,.18)");
      if (T.flowers) [[-6, -50], [8, -45], [-2, -39], [9, -37], [-9, -42], [2, -55]].forEach(([x, y]) => { for (let k = 0; k < 5; k++){ const a = k*PI2/5; ell(x + Math.cos(a)*1.7, y + Math.sin(a)*1.7, 1.3, 1.3); fill("#ffd1e1", false); } ell(x, y, .9, .9); fill("#f2c230", false); });
    }
    if (T.kind === "dress" || T.kind === "blouse"){ ell(2, -59, 4.4, 2.4, -.2); fill(T.trim || "#ffffff"); ell(9, -59, 4.4, 2.4, .2); fill(T.trim || "#ffffff");
      if (T.kind === "dress"){ rr(-11, -41.5, 23, 3.6, 1.6); fill(T.trim); }
      else { ell(7, -39, 3, 2); fill(c); poly([[7, -39], [4, -34], [6, -34]]); fill(c); poly([[7, -39], [10, -34], [8, -34]]); fill(c); } }
    if (T.kind === "blazer" || T.kind === "suit"){
      poly([[1, -60], [11, -60], [6, -47]]); fill(T.inner, false);
      if (T.tie) { poly([[5, -59], [7, -59], [7.8, -49], [6, -46], [4.2, -49]]); fill(T.tie, false); }
      line([[1, -60], [5, -45]], 1, shade(c, -.3)); line([[11, -60], [7, -45]], 1, shade(c, -.3));
      ell(6, -41, .9, .9); fill(shade(c, -.4), false); ell(6, -36, .9, .9); fill(shade(c, -.4), false);
      if (T.kind === "suit"){ rr(-7, -51, 4, 2, .6); fill("#ffffff", false); }
    }
    if (T.kind === "hoodie"){
      rr(-13, -34, 27, 4, 2); fill(shade(c, -.1)); rr(0, -45, 12, 8, 3); fill(shade(c, -.06));
      line([[3, -59], [3, -50]], .9, shade(c, -.35)); line([[8, -59], [8, -51]], .9, shade(c, -.35));
      if (T.pad){ rr(1, -52, 10, 6, 2.5); fill("#2a2a2e", false); ell(3.5, -49, 1, 1); fill(A.headphones || "#9ad12a", false); ell(8.5, -49, 1, 1); fill(A.headphones || "#9ad12a", false); }
    }
    if (T.kind === "varsity"){
      rr(-13, -34, 27, 4, 2); fill("#ffffff"); line([[-13, -32], [14, -32]], 1, c);
      line([[6, -58], [6, -35]], 1, "rgba(255,255,255,.7)"); [-53, -47, -41].forEach(y => { ell(6, y, .9, .9); fill("#ffffff", false); });
      star(-4, -48, 4, "#ffffff");
    }
    if (T.kind === "labcoat"){
      poly([[5, -60], [7, -60], [7.6, -49], [6, -46], [4.4, -49]]); fill(T.tie, false);
      poly([[-13, -58], [3, -60], [5, -46], [5, -40], [-15, -40]]); fill(c); poly([[9, -60], [14, -58], [15, -40], [7, -40], [7, -46]]); fill(c);
      rr(9, -40, 6, 5, 1); fill(shade(c, -.05)); line([[10.5, -41], [10.5, -43.5]], 1, "#c9423a"); line([[12.5, -41], [12.5, -44]], 1, "#2f7fe0");
    }
  }

  /* --- hand gestures: where each hand goes over time (front of body is +x) --- */
  const pulse = (t, period, dur) => { const p = (t % period)/dur; return p < 1 ? Math.sin(p*Math.PI) : 0; };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0])*k, a[1] + (b[1] - a[1])*k];
  const HIP = [-13, -38], SIDE_B = [-12, -35], SIDE_F = [14, -35];
  const GESTURES = {
    camera:    t => { const k = Math.min(1, pulse(t, 4.5, 1.8)*1.4); return {F:mix([10, -43], [12, -63], k), B:SIDE_B, raised:k > .5, flash:k >= 1 && (t % 4.5) > .8 && (t % 4.5) < 1}; },
    umbrella:  t => ({F:[15 + Math.sin(t*2)*1, -37], B:HIP}),
    chin:      t => ({F:[14, -60 + Math.sin(t*6)*1.2], B:HIP, over:true}),
    glasses:   t => { const k = pulse(t, 3.5, 1.2); return {F:mix(SIDE_F, [16, -70], k), B:HIP, over:k > .3}; },
    pockets:   t => ({F:[9, -40], B:[1, -40], nod:Math.sin(t*3)*1.2}),
    bag:       t => { const k = pulse(t, 4.5, 1.5); return {F:mix([14 + Math.sin(t*2)*1.5, -37], [18, -49], k), B:HIP}; },
    music:     t => ({F:[16 + Math.sin(t*7)*2, -47 + Math.cos(t*7)*2], B:[-12 + Math.sin(t*3.5)*2, -36], nod:Math.sin(t*7)*1.4}),
    fist:      t => { const k = pulse(t, 2.4, .9); return {F:mix([15, -40], [17, -73], k), B:HIP, over:k > .3}; },
    briefcase: t => { const k = pulse(t, 4, 1.4); return {F:[13 + Math.sin(t*2)*1.5, -34], B:mix(SIDE_B, [5, -54], k), backFront:k > .25}; },
    clutch:    t => { const k = pulse(t, 4.2, 1.5); return {F:mix([12, -42], [15, -58], k), B:HIP, over:k > .3}; },
    mustache:  t => ({F:[15 + Math.sin(t*4)*1.8, -61], B:[-4, -40], over:true}),
    thumbs:    t => { const k = pulse(t, 3, 1.3); return {F:mix([8, -40], [19, -57], k), B:[1, -40], thumb:k > .4, over:k > .4}; }
  };

  /* Draws one character with the feet at screen point (x, y). h is the height in pixels.
     o.facing "left" or "right", o.t time in seconds, o.walking true while hopping, o.ring player color for the base ring. */
  function draw(c, x, y, h, look, o){
    o = o || {}; const id = ((look | 0) % TYCOON_ART.length + TYCOON_ART.length) % TYCOON_ART.length, A = TYCOON_ART[id];
    const t = o.t || 0, flip = o.facing === "left" ? -1 : 1, u = h/100;
    c.save(); c.translate(x, y); c.scale(u, u); K = c;
    if (o.ring){ ell(0, 0, 25, 8.5); fill(o.ring + "55", false); K.strokeStyle = o.ring; K.lineWidth = 2.6; K.stroke(); }
    else { ell(0, 0, 22, 7); fill("rgba(0,0,0,.18)", false); }
    const img = typeof assetReady === "function" && assetReady("characters", id);
    if (img){ const w = 105*img.naturalWidth/img.naturalHeight; c.scale(flip, 1); c.drawImage(img, -w/2, -105, w, 105); c.restore(); return; }
    c.scale(flip, 1);
    const move = (CHARACTERS[id] || {}).move, g = o.walking ? {F:[14 + Math.sin(t*9)*4, -35], B:[-12 - Math.sin(t*9)*4, -35]} : (GESTURES[move] || GESTURES.pockets)(t);
    const sw = o.walking ? Math.sin(t*9) : 0;
    const feet = [[-5 + sw*5, -Math.max(0, sw)*3], [6 - sw*5, -Math.max(0, -sw)*3]];
    const H = {x:3, y:-79 + Math.sin(t*2.2)*.6 + (g.nod || 0)};
    const BS = [-9, -55], FS = [10, -55];
    if (A.backpack){ rr(-19, -59, 13, 25, 5); fill(A.backpack); rr(-20, -46, 6, 10, 2.5); fill(shade(A.backpack, -.15)); }
    if (A.top.kind === "hoodie"){ ell(-8, -59, 11, 5.5); fill(shade(A.top.color, -.12)); }
    if (!g.backUp && !g.backFront) arm(A, BS, g.B);
    legs(A, feet);
    if (A.top.kind === "gown") { lower(A); limb([[7, -22], [feet[1][0], feet[1][1] - 2]], 5.2, A.skin); shoe(A.shoes, feet[1][0], feet[1][1] - 3); line([[5, -30], [9, -3]], 1, OL); }
    else lower(A);
    torso(A);
    if (A.backpack){ line([[7, -59], [9, -42]], 2.6, shade(A.backpack, -.2)); }
    if (A.necklace){ K.beginPath(); K.arc(5, -61, 6, .2*Math.PI, .8*Math.PI); K.strokeStyle = "#e9b52c"; K.lineWidth = 1.2; K.stroke(); ell(5, -55, 1.3, 1.6); fill("#e9b52c", false); }
    if (g.backFront) arm(A, BS, g.B);
    const it = A.item, early = it && !(it === "camera" && g.raised);
    let hand = null;
    if (!g.over && !g.raised){ hand = reach(FS[0], FS[1], g.F[0], g.F[1]).h; if (early) item(it, hand, t, false); arm(A, FS, g.F, g.thumb ? "thumb" : ""); }
    head(A, H);
    if (A.neckphones){ K.beginPath(); K.arc(3.5, -60, 9.5, .1*Math.PI, .9*Math.PI); K.strokeStyle = A.neckphones; K.lineWidth = 2.4; K.stroke(); ell(-6, -55, 3.4, 4.2); fill(A.neckphones); ell(13, -55, 3.4, 4.2); fill(A.neckphones); }
    if (g.backUp) arm(A, BS, g.B);
    if (g.over || g.raised){ hand = reach(FS[0], FS[1], g.F[0], g.F[1]).h; if (it) item(it, hand, t, true); arm(A, FS, g.F, g.thumb ? "thumb" : "");
      if (g.flash){ star(hand[0] + 6, hand[1] - 9, 7, "rgba(255,247,200,.95)"); } }
    c.restore();
  }

  /* Live canvases: anything made with liveCanvas keeps animating while it is on the page. */
  const live = new Set(), reduce = matchMedia("(prefers-reduced-motion: reduce)");
  (function loop(now){
    live.forEach(e => { if (!e.cv.isConnected){ if (e.seen || now - e.born > 3000) live.delete(e); return; } e.seen = true; e.paint(e.c, reduce.matches ? 0 : now/1000); });
    requestAnimationFrame(loop);
  })(performance.now());
  function liveCanvas(w, h, paint){
    const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); cv.style.width = w + "px"; cv.style.height = h + "px";
    const c = cv.getContext("2d"); const e = {cv, c, born:performance.now(), seen:false, paint:(cx, t) => { cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h); paint(cx, t); }};
    e.paint(c, 0); live.add(e); return cv;
  }
  return {draw, liveCanvas};
})();

const drawTycoon = tycoonArt.draw;
/* Which way a character faces on a tile: corners count as the side that starts there. */
function facingOn(tile){ return FACING_BY_SIDE[Math.floor((((tile % N) + N) % N)/8)] || "right"; }
/* A live canvas showing one character, facing the bottom-right like the picker. */
function tycoonPortrait(look, w, h, opts){ opts = opts || {}; return tycoonArt.liveCanvas(w, h, (c, t) => drawTycoon(c, w/2, h - (opts.base || 8), opts.size || h*.86, look, {facing:opts.facing || "right", t:t + look*.7, ring:opts.ring})); }
