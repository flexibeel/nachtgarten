"""Gemeinsame Bausteine für deploy-beta.py und deploy-release.py.

Beide kopieren nur den committeten Stand von v2 (git archive HEAD) nach main, passen Manifest,
Service Worker und index.html an, committen auf main und pushen.

Cache-Präfixe auf dem gemeinsamen Ursprung flexibeel.github.io/nachtgarten/:
  ng2-app-   neue App im Wurzelordner (deploy-release.py)
  ng2-beta-  Beta unter beta/        (deploy-beta.py)
  ngk-       klassische Version unter klassisch/ (build.py auf main)
  ng-        alte v1 im Wurzelordner, wird von der neuen App beim Aktivieren gelöscht
"""

import hashlib
import io
import json
import pathlib
import subprocess
import tarfile

V2 = pathlib.Path(__file__).resolve().parents[1]
MAIN = pathlib.Path("/home/claude/nachtgarten")
GIT_USER = ["-c", "user.name=flexibeel", "-c", "user.email=felixanzeige@outlook.com"]
TRAILER = (
    "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
    "Claude-Session: https://claude.ai/code/session_01LxPxXYZN7qU9ayp5p26n4w"
)

# Was die App braucht (Pfad-Präfixe im v2-Repo) und was nicht (v1-Referenz, alte Schriften).
INCLUDE = ("index.html", "src/", "fonts/", "icons/")
EXCLUDE = (
    "src/app.html", "src/icon.svg",
    "fonts/bricolage", "fonts/onest", "fonts/jetbrains",
    "fonts/OFL-Bricolage", "fonts/OFL-Onest", "fonts/OFL-JetBrains",
)


def run(*cmd, cwd=None, capture=False):
    result = subprocess.run(cmd, cwd=cwd, check=True, text=True, capture_output=capture)
    return result.stdout if capture else None


def wanted(path):
    return path.startswith(INCLUDE) and not path.startswith(EXCLUDE)


def export_head(dest):
    """Committeten Stand (HEAD) von v2 nach dest entpacken, gefiltert. Gibt die Dateien zurück."""
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


def head_rev():
    return run("git", "rev-parse", "--short", "HEAD", cwd=V2, capture=True).strip()


def ensure_clean_v2():
    """Nur Committetes wird veröffentlicht; warnen, wenn im Arbeitsbaum noch etwas offen ist."""
    dirty = run("git", "status", "--porcelain", cwd=V2, capture=True).strip()
    if dirty:
        print("Hinweis: nicht committete Änderungen in v2 werden NICHT veröffentlicht:\n" + dirty)


def version_tag(files, head):
    return f"{head}-{hashlib.sha256(''.join(files).encode() + head.encode()).hexdigest()[:8]}"


def manifest(**overrides):
    data = json.loads((V2 / "manifest.webmanifest").read_text())
    description = overrides.pop("description_prefix", "")
    data.update(overrides)
    if description:
        data["description"] = description + data["description"]
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def service_worker(files, *, prefix, version, legacy=(), skip=()):
    """sw.js aus v2 mit eigenem Cache-Präfix, Version, Vorab-Liste, alten Caches und fremden Unterordnern."""
    source = (V2 / "sw.js").read_text()
    # Was die App zum Starten braucht; keine Startbilder, Lizenztexte oder Werkzeuge.
    precache = ["./"] + [f for f in files if f.endswith((".html", ".js", ".css", ".woff", ".svg", ".webmanifest")) or f.startswith("icons/icon-")]
    replacements = {
        "const PREFIX = 'ng2-dev-';": f"const PREFIX = '{prefix}';",
        "const VERSION = 'local';": f"const VERSION = '{version}';",
        "const PRECACHE = ['./', 'index.html'];": "const PRECACHE = " + json.dumps(precache, ensure_ascii=False) + ";",
        "const LEGACY = [];": "const LEGACY = " + json.dumps(list(legacy)) + ";",
        "const SKIP = [];": "const SKIP = " + json.dumps(list(skip)) + ";",
    }
    out = source
    for old, new in replacements.items():
        if old not in out:
            raise SystemExit(f"sw.js: Platzhalter nicht gefunden: {old}")
        out = out.replace(old, new)
    return out


def edit_index(path, replacements):
    html = path.read_text()
    for old, new in replacements.items():
        if old not in html:
            raise SystemExit(f"index.html: nicht gefunden: {old}")
        html = html.replace(old, new)
    path.write_text(html)


def commit_main(paths, message, head, push, url):
    """Nur die angegebenen Pfade vormerken; abbrechen, wenn sonst noch etwas vorgemerkt ist."""
    run("git", "add", "-A", "--", *paths, cwd=MAIN)
    staged = run("git", "diff", "--cached", "--name-only", cwd=MAIN, capture=True).split()
    allowed = tuple(p.rstrip("/") for p in paths)
    stray = [f for f in staged if not any(f == p or f.startswith(p + "/") for p in allowed)]
    if stray:
        raise SystemExit("Abbruch: außerdem vorgemerkt: " + ", ".join(stray))
    if not staged:
        print("Keine Änderungen.")
        return False
    run("git", *GIT_USER, "commit", "-m", f"{message}\n\nv2-Stand {head}.\n\n{TRAILER}", cwd=MAIN)
    if push:
        run("git", "push", "origin", "main", cwd=MAIN)
        print(f"Gepusht: {url}")
    return True
