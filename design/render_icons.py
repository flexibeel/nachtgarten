"""Rendert App-Icons und iOS-Startbilder aus SVG (Playwright/Chromium).

  python3 design/render_icons.py          -> icons/ + icons/splash/ (Nachtgarten, live)
  python3 design/render_icons.py v2       -> design/v2-icons/ (Abendruhe, noch nicht eingebunden)

Keimi ist derselbe Keimling wie in buddySVG() in src/app.html (viewBox 0 0 64 72, Stufe 2).
"""
import os, sys, pathlib, base64
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = "data:font/woff;base64," + base64.b64encode((ROOT / "fonts" / "bricolage.woff").read_bytes()).decode()

PALETTES = {
    "live": dict(
        bg0="#22302B", bg1="#141A18", bg2="#0C100F", halo="#7FAE9C",
        body="#8CBBA9", shade="#5F8C7B", eye="#0E1A15", leaf="#A3CBA6", leaf2="#86B48C",
        stem="#7FAE9C", cheek="#CDAE7A", moon="#CDAE7A", star="#E5E9E6",
        word="#E5E9E6", sub="#98A39E", font=f'url({FONT}) format("woff")', family="Bricolage Grotesque",
        wordweight=650, wordspacing="-.02em",
    ),
    # Abendruhe (docs/DESIGN.md im v2-Zweig): Dunkel #1C1A1A, Karte #252222, Altrosa #D3A99F, Salbei #AFBCA2
    "v2": dict(
        bg0="#2E2928", bg1="#221F1F", bg2="#181616", halo="#D3A99F",
        body="#AFBCA2", shade="#8A9A7C", eye="#2E2A28", leaf="#D3A99F", leaf2="#BC8F85",
        stem="#9DAA8F", cheek="#D3A99F", moon="#D3A99F", star="#EEE7E3",
        word="#EEE7E3", sub="#ABA19C", font=None,
        family='"Instrument Serif","Iowan Old Style","Palatino Linotype",Georgia,"DejaVu Serif",serif',
        wordweight=400, wordspacing="0",
    ),
    "v2light": dict(
        bg0="#FFFCFA", bg1="#F5F1EE", bg2="#EDE5E0", halo="#B58C83",
        body="#AFBCA2", shade="#8E9C80", eye="#2E2A28", leaf="#C79A90", leaf2="#B58C83",
        stem="#8E9C80", cheek="#B58C83", moon="#B58C83", star="#B58C83",
        word="#2E2A28", sub="#7D746F", font=None, shadow=".07",
        family='"Instrument Serif","Iowan Old Style","Palatino Linotype",Georgia,"DejaVu Serif",serif',
        wordweight=400, wordspacing="0",
    ),
}


def keimi(p):
    """Keimi im 64x72-Raster. Inhalt reicht etwa von y=16 (Blätter) bis y=66 (Körper)."""
    return f'''
  <path d="M32 32 C31 27 32.2 25 32 20" stroke="{p['stem']}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M32 24 C27 19 20.6 19.2 19 22.4 C22.6 26.8 28.4 26.8 32 24Z" fill="{p['leaf2']}"/>
  <path d="M32 21.5 C37 16.4 43.4 16.8 45 20 C41.4 24.4 35.6 24.4 32 21.5Z" fill="{p['leaf']}"/>
  <path d="M32 31 C45 31 52 40 52 50 C52 61 44 66 32 66 C20 66 12 61 12 50 C12 40 19 31 32 31Z" fill="{p['body']}"/>
  <path d="M14 54 C16 62 23 66 32 66 C41 66 48 62 50 54 C46 60.5 40 62.5 32 62.5 C24 62.5 18 60.5 14 54Z" fill="{p['shade']}" opacity=".6"/>
  <ellipse cx="21.5" cy="39.5" rx="4.2" ry="2.3" transform="rotate(-32 21.5 39.5)" fill="#fff" opacity=".26"/>
  <ellipse cx="19.4" cy="53.2" rx="3.4" ry="2" fill="{p['cheek']}" opacity=".5"/>
  <ellipse cx="44.6" cy="53.2" rx="3.4" ry="2" fill="{p['cheek']}" opacity=".5"/>
  <circle cx="25" cy="47" r="2.9" fill="{p['eye']}"/><circle cx="39" cy="47" r="2.9" fill="{p['eye']}"/>
  <circle cx="26" cy="46" r=".95" fill="#fff" opacity=".85"/><circle cx="40" cy="46" r=".95" fill="#fff" opacity=".85"/>
  <path d="M28.6 52.6 Q32 56 35.4 52.6" stroke="{p['eye']}" stroke-width="2.1" fill="none" stroke-linecap="round"/>'''


