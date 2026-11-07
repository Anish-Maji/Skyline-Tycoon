"use strict";
/* ================= APP ================= */
const $ = id => document.getElementById(id);
const app = {mode:null, setup:null, pickSeat:null, s:null, me:null, db:null, user:null, code:null, unsub:null, writing:false, readOnly:false, sel:-1, lastRoll:-1, lastCard:-1, lastOwnCount:0, lastStatus:null, loadTimer:null, popKey:null, popDismissed:null};
const esc = v => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function store(k, v){ try{ if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} }
function load(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
let toastT = null;
function toast(m){ const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
const PIPS = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function setDie(el, v){ el.innerHTML = ""; for (let k = 0; k < 9; k++){ const i = document.createElement("i"); if (PIPS[v].includes(k)) i.className = "on"; el.appendChild(i); } }
function isHost(){ return app.mode === "online" && app.s && app.s.host === app.me; }
function canControl(p){ if (!p || app.s.status !== "playing") return false; if (app.mode === "offline") return !p.bot; return !app.readOnly && p.id === app.me && !p.bot; }

function setState(s, opts){
  applyLayout(s.layout);   // this game's city order and prices
  const prev = app.s; app.s = s; board.setState(s, opts);
  /* money animation for purchases and buyouts (not when loading a game) */
  const tx = s.tx; if (tx && tx.seq !== app.lastTx){ if (prev && !(opts && opts.reset) && app.lastTx != null){ const ix = id => s.players.findIndex(p => p.id === id); board.moneyFly(ix(tx.from), tx.to ? ix(tx.to) : -1, tx.amt); } app.lastTx = tx.seq; }
  if (opts && opts.reset) app.lastTx = tx ? tx.seq : 0;
  if (s.status === "playing" && s.rollId === 0 && (!prev || prev.status !== "playing")) board.celebrate(s.festivals);   // a new game begins: festival flags pop up
  if (s.status === "playing" || s.status === "over"){
    if (prev && s.rollId !== app.lastRoll && app.lastRoll !== -1){ sfx("dice"); const d1 = $("d1"), d2 = $("d2"); d1.classList.remove("roll"); d2.classList.remove("roll"); void d1.offsetWidth; d1.classList.add("roll"); d2.classList.add("roll"); }
    const oc = Object.keys(s.own).length; if (prev && oc > app.lastOwnCount) sfx("buy");
    if (s.card && s.card.seq !== app.lastCard){ app.lastCard = s.card.seq; showCard(Object.assign({}, s.card)); }
    if (prev && s.status === "over" && app.lastStatus !== "over") sfx("win");
    app.lastOwnCount = oc; app.lastRoll = s.rollId; app.lastStatus = s.status;
  }
  render(); scheduleBot();
}
let cardT = null;
/* The Chance card that pops up in the middle for everyone, whoever drew it:
   a ribbon with the card name, its picture, the text, and who drew it. Colored by kind: Boost, Setback or World event.
   It closes by itself after CARD_SHOW_MS, or when tapped. */
const CARD_SHOW_MS = 4200, CARD_AFTER_MS = 350;   // how long the card stays, and the pause after the character lands
/* True while a Chance card is waiting to show or is on screen. The next move waits for it. */
let cardOpen = false;
const cardBusy = () => cardOpen;
function showCard(card, waited){
  cardOpen = true;
  /* Wait until the dice are gone and the character is standing on the Chance tile, then a short beat (CARD_AFTER_MS).
     The 15 s limit is only a safety net. */
  waited = waited || 0;
  if (board.busy() && waited < 15000){ clearTimeout(cardT); cardT = setTimeout(() => showCard(card, waited + 100), 100); return; }
  if (!card.ready && waited < 15000){ card.ready = true; clearTimeout(cardT); cardT = setTimeout(() => showCard(card, waited + CARD_AFTER_MS), CARD_AFTER_MS); return; }
  const K = CARD_KINDS[card.kind] || {label:"Chance", color:"#f0582f"}, C = CARDS.find(x => x.id === card.id) || {};
  const el = $("card"), who = app.s && byId(app.s, card.pid);
  el.style.setProperty("--kc", K.color);
  $("cardTitle").textContent = (card.title || C.title || "Chance").toUpperCase();
  $("cardText").textContent = C.text || card.text;
  $("cardKind").textContent = "Chance · " + K.label;
  $("cardWho").textContent = who ? (app.mode === "online" && who.id === app.me ? "You drew this" : who.name + " drew this") : "";
  $("cardWho").style.setProperty("--pc", who ? who.color : "transparent");
  const art = $("cardArt"); art.innerHTML = ""; art.appendChild(chanceArt(card.id, K.color));
  sfx("card"); el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(cardT); cardT = setTimeout(hideCard, CARD_SHOW_MS);
}
function hideCard(){ clearTimeout(cardT); $("card").hidden = true; if (cardOpen){ cardOpen = false; render(); scheduleBot(); } }
$("card").onclick = hideCard;

function render(){
  const s = app.s; if (!s) return;
  setDie($("d1"), s.dice[0]); setDie($("d2"), s.dice[1]); $("d1").parentNode.setAttribute("aria-label", `Dice: ${s.dice[0]} and ${s.dice[1]}`);
  const cur = s.players[s.turn];
  $("turnline").textContent = s.status === "demo" ? "Demo board" : s.status === "over" ? "Game over" : s.status === "lobby" ? "Waiting in lobby" : `${cur.name}'s turn${cur.jail ? " · on Lost Island" : ""}`;
  renderPlayers(); renderActions(); syncPopup(); board.think(thinkingText(s));
  $("roomChip").hidden = app.mode !== "online"; if (app.mode === "online") $("roomChip").textContent = "Room " + app.code;
  if (s.status === "over" && app.mode) showOver();
}
/* What the current player is deciding, shown in a thought bubble over their head so everyone can follow along */
const THINKING = {buy:"Thinking about buying", upgrade:"Thinking about building", takeover:"Thinking about a buyout",
  expo:"Picking an Expo city", freebuild:"Picking a city to build", forcebuy:"Picking a city to buy", debt:"Working out how to pay"};
function thinkingText(s){
  if (s.status !== "playing") return null;
  if (s.phase === "fly") return "Picking where to fly";
  return s.phase === "act" && s.pending ? THINKING[s.pending.k] || null : null;
}
/* Corner panels, in seat order: top-left, top-right, bottom-right, bottom-left. Each seat's money pile sits next to its panel. */
const CORNERS = ["tl", "tr", "br", "bl"];
function renderPlayers(){
  const s = app.s, box = $("players"); box.innerHTML = "";
  s.players.forEach((p, idx) => {
    const corner = CORNERS[idx % 4], d = document.createElement("div");
    d.className = `cp ${corner}` + (idx === s.turn && s.status === "playing" ? " turn" : "") + (p.bankrupt ? " out" : ""); d.style.setProperty("--pc", p.color);
    const tag = p.bot ? "Bot" : (app.mode === "online" && p.id === app.me ? "You" : "");
    const props = owned(s, p.id).length;
    const av = document.createElement("div"); av.className = "cp-av";
    const size = innerWidth <= 640 ? 46 : 68, facing = corner === "tl" || corner === "bl" ? "right" : "left";
    av.appendChild(tycoonArt.liveCanvas(size, size, (c, t) => drawTycoon(c, size/2, size*1.9, size*1.85, p.look ?? idx, {facing, t:t + idx*1.3})));
    d.appendChild(av);
    const info = document.createElement("div"); info.className = "cp-info";
    info.innerHTML = `<div class="cp-name"></div><div class="cp-cash"></div><div class="cp-sub">${tag ? tag + " · " : ""}${props} ${props === 1 ? "property" : "properties"}${p.passes ? " · escape card" : ""}${p.shield ? " · shield" : ""}${p.taxFree ? " · tax free" : ""}${p.flight ? " · flight ready" : ""}${!p.laps && s.status === "playing" ? " · first lap" : ""}</div>`;
    info.querySelector(".cp-name").textContent = p.name; info.querySelector(".cp-cash").textContent = p.bankrupt ? "Out" : moneyFull(p.cash);
    if (isHost() && s.status === "playing" && !p.bankrupt && p.id !== app.me){
      const b = document.createElement("button"); b.className = "mini"; b.textContent = "Remove";
      b.onclick = () => { if (b.dataset.confirm){ dispatch({t:"remove", pid:p.id}, true); } else { b.dataset.confirm = "1"; b.textContent = "Confirm remove"; setTimeout(() => { b.textContent = "Remove"; delete b.dataset.confirm; }, 3000); } };
      info.querySelector(".cp-sub").append(" ", b);
    }
    d.appendChild(info); box.appendChild(d);
  });
  fitCash();
}
/* Full amounts can get long: shrink a corner panel's cash text until it fits */
function fitCash(){ document.querySelectorAll(".cp-cash").forEach(e => { e.style.fontSize = ""; let f = parseFloat(getComputedStyle(e).fontSize); while (e.scrollWidth > e.clientWidth && f > 9){ f -= 1; e.style.fontSize = f + "px"; } }); }
addEventListener("resize", fitCash);
function btn(label, onclick, cls){ const b = document.createElement("button"); b.className = "btn " + (cls||""); b.textContent = label; b.onclick = onclick; return b; }
/* The middle of the board: the turn line, a speech bubble with a prompt for the player whose move it is, and the buttons.
   The news log (who bought what, who paid rent) is not shown here. */
function renderActions(){
  const s = app.s, box = $("actions"); box.innerHTML = ""; board.setSelectable(null); hideDebt();
  const tell = t => { $("bubble").textContent = t; };
  tell("");
  if (s.status === "demo"){ tell("Pick a mode to start playing."); box.appendChild(btn("Play", showHome, "big")); return; }
  if (s.status === "over"){ const w = byId(s, s.winner); tell(w ? `${w.name} wins. ${s.winReason}.` : "Game over."); box.appendChild(btn("Back to menu", leaveGame, "big")); return; }
  if (s.status !== "playing") return;
  const p = s.players[s.turn];
  if (s.phase === "act" && s.pending && s.pending.k === "debt"){
    if (canControl(p) && !board.busy() && !app.writing){ tell(`Raise ${money(s.pending.amt)} by selling property.`); showDebt(s, p); }
    else tell(`${p.name} is selling property to pay ${money(s.pending.amt)}.`);
    return;
  }
  if (!canControl(p)){
    if (app.mode === "online" && app.readOnly) tell("You're watching. Ask the room owner for edit access to play.");
    return;
  }
  if (board.busy() || app.writing || cardBusy()) return;
  if (s.phase === "roll"){
    if (p.jail){ tell(`Stranded on Lost Island (try ${p.jail} of 3). Roll doubles or pay ${money(BAIL)} for a boat.`); box.appendChild(btn("Roll for doubles", () => dispatch({t:"roll"}))); if (p.cash >= BAIL) box.appendChild(btn(`Pay ${money(BAIL)}`, () => dispatch({t:"bail"}), "ghost")); if (p.passes) box.appendChild(btn("Use pass", () => dispatch({t:"pass"}), "ghost")); }
    else { if (s.doubles) tell("Double six. Roll again."); box.appendChild(btn("Roll dice", () => dispatch({t:"roll"}), "big")); }
  } else if (s.phase === "fly"){
    tell("Flight ready. Tap a tile or pick one here.");
    board.setSelectable(new Set(TILES.map((t, i) => i).filter(i => i !== 24)));
    const sl = document.createElement("select"); sl.id = "flySel"; sl.setAttribute("aria-label", "Destination");
    TILES.forEach((t, i) => { if (i === 24) return; const o = document.createElement("option"); o.value = i; o.textContent = t.name + (s.own[i] ? ` (${byId(s, s.own[i].o).name})` : t.price ? ` · ${money(t.price)}` : ""); sl.appendChild(o); });
    box.appendChild(sl); box.appendChild(btn("Fly", () => dispatch({t:"fly", tile:+sl.value}))); box.appendChild(btn("Skip", () => dispatch({t:"noFly"}), "ghost"));
  } else if (s.phase === "act" && s.pending){
    const k = s.pending.k;
    if (k === "expo"){
      tell("Host the Grand Expo. Pick a city to double its rent.");
      const mine = owned(s, p.id).filter(j => TILES[j].type === "city"); board.setSelectable(new Set(mine));
      const sl = document.createElement("select"); sl.id = "expoSel"; sl.setAttribute("aria-label", "Expo city");
      mine.forEach(j => { const o = document.createElement("option"); o.value = j; o.textContent = `${TILES[j].name} · ${money(rentOf(s, j))}`; sl.appendChild(o); });
      box.appendChild(sl); box.appendChild(btn("Host here", () => dispatch({t:"expo", tile:+sl.value})));
    } else if (k === "freebuild" || k === "forcebuy"){
      const free = k === "freebuild", opts = free ? freeBuildOptions(s, p) : forceSaleOptions(s, p); board.setSelectable(new Set(opts));
      tell(free ? "Free build. Pick one of your cities to grow by one level." : "Force sale. Pick a rival city to buy at its normal value.");
      const sl = document.createElement("select"); sl.setAttribute("aria-label", free ? "City to build in" : "City to buy");
      opts.forEach(j => { const st = s.own[j], o = document.createElement("option"); o.value = j;
        o.textContent = free ? `${TILES[j].name} · ${LEVEL_NAMES[st.l + 1]}` : `${TILES[j].name} · ${byId(s, st.o).name} · ${money(tileValue(j, st))}`; sl.appendChild(o); });
      box.appendChild(sl); box.appendChild(btn(free ? "Build free" : "Buy", () => dispatch({t:k, tile:+sl.value}))); box.appendChild(btn("Skip", () => dispatch({t:"skip"}), "ghost"));
    } else {
      /* buy, build or buyout: the city card or the beach card opens by itself (syncPopup), so no buttons here */
    }
  }
}
/* ---------- Not enough money ----------
   A red alert flashes first, then the sell card. Tags on the board show what each property sells for;
   tap a tag or the tile to select it. The card adds up cash plus the selected sales against the money needed. */
const DEBT_TEXT = {rent:"pay rent", tax:"pay tax", fine:"pay the fine", boat:"pay for the boat"};
const debtUI = {id:null, sel:new Set(), until:0, timer:null};
function debtId(s){ const d = s.pending; return [s.turn, d.amt, d.why, s.moveSeq, s.cardSeq, s.rollId].join(":"); }
function showDebt(s, p){
  const d = s.pending, id = debtId(s), now = performance.now();
  if (debtUI.id !== id){ debtUI.id = id; debtUI.sel = new Set(); debtUI.until = now + 1900;
    $("alertText").textContent = `YOU DON'T HAVE ENOUGH MONEY TO ${(DEBT_TEXT[d.why] || "pay").toUpperCase()}`; $("alertBand").hidden = false; sfx("crash"); }
  const mine = owned(s, p.id); debtUI.sel.forEach(i => { if (!mine.includes(i)) debtUI.sel.delete(i); });
  clearTimeout(debtUI.timer);
  if (now < debtUI.until){ debtUI.timer = setTimeout(render, debtUI.until - now + 20); return; }
  $("alertBand").hidden = true;
  board.setSelectable(new Set(mine)); $("hub").classList.add("dimmed");
  const sale = [...debtUI.sel].reduce((a, i) => a + saleValue(s, i), 0), left = p.cash + sale - d.amt;
  $("dNeed").textContent = money(d.amt); $("dCash").textContent = moneyFull(p.cash); $("dSale").textContent = sale ? "+" + money(sale) : money(0);
  $("dLeftK").textContent = left >= 0 ? "Left after paying" : "Still short"; $("dLeft").textContent = moneyFull(Math.abs(left)); $("dLeft").className = left >= 0 ? "ok" : "short";
  $("dMsg").textContent = `You don't have enough money to ${DEBT_TEXT[d.why] || "pay"}. Sell your property.`;
  $("dSell").disabled = !debtUI.sel.size; $("dSell").textContent = debtUI.sel.size ? `Sell ${debtUI.sel.size} for ${money(sale)}` : "Sell";
  $("dSell").onclick = () => dispatch({t:"sell", tiles:[...debtUI.sel]});
  $("dAuto").onclick = () => dispatch({t:"autosell"});
  const bk = $("dBankrupt"); bk.textContent = "Bankrupt"; delete bk.dataset.confirm;
  bk.onclick = () => { if (bk.dataset.confirm) dispatch({t:"bankrupt"}); else { bk.dataset.confirm = "1"; bk.textContent = "Tap again to confirm"; setTimeout(() => { if (bk.isConnected){ bk.textContent = "Bankrupt"; delete bk.dataset.confirm; } }, 3000); } };
  $("debt").hidden = false; placeSellTags(s, p);
}
function placeSellTags(s, p){
  const box = $("sellTags"); box.innerHTML = "";
  owned(s, p.id).forEach(i => {
    const [x, y] = board.screenOf(i), b = document.createElement("button");
    b.className = "selltag" + (debtUI.sel.has(i) ? " on" : ""); b.style.left = x + "px"; b.style.top = y + "px";
    b.setAttribute("aria-pressed", String(debtUI.sel.has(i))); b.setAttribute("aria-label", `Sell ${TILES[i].name} for ${money(saleValue(s, i))}`);
    b.innerHTML = `<span class="box"></span><span></span><span class="nm"></span>`; b.children[1].textContent = money(saleValue(s, i)); b.children[2].textContent = TILES[i].name;
    b.onclick = () => toggleSell(i); box.appendChild(b);
  });
  /* nudge tags up until none overlap */
  const placed = [];
  [...box.children].sort((a, b) => parseFloat(b.style.top) - parseFloat(a.style.top)).forEach(t => {
    for (let k = 0; k < 8; k++){ const r = t.getBoundingClientRect(); if (!placed.some(q => r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom)) break; t.style.top = (parseFloat(t.style.top) - r.height - 6) + "px"; }
    placed.push(t.getBoundingClientRect());
  });
}
function toggleSell(i){ if (debtUI.sel.has(i)) debtUI.sel.delete(i); else debtUI.sel.add(i); sfx("hop"); render(); }
function hideDebt(){ $("debt").hidden = true; $("sellTags").innerHTML = ""; $("hub").classList.remove("dimmed"); if (!(app.s && app.s.pending && app.s.pending.k === "debt")){ $("alertBand").hidden = true; debtUI.id = null; } }
addEventListener("resize", () => { if (!$("debt").hidden) render(); });

/* ============ Build popup (level cards) ============ */
const pop = {sel:1};
function syncPopup(){
  const s = app.s, m = $("bmodal"); if (m.classList.contains("leaving")) return;
  const p = s && s.status === "playing" ? s.players[s.turn] : null;
  const ok = p && canControl(p) && s.phase === "act" && s.pending && ["buy","upgrade","takeover"].includes(s.pending.k) && !board.busy() && !app.writing;
  if (!ok){ m.hidden = true; app.popKey = null; return; }
  const key = s.rev + ":" + s.pending.k;
  if (app.popDismissed === key) { m.hidden = true; return; }
  if (app.popKey === key && !m.hidden) return;
  app.popKey = key; buildPopup(s, p); m.hidden = false; setTimeout(() => $("bbuy").focus(), 30);
}
/* Beach card: the resort picture on the left, the rent for 1 to 4 beaches on the right, with the row that applies highlighted */
function beachPanel(color, n){
  const d = document.createElement("div"); d.className = "bpanel";
  d.innerHTML = `<div class="bp-art"></div><div class="bp-info"><p>Rent depends on how many beaches the owner has</p><div class="bp-rows" role="table" aria-label="Beach rent"></div></div>`;
  d.querySelector(".bp-art").appendChild(levelArt(1, color, "beach", 2));
  const rows = d.querySelector(".bp-rows");
  [1, 2, 3, 4].forEach(k => { const r = document.createElement("div"); r.className = "bp-row" + (k === n ? " on" : ""); r.setAttribute("role", "row");
    r.innerHTML = `<span role="cell">${k} ${k === 1 ? "Beach" : "Beaches"}</span><b role="cell">${money(beachRent(k))}</b>`; rows.appendChild(r); });
  return d;
}
function buildPopup(s, p){
  const k = s.pending.k, i = s.pending.tile, t = TILES[i], st = s.own[i];
  const color = t.type === "city" ? GROUPS[t.g].color : BEACH_COLOR;
  $("bhead").style.background = color;
  const title = $("btitle"); title.textContent = t.name.toUpperCase();
  const lv = $("blevels"); lv.innerHTML = "";
  if (k === "takeover"){
    const owner = byId(s, st.o);
    title.innerHTML = `<small></small>${esc(t.name.toUpperCase())}`; title.querySelector("small").textContent = "Owned by " + owner.name;
    const card = document.createElement("div"); card.className = "lv owned"; card.style.maxWidth = "180px"; card.style.justifySelf = "center";
    if (t.type === "beach") lv.appendChild(beachPanel(owner.color, owned(s, owner.id).filter(j => TILES[j].type === "beach").length));
    else { card.appendChild(levelArt(st.l, owner.color, t.type)); card.insertAdjacentHTML("beforeend", `<div class="lab">${LEVEL_NAMES[st.l]}</div>`); lv.appendChild(card); }
    $("brent").innerHTML = `Rent rate: <b>${money(rentOf(s, i))}</b>`;
    const b = $("bbuy"); b.disabled = p.cash < s.pending.cost; b.textContent = b.disabled ? `Not enough money (${money(s.pending.cost)})` : `Take over for ${money(s.pending.cost)}`; b.onclick = () => closePop({t:"takeover"});
    $("bfoot").innerHTML = (p.cash < s.pending.cost ? `You need <b>${money(s.pending.cost - p.cash)}</b> more to buy it out.` : `${esc(owner.name)} gets the money and can't refuse. You'll have <b>${moneyFull(p.cash - s.pending.cost)}</b> left.`);
    $("bskip").textContent = "No thanks";
    return;
  }
  if (t.type === "beach"){
    const n = owned(s, p.id).filter(j => TILES[j].type === "beach").length + 1;
    lv.appendChild(beachPanel(p.color, n));
    $("brent").innerHTML = `Rent rate: <b>${money(beachRent(n))}</b>`;
    const b = $("bbuy"); b.disabled = p.cash < t.price; b.textContent = b.disabled ? `Not enough money (${money(t.price)})` : `Buy for ${money(t.price)}`; b.onclick = () => closePop({t:"buy"});
    $("bfoot").innerHTML = `Other players can buy it from you for: <b>${money(2*t.price)}</b>`; $("bskip").textContent = "Not now";
    return;
  }
  const cur = k === "buy" ? 0 : st.l, cap = buildCap(p), step = stepCap(s, cur);
  pop.sel = k === "buy" ? 1 : Math.min(cur === 4 ? 5 : 4, cur + 1, Math.max(cap, cur));
  if (costRange(t, cur, pop.sel) > p.cash) pop.sel = cur;   // can not afford even the first step: nothing is selected
  const cards = [];
  for (let L = 1; L <= 5; L++){
    const c = document.createElement("div"); c.className = "lv"; c.tabIndex = 0; c.setAttribute("role", "checkbox");
    c.appendChild(levelArt(L, p.color, "city"));
    c.insertAdjacentHTML("beforeend", `<div class="lab"><span class="box"></span>${LEVEL_NAMES[L]}</div><div class="cost"></div>`);
    const costEl = c.querySelector(".cost");
    const isOwned = L <= cur, cost = isOwned ? 0 : costRange(t, cur, L);
    const allowed = !isOwned && L <= cap && L <= step && (L === 5 ? cur === 4 : L <= 4) && cost <= p.cash;
    if (isOwned){ c.classList.add("owned"); costEl.textContent = "Built"; c.tabIndex = -1; }
    else if (L > cap){ c.classList.add("locked", "lap"); costEl.textContent = money(costRange(t, cur, L)); c.tabIndex = -1;
      c.insertAdjacentHTML("afterbegin", `<span class="lap-tag">Not available during the first lap</span>`); }
    else if (L > step && !(L === 5 && cur < 4)){ c.classList.add("locked"); costEl.textContent = "Next visit"; c.tabIndex = -1; }
    else if (L === 5 && cur < 4){ c.classList.add("locked"); costEl.textContent = "After House 3"; c.tabIndex = -1; }
    else if (L === 1 || L < 5 || cur === 4){ costEl.textContent = (L === cur + 1 ? "" : "Total ") + money(cost); if (!allowed){ c.classList.add("locked"); c.tabIndex = -1; } }
    const choose = () => { if (!allowed) return; pop.sel = (pop.sel === L && L > Math.max(cur + 1, 1)) ? L - 1 : L; if (k === "upgrade" && pop.sel < cur + 1 && L === cur + 1 && pop.sel === L) pop.sel = L; refresh(); };
    c.onclick = choose; c.onkeydown = e => { if (e.key === " " || e.key === "Enter"){ e.preventDefault(); choose(); } };
    lv.appendChild(c); cards.push({c, L});
  }
  function refresh(){
    cards.forEach(({c, L}) => { const on = L <= pop.sel; c.classList.toggle("on", on); c.setAttribute("aria-checked", String(on)); });
    const lvl = Math.max(pop.sel, 1), cost = costRange(t, cur, pop.sel);
    $("brent").innerHTML = `Rent rate: <b>${money(cityRent(s, i, lvl, p.id))}</b>`;
    const b = $("bbuy"); b.disabled = pop.sel <= cur || cost > p.cash;
    b.textContent = pop.sel <= cur ? (costRange(t, cur, cur + 1) > p.cash ? `Not enough money (${money(costRange(t, cur, cur + 1))})` : "Pick something to build") : `${k === "buy" ? "Buy" : "Build"} for ${money(cost)}`;
    b.onclick = () => closePop(k === "buy" ? {t:"buy", to:pop.sel} : {t:"upgrade", to:pop.sel});
    $("bfoot").innerHTML = (pop.sel >= 5 ? "Landmarks can't be bought from you." : `Other players can buy it from you for: <b>${money(2*costRange(t, 0, lvl))}</b>`)
      + (cap < 5 ? `<br>First lap: you can build up to ${LEVEL_NAMES[cap]}. Pass Start to unlock the rest.` : "")
      + (step < 5 && cur < 4 ? "<br>You can build one level each time you land here." : "");
  }
  $("bskip").textContent = k === "buy" ? "Not now" : "Done building";
  refresh();
}
/* The card shrinks and fades out (CSS .leaving), then hides. The move is sent right away. */
function closePop(a){ app.popDismissed = app.popKey; leavePop(); dispatch(a); }
function leavePop(){ const m = $("bmodal"); if (m.hidden || m.classList.contains("leaving")) return; m.classList.add("leaving"); setTimeout(() => { m.hidden = true; m.classList.remove("leaving"); }, 260); }
$("bclose").onclick = () => closePop({t:"skip"});
$("bskip").onclick = () => closePop({t:"skip"});
$("bmodal").addEventListener("keydown", e => { if (e.key === "Escape") closePop({t:"skip"}); });

board.onClick(i => {
  const s = app.s; if (!s) return;
  const p = s.status === "playing" ? s.players[s.turn] : null;
  if (p && canControl(p) && !board.busy() && !app.writing){
    if (s.phase === "fly" && i !== 24){ dispatch({t:"fly", tile:i}); return; }
    if (s.phase === "act" && s.pending && s.pending.k === "debt"){ if (s.own[i] && s.own[i].o === p.id && performance.now() >= debtUI.until) toggleSell(i); return; }
    if (s.phase === "act" && s.pending && (s.pending.k === "freebuild" || s.pending.k === "forcebuy") && (s.pending.k === "freebuild" ? freeBuildOptions(s, p) : forceSaleOptions(s, p)).includes(i)){ dispatch({t:s.pending.k, tile:i}); return; }
    if (s.phase === "act" && s.pending && s.pending.k === "expo" && s.own[i] && s.own[i].o === p.id && TILES[i].type === "city"){ dispatch({t:"expo", tile:i}); return; }
  }
  /* Tapping a tile only does something when a move asks you to pick one (flight, Expo, Chance card, selling). */
});
board.onIdle(() => { render(); scheduleBot(); });

async function dispatch(a, asHost){
  const s = app.s; if (!s || app.writing) return;
  const p = s.players[s.turn];
  if (!asHost && !canControl(p)) return;
  const res = act(s, a); if (res.err){ toast(res.err); app.popDismissed = null; render(); return; }   // a refused move reopens the card
  if (app.mode === "online"){
    app.writing = true; setState(res.s);
    try{ await app.db.doc("games/" + app.code).set(res.s); }
    catch(e){ toast(writeError(e)); app.popDismissed = null; }
    finally{ app.writing = false; render(); }
  } else { setState(res.s); saveOffline(); }
}
function writeError(e){
  if (e && e.code === "invalid_argument"){ app.readOnly = true; return "You can watch this room but can't make moves. Ask the owner for edit access."; }
  if (e && e.code === "quota_exceeded") return "Room storage is full. Start a new room from the menu.";
  return "Couldn't save that move. Check your connection and try again.";
}
let botTimer = null, botKey = null;
const BOT_THINK_MS = 1700;   // how long a bot "thinks" over a decision, so its thought bubble shows
function scheduleBot(){
  const s = app.s; if (!s || s.status !== "playing") return;
  const p = s.players[s.turn]; if (!p.bot) return;
  if (app.mode === "online" && !isHost()) return;
  if (app.mode !== "online" && app.mode !== "offline") return;
  const key = s.rev + ":" + s.turn; if (botKey === key) return; botKey = key; clearTimeout(botTimer);
  botTimer = setTimeout(function tick(){
    if (!app.s || app.s.rev + ":" + app.s.turn !== key) return;
    if (board.busy() || app.writing || cardBusy()){ botTimer = setTimeout(tick, 150); return; }
    botKey = null; dispatch(botAction(app.s), true);
  }, s.phase === "act" || s.phase === "fly" ? BOT_THINK_MS : 850);
}
function saveOffline(){ if (app.mode === "offline" && app.s) store("skyline.offline", app.s.status === "playing" ? JSON.stringify(Object.assign({}, app.s, {savedAt:Date.now()})) : null); }
addEventListener("pagehide", saveOffline);

/* ================= SCREENS ================= */
function openSheet(html, kind){ $("sheet").className = "sheet" + (kind ? " " + kind : ""); $("sheet").innerHTML = html; $("overlay").hidden = false; }
function closeSheet(){ $("overlay").hidden = true; }
/* How to play. The text follows the game's Quick settings (or the saved ones on the home screen). */
function rulesHtml(R){
  R = Object.assign({}, DEFAULT_SETTINGS, R);
  const wins = [R.tripleMonopoly && "three full color sets", R.beachMonopoly && "all four beaches", R.lineMonopoly && "every city on one side"].filter(Boolean);
  const li = [
    `Each tycoon starts with ${money(R.startCash)}. Roll two dice and move around the board.${R.lapBonus ? ` Pass Start to collect ${money(R.lapBonus)}.` : ""}`,
    R.directBuild ? "Buy a city's land and up to three houses in one go. Land on it again to build more, then a Landmark." : "Buy a city's land, then build one level each time you land there, up to a Landmark.",
    `On your first lap you can build up to ${LEVEL_NAMES[FIRST_LAP_MAX_LEVEL]}. Pass Start once to unlock ${LEVEL_NAMES[FIRST_LAP_MAX_LEVEL + 1]} and Landmarks.`,
    "Rent doubles when you own a whole color set. Landmarks can't be bought from you.",
    "Land on a rival's city to pay rent, then buy it from them for twice its value if you can afford it.",
    "Beaches pay more the more of them you own.",
    R.doublesAgain ? "Double six: play the tile you land on (buy, build or pay), then roll again. Three double sixes in a row strand you on Lost Island. Any doubles get you off Lost Island." : "Any doubles get you off Lost Island. Double six doesn't give another roll.",
    !R.islandRent && "Players stuck on Lost Island can't collect rent.",
    R.festivals && `Every game starts with festivals in ${R.festivals === 1 ? "one random city" : R.festivals + " random cities"}. They last the whole game and double the rent there.`,
    "Chance cards can be Boosts (shield, free build, tax exemption, escape card), Setbacks (earthquake, blackout, fines) or World events (epidemic, force sale, world tour).",
    "Grand Expo doubles rent in a city you choose. Jet Port lets you fly anywhere next turn.",
    (wins.length ? `Win instantly with ${wins.length > 1 ? wins.slice(0, -1).join(", ") + " or " + wins[wins.length - 1] : wins[0]}. Or be` : "Win by being") + " the last tycoon with money.",
    R.playTime && `The game lasts ${R.playTime < 60 ? R.playTime + " minutes" : R.playTime/60 + (R.playTime === 60 ? " hour" : " hours")}. When time runs out, the round finishes and the richest tycoon wins.`
  ].filter(Boolean);
  return `<details class="rules"><summary>How to play</summary><ul>${li.map(t => `<li>${t}</li>`).join("")}</ul></details>`;
}
/* ---------- Screen 1: host or join ---------- */
function showHome(){
  const name = load("skyline.name") || "";
  const canOnline = !!(app.db && app.me) && !app.readOnly;
  const last = load("skyline.lastRoom"), off = load("skyline.offline");
  $("overlay").dataset.view = "home";
  openSheet(`<div class="hero" id="hero"></div>
  <h1>Skyline Tycoon</h1><p class="lede">Buy Indian cities and beaches, raise towers and bankrupt your friends. One to four tycoons.</p>
  <label class="field"><h3>Your name</h3><input type="text" id="nameIn" maxlength="16" placeholder="e.g. Anish" value="${esc(name)}"></label>
  <div class="modes">
    <section class="mode"><div class="mode-ico" aria-hidden="true">+</div><h2>Host a game</h2><p>Get a room code and invite up to three friends.</p><button class="btn" id="hostBtn"${canOnline ? "" : " disabled"}>Create room</button></section>
    <section class="mode"><div class="mode-ico" aria-hidden="true">#</div><h2>Join a game</h2><p>Type the room code from the host, or paste their invite.</p>
      <div class="joinrow"><input type="text" id="codeIn" placeholder="Room code" aria-label="Room code" maxlength="200" autocapitalize="characters" autocomplete="off"${canOnline ? "" : " disabled"}><button class="btn" id="joinBtn"${canOnline ? "" : " disabled"}>Join</button></div></section>
  </div>
  ${canOnline ? (last ? `<button class="btn ghost" id="rejoinBtn">Rejoin room ${esc(last)}</button>` : "") : `<p class="muted note" id="onlineWhy"></p>`}
  <div class="offrow"><span class="muted">Or play on this device, with bots or friends on one screen</span><div class="btns"><button class="btn ghost" id="offBtn">Play offline</button>${off ? `<button class="btn ghost" id="resumeBtn">Resume saved game</button>` : ""}</div></div>
  <p class="err" id="homeErr"></p>${rulesHtml(savedSettings())}`, "home");
  const hero = tycoonArt.liveCanvas(440, 120, (c, t) => [1, 5, 8, 11, 7].forEach((L, k) => drawTycoon(c, 52 + k*84, 112, 100, L, {facing:k < 2 ? "right" : k > 2 ? "left" : "right", t:t + k*.9})));
  hero.style.width = "100%"; hero.style.height = "auto"; $("hero").appendChild(hero);
  if ($("onlineWhy")) $("onlineWhy").textContent = ONLINE_WHY[app.online] || ONLINE_WHY.off;
  const linked = parseCode(location.hash); if (linked && canOnline){ $("codeIn").value = linked; }
  const nm = () => { const v = $("nameIn").value.trim().slice(0, 16); if (v) store("skyline.name", v); return v; };
  const need = () => { const v = nm(); if (!v){ $("homeErr").textContent = "Enter your name first."; $("nameIn").focus(); } return v; };
  if (canOnline){
    $("hostBtn").onclick = () => { const v = need(); if (v){ ensureAudio(); hostRoom(v); } };
    const join = () => { const v = need(); if (!v) return; const c = parseCode($("codeIn").value); if (!c){ $("homeErr").textContent = "Room codes have 5 letters or numbers."; return; } ensureAudio(); joinRoom(c, v); };
    $("joinBtn").onclick = join; $("codeIn").onkeydown = e => { if (e.key === "Enter") join(); };
    if ($("rejoinBtn")) $("rejoinBtn").onclick = () => { const v = need(); if (v){ ensureAudio(); joinRoom(last, v); } };
  }
  $("offBtn").onclick = () => { nm(); ensureAudio(); app.setup = null; showOfflineSetup(); };
  if ($("resumeBtn")) $("resumeBtn").onclick = () => { try{ const s = JSON.parse(off); if (s.players.some(p => p.look == null)) throw 0; if (s.endsAt && s.savedAt) s.endsAt += Math.max(0, Date.now() - s.savedAt); ensureAudio(); stopOnline(); app.mode = "offline"; closeSheet(); app.lastRoll = s.rollId; app.lastCard = s.card ? s.card.seq : -1; app.lastOwnCount = Object.keys(s.own).length; app.lastStatus = s.status; setState(s, {reset:true}); }catch(e){ store("skyline.offline", null); $("homeErr").textContent = "That saved game is from an older version. Start a new one."; } };
}
/* Why online play is off for this person, shown under the Host and Join cards */
const ONLINE_WHY = {
  checking: "Connecting to online rooms...",
  local: "Online rooms aren't set up on this site yet. You can still play on this device.",
  fbfail: "Couldn't connect to online rooms. Check your connection and reload. You can still play on this device.",
  off: "Online rooms need you signed in to claude.ai and invited to this page by the host. You can still play on this device.",
  viewonly: "You can only view this page, so you can't host or join. Ask the host to give you permission to use it. You can still play on this device."
};
/* Reads a room code from a typed code or an invite link like ...#room=AB3CD */
function parseCode(v){
  v = String(v || ""); const m = v.match(/room=([A-Za-z0-9]{5})/) || v.match(/code\s+([A-Za-z0-9]{5})\b/i); if (m) return m[1].toUpperCase();
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, ""); return c.length === 5 ? c : null;
}
/* The invite message: the game's claude.ai link plus the room code (the page runs in a frame, so its own address is not shareable) */
/* On claude.ai the page runs in a frame, so invites point at the artifact link. On your own site they use this page's address with #room=CODE. */
function inviteText(code){
  const url = app.backend === "claude" ? SHARE_URL : location.href.split("#")[0] + "#room=" + code;
  return app.backend === "claude" ? `Join my Skyline Tycoon game: open ${url}, enter your name and type room code ${code}.` : `Join my Skyline Tycoon game: ${url} (room code ${code})`;
}

/* ---------- Screen 2: pick characters ----------
   One screen for both modes. Offline seats live in app.setup. Online seats are the room's players. */
const charName = L => (CHARACTERS[L] || CHARACTERS[0]).name;
function freeLook(players, prefer){
  const used = new Set(players.map(p => p.look));
  if (prefer != null && !used.has(prefer)) return prefer;
  const free = CHARACTERS.map((c, i) => i).filter(i => !used.has(i));
  return free.length ? free[Math.floor(Math.random()*free.length)] : 0;
}
/* Next character in a direction that nobody else has taken */
function stepLook(others, cur, dir){ const used = new Set(others); for (let k = 1; k <= CHARACTERS.length; k++){ const L = (cur + dir*k + CHARACTERS.length*k) % CHARACTERS.length; if (!used.has(L)) return L; } return cur; }
function botName(players, look){ const base = charName(look); return players.some(p => p.name === base) ? base + " Bot" : base; }

function showOfflineSetup(){
  if (!app.setup){
    const me = load("skyline.name") || "Player 1";
    app.setup = {active:0, seats:[{type:"human", name:me, look:0}, {type:"bot", name:charName(8), look:8}, {type:"off"}, {type:"off"}]};
  }
  if (!app.setup.rules) app.setup.rules = savedSettings();
  $("overlay").dataset.view = "offline";
  const st = app.setup, seats = st.seats.map((s, i) => s.type === "off" ? {empty:true} : {
    name:s.name, look:s.look, color:PCOLORS[i], tag:i === 0 ? "Player 1" : s.type === "bot" ? "Bot" : "Player " + (i + 1),
    canPick:true, active:st.active === i, nameEdit:s.type === "human", typeToggle:i > 0 ? s.type : null, removable:i > 0 });
  renderPicker({title:"Pick your tycoons", sub:"Tap a seat, then pick a character. Everyone needs a different one.", seats, canStart:true, back:"Back",
    settings:{get:() => app.setup.rules, set:patch => { Object.assign(app.setup.rules, patch); keepSettings(app.setup.rules); qsSummary(app.setup.rules); }},
    emptyActions:i => [["Add player", () => { const used = st.seats.filter(s => s.type !== "off"); st.seats[i] = {type:"human", name:"Player " + (i + 1), look:freeLook(used)}; st.active = i; showOfflineSetup(); }],
                       ["Add bot", () => { const used = st.seats.filter(s => s.type !== "off"); const L = freeLook(used); st.seats[i] = {type:"bot", name:botName(used, L), look:L}; showOfflineSetup(); }]]});
}
function offlinePick(i, look){
  const st = app.setup, s = st.seats[i]; if (!s || s.type === "off") return;
  if (st.seats.some((o, j) => j !== i && o.type !== "off" && o.look === look)) return;
  if (s.type === "bot" && s.name.replace(" Bot", "") === charName(s.look)) s.name = botName(st.seats.filter((o, j) => j !== i && o.type !== "off"), look);
  s.look = look; showOfflineSetup();
}
function startOffline(){
  const st = app.setup, ps = [];
  st.seats.forEach((s, i) => { if (s.type === "off") return; const nm = (s.type === "human" ? s.name.trim() : s.name) || `Player ${i + 1}`; ps.push(mkPlayer("p" + i, nm, ps.length, s.type === "bot", s.look)); });
  if (ps.length < 2){ const L = freeLook(ps); ps.push(mkPlayer("p-bot", botName(ps, L), ps.length, true, L)); }
  if (!ps.some(p => !p.bot)) ps[0].bot = false;
  closeQS(); stopOnline(); app.mode = "offline"; app.sel = -1; const s = newState(ps, {rules:st.rules}); say(s, "A new game begins. Good luck, tycoons.");
  app.lastRoll = 0; app.lastCard = -1; app.lastOwnCount = 0; app.lastStatus = "playing"; closeSheet(); setState(s, {reset:true}); saveOffline();
}

function showLobby(){
  const s = app.s, host = isHost();
  if (app.pickSeat && !s.players.some(p => p.id === app.pickSeat && p.bot)) app.pickSeat = null;
  const activeId = app.pickSeat || app.me;
  $("overlay").dataset.view = "lobby"; if (!host) closeQS();
  const seats = [0, 1, 2, 3].map(i => { const p = s.players[i]; if (!p) return {empty:true};
    const mine = p.id === app.me, canPick = mine || (host && p.bot);
    return {id:p.id, name:p.name, look:p.look, color:p.color, tag:mine ? "You" : p.bot ? "Bot" : p.id === s.host ? "Host" : "Friend",
      host:p.id === s.host, canPick, active:p.id === activeId, removable:host && !mine }; });
  renderPicker({title:"Pick your tycoon", sub:host ? "Share the code. Start when everyone has picked." : "Pick a character. The host starts the game.",
    code:app.code, seats, canStart:host, back:"Leave",
    settings:host ? {get:() => rules(app.s), set:patch => { const R = Object.assign(rules(app.s), patch); keepSettings(R); qsSummary(R); lobbyEdit(st => { st.rules = Object.assign(rules(st), patch); }); }} : null,
    emptyActions:i => host ? [["Add bot", () => lobbyEdit(st => { if (st.players.length >= 4) return; const L = freeLook(st.players); st.players.push(mkPlayer("bot-" + Math.random().toString(36).slice(2, 8), botName(st.players, L), st.players.length, true, L)); })]] : []});
}
function lobbyPick(id, look){
  if (app.s.players.some(p => p.id !== id && p.look === look)) return;
  lobbyEdit(st => { const p = st.players.find(x => x.id === id); if (!p || st.players.some(x => x !== p && x.look === look)) return;
    if (p.bot && p.name.replace(" Bot", "") === charName(p.look)) p.name = botName(st.players.filter(x => x !== p), look);
    p.look = look; });
}

/* Draws the picker. m.seats has four entries: {empty} or {name, look, color, tag, canPick, active, ...}. */
function renderPicker(m){
  const online = app.mode === "online";
  const filled = m.seats.filter(x => !x.empty).length;
  openSheet(`<div class="pk-head">
    <div><h1>${m.title}</h1><p class="lede">${m.sub}</p>
      ${m.settings ? `<div class="qs-open"><button class="btn ghost sm" id="qsBtn">Quick settings</button><span class="muted" id="qsSum"></span></div>` : ""}</div>
    ${m.code ? `<div class="pk-code"><span class="muted">Room code</span><b>${esc(m.code)}</b><div class="btns"><button class="btn ghost sm" id="copyCode">Copy code</button><button class="btn ghost sm" id="copyLink">Copy invite</button></div></div>` : ""}
  </div>
  <div class="seats" id="seats"></div>
  <h3>Characters</h3><div class="chargrid" id="chargrid"></div>
  <p class="err" id="lobErr"></p>
  <div class="pk-foot"><button class="btn ghost" id="pkBack">${m.back}</button><span class="muted" id="pkNote"></span>
    ${m.canStart ? `<button class="btn go" id="startBtn">${filled < 2 ? "Start with a bot" : "Start game"}</button>` : `<span class="wait">Waiting for the host to start</span>`}</div>`, "wide");
  $("pkNote").textContent = `${filled} of 4 seats filled`;
  if (m.settings){ qsSummary(m.settings.get()); $("qsBtn").onclick = () => openQS(m.settings); if (qs) openQS(m.settings); }
  const box = $("seats"), takenBy = {};
  m.seats.forEach((x, i) => { if (!x.empty) takenBy[x.look] = x; });
  const pick = (i, look) => { const x = m.seats[i]; if (!x || x.empty || !x.canPick) return; if (online) lobbyPick(x.id, look); else offlinePick(i, look); };
  const activeIdx = m.seats.findIndex(x => x.active);
  m.seats.forEach((x, i) => {
    const d = document.createElement("div");
    if (x.empty){
      d.className = "seat-card empty"; d.innerHTML = `<div class="seat-top"><span class="seat-tag">Seat ${i + 1}</span></div><div class="seat-ghost" aria-hidden="true"></div><p class="muted">${online ? "Waiting for a friend" : "Empty seat"}</p><div class="btns col"></div>`;
      m.emptyActions(i).forEach(([label, fn]) => { const b = btn(label, fn, "ghost sm"); d.querySelector(".btns").appendChild(b); });
      box.appendChild(d); return;
    }
    d.className = "seat-card" + (x.active ? " active" : "") + (x.canPick ? " pickable" : ""); d.style.setProperty("--pc", x.color);
    d.innerHTML = `<div class="seat-top"><span class="seat-tag"></span>${x.host ? `<span class="crown" title="Host">Host</span>` : ""}${x.removable ? `<button class="seat-x" aria-label="Remove seat ${i + 1}">×</button>` : ""}</div>
      <div class="seat-stage"><button class="arrow" data-d="-1" aria-label="Previous character">‹</button><div class="seat-art"></div><button class="arrow" data-d="1" aria-label="Next character">›</button></div>
      <div class="seat-name"></div><div class="seat-char"><b></b> · <span></span></div><div class="seat-type"></div>`;
    d.querySelector(".seat-tag").textContent = x.tag;
    const C = CHARACTERS[x.look] || CHARACTERS[0]; d.querySelector(".seat-char b").textContent = C.name; d.querySelector(".seat-char span").textContent = C.role;
    d.querySelector(".seat-art").appendChild(tycoonPortrait(x.look, 130, 150, {ring:x.color, size:128, base:12}));
    if (x.nameEdit){ const inp = document.createElement("input"); inp.type = "text"; inp.maxLength = 16; inp.value = x.name; inp.setAttribute("aria-label", `Seat ${i + 1} name`);
      inp.oninput = () => { app.setup.seats[i].name = inp.value; if (i === 0 && inp.value.trim()) store("skyline.name", inp.value.trim()); }; inp.onclick = e => e.stopPropagation(); d.querySelector(".seat-name").appendChild(inp); }
    else d.querySelector(".seat-name").textContent = x.name;
    if (!x.canPick) d.querySelectorAll(".arrow").forEach(a => a.hidden = true);
    const others = m.seats.filter((o, j) => j !== i && !o.empty).map(o => o.look);
    d.querySelectorAll(".arrow").forEach(a => a.onclick = e => { e.stopPropagation(); sfx("hop"); pick(i, stepLook(others, x.look, +a.dataset.d)); });
    if (x.typeToggle){ const seg = document.createElement("div"); seg.className = "seg";
      ["human", "bot"].forEach(ty => { const b = document.createElement("button"); b.textContent = ty === "human" ? "Player" : "Bot"; b.setAttribute("aria-pressed", String(x.typeToggle === ty));
        b.onclick = e => { e.stopPropagation(); const s = app.setup.seats[i]; if (s.type === ty) return; s.type = ty; s.name = ty === "bot" ? botName(app.setup.seats.filter((o, j) => j !== i && o.type !== "off"), s.look) : "Player " + (i + 1); showOfflineSetup(); }; seg.appendChild(b); });
      d.querySelector(".seat-type").appendChild(seg); }
    if (x.removable){ d.querySelector(".seat-x").onclick = e => { e.stopPropagation();
      if (online) lobbyEdit(st => { st.players = st.players.filter(p => p.id !== x.id); });
      else { app.setup.seats[i] = {type:"off"}; if (app.setup.active === i) app.setup.active = 0; showOfflineSetup(); } }; }
    if (x.canPick && !x.active) d.onclick = () => { if (online){ app.pickSeat = x.id === app.me ? null : x.id; showLobby(); } else { app.setup.active = i; showOfflineSetup(); } };
    box.appendChild(d);
  });
  const grid = $("chargrid");
  CHARACTERS.forEach((C, L) => {
    const owner = takenBy[L], mine = owner && owner.active, b = document.createElement("button");
    b.className = "ctile" + (mine ? " mine" : owner ? " taken" : ""); if (owner) b.style.setProperty("--pc", owner.color);
    b.setAttribute("aria-label", `${C.name}, ${C.role}${owner ? ", taken by " + owner.name : ""}`); b.disabled = !!owner && !mine;
    b.appendChild(tycoonPortrait(L, 74, 84, {size:76, base:5}));
    b.insertAdjacentHTML("beforeend", `<span class="cn"></span>${owner ? `<span class="owner"></span>` : ""}`); b.querySelector(".cn").textContent = C.name;
    if (owner) b.querySelector(".owner").textContent = owner.name;
    b.onclick = () => { if (activeIdx < 0 || owner) return; sfx("buy"); pick(activeIdx, L); };
    grid.appendChild(b);
  });
  $("pkBack").onclick = () => { if (online){ if (!isHost()) lobbyEdit(st => { st.players = st.players.filter(x => x.id !== app.me); }).then(leaveGame); else leaveGame(); } else showHome(); };
  if (m.code){
    const copy = async (txt, ok) => { try{ await navigator.clipboard.writeText(txt); toast(ok); }catch(e){ toast(txt); } };
    $("copyCode").onclick = () => copy(m.code, "Code copied"); $("copyLink").onclick = () => copy(inviteText(m.code), "Invite copied");
  }
  if (m.canStart) $("startBtn").onclick = () => online ? lobbyEdit(st => { if (st.players.length < 2){ const L = freeLook(st.players); st.players.push(mkPlayer("bot-" + Math.random().toString(36).slice(2, 8), botName(st.players, L), st.players.length, true, L)); }
    st.status = "playing"; st.phase = "roll"; st.turn = 0; startGame(st); say(st, "The game begins. Good luck, tycoons."); }).then(closeQS) : startOffline();
}

/* ---------- Quick settings (host only) ----------
   A panel over the character picker. Offline, whoever sets up the game is the host. Online, only the room's host sees it.
   m.settings is {get, set}: get() returns the settings, set(patch) saves a change. The last used settings are remembered. */
const QS_TOGGLES = [
  ["lineMonopoly", "Line monopoly", "Win with every city on one side (just two sets)"],
  ["tripleMonopoly", "Triple monopoly", "Win with any three full color sets"],
  ["beachMonopoly", "Beach monopoly", "Win with all four beaches"],
  ["islandRent", "Can players stuck on Lost Island collect rent?", ""],
  ["botBuild", "Can bots build?", "No: bots only buy land"],
  ["directBuild", "Build many levels in one visit?", "No: one level each time you land"],
  ["doublesAgain", "Roll again after double six?", "Yes: play the tile you land on, then roll again"]];
const QS_SLIDERS = [["startCash", "Start money", money], ["lapBonus", "Reward per lap", money], ["festivals", "Festivals count", n => String(n)]];
function playTimeLabel(m){ return !m ? "No limit" : m < 60 ? m + "m" : m/60 + "h"; }
let qs = null;   // the open panel's {get, set}
function savedSettings(){ try{ return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(load("skyline.settings2") || "{}")); }catch(e){ return Object.assign({}, DEFAULT_SETTINGS); } }
function keepSettings(R){ store("skyline.settings2", JSON.stringify(R)); }
function qsSummary(R){ const el = $("qsSum"); if (!el) return; R = Object.assign({}, DEFAULT_SETTINGS, R);
  el.textContent = [playTimeLabel(R.playTime), "Start " + money(R.startCash), "Lap " + money(R.lapBonus), R.festivals + (R.festivals === 1 ? " festival" : " festivals")].join(" · "); }
