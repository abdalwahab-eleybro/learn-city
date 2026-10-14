from playwright.sync_api import sync_playwright
from common import *
SPECS = {
 'linkedlist': ({'type':'linkedlist','title':'Linked list','start':[3,7,9],'ops':[{'op':'prepend','value':1},{'op':'append','value':12},{'op':'insert_after','after':7,'value':8},{'op':'find','value':9},{'op':'delete','value':7},{'op':'reverse'}]}, 4),
 'stack': ({'type':'stackqueue','kind':'stack','title':'Stack','ops':[{'op':'push','value':'a'},{'op':'push','value':'b'},{'op':'push','value':'c'},{'op':'pop'},{'op':'peek'}]}, 4),
 'queue': ({'type':'stackqueue','kind':'queue','title':'Queue','start':['A'],'ops':[{'op':'enqueue','value':'B'},{'op':'enqueue','value':'C'},{'op':'dequeue'}]}, 3),
 'tree': ({'type':'tree','title':'Binary search tree','start':[8,3,10,1,6,14],'ops':[{'op':'insert','value':4},{'op':'find','value':6},{'op':'inorder'}]}, 5),
 'sort': ({'type':'sort','title':'Bubble sort','algo':'bubble','values':[5,2,4,1,3]}, 9),
 'merge': ({'type':'sort','title':'Merge sort','algo':'merge','values':[6,2,7,1,5]}, 8),
 'calltree': ({'type':'calltree','title':'fib(4)','fn':'fib','n':4}, 9),
}
with sync_playwright() as p:
    b, ctx, pg, errs = open_app(p)
    pg.evaluate("document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('screen-easy').classList.add('active')")
    for name, (spec, steps) in SPECS.items():
        pg.evaluate("(s)=>{const c=document.getElementById('easyContent');c.innerHTML='<div id=\"vv\"></div>';window.__h=CF.Visuals.render(document.getElementById('vv'),s)}", spec)
        check(pg.locator('#vv .v2-card:not(.v2-fail)').count()==1, name+': renders')
        d0 = pg.evaluate("window.__h.describe()")
        for k in range(steps): pg.click('#vv .v2-next'); pg.wait_for_timeout(30)
        d1 = pg.evaluate("window.__h.describe()")
        check(d0 != d1 and len(d1) > 40, name+': stepping changes what the AI tutor is told (describe)')
        check(pg.locator('#vv .v2-caption').count()==1 and len(pg.inner_text('#vv .v2-caption'))>10, name+': has a caption')
        pg.screenshot(path=str(SHOTS/('ds_'+name+'.png')))
        # run to the end: the Next button must end up disabled
        for k in range(80):
            if pg.locator('#vv .v2-next:not([disabled])').count()==0: break
            pg.click('#vv .v2-next')
        check(pg.locator('#vv .v2-next[disabled]').count()==1, name+': reaches the last step')
    finish(errs)
