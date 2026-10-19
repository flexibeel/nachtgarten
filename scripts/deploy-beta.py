#!/usr/bin/env python3
"""Beta veröffentlichen: den committeten Stand von v2 nach <main>/beta/ kopieren und auf main pushen.

  python3 scripts/deploy-beta.py                     # Tests, kopieren, committen, pushen
  python3 scripts/deploy-beta.py --no-push           # nur kopieren und committen
  python3 scripts/deploy-beta.py --message "Beta: …" # eigene Commit-Nachricht

- Kopiert wird nur, was in v2 committet ist (git archive HEAD) – nie halbfertige Dateien.
- Die Beta bekommt ein eigenes Manifest („Nachtgarten Beta“, scope ./) und einen eigenen
  Service Worker (Cache-Präfix ng2-beta-), die Haupt-App im Wurzelordner bleibt unberührt.
- Auf main wird nur beta/ hinzugefügt.
"""

import argparse
import hashlib
import io
import json
import pathlib
import shutil
import subprocess
import sys
import tarfile

V2 = pathlib.Path(__file__).resolve().parents[1]
MAIN = pathlib.Path("/home/claude/nachtgarten")
TARGET = "beta"
GIT_USER = ["-c", "user.name=flexibeel", "-c", "user.email=felixanzeige@outlook.com"]
TRAILER = (
    "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
    "Claude-Session: https://claude.ai/code/session_01LxPxXYZN7qU9ayp5p26n4w"
)

# Was die Beta braucht (Pfad-Präfixe im v2-Repo) und was nicht (v1-Referenz, alte Schriften).
INCLUDE = ("index.html", "src/", "fonts/", "icons/")
EXCLUDE = ("src/app.html", "src/icon.svg", "fonts/bricolage", "fonts/onest", "fonts/jetbrains", "fonts/OFL-Bricolage", "fonts/OFL-Onest", "fonts/OFL-JetBrains")


def run(*cmd, cwd=None, capture=False):
    result = subprocess.run(cmd, cwd=cwd, check=True, text=True, capture_output=capture)
    return result.stdout if capture else None


def wanted(path):
    return path.startswith(INCLUDE) and not path.startswith(EXCLUDE)


def export_head(dest):
    """Committeten Stand (HEAD) von v2 nach dest entpacken, gefiltert."""
    archive = subprocess.run(["git", "archive", "--format=tar", "HEAD"], cwd=V2, check=True, capture_output=True).stdout
    files = []
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for member in tar.getmembers():
            if not member.isfile() or not wanted(member.name):
                continue
            out = dest / member.name
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(tar.extractfile(member).read())
            files.append(member.name)
    return sorted(files)


def beta_manifest():
    manifest = json.loads((V2 / "manifest.webmanifest").read_text())
    manifest.update(name="Nachtgarten Beta", short_name="NG Beta", id="./", start_url="./", scope="./")
    manifest["description"] = "Vorschau auf das neue Nachtgarten. " + manifest["description"]
    return json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"


def beta_sw(files, version):
    source = (V2 / "sw.js").read_text()
    # Was die App zum Starten braucht; keine Startbilder, Lizenztexte oder Werkzeuge.
    precache = ["./"] + [f for f in files if f.endswith((".html", ".js", ".css", ".woff", ".svg", ".webmanifest")) or f.startswith("icons/icon-")]
    replaced = (
        source.replace("const PREFIX = 'ng2-dev-';", "const PREFIX = 'ng2-beta-';")
        .replace("const VERSION = 'local';", f"const VERSION = '{version}';")
        .replace("const PRECACHE = ['./', 'index.html'];", "const PRECACHE = " + json.dumps(precache, ensure_ascii=False) + ";")
    )
    if replaced == source or "ng2-beta-" not in replaced or version not in replaced:
        raise SystemExit("sw.js: Platzhalter nicht gefunden")
    return replaced


def beta_index(dest):
    path = dest / "index.html"
    html = path.read_text()
    html = html.replace("<title>Nachtgarten</title>", "<title>Nachtgarten Beta</title>")
    html = html.replace('content="Nachtgarten">', 'content="NG Beta">')
    path.write_text(html)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--skip-tests", action="store_true")
    parser.add_argument("--message", default="Beta: Stand Etappe 2")
    args = parser.parse_args()

    if not args.skip_tests:
        run("npm", "test", "--silent", cwd=V2)

    head = run("git", "rev-parse", "--short", "HEAD", cwd=V2, capture=True).strip()
    run("git", "pull", "--rebase", "origin", "main", cwd=MAIN)

    dest = MAIN / TARGET
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir()
    files = export_head(dest)
    beta_index(dest)
    (dest / "manifest.webmanifest").write_text(beta_manifest())
    digest = hashlib.sha256("".join(files).encode() + head.encode()).hexdigest()[:8]
    (dest / "sw.js").write_text(beta_sw(files + ["manifest.webmanifest"], f"{head}-{digest}"))
    print(f"{len(files) + 2} Dateien nach {dest} (v2 {head})")

    run("git", "add", "--", TARGET, cwd=MAIN)
    staged = run("git", "diff", "--cached", "--name-only", cwd=MAIN, capture=True).split()
    if any(not f.startswith(TARGET + "/") for f in staged):
        raise SystemExit("Abbruch: außer beta/ ist noch etwas vorgemerkt")
    if not staged:
        print("Keine Änderungen an der Beta.")
        return 0
    run("git", *GIT_USER, "commit", "-m", f"{args.message}\n\nv2-Stand {head}.\n\n{TRAILER}", cwd=MAIN)
    if not args.no_push:
        run("git", "push", "origin", "main", cwd=MAIN)
        print("Gepusht: https://flexibeel.github.io/nachtgarten/beta/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
