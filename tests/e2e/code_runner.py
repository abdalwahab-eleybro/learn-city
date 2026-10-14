"""Browser test (code_runner). Run: python3 tests/e2e/code_runner.py   (needs playwright; no network or API key)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import prepare, ROOT, SHOTS, CACHE
prepare(); sys.argv = [sys.argv[0], str(ROOT), str(SHOTS), str(CACHE)]
import sys,json,subprocess
from playwright.sync_api import sync_playwright
root=sys.argv[1]; shots=sys.argv[2]; sp=sys.argv[3]
fails=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def pyexec(payload, timeout):
    try:
        r=subprocess.run([sys.executable,'-I',sp+'/hrun.py',sp+'/harness.py'],input=payload,capture_output=True,text=True,timeout=min(timeout/1000,3))
        return r.stdout.strip().splitlines()[-1]
    except subprocess.TimeoutExpired:
        return json.dumps({'error':'Your code ran for more than 3 seconds. It may have an infinite loop.','cases':[],'timeout':True})
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':430,'height':900}); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.expose_function('pyexec',lambda payload,t: pyexec(payload,t))
    pg.add_init_script("localStorage.setItem('cf_gemini_api_key','TESTKEY-1234567890')")
    pg.goto('file://'+root+'/index.html'); pg.wait_for_timeout(500)
    pg.evaluate("CF.PyRun.setEngine((p,t)=>window.pyexec(p,t))")
    def go_boss(unit):
        pg.evaluate("document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-easy').classList.add('active')")
        pg.evaluate("document.querySelectorAll('.chest-overlay').forEach(e=>e.remove())")
        pg.evaluate(f"CF.EasyLab.UNITS.forEach(u=>{{CF.State.profile.easyCoding.lessons[u.id]={{completed:true}}}}); CF.EasyLab.startFight(document.getElementById('easyContent'),'{unit}',{{onExit(){{}}}})")
        # jump to boss round
        pg.evaluate("(()=>{const r=CF.EasyLab._run(); r.i=r.qs.length-1; })()")
        pg.evaluate("CF.EasyLab._q.renderBoss && 0")
    def show_boss():
        pg.evaluate("""(()=>{const r=CF.EasyLab._run();const q=r.qs[r.i];const body=document.getElementById('ecfBody');
          CF.EasyLab._q.renderBoss(body,q,(ok)=>{window.__settled=ok;},r);})()""")
        pg.wait_for_timeout(100)
    pg.evaluate("window.__settled=null")
    go_boss('e-count'); show_boss()
    check(pg.locator('#ecfRun').count()==1,'boss shows Run button (runner mode)')
    q=pg.evaluate("(()=>{const r=CF.EasyLab._run();const q=r.qs[r.i];return {starter:q.starter,model:q.model,t:q.title,kind:q.check&&q.check.kind}})()")
    print('boss:',q['t'],q['kind'])
    # syntax error
    pg.fill('#ecfCode',q['starter']+'return (')
    pg.click('#ecfRun'); pg.wait_for_timeout(1800)
    check('SyntaxError' in pg.inner_text('#ecfReview'),'syntax error shown')
    # wrong code
    pg.fill('#ecfCode',q['starter']+'return [0,0,0]')
    pg.click('#ecfRun'); pg.wait_for_timeout(1800)
    t=pg.inner_text('#ecfReview'); check('tests passed' in t and 'expected' in t,'wrong answer shows failing cases')
    check(pg.evaluate("window.__settled")is None,'wrong run is free (no settle)')
    # infinite loop
    pg.fill('#ecfCode',q['starter']+'while True: pass')
    pg.click('#ecfRun'); pg.wait_for_timeout(4500)
    check('infinite loop' in pg.inner_text('#ecfReview'),'infinite loop reported')
    # correct (model)
    pg.fill('#ecfCode',q['model'])
    pg.click('#ecfRun'); pg.wait_for_timeout(2000)
    check('tests passed' in pg.inner_text('#ecfReview').lower() or 'All' in pg.inner_text('#ecfReview'),'correct code passes')
    check(pg.evaluate("window.__settled")==True,'correct code settles as right')
    pg.screenshot(path=shots+'/boss_pass.png')
    # give up path
    pg.evaluate("window.__settled=null"); show_boss(); pg.click('#ecfGiveUp'); pg.wait_for_timeout(200)
    check(pg.evaluate("window.__settled")==False,'give up settles as wrong')
    # AI sample boss with tests
    pg.evaluate("window.__settled=null")
    pg.evaluate("document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-easy').classList.add('active')")
    pg.evaluate("CF.AILessons.startFight(document.getElementById('easyContent'),'ai-sample',{onExit(){}}); (()=>{const r=CF.EasyLab._run(); r.i=r.qs.length-1;})()")
    show_boss()
    check(pg.evaluate("(()=>{const r=CF.EasyLab._run();return r.qs[r.i].check.kind})()")=='tests','AI boss uses tests')
    pg.fill('#ecfCode','def has_repeats(nums):\n    return len(nums) != len(set(nums))')
    pg.click('#ecfRun'); pg.wait_for_timeout(800)
    check(pg.evaluate("window.__settled")==True,'alternate correct AI boss solution passes')
    # verify() on scripts
    res=pg.evaluate("""async()=>{const s=JSON.parse(JSON.stringify(CF.AILessons.SAMPLE));const ok=await CF.AILessons.verify(s);
      s.practice.boss.tests[0].expect='False'; const bad=await CF.AILessons.verify(s);
      s.practice.fill.code='def f(a):\\n    return (';const bad2=await CF.AILessons.verify(s);
      return {ok,bad,bad2}}""")
    check(res['ok']['errors']==[] and not res['ok']['skipped'],'sample passes verify')
    check(len(res['bad']['errors'])==1,'wrong boss test caught: '+str(res['bad']['errors'])[:90])
    check(any('compile' in e for e in res['bad2']['errors']),'syntax error in lesson code caught')
    # unsupported engine -> legacy self-grade
    pg.evaluate("CF.PyRun.setEngine(async()=>{throw new Error('offline')})")
    pg.evaluate("window.__settled=null"); show_boss(); pg.click('#ecfRun'); pg.wait_for_timeout(500)
    check(pg.locator('#ecfSubmit').count()==1 and 'grade this one yourself' in pg.inner_text('.ecf-boss'),'offline falls back to self-grading')
    print('errors',errs); b.close()
print('FAILS',fails)
sys.exit(1 if fails else 0)
