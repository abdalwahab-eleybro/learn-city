/* ═══════════════════════════════════════════════════════════ */
/*  15c-curiosity.js — ✏️ EDITABLE "Curiosity" cards for Learn  */
/*                                                              */
/*  Each lesson gets a teaser question on its intro screen      */
/*  (tap to reveal the answer) and a "go deeper" fact on the    */
/*  completion screen. Pure DATA + two tiny renderers.          */
/*  Add/edit entries in FACTS, keyed by lesson id.              */
/*  Depends on: nothing. Loaded BEFORE 15-lessons.js.           */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Curiosity = (() => {
  const FACTS = {
    f1: {
      q: 'Why do so many array tricks use just two index variables?',
      a: 'An index is a cheap "finger" on the array. Moving a finger costs O(1), so two fingers can replace a whole nested loop. Most patterns in this course are just clever finger choreography.',
      deeper: 'Sorting algorithms like quicksort and merge sort are built from the same primitives you just learned: swaps, read/write pointers and running state.'
    },
    p1: {
      q: 'If the array is sorted, why can you safely throw away half the pairs after one comparison?',
      a: 'If the sum is too big, the right pointer paired with ANY left value that is at least as large would be even bigger. So that right element can never be part of an answer, and you can discard it for good.',
      deeper: 'This is the same "eliminate with a proof" idea behind binary search. Two-pointer solutions turn an O(n²) search into O(n) because every move is justified.'
    },
    p4: {
      q: 'How does a network router measure "requests in the last 60 seconds" without re-counting everything?',
      a: 'It keeps a window: add the new request on the right, drop expired ones from the left, and update a running total. Nothing is ever recounted.',
      deeper: 'TCP uses a sliding window too: it decides how many packets can be in flight at once. Same idea, different century.'
    },
    p6: {
      q: 'Why do spreadsheets and image software precompute running totals?',
      a: 'With a prefix-sum table, the sum of ANY range is one subtraction: prefix[r] - prefix[l-1]. You pay O(n) once and every later query costs O(1).',
      deeper: 'In 2D this becomes the "summed-area table" (integral image), the trick that let early face detectors run in real time.'
    },
    p2: {
      q: 'How can you delete items from an array without allocating a second array?',
      a: 'Use a read pointer that scans everything and a write pointer that only advances when an item is kept. Kept items overwrite the junk behind the reader.',
      deeper: 'Database engines and garbage collectors use the same "compact in place" move to squeeze out dead entries.'
    },
    p3: {
      q: 'Why does filling an array from the back avoid overwriting data you still need?',
      a: 'The back of the buffer is empty space. If you write there first, the values you have not read yet are never touched.',
      deeper: 'Memory-copy routines (like memmove) pick the copy direction for exactly this reason when source and destination overlap.'
    },
    guard: {
      q: 'What is the real bug behind many "index out of range" crashes?',
      a: 'Checking a condition too late. A guard like "i < n" must run BEFORE you touch arr[i], and order matters: in "i < n and arr[i] == x", short-circuit evaluation protects you.',
      deeper: 'Short-circuit guards are a classic source of security bugs in C. A missing bounds check is behind many famous vulnerabilities.'
    },
    p5: {
      q: 'Why is merging two sorted lists the heart of merge sort?',
      a: 'Merging needs only one pass: always take the smaller front item. Merge sort just splits the list down to single items and merges back up.',
      deeper: 'Merging is also how big data is sorted: files too large for memory are sorted in chunks, then merged from disk.'
    },
    p7: {
      q: 'What is the best time to stop adding to a running total?',
      a: 'When the total so far is negative. A negative prefix can only drag any later subarray down, so starting fresh is always at least as good. That is Kadane\'s whole idea.',
      deeper: 'The problem came from pattern detection in digitized images, and Jay Kadane found the linear-time solution in 1984. It is a famous example of dynamic programming with O(1) memory.'
    },
    x1: {
      q: 'The Dutch National Flag problem: why is it named after a flag?',
      a: 'Edsger Dijkstra posed it with the three-colour Dutch flag: red, white and blue balls must be sorted into three bands in one pass.',
      deeper: 'Quicksort implementations use three-way partitioning to handle many duplicate keys quickly.'
    },
    x2: {
      q: 'Why does expanding outward from a center find palindromes better than checking every substring?',
      a: 'A palindrome is defined by its center. Growing from each center stops the instant characters differ, so you skip huge amounts of pointless checking.',
      deeper: 'Manacher\'s algorithm refines this to O(n) by reusing mirror information from earlier centers.'
    },
    x8: {
      q: 'How can a hash map answer "how many subarrays sum to k" in one pass?',
      a: 'A subarray sums to k exactly when two prefix sums differ by k. For each new prefix, you ask the map how many earlier prefixes equal (prefix - k).',
      deeper: 'This turns a range question into a lookup question, a trick that appears again and again in interview problems and in data analytics.'
    },
    x5: {
      q: 'How do you count windows with EXACTLY k distinct items using only an "at most" counter?',
      a: 'exactly(k) = atMost(k) - atMost(k - 1). Counting "at most" is easy with a sliding window, and the subtraction leaves just the exact ones.',
      deeper: 'Complement counting is a classic combinatorics move: count the easy superset and subtract the part you do not want.'
    }
  };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* teaser on the intro screen: question first, tap to reveal */
  function introHTML(id) {
    const f = FACTS[id];
    if (!f) return '';
    return `<div class="cur-card lsn-anim-in d2" id="curCard">
      <div class="cur-kicker">🧠 Curiosity</div>
      <div class="cur-q">${esc(f.q)}</div>
      <button class="btn ghost cur-btn" id="curReveal">Think, then tap to reveal</button>
      <div class="cur-a" id="curAnswer" hidden>${esc(f.a)}</div>
    </div>`;
  }
  function wireIntro(root, id) {
    const f = FACTS[id], b = root.querySelector('#curReveal'), a = root.querySelector('#curAnswer');
    if (!f || !b || !a) return;
    b.addEventListener('click', () => { a.hidden = false; b.hidden = true; });
  }

  /* deeper fact on the completion screen */
  function doneHTML(id) {
    const f = FACTS[id];
    if (!f || !f.deeper) return '';
    return `<div class="cur-card cur-deeper"><div class="cur-kicker">🔭 Go deeper</div><div class="cur-a">${esc(f.deeper)}</div></div>`;
  }

  return { FACTS, introHTML, wireIntro, doneHTML };
})();
