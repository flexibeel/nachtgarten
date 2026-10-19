"""E2E-Test der Veröffentlichung (Python Playwright, Chromium, Service Worker an).

Prüft den Wechsel von v1 (Wurzelordner) auf die neue App wie auf GitHub Pages:
ein lokaler Server liefert einen Ordner unter /nachtgarten/ aus. Zuerst zeigt er den alten Stand
von main (v1 im Wurzelordner, Beta unter beta/), dann den neuen (App im Wurzelordner, klassisch/, beta/).

  python3 tests/e2e/release.py                        # alt = origin/main vor dem Wechsel (Commit unten), neu = Arbeitsbaum von main
  OLD_REV=<commit> NEW_DIR=/pfad python3 tests/e2e/release.py

Abläufe:
1. Frische Installation der neuen App: Onboarding, Service Worker der App, keine Fehler.
2. Upgrade: v1 mit Daten (Profil, Plan, geloggter Satz) und aktivem v1-Service-Worker, Beta besucht.
   Dann „deploy“ und neu laden: v1-Service-Worker ersetzt, alte v1-Caches weg, Beta-Cache bleibt,
   neue App zeigt die übernommenen Daten, v1-Daten (lab.*) unverändert.
3. Klassisch zeigt dieselben v1-Daten, eigener Service Worker (Scope klassisch/), Direktsprung aus der App.
4. Beta läuft weiter.
"""

import contextlib
import functools
import http.server
import io
import json
import os
import pathlib
import subprocess
import sys
import tarfile
import tempfile
import threading

from playwright.sync_api import sync_playwright

MAIN = pathlib.Path(os.environ.get("NEW_DIR", "/home/claude/nachtgarten"))
OLD_REV = os.environ.get("OLD_REV", "46e3598")  # letzter Stand mit v1 im Wurzelordner
VIEWPORT = {"width": 390, "height": 844}

TODAY = None  # wird im Browser bestimmt

