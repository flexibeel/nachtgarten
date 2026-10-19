# App-Icon & Startbilder im Design „Abendruhe“ (v2)

Vorbereitet, **noch nicht eingebunden** – die Live-App nutzt weiterhin `icons/`.

- `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180, ohne Transparenz), `maskable-512.png` (Safe-Zone ~20 %)
- `light-icon-512.png` – helle Variante
- `splash/splash-*.png` (dunkel) und `splash/light-splash-*.png` (hell) für iPhones, Namen = Pixelgröße
- `icon.svg`, `icon-maskable.svg` – Quellen

Farben aus `docs/DESIGN.md` (v2): Dunkel #1C1A1A, Altrosa #D3A99F, Salbei #AFBCA2.
Neu rendern: `python3 design/render_icons.py v2`. Der Schriftzug fällt hier auf eine Systemschrift
zurück; ist „Instrument Serif“ installiert, wird sie automatisch verwendet.

Einbinden in v2: Dateien nach `icons/` kopieren; `build.py` erzeugt die
`apple-touch-startup-image`-Links aus `icons/splash/` automatisch.
