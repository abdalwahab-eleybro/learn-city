"""Browser test (ai_lesson_flow). Run: python3 tests/e2e/ai_lesson_flow.py   (needs playwright; no network or API key)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import prepare, ROOT, SHOTS, CACHE
prepare(); sys.argv = [sys.argv[0], str(ROOT), str(SHOTS), str(CACHE/'sample.json')]
import sys,json,re
from playwright.sync_api import sync_playwright
root=sys.argv[1]; shots=sys.argv[2]
fails=[]

import subprocess
def _pyexec(payload, timeout):
    try:
        r=subprocess.run([sys.executable,'-I',str(CACHE/'hrun.py'),str(CACHE/'harness.py')],input=payload,capture_output=True,text=True,timeout=3)
        return r.stdout.strip().splitlines()[-1]
    except subprocess.TimeoutExpired:
        return json.dumps({'error':'timeout','cases':[],'timeout':True})
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':430,'height':900}); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    calls={'n':0}
    def gem(route):
        calls['n']+=1
        body=json.loads(route.request.post_data)
        assert body['generationConfig'].get('responseMimeType')=='application/json'
        assert 'curriculum writer' in body['systemInstruction']['parts'][0]['text']
        s=json.loads(open(sys.argv[3]).read())
        s['title']='Stacks Quickly'; s['icon']='📚'
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'candidates':[{'content':{'parts':[{'text':json.dumps(s)}]}}]}))
    ctx.route('**/generativelanguage.googleapis.com/**',gem)
    pg.add_init_script("localStorage.setItem('cf_gemini_api_key','TESTKEY-1234567890')")
    pg.expose_function('pyexec',lambda payload,t: _pyexec(payload,t))
    pg.goto('file://'+root+'/index.html'); pg.wait_for_timeout(600)
    pg.evaluate("CF.PyRun.setEngine((p,t)=>window.pyexec(p,t))")
    pg.evaluate("CF.Hub.setSubject('ai'); CF.Hub.setTab('learn'); CF.Hub.refresh && CF.Hub.refresh()")
    pg.wait_for_timeout(300)
    check(pg.locator('#hubCreate').count()==1,'create button shown in AI subject')
    check('Hash Maps' in pg.inner_text('#hubLearnPath'),'sample lesson listed')
    pg.screenshot(path=shots+'/hub.png')
    # play sample lesson
    pg.evaluate("document.querySelector('[data-unit=ai-sample]').click()"); pg.wait_for_timeout(300)
    pg.click('#aiStart')
    for i in range(4):
        pg.click('#aiNext'); pg.wait_for_timeout(100)
    check('visual' in pg.inner_text('.lsn-phases').lower(),'reached visual phase')
    check(pg.locator('.v2-card[data-vtype=hashmap]').count()==1,'hashmap visual rendered in lesson')
    pg.screenshot(path=shots+'/lesson_visual.png')
    for k in range(3): pg.click('.v2-next')
    for t in ['set','venn','tuple']:
        pg.click('#aiNext'); pg.wait_for_timeout(100)
        check(pg.locator(f'.v2-card[data-vtype={t}]').count()==1,t+' visual rendered')
    pg.click('#aiNext'); pg.wait_for_timeout(100)
    for i in range(6):
        pg.click('#aiNext'); pg.wait_for_timeout(80)
    check('Lesson complete' in pg.inner_text('body'),'lesson completes')
    check(pg.evaluate("CF.AILessons.isDone('ai-sample')"),'progress saved')
    pg.evaluate("document.querySelectorAll('.cin-chest, .rw-overlay, [class*=chest]').forEach(e=>e.remove())")
    pg.evaluate("document.getElementById('aiFight').click()"); pg.wait_for_timeout(300)
    # play the fight: answer using the run's question data
    for rnd in range(8):
        q=pg.evaluate("(()=>{const r=CF.EasyLab._run();return r&&r.qs[r.i]?{t:r.qs[r.i].type,c:r.qs[r.i].correct,sol:r.qs[r.i].solution,ans:r.qs[r.i].answers,bank:r.qs[r.i].bank,cards:r.qs[r.i].cards}:null})()")
        if not q: break
        if q['t']=='mcq':
            pg.evaluate(f"document.querySelectorAll('.ecf-opt')[{q['c']}].click()")
        elif q['t']=='order':
            for line in q['sol']:
                idx=pg.evaluate("(l)=>[...document.querySelectorAll('.ecf-pool .ecf-line')].findIndex(b=>b.textContent===l)",line)
                pg.evaluate(f"document.querySelectorAll('.ecf-pool .ecf-line')[{idx}].click()")
            pg.evaluate("document.getElementById('ecfCheck').click()")
        elif q['t']=='fill':
            for a in q['ans']:
                idx=pg.evaluate("(a)=>[...document.querySelectorAll('.ecf-word:not([disabled])')].findIndex(b=>b.textContent===a)",a)
                pg.evaluate(f"document.querySelectorAll('.ecf-word:not([disabled])')[{idx}].click()")
            pg.evaluate("document.getElementById('ecfCheck').click()")
        else:
            pg.evaluate("document.getElementById('ecfCode').value=CF.EasyLab._run().qs[CF.EasyLab._run().i].model; document.getElementById('ecfRun').click()")
            pg.wait_for_timeout(900)
        pg.wait_for_timeout(120)
        pg.evaluate("document.getElementById('ecfNext').click()"); pg.wait_for_timeout(150)
    check('defeated' in pg.inner_text('body'),'fight won -> victory screen')
    check(pg.evaluate("CF.AILessons.fightCleared('ai-sample')"),'fight progress saved')
    pg.screenshot(path=shots+'/victory.png')
    # create via mocked gemini
    pg.evaluate("document.querySelectorAll('[class*=chest], .rw-overlay').forEach(e=>e.remove())")
    pg.evaluate("CF.Hub.setSubject('ai'); document.getElementById('ecfOn').click()"); pg.wait_for_timeout(300)
    pg.evaluate("CF.Hub.setSubject('ai'); CF.Hub.setTab('learn'); CF.Hub.refresh && CF.Hub.refresh()"); pg.wait_for_timeout(200)
    pg.evaluate("document.getElementById('hubCreate').click()"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('.chest-overlay').forEach(e=>e.remove())"); pg.fill('#ailTopic','stacks'); pg.click('#ailGo'); pg.wait_for_timeout(3500)
    check(calls['n']==1,'gemini called once (valid first time)')
    check(pg.evaluate("CF.AILessons.all().length")==7,'generated lesson saved')
    check('Stacks Quickly' in pg.inner_text('body'),'generated lesson opens')
    # paste invalid
    pg.evaluate("CF.Hub.setSubject('ai'); document.getElementById('aiQuit') && document.getElementById('aiQuit').click()"); pg.wait_for_timeout(200)
    pg.evaluate("CF.Hub.setSubject('ai'); CF.Hub.setTab('learn'); CF.Hub.refresh && CF.Hub.refresh(); document.getElementById('hubCreate').click()"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.ail-paste').open=true"); pg.fill('#ailJson','{"schema":"cf-lesson/1","title":"x"}'); pg.click('#ailImport')
    check('bad' in (pg.get_attribute('#ailImpStatus','class') or ''),'invalid paste rejected with message')
    pg.screenshot(path=shots+'/create.png')
    # Easy Coding lesson has Visual phase
    pg.evaluate("CF.Hub.setSubject('easy'); document.getElementById('aiQuit')&&document.getElementById('aiQuit').click()"); pg.wait_for_timeout(200)
    pg.evaluate("CF.EasyLab.UNITS.forEach(u=>{CF.State.profile.easyCoding.lessons[u.id]={completed:true}})")
    pg.evaluate("CF.EasyLab.openLesson(document.getElementById('easyContent'),'e-sets',{onExit(){}}); document.querySelector('.screen')"); 
    pg.evaluate("showScreen && 0") if False else None
    pg.evaluate("document.getElementById('elStart').click()")
    for i in range(10):
        if pg.locator('#elVis').count(): break
        pg.evaluate("document.getElementById('elNext').click()")
    check(pg.locator('#elVis .v2-card[data-vtype=set]').count()==1,'Easy Coding lesson shows Visual phase (set)')
    pg.evaluate("document.getElementById('elNext').click()")
    check(pg.locator('#elVis .v2-card[data-vtype=venn]').count()==1,'second visual (venn)')
    print('page errors:',[e for e in errs])
    b.close()
print('FAILS',fails)
sys.exit(1 if fails else 0)
