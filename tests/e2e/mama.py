"""E2E-Test „Schwangerschaft & Rückbildung“ und Timer-Player (Python Playwright, Chromium, 390x844).

  python3 tests/e2e/mama.py

Abläufe (hell und dunkel):
1. Schwanger aus dem Onboarding: „Heute für dich“, Woche, Kurzversion starten, Timer läuft,
   Warnzeichen, Verlassen und „Weitermachen“, bis zum Ende → Eintrag, Woche 1 von 3, „Noch einmal“.
2. Nach Kaiserschnitt, 8 Wochen: Abfrage vor dem nächsten Schritt (mit Narbe), „Noch nicht“, „Trifft alles zu“,
   „Neu für dich“, Sicherheitsbestätigung vor dem ersten Start, Kaiserschnitt-Hinweis im Player, Beenden.
3. Ab 12 Wochen: Belastungstest-Check vor „Laufvorbereitung“.
4. Termin vorbei: „Ist dein Baby schon da?“ → Einrichtung nach der Geburt.
5. #kurz: „10 Minuten ohne Geräte“ im Player bis zum Ende.
"""

import datetime
import sys

from playwright.sync_api import sync_playwright

from smoke import VIEWPORT, check, fresh, new_page, no_horizontal_scroll, onboarding_pregnancy, serve

TODAY = datetime.date.today()


def iso(days):
    return (TODAY + datetime.timedelta(days=days)).isoformat()


def set_mama(page, base, **mama):
    state = {"mode": "post", "date": "", "cesarean": False, "seenPhase": None, "safetyOk": True, "check6": False, "check12": False, **mama}
    page.evaluate("(m) => localStorage.setItem('ng2.mama', JSON.stringify(m))", state)
    page.goto(base + "#heute")
    page.reload()
    page.goto(base + "#mama")
    page.wait_for_selector(".mama-view .page-title")


def run_to_end(page):
    """„Weiter“ bis zum Ende (Wiederholungs-Schritte zählen wie Zeit-Schritte)."""
    for _ in range(200):
        if "#player" not in page.url and "#kurz" not in page.url:
            return
        page.click(".player-next")
    raise AssertionError("Player endet nicht")


