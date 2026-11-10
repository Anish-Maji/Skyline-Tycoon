"use strict";
/* ================= RULES DATA ================= */
const N = 32, START_CASH = 1500, GO_BONUS = 200, BAIL = 50;
/* Selling a property to the bank pays this share of what was spent on it */
const SELL_RATE = .5;
const MULT = [0.1, 0.35, 0.8, 1.4, 2.2];
/* First lap rule: until a player passes Start once, they can build up to this level. 1 Land, 2 House 1, 3 House 2, 4 House 3, 5 Hotel. */
const FIRST_LAP_MAX_LEVEL = 3;   // House 2: House 3 and Hotels wait until the first lap is done
/* Festivals: when a game starts, "count" random cities get a festival for the whole game. Their rent is multiplied by rentMult. */
const FESTIVALS = {count:3, rentMult:2};
/* ================= QUICK SETTINGS =================
   The host sets these in the character picker before the game starts. These are the defaults.
   playTime        minutes until time runs out (0 = no limit). The round then finishes and the richest tycoon wins.
   startCash       money each player starts with (in thousands, like all money)
   lapBonus        money for passing Start
   festivals       how many cities hold a festival for the whole game
   lineMonopoly    win by owning every city on one side of the board. Each side is only two color sets, so it is off by default.
   tripleMonopoly  win by owning three full color sets
   beachMonopoly   win by owning all four beaches
   islandRent      players stuck on Lost Island still collect rent
   botBuild        bots build houses and Hotels (No: bots only buy land)
   directBuild     build several levels in one visit (No: one level each time you land)
   doublesAgain    roll again after any doubles (doubles also get you off Lost Island) */
const DEFAULT_SETTINGS = {playTime:60, startCash:START_CASH, lapBonus:GO_BONUS, festivals:FESTIVALS.count,
  lineMonopoly:false, tripleMonopoly:true, beachMonopoly:true, islandRent:true, botBuild:true, directBuild:true, doublesAgain:true};
/* Slider ranges in the Quick settings panel, and the play time choices (0 = no limit) */
const SETTING_RANGES = {startCash:{min:200, max:10000, step:100}, lapBonus:{min:0, max:2000, step:50}, festivals:{min:0, max:10, step:1}};
const PLAY_TIMES = [20, 60, 120, 0];
const LEVEL_NAMES = ["", "Land", "House 1", "House 2", "House 3", "Hotel"];
/* The game's public claude.ai link. Invites send friends here with the room code. */
const SHARE_URL = "https://claude.ai/artifact/3iTp5tUrE5zy2dEtF1kwVr";
/* Online rooms on your own site (Vercel): paste the web app config from the Firebase console here.
   Firebase web keys are meant to be public; the Firestore security rules are what protect the data.
   Leave apiKey empty to keep online rooms off. See js/net.js. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrTNC1aL7SAJ4fE4YWsj7oidfSoslBjWU",
  authDomain: "skyline-tycoon.firebaseapp.com",
  projectId: "skyline-tycoon",
  storageBucket: "skyline-tycoon.firebasestorage.app",
  messagingSenderId: "781033820835",
  appId: "1:781033820835:web:47d7ba737c62110fb26516"
};
const PCOLORS = ["#e5484d", "#2f7fe0", "#e9a514", "#25a86a"];
/* ================= REGIONS =================
   Each side of the board is two stacks of three tiles:
     an inland trio  (three cities, tiles 1-2-3, 9-10-12, 17-19-20)
     a coastal stack (a beach plus its cities: beach 4 + 5-6-7 on the bottom-left, then 13 + 14-15, 21 + 22-23, 29 + 30-31).
     Chance is at 11, 18 and 27; the one tax tile is at 28.
   The bottom-right side also has one inland pair (25-26) with no beach.
   So keep: three regions with 3 cities, four regions with 2 cities and a beach, and one region with 2 cities and no beach.
   A region is one color set. Its cities always sit together, and a coastal region's beach sits right beside its pair.
   Each new game shuffles which trio and which coastal stack goes where, and the city order inside each.
   Prices are in thousands of rupees. Houses cost half the land price each, a Hotel costs the land price. */