def icon_svg(p, scale=1.0, sky=True):
    """512er App-Icon, randlos. scale<1 für maskable (Safe-Zone)."""
    s = 6.3 * scale                     # 64er Raster -> px
    cx, cy = 256, 41 * s                # Inhaltsmitte (y 16..66 -> 41)
    tx, ty = 256 - 32 * s, 270 - cy     # optisch leicht unter der Mitte
    moon = ""
    if sky:
        m = scale
        mx, my = 256 + 128 * m, 256 - 132 * m
        moon = f'''<g opacity=".95"><circle cx="{mx}" cy="{my}" r="{24*m}" fill="{p['moon']}"/>
          <circle cx="{mx+11*m}" cy="{my-8*m}" r="{21*m}" fill="url(#bg)"/></g>
        <circle cx="{256-132*m}" cy="{256-112*m}" r="{4.5*m}" fill="{p['star']}" opacity=".45"/>
        <circle cx="{256-84*m}" cy="{256-160*m}" r="{3*m}" fill="{p['star']}" opacity=".3"/>'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
  <radialGradient id="bg" cx="256" cy="200" r="380" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="{p['bg0']}"/><stop offset=".6" stop-color="{p['bg1']}"/><stop offset="1" stop-color="{p['bg2']}"/></radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="{p['halo']}" stop-opacity=".22"/><stop offset="1" stop-color="{p['halo']}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="512" height="512" fill="url(#bg)"/>
<circle cx="256" cy="{270}" r="{205*scale}" fill="url(#halo)"/>
{moon}
<ellipse cx="256" cy="{ty+67.5*s}" rx="{19*s}" ry="{2.6*s}" fill="#000" opacity="{p.get('shadow', '.22')}"/>
<g transform="translate({tx} {ty}) scale({s})">{keimi(p)}</g>
</svg>'''


def splash_html(p, w, h):
    face = f'@font-face{{font-family:"Bricolage Grotesque";src:{p["font"]};font-weight:200 800}}' if p["font"] else ""
    k = min(w * 0.36, 168)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{face}
html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}
body{{background:radial-gradient(90% 55% at 50% 40%,{p['bg0']},{p['bg1']} 60%,{p['bg2']});display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}}
.k{{width:{k}px;height:{k*72/64}px;margin-top:-6vh;filter:drop-shadow(0 18px 30px rgba(0,0,0,{'.06' if p.get('shadow') else '.25'}))}}
.w{{font-family:{('"'+p['family']+'"') if p['font'] else p['family']};font-weight:{p['wordweight']};font-size:{min(w*0.095,40)}px;letter-spacing:{p['wordspacing']};color:{p['word']}}}
.s{{font-family:system-ui,sans-serif;font-size:13px;letter-spacing:.06em;color:{p['sub']};margin-top:-10px}}
</style></head><body>
<svg class="k" viewBox="0 0 64 72"><ellipse cx="32" cy="68" rx="17" ry="2.6" fill="#000" opacity="{p.get('shadow', '.2')}"/>{keimi(p)}</svg>
<div class="w">Nachtgarten</div></body></html>'''


# iPhone-Startbilder: (CSS-Breite, CSS-Höhe, DPR)
SPLASH = [(440, 956, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (428, 926, 3),
          (390, 844, 3), (375, 812, 3), (414, 896, 3), (414, 896, 2), (375, 667, 2)]


def splash_name(w, h, d):
    return f"splash-{w*d}x{h*d}.png"


def shrink(fn):
    """Verlauf + wenige Farben: auf 256 Farben mit Dithering -> ~1/5 der Dateigröße, ohne Banding."""
    from PIL import Image
    im = Image.open(fn).convert("RGB")
    im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(fn, optimize=True)


def render(pal, outdir, light_pal=None):
    p = PALETTES[pal]
    out = pathlib.Path(outdir); (out / "splash").mkdir(parents=True, exist_ok=True)
    if pal != "live":
        (out / "icon.svg").write_text(icon_svg(p))
        (out / "icon-maskable.svg").write_text(icon_svg(p, scale=0.78))
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        def shot(svg, size, path, dpr=1):
            pg = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=dpr)
            pg.set_content(f'<html><body style="margin:0;background:#000">{svg.replace("width=\"512\" height=\"512\"", f"width=\"{size}\" height=\"{size}\"")}</body></html>')
            pg.screenshot(path=str(path), omit_background=False); pg.close()
        shot(icon_svg(p), 512, out / "icon-512.png")
        shot(icon_svg(p), 192, out / "icon-192.png")
        shot(icon_svg(p), 180, out / "apple-touch-icon.png")
        shot(icon_svg(p, scale=0.78), 512, out / "maskable-512.png")
        pals = [("", p)] + ([("light-", PALETTES[light_pal])] if light_pal else [])
        for pre, pp in pals:
            if pre:
                shot(icon_svg(pp), 512, out / f"{pre}icon-512.png")
            for w, h, d in SPLASH:
                pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=d)
                pg.set_content(splash_html(pp, w, h)); pg.wait_for_timeout(150)
                pg.evaluate("document.fonts.ready.then(()=>document.fonts.check(\"40px Bricolage Grotesque\"))")
                fn = out / "splash" / (pre + splash_name(w, h, d))
                pg.screenshot(path=str(fn)); pg.close()
                shrink(fn)
        b.close()
    print("ok", out)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "v2":
        render("v2", ROOT / "design" / "v2-icons", light_pal="v2light")
    else:
        render("live", ROOT / "icons")
        (ROOT / "src" / "icon.svg").write_text(icon_svg(PALETTES["live"]))
