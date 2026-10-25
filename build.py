#!/usr/bin/env python3
"""Bundle CAMPUS.EXE source into a single self-contained HTML file.

Usage:  python3 build.py
Output: dist/campus-exe.html   (artifact body, no <html>/<head> wrapper)
        dist/campus-exe-standalone.html (full document, open directly in any browser)
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
ORDER = ["util", "audio", "data", "variety", "art", "maps", "tasks", "engine", "chase", "minigames", "ui", "story", "acts", "main"]

css = (SRC / "style.css").read_text()
js = "\n".join((SRC / "js" / f"{n}.js").read_text() for n in ORDER)
body = (SRC / "index.html").read_text()
body = body.replace("/*@@CSS@@*/", css).replace("/*@@JS@@*/", js)

out = ROOT / "dist"
out.mkdir(exist_ok=True)
(out / "campus-exe.html").write_text(body)
standalone = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
)
(out / "campus-exe-standalone.html").write_text(standalone)
print("built", len(body) // 1024, "KB")