const REGIONS = [
  {id:"east",        name:"East India", color:"#b07a58", tint:"#ead2bf", cities:[["Kolkata","CCU",300], ["Patna","PAT",90], ["Ranchi","RAN",70]]},
  {id:"rajasthan",   name:"Rajasthan", color:"#f0832a", tint:"#f9d5b4", cities:[["Jaipur","JAI",180], ["Udaipur","UDR",120], ["Jaisalmer","JSA",90]]},
  {id:"capital",     name:"the Capital Region", color:"#34507e", tint:"#c4cfe3", cities:[["Delhi","DEL",400], ["Gurugram","GGN",230], ["Lucknow","LKO",160]]},
  {id:"maharashtra", name:"Maharashtra", color:"#d4468c", tint:"#f3c6dc", cities:[["Mumbai","BOM",450], ["Pune","PNQ",260], ["Nashik","ISK",170]], beach:["Juhu Beach","JUH"]},
  {id:"tamilnadu",   name:"Tamil Nadu", color:"#1f9c8c", tint:"#bfe5df", cities:[["Chennai","MAA",290], ["Coimbatore","CBE",110]], beach:["Marina Beach","MAR"]},
  {id:"kerala",      name:"Kerala", color:"#c9b11a", tint:"#efe6a8", cities:[["Kochi","COK",150], ["Trivandrum","TRV",130]], beach:["Kovalam Beach","KOV"]},
  {id:"gujarat",     name:"Gujarat", color:"#3fb0de", tint:"#c6e7f5", cities:[["Ahmedabad","AMD",210], ["Surat","STV",130]], beach:["Mandvi Beach","MDV"]},
  {id:"deccan",      name:"the Deccan", color:"#7c5cd6", tint:"#d8cdf4", cities:[["Bengaluru","BLR",420], ["Hyderabad","HYD",320]]}
];
const GROUPS = Object.fromEntries(REGIONS.map(r => [r.id, {color:r.color, tint:r.tint}]));
const BEACH_COLOR = "#e8b960";
const region = id => REGIONS.find(r => r.id === id);
function C(id, k){ const [name, code, price] = region(id).cities[k]; return {type:"city", name, code, g:id, price}; }
/* A beach keeps its region in "region" (for the colored stripe) but not in "g", so it never counts toward a color set. */
function B(id){ const [name, code] = region(id).beach; return {type:"beach", name, code, region:id, price:200}; }
/* The board before shuffling */
const TILES = [
  {type:"start", name:"Start", code:"GO"},
  C("east",0), C("east",1), C("east",2),
  B("maharashtra"), C("maharashtra",0), C("maharashtra",1), C("maharashtra",2),
  {type:"jail", name:"Lost Island", code:"ISLE"},
  C("rajasthan",0), C("rajasthan",1), {type:"fortune",name:"Chance",code:"?"}, C("rajasthan",2),
  B("tamilnadu"), C("tamilnadu",0), C("tamilnadu",1),
  {type:"expo", name:"Grand Expo", code:"EXPO"},
  C("capital",0), {type:"fortune",name:"Chance",code:"?"}, C("capital",1), C("capital",2),
  B("kerala"), C("kerala",0), C("kerala",1),
  {type:"jet", name:"Airport", code:"AIR"},
  C("deccan",0), C("deccan",1), {type:"fortune",name:"Chance",code:"?"}, {type:"tax",id:"income",name:"Income Tax",code:"TAX"},
  B("gujarat"), C("gujarat",0), C("gujarat",1)
];
/* Every new game shuffles the regions and moves each price by up to PRICE_JITTER (.15 = 15%). Set SHUFFLE_CITIES to false to keep the board above. */
const SHUFFLE_CITIES = true, PRICE_JITTER = .15;
/* The one tax tile charges this share of what all your cities and beaches are worth (what you paid for them). No property, no tax. */
const TAX_RATE = .1;
const SIDES = [[1,2,3,5,6,7],[9,10,12,14,15],[17,19,20,22,23],[25,26,30,31]];
/* Chance cards. kind is "good" (Boost), "bad" (Setback) or "world" (World event); it sets the card's label and color.
   Every card is equally likely. List a card twice to make it more common. */
