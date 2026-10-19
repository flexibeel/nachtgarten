#!/usr/bin/env python3
"""App veröffentlichen: den committeten Stand von v2 in den Wurzelordner von main bauen und pushen.

  python3 scripts/deploy-release.py                         # Unit- und E2E-Tests, bauen, committen, pushen
  python3 scripts/deploy-release.py --no-push               # nur bauen und committen
  python3 scripts/deploy-release.py --no-commit             # nur bauen (zum Testen)
  python3 scripts/deploy-release.py --skip-e2e              # ohne Playwright-Test
  python3 scripts/deploy-release.py --message "Nachtgarten: …"

Was dieses Skript im Wurzelordner von main besitzt (und bei jedem Lauf ersetzt):
  index.html, manifest.webmanifest, sw.js, src/, fonts/, icons/
Alles andere bleibt unberührt: beta/ (Vorschau, deploy-beta.py), klassisch/ (v1, build.py),
v1/ (Quelltext der klassischen Version), README.md, build.py, design/, docs/.

Service Worker im Wurzelordner (/nachtgarten/sw.js – dieselbe Adresse wie früher v1):
- Cache-Präfix ng2-app-; beim Aktivieren werden die alten v1-Caches („ng-…“, auch „ng-demos“) gelöscht,
  Klassisch („ngk-…“) und Beta („ng2-beta-…“) bleiben. Danach clients.claim().
- Anfragen unter klassisch/ und beta/ fasst er nicht an (dort gelten deren eigene Service Worker).
Manifest: id, start_url und scope bleiben „./“ (wie v1), damit installierte Homebildschirm-Apps
weiterlaufen und automatisch die neue Version bekommen.
"""

import argparse
import shutil
import sys

from deploylib import MAIN, commit_main, ensure_clean_v2, export_head, head_rev, manifest, run, service_worker, version_tag, V2

OWNED = ["index.html", "manifest.webmanifest", "sw.js", "src", "fonts", "icons"]
SKIP = ["klassisch/", "beta/"]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--no-commit", action="store_true")
    parser.add_argument("--skip-tests", action="store_true")
    parser.add_argument("--skip-e2e", action="store_true")
    parser.add_argument("--no-pull", action="store_true")
    parser.add_argument("--message", default="Nachtgarten: neuer Stand")
    args = parser.parse_args()

    if not args.skip_tests:
        run("npm", "test", "--silent", cwd=V2)
        if not args.skip_e2e:
            run("python3", "tests/e2e/smoke.py", cwd=V2)
            run("python3", "tests/e2e/mama.py", cwd=V2)
    ensure_clean_v2()

    if (MAIN / "src" / "app.html").exists():
        raise SystemExit("Abbruch: main/src/app.html ist noch da. Der v1-Quelltext gehört nach v1/ (siehe README).")
    if not (MAIN / "klassisch" / "index.html").exists():
        raise SystemExit("Abbruch: main/klassisch/ fehlt. Erst die klassische Version bauen (python3 build.py).")

    head = head_rev()
    if not args.no_pull:
        run("git", "pull", "--rebase", "origin", "main", cwd=MAIN)

    for name in OWNED:
        path = MAIN / name
        if path.is_dir():
            shutil.rmtree(path)
        elif path.exists():
            path.unlink()
    files = export_head(MAIN)
    (MAIN / "manifest.webmanifest").write_text(manifest(id="./", start_url="./", scope="./"))
    (MAIN / "sw.js").write_text(
        service_worker(files + ["manifest.webmanifest"], prefix="ng2-app-", version=version_tag(files, head), legacy=["ng-"], skip=SKIP)
    )
    print(f"{len(files) + 2} Dateien in {MAIN} (v2 {head})")

    if args.no_commit:
        return 0
    commit_main(OWNED, args.message, head, not args.no_push, "https://flexibeel.github.io/nachtgarten/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
