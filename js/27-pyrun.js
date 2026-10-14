/* ═══════════════════════════════════════════════════════════ */
/*  27-pyrun.js — run Python in the browser and grade code       */
/*                                                              */
/*  Python runs with Pyodide (Python compiled to WebAssembly)     */
/*  inside a Web Worker, so an infinite loop can be stopped       */
/*  without freezing the app. Pyodide is downloaded the first     */
/*  time it is needed (about 10 MB) and cached by the browser.    */
/*                                                              */
/*  Two kinds of grading, both done by HARNESS (Python):          */
/*    runTests(code, tests)   tests = [{call:'f(1,2)', expect:'3'}] */
/*    runDiff(user, model, exampleSrc)  the learner's function is  */
/*       compared with the model solution on the example input     */
/*       plus generated variations of it                           */
/*  The engine is replaceable (setEngine) so the grading logic can */
/*  be tested with a real CPython.                               */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.PyRun = (() => {
  const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';

  /* ── the Python side: identical under Pyodide and CPython ── */
  const HARNESS = String.raw`
import ast, copy, json, random, traceback

def _norm(v):
    if isinstance(v, bool) or v is None: return v
    if isinstance(v, (tuple, list)): return [_norm(x) for x in v]
    if isinstance(v, (set, frozenset)): return sorted((_norm(x) for x in v), key=repr)
    if isinstance(v, dict): return {str(k): _norm(x) for k, x in v.items()}
    return v

def _same(a, b):
    a, b = _norm(a), _norm(b)
    if isinstance(a, float) or isinstance(b, float):
        try: return abs(float(a) - float(b)) < 1e-9
        except Exception: return False
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_same(x, y) for x, y in zip(a, b))
    return a == b and type(a) == type(b) or (a == b and isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool))

def _show(v):
    try:
        s = repr(v)
    except Exception:
        s = '<unprintable>'
    return s if len(s) <= 160 else s[:157] + '...'

def _err(e):
    if isinstance(e, SyntaxError):
        return 'SyntaxError: %s (line %s)' % (e.msg, e.lineno)
    return '%s: %s' % (type(e).__name__, e)

def _load(code):
    ns = {'__name__': 'learner'}
    exec(compile(code, '<your code>', 'exec'), ns)
    return ns

def _first_def(code):
    tree = ast.parse(code)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            return node.name, [a.arg for a in node.args.args]
    return None, []

def _params_of(code, name):
    for node in ast.parse(code).body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return [a.arg for a in node.args.args]
    return None

def _example_env(src):
    # example inputs are written for humans: "n = 3, m = 3", "num = 29  (binary 11101)"
    import re
    tries = [src]
    t = '\n'.join(re.sub(r'\s+\([^()]*\)\s*$', '', l) for l in src.split('\n'))
    tries.append(t)
    tries.append(re.sub(r',\s*(?=[A-Za-z_]\w*\s*=[^=])', '\n', t))
    for cand in tries:
        env = {}
        try:
            exec(cand, {}, env)
            return env
        except BaseException:
            continue
    return None

def run_tests(code, tests):
    try:
        ns = _load(code)
    except BaseException as e:
        return {'error': _err(e), 'cases': []}
    cases = []
    for t in tests:
        c = {'call': t['call'], 'expected': t['expect']}
        try:
            expected = eval(t['expect'], {})
            got = eval(t['call'], ns)
            c['got'] = _show(got)
            c['ok'] = bool(_same(got, expected))
        except BaseException as e:
            c['got'] = _err(e); c['ok'] = False; c['raised'] = True
        cases.append(c)
    return {'error': None, 'cases': cases}

# ---- generated variations of the example input ----
def _vary_list(orig, rnd, n_target=None):
    flat = all(isinstance(x, (int, float, str)) and not isinstance(x, bool) for x in orig)
    if flat and orig:
        srt = all(orig[i] <= orig[i + 1] for i in range(len(orig) - 1))
        distinct = len(set(orig)) == len(orig)
        if distinct and not srt:
            new = orig[:]; rnd.shuffle(new); return new
        n = len(orig)
        if not distinct or srt:
            n = max(1, n + rnd.choice([-2, -1, 0, 0, 1, 2]))
        pool = list(orig)
        if all(isinstance(x, int) for x in orig):
            lo, hi = min(orig), max(orig)
            pool += list(range(lo - 1, hi + 2))
        new = [rnd.choice(pool) for _ in range(n)]
        if srt: new.sort()
        if distinct and srt: new = sorted(set(new)) or [pool[0]]
        return new
    if orig and all(isinstance(r, list) for r in orig):
        pool = [x for r in orig for x in r]
        return [[rnd.choice(pool) for _ in r] for r in orig]
    return copy.deepcopy(orig)

def _vary_str(orig, rnd):
    if not orig: return orig
    chars = list(set(orig)) + list('aeiou')
    n = max(1, len(orig) + rnd.choice([-2, -1, 0, 0, 1, 2]))
    if orig == orig[::-1] and rnd.random() < .5:
        half = [rnd.choice(chars) for _ in range(n // 2)]
        mid = [rnd.choice(chars)] if n % 2 else []
        return ''.join(half + mid + half[::-1])
    return ''.join(rnd.choice(chars) for _ in range(n))

def _variations(env, params, count, seed):
    rnd = random.Random(seed)
    base = {p: env[p] for p in params if p in env}
    len_of = {}
    for p, v in base.items():
        if isinstance(v, int) and not isinstance(v, bool):
            for q, w in base.items():
                if q != p and isinstance(w, (list, str)) and len(w) == v:
                    len_of[p] = q
    out = []
    for _ in range(count):
        case = {}
        for p, v in base.items():
            if isinstance(v, list): case[p] = _vary_list(v, rnd)
            elif isinstance(v, str): case[p] = _vary_str(v, rnd)
        for p, v in base.items():
            if p in case: continue
            if isinstance(v, int) and not isinstance(v, bool):
                if p in len_of: case[p] = len(case[len_of[p]])
                else:
                    opts = [v, v + 1, max(0, v - 1), rnd.randint(0, 2 * abs(v) + 3)]
                    lists = [x for x in case.values() if isinstance(x, list) and x and all(isinstance(e, int) for e in x)]
                    if lists and rnd.random() < .6: opts.append(rnd.choice(rnd.choice(lists)))
                    case[p] = rnd.choice(opts)
            else:
                case[p] = copy.deepcopy(v)
        out.append(case)
    return out

def run_diff(user_code, model_code, example_src, extra=8, seed=7):
    try:
        user_ns = _load(user_code)
    except BaseException as e:
        return {'error': _err(e), 'cases': []}
    uname, uparams = _first_def(user_code)
    if uname is None:
        return {'error': 'Write a function with def (keep the first line given to you).', 'cases': []}
    model_ns = _load(model_code)
    mname = uname
    params = _params_of(model_code, mname)
    if params is None or mname not in model_ns:
        return {'error': 'Keep the function name given to you: the first line of your code must stay as it was.', 'cases': []}
    if uparams != params:
        return {'error': 'Keep the function signature: def %s(%s)' % (mname, ', '.join(params)), 'cases': []}
    env = _example_env(example_src)
    if env is None:
        return {'error': None, 'cases': [], 'skipped': 'no runnable example'}
    cases = [('example', {p: env[p] for p in params if p in env})] if all(p in env for p in params) else []
    if cases:
        for v in _variations(env, params, extra, seed):
            if all(p in v for p in params): cases.append(('extra', v))
    res = []
    seen = set()
    for kind, args in cases:
        key = repr(sorted(args.items(), key=lambda kv: kv[0]))
        if key in seen: continue
        seen.add(key)
        try:
            expected = model_ns[mname](**copy.deepcopy(args))
        except BaseException:
            continue                       # the reference could not handle this input: skip it
        c = {'kind': kind, 'args': ', '.join('%s=%s' % (k, _show(v)) for k, v in args.items()), 'expected': _show(expected)}
        try:
            got = user_ns[uname](**copy.deepcopy(args))
            c['got'] = _show(got); c['ok'] = bool(_same(got, expected))
        except BaseException as e:
            c['got'] = _err(e); c['ok'] = False; c['raised'] = True
        res.append(c)
        if len(res) >= 9: break
    return {'error': None, 'cases': res}

# ---- run a program and capture what it prints ----
import io, contextlib, sys

def run_code(code):
    ns = {'__name__': '__main__'}
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(code, '<code>', 'exec'), ns)
    except BaseException as e:
        return {'error': _err(e), 'out': buf.getvalue()}
    return {'error': None, 'out': buf.getvalue()}

# ---- trace a short program line by line (debugger style: values BEFORE the highlighted line runs) ----
class _Stop(BaseException):
    pass

_SIMPLE = (int, float, str, bool, type(None))

def _cell(v, n=10):
    s = v if isinstance(v, str) else repr(v)
    if isinstance(v, str) and len(v) <= n - 2: s = repr(v)
    return s if len(s) <= n else s[:n - 1] + '…'

def _snap(d):
    vars_, lst = {}, None
    for k, v in list(d.items()):
        if k.startswith('_') or callable(v) or isinstance(v, type) or type(v).__name__ == 'module': continue
        if isinstance(v, (list, tuple)) and len(v) <= 10 and all(isinstance(x, _SIMPLE) for x in v) and lst is None:
            lst = {'name': k, 'items': [x if isinstance(x, (int, float)) and not isinstance(x, bool) else _cell(x) for x in v]}
            continue
        if len(vars_) >= 6: continue
        if isinstance(v, bool) or isinstance(v, (int, float)) or v is None: vars_[k] = v if not isinstance(v, float) else round(v, 6)
        else:
            r = repr(v); vars_[k] = r if len(r) <= 24 else r[:21] + '...'
        if vars_[k] is None: vars_[k] = 'None'
    if lst is not None:
        for nm in ('mid', 'i', 'idx', 'j', 'k', 'left', 'right', 'lo', 'hi', 'low', 'high', 'l', 'r', 'pos'):
            v = vars_.get(nm)
            if isinstance(v, int) and not isinstance(v, bool) and 0 <= v < len(lst['items']):
                lst['at'] = v; break
    return vars_, lst

def trace_lines(lines, max_steps=30):
    code = '\n'.join(lines)
    comp = compile(code, '<lesson>', 'exec')
    steps, buf, ns = [], io.StringIO(), {'__name__': '__lesson__'}
    state = {'trunc': False}

    def stack_of(frame):
        out = []
        f = frame
        while f is not None and f.f_code.co_filename == '<lesson>':
            if f.f_code.co_name != '<module>':
                argn = f.f_code.co_varnames[:f.f_code.co_argcount]
                lab = '%s(%s)' % (f.f_code.co_name, ', '.join(_cell(f.f_locals.get(a), 8) for a in argn))
                out.append(lab[:30])
            f = f.f_back
        return out[::-1][:8]

    def add(kind, frame, ret=None):
        if len(steps) >= max_steps:
            state['trunc'] = True
            raise _Stop()
        v, l = _snap(frame.f_locals if frame.f_code.co_name != '<module>' else frame.f_globals)
        st = {'kind': kind, 'line': frame.f_lineno - 1, 'vars': v, 'stack': stack_of(frame)}
        if l: st['list'] = l
        if kind == 'return': st['ret'] = _cell(ret, 20)
        o = buf.getvalue().rstrip('\n')
        if o: st['out'] = o[-70:]
        steps.append(st)

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != '<lesson>': return None
        if event == 'line': add('line', frame)
        elif event == 'return' and frame.f_code.co_name != '<module>': add('return', frame, arg)
        return tracer

    old = sys.gettrace()
    err = None
    try:
        sys.settrace(tracer)
        with contextlib.redirect_stdout(buf):
            exec(comp, ns)
    except _Stop:
        pass
    except BaseException as e:
        err = _err(e)
    finally:
        sys.settrace(old)
    if err is None and not state['trunc'] and steps:
        v, l = _snap(ns)
        last = {'kind': 'end', 'line': steps[-1]['line'], 'vars': v, 'stack': []}
        if l: last['list'] = l
        o = buf.getvalue().rstrip('\n')
        if o: last['out'] = o[-70:]
        steps.append(last)
    return {'error': err, 'steps': steps, 'truncated': state['trunc'], 'out': buf.getvalue()}

def dispatch(payload):
    p = json.loads(payload)
    try:
        if p['op'] == 'tests': out = run_tests(p['code'], p['tests'])
        elif p['op'] == 'diff': out = run_diff(p['code'], p['model'], p['example'], p.get('extra', 8), p.get('seed', 7))
        elif p['op'] == 'run': out = run_code(p['code'])
        elif p['op'] == 'trace': out = trace_lines(p['lines'], p.get('max', 30))
        elif p['op'] == 'compile':
            out = {'error': None}
            try: compile(p['code'], '<code>', 'exec')
            except SyntaxError as e: out['error'] = _err(e)
        else: out = {'error': 'unknown op'}
    except BaseException as e:
        out = {'error': _err(e), 'cases': []}
    return json.dumps(out)
`;

  /* ── the browser engine: Pyodide in a worker ── */
  const WORKER_SRC = `
    let py = null, ready = null;
    async function boot(url) {
      importScripts(url);
      py = await loadPyodide();
      py.runPython(${JSON.stringify(HARNESS)});
    }
    onmessage = async (e) => {
      const m = e.data;
      try {
        if (m.type === 'boot') { ready = boot(m.url); await ready; postMessage({ id: m.id, ok: true }); return; }
        await ready;
        const out = py.globals.get('dispatch')(m.payload);
        postMessage({ id: m.id, ok: true, result: out });
      } catch (err) { postMessage({ id: m.id, ok: false, error: String(err && err.message || err) }); }
    };`;

  let worker = null, bootP = null, seq = 0;
  const pending = new Map();
  let customEngine = null;

  function killWorker(reason) {
    try { worker && worker.terminate(); } catch (e) {}
    worker = null; bootP = null;
    pending.forEach(p => p.reject(new Error(reason)));
    pending.clear();
  }
  function post(msg) {
    return new Promise((resolve, reject) => {
      const id = ++seq; pending.set(id, { resolve, reject });
      worker.postMessage(Object.assign({ id }, msg));
    });
  }
  function ensure() {
    if (customEngine) return Promise.resolve(true);
    if (bootP) return bootP;
    try {
      const blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
    } catch (e) { return Promise.reject(new Error('This browser cannot run the Python runner.')); }
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id); if (!p) return;
      pending.delete(e.data.id);
      e.data.ok ? p.resolve(e.data.result) : p.reject(new Error(e.data.error));
    };
    worker.onerror = () => killWorker('The Python runner crashed.');
    const boot = post({ type: 'boot', url: PYODIDE_URL });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Python took too long to load. Check your connection.')), 60000));
    bootP = Promise.race([boot, timeout]).then(() => true).catch(err => { killWorker(err.message); throw err; });
    return bootP;
  }

  /* run one payload with a time limit; a stuck run is killed and the runner restarts next time */
  async function exec(payload, timeoutMs) {
    timeoutMs = timeoutMs || 5000;
    if (customEngine) {
      const r = await customEngine(JSON.stringify(payload), timeoutMs);
      return typeof r === 'string' ? JSON.parse(r) : r;
    }
    await ensure();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { killWorker('timeout'); resolve({ error: 'Your code ran for more than ' + Math.round(timeoutMs / 1000) + ' seconds. It may have an infinite loop.', cases: [], timeout: true }); }, timeoutMs);
      post({ type: 'run', payload: JSON.stringify(payload) }).then(r => { clearTimeout(t); resolve(JSON.parse(r)); }, e => { clearTimeout(t); if (e.message !== 'The Python runner crashed.') reject(e); else resolve({ error: 'The Python runner crashed.', cases: [] }); });
    });
  }

  const summarize = (r) => ({ error: r.error || null, cases: r.cases || [], skipped: r.skipped || null, timeout: !!r.timeout, passed: !r.error && (r.cases || []).length > 0 && r.cases.every(c => c.ok) });

  return {
    HARNESS,
    /* true if running Python is possible (a test engine, or a browser with workers) */
    supported: () => !!customEngine || typeof Worker !== 'undefined',
    ensure,                                      // call early to warm up (downloads Pyodide once)
    setEngine(fn) { customEngine = fn; },        // fn(payloadJson, timeoutMs) -> result (object or JSON string)
    runTests: async (code, tests, o) => summarize(await exec({ op: 'tests', code, tests }, o && o.timeoutMs)),
    runDiff: async (code, model, example, o) => summarize(await exec({ op: 'diff', code, model, example, extra: (o && o.extra) || 8, seed: (o && o.seed) || 7 }, o && o.timeoutMs)),
    compile: async (code) => (await exec({ op: 'compile', code }, 5000)).error || null,
    run: async (code, o) => { const r = await exec({ op: 'run', code }, (o && o.timeoutMs) || 5000); return { error: r.error || null, out: r.out || '' }; },
    trace: async (lines, o) => { const r = await exec({ op: 'trace', lines, max: (o && o.max) || 30 }, (o && o.timeoutMs) || 5000); return { error: r.error || null, steps: r.steps || [], truncated: !!r.truncated, out: r.out || '' }; }
  };
})();