/* Chance cards. "title" is the ribbon on the card, "text" sits under the picture. The pictures are drawn in js/cards.js. */
const CARDS = [
  {id:"shield",    kind:"good",  title:"Shield",              text:"Skip the next rent you owe, or block the next setback aimed at you."},
  {id:"freebuild", kind:"good",  title:"Free build",          text:"Add one level to one of your cities for free."},
  {id:"taxfree",   kind:"good",  title:"Tax exemption",       text:"Your next tax bill is waived."},
  {id:"pass",      kind:"good",  title:"Escape card",         text:"Keep it to leave Lost Island for free."},
  {id:"forward",   kind:"good",  title:"Shortcut",            text:"Move forward 4 tiles."},
  {id:"bonus",     kind:"good",  title:"Investor bonus",      text:"Collect ₹150K."},
  {id:"bday",      kind:"good",  title:"Company anniversary", text:"Every tycoon pays you ₹30K."},
  {id:"jail",      kind:"bad",   title:"Storm warning",       text:"You wash up on Lost Island."},
  {id:"quake",     kind:"bad",   title:"Earthquake",          text:"A random city loses one building level. Hotels stand firm."},
  {id:"blackout",  kind:"bad",   title:"Blackout",            text:"A random city collects no rent for 2 rounds."},
  {id:"fine",      kind:"bad",   title:"Fine",                text:"Pay ₹100K to the bank."},
  {id:"back",      kind:"bad",   title:"Wrong exit",          text:"Go back 3 tiles."},
  {id:"gift",      kind:"bad",   title:"Gift a city",         text:"Give one of your cities to a rival of your choice."},
  {id:"epidemic",  kind:"world", title:"Epidemic",            text:"Rent in one region is halved for 2 rounds."},
  {id:"forcesale", kind:"world", title:"Force sale",          text:"Buy any rival city that isn't a Hotel at its normal value."},
  {id:"jet",       kind:"world", title:"World tour",          text:"Go to the Airport and fly anywhere next turn."},
  {id:"demolish",  kind:"world", title:"Demolition",          text:"Pick a rival's city. Its building drops one level, even a Hotel."}
];
const CARD_KINDS = {good:{label:"Boost", color:"#23915a"}, bad:{label:"Setback", color:"#c9423a"}, world:{label:"World event", color:"#7c5cd6"}};
/* How many rounds a Blackout or Epidemic lasts after the round it starts in */
const EVENT_ROUNDS = 2;


/* ================= CHARACTERS =================
   Twelve tycoons to pick from. The art is drawn in js/chars.js. "move" is the idle hand gesture.
   Two players can't pick the same character. */
const CHARACTERS = [
  {name:"Rohan", role:"The Tourist",    move:"camera"},
  {name:"Tara",  role:"The Star",       move:"umbrella"},
  {name:"Mira",  role:"The Thinker",    move:"chin"},
  {name:"Leela", role:"The Banker",     move:"glasses"},
  {name:"Bilal", role:"The Backpacker", move:"pockets"},
  {name:"Sofia", role:"The Jetsetter",  move:"bag"},
  {name:"Kai",   role:"The Rookie",     move:"music"},
  {name:"Pia",   role:"The Rebel",      move:"fist"},
  {name:"Arjun", role:"The Boss",       move:"briefcase"},
  {name:"Rani",  role:"The Heiress",    move:"clutch"},
  {name:"Doc",   role:"The Inventor",   move:"mustache"},
  {name:"Zane",  role:"The Gamer",      move:"thumbs"}
];
/* Which way characters face on each board side. 0 bottom-left (tiles 1 to 7), 1 top-left (9 to 15),
   2 top-right (17 to 23), 3 bottom-right (25 to 31). "left" means facing the bottom-left of the screen. */
const FACING_BY_SIDE = ["left", "right", "left", "right"];

/* ================= ASSET SLOTS =================
   Point any slot at an image file to replace the drawn art. Leave null to keep the built-in drawing.
   See assets/README.md for sizes and anchoring. Paths are relative to index.html. */
const ASSETS = {
  characters: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 11: null }, // one per CHARACTERS entry, drawn facing bottom-right, e.g. "assets/characters/char-0.png"
  buildings:  { 1: null, 2: null, 3: null, 4: null, 5: null }, // 1 Land, 2 House 1, 3 House 2, 4 House 3, 5 Hotel
  props:      { pine: null, palm: null, money: null },
  cards:      {}   // Chance card pictures by card id, e.g. shield: "assets/cards/shield.png" (shown at 240 x 170)
};
/* Background music: a sound file that loops while the Music button is on. Volume is 0 to 1.
   Set src to null to go back to the music generated in code (js/audio.js). */
const MUSIC = {src:"assets/sounds/music.mp3", volume:.45};
/* Sounds that play when a character lands on a tile, by tile index. Respects the Sound button.
   Volume is 0 to 1. Add more tiles the same way, e.g. 24: {src:"assets/sounds/jet.mp3", volume:.8}. */
const LANDING_SOUNDS = {
  8: {src:"assets/sounds/lost-island.mp3", volume:.8}   // Lost Island
};
/* Heights on the board, in tile units, used when an image replaces a drawing. */
const ASSET_HEIGHTS = { characters: 1.05, buildings: {1:.7, 2:.75, 3:.8, 4:.95, 5:1.6}, props: {pine:1.0, palm:1.1, money:.9} };
