/* SOURCE of the built-in lessons (js/29-lessons-builtin.js is generated from this by `npm run gen:lessons`).
   Visuals of type "trace"/"calltree" are programs / inputs; the generator runs real Python to verify the code
   and records the traces. Edit here, never the generated file. */
const S='cf-lesson/1';
module.exports=[
{ id:'bi-recursion', script:{ schema:S, title:'Recursion: Calls Within Calls', icon:'🪆', minutes:10,
 imagine:'Nesting dolls. To open the big doll you open a smaller one inside, and a smaller one inside that, until you reach the tiny doll that does not open. Then you put them back together from the inside out.',
 objectives:['Explain what a base case is and why every recursion needs one','Follow a recursive call stack as it grows and shrinks','Write a small recursive function'],
 curiosity:{ q:'What happens if a recursive function has no base case?', a:'It keeps calling itself forever. Python stops it after about 1000 calls with a RecursionError, so the computer does not freeze.', deeper:'Every call waits in memory on the call stack. That is why deep recursion costs space, and why some problems are better solved with a loop.' },
 ideas:[
  { title:'A function that calls itself', text:'A recursive function solves a big problem by handing a slightly smaller copy of the same problem to itself, then using that answer.', code:'def count_down(n):\n    if n == 0:\n        return\n    print(n)\n    count_down(n - 1)' },
  { title:'The base case stops it', text:'The base case is the smallest problem you can answer directly, like the tiny doll. Without it the calls never end. Always write it first.' },
  { title:'The call stack', text:'Each call waits for the one it started. Python keeps these waiting calls in a stack: the newest is on top. When the base case returns, the answers flow back down one call at a time.' },
  { title:'Build the answer on the way back', text:'factorial(3) is 3 times factorial(2). That needs factorial(1), which is 1. Then 2 times 1 is 2, and 3 times 2 is 6.', code:'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)' }
 ],
 visuals:[
  { type:'trace', title:'factorial(3): the stack grows, then shrinks', code:['def fact(n):','    if n <= 1:','        return 1','    return n * fact(n - 1)','print(fact(3))'], notes:['Define the function. Nothing runs yet.','Is this the smallest problem? Check the base case.','Base case: answer directly, no more calls.','Not the base case: multiply n by the answer of a smaller call.','Start by calling fact(3) and print what it returns.'] },
  { type:'trace', title:'count_down(3): a call for every step', code:['def count_down(n):','    if n == 0:','        print("liftoff")','        return','    print(n)','    count_down(n - 1)','count_down(3)'], notes:['Define the function.','The base case test.','Base case reached: print the last word.','Return so no more calls are made.','Print the current number before going deeper.','Call itself with a smaller number.','Start the countdown at 3.'] }
,
  { type:'calltree', title:'fib(4): every call, as a tree', fn:'fib', n:4 }
 ],
 code:{ lines:['def fact(n):','    if n <= 1:','        return 1','    return n * fact(n - 1)','print(fact(4))'], notes:['A function that will call itself.','Check for the smallest problem first.','The base case returns a plain answer.','Everything else shrinks the problem by one and trusts the smaller call.','This prints 24, which is 4 x 3 x 2 x 1.'] },
 practice:{
  complexity:[
   { title:'Recursive sum of a list', code:'def total(nums, i=0):\n    if i == len(nums):\n        return 0\n    return nums[i] + total(nums, i + 1)', time:'O(n)', space:'O(n)' },
   { title:'Naive Fibonacci', code:'def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)', time:'O(2ⁿ)', space:'O(n)' },
   { title:'Power by halving', code:'def power(base, exp):\n    if exp == 0:\n        return 1\n    half = power(base, exp // 2)\n    if exp % 2 == 0:\n        return half * half\n    return half * half * base', time:'O(log n)', space:'O(log n)' }
  ],
  predict:{ title:'What does it return?', code:'def f(n):\n    if n == 0:\n        return 0\n    return n + f(n - 1)\nprint(f(4))', output:'10', wrong:['24','4','6'] },
  order:{ title:'Sum of digits', statement:'Return the sum of the digits of a whole number, using recursion.', code:'def sum_digits(n):\n    if n < 10:\n        return n\n    last = n % 10\n    rest = sum_digits(n // 10)\n    return last + rest' },
  fill:{ title:'Factorial', statement:'Return n x (n-1) x ... x 1, using recursion.', code:'def factorial(n):\n    if n <= 1:\n        return 1\n    smaller = factorial(n - 1)\n    return n * smaller' },
  boss:{ title:'Reverse a text', statement:'Write reverse_text(s) that returns the text s backwards. Use recursion: the answer is the reverse of everything after the first letter, followed by the first letter.', input:"reverse_text('abc')", output:"'cba'", model:'def reverse_text(s):\n    if len(s) <= 1:\n        return s\n    return reverse_text(s[1:]) + s[0]', explanation:'The base case is a text of 0 or 1 letters, which is already reversed. Otherwise reverse the rest and put the first letter at the end.',
   tests:[{call:"reverse_text('abc')",expect:"'cba'"},{call:"reverse_text('')",expect:"''"},{call:"reverse_text('a')",expect:"'a'"},{call:"reverse_text('hello')",expect:"'olleh'"},{call:"reverse_text('ab')",expect:"'ba'"}] }
 }}},

{ id:'bi-stacks-queues', script:{ schema:S, title:'Stacks and Queues', icon:'🥞', minutes:10,
 imagine:'A stack of plates: you add on top and take from the top, so the last plate in is the first out. A queue is a line at a coffee shop: the first person to arrive is the first one served.',
 objectives:['Tell a stack (last in, first out) from a queue (first in, first out)','Use a Python list as a stack','Use a stack to check matching brackets'],
 curiosity:{ q:'Why does your browser Back button work like a stack?', a:'Each page you visit is pushed on top. Back pops the newest one off, so you return to the page before it.', deeper:'Undo in an editor, the call stack and bracket checking all use stacks. Printers, queues of tasks and breadth-first search use queues.' },
 ideas:[
  { title:'Stack: last in, first out', text:'A stack has two moves. Push puts a value on top, pop takes the top value off. In Python a list does this with append and pop.', code:'stack = []\nstack.append(1)\nstack.append(2)\nstack.pop()' },
  { title:'Queue: first in, first out', text:'A queue adds at the back and takes from the front. With a list the front is index 0, so you take it with pop(0).', code:'queue = ["A", "B"]\nqueue.append("C")\nqueue.pop(0)' },
  { title:'Why pop(0) is slow', text:'Removing from the front of a list makes every other item shuffle one place left, so it costs O(n). The tool for real queues is collections.deque, where both ends are fast.' },
  { title:'Stacks check brackets', text:'Push every opening bracket. Each closing bracket must match the one on top, so pop it. If the stack is empty at the end, the brackets were balanced.' }
 ],
 visuals:[
  { type:'trace', title:'A stack: push, push, push, pop, pop', code:['stack = []','stack.append(1)','stack.append(2)','stack.append(3)','top = stack.pop()','top = stack.pop()'], notes:['An empty stack.','Push 1.','Push 2 on top of it.','Push 3 on top.','Pop: the newest value, 3, comes off.','Pop again: now 2 comes off.'] },
  { type:'trace', title:'A queue: the first one in is served first', code:['queue = []','queue.append("A")','queue.append("B")','queue.append("C")','first = queue.pop(0)','second = queue.pop(0)'], notes:['An empty queue.','A joins the back.','B joins behind A.','C joins at the back.','The front item, A, is served.','Then B is served.'] },
  { type:'trace', title:'Brackets: push on open, pop on close', code:['stack = []','for ch in "(()":','    if ch == "(":','        stack.append(ch)','    else:','        stack.pop()'], notes:['An empty stack to hold open brackets.','Look at one character at a time.','Is it an opening bracket?','Yes: push it.','Otherwise it is a closing bracket.','Pop the matching opening bracket.'] }
 ],
 code:{ lines:['stack = []','stack.append("a")','stack.append("b")','print(stack.pop())','print(stack)'], notes:['An empty stack.','Push "a".','Push "b" on top.','Pop and print the top item, which is b.','Only "a" is left.'] },
 practice:{
  complexity:[
   { title:'Push then pop', code:'def push_pop(stack, x):\n    stack.append(x)\n    return stack.pop()', time:'O(1)', space:'O(1)' },
   { title:'Serve the front of a list queue', code:'def serve(queue):\n    return queue.pop(0)', time:'O(n)', space:'O(1)' },
   { title:'Reverse with a stack', code:'def reverse_all(items):\n    stack = []\n    for x in items:\n        stack.append(x)\n    out = []\n    while stack:\n        out.append(stack.pop())\n    return out', time:'O(n)', space:'O(n)' }
  ],
  predict:{ title:'What is in the stack?', code:'s = []\ns.append(1)\ns.append(2)\ns.append(3)\ns.pop()\ns.append(4)\nprint(s)', output:'[1, 2, 4]', wrong:['[1, 2, 3, 4]','[2, 3, 4]','[1, 2, 3]'] },
  order:{ title:'Balanced brackets', statement:'Return True if every ( has a matching ) in the right order.', code:'def is_balanced(text):\n    stack = []\n    for ch in text:\n        if ch == "(":\n            stack.append(ch)\n        elif ch == ")":\n            if not stack:\n                return False\n            stack.pop()\n    return len(stack) == 0' },
  fill:{ title:'Reverse with a stack', statement:'Return the items in reverse order by pushing them all, then popping them all.', code:'def reverse_with_stack(items):\n    stack = []\n    for x in items:\n        stack.append(x)\n    result = []\n    while stack:\n        result.append(stack.pop())\n    return result' },
  boss:{ title:'Undo the actions', statement:'Write apply_actions(actions) for a list of strings. Every string adds an action to the history, except "undo", which removes the most recent action (and does nothing if the history is empty). Return the history.', input:"apply_actions(['a', 'b', 'undo', 'c'])", output:"['a', 'c']", model:'def apply_actions(actions):\n    history = []\n    for a in actions:\n        if a == "undo":\n            if history:\n                history.pop()\n        else:\n            history.append(a)\n    return history', explanation:'The history is a stack: new actions are pushed, and undo pops the newest one.',
   tests:[{call:"apply_actions(['a', 'b', 'undo', 'c'])",expect:"['a', 'c']"},{call:"apply_actions(['x'])",expect:"['x']"},{call:"apply_actions(['a', 'undo'])",expect:'[]'},{call:"apply_actions(['undo', 'a'])",expect:"['a']"},{call:"apply_actions(['a', 'b', 'c', 'undo', 'undo'])",expect:"['a']"}] }
 }}},

{ id:'bi-binary-search', script:{ schema:S, title:'Binary Search', icon:'🔍', minutes:10,
 imagine:'Guess a number from 1 to 100. If you always guess the middle and are told higher or lower, you throw away half of the numbers every time. Seven guesses are enough for any number.',
 objectives:['Explain why binary search needs a sorted list','Move the low and high pointers correctly','Say why it takes O(log n) steps'],
 curiosity:{ q:'How many guesses does it take to find one name among a billion?', a:'About 30. Each guess halves what is left, and a billion halved 30 times reaches 1.', deeper:'Binary search also works on answers, not only lists: you can binary search for the biggest value that still passes a test.' },
 ideas:[
  { title:'Look in the middle', text:'The list must be sorted. Compare the target with the middle item. If it matches you are done. If the target is bigger, everything left of the middle is too small, so ignore it.' },
  { title:'Two pointers: lo and hi', text:'lo and hi mark the part of the list still in play. The middle is (lo + hi) // 2. Move lo up past the middle, or hi down below it, to halve the range.', code:'mid = (lo + hi) // 2\nif nums[mid] < target:\n    lo = mid + 1\nelse:\n    hi = mid - 1' },
  { title:'When to stop', text:'Keep going while lo <= hi. When lo passes hi, nothing is left, so the target is not in the list.' },
  { title:'Why it is fast', text:'Every step halves the range, so the steps needed grow like log n. A list of 1,000,000 items needs about 20 steps, a linear search might need a million.' }
 ],
 visuals:[
  { type:'trace', title:'Find 11 in a sorted list', code:['nums = [1, 3, 5, 7, 9, 11, 13]','target = 11','lo = 0','hi = len(nums) - 1','while lo <= hi:','    mid = (lo + hi) // 2','    if nums[mid] == target:','        print(mid)','        break','    elif nums[mid] < target:','        lo = mid + 1','    else:','        hi = mid - 1'], notes:['A sorted list.','The value we want.','lo starts at the first index.','hi starts at the last index.','Keep going while something is left in range.','Look at the middle index.','Is the middle the target?','Found it: print its index.','Stop the loop.','The middle is too small, so the target is to the right.','Throw away the left half.','The middle is too big, so the target is to the left.','Throw away the right half.'] },
  { type:'bigo', title:'Halving beats scanning', curves:['O(1)','O(log n)','O(n)'], highlight:'O(log n)' }
 ],
 code:{ lines:['nums = [2, 4, 6, 8, 10]','lo = 0','hi = len(nums) - 1','mid = (lo + hi) // 2','print(nums[mid])'], notes:['A sorted list.','lo is the first index.','hi is the last index.','The middle index is 2.','The middle item is 6.'] },
 practice:{
  complexity:[
   { title:'Linear search', code:'def find(nums, target):\n    for i in range(len(nums)):\n        if nums[i] == target:\n            return i\n    return -1', time:'O(n)', space:'O(1)' },
   { title:'Count the halvings', code:'def halvings(n):\n    count = 0\n    while n > 1:\n        n = n // 2\n        count += 1\n    return count', time:'O(log n)', space:'O(1)' },
   { title:'Pairs with a loop in a loop', code:'def has_pair(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return True\n    return False', time:'O(n²)', space:'O(1)' }
  ],
  predict:{ title:'Where does lo end up?', code:'nums = [1, 3, 5, 7, 9]\nlo, hi = 0, 4\nmid = (lo + hi) // 2\nif nums[mid] < 8:\n    lo = mid + 1\nprint(lo)', output:'3', wrong:['2','4','0'] },
  order:{ title:'Integer square root', statement:'Return the biggest whole number whose square is at most n, using binary search on the answer.', code:'def sqrt_floor(n):\n    lo = 0\n    hi = n\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if mid * mid <= n:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return hi' },
  fill:{ title:'Binary search', statement:'Return the index of target in the sorted list, or -1 if it is missing.', code:'def binary_search(nums, target):\n    lo = 0\n    hi = len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1' },
  boss:{ title:'Where does it fit?', statement:'Write search_insert(nums, target) for a sorted list of different numbers. Return the index of target if it is there, otherwise the index where it would be inserted to keep the list sorted. Use binary search.', input:'search_insert([1, 3, 5, 6], 5)', output:'2', model:'def search_insert(nums, target):\n    lo = 0\n    hi = len(nums)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo', explanation:'Keep the invariant that everything left of lo is smaller than target. When lo meets hi, lo is the first position that is not smaller.',
   tests:[{call:'search_insert([1, 3, 5, 6], 5)',expect:'2'},{call:'search_insert([1, 3, 5, 6], 2)',expect:'1'},{call:'search_insert([1, 3, 5, 6], 7)',expect:'4'},{call:'search_insert([1, 3, 5, 6], 0)',expect:'0'},{call:'search_insert([], 3)',expect:'0'}] }
 }}},

{ id:'bi-two-pointers', script:{ schema:S, title:'Two Pointers', icon:'👉', minutes:10,
 imagine:'Two people start at opposite ends of a hallway and walk toward each other, checking something at every step. They meet in the middle after one pass, so nobody has to walk the whole hallway twice.',
 objectives:['Place two pointers at the ends and move them inward','Decide which pointer to move from what you see','Explain why this is O(n) instead of O(n²)'],
 curiosity:{ q:'Why can two pointers find a pair that adds up to a target without trying every pair?', a:'Because the list is sorted. If the sum is too small only moving the left pointer up can grow it, and if it is too big only moving the right one down can shrink it.', deeper:'The same idea powers merging sorted lists, removing duplicates in place and the sliding window technique.' },
 ideas:[
  { title:'Pointers are just indexes', text:'A pointer is a variable that holds a position. left starts at 0 and right starts at the last index. Each step you look at both items.', code:'left = 0\nright = len(word) - 1' },
  { title:'Walk toward each other', text:'After checking, move left up and right down. Stop when they meet. Every item is looked at once, so the work is O(n).' },
  { title:'Let the values decide', text:'In a sorted list, add the two ends. Too small? Move left up for a bigger number. Too big? Move right down for a smaller one. Equal? Done.' },
  { title:'Slow and fast', text:'Another pattern: both pointers go the same way. fast looks at every item, slow marks where the next kept item goes. It removes duplicates in place.' }
 ],
 visuals:[
  { type:'trace', title:'Is "level" a palindrome?', code:['word = "level"','left = 0','right = len(word) - 1','while left < right:','    if word[left] != word[right]:','        print("no")','        break','    left += 1','    right -= 1'], notes:['The word to check.','left starts at the first letter.','right starts at the last letter.','Keep going until the pointers meet.','Do the two letters differ?','They differ, so it is not a palindrome.','Stop early.','Move left one step in.','Move right one step in.'] },
  { type:'trace', title:'Sorted pair that adds up to 10', code:['nums = [1, 3, 4, 6, 8]','target = 10','left = 0','right = len(nums) - 1','while left < right:','    total = nums[left] + nums[right]','    if total == target:','        print(left, right)','        break','    elif total < target:','        left += 1','    else:','        right -= 1'], notes:['A sorted list.','The sum we want.','left at the smallest number.','right at the biggest number.','Keep going until they meet.','Add the two ends.','Is this the sum we want?','Yes: print both positions.','Stop.','Too small: move left up to get a bigger number.','Step left up.','Too big: move right down to get a smaller number.','Step right down.'] }
 ],
 code:{ lines:['nums = [1, 2, 3, 4, 5]','left = 0','right = len(nums) - 1','while left < right:','    nums[left], nums[right] = nums[right], nums[left]','    left += 1','    right -= 1','print(nums)'], notes:['A list to reverse.','left at the start.','right at the end.','Stop when they meet in the middle.','Swap the two items.','Move left in.','Move right in.','The list is reversed.'] },
 practice:{
  complexity:[
   { title:'Palindrome check', code:'def is_palindrome(word):\n    left = 0\n    right = len(word) - 1\n    while left < right:\n        if word[left] != word[right]:\n            return False\n        left += 1\n        right -= 1\n    return True', time:'O(n)', space:'O(1)' },
   { title:'Sorted pair sum', code:'def pair_sum(nums, target):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        total = nums[left] + nums[right]\n        if total == target:\n            return True\n        if total < target:\n            left += 1\n        else:\n            right -= 1\n    return False', time:'O(n)', space:'O(1)' },
   { title:'Every pair by brute force', code:'def pair_sum_slow(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return True\n    return False', time:'O(n²)', space:'O(1)' }
  ],
  predict:{ title:'Reverse in place', code:'nums = [1, 2, 3, 4, 5]\nleft, right = 0, len(nums) - 1\nwhile left < right:\n    nums[left], nums[right] = nums[right], nums[left]\n    left += 1\n    right -= 1\nprint(nums)', output:'[5, 4, 3, 2, 1]', wrong:['[1, 2, 3, 4, 5]','[5, 2, 3, 4, 1]','[2, 1, 4, 3, 5]'] },
  order:{ title:'Remove duplicates', statement:'The list is sorted. Remove duplicates in place and return how many different values there are.', code:'def dedupe_sorted(nums):\n    if not nums:\n        return 0\n    slow = 0\n    for fast in range(1, len(nums)):\n        if nums[fast] != nums[slow]:\n            slow += 1\n            nums[slow] = nums[fast]\n    return slow + 1' },
  fill:{ title:'Palindrome', statement:'Return True if the word reads the same forwards and backwards.', code:'def is_palindrome(word):\n    left = 0\n    right = len(word) - 1\n    while left < right:\n        if word[left] != word[right]:\n            return False\n        left += 1\n        right -= 1\n    return True' },
  boss:{ title:'Pair with a sum', statement:'Write pair_with_sum(nums, target) for a sorted list. Return the two indexes [i, j] with i < j whose values add up to target, or [] if there is no such pair. Use two pointers.', input:'pair_with_sum([1, 3, 4, 6, 8], 10)', output:'[2, 3]', model:'def pair_with_sum(nums, target):\n    left = 0\n    right = len(nums) - 1\n    while left < right:\n        total = nums[left] + nums[right]\n        if total == target:\n            return [left, right]\n        if total < target:\n            left += 1\n        else:\n            right -= 1\n    return []', explanation:'If the sum is too small the left pointer must move up, if too big the right one must move down. Each step discards one index for good.',
   tests:[{call:'pair_with_sum([1, 3, 4, 6, 8], 10)',expect:'[2, 3]'},{call:'pair_with_sum([1, 2, 3, 4, 6], 6)',expect:'[1, 3]'},{call:'pair_with_sum([1, 2], 5)',expect:'[]'},{call:'pair_with_sum([], 3)',expect:'[]'},{call:'pair_with_sum([-4, -1, 0, 3, 5], 1)',expect:'[0, 4]'}] }
 }}},
{ id:'bi-listening', script:{ schema:'cf-lesson/2', kind:'general', title:'Active Listening', icon:'👂', minutes:8,
 imagine:'You are telling a friend about a bad day. One friend looks at their phone and says "mm-hm". Another puts the phone down, nods, and says "That sounds exhausting, what happened after the meeting?" Same words from you, completely different feeling.',
 objectives:['Describe the three parts of active listening','Replace common listening blockers with better responses','Use a paraphrase to check you understood'],
 curiosity:{ q:'Why do people feel understood when you simply repeat their point back?', a:'A paraphrase shows you were following and gives them a chance to correct you. Feeling heard lowers tension, even before any problem is solved.', deeper:'Most people listen to reply, not to understand. A short paraphrase forces you to stop planning your answer and actually process theirs.' },
 ideas:[
  { title:'Give full attention', text:'Put away distractions, face the person and let them finish. Silence is fine; you do not have to fill every pause.', example:'"Let me close my laptop so I can focus. Go ahead."' },
  { title:'Paraphrase what you heard', text:'Say the main point back in your own words. It proves you listened and lets them fix any misunderstanding.', example:'"So you are worried the deadline is too tight, and you did not feel heard in the meeting. Is that right?"' },
  { title:'Ask open questions', text:'Questions that cannot be answered with yes or no invite the person to explain more. Start with what, how or tell me about.', example:'"What was the hardest part of that conversation?"' }
 ],
 visuals:[
  { type:'compare', title:'Blockers and better replies', leftLabel:'Instead of', rightLabel:'Try', rows:[
   { left:'"Don\'t worry, it will be fine."', right:'"That sounds stressful. What worries you most?"', why:'Brushing off the feeling makes people feel dismissed. Naming it shows you take it seriously.' },
   { left:'"Same thing happened to me once..."', right:'"Tell me more about what happened."', why:'Turning the story to yourself takes the spotlight away from them.' },
   { left:'"You should just talk to your boss."', right:'"What do you think would help here?"', why:'Advice too early skips understanding. Let them find their own answer first.' }
  ] },
  { type:'flow', title:'A listening loop', steps:[
   { title:'Stop and look', text:'Put distractions away and turn towards the speaker.' },
   { title:'Let them finish', text:'Do not interrupt or plan your reply while they talk.' },
   { title:'Paraphrase', text:'Say the main point back in your own words.' },
   { title:'Ask an open question', text:'Invite them to say more before you give any advice.' }
  ] },
  { type:'scenario', title:'Try it', situation:'A teammate says: "I am so behind on this report and nobody seems to care."', choices:[
   { text:'"Everyone is busy, you will catch up."', reply:'"Yeah... I guess." They go quiet.', good:false, why:'It dismisses the feeling and ends the conversation.' },
   { text:'"You feel unsupported and the report is piling up. What would help most right now?"', reply:'"Exactly. Could you review the first section for me?"', good:true, why:'A paraphrase plus an open question leads to a concrete request.' }
  ] }
 ],
 example:{ lines:['Sam: I missed the deadline and my manager was not happy.','You: It sounds like you are upset about the deadline and how your manager reacted.','Sam: Yes, and I had asked for help twice.','You: What happened when you asked?'], notes:['Sam shares a problem.','A paraphrase of the main feeling, no advice yet.','Sam adds the detail he was waiting to be asked about.','An open question that keeps Sam talking.'] },
 practice:{
  quiz:[
   { title:'Paraphrase', question:'What is the main purpose of paraphrasing?', options:['To check you understood and show you are listening','To win the argument','To fill the silence','To give your own opinion'], correct:0, why:'A paraphrase confirms understanding and lets the speaker correct you.' },
   { title:'Open questions', question:'Which is an open question?', options:['Did that upset you?','Was it the deadline?','What was the hardest part?','You were angry, right?'], correct:2, why:'Open questions cannot be answered with yes or no.' },
   { title:'Attention', question:'A friend starts a long story while you are on your phone. What helps most?', options:['Keep scrolling and say "uh-huh"','Put the phone away and face them','Tell them to be quick','Change the subject'], correct:1, why:'Full attention is the first step of active listening.' }
  ],
  scenario:{ title:'The tough day', situation:'Your sister says: "Work was awful today. My boss ignored everything I said."', question:'What is the best thing to say first?', options:['"You should look for a new job."','"That sounds frustrating. What happened?"','"At my job it is worse."','"Bosses are all like that."'], correct:1, why:'It names the feeling and invites her to explain. Advice can wait.' },
  order:{ title:'Listening loop', statement:'Put the steps in the right order.', steps:['Put distractions away','Let the person finish','Paraphrase the main point','Ask an open question'] },
  fill:{ title:'Key words', statement:'Fill in the missing words.', text:'Active listening starts with full ___. Then you ___ the main point in your own words and ask an ___ question.', answers:['attention','paraphrase','open'], extra:['advice','closed'] },
  boss:{ title:'Your turn', prompt:'A colleague says: "I feel like my ideas are never taken seriously in meetings." Write a short reply that uses active listening.', model:'That sounds really discouraging, especially when you put effort into your ideas. It seems like you want your input to count in meetings. What happened the last time you shared an idea?', rubric:['Names or reflects the feeling','Paraphrases the main point','Asks an open question','Gives no advice or opinion yet'] }
 }
}}
];
