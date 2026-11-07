# Skyline Tycoon

Buy Indian cities and beaches, raise towers and bankrupt your friends. An isometric board game for 2 to 4 players, with bots and offline play.

## Run

```
python3 -m http.server 8080
```

Open http://localhost:8080 and choose **Play vs bots or on one screen**.

## Make it yours

- **Tune the game:** edit `js/config.js` for city names, prices, color sets, Chance cards, starting cash and rent.
- **Swap in your art:** see `assets/README.md`.
- **Restyle the UI:** edit the tokens at the top of `css/styles.css`.

## Online play

Online rooms work when the game runs as a claude.ai artifact. To host it yourself with multiplayer, add a backend. `CLAUDE.md` explains what the code expects.
