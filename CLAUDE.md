# Skyline Tycoon

An online multiplayer board game for 2 to 4 players. Players roll dice, buy Indian cities and beaches, build houses and hotels, charge rent, and buy rivals' cities out. The board is isometric and drawn on a canvas. Bots, offline hot-seat play and an original procedural music loop are included.

The owner is Anish, a product designer. He will mostly change art, layout and game tuning. Keep code readable for a designer.

## Run it

No build step. Plain HTML, CSS and classic scripts.

```
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly works too, but image assets load more reliably from a local server.

## File map

| File | What it holds |
|---|---|
| `index.html` | Page markup. Loads scripts in order. |
| `css/styles.css` | All UI styles. Theme tokens on `:root`, dark mode under `prefers-color-scheme`. |
| `js/config.js` | Game data you will tune most: tiles, city names, prices, color sets, Chance cards, player colors, starting cash, rent multipliers, asset slots. |
| `js/engine.js` | Rules. Pure functions on a game state object. `act(state, action)` returns `{s}` or `{err}`. `botAction(state)` picks a bot move. |
| `js/audio.js` | Web Audio music loop and sound effects, generated in code. Also plays the tile landing sounds from `LANDING_SOUNDS` in `config.js` (files in `assets/sounds/`). |
| `js/render.js` | Isometric drawing kit, asset loader, board renderer, build-card art. |
| `js/cards.js` | Chance card pictures drawn in code (`CARD_ART`, one per card id) and `chanceArt()`. |
| `js/net.js` | Online backend: `connectBackend()` uses the claude.ai artifact runtime when present, otherwise Firebase from `FIREBASE_CONFIG` in `config.js` (anonymous sign-in, Firestore). |
| `js/chars.js` | The 12 tycoon characters drawn in code (`TYCOON_ART`), their hand gestures, facing per board side, and live animated canvases. |
| `js/main.js` | App and UI: home screen (host or join), character picker, corner player panels, center move buttons, tile card, build popup, online rooms, bot scheduling. |

Scripts are classic (not ES modules) and share top-level names, so load order in `index.html` matters: config, engine, audio, render, chars, cards, net, main.

## How the game state works

- One plain JSON object holds the whole game: `players`, `own` (tile index to `{o: ownerId, l: level}`), `turn`, `phase`, `pending`, `dice`, `log`, `rev`.
- Phases: `roll`, `fly` (after the Airport), `act` (a decision is pending), `over`.
- `pending.k` is one of `buy`, `upgrade`, `takeover`, `expo`, `freebuild`, `forcebuy`, `demolish` (from Chance cards) and `debt`. Chance picks (`CHANCE_PICKS`: freebuild, forcebuy, demolish) can't be skipped; after `PICK_MS` (25 s, main.js) a random eligible city is picked. Demolition lets the drawer pick a rival city (`demolishOptions`) and drop its building one level, Hotels included; the owner's Shield blocks it.
- Debts: the current player pays rent, tax, fines and the Lost Island boat through `charge()`. If a human can't cover it but owns property, the game pauses with `pending.k = "debt"` and moves `sell` (chosen tiles), `autosell` or `bankrupt`. Sales pay `SELL_RATE` of what was spent. `settleDebt` pays once there is enough and continues with `pending.after`. Bots and other players still sell automatically in `pay()`. In `main.js`, `showDebt` shows the blue "not enough money" band (`showAlert`, `#alertBand`), then the sell card and the price tags on the board.
- Not enough money to buy: when a human lands on a city or beach they can not afford (or a buyout they can not pay), `syncPopup` first shows the same blue band ("YOU DON'T HAVE ENOUGH MONEY TO BUY THIS CITY", `ALERT_MS`), then the buy popup opens with everything locked.
- Beaches: one level only, price `200` in `B()` (config.js), rent `beachRent(n)` by how many beaches the owner has (25, 50, 100, 200). Owned beaches show a resort (`resort()` in render.js: deck, striped parasol and bar in the owner color, lounger, pool). Beaches can not be bought out or force-bought: a visitor pays rent and nothing pops up. The beach buy card (`beachPanel` in main.js) shows the resort and the rent table with the matching row highlighted.
- Lost Island (tile 8): landing there, the Storm Chance card or three double sixes strand the player (`p.jail` counts tries). They leave by rolling doubles, paying `BAIL` (`bail`), using an escape card (`pass`), or on the third failed roll they pay `BAIL` and walk. Nobody can fly to Lost Island.
- Levels: 1 Land, 2 House 1, 3 House 2, 4 House 3, 5 Hotel. Hotels (level 5) can't be taken over, force-bought or shaken down by earthquakes.
- First lap rule: each player has `laps` (times they passed Start, counted in `passStart`). Until `laps` is 1, `buildCap(p)` limits building to `FIRST_LAP_MAX_LEVEL` (House 2), so House 3 and Hotels wait. In the build popup those cards get a "Not available during the first lap" stamp (`.lap-tag`). Buying out a rival's bigger building is still allowed.
- Turn animation order (render.js): the dice are thrown from the roller's corner (`s.roller`) for `DICE_MS`, land in `DICE_REST`, stay `DICE_HOLD` and fade (`DICE_FADE`); only then the character walks. When they land, `drawCounter` shows the total in a white box over the dice and a badge on the destination tile until the player arrives. The build card slides in from the left and shrinks away (`leavePop` in main.js). Then the cash stack flies and `drawMoneyCount` counts the amount up over the middle (stays `MONEY_HOLD_MS`). New buildings pop up on their tile after `BUILD_POP_DELAY` (`popBuilding`). Between rolls the board has no dice. The move buttons sit at `HUB_AT` (toward the front). The middle of the board has no trees so it stays clear.
- Doubles: with `doublesAgain` on (default), any doubles play the tile, then the same player rolls again (`s.extra`, `s.doubles`); three doubles in a row strand them on Lost Island. Doubles that free someone from Lost Island give no extra roll. When the dice land on doubles the dice stay `DOUBLE_HOLD` and `drawDouble` (render.js) zooms a red DOUBLE in beside them that bursts into a white cloud (`DOUBLE_FX_MS`, sound `double`). Bots wait `DOUBLES_PAUSE_MS` (main.js) after the tile has played out before the extra roll.
- Thinking bubble: while the current player decides (`act` or `fly` phase), `thinkingText` in `main.js` picks the words from `THINKING` and `board.think()` draws a thought bubble over their head (`thinkBubble` in `render.js`). Bots wait `BOT_THINK_MS` on decisions so the bubble can be read.
- Full set banner: when someone comes to own every city of a color, `setState` in main.js finds it (`newFullSets`, comparing `fullSets` before and after) and queues a banner. `#setBanner` sweeps a band in the region color across the board with FULL SET, who, the region `name` (in `REGIONS`) and "rent doubled", after the walk, building pop, cash stack and any Chance card, for `SET_BANNER_MS`. Bots wait for it (`cardBusy`). Sound: `sfx("fullset")`.
- Chance card popup: `showCard` in `main.js` shows every draw to every player, after the walk finishes: a ribbon with `title`, the picture from `chanceArt` (or an image in `ASSETS.cards`), the `text`, the kind and who drew it. It closes after `CARD_SHOW_MS` or on tap.
- Chance cards (`CARDS` in `config.js`, effects in `drawCard` in `engine.js`) are Boosts, Setbacks or World events (`kind`). They add player flags `shield`, `taxFree`, `passes` and board events `s.blackouts` (tile to last round) and `s.epidemics` (color set to last round), which `endEvents` clears when the round passes. A Shield cancels the next rent or the next setback aimed at its owner.
- Quick settings: the host sets them in the character picker (offline, whoever sets up the game). They live in `s.rules`, defaults in `DEFAULT_SETTINGS` in `config.js`, slider ranges in `SETTING_RANGES`, play times in `PLAY_TIMES`. Engine code reads them with `rules(s)`. `startGame(s)` applies start money, festivals and the play clock (`s.endsAt`) when a game starts. When time is up, `nextTurn` finishes the round and `endOnTime` crowns the richest tycoon. `stepCap` limits building to one level per visit when `directBuild` is off. The panel is `#qs` in `index.html`, built by `buildQS` in `main.js`. The last used settings are kept in localStorage `skyline.settings2`. Line Monopoly is off by default because one side is only two color sets; the default win is Triple Monopoly (three full sets).
- Festivals: `pickFestivals` (in `startGame`) puts festivals in `rules(s).festivals` random cities for the whole game, saved in `s.festivals`. Rent there is multiplied by `FESTIVALS.rentMult`. When a game starts, `setState` calls `board.celebrate()`, which raises the poles with confetti and a FESTIVAL! label (`drawFestival`, `festivalBursts` in `render.js`).
- Every UI action goes through `dispatch(action)` in `main.js`, which calls `act()` and then either saves locally (offline) or writes the new state (online).
- Only the current player's client writes moves. Online, bots are driven by the host's client, or by the first player still in the game if the host left (`isDriver`). Leaving a running online game (`quitOnline`) sends `{t:"leave"}`: a bot takes the seat (`handOver`, `p.left`). The idle watchdog in main.js makes a safe automatic move (`autoMove`, marked `auto`) for a player idle `IDLE_MS`, or plays stalled bots after `BOT_STALL_MS`; `MISSED_TURNS_FOR_BOT` missed turns hand the seat to a bot. `s.moveAt` is stamped by every move. Rent also records `s.tx`, so the cash flies from payer to owner.