def pregnant(browser, base, scheme):
    context, page, errors = new_page(browser, scheme)
    page.goto(base)
    onboarding_pregnancy(page, scheme)
    page.goto(base + "#mama")
    page.wait_for_selector(".mama-today")
    check(page.inner_text(".mama-view .page-title").startswith("SSW"), "Kopf zeigt die SSW")
    check("Trimester" in page.inner_text(".mama-head"), "Phase steht unter dem Kopf")
    plan = page.inner_text(".mama-plan-name")
    check(plan in page.inner_text(".mama-plans"), "Plan von heute steht auch in der Woche")
    check("0 von 3" in page.inner_text(".mama-week-count"), "Woche beginnt bei 0 von 3")
    check(page.locator(".mama-tip-text").count() == 1, "Wochentipp")
    no_horizontal_scroll(page, "Mama")

    page.click(".mama-start")
    page.wait_for_selector(".mama-length")
    check("ca." in page.inner_text(".mama-length"), "Längenwahl mit Minuten")
    page.click(".mama-length [data-choice='short']")
    page.wait_for_selector(".player")
    check("kurz=1" in page.url, "Kurzversion gewählt")
    check(page.inner_text(".player-title") != "", "Übung steht im Player")
    check(page.locator(".app-tabbar:visible, .tabbar:visible").count() == 0, "Tab-Leiste im Player aus")
    total = int(page.inner_text(".player-count").split("/")[1])
    page.click(".player-main-button")
    t1 = page.inner_text(".player-time")
    page.wait_for_timeout(2300)
    t2 = page.inner_text(".player-time")
    check(t1 != t2, f"Timer läuft ({t1} → {t2})")
    check(page.inner_text(".player-main-button") == "Pause", "Hauptknopf zeigt Pause")
    page.click(".player-warn")
    page.wait_for_selector(".sheet-panel .safety-list li")
    check("Blutung" in page.inner_text(".sheet-panel"), "Warnzeichen im Player")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    page.click(".player-next")
    page.click(".player-next")
    step = page.inner_text(".player-count")
    no_horizontal_scroll(page, "Player")

    # Verlassen ohne Beenden → Weitermachen
    page.goto(base + "#mama")
    page.wait_for_selector(".mama-resume")
    check(f"Schritt {step.split('/')[0].strip()} von {total}" in page.inner_text(".mama-resume"), "„Weitermachen“ mit Schritt")
    page.click(".mama-resume")
    page.wait_for_selector(".player")
    check(page.inner_text(".player-count") == step, "Player setzt am selben Schritt fort")
    check(page.inner_text(".player-main-button") in ("Weiter", "Fertig"), "fortgesetzt, aber angehalten")
    run_to_end(page)
    page.wait_for_selector(".mama-today")
    check("#mama" in page.url, "nach dem Ende zurück zu Mama")
    check(page.locator(".toast:has-text('Geschafft')").count() == 1, "Toast „Geschafft“")
    sessions = page.evaluate("JSON.parse(localStorage.getItem('ng2.sessions'))")
    home = [s for s in sessions if s["kind"] == "homeplan"]
    check(len(home) == 1 and home[0]["name"] == plan and home[0]["date"] == TODAY.isoformat(), "Heimplan im Protokoll")
    check(page.evaluate("localStorage.getItem('ng2.player')") in (None, "null"), "kein pausierter Plan mehr")
    check("1 von 3" in page.inner_text(".mama-week-count"), "Woche: 1 von 3")
    check("Noch einmal" in page.inner_text(".mama-start"), "Heute erledigt: „Noch einmal“")
    check(page.locator(".mama-done").count() == 1, "Heute erledigt: Satz")
    check(page.locator(".mama-plan-check").count() == 1, "Plan der Woche abgehakt")
    check(not errors, "Seitenfehler:\n" + "\n".join(errors))
    context.close()


