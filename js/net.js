"use strict";
/* ================= ONLINE BACKEND =================
   Online rooms need a shared database and a player id. Two ways to get them:
   1. On claude.ai, the artifact runtime (window.claude.use("db") and "user").
   2. Anywhere else (Vercel, your own host), Firebase: fill in FIREBASE_CONFIG in config.js.
   Both give main.js the same small shape:
     db.doc(path).get()                      -> {exists, data()}
     db.doc(path).set(obj)
     db.doc(path).onSnapshot(cb, onError)    -> unsubscribe function
     db.doc(path).acquire({holder, ttlMs})   -> {acquired}   (a short lock while joining a room)
     user.id(), user.can("data.write")
   connectBackend() returns {kind, db, user}. kind is "claude", "firebase" or "none". */

const FIREBASE_SDK = "10.12.2";   // Firebase web SDK version, loaded from Google's CDN only when FIREBASE_CONFIG is set

function loadScript(src){
  return new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Couldn't load " + src)); document.head.appendChild(s); });
}

async function connectFirebase(){
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}/`;
  await loadScript(base + "firebase-app-compat.js");
  await Promise.all([loadScript(base + "firebase-auth-compat.js"), loadScript(base + "firebase-firestore-compat.js")]);
  const fb = window.firebase; if (!fb.apps.length) fb.initializeApp(FIREBASE_CONFIG);
  /* Every visitor signs in anonymously, so each browser gets a stable player id without making an account */
  const cred = fb.auth().currentUser ? {user:fb.auth().currentUser} : await fb.auth().signInAnonymously();
  const uid = cred.user.uid, fs = fb.firestore();
  const clean = o => JSON.parse(JSON.stringify(o));   // Firestore refuses "undefined" values
  const db = {
    doc(path){
      const ref = fs.doc(path), lock = fs.doc("locks/" + path.replace(/\//g, "_"));
      return {
        get: () => ref.get(),
        set: obj => ref.set(clean(obj)),
        onSnapshot: (cb, onError) => ref.onSnapshot({includeMetadataChanges:false}, cb, onError),
        /* A short lease: whoever holds it can edit the room for ttlMs. Others get {acquired:false} and try again. */
        acquire: ({holder, ttlMs}) => fs.runTransaction(async tx => {
          const snap = await tx.get(lock), now = Date.now(), cur = snap.exists ? snap.data() : null;
          if (cur && cur.holder !== holder && cur.until > now) return {acquired:false};
          tx.set(lock, {holder, until:now + ttlMs}); return {acquired:true};
        }).catch(() => ({acquired:false}))
      };
    }
  };
  const user = {id: async () => uid, can: async () => true};
  return {kind:"firebase", db, user};
}

async function connectBackend(){
  /* 1. claude.ai artifact */
  if (window.claude && window.claude.use){
    try{
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (db && user) return {kind:"claude", db, user};
    }catch(e){}
  }
  /* 2. Firebase, when it is set up */
  if (typeof FIREBASE_CONFIG === "object" && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey){
    try{ return await connectFirebase(); }
    catch(e){ console.warn("Firebase didn't connect:", e); return {kind:"none", error:e}; }
  }
  return {kind:"none"};
}
