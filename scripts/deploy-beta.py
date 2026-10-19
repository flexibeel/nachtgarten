#!/usr/bin/env python3
"""Beta veröffentlichen: den committeten Stand von v2 nach <main>/beta/ kopieren und auf main pushen.

  python3 scripts/deploy-beta.py                     # Tests, kopieren, committen, pushen
  python3 scripts/deploy-beta.py --no-push           # nur kopieren und committen
  python3 scripts/deploy-beta.py --message "Beta: …" # eigene Commit-Nachricht

- Kopiert wird nur, was in v2 committet ist (git archive HEAD) – nie halbfertige Dateien.
- Die Beta bekommt ein eigenes Manifest („Nachtgarten Beta“, scope ./) und einen eigenen
  Service Worker (Cache-Präfix ng2-beta-); App (Wurzel) und Klassisch bleiben unberührt.
- Die klassische Version liegt von hier aus unter ../klassisch/.
- Auf main wird nur beta/ hinzugefügt.
"""

import argparse
import shutil
import sys

from deploylib import MAIN, commit_main, edit_index, ensure_clean_v2, export_head, head_rev, manifest, run, service_worker, version_tag, V2

TARGET = "beta"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--skip-tests", action="store_true")
    parser.add_argument("--message", default="Beta: neuer Stand")
    args = parser.parse_args()

    if not args.skip_tests:
        run("npm", "test", "--silent", cwd=V2)
    ensure_clean_v2()

    head = head_rev()
    run("git", "pull", "--rebase", "origin", "main", cwd=MAIN)

    dest = MAIN / TARGET
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir()
    files = export_head(dest)
    edit_index(dest / "index.html", {
        "<title>Nachtgarten</title>": "<title>Nachtgarten Beta</title>",
        'name="apple-mobile-web-app-title" content="Nachtgarten">': 'name="apple-mobile-web-app-title" content="NG Beta">',
        '<meta name="ng-classic" content="klassisch/">': '<meta name="ng-classic" content="../klassisch/">',
    })
    (dest / "manifest.webmanifest").write_text(
        manifest(name="Nachtgarten Beta", short_name="NG Beta", id="./", start_url="./", scope="./", description_prefix="Vorschau auf das neue Nachtgarten. ")
    )
    (dest / "sw.js").write_text(service_worker(files + ["manifest.webmanifest"], prefix="ng2-beta-", version=version_tag(files, head)))
    print(f"{len(files) + 2} Dateien nach {dest} (v2 {head})")

    commit_main([TARGET], args.message, head, not args.no_push, "https://flexibeel.github.io/nachtgarten/beta/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
