# Code Fighter — Learning Lab

A gamified DSA (data-structures & algorithms) practice app: campaign fights,
interactive lessons, a step-through visualizer, spaced repetition, shop,
achievements, streaks, procedural chiptune audio, and an optional Gemini AI
tutor. **100% client-side, zero build step, zero dependencies.**

This project was restructured from a single 9,800-line HTML file into small,
single-responsibility modules. All features and functionality are unchanged.

## Run it

No install, no build. Serve the folder with any static server:

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

(Opening `index.html` directly via `file://` also works; the optional
`data/*.json` content files simply fall back to built-in defaults.)

## Project layout

```
index.html              Thin shell: <head>, screen markup, script tags ONLY
css/
  core.css              Campaign UI: screens, HUD, map, shop, buttons…
  learning-lab.css      Learning-lab add-ons: visualizer (vz-*) + lessons (lsn-*)
data/                   ✏️  EDITABLE CONTENT (plain JSON, no code)
  fighters.json         Fighter roster + unlock levels
  campaign.json         Patterns, tiers/rewards, volume names
js/                     Modules load in numeric order (dependency order)
  00-content.js         Loads/caches data/*.json (with safe fallbacks)
  01-state.js           CF.State  — profile, session, XP, streak, campaign table
  02-campaign.js        CF.CampaignLogic — stars, progression rules, tooltips
  03-questions.js       CF.Questions — Vol-1 question bank (85 questions)
  04-renderers.js       CF.Renderers — 11 question-type renderers
  05-achievements.js    CF.Achievements — badge definitions + checker
  06-modes.js           CF.Modes — enemy archetypes, boss mechanics, mode configs
  07-spaced.js          CF.Spaced — spaced repetition + weak-spot analyzer
  08-shop.js            CF.Shop — items, purchases, shop UI
  09-music.js           CF.Music — procedural chiptune engine (Web Audio)
  10-screens.js         CF.Screens — recap screen + achievement popups
  11-engine.js          CF.Engine — fight loop, combat visuals, sounds
  12-settings.js        CF.Settings — settings, profile export/import
  13-visualizer.js      CF.Narrator / CF.Sonify / CF.Visualizer
  14-aitutor.js         CF.AITutor — Gemini hints/explain-back grading
  15a-problem-lab.js    CF.ProblemLab — interactive Problem phase (rules per lesson)
  15-lessons.js         CF.Lessons — interactive lesson flow
  15c-curiosity.js      CF.Curiosity — editable teaser/"go deeper" cards for each lesson
  18-easy-coding.js     CF.EasyCoding — 50 easy practice problems (data + screen)
  20-easy-data.js       CF.EasyData — Easy Coding units (lesson text, animated traces) + per-problem complexity answers
  21-easy-lab.js        CF.EasyLab — Easy Coding lesson flow + practice fight (MCQ, order lines, fill words, boss)
  22-cinema.js          CF.Cinema — YouTube search, length-priced tickets, auto-closing player, welcome-back screen
                        (needs a free YouTube Data API v3 key, entered in Cinema → Settings;
                         if videos refuse to play from a file, run: python3 -m http.server 8000)
  19-hub.js             CF.Hub — home tabs (Today/Learn/Practice/Progress), study log, mastery,
                        subject registry (registerSubject) for future subjects
  16-shell.js           Screen router, map render, menu wiring, boot
```

Every module attaches itself to the global `CF` namespace as an IIFE
(`CF.X = (() => { ... })()`) and documents its dependencies in its header
comment. Load order in `index.html` is the dependency order.

## How to change common things

| I want to…                                | Do this |
|-------------------------------------------|---------|
| Rename the game / change tagline          | `index.html` → `screen-menu` markup |
| Add/recolor a fighter                     | `data/fighters.json` (keep `js/01-state.js` fallback in sync if you use `file://`) |
| Add a pattern, tier, reward or volume     | `data/campaign.json` — the level list rebuilds automatically |
| Add/edit questions                        | `js/03-questions.js` — one entry per question object |
| Change how a question type looks/works    | `js/04-renderers.js` — one renderer per type |
| Tune combat math, HP, damage, timers      | `js/11-engine.js` (+ `js/06-modes.js` for enemy behaviour) |
| Add an achievement                        | `js/05-achievements.js` — append to the definitions array |
| Change a lesson's Problem question rules / hints | `js/15a-problem-lab.js` → `RULES` (keyed by lesson id) |
| Add a shop item                           | `js/08-shop.js` — append to `ITEMS` |
| Adjust star thresholds / progression      | `js/02-campaign.js` |
| Tweak the spaced-repetition schedule      | `js/07-spaced.js` |
| Change colors/theme                       | CSS custom properties at the top of `css/core.css` (`:root`) |
| Restyle the visualizer / lessons          | `css/learning-lab.css` |
| Change music/SFX                          | `js/09-music.js` |
| Add a new screen                          | markup block in `index.html` + route it in `js/16-shell.js` |

