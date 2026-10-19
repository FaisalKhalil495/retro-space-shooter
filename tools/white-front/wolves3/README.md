# The Iron Wolves, traced from the owner's paintings

The owner's seven paintings (ChatGPT, olive and cream "coast army") are the
reference; each vehicle is traced shape by shape over its painting in
`vehicles.js` (coordinates in the painting's pixels, or on the coordinate
guide picture that `coords.mjs` makes), and `vec.js` turns the shapes into
sharp double-detail sprites in the Iron Wolves colours (or the coast colours).
`army.js` hands them to the preview's build; the big sled takes the Anchor
Gun's place. `sheet3.mjs` draws the comparison sheet. The paintings
themselves (20 MB) are not kept here: put them in `ref/<name>.png` to rerun.
