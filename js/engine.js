"use strict";
/* ================= RULES ENGINE ================= */
const clone = o => JSON.parse(JSON.stringify(o));
const rnd6 = () => 1 + Math.floor(Math.random()*6);
/* This game's Quick settings, with defaults filled in */
function rules(s){ return Object.assign({}, DEFAULT_SETTINGS, s && s.rules); }
function money(n){ n = Math.round(n); const neg = n < 0; n = Math.abs(n);
  const s = n >= 1000 ? (n/1000).toFixed(n % 1000 === 0 ? 0 : n % 100 === 0 ? 1 : 2) + "M" : n + "K"; return (neg ? "-" : "") + "₹" + s; }
/* A player's money written out in full, with Indian digit grouping: 1500 becomes ₹15,00,000. Prices keep the short money() form. */
function moneyFull(n){ n = Math.round(n*1000); return (n < 0 ? "-" : "") + "₹" + Math.abs(n).toLocaleString("en-IN"); }
/* ---------- Per-game board layout ----------
   s.layout maps tile index to {name, code, price, g} for cities and {name, code, region} for beaches. applyLayout writes
   it into TILES, so the rest of the code keeps reading TILES[i]. Games saved without a valid layout use the board in config.js. */
const TRIO_SLOTS = [[1,2,4], [9,10,12], [17,19,20]];
const COAST_SLOTS = [{beach:5, pair:[6,7]}, {beach:13, pair:[14,15]}, {beach:21, pair:[22,23]}, {beach:29, pair:[30,31]}];
const INLAND_PAIR_SLOTS = [[25,26]];
const LAYOUT_SLOTS = [...TRIO_SLOTS.flat(), ...COAST_SLOTS.flatMap(c => [c.beach, ...c.pair]), ...INLAND_PAIR_SLOTS.flat()];
const BASE_LAYOUT = Object.fromEntries(LAYOUT_SLOTS.map(i => { const t = TILES[i]; return [i, t.type === "city" ? {name:t.name, code:t.code, price:t.price, g:t.g} : {name:t.name, code:t.code, region:t.region}]; }));
const shuffled = a => { a = a.slice(); for (let k = a.length - 1; k > 0; k--){ const j = Math.floor(Math.random()*(k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
function makeLayout(){
  const trios = shuffled(REGIONS.filter(r => r.cities.length === 3)), coast = shuffled(REGIONS.filter(r => r.cities.length === 2 && r.beach)), inland = shuffled(REGIONS.filter(r => r.cities.length === 2 && !r.beach));
  if (trios.length !== TRIO_SLOTS.length || coast.length !== COAST_SLOTS.length || inland.length !== INLAND_PAIR_SLOTS.length){ console.warn("REGIONS don't fit the board. Using the default board."); return null; }
  const L = {}, jitter = p => Math.max(40, Math.round(p*(1 + (Math.random()*2 - 1)*PRICE_JITTER)/10)*10);
  const put = (slots, r) => shuffled(r.cities).forEach((c, k) => { L[slots[k]] = {name:c[0], code:c[1], price:jitter(c[2]), g:r.id}; });
  trios.forEach((r, k) => put(TRIO_SLOTS[k], r));
  coast.forEach((r, k) => { put(COAST_SLOTS[k].pair, r); L[COAST_SLOTS[k].beach] = {name:r.beach[0], code:r.beach[1], region:r.id}; });
  inland.forEach((r, k) => put(INLAND_PAIR_SLOTS[k], r));
  return L;
}
function applyLayout(layout){
  const ok = layout && !Array.isArray(layout) && LAYOUT_SLOTS.every(i => layout[i] && (!layout[i].g || GROUPS[layout[i].g]));
  const L = ok ? layout : BASE_LAYOUT; LAYOUT_SLOTS.forEach(i => Object.assign(TILES[i], L[i]));
}
function upgCost(t, lvl){ return lvl === 1 ? t.price : Math.round(t.price * (lvl === 5 ? 1 : 0.5)); }
function costRange(t, from, to){ let c = 0; for (let l = from+1; l <= to; l++) c += upgCost(t, l); return c; }
function tileValue(i, st){ const t = TILES[i]; if (t.type === "beach") return t.price; return costRange(t, 0, st.l); }
function owned(s, pid){ return Object.keys(s.own).map(Number).filter(i => s.own[i] && s.own[i].o === pid); }
function groupComplete(s, pid, g){ return TILES.every((t, i) => t.g !== g || (s.own[i] && s.own[i].o === pid)); }
function byId(s, id){ return s.players.find(p => p.id === id); }
function cityRent(s, i, level, ownerId){ const t = TILES[i]; let r = t.price * MULT[level-1];
  if (TILES.every((u, j) => u.g !== t.g || j === i || (s.own[j] && s.own[j].o === ownerId))) r *= 2;
  if (s.expo === i) r *= 2;
  if (s.festivals && s.festivals.includes(i)) r *= FESTIVALS.rentMult;
  if (s.epidemics && s.epidemics[t.g] >= (s.round || 1)) r *= .5;   // Epidemic card
  if (s.blackouts && s.blackouts[i] >= (s.round || 1)) r = 0;       // Blackout card
  return Math.round(r); }
function rentOf(s, i){
  const st = s.own[i]; if (!st) return 0; const t = TILES[i];
  if (t.type === "beach") return beachRent(owned(s, st.o).filter(j => TILES[j].type === "beach").length);
  return cityRent(s, i, st.l, st.o);
}
/* Beach rent depends on how many beaches the owner has: 1 = ₹25K, 2 = ₹50K, 3 = ₹100K, 4 = ₹200K */
function beachRent(n){ return 25 * Math.pow(2, Math.max(1, n) - 1); }
function netWorth(s, p){ return p.cash + owned(s, p.id).reduce((a, i) => a + tileValue(i, s.own[i]), 0); }
function say(s, m){ s.log.push(m); if (s.log.length > 40) s.log.splice(0, s.log.length - 40); }
/* Highest level a player may build right now. On their first lap (before passing Start) it is FIRST_LAP_MAX_LEVEL. */
/* With "build several levels in one visit" off, a city grows one level per visit */
function stepCap(s, cur){ return rules(s).directBuild ? 5 : cur + 1; }
function buildCap(p){ return p.laps == null || p.laps >= 1 ? 5 : FIRST_LAP_MAX_LEVEL; }   // saves from before laps existed count as past lap 1
function passStart(s, p){ const b = rules(s).lapBonus; p.cash += b; p.laps = (p.laps || 0) + 1; say(s, b ? `${p.name} passed Start and collected ${money(b)}.` : `${p.name} passed Start.`);
  if (p.laps === 1 && FIRST_LAP_MAX_LEVEL < 5) say(s, `${p.name} finished the first lap. ${LEVEL_NAMES[FIRST_LAP_MAX_LEVEL + 1]} and Landmarks are unlocked.`); }
function upgradeOptions(s, p, i){
  const t = TILES[i], st = s.own[i], opts = []; if (!st || t.type !== "city") return opts; const cap = Math.min(buildCap(p), stepCap(s, st.l));
  if (st.l < 4){ for (let l = st.l+1; l <= Math.min(4, cap); l++){ const c = costRange(t, st.l, l); if (c <= p.cash) opts.push({to:l, cost:c}); } }
  else if (st.l === 4 && cap >= 5){ const c = upgCost(t, 5); if (c <= p.cash) opts.push({to:5, cost:c}); }
  return opts;
}
/* Records a payment for the money animation: from a player to another player, or to the bank (to = null) */
function txn(s, fromId, toId, amt){ s.txSeq = (s.txSeq || 0) + 1; s.tx = {from:fromId, to:toId, amt, seq:s.txSeq}; }
function setMove(s, p, kind, from, to){ s.moveSeq = (s.moveSeq||0) + 1; s.lastMove = {pid:p.id, kind, from, to, seq:s.moveSeq}; }
function walk(s, p, n){ const from = p.pos, to = (from + n) % N; if (to < from) passStart(s, p); p.pos = to; setMove(s, p, "walk", from, to); }
function jumpTo(s, p, to, viaStart){ const from = p.pos; if (viaStart && to < from) passStart(s, p); p.pos = to; setMove(s, p, "jump", from, to); }
function sendJail(s, p){ const from = p.pos; p.pos = 8; p.jail = 1; p.flight = false; s.extra = false; setMove(s, p, "jump", from, 8); }
function bankrupt(s, p){
  p.bankrupt = true; p.cash = 0; p.flight = false; p.jail = 0;
  owned(s, p.id).forEach(i => { delete s.own[i]; });
  if (s.expo != null && !s.own[s.expo]) s.expo = null;
  say(s, `${p.name} went bankrupt. Their properties return to the market.`);
}
/* What the bank pays for a property */
function saleValue(s, i){ return Math.floor(tileValue(i, s.own[i]) * SELL_RATE); }
function sellTile(s, p, i){ const got = saleValue(s, i); delete s.own[i]; if (s.expo === i) s.expo = null; p.cash += got; say(s, `${p.name} sold ${TILES[i].name} for ${money(got)} to raise cash.`); }
/* Sells the cheapest properties first until p has "need" in cash or nothing is left */
function liquidate(s, p, need){
  const list = owned(s, p.id).sort((a, b) => tileValue(a, s.own[a]) - tileValue(b, s.own[b]));
  while (p.cash < need && list.length) sellTile(s, p, list.shift());
}
function pay(s, from, to, amt){
  if (amt <= 0) return;
  if (from.cash < amt) liquidate(s, from, amt);
  const actual = Math.min(amt, from.cash); from.cash -= actual; if (to) to.cash += actual;
  if (actual < amt) bankrupt(s, from);
}
/* ---------- Debts ----------
   charge() is how the current player pays rent, tax, fines and the boat off Lost Island. If a human player can't cover it
   but owns property, the game pauses with pending {k:"debt"} so they can pick cities to sell, sell automatically or go
   bankrupt. "after" says what happens once it's paid: finish the turn, or walk on (after the boat). Bots sell automatically. */
/* Payments to the bank that get the cash stack animation, like a purchase */
const BANK_ANIM = {tax:true, fine:true};
function charge(s, p, to, amt, why, msg, after){
  if (amt <= 0) return true;
  if (p.cash < amt && !p.bot && s.players[s.turn] === p && owned(s, p.id).length){
    s.phase = "act"; s.pending = {k:"debt", amt, to:to ? to.id : null, why, msg, after:after || {k:"finish"}};
    say(s, `${p.name} needs ${money(amt)} but only has ${money(p.cash)}.`); return false;
  }
  say(s, msg); pay(s, p, to, amt); if (to ? !p.bankrupt : BANK_ANIM[why]) txn(s, p.id, to ? to.id : null, amt); return true;
}
/* Pays the debt once there is enough cash, then carries on with the turn. Returns false if still short. */
function settleDebt(s, p){
  const d = s.pending; if (p.cash < d.amt) return false;
  say(s, d.msg); pay(s, p, d.to ? byId(s, d.to) : null, d.amt); if (d.to || BANK_ANIM[d.why]) txn(s, p.id, d.to || null, d.amt); s.pending = null;
  if (d.after.k === "walk"){ s.phase = "roll"; walk(s, p, d.after.n); resolve(s, p); } else finish(s);
  return true;
}
/* Gives up: the creditor gets whatever cash is left and the properties go back to the market */
function giveUp(s, p){
  const d = s.pending, to = d && d.to ? byId(s, d.to) : null; s.pending = null;
  if (to) to.cash += p.cash; bankrupt(s, p); finish(s);
}
function win(s, p, reason){ s.status = "over"; s.phase = "over"; s.winner = p ? p.id : null; s.winReason = reason; s.pending = null; if (p) say(s, `${p.name} wins. ${reason}.`); }
function checkWin(s){
  if (s.status !== "playing") return;
  const alive = s.players.filter(p => !p.bankrupt);
  if (alive.length <= 1){ win(s, alive[0], "Last tycoon standing"); return; }
  const R = rules(s);
  for (const p of alive){
    if (R.tripleMonopoly && Object.keys(GROUPS).filter(g => groupComplete(s, p.id, g)).length >= 3) return win(s, p, "Triple Monopoly, three full color sets");
    if (R.beachMonopoly && owned(s, p.id).filter(i => TILES[i].type === "beach").length === 4) return win(s, p, "Beach Monopoly, all four beaches");
    if (R.lineMonopoly) for (const side of SIDES) if (side.every(i => s.own[i] && s.own[i].o === p.id)) return win(s, p, "Line Monopoly, every city on one side of the board");
  }
}
function nextTurn(s){
  s.doubles = 0; s.extra = false; const n = s.players.length; let i = s.turn;
  for (let k = 0; k < n; k++){ i = (i + 1) % n; if (!s.players[i].bankrupt) break; }
  if (i <= s.turn){ s.round = (s.round||1) + 1; endEvents(s); if (timeUp(s)) return endOnTime(s); }
  s.turn = i; const p = s.players[i]; s.phase = p.flight ? "fly" : "roll"; s.pending = null;
}
/* Play time: once it runs out, the round in progress finishes and the richest tycoon (cash plus property) wins */
function timeUp(s){ return !!s.endsAt && Date.now() >= s.endsAt; }
function endOnTime(s){
  const best = s.players.filter(p => !p.bankrupt).sort((a, b) => netWorth(s, b) - netWorth(s, a))[0];
  say(s, "Time's up."); win(s, best, `Time's up. Richest tycoon with ${money(netWorth(s, best))}`);
}
/* Applies the Quick settings when a game starts: starting cash, festivals and the play clock */
/* Hands a player's seat to a bot (they left or kept missing turns). Their cities and money stay in the game. */
const MISSED_TURNS_FOR_BOT = 2;
function handOver(s, p, msg){ p.bot = true; p.left = true; p.missed = 0; say(s, msg); }
function startGame(s){
  const R = rules(s); s.rules = R; applyLayout(s.layout); s.moveAt = Date.now();
  s.players.forEach(p => { p.cash = R.startCash; });
  pickFestivals(s); s.endsAt = R.playTime ? Date.now() + R.playTime*60000 : null;
}
/* Picks the festival cities once, when the game starts. They stay for the whole game. */
function pickFestivals(s){
  const F = FESTIVALS, count = rules(s).festivals; s.festivals = []; if (!count) return;
  const pool = TILES.map((t, i) => i).filter(i => TILES[i].type === "city");
  for (let k = pool.length - 1; k > 0; k--){ const j = Math.floor(Math.random()*(k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
  s.festivals = pool.slice(0, count).sort((a, b) => a - b);
  const names = s.festivals.map(i => TILES[i].name), list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
  say(s, `Festival! Crowds pour into ${list}. Rent there is ${F.rentMult === 2 ? "doubled" : F.rentMult + "x"}.`);
}
/* Blackouts and epidemics end once their last round has passed */
function endEvents(s){
  const r = s.round || 1;
  Object.keys(s.blackouts || {}).forEach(i => { if (s.blackouts[i] < r){ delete s.blackouts[i]; say(s, `The lights are back on in ${TILES[i].name}.`); } });
  Object.keys(s.epidemics || {}).forEach(g => { if (s.epidemics[g] < r){ delete s.epidemics[g]; say(s, `The epidemic in ${regionCities(g)} is over.`); } });
}
function finish(s){
  s.pending = null; checkWin(s); if (s.status === "over") return;
  const p = s.players[s.turn];
  if (!p.bankrupt && s.extra && p.jail === 0){ s.extra = false; s.phase = p.flight ? "fly" : "roll"; return; }
  nextTurn(s);
}
function offerUpgradeOrFinish(s, p, i){
  if (TILES[i].type === "city" && upgradeOptions(s, p, i).length){ s.phase = "act"; s.pending = {k:"upgrade", tile:i}; }
  else finish(s);
}
/* ---------- Chance cards ---------- */
const pickOne = a => a[Math.floor(Math.random()*a.length)];
/* The cities of a color set, for messages: "Mumbai and Pune" */
function regionCities(g){ const n = TILES.filter(t => t.g === g).map(t => t.name); return n.length > 1 ? n.slice(0, -1).join(", ") + " and " + n[n.length - 1] : n[0] || "a region"; }
/* A Shield blocks one setback aimed at player p. Returns true when it did. */
function shielded(s, p, what){ if (!p || !p.shield) return false; p.shield--; say(s, `${p.name}'s Shield blocked the ${what}.`); return true; }
/* Cities p can grow by one level for free (first lap rule applies) */
function freeBuildOptions(s, p){ const cap = buildCap(p); return owned(s, p.id).filter(i => TILES[i].type === "city" && s.own[i].l < 5 && s.own[i].l + 1 <= cap); }
/* Rival cities and beaches p can force-buy at their normal value. Landmarks are safe. */
function forceSaleOptions(s, p){ return Object.keys(s.own).map(Number).filter(i => { const st = s.own[i], o = byId(s, st.o); return st.o !== p.id && o && !o.bankrupt && (TILES[i].type === "beach" || st.l < 5) && tileValue(i, st) <= p.cash; }); }
/* Rival cities with at least House 1 that the Demolition card can knock down one level. Landmarks count too. */
function demolishOptions(s, p){ return Object.keys(s.own).map(Number).filter(i => { const st = s.own[i], o = byId(s, st.o); return TILES[i].type === "city" && st.o !== p.id && o && !o.bankrupt && st.l >= 2; }); }
function drawCard(s, p){
  const c = CARDS[Math.floor(Math.random()*CARDS.length)], until = (s.round || 1) + EVENT_ROUNDS;
  s.cardSeq = (s.cardSeq||0) + 1; s.card = {id:c.id, kind:c.kind, title:c.title, text:c.text, pid:p.id, seq:s.cardSeq};
  say(s, `${p.name} drew Chance: ${c.title}. ${c.text}`);
  switch (c.id){
    case "shield": p.shield = (p.shield || 0) + 1; return finish(s);
    case "freebuild":
      if (freeBuildOptions(s, p).length){ s.phase = "act"; s.pending = {k:"freebuild"}; return; }
      say(s, `${p.name} has no city to build on yet.`); return finish(s);
    case "taxfree": p.taxFree = true; return finish(s);
    case "pass": p.passes = (p.passes || 0) + 1; return finish(s);
    case "forward": walk(s, p, 4); return resolve(s, p);
    case "bonus": p.cash += 150; return finish(s);
    case "bday": s.players.forEach(o => { if (o !== p && !o.bankrupt) pay(s, o, p, 30); }); return finish(s);
    case "jail": if (!shielded(s, p, "trip to Lost Island")) sendJail(s, p); return finish(s);
    case "quake": {
      const hit = Object.keys(s.own).map(Number).filter(i => TILES[i].type === "city" && s.own[i].l >= 2 && s.own[i].l <= 4);
      if (!hit.length){ say(s, "The ground shook, but nothing fell."); return finish(s); }
      const i = pickOne(hit), st = s.own[i], owner = byId(s, st.o);
      if (!shielded(s, owner, `earthquake in ${TILES[i].name}`)){ st.l--; say(s, `Earthquake in ${TILES[i].name}. ${owner.name}'s city drops to ${LEVEL_NAMES[st.l]}.`); }
      return finish(s);
    }
    case "blackout": {
      const hit = Object.keys(s.own).map(Number).filter(i => TILES[i].type === "city" && !(s.blackouts && s.blackouts[i]));
      if (!hit.length){ say(s, "The power grid held. No city went dark."); return finish(s); }
      const i = pickOne(hit), owner = byId(s, s.own[i].o);
      if (!shielded(s, owner, `blackout in ${TILES[i].name}`)){ s.blackouts = s.blackouts || {}; s.blackouts[i] = until; say(s, `Blackout in ${TILES[i].name}. No rent there for ${EVENT_ROUNDS} rounds.`); }
      return finish(s);
    }
    case "fine": if (!shielded(s, p, "fine") && !charge(s, p, null, 100, "fine", `${p.name} paid a ${money(100)} fine.`)) return; return finish(s);
    case "back": { if (shielded(s, p, "wrong exit")) return finish(s); const from = p.pos; p.pos = (p.pos - 3 + N) % N; setMove(s, p, "jump", from, p.pos); return resolve(s, p); }
    case "epidemic": {
      const gs = [...new Set(Object.keys(s.own).map(Number).filter(i => TILES[i].type === "city").map(i => TILES[i].g))];
      const g = pickOne(gs.length ? gs : Object.keys(GROUPS)); s.epidemics = s.epidemics || {}; s.epidemics[g] = until;
      say(s, `Epidemic in ${regionCities(g)}. Rent there is halved for ${EVENT_ROUNDS} rounds.`); return finish(s);
    }
    case "forcesale":
      if (forceSaleOptions(s, p).length){ s.phase = "act"; s.pending = {k:"forcebuy"}; return; }
      say(s, `${p.name} has no rival city to force-buy right now.`); return finish(s);
    case "jet": jumpTo(s, p, 24, true); return resolve(s, p);
    case "demolish":
      if (demolishOptions(s, p).length){ s.phase = "act"; s.pending = {k:"demolish"}; return; }
      say(s, `${p.name} has no rival building to knock down.`); return finish(s);
  }
  return finish(s);
}
function resolve(s, p){
  const i = p.pos, t = TILES[i]; s.pending = null;
  if (t.type === "city" || t.type === "beach"){
    const st = s.own[i];
    if (!st){
      /* People always see the buy popup, even when they can not afford it (then everything in it is locked). Bots just move on. */
      if (p.cash >= t.price || !p.bot){ s.phase = "act"; s.pending = {k:"buy", tile:i}; return; }
      say(s, `${p.name} can't afford ${t.name} yet.`); return finish(s);
    }
    if (st.o === p.id) return offerUpgradeOrFinish(s, p, i);
    const owner = byId(s, st.o), stuck = owner.jail > 0 && !rules(s).islandRent, r = stuck ? 0 : rentOf(s, i);
    if (stuck) say(s, `${owner.name} is stuck on Lost Island and can't collect rent in ${t.name}.`);
    else if (r === 0) say(s, `${t.name} has no power. ${p.name} pays no rent.`);
    else if (p.shield){ p.shield--; say(s, `${p.name}'s Shield covered the ${money(r)} rent in ${t.name}.`); }
    else if (!charge(s, p, owner, r, "rent", `${p.name} paid ${money(r)} rent to ${owner.name} in ${t.name}.`)) return;
    if (p.bankrupt) return finish(s);
    if (s.own[i] && (t.type === "beach" || s.own[i].l < 5)){
      const c = 2 * tileValue(i, s.own[i]);
      if (p.cash >= c || !p.bot){ s.phase = "act"; s.pending = {k:"takeover", tile:i, cost:c}; return; }
    }
    return finish(s);
  }
  switch (t.type){
    case "fortune": return drawCard(s, p);
    case "tax": if (p.taxFree){ p.taxFree = false; say(s, `${p.name}'s tax exemption covered ${t.name}.`); return finish(s); }
    { const amt = t.id === "income" ? Math.max(50, Math.round(netWorth(s, p) * 0.1)) : 100; if (!charge(s, p, null, amt, "tax", `${p.name} paid ${money(amt)} in ${t.name}.`)) return; return finish(s); }
    case "expo":
      if (owned(s, p.id).some(j => TILES[j].type === "city")){ s.phase = "act"; s.pending = {k:"expo"}; return; }
      say(s, `${p.name} visited the Grand Expo with nothing to show.`); return finish(s);
    case "jet": p.flight = true; say(s, `${p.name} checked in at Jet Port. Next turn they can fly anywhere.`); return finish(s);
    case "jail": say(s, `${p.name} is just visiting Lost Island.`); return finish(s);
    default: return finish(s);
  }
}
function act(s0, a){
  if (!s0 || s0.status !== "playing") return {err:"The game isn't running."};
  applyLayout(s0.layout);
  const s = clone(s0); s.card = null;
  const p = s.players[s.turn];
  const E = m => ({err:m});
  /* Online, if a player doesn't move for a while, another player's game moves for them (a.auto).
     Two missed turns in a row and a bot takes over their seat. Any move of their own resets the count. */
  if (a.t !== "leave") s.autoFor = a.auto ? p.id : null;   // the rest of a missed turn plays out quickly
  if (a.t !== "leave"){
    if (a.auto && !p.bot){ if (s.phase === "roll" || s.phase === "fly"){ p.missed = (p.missed || 0) + 1; if (p.missed >= MISSED_TURNS_FOR_BOT) handOver(s, p, `${p.name} missed ${MISSED_TURNS_FOR_BOT} turns. A bot took over.`); } }
    else if (!a.auto && !p.bot) p.missed = 0;
  }
  switch (a.t){
    case "roll": {
      if (s.phase !== "roll") return E("It's not time to roll.");
      const d1 = rnd6(), d2 = rnd6(), dbl = d1 === d2;
      s.dice = [d1, d2]; s.rollId = (s.rollId||0) + 1; s.roller = p.id;
      if (p.jail > 0){
        if (dbl){ p.jail = 0; say(s, `${p.name} rolled doubles and sailed off Lost Island.`); walk(s, p, d1+d2); }
        else if (p.jail >= 3){ p.jail = 0; if (!charge(s, p, null, BAIL, "boat", `${p.name} paid ${money(BAIL)} for a boat after three tries.`, {k:"walk", n:d1+d2})) break; if (p.bankrupt){ finish(s); break; } walk(s, p, d1+d2); }
        else { p.jail++; say(s, `${p.name} rolled ${d1}+${d2} and stays on Lost Island.`); finish(s); break; }
      } else {
        /* Only double six gives another roll (any doubles still get you off Lost Island, above) */
        const sixes = d1 === 6 && d2 === 6 && rules(s).doublesAgain;
        if (sixes){ s.doubles = (s.doubles||0) + 1;
          if (s.doubles >= 3){ say(s, `${p.name} rolled double six three times in a row and washed up on Lost Island.`); sendJail(s, p); finish(s); break; }
          s.extra = true; }
        say(s, `${p.name} rolled ${d1}+${d2}${sixes ? ", double six" : ""}.`);
        walk(s, p, d1+d2);
      }
      resolve(s, p); break;
    }
    case "bail":
      if (s.phase !== "roll" || !p.jail) return E("You're not on Lost Island.");
      if (p.cash < BAIL) return E("Not enough cash for bail.");
      p.cash -= BAIL; p.jail = 0; say(s, `${p.name} paid ${money(BAIL)} for a boat off Lost Island.`); break;
    case "pass":
      if (s.phase !== "roll" || !p.jail || !p.passes) return E("No pass to use.");
      p.passes--; p.jail = 0; say(s, `${p.name} used a rescue boat pass.`); break;
    case "fly": {
      if (s.phase !== "fly") return E("You can't fly now.");
      const to = a.tile; if (!(to >= 0 && to < N) || to === 24) return E("Pick a different tile.");
      p.flight = false; say(s, `${p.name} flew to ${TILES[to].name}.`); jumpTo(s, p, to, true); resolve(s, p); break;
    }
    case "noFly":
      if (s.phase !== "fly") return E("You can't do that now.");
      p.flight = false; s.phase = "roll"; break;
    case "buy": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "buy") return E("Nothing to buy.");
      const i = s.pending.tile, t = TILES[i];
      const to = t.type === "city" ? Math.max(1, Math.min(4, stepCap(s, 0), a.to || 1)) : 1;
      if (to > buildCap(p)) return E(`On your first lap you can build up to ${LEVEL_NAMES[buildCap(p)]}.`);
      const cost = t.type === "city" ? costRange(t, 0, to) : t.price;
      if (p.cash < cost) return E("Not enough cash.");
      p.cash -= cost; s.own[i] = {o:p.id, l:to}; txn(s, p.id, null, cost);
      say(s, `${p.name} bought ${t.name}${to > 1 ? " with " + LEVEL_NAMES[to] : ""} for ${money(cost)}.`);
      finish(s); break;
    }
    case "upgrade": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "upgrade") return E("Nothing to build.");
      const i = s.pending.tile, opt = upgradeOptions(s, p, i).find(o => o.to === a.to);
      if (!opt) return E("You can't build that.");
      p.cash -= opt.cost; s.own[i].l = opt.to; txn(s, p.id, null, opt.cost); say(s, `${p.name} built ${opt.to === 5 ? "a Landmark" : "up to " + LEVEL_NAMES[opt.to]} in ${TILES[i].name} for ${money(opt.cost)}.`);
      finish(s); break;
    }
    case "takeover": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "takeover") return E("Nothing to take over.");
      const i = s.pending.tile, st = s.own[i]; const c = 2 * tileValue(i, st); const owner = byId(s, st.o);
      if (p.cash < c) return E("Not enough cash.");
      p.cash -= c; owner.cash += c; st.o = p.id; txn(s, p.id, owner.id, c); say(s, `${p.name} bought out ${owner.name}'s ${TILES[i].name} for ${money(c)}.`);
      checkWin(s); if (s.status === "over") break;
      offerUpgradeOrFinish(s, p, i); break;
    }
    case "expo": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "expo") return E("No expo to host.");
      const st = s.own[a.tile]; if (!st || st.o !== p.id || TILES[a.tile].type !== "city") return E("Pick one of your own cities.");
      s.expo = a.tile; say(s, `${p.name} brought the Grand Expo to ${TILES[a.tile].name}. Rent there is doubled.`); finish(s); break;
    }
    case "freebuild": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "freebuild") return E("Nothing to build.");
      if (!freeBuildOptions(s, p).includes(a.tile)) return E("Pick one of your cities that can grow.");
      const st = s.own[a.tile]; st.l++;
      say(s, `${p.name} built ${st.l === 5 ? "a Landmark" : "up to " + LEVEL_NAMES[st.l]} in ${TILES[a.tile].name} for free.`); finish(s); break;
    }
    case "demolish": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "demolish") return E("Nothing to knock down.");
      if (!demolishOptions(s, p).includes(a.tile)) return E("Pick a rival city with a building.");
      const st = s.own[a.tile], owner = byId(s, st.o), was = LEVEL_NAMES[st.l];
      if (!shielded(s, owner, `demolition in ${TILES[a.tile].name}`)){ st.l--; say(s, `${p.name} knocked down ${owner.name}'s ${was} in ${TILES[a.tile].name}. It is now ${LEVEL_NAMES[st.l]}.`); }
      finish(s); break;
    }
    case "forcebuy": {
      if (s.phase !== "act" || !s.pending || s.pending.k !== "forcebuy") return E("Nothing to buy.");
      if (!forceSaleOptions(s, p).includes(a.tile)) return E("You can't buy that city.");
      const st = s.own[a.tile], owner = byId(s, st.o), c = tileValue(a.tile, st);
      p.cash -= c; owner.cash += c; st.o = p.id; txn(s, p.id, owner.id, c); say(s, `${p.name} forced ${owner.name} to sell ${TILES[a.tile].name} for ${money(c)}.`);
      checkWin(s); if (s.status === "over") break; finish(s); break;
    }
    case "sell": {
      if (!s.pending || s.pending.k !== "debt") return E("Nothing to pay.");
      const tiles = [...new Set(a.tiles || [])].filter(i => s.own[i] && s.own[i].o === p.id); if (!tiles.length) return E("Pick at least one city to sell.");
      tiles.forEach(i => sellTile(s, p, i));
      if (!settleDebt(s, p)){ if (!owned(s, p.id).length) giveUp(s, p); else say(s, `${p.name} still needs ${money(s.pending.amt - p.cash)} more.`); }
      break;
    }
    case "autosell":
      if (!s.pending || s.pending.k !== "debt") return E("Nothing to pay.");
      liquidate(s, p, s.pending.amt); if (!settleDebt(s, p)) giveUp(s, p); break;
    case "bankrupt":
      if (!s.pending || s.pending.k !== "debt") return E("Nothing to pay.");
      say(s, `${p.name} declared bankruptcy.`); giveUp(s, p); break;
    case "skip":
      if (s.phase !== "act" || (s.pending && s.pending.k === "debt")) return E("Nothing to skip.");
      finish(s); break;
    case "leave": {   // a player leaves an online game: a bot plays their seat from now on
      const tgt = byId(s, a.pid); if (!tgt || tgt.bankrupt || tgt.left) return E("That player has already left.");
      handOver(s, tgt, `${tgt.name} left. A bot took over.`); break;
    }
    case "remove": {
      const tgt = byId(s, a.pid); if (!tgt || tgt.bankrupt) return E("That player is already out.");
      const wasTurn = s.players[s.turn] === tgt; say(s, `${tgt.name} was removed from the game.`); bankrupt(s, tgt);
      checkWin(s); if (s.status === "over") break; if (wasTurn) nextTurn(s); break;
    }
    default: return E("Unknown move.");
  }
  s.rev = (s.rev||0) + 1; s.moveAt = Date.now();   // moveAt: when the last move happened, for the idle check online
  return {s};
}
function botAction(s){
  const p = s.players[s.turn];
  if (s.phase === "roll"){ if (p.jail){ if (p.passes) return {t:"pass"}; if (p.cash > 500) return {t:"bail"}; } return {t:"roll"}; }
  if (s.phase === "fly"){
    let best = null, score = -1;
    TILES.forEach((t, i) => { if (i === 24) return; if ((t.type === "city" || t.type === "beach") && !s.own[i] && t.price <= p.cash - 150 && t.price > score){ score = t.price; best = i; } });
    if (best == null && rules(s).botBuild){ const mine = owned(s, p.id).filter(i => upgradeOptions(s, p, i).length); if (mine.length) best = mine[0]; }
    return best == null ? {t:"noFly"} : {t:"fly", tile:best};
  }
  if (s.phase === "act" && s.pending){
    const k = s.pending.k, i = s.pending.tile, t = TILES[i];
    if (k === "buy"){
      if (t.price > p.cash - 120) return {t:"skip"};
      if (t.type !== "city") return {t:"buy"};
      let to = 1; if (rules(s).botBuild) for (let l = 2; l <= Math.min(4, buildCap(p), stepCap(s, 0)); l++) if (costRange(t, 0, l) <= p.cash - 300) to = l;
      return {t:"buy", to};
    }
    if (!rules(s).botBuild && (k === "upgrade" || k === "freebuild")) return {t:"skip"};
    if (k === "upgrade"){ const o = upgradeOptions(s, p, i).filter(o => o.cost <= p.cash - 250); return o.length ? {t:"upgrade", to:o[o.length-1].to} : {t:"skip"}; }
    if (k === "takeover"){ const g = t.g; const help = g && TILES.some((u, j) => u.g === g && j !== i && s.own[j] && s.own[j].o === p.id); return (s.pending.cost <= p.cash - 300 && (help || Math.random() < .45)) ? {t:"takeover"} : {t:"skip"}; }
    if (k === "debt") return {t:"autosell"};
    if (k === "freebuild"){ const o = freeBuildOptions(s, p).sort((a, b) => TILES[b].price - TILES[a].price); return o.length ? {t:"freebuild", tile:o[0]} : {t:"skip"}; }
    if (k === "demolish"){ const o = demolishOptions(s, p).sort((a, b) => rentOf(s, b) - rentOf(s, a)); return o.length ? {t:"demolish", tile:o[0]} : {t:"skip"}; }
    if (k === "forcebuy"){ const o = forceSaleOptions(s, p).filter(j => tileValue(j, s.own[j]) <= p.cash - 300).sort((a, b) => rentOf(s, b) - rentOf(s, a)); return o.length ? {t:"forcebuy", tile:o[0]} : {t:"skip"}; }
    if (k === "expo"){ const mine = owned(s, p.id).filter(j => TILES[j].type === "city").sort((a, b) => rentOf(s, b) - rentOf(s, a)); return {t:"expo", tile:mine[0]}; }
  }
  return {t:"skip"};
}
function mkPlayer(id, name, seat, bot, look){ return {id, name, color:PCOLORS[seat], look:look ?? seat, cash:START_CASH, pos:0, laps:0, jail:0, flight:false, passes:0, bankrupt:false, bot:!!bot}; }
function newState(players, extra){
  const s = Object.assign({layout:SHUFFLE_CITIES ? makeLayout() : null, status:"playing", players, own:{}, expo:null, turn:0, phase:"roll", pending:null, dice:[3,4], rollId:0, doubles:0, extra:false, log:[], rev:1, moveSeq:0, cardSeq:0, round:1, card:null, festivals:[], blackouts:{}, epidemics:{}}, extra||{});
  s.rules = Object.assign({}, DEFAULT_SETTINGS, s.rules); applyLayout(s.layout);
  if (s.status === "playing") startGame(s);   // online rooms start from the lobby with startGame()
  return s;
}
function demoState(){
  const s = newState([mkPlayer("d1","Asha",0,true,0), mkPlayer("d2","Kabir",1,true,8), mkPlayer("d3","Mei",2,true,5), mkPlayer("d4","Zara",3,true,11)]);
  s.status = "demo";
  s.own = {1:{o:"d1",l:3}, 2:{o:"d1",l:2}, 6:{o:"d2",l:1}, 10:{o:"d3",l:4}, 13:{o:"d2",l:1}, 17:{o:"d2",l:5}, 22:{o:"d3",l:2}, 25:{o:"d4",l:3}, 30:{o:"d1",l:1}, 31:{o:"d4",l:2}};
  s.expo = 17; s.players[0].pos = 4; s.players[1].pos = 19; s.players[2].pos = 26; s.players[3].pos = 11; s.turn = 1;
  return s;
}
