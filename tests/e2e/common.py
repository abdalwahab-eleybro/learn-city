"""Shared helpers for the browser tests (Python Playwright).
   pip install playwright && playwright install chromium     then:   python3 tests/e2e/<file>.py
   Gemini is mocked and Pyodide is replaced by the real python3 running the same harness,
   so the tests need no network and no API key."""
import os, sys, json, subprocess, tempfile, pathlib
HERE = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path(os.environ['CF_ROOT']).resolve() if os.environ.get('CF_ROOT') else HERE.parent.parent   # CF_ROOT=dist tests the bundle
CACHE = HERE.parent / '.cache'
SHOTS = pathlib.Path(os.environ.get('CF_SHOTS', tempfile.gettempdir())) / 'cf-shots'
SHOTS.mkdir(parents=True, exist_ok=True)
fails = []

def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        fails.append(msg)

def prepare():
    """write tests/.cache/harness.py from the app's own PyRun.HARNESS (needs node)"""
    CACHE.mkdir(exist_ok=True)
    import shutil; shutil.copy(HERE.parent / 'tools' / 'hrun.py', CACHE / 'hrun.py')
    subprocess.run(['node', '-e', """
      const T=require(%r);const fs=require('fs');
      const c=T.load(['27-pyrun'],{state:false});fs.writeFileSync(%r,c.CF.PyRun.HARNESS);
      const a=T.load(%s);fs.writeFileSync(%r,JSON.stringify(a.CF.AILessons.SAMPLE));""" % (str(HERE.parent / 'lib.js'), str(CACHE / 'harness.py'), json.dumps(['18-easy-coding','20-easy-data','20b-easy-predict','23-visuals','23b-visuals-ds','23c-visuals-general','27-pyrun','21-easy-lab','24-ai-lessons']), str(CACHE / 'sample.json'))], check=True)

def pyexec(payload, timeout=3000):
    try:
        r = subprocess.run([sys.executable, '-I', str(CACHE / 'hrun.py'), str(CACHE / 'harness.py')],
                           input=payload, capture_output=True, text=True, timeout=min(timeout / 1000, 4))
        return r.stdout.strip().splitlines()[-1]
    except subprocess.TimeoutExpired:
        return json.dumps({'error': 'Your code ran for more than 3 seconds. It may have an infinite loop.', 'cases': [], 'timeout': True})

def open_app(p, gemini=None, key=True, viewport=(430, 900)):
    """-> (browser, context, page, page_errors). `gemini(route)` mocks the Gemini endpoint."""
    prepare()
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': viewport[0], 'height': viewport[1]}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    if gemini: ctx.route('**/generativelanguage.googleapis.com/**', gemini)
    if key: pg.add_init_script("localStorage.setItem('cf_gemini_api_key','TESTKEY-1234567890')")
    pg.expose_function('pyexec', lambda payload, t: pyexec(payload, t))
    pg.goto('file://' + str(ROOT / 'index.html')); pg.wait_for_timeout(600)
    pg.evaluate("CF.PyRun.setEngine((p,t)=>window.pyexec(p,t))")
    return b, ctx, pg, errs

def finish(errs=None):
    if errs is not None:
        check(errs == [], 'no page errors ' + str(errs))
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