To check rules changes, run a headless bot simulation with Node: concatenate `config.js` and `engine.js`, then loop `act(s, botAction(s))` until `s.status === "over"`.

## Board geometry

- Board coordinates are plane units. `S = 10.2` is the board size, `D = 1.6` is the corner and tile depth, `ROAD = 0.42` is the inner road.
- `P(X, Y, Z)` projects plane coordinates to screen pixels using the current view `V` (`k` is pixels per unit).
- `tileRect(i)` gives a tile's rectangle. `along(rect, f)` gives a point at fraction `f` from the outer edge toward the center. `sub(rect, f0, f1)` gives a strip.
- Sides: 0 bottom-left (tiles 1 to 7), 1 top-left (9 to 15), 2 top-right (17 to 23), 3 bottom-right (25 to 31). Corners: 0 Start, 8 Lost Island, 16 Grand Expo, 24 Airport.
- Tiles are raised blocks `TILE_H` above the road. A tile dips by `TILE_DIP` when a character lands on it and rests a little lower while someone stands on it (`tileTop`). Anything drawn on a tile is lifted with `onTile(i, fn)` or `V.lift`.
- Each tile, from the outer edge toward the road: owner band (0 to .1), buildings at `along(r, .3)`, name at `.62`, price strip at `.75` to `.97`. Sides in `FLIPPED_SIDES` (render.js, now the two front sides: 0 bottom-left and 3 bottom-right) run the other way: `along()` uses `1 - f`, so from the road toward the viewer you see the festival flags, the building, the name, then the rent tag. The price strip is blank until the city is bought, then shows the rent in the owner's color, at the same size on every tile. Land prices still show in the tile card and the build popup.
- Cities belong to regions (`REGIONS` in `config.js`), each one color set. Inland trios sit at tiles 1-2-3, 9-10-12 and 17-19-20. Coastal stacks are a beach plus its cities: 4 + 5-6-7 (bottom-left, three cities, so Maharashtra with Nashik always lands there), 13 + 14-15, 21 + 22-23, 29 + 30-31. Tiles 25-26 hold one inland pair. Chance tiles are 11, 18 and 27; the single tax tile, Income Tax, is 28 and charges `TAX_RATE` (10%) of what the player's property is worth, nothing if they own none. Each new game shuffles trios among trio slots and coastal regions among coastal slots of the same size, shuffles city order and moves prices by up to `PRICE_JITTER`. Beaches carry `region` (for the colored stripe) but no `g`, so they never count toward a color set. The result is saved in `s.layout` and written into `TILES` by `applyLayout()` (runs in `newState`, `act` and `setState`). Set `SHUFFLE_CITIES` to false to keep the default board.
- Tile names run along the edge (`edgeDir`).
- Standing objects are depth-sorted by `X + Y` before drawing.