def postpartum(browser, base, scheme):
    context, page, errors = fresh(browser, base, scheme, VIEWPORT, modules=["mama", "habits"])
    set_mama(page, base, date=iso(-8 * 7), cesarean=True, seenPhase="pp0", safetyOk=False)
    check("8 Wochen nach der Geburt" in page.inner_text(".mama-view .page-title"), "Kopf: Wochen nach der Geburt")
    check("Wochenbett" in page.inner_text(".mama-head"), "ohne Abfrage bleibt die Phase Wochenbett")
    check(page.locator(".mama-check").count() == 1, "Abfrage vor dem nächsten Schritt")
    check("Kaiserschnittnarbe" in page.inner_text(".mama-check"), "Narbe in der Checkliste")
    page.click(".mama-check button:has-text('Noch nicht')")
    check(page.locator(".mama-check").count() == 0, "„Noch nicht“ blendet aus")
    check("Rückbildung" not in page.inner_text(".mama-head"), "Phase bleibt")
    page.reload()
    page.wait_for_selector(".mama-check")
    page.click(".mama-check button:has-text('Trifft alles zu')")
    page.wait_for_selector(".mama-new")
    check("Rückbildung" in page.inner_text(".mama-head"), "Phase Rückbildung freigegeben")
    page.click(".mama-new button")
    page.wait_for_selector(".mama-new", state="detached")
    mama = page.evaluate("JSON.parse(localStorage.getItem('ng2.mama'))")
    check(mama["check6"] and mama["seenPhase"] == "pp1", "Abfrage und neue Phase gespeichert")

    page.click(".mama-plan-row[data-plan='pp1b']")
    page.wait_for_selector(".mama-before")
    check("Hebamme" in page.inner_text(".mama-before"), "Sicherheitshinweise vor dem ersten Start")
    page.click(".mama-before [data-choice='ok']")
    page.wait_for_selector(".mama-length")
    page.click(".mama-length [data-choice='full']")
    page.wait_for_selector(".player")
    check(page.evaluate("JSON.parse(localStorage.getItem('ng2.mama')).safetyOk"), "Sicherheit bestätigt gespeichert")
    seen_scar = False
    for _ in range(60):
        if "Narbenmobilisation" in page.inner_text(".player-title"):
            seen_scar = True
            break
        page.click(".player-next")
    check(seen_scar, "Narbenmobilisation nach Kaiserschnitt im Plan")
    check("Kaiserschnitt" in page.inner_text(".player-avoid") or "Achtung" in page.inner_text(".player-avoid"), "Hinweis im Player")
    page.click(".player-end")
    check(page.inner_text(".player-end") == "Wirklich beenden?", "Beenden fragt nach")
    page.click(".player-end")
    page.wait_for_selector(".mama-today")
    check(page.locator(".mama-resume").count() == 0, "beendet: kein „Weitermachen“")
    check(not [s for s in page.evaluate("JSON.parse(localStorage.getItem('ng2.sessions')) || []") if s["kind"] == "homeplan"], "abgebrochen: kein Eintrag")
    no_horizontal_scroll(page, "Mama nach der Geburt")

    # Ab 12 Wochen: Belastungstest vor der Laufvorbereitung
    set_mama(page, base, date=iso(-14 * 7), check6=True, check12=True, seenPhase="pp2")
    check("Zurück ins Training" in page.inner_text(".mama-head"), "Phase ab 12 Wochen")
    page.click("details.mama-notes summary")
    check("Wann wieder laufen?" in page.inner_text(".mama-notes"), "Laufkriterien in den Hinweisen")
    page.click(".mama-plan-row[data-plan='pp2b']")
    page.wait_for_selector(".sheet-panel:has-text('Vor dem Belastungstest')")
    page.click(".sheet-panel [data-choice='no']")
    page.wait_for_timeout(400)
    check("#mama" in page.url and page.locator(".player").count() == 0, "„Noch nicht“: kein Start")

    # Termin vorbei
    set_mama(page, base, mode="preg", date=iso(-3), seenPhase="t3")
    check(page.locator(".mama-ask-birth").count() == 1, "„Ist dein Baby schon da?“")
    page.click(".mama-ask-birth button:has-text('Ja')")
    page.wait_for_selector(".mama-setup-card")
    check(page.locator(".mama-setup-card .segmented [aria-checked='true'], .mama-setup-card [aria-pressed='true']").first.inner_text().startswith("Ich habe"), "Einrichtung steht auf „entbunden“")
    check(not errors, "Seitenfehler:\n" + "\n".join(errors))
    context.close()


def kurz(browser, base, scheme):
    context, page, errors = fresh(browser, base, scheme, VIEWPORT)
    page.goto(base + "#kurz")
    page.wait_for_selector(".player")
    check(page.locator(".player-warn").count() == 0, "Einsteigerplan ohne Warnzeichen-Knopf")
    run_to_end(page)
    page.wait_for_selector(".heute-greeting")
    sessions = page.evaluate("JSON.parse(localStorage.getItem('ng2.sessions'))")
    check(any(s["kind"] == "homeplan" and s["planId"] == "b1" for s in sessions), "#kurz: Eintrag „10 Minuten ohne Geräte“")
    check(not errors, "Seitenfehler:\n" + "\n".join(errors))
    context.close()


def run():
    failures = 0
    with serve() as base, sync_playwright() as p:
        browser = p.chromium.launch()
        for scheme in ("light", "dark"):
            try:
                pregnant(browser, base, scheme)
                postpartum(browser, base, scheme)
                kurz(browser, base, scheme)
                print(f"ok  mama {scheme}")
            except Exception as error:  # noqa: BLE001 – Testausgabe
                failures += 1
                import traceback; traceback.print_exc()
                print(f"FEHLER mama {scheme}: {error}")
        browser.close()
    return failures


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
