"""E2E-Rauchtest für Nachtgarten v2 (Python Playwright, Chromium, 390x844).

Startet einen lokalen Server im Projektordner und prüft in Hell und Dunkel:
Onboarding (inkl. Schwangerschaft), „Heute“, Design-Schalter, Sicherung speichern und laden,
Direktsprung #training, ausgeschaltete Module, keine Seitenfehler, kein seitliches Scrollen.

  python3 tests/e2e/smoke.py                 # Test
  SHOTS=/pfad python3 tests/e2e/smoke.py     # zusätzlich Screenshots speichern
"""

import contextlib
import functools
import http.server
import json
import os
import pathlib
import sys
import tempfile
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get("SHOTS")
VIEWPORT = {"width": 390, "height": 844}
NEXT = ".onboarding-actions .button-primary"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextlib.contextmanager
def serve():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/"
    finally:
        server.shutdown()


def shot(page, name, full=False):
    if SHOTS:
        page.wait_for_timeout(350)
        page.screenshot(path=str(pathlib.Path(SHOTS) / f"s2_{name}.png"), full_page=full)


def check(cond, message):
    if not cond:
        raise AssertionError(message)


def no_horizontal_scroll(page, where):
    width = page.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)")
    check(width <= VIEWPORT["width"], f"{where}: seitliches Scrollen ({width}px)")


def new_page(browser, scheme):
    context = browser.new_context(viewport=VIEWPORT, device_scale_factor=2, color_scheme=scheme, locale="de-DE", accept_downloads=True, service_workers="block")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" else None)
    return context, page, errors


def onboarding_pregnancy(page, scheme):
    page.wait_for_selector(".onboarding")
    shot(page, f"{scheme}_onboarding_name")
    page.fill(".onboarding-content input", "Lena")
    page.click(NEXT)
    page.click(".chip:has-text('Training')")
    page.click(".chip:has-text('Schwangerschaft')")
    page.click(".chip:has-text('Weniger Handy')")
    page.click(".chip:has-text('Gewohnheiten')")
    shot(page, f"{scheme}_onboarding_modules")
    page.click(NEXT)
    check("schwanger" in page.inner_text(".onboarding-title"), "Schwangerschafts-Schritt fehlt")
    page.fill("input[type=date]", "2027-02-10")
    page.click(NEXT)
    check("Sicherheitshinweise" in page.inner_text(".field-error"), "Sicherheits-Bestätigung wird nicht verlangt")
    page.click("text=Gelesen und verstanden")
    page.click(".safety-summary")
    check(page.is_visible(".safety-list li"), "Warnzeichen nicht aufklappbar")
    shot(page, f"{scheme}_onboarding_mama")
    page.click(NEXT)
    check("möchtest" in page.inner_text(".onboarding-title"), "Ziel-Schritt fehlt")
    page.click(".chip:has-text('Mich leichter')")
    shot(page, f"{scheme}_onboarding_goal")
    for _ in range(2):  # Tage, Geräte
        page.click(NEXT)
    check(page.get_attribute(".chip:has-text('Körpergewicht')", "aria-pressed") == "true", "Körpergewicht nicht vorausgewählt")
    check(page.get_attribute(".chip:has-text('Langhantel')", "aria-pressed") == "false", "Gerät vorausgewählt")
    page.click(NEXT)
    check("Begleiter" in page.inner_text(".onboarding-title"), "Begleiter-Schritt fehlt")
    shot(page, f"{scheme}_onboarding_companion")
    page.click(NEXT)
    page.wait_for_selector(".onboarding", state="detached")
    store = page.evaluate("JSON.parse(localStorage.getItem('ng2.settings'))")
    check(store["enabledModules"] == ["train", "mama", "habits", "handy"], f"Module falsch gespeichert: {store['enabledModules']}")
    mama = page.evaluate("JSON.parse(localStorage.getItem('ng2.mama'))")
    check(mama["mode"] == "preg" and mama["safetyOk"], "Schwangerschaft nicht gespeichert")


def check_heute(page, scheme):
    page.wait_for_selector(".heute-greeting")
    check("Lena" in page.inner_text(".heute-greeting"), "Begrüßung ohne Namen")
    check(page.is_visible(".sport-start"), "Sport starten fehlt")
    check(page.get_attribute(".sport-start", "href") == "#mama", "Sport starten führt nicht zum Mama-Plan")
    check("SSW" in page.inner_text(".sport-start"), "SSW fehlt")
    check(page.is_visible(".companion-bubble"), "Begleiter fehlt")
    check(page.locator("[data-tile]").count() >= 5, "zu wenige Kacheln")
    check("nur auf diesem Gerät" in page.inner_text(".heute-settings"), "Datenschutz-Satz fehlt")
    tabs = page.locator(".tab .tab-label").all_inner_texts()
    check(tabs == ["Heute", "Training", "Mama", "Fokus"], f"Tabs falsch: {tabs}")
    shot(page, f"{scheme}_heute")
    shot(page, f"{scheme}_heute_full", full=True)
    no_horizontal_scroll(page, "Heute")

    # Gewohnheit abhaken, Eine Sache, Kurz abladen mit Rückgängig
    page.fill(".one-thing input", "Spaziergang")
    page.click(".one-thing button[type=submit]")
    page.click(".one-thing-check")
    check(page.get_attribute(".one-thing-check", "aria-checked") == "true", "Eine Sache nicht abhakbar")
    page.click(".habit-day.is-today")
    check(page.get_attribute(".habit-day.is-today", "aria-pressed") == "true", "Gewohnheit nicht abhakbar")
    page.fill(".dump input", "Milch kaufen")
    page.press(".dump input", "Enter")
    page.click(".dump-item .icon-button")
    page.wait_for_selector(".toast.is-visible .toast-action")
    page.click(".toast-action")
    check(page.locator(".dump-item").count() == 1, "Rückgängig beim Abladen klappt nicht")