## Screens

1. Home (`showHome`): name, Host a game, Join a game by code or invite link (`#room=CODE`), or Play offline.
2. Character picker (`renderPicker`, used by `showLobby` online and `showOfflineSetup` offline): four seats, 12 characters, no duplicates. Starting with one player adds a bot.
3. The game, full screen. Player panels sit in the four corners (seat 1 top-left, then clockwise). Dice, the turn line, short prompts for your own move and move buttons sit in the middle of the board. There is no tile details card: tapping a tile only works when a move asks you to pick one (`board.setSelectable`).

## Characters

- `CHARACTERS` in `config.js` lists names, roles and the idle gesture. `p.look` is the index (0 to 11). Seat color `p.color` still marks ownership and shows as the ring under the feet.
- Characters face the bottom-right in the picker. On the board they face by side, set in `FACING_BY_SIDE`.

## Money piles

Purchases, builds, buyouts, rent, taxes, fines, the Bonus and Anniversary cards and bankruptcy payouts record payments with `txn()` in `engine.js` (`s.tx` is the last one, `s.txs` the last 8, `s.txSeq` counts them; bank payments that animate are listed in `BANK_ANIM`; `from: null` is the bank paying). `setState` in main.js plays every new one in order, one at a time, and a stack waits while a Chance card is open (`board.holdMoney`). The corner panels and money piles show `shownCash`, which is real cash plus `board.cashPending(idx)`: the payer's cash drops when its stack starts moving and the receiver's goes up when it lands. A payment made on landing waits until the walk is over. `setState` then calls `board.moneyFly()`, and `drawFlights` in `render.js` slides a cash stack with the amount from the payer's pile to the middle (bank) or through the middle to the other player's pile (`MONEY_FLY_MS`).

