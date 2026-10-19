"""E2E-Rauchtest für Nachtgarten v2 (Python Playwright, Chromium, 390x844).

Startet einen lokalen Server im Projektordner und prüft in Hell und Dunkel:
Onboarding (inkl. Schwangerschaft), „Heute“, Design-Schalter, Sicherung speichern und laden,
Direktsprung #training, ausgeschaltete Module, Sprachwechsel, keine Seitenfehler, kein seitliches Scrollen.

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
    page.wait_for_timeout(500)
    check(page.locator(".toast:has-text('Willkommen')").count() == 0, "Willkommen-Hinweis erscheint noch")
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
    check(tabs == ["Heute", "Training", "Fokus", "Mama", "Profil"], f"Tabs falsch: {tabs}")
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
    page.locator(".order-item").nth(1).locator("[data-move$=':-1']").click()
    check(page.locator(".order-item .order-title").first.inner_text() != first, "Kachel lässt sich nicht verschieben")
    # Sprache: English, alles neu beschriftet, dann zurück
    page.click(".profile .segment:has-text('English')")
    page.wait_for_selector(".profile .sheet-title:has-text('Your profile')")
    check(page.evaluate("JSON.parse(localStorage.getItem('ng2.settings')).lang") == "en", "Sprache nicht gespeichert")
    check(page.evaluate("document.documentElement.lang") == "en", "html lang nicht gesetzt")
    page.keyboard.press("Escape")
    page.wait_for_selector(".profile.sheet-panel", state="detached")
    tabs = page.locator(".tab .tab-label").all_inner_texts()
    check(tabs[0] == "Today", f"Tabs nicht übersetzt: {tabs}")
    check("Start workout" in page.inner_text(".sport-start"), "Heute nicht übersetzt")
    shot(page, f"{scheme}_heute_en")
    page.click(".avatar")
    page.click(".profile .segment:has-text('Deutsch')")
    page.wait_for_selector(".profile .sheet-title:has-text('Dein Profil')")
    page.keyboard.press("Escape")
    page.wait_for_selector(".profile.sheet-panel", state="detached")
    check(page.locator(".tab .tab-label").first.inner_text() == "Heute", "Zurück auf Deutsch klappt nicht")


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
    page.wait_for_selector(".page-title")
    check("Training" in page.inner_text(".page-title"), "#training zeigt nicht Training")
    check(page.get_attribute(".tab[aria-current=page]", "href") == "#training", "Tab nicht markiert")
    shot(page, f"{scheme}_training")
    no_horizontal_scroll(page, "Training")
    page.goto(base + "#live")
    page.wait_for_selector(".live .back-link")
    check(page.is_hidden(".tabbar"), "Tab-Leiste im Live-Training sichtbar")
    page.goto(base + "#umlenken")
    page.wait_for_selector(".page-title:has-text('Fokus')")
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
    check(tiles == ["garden", "sport", "week", "one-thing", "habit", "dump"], f"Standard-Kacheln falsch: {tiles}")
    check(page.get_attribute(".sport-start", "href") == "#live", "Sport starten führt nicht ins Training")
    tabs = page.locator(".tab .tab-label").all_inner_texts()
    check(tabs == ["Heute", "Training", "Profil"], f"Standard sollte Heute, Training, Profil zeigen: {tabs}")
    check(page.is_visible(".garden-strip .ng-garden"), "Garten fehlt auf Heute")
    check(page.locator(".garden-strip .ng-sprite:visible").count() == 0, "Begleiter sitzt doppelt im Garten")
    shot(page, f"{scheme}_heute_garden")
    page.click(".avatar")
    page.wait_for_selector(".order-eye")
    page.locator(".order-item:has-text('Garten') .order-eye").click()
    page.keyboard.press("Escape")
    page.wait_for_selector(".profile.sheet-panel", state="detached")
    check(page.locator("[data-tile=garden]").count() == 0, "Garten lässt sich nicht ausblenden")
    check(not errors, "\n".join(errors))
    context.close()


def check_plain_onboarding(browser, base, scheme):
    """Onboarding mit „Ohne Begleiter“: Heute ohne Figur, Profil zeigt Schlicht an."""
    context, page, errors = new_page(browser, scheme)
    page.goto(base)
    page.wait_for_selector(".onboarding")
    while "Begleiter" not in page.inner_text(".onboarding-title"):
        page.click(NEXT)
        page.wait_for_timeout(80)
    check(page.locator(".species-card").count() == 8, "Tiere + Ohne Begleiter fehlen")
    check(page.get_attribute(".species-card[data-species=elefant]", "aria-checked") == "true", "Elli nicht vorausgewählt")
    shot(page, f"{scheme}_onboarding_species")
    page.click(".species-card.is-plain")
    check(page.locator(".onboarding .companion-bubble").count() == 0, "Begleiter spricht trotz Schlicht")
    shot(page, f"{scheme}_onboarding_plain")
    page.click(NEXT)
    page.wait_for_selector(".heute-greeting")
    check(page.locator(".companion-bubble").count() == 0, "Begleiter auf Heute trotz Schlicht")
    check(page.evaluate("JSON.parse(localStorage.getItem('ng2.settings')).plain") is True, "Schlicht nicht gespeichert")
    page.click(".avatar")
    page.wait_for_selector(".profile.sheet-panel")
    row = page.locator(".switch-row:has-text('Schlicht')")
    check(row.get_attribute("aria-checked") == "true", "Schlicht im Profil nicht an")
    row.click()
    page.wait_for_selector(".profile .species-card")
    page.keyboard.press("Escape")
    page.wait_for_selector(".companion-bubble")
    no_horizontal_scroll(page, "Heute")
    check(not errors, "\n".join(errors))
    context.close()


PLAN = [{"id": "ok", "name": "Oberkörper", "items": [
    {"exercise": "bench", "sets": 2, "reps": "8–10"}, {"exercise": "latpull", "sets": 2, "reps": "10–12"}, {"exercise": "g_inclinedb", "sets": 2, "reps": "8–12"}]}]


def fits_screen(page, where):
    over = page.evaluate("document.scrollingElement.scrollHeight - window.innerHeight")
    check(over <= 0, f"{where}: Live-Bildschirm scrollt ({over}px)")
    bottom = page.evaluate("document.querySelector('.live-rir').getBoundingClientRect().bottom")
    bar = page.evaluate("document.querySelector('.live-bar').getBoundingClientRect().top")
    check(bottom <= bar + 1, f"{where}: Eingaben verdeckt von der Aktionsleiste ({bottom} > {bar})")
    no_horizontal_scroll(page, where)


def check_live(browser, base, scheme):
    """Live-Training aus einem Plan: 2 Sätze mit Pause, beenden, Zusammenfassung."""
    context, page, errors = new_page(browser, scheme)
    page.goto(base)
    page.wait_for_selector(".onboarding")
    while page.locator(".onboarding").count():
        page.click(NEXT)
        page.wait_for_timeout(80)
    page.evaluate("plans => localStorage.setItem('ng2.plans', JSON.stringify(plans))", PLAN)
    page.goto(base + "#training")
    page.wait_for_selector(".plan-row")
    shot(page, f"{scheme}_training")
    page.click(".plan-row")
    page.wait_for_selector(".live-name")
    check("Bankdrücken" in page.inner_text(".live-name"), "erste Plan-Übung nicht gewählt")
    shot(page, f"{scheme}_live")
    fits_screen(page, "Live 390")
    page.click(".live-done")
    page.wait_for_selector(".rest .rest-time")
    shot(page, f"{scheme}_live_rest")
    fits_screen(page, "Pause 390")
    page.set_viewport_size({"width": 375, "height": 667})
    page.wait_for_timeout(200)
    shot(page, f"{scheme}_live_rest_375")
    fits_screen(page, "Pause 375")
    page.click(".rest-skip")
    page.wait_for_selector(".live-figure:not([hidden]) .live-anim .nga-wrap")
    check(page.locator(".live-dot.is-done").count() == 1, "Satz-Punkt nicht gefüllt")
    page.click(".stepper-button[aria-label*='Wiederholungen erhöhen']")
    page.click(".live-rir-chip >> nth=2")
    page.click(".live-done")
    page.wait_for_selector(".rest")
    check("Latzug" in page.inner_text(".live-name"), "nach dem Soll nicht zur nächsten Übung")
    shot(page, f"{scheme}_live_375")
    fits_screen(page, "Live 375")
    page.set_viewport_size(VIEWPORT)
    live = page.evaluate("JSON.parse(localStorage.getItem('ng2.live'))")
    check(len(live["sets"]) == 2 and live["sets"][1]["rir"] == 2, f"Sätze falsch gespeichert: {live['sets']}")
    page.click(".live-switch")
    page.wait_for_selector(".live-switcher")
    check(page.locator(".switch-row-item").count() == 3, "Übungsliste unvollständig")
    page.click(".switch-row-item >> nth=2")
    page.wait_for_selector(".live-name:has-text('Schrägbank')")
    page.reload()
    page.wait_for_selector(".rest .rest-time")  # Pause überlebt Neuladen
    page.click(".live-finish")
    page.wait_for_selector(".finish.sheet-panel")
    check(page.evaluate("JSON.parse(localStorage.getItem('ng2.live'))") is None, "Training nicht beendet")
    sessions = page.evaluate("JSON.parse(localStorage.getItem('ng2.sessions'))")
    check(len(sessions) == 1 and sessions[0]["setCount"] == 2 and sessions[0]["planId"] == "ok", "Eintrag fehlt")
    shot(page, f"{scheme}_finish")
    page.click(".finish .sheet-footer .button-primary")
    page.wait_for_selector(".share .share-card .share-img")
    check(page.locator(".share-card").count() >= 3, "zu wenige Vorschläge")
    page.wait_for_timeout(400)
    shot(page, f"{scheme}_share")
    page.click(".share .segment:has-text('Detailliert')")
    page.click(".share .segment:has-text('Feed')")
    page.wait_for_selector(".share-card.is-feed .share-img")
    page.wait_for_timeout(400)
    shot(page, f"{scheme}_share_feed")
    with page.expect_download() as info:
        page.click(".share-action[data-action=save]")
    check(info.value.suggested_filename.endswith(".png"), "Bild nicht gesichert")
    page.click(".share-action[data-action=sticker]")
    page.wait_for_selector(".toast.is-visible")
    no_horizontal_scroll(page, "Teilen")
    check(not errors, "\n".join(errors))
    context.close()


def check_gate(browser, base, scheme):
    """„Wirklich jetzt?“: durchatmen, trotzdem öffnen (Zeitkonto), Schonfrist, Anleitung."""
    context, page, errors = new_page(browser, scheme)
    page.add_init_script("window.__opened = []; window.__ngOpenExternal = (app, web) => window.__opened.push(app)")
    page.goto(base)
    page.wait_for_selector(".onboarding")
    while page.locator(".onboarding").count():
        page.click(NEXT)
        page.wait_for_timeout(80)
    page.evaluate("localStorage.setItem('ng2.settings', JSON.stringify({...JSON.parse(localStorage.getItem('ng2.settings')), enabledModules: ['train', 'habits', 'handy']}))")
    page.goto(base + "#umlenken?von=instagram")
    page.wait_for_selector(".gate-title:has-text('Wirklich jetzt?')")
    check(page.locator(".gate-choice").count() == 3, "drei Möglichkeiten fehlen")
    check("Kurz bewegen" in page.inner_text(".gate-choice.is-primary"), "ohne Training: Kurz bewegen fehlt")
    shot(page, f"{scheme}_gate")
    no_horizontal_scroll(page, "Wirklich jetzt?")
    page.click(".gate-choice:has-text('durchatmen')")
    page.wait_for_selector(".breath-phase:has-text('atmen')")
    shot(page, f"{scheme}_gate_breath")
    page.click(".gate-close")
    page.wait_for_selector(".heute-greeting")
    check("1× umgelenkt" in page.inner_text("[data-tile=umlenken]"), "Wochenzahl fehlt auf der Kachel")
    page.goto(base + "#umlenken?von=instagram")
    page.wait_for_selector(".gate-choice.is-quiet")
    page.click(".gate-choice.is-quiet")
    check(page.evaluate("window.__opened.length") == 1, "Instagram nicht geöffnet")
    account = page.evaluate("JSON.parse(localStorage.getItem('ng2.account'))")
    today = list(account["days"].keys())[-1]
    check(account["days"][today]["used"] == 5, f"Zeitkonto nicht belastet: {account}")
    page.goto(base + "#heute")
    page.wait_for_selector(".heute-greeting")
    page.goto(base + "#umlenken?von=instagram")
    page.wait_for_selector(".gate-forward")
    check(page.evaluate("window.__opened.length") == 2, "Schonfrist leitet nicht weiter")
    gate = page.evaluate("JSON.parse(localStorage.getItem('ng2.gate'))")
    check([e["choice"] for e in gate["log"]] == ["breath", "open"], f"Entscheidungen falsch: {gate['log']}")
    # Training läuft: zurück zum Training mit Stand
    page.evaluate("localStorage.setItem('ng2.gate', JSON.stringify({log: [], graceUntil: null}))")
    page.evaluate("localStorage.setItem('ng2.live', JSON.stringify({start: Date.now(), sets: [{exercise: 'bench', weight: 40, reps: 8, rir: null, at: Date.now()}], form: null, queue: null, metrics: null, legHintDismissed: false}))")
    page.goto(base + "#heute")
    page.goto(base + "#umlenken?von=instagram")
    page.wait_for_selector(".gate-choice.is-primary:has-text('Zurück zum Training')")
    check("Satz 2" in page.inner_text(".gate-choice.is-primary"), "Trainingsstand fehlt")
    page.goto(base + "#fokus")
    page.wait_for_selector(".gate-week")
    page.click(".gate-overview-actions .button-primary")
    page.wait_for_selector(".guide .guide-step")
    check(page.locator(".guide-step").count() == 6, "Anleitung unvollständig")
    check("#umlenken?von=instagram" in page.inner_text(".guide-url-text"), "Adresse fehlt")
    shot(page, f"{scheme}_guide")
    page.locator(".guide .sheet-body").evaluate("el => el.scrollTo(0, 700)")
    shot(page, f"{scheme}_guide_url")
    no_horizontal_scroll(page, "Anleitung")
    check(not errors, "\n".join(errors))
    context.close()


def check_wizard(browser, base, scheme):
    """Plan für mich finden: vier Taps, drei Plankarten, übernehmen → Pläne und Wochenplan."""
    context, page, errors = new_page(browser, scheme)
    page.goto(base)
    page.wait_for_selector(".onboarding")
    while page.locator(".onboarding").count():
        page.click(NEXT)
        page.wait_for_timeout(80)
    page.goto(base + "#training")
    page.click(".plan-finder .button-primary")
    page.wait_for_selector(".wizard .wizard-option")
    shot(page, f"{scheme}_wizard_days")
    for value in ["3", "45", "gym", "neu"]:
        page.click(f".wizard-option[data-value='{value}']")
    page.wait_for_selector(".wizard .plan-card")
    check(page.locator(".wizard .plan-card").count() == 3, "nicht drei Vorschläge")
    check(page.locator(".wizard .plan-card").first.locator(".plan-fact").count() == 3, "drei Fakten fehlen")
    shot(page, f"{scheme}_wizard_results")
    page.locator(".wizard .plan-why-summary").first.click()
    page.wait_for_timeout(150)
    shot(page, f"{scheme}_wizard_why")
    no_horizontal_scroll(page, "Planfinder")
    page.locator(".wizard .plan-card .button-primary").first.click()
    page.wait_for_selector(".wizard", state="detached")
    plans = page.evaluate("JSON.parse(localStorage.getItem('ng2.plans'))")
    check(len(plans) == 3 and plans[0]["id"].startswith("gk3-"), f"Plan nicht übernommen: {[p['id'] for p in plans]}")
    sched = page.evaluate("JSON.parse(localStorage.getItem('ng2.schedule'))")
    check(len(sched) == 3, f"Wochenplan falsch: {sched}")
    page.wait_for_selector(".plan-row")
    check(page.locator(".plan-row").count() == 3, "Einheiten nicht in der Liste")
    shot(page, f"{scheme}_training_plan")
    # Bibliothek: Kategorie, Suche, Favorit, „So geht’s“ mit Animation und Anleitung
    page.click(".training-more .list-button >> nth=0")
    page.wait_for_selector(".library .lib-row")
    page.click(".library .chip:has-text('Ziehen')")
    page.fill(".lib-search", "rope")
    page.wait_for_timeout(250)
    check(page.locator(".lib-row").count() >= 1, "Suche nach rope ohne Treffer")
    first = page.locator(".lib-name").first.inner_text()
    page.locator(".lib-star").first.click()
    page.fill(".lib-search", "")
    page.click(".library .chip:has-text('Ziehen')")
    page.click(".library .lib-fav")
    page.wait_for_timeout(250)
    check(first in page.inner_text(".lib-list"), "Favorit fehlt")
    shot(page, f"{scheme}_library")
    page.locator(".lib-open").first.click()
    page.wait_for_selector(".exercise-detail .nga-wrap")
    page.wait_for_selector(".exercise-detail .ex-steps:not([hidden])")
    shot(page, f"{scheme}_exercise_detail")
    no_horizontal_scroll(page, "Übung")
    check(not errors, "\n".join(errors))
    context.close()


SIZES = [{"width": 390, "height": 844}, {"width": 375, "height": 667}]
HISTORY = {"bench": [{"date": "2026-10-12", "weight": 57.5, "reps": 10, "rir": 2, "session": 1},
                     {"date": "2026-10-15", "weight": 60, "reps": 8, "rir": 2, "session": 2},
                     {"date": "2026-10-15", "weight": 60, "reps": 8, "rir": 2, "session": 2},
                     {"date": "2026-10-15", "weight": 60, "reps": 8, "rir": 1, "session": 2}]}


def shot3(page, name, clip=None):
    if SHOTS:
        page.wait_for_timeout(450)
        page.screenshot(path=str(pathlib.Path(SHOTS) / f"s3_{name}.png"), clip=clip)


def overlaps(a, b):
    return not (a["x"] + a["width"] <= b["x"] or b["x"] + b["width"] <= a["x"] or a["y"] + a["height"] <= b["y"] or b["y"] + b["height"] <= a["y"])


def toast_clear(page, where):
    """Der sichtbare Hinweis liegt über keinem Bedienelement."""
    page.wait_for_selector(".toast.is-visible")
    page.wait_for_timeout(300)
    toast = page.locator(".toast.is-visible").bounding_box()
    for sel in [".stepper", ".live-rir-chip", ".live-bar", ".rest-actions .button", ".live-name", ".live-suggest-chip", ".tabbar", ".gate-choice"]:
        for i in range(page.locator(sel).count()):
            box = page.locator(sel).nth(i).bounding_box()
            if box and page.locator(sel).nth(i).is_visible():
                check(not overlaps(toast, box), f"{where}: Hinweis liegt über {sel}")


def fresh(browser, base, scheme, size, modules=None, plain=False, reduced=False):
    context = browser.new_context(viewport=size, device_scale_factor=2, color_scheme=scheme, locale="de-DE",
                                  service_workers="block", reduced_motion="reduce" if reduced else "no-preference")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" else None)
    page.goto(base)
    page.wait_for_selector(".onboarding")
    while page.locator(".onboarding").count():
        page.click(NEXT)
        page.wait_for_timeout(60)
    page.evaluate("""([plans, history, modules, plain]) => {
        localStorage.setItem('ng2.plans', JSON.stringify(plans));
        localStorage.setItem('ng2.history', JSON.stringify(history));
        const s = JSON.parse(localStorage.getItem('ng2.settings'));
        if (modules) s.enabledModules = modules;
        s.plain = plain;
        localStorage.setItem('ng2.settings', JSON.stringify(s));
    }""", [PLAN, HISTORY, modules, plain])
    page.reload()
    page.wait_for_selector(".heute-greeting")
    return context, page, errors


def check_polish(browser, base, scheme):
    """Feinschliff Stufe 3: Live-Bühne, Startgewichte, Hinweise, Tabs, Gate, Übergänge – je Größe."""
    for size in SIZES:
        tag = f"{scheme}_{size['width']}"
        context, page, errors = fresh(browser, base, scheme, size, modules=["train", "habits", "handy", "mama"])
        # Tab-Leiste: fünf gleich breite Tabs, einer aktiv, Pille hinter dem Symbol
        page.goto(base + "#heute")
        page.wait_for_selector(".heute-greeting")
        tabs = page.locator(".tab .tab-label").all_inner_texts()
        check(tabs == ["Heute", "Training", "Fokus", "Mama", "Profil"], f"Tabs falsch: {tabs}")
        widths = {round(page.locator(".tab").nth(i).bounding_box()["width"]) for i in range(len(tabs))}
        check(max(widths) - min(widths) <= 1, f"Tabs ungleich breit: {widths}")
        check(page.locator(".tab[aria-current=page]").count() == 1, "kein aktiver Tab")
        pill = page.evaluate("getComputedStyle(document.querySelector('.tab[aria-current=page] .tab-icon'), '::before').opacity")
        check(pill == "1", "aktive Pille fehlt")
        bar_bg = page.evaluate("getComputedStyle(document.querySelector('.tabbar')).backgroundColor")
        check("rgba" not in bar_bg or bar_bg.endswith(", 1)"), f"Tab-Leiste durchscheinend: {bar_bg}")
        shot3(page, f"{tag}_heute")
        bar = page.locator(".tabbar").bounding_box()
        shot3(page, f"{tag}_tabbar", clip={"x": 0, "y": bar["y"] - 8, "width": size["width"], "height": bar["height"] + 8})
        page.click(".tab:has-text('Profil')")
        page.wait_for_selector(".profile-page .profile-bond-value")
        check("Stufe" in page.inner_text(".profile-bond-value"), "Stufe der Verbindung fehlt im Profil")
        shot3(page, f"{tag}_profil")
        page.click(".tab:has-text('Heute')")
        page.wait_for_selector(".heute-greeting")
        check(page.locator(".companion-who").inner_text() == "Elli", f"Beschriftung nicht nur der Name: {page.locator('.companion-who').inner_text()}")
        if scheme == "dark":
            bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
            check(bg == "rgb(42, 38, 38)", f"Dunkel nicht warmes Grau: {bg}")

        # Gate: Begleiter oben, Möglichkeiten unten, Fußzeile ganz sichtbar
        page.goto(base + "#umlenken?von=probe")
        page.wait_for_selector(".gate-choice")
        hero = page.locator(".gate-hero .companion").bounding_box()
        choices = page.locator(".gate-choices").bounding_box()
        foot = page.locator(".gate-close").bounding_box()
        check(hero["y"] + hero["height"] / 2 < size["height"] * 0.45, f"{tag}: Begleiter nicht im oberen Bereich")
        check(choices["y"] > size["height"] * 0.4, f"{tag}: Möglichkeiten nicht unten")
        check(foot["y"] + foot["height"] <= size["height"], f"{tag}: Fußzeile abgeschnitten")
        check(page.evaluate("document.querySelector('.gate').scrollHeight <= document.querySelector('.gate').clientHeight"), f"{tag}: Gate scrollt")
        shot3(page, f"{tag}_gate")
        page.click(".gate-choice.is-quiet")
        toast_clear(page, f"{tag} Gate")
        page.goto(base + "#training")
        page.wait_for_timeout(250)
        check(page.locator(".toast.is-visible").count() == 0, "Hinweis wandert mit auf den nächsten Bildschirm")

        # Live: Animation, Letztes Mal + Vorschlag, Punkte, Startgewichte
        page.goto(base + "#training")
        page.wait_for_selector(".plan-row")
        page.evaluate("""() => { window.__nav = []; new MutationObserver(() => { const v = document.documentElement.dataset.nav; if (v) window.__nav.push(v); })
            .observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav'] }); }""")
        page.click(".plan-row")
        page.wait_for_selector(".live-anim .nga-wrap canvas")
        check(page.locator(".live-recap-text").inner_text().startswith("Letztes Mal: 3 × 8 · 60 kg"), f"Letztes Mal falsch: {page.locator('.live-recap-text').inner_text()}")
        check(page.locator(".live-suggest-chip").count() == 1, "Vorschlag fehlt")
        check(page.locator(".live-dot").count() == 2, "Satz-Punkte fehlen")
        check(page.locator(".live-coach").inner_text().strip() != "", "Zeile unter der Animation fehlt")
        anim = page.locator(".live-anim .nga-wrap").bounding_box()
        check(anim["width"] >= 120, f"{tag}: Animation zu klein ({anim['width']})")
        check(abs((anim["x"] + anim["width"] / 2) - size["width"] / 2) < 2, f"{tag}: Animation nicht mittig")
        fits_screen(page, f"Live {tag}")
        shot3(page, f"{tag}_live")
        page.click(".live-suggest-chip")
        check(page.locator(".stepper-number").first.inner_text() in ("62,5", "60"), "Vorschlag nicht übernommen")
        page.click(".live-done")
        page.wait_for_selector(".rest .rest-time")
        check(page.locator(".rest-saved .rest-undo").is_visible(), "Rückgängig in der Pause fehlt")
        check(page.locator(".toast.is-visible").count() == 0, "Hinweis liegt über der Pause")
        fits_screen(page, f"Pause {tag}")
        shot3(page, f"{tag}_live_rest")
        page.click(".rest-undo")
        page.wait_for_selector(".live-figure:not([hidden])")
        check(len(page.evaluate("JSON.parse(localStorage.getItem('ng2.live')).sets")) == 0, "Rückgängig in der Pause wirkt nicht")
        # Kabelzug startet mit 15 kg, Kurzhanteln mit 8 kg
        page.click(".live-switch")
        page.click(".switch-row-item >> nth=1")
        page.wait_for_selector(".live-name:has-text('Latzug')")
        check(page.locator(".stepper-number").first.inner_text() == "15", f"Kabelzug startet nicht mit 15 kg: {page.locator('.stepper-number').first.inner_text()}")
        page.click(".live-switch")
        page.click(".switch-row-item >> nth=2")
        page.wait_for_selector(".live-name:has-text('Schrägbank')")
        check(page.locator(".stepper-number").first.inner_text() == "8", "Kurzhanteln starten nicht mit 8 kg")
        # Zurück: pop, vorher push
        page.go_back()
        page.wait_for_selector(".plan-row")
        page.wait_for_timeout(400)
        nav = page.evaluate("window.__nav")
        check(nav[:1] == ["push"] and "pop" in nav, f"Übergänge falsch: {nav}")
        check(page.evaluate("document.documentElement.dataset.nav") is None, "data-nav bleibt hängen")
        check(not errors, "\n".join(errors))
        context.close()

    # Körpergewicht und Schlicht: Feld zeigt „Körpergewicht“, Animation bleibt, keine Begleiter-Sätze
    context, page, errors = fresh(browser, base, scheme, SIZES[1], plain=True, reduced=True)
    page.evaluate("""() => localStorage.setItem('ng2.plans', JSON.stringify([{id: 'kg', name: 'Zuhause', items: [{exercise: 'pushup', sets: 3, reps: '8–12'}]}]))""")
    page.goto(base + "#live?plan=kg")
    page.wait_for_selector(".live-body-text")
    check(page.inner_text(".live-body-text") == "Körpergewicht", "Körpergewicht nicht angezeigt")
    check(page.locator(".live-anim .nga-wrap").count() == 1, "Animation fehlt in Schlicht")
    check(page.locator(".live-coach.is-companion").count() == 0, "Begleiter spricht trotz Schlicht")
    fits_screen(page, f"Live Schlicht {scheme}")
    shot3(page, f"{scheme}_375_live_plain_bodyweight")
    page.click(".live-body-add")
    page.wait_for_selector(".live-field .stepper")
    check("Zusatzgewicht" in page.inner_text(".live-inputs"), "Zusatzgewicht lässt sich nicht öffnen")
    page.goto(base + "#training")
    page.wait_for_selector(".page-title")
    check(page.evaluate("document.documentElement.dataset.nav") is None, "Übergang trotz reduzierter Bewegung")
    check(not errors, "\n".join(errors))
    context.close()


def check_persistence(browser, base, scheme):
    """Daten verschwinden nicht: Plan per Link übernehmen, localStorage leeren, neu laden → Plan aus IndexedDB."""
    context, page, errors = fresh(browser, base, scheme, SIZES[0])
    page.evaluate("localStorage.removeItem('ng2.plans'); localStorage.removeItem('ng2.history')")
    code = page.evaluate("""async () => {
        const m = await import('./src/domain/plan-code.js');
        return m.encodePlan({ name: 'Mein Link-Plan', items: [{ exercise: 'bench', sets: 3, reps: '8–10' }, { exercise: 'latpull', sets: 3, reps: '10–12' }] });
    }""")
    check(code.startswith("z") and len(code) < 200, f"Plan-Link unerwartet: {code}")
    page.goto(base + "#plan=" + code)
    page.reload()
    page.wait_for_selector(".plan-link .plan-link-item")
    check(page.locator(".plan-link-item").count() == 2, "Plan-Link zeigt nicht beide Übungen")
    shot3(page, f"{scheme}_plan_link")
    page.click(".plan-link .sheet-footer .button-primary")
    page.wait_for_selector(".plan-row:has-text('Mein Link-Plan')")
    page.wait_for_timeout(600)  # Kopie in IndexedDB schreiben lassen
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_selector(".plan-row:has-text('Mein Link-Plan')")
    check(page.locator(".onboarding").count() == 0, "Profil nach dem Leeren nicht wiederhergestellt")
    # umgekehrt: IndexedDB weg, localStorage bleibt → Kopie wird neu angelegt
    page.evaluate("new Promise(r => { const q = indexedDB.deleteDatabase('nachtgarten'); q.onsuccess = q.onerror = q.onblocked = () => r(); })")
    page.reload()
    page.wait_for_selector(".plan-row:has-text('Mein Link-Plan')")
    # Profil → Deine Daten: Status, Tagesstand, iPhone-Hinweis
    page.goto(base + "#profil")
    page.wait_for_selector(".profile-page .persist :is(.persist-ok, .field-hint)")
    page.wait_for_selector(".snapshot-restore", timeout=8000)
    check("iPhone" in page.inner_text(".privacy-device"), "iPhone-Hinweis fehlt")
    page.locator(".snapshot-restore").first.scroll_into_view_if_needed()
    shot3(page, f"{scheme}_daten")
    # Erinnerung „Sicherung machen?“: fällig nach einer Woche mit Daten, „Später“ blendet aus
    page.evaluate("""() => { const m = JSON.parse(localStorage.getItem('ng2.meta')); m.createdAt = '2026-01-01T10:00:00.000Z'; localStorage.setItem('ng2.meta', JSON.stringify(m)); }""")
    page.goto(base + "#heute")
    page.reload()
    page.wait_for_selector(".backup-nudge")
    page.locator(".backup-nudge").scroll_into_view_if_needed()
    shot3(page, f"{scheme}_backup_nudge")
    page.click(".backup-nudge-later")
    page.wait_for_selector(".backup-nudge", state="detached")
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
                check_plain_onboarding(browser, base, scheme)
                check_live(browser, base, scheme)
                check_gate(browser, base, scheme)
                check_wizard(browser, base, scheme)
                check_polish(browser, base, scheme)
                check_persistence(browser, base, scheme)
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
