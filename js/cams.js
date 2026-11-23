"use strict";
/* ================= CAMERAS =================
   In online games each person's corner panel has a small live camera box under their name.
   When a game starts the browser asks for the camera; your own box has a button to turn it off and on (remembered in
   localStorage skyline.cam). Bots and offline games have no camera box.

   The video goes straight from browser to browser (WebRTC), one connection for each pair of people. It never passes
   through the game's database: the database only carries the short "how to reach me" notes (signals) that two browsers
   swap to connect, in docs rtc/CODE_<a>_<b>_o (the offer, written by the player whose id sorts first) and
   rtc/CODE_<a>_<b>_a (the answer). STUN servers (CAM.ice) help browsers find each other; a few very strict networks
   (some offices and schools) still block direct video, and the box then says it couldn't connect. Video only, no sound. */
const CAM = {
  ice:[{urls:["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]}],
  video:{width:{ideal:320}, height:{ideal:240}, frameRate:{ideal:15}, facingMode:"user"},   // small and light: 4 people at once
  gatherMs:3000,   // how long to collect connection routes before sending the signal
  retryMs:6000     // a dropped or failed connection tries again after this long
};

const cams = (() => {
  let local = null, room = null, me = null, asking = false, error = "", started = false;
  const peers = {};    // other player id -> {pc, sender, offerTs, seenTs, unsub, retryT, state}
  const videos = {};   // player id -> <video>, kept across panel redraws so playback doesn't stop
  const remote = {};   // player id -> {stream, live}
  const short = id => String(id).replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "x";
  const wantOn = () => { try { return localStorage.getItem("skyline.cam") !== "off"; } catch(e){ return true; } };
  const setWant = on => { try { localStorage.setItem("skyline.cam", on ? "on" : "off"); } catch(e){} };

  function videoFor(pid){
    let v = videos[pid]; if (!v){ v = document.createElement("video"); v.autoplay = true; v.playsInline = true; v.muted = true; v.setAttribute("playsinline", ""); videos[pid] = v; }
    return v;
  }
  /* Who gets a camera box: real people in an online game who haven't left */
  function people(s){ return s.players.filter(p => !p.bot && !p.left); }
  function active(s){ return app.mode === "online" && !!app.db && !!app.code && s && (s.status === "playing" || s.status === "over") && s.players.some(p => p.id === app.me); }

  /* ---------- your own camera ---------- */
  async function startLocal(){
    if (local || asking) return; asking = true; error = ""; refresh();
    try{
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("unsupported");
      local = await navigator.mediaDevices.getUserMedia({video:CAM.video, audio:false});
      const v = videoFor(app.me); v.srcObject = local; v.play().catch(() => {});
      Object.values(peers).forEach(pr => pr.sender && pr.sender.replaceTrack(local.getVideoTracks()[0]).catch(() => {}));
      Object.keys(peers).forEach(tellCamState);
    }catch(e){
      error = e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "Camera blocked" : e && e.name === "NotFoundError" ? "No camera found" : "Camera unavailable";
      local = null;
    }
    asking = false; refresh();
  }
  function stopLocal(){
    if (local) local.getTracks().forEach(t => t.stop()); local = null;
    Object.values(peers).forEach(pr => pr.sender && pr.sender.replaceTrack(null).catch(() => {}));
    Object.keys(peers).forEach(tellCamState);
    if (videos[app.me]) videos[app.me].srcObject = null; refresh();
  }
  function toggle(){ if (local){ setWant(false); stopLocal(); } else { setWant(true); startLocal(); } }

  /* ---------- connections ---------- */
  const docId = (a, b, side) => { const [x, y] = [short(a), short(b)].sort(); return `rtc/${room}_${x}_${y}_${side}`; };
  const iOffer = other => short(me) < short(other);
  function gather(pc){ return new Promise(ok => { if (pc.iceGatheringState === "complete") return ok(); const t = setTimeout(ok, CAM.gatherMs);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete"){ clearTimeout(t); ok(); } }); }); }
  function newPc(other){
    const pr = peers[other]; if (pr.pc) try { pr.pc.close(); } catch(e){}
    const pc = new RTCPeerConnection({iceServers:CAM.ice}); pr.pc = pc; pr.state = "connecting"; pr.chan = null;
    if (remote[other]) remote[other].on = false;
    pc.ontrack = e => { const st = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]); remote[other] = Object.assign(remote[other] || {}, {stream:st});
      const v = videoFor(other); v.srcObject = st; v.play().catch(() => {}); refresh(); };
    /* a tiny side channel next to the video: each side says "on" or "off" when its camera changes, so a stopped camera
       shows "Camera off" right away instead of freezing on the last picture */
    pc.ondatachannel = e => useChannel(other, e.channel);
    pc.onconnectionstatechange = () => { pr.state = pc.connectionState; if (pc.connectionState !== "connected" && remote[other]) remote[other].on = false; refresh();
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected"){ clearTimeout(pr.retryT); pr.retryT = setTimeout(() => restart(other), CAM.retryMs); } };
    return pc;
  }
  function useChannel(other, ch){
    const pr = peers[other]; if (!pr) return; pr.chan = ch;
    ch.onopen = () => tellCamState(other);
    ch.onmessage = e => { remote[other] = Object.assign(remote[other] || {}, {on:e.data === "on"}); refresh(); };
    ch.onclose = () => { if (remote[other]) remote[other].on = false; refresh(); };
    if (ch.readyState === "open") tellCamState(other);
  }
  function tellCamState(other){ const ch = peers[other] && peers[other].chan; if (ch && ch.readyState === "open") try { ch.send(local ? "on" : "off"); } catch(e){} }
  async function makeOffer(other){
    const pr = peers[other]; if (!pr || !room) return; const pc = newPc(other);
    pr.sender = pc.addTransceiver("video", {direction:"sendrecv"}).sender;
    useChannel(other, pc.createDataChannel("cam"));
    if (local) await pr.sender.replaceTrack(local.getVideoTracks()[0]).catch(() => {});
    await pc.setLocalDescription(await pc.createOffer()); await gather(pc);
    if (pr.pc !== pc) return; pr.offerTs = Date.now();
    app.db.doc(docId(me, other, "o")).set({ts:pr.offerTs, sdp:pc.localDescription.sdp}).catch(() => {});
  }
  async function answer(other, offer){
    const pr = peers[other]; if (!pr || !room) return; const pc = newPc(other);
    await pc.setRemoteDescription({type:"offer", sdp:offer.sdp});
    const tr = pc.getTransceivers().find(t => t.receiver.track && t.receiver.track.kind === "video") || pc.getTransceivers()[0];
    if (tr){ tr.direction = "sendrecv"; pr.sender = tr.sender; if (local) await pr.sender.replaceTrack(local.getVideoTracks()[0]).catch(() => {}); }
    await pc.setLocalDescription(await pc.createAnswer()); await gather(pc);
    if (pr.pc !== pc) return;
    app.db.doc(docId(me, other, "a")).set({for:offer.ts, sdp:pc.localDescription.sdp, hello:pr.hello}).catch(() => {});
  }
  /* The answering side asks for a fresh offer with "hello" (on joining, after a reload, or after a drop) */
  function sayHello(other){ const pr = peers[other]; pr.hello = Date.now(); app.db.doc(docId(me, other, "a")).set({hello:pr.hello}).catch(() => {}); }
  function restart(other){ const pr = peers[other]; if (!pr) return; if (iOffer(other)) makeOffer(other); else sayHello(other); }
  function connect(other){
    if (peers[other]) return; const pr = peers[other] = {seenTs:0, state:"waiting"};
    if (iOffer(other)){
      pr.unsub = app.db.doc(docId(me, other, "a")).onSnapshot(snap => { if (!snap.exists) return; const d = snap.data() || {};
        if (d.sdp && d.for === pr.offerTs && pr.pc && pr.pc.signalingState === "have-local-offer") pr.pc.setRemoteDescription({type:"answer", sdp:d.sdp}).catch(() => {});
        else if (d.hello && d.hello > (pr.offerTs || 0) && d.hello !== pr.lastHello){ pr.lastHello = d.hello; makeOffer(other); }   // they (re)joined: offer again
      }, () => {});
      makeOffer(other);
    } else {
      pr.unsub = app.db.doc(docId(me, other, "o")).onSnapshot(snap => { if (!snap.exists) return; const d = snap.data() || {};
        if (d.sdp && d.ts > pr.seenTs){ pr.seenTs = d.ts; answer(other, d); } }, () => {});
      sayHello(other);
    }
  }
  function drop(other){ const pr = peers[other]; if (!pr) return; if (pr.unsub) pr.unsub(); clearTimeout(pr.retryT); if (pr.pc) try { pr.pc.close(); } catch(e){}
    delete peers[other]; delete remote[other]; if (videos[other]) videos[other].srcObject = null; }

  /* Called on every game update (main.js setState): starts, keeps up and ends the connections */
  function sync(s){
    if (!active(s)){ if (room) stop(); return; }
    if (room !== app.code){ stop(); room = app.code; me = app.me; started = false; }
    if (!started){ started = true; if (wantOn()) startLocal(); }
    const others = people(s).map(p => p.id).filter(id => id !== me);
    others.forEach(connect); Object.keys(peers).forEach(id => { if (!others.includes(id)) drop(id); });
  }
  function stop(){ Object.keys(peers).forEach(drop); stopLocal(); room = null; started = false; }

  /* ---------- the boxes in the corner panels ---------- */
  function label(pid){
    if (pid === app.me) return asking ? "Asking for camera…" : local ? "" : error || "Camera off";
    const r = remote[pid], pr = peers[pid];
    if (pr && pr.state === "connected" && r && r.on && r.stream) return "";
    if (pr && pr.state === "failed") return "Couldn't connect";
    return pr && pr.state === "connected" && r && r.on === false ? "Camera off" : "Connecting…";
  }
  /* Puts a camera box under the name in each person's panel (renderPlayers redraws the panels, the videos move along) */
  function place(s){
    if (!active(s)) return;
    document.querySelectorAll("#players .cp").forEach((panel, idx) => {
      const p = s.players[idx]; if (!p || p.bot || p.left) return;
      const box = document.createElement("div"); box.className = "cp-cam" + (p.id === app.me ? " mine" : ""); box.dataset.pid = p.id;
      const v = videoFor(p.id); box.appendChild(v); if (v.paused && v.srcObject) v.play().catch(() => {});
      const note = document.createElement("span"); note.className = "cam-note"; box.appendChild(note);
      if (p.id === app.me){ const b = document.createElement("button"); b.className = "cam-btn"; b.type = "button"; b.onclick = e => { e.stopPropagation(); toggle(); }; box.appendChild(b); }
      const name = panel.querySelector(".cp-name"); name.after(box);
    });
    refresh();
  }
  /* Updates the words and the on/off look without redrawing the panels */
  function refresh(){
    document.querySelectorAll("#players .cp-cam").forEach(box => {
      const pid = box.dataset.pid, text = label(pid); box.classList.toggle("live", !text);
      box.querySelector(".cam-note").textContent = text;
      const b = box.querySelector(".cam-btn"); if (b){ b.textContent = local ? "Turn off" : "Turn on"; b.setAttribute("aria-label", local ? "Turn your camera off" : "Turn your camera on"); b.setAttribute("aria-pressed", String(!!local)); b.disabled = asking; }
    });
  }
  return {sync, place, stop, toggle};
})();