Each seat has a money pile next to its corner panel (`PILES` in `render.js`). `moneyPile()` draws about one brick per ₹50K and eases toward the player's cash, so it grows and shrinks as money changes. Bankrupt players lose their pile.

## Asset slots

Set paths in `ASSETS` in `js/config.js` to replace drawn art with images. Missing files fall back to the drawing and log a warning. Specs are in `assets/README.md`. Buildings drawn as images can't be tinted by owner color, so ownership still shows through the owner band and the price plate.

## Online multiplayer: important

The game is published as a claude.ai artifact at https://claude.ai/artifact/3iTp5tUrE5zy2dEtF1kwVr (capabilities `db` and `user`; rooms are docs at `games/<CODE>`). To update it, republish `index.html` with the Artifact tool and the same `files` map (css, js, assets/sounds). Friends need access to the artifact with "can use" or higher to join rooms; view-only people can only watch.

Online rooms use the claude.ai artifact runtime: `window.claude.use("db")` and `window.claude.use("user")`. These exist only when the page runs as a claude.ai artifact. Run locally or on your own host and they resolve to null, so the menu hides online play and offline mode still works.

On your own host (the site is deployed on Vercel from GitHub `Anish-Maji/Skyline-Tycoon`, branch `main`), online rooms use Firebase: fill `FIREBASE_CONFIG` in `config.js`, turn on Anonymous sign-in and Firestore, and publish `firestore.rules`. `js/net.js` wraps Firestore in the same shape described below. Invites on your own host use `#room=CODE` links.

To use a different backend instead, replace the database calls in `main.js` (`hostRoom`, `joinRoom`, `subscribe`, `lobbyEdit`, `dispatch`) with a real backend. The code only needs:
- `doc(path).set(obj)`, `doc(path).get()` returning `{exists, data()}`
- `doc(path).onSnapshot(callback, onError)` returning an unsubscribe function
- `doc(path).acquire({holder, ttlMs})` returning `{acquired}` (a short lock for lobby joins)
- a stable player id (`app.me`)

Firestore, Supabase Realtime or a small WebSocket server all fit. Build a thin adapter with that shape and the rest of the code stays the same.

## Conventions

- Keep everything original. The game is inspired by the mechanics of Steam's Business Tour, but do not copy its art, characters, music, logos, name or exact board layout. Mechanics are fine. Assets must be Anish's own or properly licensed.
- Don't copy copyrighted characters into the character slots.
- Money is stored in thousands of rupees and shown with `money()`: 60 is ₹60K, 1500 is ₹1.5M.
- UI copy is short and plain. No em dashes.
- Wrap any `localStorage` use in try/catch.

## Ideas queued up

- Trading cities between players.
- Turn timer that skips idle players.
- A real backend so the game can be hosted outside claude.ai.
