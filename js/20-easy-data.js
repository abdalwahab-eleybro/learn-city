/* ═══════════════════════════════════════════════════════════ */
/*  20-easy-data.js — ✏️ EDITABLE content for the Easy Coding    */
/*  subject: 9 units (lesson + practice) covering all 50 problems */
/*                                                              */
/*  UNITS[]  one per lesson. Fields:                             */
/*    problems   problem numbers (from 18-easy-coding.js)        */
/*    imagine    story + objectives + curiosity card             */
/*    ideas[]    short idea cards (title, text, optional code)   */
/*    walk       annotated code: lines[] + notes[] (same length) */
/*    trace()    animated walkthrough for the visualizer player  */
/*  META[num]  per-problem practice data:                        */
/*    time/space  correct complexity answers                     */
/*    code        optional replacement code for ordering/filling */
/*  Depends on: nothing (pure data). Loaded before 21-easy-lab.  */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.EasyData = (() => {

  /* ── tiny helpers for building animated traces ── */
  const C = (arr, ptrs, marks, aux) => ({ arr: arr.slice(), ptrs: ptrs || {}, marks: marks || {}, aux: aux || [] });
  const A = (label, value) => ({ label, value });

  /* ═══════════ TRACES (one per unit, simulated from real code) ═══════════ */

  function traceCount() {
    const arr = [2, 5, 8, 5, 1, 9], val = 5;
    const code = [
      'smaller = equal = greater = 0',
      'for x in arr:',
      '    if x < val:',
      '        smaller += 1',
      '    elif x == val:',
      '        equal += 1',
      '    else:',
      '        greater += 1',
      'return [smaller, equal, greater]'
    ];
    let sm = 0, eq = 0, gr = 0;
    const aux = () => [A('val', val), A('smaller', sm), A('equal', eq), A('greater', gr)];
    const steps = [{ line: 0, caption: 'three counters start at 0', narration: 'We keep one counter for each answer. Before we look at anything, every counter is zero.', state: C(arr, {}, {}, aux()), fx: { type: 'init' } }];
    arr.forEach((x, i) => {
      const cmp = { line: 1, caption: `x = ${x}`, narration: `Take the next number: ${x}. Compare it with ${val}.`, state: C(arr, { i }, { [i]: 'cmp' }, aux()), fx: { type: 'compare', indices: [i] } };
      if (i === 2) cmp.predict = { q: 'x = 8 and val = 5. Which counter goes up?', options: ['smaller', 'equal', 'greater'], correct: 2, why: '8 is not smaller than 5 and not equal to it, so it falls through to the else branch: greater.' };
      steps.push(cmp);
      let line, cap;
      if (x < val) { sm++; line = 3; cap = `${x} < ${val} → smaller = ${sm}`; }
      else if (x === val) { eq++; line = 5; cap = `${x} == ${val} → equal = ${eq}`; }
      else { gr++; line = 7; cap = `${x} > ${val} → greater = ${gr}`; }
      steps.push({ line, caption: cap, narration: `Exactly one branch runs, so this number is counted exactly once.`, state: C(arr, { i }, { [i]: 'win' }, aux()), fx: { type: 'write', indices: [i] } });
    });
    steps.push({ line: 8, caption: `return [${sm}, ${eq}, ${gr}]`, narration: `Every number was counted once. The answer is ${sm} smaller, ${eq} equal, ${gr} greater.`, state: C(arr, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceAggregate() {
    const arr = [3, 1, 4, 1, 5];
    const code = ['total = 0', 'for x in arr:', '    total += x', 'return total'];
    let total = 0;
    const aux = () => [A('total', total)];
    const steps = [{ line: 0, caption: 'total = 0', narration: 'A running total always starts at zero, the answer for an empty list.', state: C(arr, {}, {}, aux()), fx: { type: 'init' } }];
    arr.forEach((x, i) => {
      const s1 = { line: 1, caption: `x = ${x}`, narration: `Look at ${x}.`, state: C(arr, { i }, { [i]: 'cmp' }, aux()), fx: { type: 'compare', indices: [i] } };
      if (i === 3) s1.predict = { q: `total is ${total} and x = 1. What is total after this step?`, options: [String(total), String(total + 1), String(total + 2)], correct: 1, why: 'total += x adds x to what we already have: ' + total + ' + 1 = ' + (total + 1) + '.' };
      steps.push(s1);
      total += x;
      steps.push({ line: 2, caption: `total = ${total}`, narration: `Add ${x} to the running total. It is now ${total}.`, state: C(arr, { i }, { [i]: 'win' }, aux()), fx: { type: 'write', indices: [i] } });
    });
    steps.push({ line: 3, caption: `return ${total}`, narration: `Every element was added once. The sum is ${total}.`, state: C(arr, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceSearch() {
    const arr = [3, 8, 2, 9, 4];
    const code = ['best = arr[0]', 'for i in range(1, len(arr)):', '    if arr[i] > best:', '        best = arr[i]', 'return best'];
    let best = arr[0];
    const aux = () => [A('best', best)];
    const steps = [{ line: 0, caption: `best = ${best}`, narration: 'Start by assuming the first element is the best so far.', state: C(arr, { i: 0 }, { 0: 'win' }, aux()), fx: { type: 'init' } }];
    for (let i = 1; i < arr.length; i++) {
      const s1 = { line: 2, caption: `is ${arr[i]} > ${best}?`, narration: `Compare ${arr[i]} with the best so far, ${best}.`, state: C(arr, { i }, { [i]: 'cmp' }, aux()), fx: { type: 'compare', indices: [i] } };
      if (i === 2) s1.predict = { q: `arr[2] = 2 and best = ${best}. Does best change?`, options: ['Yes, best becomes 2', 'No, best stays ' + best], correct: 1, why: '2 is not bigger than ' + best + ', so the if-branch is skipped and best is unchanged.' };
      steps.push(s1);
      if (arr[i] > best) { best = arr[i]; steps.push({ line: 3, caption: `best = ${best}`, narration: `${best} beats the old best, so we remember it.`, state: C(arr, { i }, { [i]: 'win' }, aux()), fx: { type: 'write', indices: [i] } }); }
    }
    steps.push({ line: 4, caption: `return ${best}`, narration: `One pass was enough to see every element. The maximum is ${best}.`, state: C(arr, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceDigits() {
    const digits = [4, 8, 2, 7];
    const code = ['total = 0', 'while num > 0:', '    total += num % 10', '    num //= 10', 'return total'];
    let num = 4827, total = 0;
    const aux = () => [A('num', num), A('total', total)];
    const steps = [{ line: 0, caption: 'total = 0', narration: 'We peel digits off the number one at a time and add them up.', state: C(digits, {}, {}, aux()), fx: { type: 'init' } }];
    for (let k = digits.length - 1; k >= 0; k--) {
      steps.push({ line: 1, caption: `num = ${num} > 0`, narration: `${num} is still above zero, so there are digits left.`, state: C(digits, { k }, {}, aux()), fx: { type: 'compare', indices: [k] } });
      const last = num % 10;
      const s2 = { line: 2, caption: `num % 10 = ${last}`, narration: `The remainder after dividing by 10 is the last digit: ${last}.`, state: C(digits, { k }, { [k]: 'cmp' }, aux()), fx: { type: 'compare', indices: [k] } };
      if (k === 2) s2.predict = { q: `num = ${num}. What is num % 10?`, options: ['4', '8', '2'], correct: 2, why: '% 10 gives the last digit. The last digit of 482 is 2.' };
      steps.push(s2);
      total += last;
      steps.push({ line: 2, caption: `total = ${total}`, narration: `Add the digit ${last}. The total is ${total}.`, state: C(digits, { k }, { [k]: 'win' }, aux()), fx: { type: 'write', indices: [k] } });
      num = Math.floor(num / 10);
      steps.push({ line: 3, caption: `num = ${num}`, narration: `Integer division by 10 chops the last digit off. num is now ${num}.`, state: C(digits, { k }, { [k]: 'win' }, aux()), fx: { type: 'write', indices: [k] } });
    }
    steps.push({ line: 1, caption: 'num = 0, stop', narration: 'num reached 0, so the loop condition is false.', state: C(digits, {}, {}, aux()), fx: { type: 'init' } });
    steps.push({ line: 4, caption: `return ${total}`, narration: `4 + 8 + 2 + 7 = ${total}.`, state: C(digits, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceDivisors() {
    const code = ['while b:', '    a, b = b, a % b', 'return a'];
    let a = 48, b = 18;
    const view = () => C([a, b], {}, { 0: 'cmp', 1: 'cmp' }, [A('a', a), A('b', b)]);
    const steps = [{ line: 0, caption: `a = ${a}, b = ${b}`, narration: 'The Euclid trick: the gcd of a and b equals the gcd of b and a % b. Keep shrinking until b is zero.', state: view(), fx: { type: 'init' } }];
    let n = 0;
    while (b) {
      const s1 = { line: 0, caption: `b = ${b} is not 0`, narration: `b is ${b}, so we keep going.`, state: view(), fx: { type: 'compare', indices: [0, 1] } };
      if (n === 1) s1.predict = { q: `a = ${a}, b = ${b}. What is a % b?`, options: ['6', '1', '12'], correct: 0, why: `${a} divided by ${b} leaves a remainder of ${a % b}.` };
      steps.push(s1);
      const na = b, nb = a % b;
      a = na; b = nb;
      steps.push({ line: 1, caption: `a, b = ${a}, ${b}`, narration: `Both change at once: the old b becomes a, and the remainder becomes b.`, state: view(), fx: { type: 'write', indices: [0, 1] } });
      n++;
    }
    steps.push({ line: 2, caption: `return ${a}`, narration: `b is zero, so a holds the answer: gcd(48, 18) = ${a}.`, state: C([a, b], {}, { 0: 'win' }, [A('a', a), A('b', b)]), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceRearrange() {
    const orig = [1, 2, 3, 4, 5, 6];
    const arr = orig.slice();
    const code = ['left, right = 0, len(arr) - 1', 'while left < right:', '    arr[left], arr[right] = arr[right], arr[left]', '    left += 1', '    right -= 1', 'return arr'];
    let left = 0, right = arr.length - 1;
    const steps = [{ line: 0, caption: `left = 0, right = ${right}`, narration: 'One hand on each end of the row.', state: C(arr, { L: left, R: right }, {}, []), fx: { type: 'init' } }];
    let n = 0;
    while (left < right) {
      const s1 = { line: 1, caption: `${left} < ${right}`, narration: 'The hands have not met yet, so there is still a pair to swap.', state: C(arr, { L: left, R: right }, { [left]: 'cmp', [right]: 'cmp' }, []), fx: { type: 'compare', indices: [left, right] } };
      if (n === 1) s1.predict = { q: `left = ${left}, right = ${right}. Which two values swap?`, options: [`${arr[left]} and ${arr[right]}`, `${arr[0]} and ${arr[arr.length - 1]}`, `${arr[2]} and ${arr[3]}`], correct: 0, why: 'The hands point at the values to swap: arr[left] and arr[right].' };
      steps.push(s1);
      [arr[left], arr[right]] = [arr[right], arr[left]];
      steps.push({ line: 2, caption: `swap → [${arr.join(', ')}]`, narration: 'Swap the two values in place, no second array needed.', state: C(arr, { L: left, R: right }, { [left]: 'win', [right]: 'win' }, []), fx: { type: 'swap', indices: [left, right] } });
      left++; right--;
      steps.push({ line: 3, caption: `left = ${left}, right = ${right}`, narration: 'Move both hands one step toward the middle.', state: C(arr, { L: left, R: right }, {}, []), fx: { type: 'write', indices: [left, right] } });
      n++;
    }
    steps.push({ line: 5, caption: `return [${arr.join(', ')}]`, narration: 'The hands met in the middle. The row is reversed.', state: C(arr, {}, { 0: 'win', 1: 'win', 2: 'win', 3: 'win', 4: 'win', 5: 'win' }, []), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceStrings() {
    const s = 'education'.split('');
    const code = ['vowels = set("aeiou")', 'count = 0', 'for c in s:', '    if c in vowels:', '        count += 1', 'return count'];
    let count = 0;
    const aux = () => [A('count', count)];
    const steps = [{ line: 1, caption: 'count = 0', narration: 'A set of vowels lets us test membership quickly. The counter starts at 0.', state: C(s, {}, {}, aux()), fx: { type: 'init' } }];
    s.forEach((c, i) => {
      const isV = 'aeiou'.includes(c);
      const s1 = { line: 3, caption: `is "${c}" a vowel?`, narration: `Look at the letter "${c}".`, state: C(s, { i }, { [i]: 'cmp' }, aux()), fx: { type: 'compare', indices: [i] } };
      if (i === 3) s1.predict = { q: 'The letter is "c". Does count change?', options: ['Yes, count goes up', 'No, "c" is not in the vowel set'], correct: 1, why: '"c" is not one of a, e, i, o, u, so the if-body is skipped.' };
      steps.push(s1);
      if (isV) { count++; steps.push({ line: 4, caption: `count = ${count}`, narration: `"${c}" is a vowel. Count it.`, state: C(s, { i }, { [i]: 'win' }, aux()), fx: { type: 'write', indices: [i] } }); }
    });
    steps.push({ line: 5, caption: `return ${count}`, narration: `The word has ${count} vowels.`, state: C(s, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceSets() {
    const arr = [3, 1, 3, 2, 1];
    const code = ['seen = set()', 'result = []', 'for x in arr:', '    if x not in seen:', '        seen.add(x)', '        result.append(x)', 'return result'];
    const seen = [], result = [];
    const aux = () => [A('seen', '{' + seen.join(', ') + '}'), A('result', '[' + result.join(', ') + ']')];
    const steps = [{ line: 1, caption: 'seen = {}, result = []', narration: 'The set remembers what we have met. The list keeps first appearances in order.', state: C(arr, {}, {}, aux()), fx: { type: 'init' } }];
    arr.forEach((x, i) => {
      const dup = seen.includes(x);
      const s1 = { line: 3, caption: `${x} not in seen?`, narration: `Have we met ${x} before?`, state: C(arr, { i }, { [i]: 'cmp' }, aux()), fx: { type: 'compare', indices: [i] } };
      if (i === 2) s1.predict = { q: '3 is already in seen. What happens?', options: ['It is skipped', 'It is appended again'], correct: 0, why: '"x not in seen" is False for a repeat, so the body is skipped and the duplicate is dropped.' };
      steps.push(s1);
      if (!dup) { seen.push(x); result.push(x); steps.push({ line: 5, caption: `result = [${result.join(', ')}]`, narration: `New value. Remember it and keep it.`, state: C(arr, { i }, { [i]: 'win' }, aux()), fx: { type: 'write', indices: [i] } }); }
      else steps.push({ line: 3, caption: `${x} seen already, skip`, narration: `Already met. Skipped.`, state: C(arr, { i }, { [i]: 'out' }, aux()), fx: { type: 'compare', indices: [i] } });
    });
    steps.push({ line: 6, caption: `return [${result.join(', ')}]`, narration: 'Duplicates are gone and the original order is preserved.', state: C(arr, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  function traceBits() {
    const bits = [1, 1, 0, 1];
    const code = ['count = 0', 'while num:', '    count += num & 1', '    num >>= 1', 'return count'];
    let num = 13, count = 0;
    const aux = () => [A('num', num), A('count', count)];
    const steps = [{ line: 0, caption: 'count = 0', narration: '13 in binary is 1101. We look at the lowest bit, count it, then shift everything right.', state: C(bits, {}, {}, aux()), fx: { type: 'init' } }];
    for (let k = bits.length - 1, n = 0; k >= 0; k--, n++) {
      const bit = num & 1;
      const s1 = { line: 2, caption: `num & 1 = ${bit}`, narration: `The lowest bit of ${num} is ${bit}.`, state: C(bits, { k }, { [k]: 'cmp' }, aux()), fx: { type: 'compare', indices: [k] } };
      if (n === 1) s1.predict = { q: `num = ${num} (binary 110). What is num & 1?`, options: ['0', '1', '6'], correct: 0, why: '& 1 keeps only the lowest bit. 110 ends in 0, so the result is 0.' };
      steps.push(s1);
      count += bit;
      steps.push({ line: 2, caption: `count = ${count}`, narration: bit ? 'It is a 1, so count it.' : 'It is a 0, nothing to add.', state: C(bits, { k }, { [k]: bit ? 'win' : 'out' }, aux()), fx: { type: 'write', indices: [k] } });
      num >>= 1;
      steps.push({ line: 3, caption: `num = ${num}`, narration: 'Shift right by one: the lowest bit falls off.', state: C(bits, { k }, {}, aux()), fx: { type: 'write', indices: [k] } });
    }
    steps.push({ line: 4, caption: `return ${count}`, narration: `1101 has ${count} bits set to 1.`, state: C(bits, {}, {}, aux()), fx: { type: 'init' } });
    return { code, steps };
  }

  /* ═══════════ UNITS (lesson content), in learning order ═══════════ */
  const UNITS = [
    {
      id: 'e-count', icon: '🧮', title: 'Counting with a Loop', minutes: 8,
      problems: [1, 2, 3, 5, 10, 11, 41],
      enemy: { name: 'Tally Goblin', icon: '👺' },
      imagine: { text: 'A door guard with three clickers in his pocket: one for guests who are too short, one for just right, one for too tall. Each guest walks past once. He clicks exactly one clicker, never two, never none.' },
      objectives: ['Start a counter at 0 and add 1 when a condition holds', 'Use if / elif / else so every item is counted exactly once', 'Use % to test even, odd and divisible'],
      curiosity: { q: 'Why does a counter start at 0 and not 1?', a: 'Because before you look at anything you have counted nothing. 0 is also the right answer for an empty list, and every item adds exactly one.', deeper: 'This one-pass counting loop is what a database does for COUNT(*) and what a histogram does for every bar.' },
      ideas: [
        { title: 'One counter per answer', text: 'Counting is a loop with a number that starts at 0. Each time the condition is true, add 1.', code: 'count = 0\nfor x in arr:\n    if x == target:\n        count += 1' },
        { title: 'Branches that never overlap', text: 'With if / elif / else exactly one branch runs, so an item can never be counted twice.', code: 'if x < val: smaller += 1\nelif x == val: equal += 1\nelse: greater += 1' },
        { title: 'The modulo test', text: 'x % 2 == 0 means even. x % k == 0 means x is divisible by k. The remainder tells you.', code: 'if x % k == 0:\n    count += 1' },
        { title: 'Pairs need two loops', text: 'To compare every element with every later element (inversions), put a loop inside a loop. That costs n × n steps.', code: 'for i in range(n):\n    for j in range(i + 1, n):\n        if arr[i] > arr[j]:\n            count += 1' }
      ],
      walk: { lines: null, notes: ['Three counters, all starting at zero.', 'Visit every element once.', 'First test: is x smaller than val?', 'If so, add 1 to smaller.', 'Otherwise, is x equal to val?', 'If so, add 1 to equal.', 'Anything left must be bigger.', 'Add 1 to greater.', 'Hand back all three counts.'] },
      trace: traceCount
    },
    {
      id: 'e-aggregate', icon: '➕', title: 'Totals and Checks', minutes: 7,
      problems: [8, 9, 40],
      enemy: { name: 'Sum Slime', icon: '🟢' },
      imagine: { text: 'A snowball rolling down a hill. At every house it passes it picks up a little more snow. Nobody re-weighs the whole ball; it just keeps growing by exactly what it meets.' },
      objectives: ['Keep a running total that grows as you loop', 'Check a rule between neighbours and return early', 'Describe Kadane: keep the best sum ending here'],
      curiosity: { q: 'Why can a check stop at the first failure?', a: 'Because one counter-example is enough to prove the rule is false. "Is the array sorted?" only needs to find one pair out of order, then it can return False immediately.', deeper: 'Early return is why "any()" in many languages is fast: it stops the moment it finds one true item.' },
      ideas: [
        { title: 'The running total', text: 'Start at 0 and add each element. After the loop the total holds the sum of everything.', code: 'total = 0\nfor x in arr:\n    total += x' },
        { title: 'Compare neighbours', text: 'To check "is it sorted?", compare each element with the one before it. One bad pair settles the question.', code: 'for i in range(1, n):\n    if arr[i] < arr[i - 1]:\n        return False\nreturn True' },
        { title: 'Return early', text: 'return leaves the function immediately. Use it the moment you know the answer.', code: 'return False   # found a counter-example' },
        { title: 'Best sum ending here (Kadane)', text: 'At each element choose: start fresh here, or extend the previous run. Keep the best value you ever saw.', code: 'current = max(x, current + x)\nbest = max(best, current)' }
      ],
      walk: { lines: null, notes: ['The total starts empty.', 'Go through each element.', 'Add it to the running total.', 'Every element is included. Return the total.'] },
      trace: traceAggregate
    },
    {
      id: 'e-search', icon: '🔍', title: 'Searching and Scanning', minutes: 9,
      problems: [4, 6, 15, 35, 37, 38, 39, 48],
      enemy: { name: 'Seeker Bat', icon: '🦇' },
      imagine: { text: 'A treasure hunter walking along a shelf of jars with a marker pen. Each time she finds a bigger jewel than the one in her hand, she swaps it. She never looks back, and at the end of the shelf she holds the biggest.' },
      objectives: ['Track the best value seen so far in one pass', 'Use a dictionary to remember what you have seen', 'Explain why binary search halves the problem'],
      curiosity: { q: 'Why is binary search so much faster than scanning?', a: 'Each comparison throws away half of the remaining items. 1,000,000 items need only about 20 comparisons because 2²⁰ is about a million.', deeper: 'Binary search needs sorted data. Sorting costs time once; after that every search is almost free.' },
      ideas: [
        { title: 'Best so far', text: 'Hold one variable for the best value. Compare each element against it and update when something beats it.', code: 'best = arr[0]\nfor i in range(1, n):\n    if arr[i] > best:\n        best = arr[i]' },
        { title: 'Remember what you saw', text: 'A dictionary answers "have I seen this before?" in one step. Two Sum asks it for target - x.', code: 'need = target - x\nif need in seen:\n    return [seen[need], i]\nseen[x] = i' },
        { title: 'Voting for a majority', text: 'Keep a candidate and a count. Matching items add 1, others subtract 1. When the count hits 0 pick a new candidate.', code: 'if count == 0:\n    candidate = x\ncount += 1 if x == candidate else -1' },
        { title: 'Halve the range', text: 'In sorted data look at the middle. If the target is bigger, discard the left half; if smaller, discard the right.', code: 'mid = (lo + hi) // 2\nif arr[mid] < target:\n    lo = mid + 1\nelse:\n    hi = mid - 1' }
      ],
      walk: { lines: null, notes: ['Assume the first element is the best.', 'Check every other position.', 'Is this one bigger than the best?', 'If yes, it becomes the new best.', 'After one pass, best is the maximum.'] },
      trace: traceSearch
    },
    {
      id: 'e-digits', icon: '🔢', title: 'Digits and Number Loops', minutes: 9,
      problems: [27, 28, 29, 30, 31, 49],
      enemy: { name: 'Digit Dragon', icon: '🐉' },
      imagine: { text: 'A tiny machine that eats a number from the right. Every bite it takes the last digit, uses it, and spits out the rest. It stops only when nothing is left.' },
      objectives: ['Use % 10 to read the last digit and // 10 to drop it', 'Build a result with a while loop that stops at 0', 'Update two variables at once, as in Fibonacci'],
      curiosity: { q: 'How many times does a digit loop run for the number 1,000,000?', a: 'Only 7 times. Each pass removes one digit, so the loop runs once per digit, about log₁₀(n) times, not n times.', deeper: 'That log is why checking a huge number\'s digits is instant, while looping from 1 up to the number would take forever.' },
      ideas: [
        { title: 'Last digit with %', text: 'num % 10 is the last digit of num. 4827 % 10 is 7.', code: 'last = num % 10' },
        { title: 'Drop a digit with //', text: 'num // 10 throws the last digit away. 4827 // 10 is 482.', code: 'num //= 10' },
        { title: 'Loop until zero', text: 'Repeat while num > 0. Each pass removes one digit, so the loop stops by itself.', code: 'while num > 0:\n    total += num % 10\n    num //= 10' },
        { title: 'Two values at once', text: 'Fibonacci keeps two numbers. a, b = b, a + b updates both together using the OLD values.', code: 'a, b = 0, 1\nfor _ in range(n):\n    seq.append(a)\n    a, b = b, a + b' }
      ],
      walk: { lines: null, notes: ['Start the digit total at zero.', 'Keep going while digits remain.', 'Add the last digit to the total.', 'Drop that digit from the number.', 'Return the total.'] },
      trace: traceDigits
    },
    {
      id: 'e-divisors', icon: '🧩', title: 'Divisors and Primes', minutes: 9,
      problems: [13, 25, 26, 32, 33],
      enemy: { name: 'Divisor Golem', icon: '🗿' },
      imagine: { text: 'Two rulers of different lengths. You keep laying the longer along the shorter and cutting off what fits. Whatever scrap is left becomes the new short ruler. When nothing is left over, the last ruler is the biggest piece that measures both.' },
      objectives: ['Test a prime by trying divisors only up to √n', 'Run Euclid\'s loop for gcd and derive lcm from it', 'Use a formula instead of a loop when one exists'],
      curiosity: { q: 'Why only check divisors up to the square root?', a: 'Divisors come in pairs: if d divides n then n / d does too, and one of the two is at most √n. If you find no divisor by √n there is none.', deeper: 'Cryptography relies on this: factoring huge numbers is slow, which is why large primes protect your data.' },
      ideas: [
        { title: 'Is it prime?', text: 'A prime has no divisor except 1 and itself. Try 2, 3, 4 … up to √n. One hit means not prime.', code: 'for i in range(2, int(num ** 0.5) + 1):\n    if num % i == 0:\n        return False' },
        { title: 'Euclid for gcd', text: 'gcd(a, b) = gcd(b, a % b). Repeat until b is 0, then a is the answer.', code: 'while b:\n    a, b = b, a % b' },
        { title: 'lcm from gcd', text: 'a × b = gcd × lcm, so lcm = a × b // gcd. Reuse the loop you already have.', code: 'return a * b // gcd(a, b)' },
        { title: 'A formula beats a loop', text: 'The missing number in 1..n+1 is the expected total minus the actual total. One subtraction replaces a search.', code: 'expected = (n + 1) * (n + 2) // 2\nreturn expected - sum(arr)' }
      ],
      walk: { lines: null, notes: ['While b is not zero, keep going.', 'Replace the pair with (b, remainder).', 'When b is zero, a is the gcd.'] },
      trace: traceDivisors
    },
    {
      id: 'e-rearrange', icon: '🔄', title: 'Rearranging Arrays', minutes: 9,
      problems: [7, 12, 14, 22, 36],
      enemy: { name: 'Shuffle Imp', icon: '😈' },
      imagine: { text: 'Two people at opposite ends of a bench of books. They swap the books in front of them, step toward the middle, and swap again. When they meet, the whole shelf has been flipped, and nobody needed a second shelf.' },
      objectives: ['Swap two positions in place with two pointers', 'Merge two sorted lists by always taking the smaller front', 'Keep a write position to compact an array'],
      curiosity: { q: 'Why do two-handed swaps need only half the steps?', a: 'Each swap fixes two elements at once: the one at the left and the one at the right. So n elements need only n / 2 swaps.', deeper: 'Python can swap with a, b = b, a because it builds the pair first. In many languages you would need a temporary variable.' },
      ideas: [
        { title: 'Two hands', text: 'Put one index at the start and one at the end. Swap, move both inward, stop when they meet.', code: 'while left < right:\n    arr[left], arr[right] = arr[right], arr[left]\n    left += 1\n    right -= 1' },
        { title: 'Merge by front-runners', text: 'With two sorted lists, compare their front items and take the smaller. Whatever is left over is already sorted.', code: 'if a[i] <= b[j]:\n    result.append(a[i]); i += 1\nelse:\n    result.append(b[j]); j += 1' },
        { title: 'A write position', text: 'To move zeros to the end, copy each non-zero value to the next free slot, then fill the rest with zeros.', code: 'if x != 0:\n    arr[insert_pos] = x\n    insert_pos += 1' },
        { title: 'Keep the first only', text: 'A set remembers what you have already kept. Skip anything already in it to remove duplicates in order.', code: 'if x not in seen:\n    seen.add(x)\n    result.append(x)' }
      ],
      walk: { lines: null, notes: ['Left hand at the start, right hand at the end.', 'Keep going while the hands have not met.', 'Swap the two values in place.', 'Move the left hand right.', 'Move the right hand left.', 'The array is now reversed.'] },
      trace: traceRearrange
    },
    {
      id: 'e-strings', icon: '🔤', title: 'Working with Strings', minutes: 9,
      problems: [16, 17, 18, 19, 20, 21, 42, 44, 50],
      enemy: { name: 'Letter Wraith', icon: '👻' },
      imagine: { text: 'A string is just a row of letter tiles. You can walk along it, read a tile, and ask a yes-or-no question about it: is it a vowel, a capital, a space? Every string problem is a row of tiles and a question.' },
      objectives: ['Loop through a string and test each character', 'Use split, join and slicing to reshape text', 'Use a stack to check balanced brackets'],
      curiosity: { q: 'How does a computer know the brackets in your code are balanced?', a: 'It keeps a stack. Every opening bracket is pushed; every closing bracket must match the most recent opening one on top. If it does not, or the stack is not empty at the end, the code is broken.', deeper: 'Code editors use this exact idea to highlight matching brackets and report a missing one.' },
      ideas: [
        { title: 'Loop over characters', text: 'for c in s visits one character at a time, so counting vowels or capitals is a normal counting loop.', code: 'for c in s:\n    if c in vowels:\n        count += 1' },
        { title: 'Words with split', text: 's.split() cuts a sentence into a list of words. len() counts them, and reversed() flips their order.', code: "words = s.split()\n' '.join(reversed(words))" },
        { title: 'Palindromes', text: 'A palindrome reads the same backwards: compare the string with its reverse, or compare from both ends.', code: 's == s[::-1]' },
        { title: 'Stack for brackets', text: 'Push openers. On a closer, pop and check they match. A valid string ends with an empty stack.', code: "if c in '([{':\n    stack.append(c)\nelif not stack or stack.pop() != pairs[c]:\n    return False" }
      ],
      walk: { lines: null, notes: ['A set makes "is it a vowel?" quick.', 'Start counting at zero.', 'Visit each character.', 'Is this one a vowel?', 'Yes, so count it.', 'Return the number of vowels.'] },
      trace: traceStrings
    },
    {
      id: 'e-sets', icon: '🧺', title: 'Sets and Uniqueness', minutes: 7,
      problems: [23, 24, 43, 47],
      enemy: { name: 'Set Spider', icon: '🕷️' },
      imagine: { text: 'A basket that refuses duplicates. Drop in a red ball twice and there is still only one red ball inside. Ask the basket "do you hold this?" and it answers instantly, however full it is.' },
      objectives: ['Build a set to drop duplicates', 'Use & for intersection and | for union', 'Count distinct items with len(set(...))'],
      curiosity: { q: 'How can a set answer "is it inside?" so fast?', a: 'A set uses a hash table: the item\'s value is turned into a number that points straight to its slot. No searching through the others.', deeper: 'That is why "x in set" takes about the same time for 10 items as for 10 million.' },
      ideas: [
        { title: 'Sets keep each value once', text: 'set(arr) drops duplicates. len(set(arr)) is the count of distinct elements.', code: 'len(set(arr))' },
        { title: 'Intersection', text: 'a & b keeps only the items in both sets.', code: 'sorted(set(a) & set(b))' },
        { title: 'Union', text: 'a | b keeps items that appear in either set, each once.', code: 'sorted(set(a) | set(b))' },
        { title: 'Chain them', text: 'Common to three arrays is just two intersections in a row.', code: 'set(a) & set(b) & set(c)' }
      ],
      walk: { lines: null, notes: ['The set remembers what we have met.', 'The list keeps first appearances in order.', 'Visit every value.', 'Is it new?', 'Remember it.', 'Keep it in the result.', 'Return the cleaned list.'] },
      trace: traceSets
    },
    {
      id: 'e-bits', icon: '⚙️', title: 'Bits and Grids', minutes: 8,
      problems: [34, 45, 46],
      enemy: { name: 'Bit Bot', icon: '🤖' },
      imagine: { text: 'A row of tiny light switches, each on or off. You flip through them from the right, counting how many are on. The same idea works for a grid: rows and columns are just two directions to walk.' },
      objectives: ['Read the lowest bit with & 1 and drop it with >> 1', 'Index a grid as matrix[row][col]', 'Sum rows and columns and transpose a grid'],
      curiosity: { q: 'Why do computers count in 0s and 1s?', a: 'A switch has two stable states, on and off, and that is easy to build in hardware. Every number, letter and picture is a long row of those switches.', deeper: 'Your phone\'s photos are grids too: each cell of the grid is a pixel, and transposing a grid is how an image is rotated.' },
      ideas: [
        { title: 'The lowest bit', text: 'num & 1 is 1 when the last binary digit is 1, and 0 otherwise.', code: 'count += num & 1' },
        { title: 'Shift right', text: 'num >>= 1 drops the lowest bit, moving the next one into place. Repeat until num is 0.', code: 'while num:\n    count += num & 1\n    num >>= 1' },
        { title: 'Rows and columns', text: 'matrix[r][c] is row r, column c. A row sum adds across; a column sum adds down.', code: 'row_sums = [sum(row) for row in matrix]' },
        { title: 'Transpose', text: 'Swap the roles of row and column: the new row c holds the old column c.', code: '[[matrix[r][c] for r in range(rows)] for c in range(cols)]' }
      ],
      walk: { lines: null, notes: ['Start the bit counter at zero.', 'Loop while some bits remain.', 'Add the lowest bit.', 'Shift it away.', 'Return how many bits were 1.'] },
      trace: traceBits
    }
  ];

  /* ═══════════ INTERACTIVE VISUALS (specs for CF.Visuals) ═══════════ */
  const VISUALS = {
    'e-count': [
      { type: 'branch', title: 'Which branch runs? (if / elif / else)',
        branches: [{ test: 'x < val', does: 'smaller += 1' }, { test: 'x == val', does: 'equal += 1' }, { test: 'else', does: 'greater += 1' }],
        cases: [{ label: 'x=2, val=5', takes: 0, why: '2 < 5 is true, so the first branch runs and the rest are skipped.' },
                { label: 'x=5, val=5', takes: 1, why: '5 < 5 is false, then 5 == 5 is true.' },
                { label: 'x=9, val=5', takes: 2, why: 'Both tests fail, so else catches it.' }] },
      { type: 'stepper', title: 'Counters as boxes',
        code: ['smaller = 0', 'for x in [3, 7, 1]:', '    if x < 5:', '        smaller += 1', 'print(smaller)'],
        steps: [{ line: 0, caption: 'A counter box starts at 0.', vars: { smaller: 0 } },
                { line: 1, caption: 'First value: x is 3.', vars: { smaller: 0, x: 3 } },
                { line: 3, caption: '3 < 5, so add 1.', vars: { smaller: 1, x: 3 } },
                { line: 1, caption: 'Next value: x is 7.', vars: { smaller: 1, x: 7 } },
                { line: 2, caption: '7 < 5 is false, so skip the add.', vars: { smaller: 1, x: 7 } },
                { line: 1, caption: 'Last value: x is 1.', vars: { smaller: 1, x: 1 } },
                { line: 3, caption: '1 < 5, so add 1.', vars: { smaller: 2, x: 1 } },
                { line: 4, caption: 'The loop is over. Print the box.', vars: { smaller: 2, x: 1 }, out: '2' }] }
    ],
    'e-search': [
      { type: 'hashmap', title: 'How a dictionary finds things fast', buckets: 5,
        ops: [{ op: 'put', key: 'cat', value: 1 }, { op: 'put', key: 'dog', value: 2 }, { op: 'put', key: 'act', value: 3 }, { op: 'get', key: 'act' }, { op: 'get', key: 'cow' }, { op: 'in', key: 'dog' }] }
    ],
    'e-digits': [
      { type: 'tuple', title: 'A tuple is a locked row', values: [4, 8, 15], ops: [{ op: 'index', i: 0 }, { op: 'index', i: -1 }, { op: 'assign', i: 1, value: 9 }, { op: 'rebuild', i: 1, value: 9 }, { op: 'unpack', names: ['a', 'b', 'c'] }] }
    ],
    'e-divisors': [
      { type: 'bigo', title: 'Why complexity matters: drag n', curves: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], highlight: 'O(n²)', n: 16 }
    ],
    'e-rearrange': [
      { type: 'tuple', title: 'Swapping with a tuple', values: [1, 2, 3, 4], ops: [{ op: 'slice', a: 1, b: 3 }, { op: 'rebuild', i: 0, value: 4 }, { op: 'unpack', names: ['a', 'b', 'c', 'd'] }] }
    ],
    'e-sets': [
      { type: 'set', title: 'A set never keeps duplicates', start: [3, 1], ops: [{ op: 'add', value: 2 }, { op: 'add', value: 3 }, { op: 'in', value: 1 }, { op: 'discard', value: 7 }, { op: 'remove', value: 7 }] },
      { type: 'venn', title: 'Combining two sets', a: ['red', 'blue', 'green'], b: ['blue', 'green', 'pink'], nameA: 'a', nameB: 'b' }
    ]
  };
  UNITS.forEach(u => { u.visuals = VISUALS[u.id] || []; });

  /* ═══════════ PER-PROBLEM PRACTICE DATA ═══════════
     time / space : the correct answers for the code shown
     code         : optional replacement code (clearer to order / fill) */
  const M = (time, space, code) => ({ time, space, code });
  const META = {
    1: M('O(n)', 'O(1)'), 2: M('O(n)', 'O(1)'), 3: M('O(n)', 'O(1)'),
    4: M('O(n)', 'O(1)', 'def min_max(arr, n):\n    mn = mx = arr[0]\n    for i in range(1, n):\n        if arr[i] < mn:\n            mn = arr[i]\n        if arr[i] > mx:\n            mx = arr[i]\n    return [mn, mx]'),
    5: M('O(n)', 'O(1)'), 6: M('O(n)', 'O(1)'), 7: M('O(n)', 'O(n)'), 8: M('O(n)', 'O(1)'), 9: M('O(n)', 'O(1)'),
    10: M('O(n)', 'O(1)'), 11: M("O(n)", "O(n)", "def count_duplicates(arr, n):\n    freq = {}\n    for x in arr:\n        freq[x] = freq.get(x, 0) + 1\n    count = 0\n    for v in freq.values():\n        if v > 1:\n            count += 1\n    return count"), 12: M('O(n + m)', 'O(n + m)'), 13: M("O(n)", "O(1)", "def find_missing(arr, n):\n    expected = (n + 1) * (n + 2) // 2\n    total = 0\n    for x in arr:\n        total += x\n    return expected - total"),
    14: M("O(n)", "O(n)", "def rotate_array(arr, n, k):\n    k = k % n\n    result = [0] * n\n    for i in range(n):\n        result[(i + k) % n] = arr[i]\n    return result"), 15: M('O(n)', 'O(n)'), 16: M('O(n)', 'O(1)'), 17: M("O(n)", "O(1)", "def is_palindrome(s):\n    left, right = 0, len(s) - 1\n    while left < right:\n        if s[left] != s[right]:\n            return False\n        left += 1\n        right -= 1\n    return True"),
    18: M("O(n)", "O(1)", "def count_words(s):\n    count = 0\n    in_word = False\n    for c in s:\n        if not c.isspace() and not in_word:\n            count += 1\n            in_word = True\n        elif c.isspace():\n            in_word = False\n    return count"), 19: M('O(n)', 'O(n)'), 20: M("O(n)", "O(n)", "def reverse_words(s):\n    words = s.split()\n    left, right = 0, len(words) - 1\n    while left < right:\n        words[left], words[right] = words[right], words[left]\n        left += 1\n        right -= 1\n    return ' '.join(words)"), 21: M("O(n)", "O(1)", "def count_case(s):\n    upper = lower = 0\n    for c in s:\n        if c.isupper():\n            upper += 1\n        elif c.islower():\n            lower += 1\n    return [upper, lower]"),
    22: M('O(n)', 'O(n)'), 23: M("O(n log n)", "O(n)", "def intersection(arr1, arr2):\n    seen = set(arr1)\n    result = set()\n    for x in arr2:\n        if x in seen:\n            result.add(x)\n    return sorted(result)"), 24: M("O(n log n)", "O(n)", "def union(arr1, arr2):\n    result = set()\n    for x in arr1:\n        result.add(x)\n    for x in arr2:\n        result.add(x)\n    return sorted(result)"),
    25: M('O(n log log n)', 'O(n)'), 26: M('O(√n)', 'O(1)'), 27: M('O(n)', 'O(n)'), 28: M('O(n)', 'O(1)'),
    29: M('O(log n)', 'O(1)'), 30: M('O(log n)', 'O(1)'), 31: M("O(log n)", "O(log n)", "def is_armstrong(num):\n    digits = str(num)\n    power = len(digits)\n    total = 0\n    for d in digits:\n        total += int(d) ** power\n    return num == total"),
    32: M('O(log n)', 'O(1)'),
    33: M('O(log n)', 'O(1)', 'def lcm(a, b):\n    x, y = a, b\n    while y:\n        x, y = y, x % y\n    return a * b // x'),
    34: M('O(log n)', 'O(1)'), 35: M('O(n)', 'O(1)'), 36: M('O(n)', 'O(1)'), 37: M('O(log n)', 'O(1)'),
    38: M("O(n log n)", "O(n)", "def kth_largest(arr, n, k):\n    ordered = sorted(arr)\n    ordered.reverse()\n    return ordered[k - 1]"), 39: M('O(n)', 'O(n)'),
    40: M('O(n)', 'O(1)', 'def max_subarray_sum(arr, n):\n    best = current = arr[0]\n    for i in range(1, n):\n        current = max(arr[i], current + arr[i])\n        best = max(best, current)\n    return best'),
    41: M('O(n²)', 'O(1)'), 42: M("O(n)", "O(n)", "def is_anagram(s1, s2):\n    if len(s1) != len(s2):\n        return False\n    counts = {}\n    for c in s1:\n        counts[c] = counts.get(c, 0) + 1\n    for c in s2:\n        counts[c] = counts.get(c, 0) - 1\n        if counts[c] < 0:\n            return False\n    return True"), 43: M("O(n)", "O(n)", "def count_distinct(arr, n):\n    seen = set()\n    for x in arr:\n        seen.add(x)\n    return len(seen)"), 44: M('O(n)', 'O(n)'),
    45: M('O(r·c)', 'O(r + c)'), 46: M("O(r·c)", "O(r·c)", "def transpose(matrix):\n    rows = len(matrix)\n    cols = len(matrix[0])\n    result = []\n    for c in range(cols):\n        new_row = []\n        for r in range(rows):\n            new_row.append(matrix[r][c])\n        result.append(new_row)\n    return result"), 47: M("O(n log n)", "O(n)", "def common_in_three(arr1, arr2, arr3):\n    set2 = set(arr2)\n    set3 = set(arr3)\n    result = set()\n    for x in arr1:\n        if x in set2 and x in set3:\n            result.add(x)\n    return sorted(result)"),
    48: M('O(log n)', 'O(1)'), 49: M('O(log n)', 'O(1)'), 50: M('O(n)', 'O(n)')
  };

  /* wrong-answer pool for the complexity MCQ, ordered from fastest to slowest */
  const COMPLEXITY_SCALE = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log log n)', 'O(n log n)', 'O(n + m)', 'O(r + c)', 'O(r·c)', 'O(n²)', 'O(2ⁿ)'];

  return { UNITS, META, COMPLEXITY_SCALE };
})();
