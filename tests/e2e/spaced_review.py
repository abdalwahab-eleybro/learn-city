"""Browser test (spaced_review). Run: python3 tests/e2e/spaced_review.py   (needs playwright; no network or API key)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import prepare, ROOT, SHOTS, CACHE
prepare(); sys.argv = [sys.argv[0], str(ROOT), str(SHOTS), '']
import sys,json
from playwright.sync_api import sync_playwright
root=sys.argv[1]; shots=sys.argv[2]
fails=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':430,'height':900}); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+root+'/index.html'); pg.wait_for_timeout(500)
    ev=pg.evaluate
    # --- scheduler unit checks
    r=ev("""()=>{const R=CF.Review,t=1e12;R._store(); 
      const card={src:'easy',key:'e:1:mcq:time',ref:{num:1,type:'mcq',kind:'time'},label:'Count'};
      R.record(card,true,t); const a={...R._store()[card.key]};
      R.record(card,true,t+1000); const b={...R._store()[card.key]};
      R.record(card,false,t+2000); const c={...R._store()[card.key]};
      return {a,b,c,I:R.INTERVALS}}""")
    check(r['a']['box']==1 and abs(r['a']['due']-(1e12+r['I'][1]))<1,'first correct -> box 1, due in 1 day')
    check(r['b']['box']==2,'second correct -> box 2')
    check(r['c']['box']==0 and abs(r['c']['due']-(1e12+2000+r['I'][0]))<1 and r['c']['w']==1,'wrong -> box 0, due in 4h, miss counted')
    ev("CF.Review._store()['e:1:mcq:time']=undefined; delete CF.State.profile.review.cards['e:1:mcq:time']")
    # --- cards come from a real fight
    ev("document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-easy').classList.add('active')")
    ev("CF.EasyLab.UNITS.forEach(u=>{CF.State.profile.easyCoding.lessons[u.id]={completed:true}}); CF.EasyLab.startFight(document.getElementById('easyContent'),'e-search',{onExit(){}})")
    pg.wait_for_timeout(200)
    # answer first 2 mcq rounds: one right, one wrong
    ev("document.querySelectorAll('.ecf-opt')[CF.EasyLab._run().qs[0].correct].click()"); pg.wait_for_timeout(100)
    ev("document.getElementById('ecfNext').click()"); pg.wait_for_timeout(100)
    ev("document.querySelectorAll('.ecf-opt')[CF.EasyLab._run().qs[1].correct^1].click()"); pg.wait_for_timeout(100)
    cards=ev("Object.entries(CF.State.profile.review.cards).map(([k,c])=>({k,box:c.box,w:c.w,src:c.src}))")
    check(len(cards)==2,'two answered questions became cards '+str([c['k'] for c in cards]))
    check(sorted(c['box'] for c in cards)==[0,1],'one right (box1) one wrong (box0)')
    # make everything due now
    ev("Object.values(CF.State.profile.review.cards).forEach(c=>c.due=Date.now()-1000)")
    n=ev("CF.Review.counts(c=>c.src==='easy')"); check(n['due']==2 and n['weak']==1,'counts: 2 due, 1 weak '+str(n))
    # --- hub shows review
    ev("CF.Hub.setSubject('easy'); CF.Hub.setTab('practice'); CF.Hub.refresh(); document.getElementById('screen-easy').classList.remove('active');document.getElementById('screen-menu').classList.add('active')"); pg.wait_for_timeout(200)
    t=pg.inner_text('#hubPracticeEasy')
    check('2 questions due' in t and 'Weak-spot' in t,'practice tab shows due + weak-spot')
    ev("CF.Hub.setTab('today'); CF.Hub.refresh()"); pg.wait_for_timeout(100)
    check('Review 2 due' in pg.inner_text('#hubToday'),'today lists the review')
    # --- run the review session
    ev("CF.Hub.setTab('practice'); CF.Hub.refresh()")
    ev("document.querySelector('[data-review=due]').click()"); pg.wait_for_timeout(300)
    run=ev("(()=>{const r=CF.EasyLab._run();return {n:r.qs.length,types:r.qs.map(q=>q.type),title:r.u.title,keys:r.qs.map(q=>q.card.key)}})()")
    check(run['n']==2 and run['title']=='Review','review session has the 2 due cards, titled Review '+str(run['keys']))
    # answer both correctly, then win
    for i in range(2):
        ev("document.querySelectorAll('.ecf-opt')[CF.EasyLab._run().qs[CF.EasyLab._run().i].correct].click()"); pg.wait_for_timeout(100)
        ev("document.getElementById('ecfNext').click()"); pg.wait_for_timeout(150)
    check('defeated' in pg.inner_text('body'),'review session completes with a win')
    n2=ev("CF.Review.counts(c=>c.src==='easy')"); check(n2['due']==0,'nothing due after review '+str(n2))
    check(ev("Object.values(CF.State.profile.review.cards).map(c=>c.box).sort().join()")=='1,2' or ev("Object.values(CF.State.profile.review.cards).map(c=>c.box).sort().join()")=='1,1','boxes advanced')
    # --- weak-spot round (card still has w>0 & box<=1)
    ev("document.querySelectorAll('.chest-overlay').forEach(e=>e.remove())")
    wk=ev("CF.Review.weak(c=>c.src==='easy').length"); print('weak now',wk)
    # --- AI lesson cards and folder scoping
    ev("document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-easy').classList.add('active')")
    ev("CF.AILessons.startFight(document.getElementById('easyContent'),'ai-sample',{onExit(){}})"); pg.wait_for_timeout(200)
    ev("document.querySelectorAll('.ecf-opt')[CF.EasyLab._run().qs[0].correct].click()")
    keys=ev("Object.keys(CF.State.profile.review.cards)")
    check(any(k.startswith('a:ai-sample:mcq:0') for k in keys),'AI fight question became a card: '+str([k for k in keys if k.startswith('a:')]))
    ev("Object.values(CF.State.profile.review.cards).forEach(c=>c.due=Date.now()-1)")
    ai=ev("CF.Review.counts(c=>c.src==='ai')"); easy=ev("CF.Review.counts(c=>c.src==='easy')")
    check(ai['due']==1 and easy['due']>=1,'scopes separate AI and Easy cards')
    folder=ev("(()=>{const f=CF.Hub.createFolder('Tmp','📁');return f.id})()")
    sc=ev(f"(()=>{{const s=CF.Hub.reviewScopeOf('f-{folder}');return CF.Review.counts(s)}})()")
    check(sc['total']==0,'new folder has an empty review scope')
    ev(f"CF.AILessons.move && 0")
    # deleting source drops the card when building a session
    ev("CF.State.profile.review.cards['a:gone:mcq:0']={src:'ai',ref:{lesson:'gone',type:'mcq',idx:0,kind:'time'},label:'x',box:0,seen:1,c:0,w:1,due:0}")
    qs=ev("CF.Review.buildSession('due',c=>c.src==='ai').length"); check(qs==1,'dead card skipped')
    check(ev("!CF.State.profile.review.cards['a:gone:mcq:0']"),'dead card removed')
    print('errors',errs); b.close()
print('FAILS',fails)
sys.exit(1 if fails else 0)