def check_theme(page, scheme):
    before = page.evaluate("getComputedStyle(document.body).backgroundColor")
    page.click(".theme-quick")
    page.wait_for_timeout(350)
    after = page.evaluate("getComputedStyle(document.body).backgroundColor")
    check(before != after, "Design-Schalter ändert nichts")
    expected = "light" if scheme == "dark" else "dark"
    check(page.evaluate("document.documentElement.dataset.theme") == expected, "falsches Design gesetzt")
    shot(page, f"{scheme}_theme_switched")
    page.click(".toast-action")  # Rückgängig
    page.wait_for_timeout(300)
    check(page.evaluate("getComputedStyle(document.body).backgroundColor") == before, "Rückgängig beim Design klappt nicht")


def check_profile(page, scheme):
    page.click(".avatar")
    page.wait_for_selector(".profile.sheet-panel")
    shot(page, f"{scheme}_profile")
    page.locator(".profile .sheet-body").evaluate("el => el.scrollTo(0, 820)")
    shot(page, f"{scheme}_profile_order")
    first = page.locator(".order-item .order-title").first.inner_text()
    page.locator(".order-item").nth(1).locator("button").first.click()
    check(page.locator(".order-item .order-title").first.inner_text() != first, "Kachel lässt sich nicht verschieben")
    page.keyboard.press("Escape")
    page.wait_for_selector(".profile.sheet-panel", state="detached")


def check_backup(page, tmp):
    with page.expect_download() as info:
        page.click(".list-button:has-text('Sicherung speichern')")
    path = pathlib.Path(tmp) / info.value.suggested_filename
    info.value.save_as(path)
    data = json.loads(path.read_text())
    check(data["app"] == "nachtgarten" and data["data"]["profile"]["name"] == "Lena", "Sicherung unvollständig")

    # Daten ändern, dann Sicherung zurückspielen
    page.evaluate("localStorage.setItem('ng2.dump', JSON.stringify(['weg damit']))")
    with page.expect_file_chooser() as chooser:
        page.click(".list-button:has-text('Sicherung laden')")
    chooser.value.set_files(str(path))
    page.wait_for_selector(".sheet-panel:has-text('Sicherung laden?')")
    page.click(".sheet-footer .button-primary")
    page.wait_for_selector(".toast:has-text('Sicherung geladen')")
    dump = page.evaluate("JSON.parse(localStorage.getItem('ng2.dump'))")
    check(dump == ["Milch kaufen"], f"Wiederherstellen fehlerhaft: {dump}")


def check_deep_links(page, base, scheme):
    page.goto(base + "#training")
    page.wait_for_selector(".placeholder")
    check("Training" in page.inner_text(".placeholder-title"), "#training zeigt nicht Training")
    check(page.get_attribute(".tab[aria-current=page]", "href") == "#training", "Tab nicht markiert")
    shot(page, f"{scheme}_training")
    no_horizontal_scroll(page, "Training")
    page.goto(base + "#live")
    page.wait_for_selector(".back-link")
    check(page.is_hidden(".tabbar"), "Tab-Leiste im Live-Training sichtbar")
    page.goto(base + "#umlenken")
    page.wait_for_selector(".placeholder-title:has-text('Fokus')")
    # Ideen-Labor ist aus: Direktsprung landet auf „Heute“
    page.goto(base + "#ideen")
    page.wait_for_selector(".heute-greeting")
    check(page.evaluate("location.hash") == "#heute", "ausgeschaltetes Modul erreichbar")


def check_default_path(browser, base, scheme):
    """Alles überspringen: Standard-Module, keine Fehler."""
    context, page, errors = new_page(browser, scheme)
    page.goto(base)
    page.wait_for_selector(".onboarding")
    while page.locator(".onboarding").count():
        page.click(NEXT)
        page.wait_for_timeout(120)
    page.wait_for_selector(".heute-greeting")
    tiles = page.eval_on_selector_all("[data-tile]", "els => els.map(e => e.dataset.tile)")
    check(tiles == ["sport", "week", "one-thing", "habit", "dump"], f"Standard-Kacheln falsch: {tiles}")
    check(page.get_attribute(".sport-start", "href") == "#live", "Sport starten führt nicht ins Training")
    check(page.locator(".tab").count() == 2, "Standard sollte Heute + Training zeigen")
    check(not errors, "\n".join(errors))
    context.close()


def run():
    failures = 0
    with serve() as base, sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
        browser = p.chromium.launch()
        for scheme in ("light", "dark"):
            context, page, errors = new_page(browser, scheme)
            try:
                page.goto(base)
                onboarding_pregnancy(page, scheme)
                check_heute(page, scheme)
                check_theme(page, scheme)
                check_profile(page, scheme)
                check_backup(page, tmp)
                check_deep_links(page, base, scheme)
                check(not errors, "Seitenfehler:\n" + "\n".join(errors))
                check_default_path(browser, base, scheme)
                print(f"ok  {scheme}")
            except Exception as error:  # noqa: BLE001 – Testausgabe
                failures += 1
                print(f"FEHLER {scheme}: {error}")
                if SHOTS:
                    page.screenshot(path=str(pathlib.Path(SHOTS) / f"s2_{scheme}_error.png"))
            finally:
                context.close()
        browser.close()
    return failures


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
