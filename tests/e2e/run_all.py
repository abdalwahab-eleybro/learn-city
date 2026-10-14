"""Runs every browser test and prints a summary.   python3 tests/e2e/run_all.py [--dist]
   --dist builds the bundle first and runs all of them against dist/ (what you would deploy)."""
import sys, os, subprocess, pathlib
here = pathlib.Path(__file__).resolve().parent
env = dict(os.environ)
if '--dist' in sys.argv:
    subprocess.run(['node', str(here.parent.parent / 'tools' / 'build.js')], check=True)
    env['CF_ROOT'] = str(here.parent.parent / 'dist')
bad = []
files = sorted(f for f in here.glob('*.py') if f.name not in ('common.py', 'run_all.py'))
for f in files:
    print('\n== ' + f.name, flush=True)
    r = subprocess.run([sys.executable, str(f)], env=env, capture_output=True, text=True)
    out = [l for l in r.stdout.splitlines() if not l.startswith('PASS')]
    print('\n'.join(out[-12:]) + (('\n' + r.stderr[-600:]) if r.returncode else ''))
    if r.returncode: bad.append(f.name)
print('\n%d/%d browser test files passed' % (len(files) - len(bad), len(files)))
sys.exit(1 if bad else 0)