## Adding a new question type (example recipe)

1. Give questions of that type a new `"type"` value in `js/03-questions.js`.
2. Register a renderer for it in `js/04-renderers.js` (`CF.Renderers`).
3. Style it in `css/core.css` (or `css/learning-lab.css` if lab-specific).
Nothing else needs to change — the fight engine renders whatever the
registry returns.

## Data & persistence notes

- Profile lives in `localStorage` under `codefighter_profile_v1`; schema
  migrations go in `migrate()` inside `js/01-state.js`.
- The AI tutor key is stored only in browser `localStorage`
  (`js/14-aitutor.js`); the app works fully without it.

## Verifying after edits

There is no test suite; the fastest sanity checks are:

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done   # syntax
python3 -m http.server && # click through: menu → map → fight → shop → learn
```

## Interactive visuals and AI lessons

- `js/23-visuals.js` draws interactive visuals from small JSON specs: `stepper` (variable boxes), `branch` (if/elif/else path), `hashmap`, `set`, `venn`, `tuple`, `bigo`. Hash map, set, Venn and tuple frames are computed by the app from `ops`, so they are always correct. Easy Coding lessons have a "Visual" step that uses them.
- `js/24-ai-lessons.js` defines the lesson script format (`cf-lesson/1`), the Gemini prompt, validation, retry-with-errors, the lesson player and the practice fight. The **AI Lessons** subject has a built-in sample (Hash Maps, Sets & Tuples) that works without a key, a Create button (needs a Gemini key), and a paste-a-script box that accepts JSON from any AI.
- Limits: Python from Gemini is not executed in the browser (the boss is self-graded; order/fill/complexity answers come from the script); stepper values written by Gemini cannot be machine-checked.

## Folders and Ask-the-AI

- **Folders:** tap `＋ Folder` on the subject chips (Learn/Practice/Progress). Each folder is its own subject with its own Learn path; "Create a lesson with AI" inside a folder files the lesson there. Rename or delete a folder from its Learn page (deleting keeps the lessons and moves them to AI Lessons); move a lesson between folders from the Create screen. Saved in `profile.folders`.
- **Ask the AI:** a 🤖 button appears during lessons (Easy Coding and AI lessons, not fights). `js/25-ask-ai.js` sends Gemini the whole lesson, the learner's exact position, a text description of what the visual shows right now, and the last few messages.

## Spirits (animated enemies)

`js/26-spirits.js` draws nine original SVG creatures (slime, bat, dragon, golem, imp, ghost, spider, robot, goblin) with idle / hurt / attack / die states. They replace the emoji enemy in Easy Coding, AI-lesson and campaign fights; emoji remain the fallback. To use downloaded sprite art later, change `CF.Spirits.html()` to return an `<img>` / sprite-sheet element and keep `react()`.

## Running code and spaced review

- `js/27-pyrun.js` runs Python in the browser (Pyodide in a Web Worker, downloaded from jsDelivr on first use, ~10 MB, then cached). The boss round runs your code: built-in problems compare it with the model solution on the example input plus generated variations; AI lessons carry 3-6 `tests` in the script. Failed runs are free (use Run again); "Show solution" costs a life. If Python cannot load (offline) the boss falls back to self-grading. AI lesson scripts are also checked when created: every code block must compile and the model solution must pass its own tests, otherwise Gemini is asked to fix the script.
- `js/28-review.js` turns every answered fight question into a spaced-repetition card (4 h after a miss, then 1, 3, 7, 14, 30 days). The Practice tab of Easy Coding, AI Lessons and each folder has "Review N due" and "Weak-spot round"; due reviews also appear on Today. Each review rebuilds a fresh variant of the question.

## Predict the output, trace visuals, built-in lessons, courses

- **Predict the output** is a new fight round (fights are now 9 rounds: 3 complexity, 1 predict, 2 order, 2 fill, 1 boss). Built-in problems use `js/20b-easy-predict.js` (generated: each `call` and `out` was produced by running the model solution in real Python, and the wrong answers are believable slips made from the right one). AI lessons add an optional `practice.predict {title, code, output, wrong[3]}`; the app *runs* the code and rejects the lesson if `output` is not what it prints. After answering, **Watch it run** shows the program as a step-by-step stepper with the call stack.
- **`trace` visuals**: the AI (or you) gives only a program and one sentence per line. `CF.PyRun.trace` runs it and `CF.Visuals.stepperFromTrace` turns the real execution (variables, list, output and the **call stack**) into a stepper, so recursion, stacks and loops are always correct. It is resolved when the lesson is generated; if Python could not load then, it is resolved when the lesson opens.
- **Built-in lessons** (`js/29-lessons-builtin.js`, generated, verified with real Python, visuals pre-recorded so they work offline): Recursion, Stacks and Queues, Binary Search, Two Pointers, plus the Hash Maps sample. They appear first in AI Lessons, labelled “(built-in)”. Add more with `CF.AILessons.addBuiltin(id, script)`.
- **Courses**: in Create, switch to **Whole course**, type a topic, and Gemini proposes 3-8 lessons. Edit the list, then every lesson is written (each with the course outline in its prompt so it does not repeat earlier ones), verified and saved into a new folder. A lesson that fails is reported and skipped; the rest are still made.
- **Your own notes**: the optional “Use my own notes or an article” box (max 8000 characters) is sent as *data* to teach from, not as instructions. It works for one lesson and for a course.

## More visuals (23b-visuals-ds.js)

Five more spec types, all with frames **computed by the app** (the AI only gives inputs, so a picture can never be wrong):
`linkedlist` (prepend/append/insert_after/delete/find/reverse, with the cost of each), `stackqueue` (`kind` stack or queue, with the real error on an empty pop), `tree` (binary search tree: insert, find, inorder/preorder/postorder/levelorder), `sort` (`algo` bubble/selection/insertion/merge, with comparison and swap counters) and `calltree` (the tree of calls and the call stack of `fib`, `factorial`, `sum_to` or `power`, with return values). They are documented in the Gemini prompt (`FORMAT` in 24-ai-lessons.js), so lessons can request them. New types plug in with `CF.Visuals.register(type, {validate, render})`. The Recursion built-in lesson uses `calltree`; `trace` still shows the stack of *your own* code.

## Lessons on any subject (not only coding)

The AI lesson and course generators work for any topic ("communication skills", "fractions", "Spanish verbs") as well as programming.

- **Subject type** on the Create screen: Auto-detect, Programming (Python) or Anything else. Auto uses a local keyword check for obvious programming words, otherwise asks Gemini once "CODE or GENERAL", and falls back to general. Course planning detects the kind once and every lesson in the course uses it.
- **`cf-lesson/2`, `kind: 'general'`** scripts have no code and no Python run. Ideas may carry a sample sentence, there is a worked `example` (lines + notes), and the practice is 3 quiz questions, a scenario, an order, a fill-in and a **write-your-answer boss** (you write, compare with a model answer, tick a rubric; optional AI feedback).
- **Five visuals** (`js/23c-visuals-general.js`): `compare`, `flow`, `scenario`, `worked`, `cards`. General lessons may use only these; code lessons keep their own set.
- Built-in sample: **Active Listening**. Pasted scripts of either schema are accepted.
- Tests: `tests/unit/general-lessons.test.js` and `tests/e2e/general_lessons.py` (a mocked "communication skills" course ends in a folder of non-programming lessons; one is played end to end).

## Tests and build

No tools are needed to **run** the app (open `index.html`). For development:

| command | what it does |
|---|---|
| `npm test` (or `node tests/run.js [filter]`) | 35 unit tests in plain Node, no dependencies: question generators (all 50 problems), visual math (sorting really sorts, BST traversals, call-tree results equal the real functions), AI-lesson validation / retry / course flow, **every built-in lesson run with real python3**, and project-structure checks (every script exists and is loaded, no orphan files, no two files defining the same `CF.<Module>`, load order, syntax, the bundler works) |
| `npm run test:e2e` | headless-browser tests (`pip install playwright && playwright install chromium`): lesson flow, folders, Ask-the-AI, code runner, review, predict, built-in lessons, courses, every new visual. Gemini is mocked and Pyodide is swapped for real python3, so no key or network is needed. Add `--dist` to run them against the bundle |
| `npm run build` | `dist/` = one `app.js` + one `app.css` (index.html stays the single source of load order), cache-busted by content hash. `npm run build:min` also minifies if esbuild is installed |
| `npm run gen:lessons` | regenerates `js/29-lessons-builtin.js` from `tools/builtin-lessons-src.js`, running every lesson's Python first |
| `npm run gen:predict` | regenerates `js/20b-easy-predict.js` by running all 50 model solutions |

Adding a module: create `js/NN-name.js`, add its `<script>` to `index.html`, and `npm test` tells you if it is missing, misordered or clashes with another module. Add a test in `tests/unit/` (`const T = require('../lib')`; `T.load([...modules])` loads browser files into a Node vm; `T.usePython(ctx)` plugs in real python3).