V1_DATA = {
    "lab.name": "Lena",
    "lab.profile": {"name": "Lena", "goal": "Kraft", "age": 31, "weight": "", "days": 3},
    "lab.gear": ["Körpergewicht", "Kurzhanteln", "Maschinen"],
    "lab.plans": [{"id": "p1760000000000", "name": "Push-Tag", "items": [{"e": "chestpress", "s": 3, "r": "10"}, {"e": "press", "s": 3, "r": "10"}]}],
    "lab.sched": {"0": "p1760000000000", "3": "p1760000000000"},
    "lab.foci": ["train", "handy"],
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


@contextlib.contextmanager
def serve(root):
    handler = functools.partial(Handler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/nachtgarten/"
    finally:
        server.shutdown()


def check(cond, message):
    if not cond:
        raise AssertionError(message)
    print("  ok ", message)


def export_rev(rev, dest):
    data = subprocess.run(["git", "archive", "--format=tar", rev], cwd=MAIN, check=True, capture_output=True).stdout
    with tarfile.open(fileobj=io.BytesIO(data)) as tar:
        tar.extractall(dest, filter="data")


def point(link, target):
    if link.is_symlink() or link.exists():
        link.unlink()
    link.symlink_to(target, target_is_directory=True)


def watch_errors(page, errors):
    page.on("pageerror", lambda e: errors.append(f"{page.url} pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{page.url} console: {m.text}") if m.type == "error" else None)


def cache_keys(page):
    return page.evaluate("caches.keys()")


def wait_until(page, expression, arg=None, timeout=15000, what="Bedingung"):
    """Wie wait_for_function, aber wartet auch auf Promises (caches.keys(), getRegistration())."""
    waited = 0
    while waited < timeout:
        if page.evaluate(expression, arg):
            return
        page.wait_for_timeout(250)
        waited += 250
    raise AssertionError(f"Zeitüberschreitung: {what}")


def wait_controller(page, script_suffix, timeout=15000):
    wait_until(page, "(s) => !!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.endsWith(s)", script_suffix, timeout, f"Service Worker {script_suffix}")


def wait_ready(page):
    wait_until(page, "navigator.serviceWorker.getRegistration().then(r => !!(r && r.active && r.active.state === 'activated'))", what="Service Worker aktiv")


def lab_snapshot(page):
    return page.evaluate("Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('lab.')).sort().map(k => [k, localStorage.getItem(k)]))")


def fresh_install(browser, base):
    print("Frische Installation")
    context = browser.new_context(viewport=VIEWPORT, locale="de-DE")
    page = context.new_page()
    errors = []
    watch_errors(page, errors)
    page.goto(base)
    page.wait_for_selector(".onboarding")
    check(page.title() == "Nachtgarten", "Titel der neuen App")
    wait_ready(page)
    page.reload()
    wait_controller(page, "/nachtgarten/sw.js")
    keys = cache_keys(page)
    check(any(k.startswith("ng2-app-") for k in keys), f"Cache der App angelegt ({keys})")
    manifest = page.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
    check(manifest["id"] == "./" and manifest["start_url"] == "./" and manifest["scope"] == "./", "Manifest: id/start_url/scope wie v1")
    check(not errors, f"keine Fehler {errors}")
    context.close()


def upgrade(browser, base, link, old_dir, new_dir):
    print("Upgrade von v1")
    point(link, old_dir)
    context = browser.new_context(viewport=VIEWPORT, locale="de-DE")
    page = context.new_page()
    errors = []
    watch_errors(page, errors)

    # v1 mit Daten
    page.goto(base)
    page.evaluate("(data) => { for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v)); }", V1_DATA)
    today = page.evaluate("(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()")
    # ein geloggter Satz: wie v1 ihn nach „Satz speichern“ und „Training beenden“ ablegt
    page.evaluate(
        """(today) => {
          const now = Date.now();
          localStorage.setItem('lab.hist', JSON.stringify({ chestpress: [{ date: today, w: 42.5, r: 10, lv: now }] }));
          localStorage.setItem('lab.prs', JSON.stringify([{ date: today, e: 'chestpress', w: 42.5, r: 10, lv: now }]));
          localStorage.setItem('lab.tlog', JSON.stringify([{ date: today, plan: 'live', sets: { chest: 1, triceps: 0.5, shoulders: 0.5 }, live: true, n: 1, exs: ['chestpress'], name: 'Brust' }]));
        }""",
        today,
    )
    page.reload()
    page.wait_for_selector("#nameOut")
    check("Lena" in page.inner_text("#nameOut"), "v1 zeigt das Profil")
    wait_ready(page)
    page.reload()
    wait_controller(page, "/nachtgarten/sw.js")
    check(page.evaluate("navigator.serviceWorker.controller.scriptURL").endswith("/nachtgarten/sw.js"), "v1-Service-Worker steuert die Seite")
    old_keys = cache_keys(page)
    check(any(k.startswith("ng-") and k != "ng-demos" for k in old_keys), f"v1-Cache vorhanden ({old_keys})")
    old_sw = page.evaluate("fetch('sw.js').then(r => r.text())")
    check('const V="ng-' in old_sw, "alter Stand: v1-Service-Worker im Wurzelordner")

    # Beta (alter Stand) einmal öffnen, damit ihr Cache existiert
    beta = context.new_page()
    watch_errors(beta, errors)
    beta.goto(base + "beta/")
    beta.wait_for_selector(".app-shell, .shell, #root > *")
    wait_ready(beta)
    wait_until(beta, "caches.keys().then(ks => ks.some(k => k.startsWith('ng2-beta-')))", what="Beta-Cache")
    beta.close()
    before = lab_snapshot(page)
    check(any(k.startswith("ng2-beta-") for k in cache_keys(page)), "Beta-Cache vorhanden")

    # Deploy
    point(link, new_dir)
    page.reload()
    page.wait_for_selector("#root .page-head, #root header", timeout=15000)
    wait_controller(page, "/nachtgarten/sw.js")
    wait_until(page, "caches.keys().then(ks => ks.some(k => k.startsWith('ng2-app-')) && !ks.some(k => k.startsWith('ng-')))", timeout=20000, what="v1-Caches gelöscht")
    new_sw = page.evaluate("fetch('sw.js').then(r => r.text())")
    check("const PREFIX = 'ng2-app-'" in new_sw, "neuer Service Worker unter derselben Adresse /nachtgarten/sw.js")
    keys = cache_keys(page)
    check(not any(k.startswith("ng-") for k in keys), f"alte v1-Caches (ng-…, ng-demos) gelöscht ({keys})")
    check(any(k.startswith("ng2-beta-") for k in keys), "Beta-Cache bleibt")
    reg = page.evaluate("navigator.serviceWorker.getRegistration().then(r => ({ scope: r.scope, waiting: !!r.waiting, active: r.active && r.active.scriptURL }))")
    check(reg["scope"].endswith("/nachtgarten/") and not reg["waiting"], f"eine aktive Registrierung, nichts wartet ({reg})")

    # Neue App mit übernommenen Daten
    page.goto(base + "#heute")
    page.wait_for_selector(".onboarding", state="detached", timeout=5000)
    check(page.locator(".onboarding").count() == 0, "kein Onboarding: Profil übernommen")
    check("Lena" in page.inner_text("#root"), "„Heute“ begrüßt mit dem Namen aus v1")
    page.goto(base + "#training")
    page.wait_for_selector(".training-plans")
    check("Push-Tag" in page.inner_text(".training-plans"), "Plan aus v1 in „Deine Pläne“")
    v2 = page.evaluate("({ sessions: JSON.parse(localStorage.getItem('ng2.sessions')), history: JSON.parse(localStorage.getItem('ng2.history')), prs: JSON.parse(localStorage.getItem('ng2.prs')), meta: JSON.parse(localStorage.getItem('ng2.meta')) })")
    check(v2["meta"].get("migratedFromV1"), "Übernahme vermerkt")
    check(len(v2["sessions"]) == 1 and v2["sessions"][0]["date"] == today, "Training aus v1 übernommen")
    sets = v2["history"].get("chestpress") or []
    check(len(sets) == 1 and sets[0]["weight"] == 42.5 and sets[0]["reps"] == 10, f"geloggter Satz übernommen ({sets})")
    check(len(v2["prs"]) == 1, "Bestleistung übernommen")
    check(lab_snapshot(page) == before, "v1-Daten (lab.*) unverändert")
    check(page.locator("[data-classic='training'] a").get_attribute("href").endswith("/nachtgarten/klassisch/#training"), "Hinweis auf Klassisch in Training")

    # Klassisch: dieselben v1-Daten, eigener Service Worker
    page.goto(base + "#feed")
    link_el = page.locator("[data-classic='feed'] a.classic-open")
    link_el.wait_for()
    check(link_el.get_attribute("href").endswith("/nachtgarten/klassisch/#feed"), "Feed: Knopf öffnet Klassisch mit Direktsprung")
    link_el.click()
    page.wait_for_url("**/klassisch/**")
    page.wait_for_selector("#nameOut", state="attached")
    page.wait_for_timeout(600)
    check(page.evaluate("!document.getElementById('v-feed').hidden"), "Klassisch öffnet direkt den Feed")
    check("Lena" in page.inner_text("#nameOut"), "Klassisch zeigt das Profil aus v1")
    wait_controller(page, "/nachtgarten/klassisch/sw.js")
    reg = page.evaluate("navigator.serviceWorker.getRegistration().then(r => r.scope)")
    check(reg.endswith("/nachtgarten/klassisch/"), f"Klassisch: eigener Scope ({reg})")
    page.goto(base + "klassisch/#training")
    page.wait_for_timeout(800)
    check("Push-Tag" in page.inner_text("#v-training"), "Klassisch zeigt den Plan")
    keys = cache_keys(page)
    check(any(k.startswith("ngk-") for k in keys) and any(k.startswith("ng2-app-") for k in keys), f"Caches getrennt ({keys})")
    manifest = page.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
    check(manifest["name"] == "Nachtgarten Klassisch", "Klassisch: eigenes Manifest")
    check(lab_snapshot(page) == before, "v1-Daten nach Klassisch unverändert")

    # Zurück zur App: App-SW steuert weiter, Klassisch hat ihn nicht verdrängt
    page.goto(base + "#heute")
    wait_controller(page, "/nachtgarten/sw.js")
    check("Lena" in page.inner_text("#root"), "App nach Klassisch weiter in Ordnung")

    # Beta
    page.goto(base + "beta/#training")
    page.wait_for_selector(".training-plans")
    check(page.title() == "Nachtgarten Beta", "Beta läuft")
    check("Push-Tag" in page.inner_text(".training-plans"), "Beta zeigt dieselben Daten")
    wait_controller(page, "/nachtgarten/beta/sw.js")
    check(page.locator("#root").count() == 1, "Beta-Service-Worker steuert die Beta")

    # Offline: App kommt aus dem eigenen Cache, nicht aus Klassisch/Beta
    context.set_offline(True)
    page.goto(base)
    page.wait_for_selector("#root header, #root .page-head", timeout=10000)
    check(page.title() == "Nachtgarten", "offline: die App (nicht Klassisch/Beta) startet")
    context.set_offline(False)

    real = [e for e in errors if "Failed to load resource" not in e]
    check(not real, f"keine Fehler {real}")
    context.close()


def run():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        old_dir = tmp / "alt"
        old_dir.mkdir()
        export_rev(OLD_REV, old_dir)
        www = tmp / "www"
        www.mkdir()
        link = www / "nachtgarten"
        with serve(www) as base, sync_playwright() as p:
            browser = p.chromium.launch()
            point(link, MAIN)
            fresh_install(browser, base)
            upgrade(browser, base, link, old_dir, MAIN)
            browser.close()
    print("ok  Veröffentlichung")


if __name__ == "__main__":
    sys.exit(run())
