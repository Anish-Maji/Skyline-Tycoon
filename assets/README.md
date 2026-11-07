# Asset slots

Drop images in these folders, then point the matching slot in `js/config.js` at the file:

```js
const ASSETS = {
  characters: { 0: "assets/characters/char-0.png", 1: null /* ...up to 11 */ },
  buildings:  { 1: null, 2: null, 3: null, 4: null, 5: null },
  props:      { pine: null, palm: null, money: null }
};
```

Any slot left as `null` keeps the built-in drawing, so you can replace art one piece at a time.

## Format

- PNG with a transparent background. SVG also works.
- Isometric 2:1 angle, matching the board (the tile edges run at about 26.6°).
- The image is placed with its **bottom-center on the ground point**. Leave no empty space under the feet or the base.
- Draw at 2x or 3x the on-screen size for sharp results. Height matters, width follows the image's aspect ratio.

## Slots and sizes

Sizes are in tile units. One unit is the width of a city tile, about 40 to 50 px on a desktop screen.

| Slot | Key | Shows | Height | Suggested file |
|---|---|---|---|---|
| characters | 0 to 11 | One per character in `CHARACTERS`, facing the bottom-right. It is mirrored to face bottom-left. | 1.05 | 300 x 600 px |
| buildings | 1 | Land: plot with a flag | 0.7 | 300 x 300 px |
| buildings | 2 | House 1 | 0.75 | 300 x 300 px |
| buildings | 3 | House 2 | 0.8 | 360 x 300 px |
| buildings | 4 | House 3 | 0.95 | 400 x 380 px |
| buildings | 5 | Landmark | 1.6 | 300 x 640 px |
| props | pine | Pine tree | 1.0 | 200 x 400 px |
| props | palm | Palm tree | 1.1 | 260 x 440 px |
| props | money | Money pile | 0.9 | 600 x 360 px |

Change the heights in `ASSET_HEIGHTS` in `js/config.js` if your art needs more or less room.

## Notes

- Character art keeps its own colors. The player's seat color shows as a ring under the feet.
- Building images can't change color per owner. Ownership still shows through the colored band on the tile and the price plate.
- The same building images appear in the build popup cards.
- Use only your own art or art you have a license for.
