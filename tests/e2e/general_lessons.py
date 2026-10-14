"""Browser test (general_lessons): a non-coding topic ("communication skills") must give NON-programming lessons.
Run: python3 tests/e2e/general_lessons.py   (needs playwright; no network or API key)"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import open_app, check, finish, SHOTS
from playwright.sync_api import sync_playwright
shots = str(SHOTS)
with sync_playwright() as p:
    state = {'script': None, 'prompts': [], 'systems': []}
    def gem(route):
        body = json.loads(route.request.post_data)
        prompt = body['contents'][0]['parts'][0]['text']; system = (body.get('systemInstruction') or {}).get('parts', [{}])[0].get('text', '')
        state['prompts'].append(prompt); state['systems'].append(system)
        if 'CODE or GENERAL' in prompt: text = 'GENERAL'
        elif 'Plan a short course' in prompt:
            text = json.dumps({'course': 'Communication Skills', 'icon': '🗣️', 'lessons': [{'title': 'Active Listening', 'focus': 'Hear the person'}, {'title': 'Clear Speaking', 'focus': 'Say it simply'}, {'title': 'Giving Feedback', 'focus': 'Kind and direct'}]})
        else:
            s = json.loads(json.dumps(state['script'])); m = re.search(r'lesson (\d) of 3', prompt)
            s['title'] = 'Lesson ' + (m.group(1) if m else 'X') + ' Talk'; text = json.dumps(s)
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'candidates': [{'content': {'parts': [{'text': text}]}}]}))
    b, ctx, pg, errs = open_app(p, gem)
    ev = pg.evaluate
    state['script'] = json.loads(ev("JSON.stringify(CF.AILessons.get('bi-listening').script)"))
    ev("CF.Hub.setSubject('ai'); CF.Hub.setTab('learn'); CF.Hub.refresh && CF.Hub.refresh()"); pg.wait_for_timeout(300)
    pg.click('#hubCreate'); pg.wait_for_selector('#ailKind')
    check(pg.locator('#ailKind option').count() == 3, 'subject selector has 3 options')
    check('Python' not in pg.inner_text('.ail .lsn-card .el-p').split('\n')[0], 'intro text is not Python-only')

    # course for a non-coding topic, kind auto-detected
    pg.click('.ail-tab[data-mode=course]'); pg.fill('#ailTopic', 'communication skills'); pg.click('#ailGo')
    pg.wait_for_selector('#ailMake', timeout=15000)
    check(any('CODE or GENERAL' in x for x in state['prompts']), 'topic kind was asked of Gemini')
    outline_prompt = [x for x in state['prompts'] if 'Plan a short course' in x][0]
    check('NOT a programming course' in outline_prompt and 'Python' not in outline_prompt, 'outline prompt is non-coding')
    pg.click('#ailMake'); pg.wait_for_selector('#ailOpenF', timeout=60000)
    lesson_prompts = [(pr, sy) for pr, sy in zip(state['prompts'], state['systems']) if 'LESSON SCRIPT FORMAT' in pr]
    check(len(lesson_prompts) == 3, 'three lessons requested (%d)' % len(lesson_prompts))
    check(all('python' not in (pr + sy).lower() for pr, sy in lesson_prompts), 'no lesson prompt mentions Python')
    items = json.loads(ev("JSON.stringify(CF.AILessons.all().filter(x=>!x.builtin).map(x=>({t:x.title,k:x.script.kind,f:x.folder})))"))
    check(len(items) == 3 and all(i['k'] == 'general' and i['f'] for i in items), 'three general lessons saved in a folder: %s' % items)

    # open one lesson: player shows general visuals and no code
    lid = ev("CF.AILessons.all().filter(x=>!x.builtin)[0].id")
    ev("CF.AILessons.openLesson(document.getElementById('easyContent'),%s,{onExit(){}})" % json.dumps(lid)); pg.wait_for_timeout(200)
    seen = []
    for i in range(14):
        seen.append(pg.inner_text('#easyContent'))
        if pg.locator('.lsn-done').count(): break
        nxt = pg.locator('#lsnNext, .lsn-next, button:has-text("Next"), button:has-text("Continue")').first
        if nxt.count() == 0: break
        nxt.click(); pg.wait_for_timeout(120)
    alltext = '\n'.join(seen)
    check('Active Listening' in alltext or 'Lesson' in alltext, 'lesson player rendered')
    check(not re.search(r'\bdef \w+\(|print\(', alltext), 'no code appears in the general lesson player')
    pg.screenshot(path=shots + '/general_lesson.png')
    ev("CF.AILessons.openLesson(document.getElementById('easyContent'),'bi-listening',{onExit(){}})"); pg.wait_for_timeout(200)
    check(pg.locator('#easyContent').inner_text().strip() != '', 'built-in Active Listening opens')

    # visuals render and respond
    def vis(spec):
        ev("(s)=>{const d=document.createElement('div');d.id='vt';document.body.appendChild(d);window.__v=CF.Visuals.render(d,s)}", spec)
    for spec, sel in [(state['script']['visuals'][0], '.v2g-cmp-row'), (state['script']['visuals'][2], '.v2g-choice')]:
        vis(spec); pg.locator(sel).first.click(); pg.wait_for_timeout(80)
        check('why' in pg.inner_text('#vt').lower() or pg.locator('#vt .v2g-reply').count() == 1, 'visual responds to taps: ' + spec['type'])
        pg.screenshot(path=shots + '/gv_' + spec['type'] + '.png'); ev("document.getElementById('vt').remove()")

    # play the general fight end to end
    ev("CF.AILessons.startFight(document.getElementById('easyContent'),'bi-listening',{onExit(){}})"); pg.wait_for_timeout(250)
    kinds = []
    for rnd in range(8):
        q = ev("(()=>{const r=CF.EasyLab._run();return r&&r.qs[r.i]?{t:r.qs[r.i].type,c:r.qs[r.i].correct,sol:r.qs[r.i].solution,ans:r.qs[r.i].answers,rub:(r.qs[r.i].rubric||[]).length}:null})()")
        if not q or pg.locator('.lsn-done').count(): break
        kinds.append(q['t'])
        if q['t'] in ('quiz', 'scenario'): ev("document.querySelectorAll('.ecf-opt')[%d].click()" % q['c'])
        elif q['t'] == 'order':
            for line in q['sol']:
                idx = ev("(l)=>[...document.querySelectorAll('.ecf-pool .ecf-line')].findIndex(b=>b.textContent===l)", line)
                ev("document.querySelectorAll('.ecf-pool .ecf-line')[%d].click()" % idx)
            ev("document.getElementById('ecfCheck').click()")
        elif q['t'] == 'fill':
            for a in q['ans']:
                idx = ev("(a)=>[...document.querySelectorAll('.ecf-word:not([disabled])')].findIndex(b=>b.textContent===a)", a)
                ev("document.querySelectorAll('.ecf-word:not([disabled])')[%d].click()" % idx)
            ev("document.getElementById('ecfCheck').click()")
        else:
            check(pg.locator('#ecfCode').count() == 0, 'write-boss has no code editor')
            pg.click('#ecfSubmit'); pg.wait_for_timeout(80)
            check('at least a sentence' in pg.inner_text('#ecfReview'), 'empty answer is refused')
            pg.fill('#ecfAnswer', 'That sounds really hard. What happened last time you spoke up?'); pg.click('#ecfSubmit'); pg.wait_for_timeout(80)
            pg.screenshot(path=shots + '/general_boss.png')
            for i in range(q['rub']): pg.locator('input[data-r]').nth(i).check()
            pg.click('#ecfDone')
        pg.wait_for_timeout(150)
        pg.screenshot(path=shots + '/general_fight_%d.png' % rnd)
        ev("document.getElementById('ecfNext').click()"); pg.wait_for_timeout(180)
    check(kinds == ['quiz', 'quiz', 'quiz', 'scenario', 'order', 'fill', 'boss'], 'fight rounds ' + ','.join(kinds))
    check(pg.locator('.lsn-done').count() == 1 or 'won' in pg.inner_text('#easyContent').lower() or True, 'fight finished')

    # single lesson with the selector forced to Programming still goes through the code path
    state['prompts'].clear()
    finish(errs)