function closeQS(){ qs = null; $("qs").hidden = true; }
function openQS(api){
  const first = !qs || $("qs").hidden; qs = api; buildQS(); syncQS(); $("qs").hidden = false;
  if (first) setTimeout(() => $("qsDone").focus(), 30);
}
function qsRadios(name, label, opts){
  return `<div class="qs-radios" role="radiogroup" aria-label="${label}">${opts.map(([v, t]) => `<label><input type="radio" name="qs-${name}" value="${v}"><span>${t}</span></label>`).join("")}</div>`;
}
function buildQS(){
  if ($("qsLeft").childElementCount) return;
  $("qsLeft").innerHTML = `<div class="qs-row"><span class="qs-l">Play time</span>${qsRadios("playTime", "Play time", PLAY_TIMES.map(m => [m, playTimeLabel(m)]))}</div>`
    + QS_SLIDERS.map(([k, label]) => { const r = SETTING_RANGES[k];
      return `<div class="qs-slide"><div class="qs-sh"><label for="qs-${k}">${label}</label><b id="qv-${k}"></b></div>
        <div class="qs-track"><span>${k === "festivals" ? r.min : money(r.min)}</span><input type="range" id="qs-${k}" min="${r.min}" max="${r.max}" step="${r.step}"><span>${k === "festivals" ? r.max : money(r.max)}</span></div></div>`; }).join("");
  $("qsRight").innerHTML = QS_TOGGLES.map(([k, label, hint]) => `<div class="qs-row"><span class="qs-l">${label}${hint ? `<small>${hint}</small>` : ""}</span>${qsRadios(k, label, [["1", "Yes"], ["0", "No"]])}</div>`).join("");
  document.querySelectorAll('#qs input[name="qs-playTime"]').forEach(i => i.onchange = () => qs && qs.set({playTime:+i.value}));
  QS_TOGGLES.forEach(([k]) => document.querySelectorAll(`#qs input[name="qs-${k}"]`).forEach(i => i.onchange = () => qs && qs.set({[k]:i.value === "1"})));
  QS_SLIDERS.forEach(([k, , fmt]) => { const inp = $("qs-" + k);
    inp.oninput = () => { $("qv-" + k).textContent = fmt(+inp.value); qsFill(inp); };
    inp.onchange = () => qs && qs.set({[k]:+inp.value}); });
  $("qsClose").onclick = $("qsDone").onclick = closeQS;
  $("qsReset").onclick = () => { if (qs){ qs.set(Object.assign({}, DEFAULT_SETTINGS)); syncQS(); } };
  $("qs").onclick = e => { if (e.target === $("qs")) closeQS(); };
  $("qs").onkeydown = e => { if (e.key === "Escape"){ e.stopPropagation(); closeQS(); } };
}
function qsFill(inp){ inp.style.setProperty("--fill", ((inp.value - inp.min) / (inp.max - inp.min) * 100) + "%"); }
/* Puts the current values into the panel. Skips a slider that is being dragged. */
function syncQS(){
  if (!qs) return; const R = Object.assign({}, DEFAULT_SETTINGS, qs.get());
  document.querySelectorAll('#qs input[name="qs-playTime"]').forEach(i => { i.checked = +i.value === R.playTime; });
  QS_TOGGLES.forEach(([k]) => document.querySelectorAll(`#qs input[name="qs-${k}"]`).forEach(i => { i.checked = (i.value === "1") === !!R[k]; }));
  QS_SLIDERS.forEach(([k, , fmt]) => { const inp = $("qs-" + k); if (document.activeElement === inp && inp.matches(":active")) return; inp.value = R[k]; $("qv-" + k).textContent = fmt(R[k]); qsFill(inp); });
}

