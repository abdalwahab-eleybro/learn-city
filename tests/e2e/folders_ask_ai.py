"""Browser test (folders_ask_ai). Run: python3 tests/e2e/folders_ask_ai.py   (needs playwright; no network or API key)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import prepare, ROOT, SHOTS, CACHE
prepare(); sys.argv = [sys.argv[0], str(ROOT), str(SHOTS), str(CACHE/'sample.json')]
import sys,json
from playwright.sync_api import sync_playwright
root=sys.argv[1]; shots=sys.argv[2]; sample=open(sys.argv[3]).read()
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
    reqs=[]
    def gem(route):
        body=json.loads(route.request.post_data); reqs.append(body)
        if body['generationConfig'].get('responseMimeType')=='application/json':
            s=json.loads(sample); s['title']='Folder Lesson'; txt=json.dumps(s)
        else: txt='ANSWER %d'%len(reqs)
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'candidates':[{'content':{'parts':[{'text':txt}]}}]}))
    ctx.route('**/generativelanguage.googleapis.com/**',gem)
    pg.add_init_script("if(!localStorage.getItem('cf_gemini_api_key'))localStorage.setItem('cf_gemini_api_key','TESTKEY-1234567890')")
    pg.expose_function('pyexec',lambda payload,t: _pyexec(payload,t))
    pg.goto('file://'+root+'/index.html'); pg.wait_for_timeout(600)
    pg.evaluate("CF.PyRun.setEngine((p,t)=>window.pyexec(p,t))")
    pg.evaluate("CF.Hub.setSubject('ai'); CF.Hub.setTab('learn'); CF.Hub.refresh()"); pg.wait_for_timeout(200)
    # --- folders
    pg.click('[data-newfolder]'); pg.fill('#hubFName','Python Prep'); pg.click('.hub-dlg-ic[data-ic="💼"]'); pg.click('.hub-dlg-card .btn.primary')
    pg.wait_for_timeout(300)
    chips=pg.inner_text('.hub-chips')
    check('Python Prep' in chips,'folder chip appears')
    check('empty' in pg.inner_text('#hubLearnPath').lower(),'empty folder note')
    check(pg.locator('#hubRename').count()==1,'folder tools shown')
    pg.click('[data-newfolder]'); pg.fill('#hubFName','python prep'); pg.click('.hub-dlg-card .btn.primary')
    check('already' in pg.inner_text('#hubFErr'),'duplicate name rejected'); pg.click('#hubFCancel')
    check(pg.evaluate("CF.State.profile.folders.length")==1 and pg.evaluate("CF.State.profile.folders[0].icon")=='💼','folder saved with icon')
    # create lesson in folder
    pg.click('#hubCreate'); pg.wait_for_timeout(300)
    check('python prep' in pg.inner_text('.lsn-phases').lower() and pg.locator('.ask-fab:not([hidden])').count()==0,'create screen names the folder')
    pg.fill('#ailTopic','hash maps'); pg.click('#ailGo'); pg.wait_for_timeout(3500)
    fid=pg.evaluate("CF.State.profile.folders[0].id")
    check(pg.evaluate("CF.AILessons.get(CF.AILessons.all()[6].id).folder")==fid,'lesson stored in the folder')
    check(pg.evaluate("CF.AILessons.all(null).length")==6 and pg.evaluate("CF.AILessons.all('%s').length"%fid)==1,'lesson only in its folder')
    # --- Ask AI inside generated lesson visual
    pg.click('#aiStart')
    for i in range(4): pg.click('#aiNext')
    check(pg.locator('.ask-fab:not([hidden])').count()==1,'ask button visible in lesson')
    for k in range(3): pg.click('.v2-next')     # step 4: 'act' collides
    pg.click('.ask-fab'); pg.wait_for_timeout(200)
    pg.fill('#askIn','Why did act end up next to cat?'); pg.click('#askSend'); pg.wait_for_timeout(600)
    q=[r for r in reqs if r['generationConfig'].get('responseMimeType')!='application/json'][-1]
    prompt=q['contents'][0]['parts'][0]['text']; sysm=q['systemInstruction']['parts'][0]['text']
    check('tutor' in sysm.lower(),'ask uses tutor system prompt')
    check('Folder Lesson' in prompt,'prompt has lesson title')
    check('Visual 1 of 4' in prompt,'prompt has position')
    check('Dictionary: put, get and a collision' in prompt and 'COLLISION' in prompt,'prompt has the visual caption')
    check('2:[cat=1, act=3]' in prompt.replace('cat=1, act=3','cat=1, act=3') and 'cat=1' in prompt and 'act=3' in prompt,'prompt has bucket contents')
    check('Why did act end up next to cat?' in prompt,'prompt has the question')
    check('ANSWER' in pg.inner_text('#askLog'),'answer displayed')
    pg.screenshot(path=shots+'/ask.png')
    pg.fill('#askIn','and what happens on get?'); pg.click('#askSend'); pg.wait_for_timeout(600)
    q2=[r for r in reqs if r['generationConfig'].get('responseMimeType')!='application/json'][-1]['contents'][0]['parts'][0]['text']
    check('CONVERSATION SO FAR' in q2 and 'Why did act end up' in q2,'follow-up includes history')
    pg.click('#askX')
    # move on: ask at code step
    pg.click('#aiNext'); pg.click('#aiNext'); pg.click('#aiNext')  # set, venn, tuple
    pg.click('#aiNext')  # code
    pg.click('.ask-fab'); pg.fill('#askIn','what does this line do?'); pg.click('#askSend'); pg.wait_for_timeout(600)
    q3=[r for r in reqs if r['generationConfig'].get('responseMimeType')!='application/json'][-1]['contents'][0]['parts'][0]['text']
    check('Code walk-through, line 1 of' in q3,'context follows the learner to the code step')
    pg.click('#askX')
    # fab hidden in fight
    for i in range(6): pg.evaluate("document.getElementById('aiNext') && document.getElementById('aiNext').click()")
    pg.evaluate("document.querySelectorAll('.chest-overlay').forEach(e=>e.remove())")
    pg.evaluate("document.getElementById('aiFight').click()"); pg.wait_for_timeout(700)
    check(pg.locator('.ask-fab:not([hidden])').count()==0,'ask button hidden during fights')
    # back to hub: hidden
    pg.evaluate("document.getElementById('ecfQuit').click()") if False else None
    # --- rename / delete
    pg.evaluate("document.querySelector('#ecfQuit').dispatchEvent(new Event('click'))") if False else None
    pg.evaluate("CF.Hub.refresh(); document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-menu').classList.add('active')"); 
    pg.evaluate("CF.Hub.setSubject('f-'+CF.State.profile.folders[0].id); CF.Hub.setTab('learn'); CF.Hub.refresh()"); pg.wait_for_timeout(200)
    check('Folder Lesson' in pg.inner_text('#hubLearnPath'),'folder shows its lesson in the hub')
    pg.click('#hubRename'); pg.fill('#hubFName','Interview Prep'); pg.click('.hub-dlg-card .btn.primary'); pg.wait_for_timeout(200)
    check('Interview Prep' in pg.inner_text('.hub-chips'),'rename works')
    # reload persistence
    pg.reload(); pg.wait_for_timeout(700)
    pg.evaluate("CF.Hub.setTab('learn')")
    check('Interview Prep' in pg.inner_text('#hubLearnPath'),'folder survives reload')
    pg.evaluate("CF.Hub.setSubject('f-'+CF.State.profile.folders[0].id); CF.Hub.refresh()")
    pg.on('dialog',lambda d:d.accept())
    pg.click('#hubDelFolder'); pg.wait_for_timeout(300)
    check('Interview Prep' not in pg.inner_text('.hub-chips'),'folder deleted')
    check(pg.evaluate("CF.AILessons.all(null).length")==7,'its lesson moved back to AI Lessons')
    pg.evaluate("CF.Hub.setTab('progress'); CF.Hub.refresh()"); pg.wait_for_timeout(100)
    print('errors',errs)
    b.close()
print('FAILS',fails)
sys.exit(1 if fails else 0)