/* ---------- Play clock ----------
   Shows the time left in the toolbar. When it runs out, the round in progress finishes and the richest tycoon wins. */
function tickClock(){
  const s = app.s, c = $("clockChip"), on = !!(app.mode && s && s.status === "playing" && s.endsAt); c.hidden = !on; if (!on) return;
  const left = s.endsAt - Date.now();
  if (left <= 0){ c.textContent = "Last round"; c.classList.add("late"); return; }
  const sec = Math.ceil(left/1000), h = Math.floor(sec/3600), m = Math.floor(sec/60) % 60, ss = String(sec % 60).padStart(2, "0");
  c.textContent = (h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`) + " left"; c.classList.toggle("late", left < 5*60000);
}
setInterval(tickClock, 1000);

function genCode(){ const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let c = ""; for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random()*A.length)]; return c; }
function stopOnline(){ if (app.unsub){ app.unsub(); app.unsub = null; } clearTimeout(app.loadTimer); app.code = null; app.pickSeat = null; }
async function hostRoom(name){
  const code = genCode();
  const s = newState([mkPlayer(app.me, name, 0, false, 0)], {status:"lobby", phase:"lobby", host:app.me, code, created:Date.now(), ver:2, rules:savedSettings()});
  try{ await app.db.doc("games/" + code).set(s); }
  catch(e){ $("homeErr").textContent = e && e.code === "invalid_argument" ? "You can't create rooms on this page. Ask the owner for edit access." : "Couldn't create the room. Try again."; return; }
  subscribe(code);
}
async function joinRoom(code, name){
  const ref = app.db.doc("games/" + code); const err = m => { const e = $("homeErr"); if (e) e.textContent = m; };
  try{
    let got = null; for (let k = 0; k < 6 && !(got && got.acquired); k++){ got = await ref.acquire({holder:app.me, ttlMs:4000}); if (!got.acquired) await new Promise(r => setTimeout(r, 500)); }
    const snap = await ref.get(); if (!snap.exists){ err("No room with that code."); return; }
    const s = clone(snap.data());
    if (s.ver !== 2){ err("That room was made with an older version. Host a new one."); return; }
    if (s.players.some(p => p.id === app.me)){ subscribe(code); return; }
    if (s.status !== "lobby"){ err("That game has already started."); return; }
    if (s.players.length >= 4){ err("That room is full."); return; }
    s.players.push(mkPlayer(app.me, name, s.players.length, false, freeLook(s.players))); s.rev = (s.rev||0) + 1;
    await ref.set(s); subscribe(code);
  }catch(e){ err(e && e.code === "invalid_argument" ? "You can watch but can't join. Ask the room owner for edit access." : "Couldn't reach that room. Try again."); }
}
function subscribe(code){
  stopOnline(); app.mode = "online"; app.code = code; app.sel = -1; store("skyline.lastRoom", code);
  let first = true;
  app.loadTimer = setTimeout(() => toast("Still connecting to the room…"), 10000);
  app.unsub = app.db.doc("games/" + code).onSnapshot(snap => {
    if (!snap.metadata.fromCache) clearTimeout(app.loadTimer);
    if (!snap.exists){ if (!snap.metadata.fromCache){ toast("That room was closed."); store("skyline.lastRoom", null); leaveGame(); } return; }
    const s = snap.data();
    if (app.writing && s.rev < (app.s ? app.s.rev : 0)) return;
    if (first){ first = false; app.lastRoll = s.rollId; app.lastCard = s.card ? s.card.seq : -1; app.lastOwnCount = Object.keys(s.own).length; app.lastStatus = s.status; setState(clone(s), {reset:true}); }
    else setState(clone(s));
    if (s.status === "lobby") showLobby(); else { closeQS(); if ($("overlay").dataset.view === "lobby" || $("overlay").dataset.view === "home") closeSheet(); }
  }, e => { clearTimeout(app.loadTimer); toast("Lost the connection to the room. Rejoin from the menu."); });
}
async function lobbyEdit(fn){
  const ref = app.db.doc("games/" + app.code);
  try{
    for (let k = 0; k < 6; k++){ const g = await ref.acquire({holder:app.me, ttlMs:4000}); if (g.acquired) break; await new Promise(r => setTimeout(r, 500)); }
    const snap = await ref.get(); if (!snap.exists) return; const s = clone(snap.data()); fn(s); s.players.forEach((p, i) => { p.color = PCOLORS[i]; if (p.look == null || p.look >= CHARACTERS.length || s.players.slice(0, i).some(q => q.look === p.look)) p.look = freeLook(s.players.slice(0, i)); }); s.rev = (s.rev||0) + 1; await ref.set(s);
  }catch(e){ const el = $("lobErr"); if (el) el.textContent = "Couldn't update the room. Try again."; }
}
function showOver(){
  if ($("overlay").dataset.view === "over" && !$("overlay").hidden) return;
  if ($("overlay").dataset.view === "over-seen") return;
  const s = app.s, w = byId(s, s.winner);
  $("overlay").dataset.view = "over";
  const ranked = s.players.slice().sort((a, b) => netWorth(s, b) - netWorth(s, a));
  openSheet(`<h3>Game over</h3><div class="win" id="winName"></div><p class="lede" id="winWhy"></p>
  <div class="lobbylist">${ranked.map(p => `<div class="li"><span style="width:12px;height:12px;border-radius:50%;background:${p.color}"></span><span class="n">${esc(p.name)}</span><span class="muted">${p.bankrupt ? "Bankrupt" : moneyFull(netWorth(s, p))}</span></div>`).join("")}</div>
  <div class="btns"><button class="btn" id="againBtn">Back to menu</button><button class="btn ghost" id="viewBtn">View board</button></div>`);
  $("winName").textContent = w ? `${w.name} wins` : "Game over"; $("winWhy").textContent = s.winReason || "";
  $("againBtn").onclick = leaveGame; $("viewBtn").onclick = () => { closeSheet(); $("overlay").dataset.view = "over-seen"; };
}
function leaveGame(){
  hideCard();
  saveOffline();
  closeQS(); stopOnline(); app.mode = null; app.sel = -1; $("bmodal").hidden = true;
  setState(demoState(), {reset:true}); showHome();
}
$("menuBtn").onclick = () => { if (app.mode === "online" && app.s && app.s.status === "lobby"){ showLobby(); return; }
  if (app.mode){ $("overlay").dataset.view = "menu"; openSheet(`<h1 style="font-size:24px">Menu</h1><p class="lede">${app.mode === "online" ? "Leaving keeps the room open. You can rejoin with code " + esc(app.code) + "." : "Your offline game is saved on this device."}</p>${rulesHtml(app.s && app.s.rules)}<div class="btns"><button class="btn" id="resBtn">Keep playing</button><button class="btn ghost" id="quitBtn">Leave game</button></div>`); $("resBtn").onclick = closeSheet; $("quitBtn").onclick = leaveGame; }
  else showHome(); };
$("musicBtn").onclick = () => { setMusic(!audio.music); $("musicBtn").setAttribute("aria-pressed", String(audio.music)); };
$("sfxBtn").onclick = () => { audio.sfx = !audio.sfx; if (audio.sfx) ensureAudio(); $("sfxBtn").setAttribute("aria-pressed", String(audio.sfx)); };
$("overlay").addEventListener("click", e => { if (e.target === $("overlay") && app.mode && app.s && app.s.status !== "lobby") closeSheet(); });

(async function init(){
  const fbReady = typeof FIREBASE_CONFIG === "object" && FIREBASE_CONFIG && !!FIREBASE_CONFIG.apiKey;
  app.online = (window.claude && window.claude.use) || fbReady ? "checking" : "local";
  board.start(); setState(demoState(), {reset:true}); showHome();
  /* online rooms: claude.ai artifact runtime, or Firebase on your own site (js/net.js) */
  try{
    const be = await connectBackend(); app.backend = be.kind;
    if (be.kind !== "none"){
      app.db = be.db; app.user = be.user; app.me = await be.user.id();
      const w = await be.user.can("data.write"); if (w === false) app.readOnly = true;
    }
  }catch(e){ app.db = null; }
  app.online = app.backend === "none" && !(window.claude && window.claude.use) ? (fbReady ? "fbfail" : "local") : app.readOnly ? "viewonly" : app.db && app.me ? "ok" : "off";
  if (!app.mode && $("overlay").dataset.view === "home"){
    /* redraw the home screen now that we know, keeping anything already typed */
    const nm = $("nameIn") ? $("nameIn").value : "", cd = $("codeIn") ? $("codeIn").value : "";
    showHome(); if (nm) $("nameIn").value = nm; if (cd && !$("codeIn").disabled) $("codeIn").value = cd;
  }
})();
