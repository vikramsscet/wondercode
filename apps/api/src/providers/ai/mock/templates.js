// Deterministic sample projects returned by MockAIProvider. They are real, self-contained
// HTML/CSS/JavaScript with no external scripts, styles, fonts or network access.

const page = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
${body}
    <script src="script.js"></script>
  </body>
</html>
`;

const BASE_CSS = `/* Sample style: change the colours and see what happens! */
body {
  font-family: sans-serif;
  background: #f3f1ff;
  color: #1e1b2e;
  text-align: center;
  margin: 0;
  padding: 24px;
}

button {
  font-size: 1.1rem;
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: #5b48d6;
  color: white;
  cursor: pointer;
}
`;

export const TEMPLATES = {
  game: {
    title: 'My Star Catcher Game',
    description: 'Move a basket to catch falling stars.',
    features: ['Move the basket left and right', 'Catch falling stars', 'Increase the score'],
    concepts: [
      'HTML elements',
      'CSS positioning',
      'JavaScript variables',
      'JavaScript events',
      'Conditions',
    ],
    summary: {
      en: 'You will make a game where a basket catches falling stars.',
      hi: 'तुम एक ऐसा गेम बनाओगे जिसमें टोकरी गिरते हुए सितारे पकड़ेगी।',
      hinglish: 'Tum ek game banaoge jisme basket girte hue stars pakdegi.',
    },
    files: {
      'index.html': page(
        'Star Catcher',
        `    <h1>Star Catcher</h1>
    <p>Score: <span id="score">0</span></p>
    <div id="game">
      <div id="star">⭐</div>
      <div id="basket">🧺</div>
    </div>
    <p>Use the left and right arrow keys, or the buttons.</p>
    <button id="left">Left</button>
    <button id="right">Right</button>`,
      ),
      'style.css': `${BASE_CSS}
#game {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 16px auto;
  background: white;
  border: 3px solid #5b48d6;
  overflow: hidden;
}

#star,
#basket {
  position: absolute;
  font-size: 32px;
}

#basket {
  bottom: 0;
}
`,
      'script.js': `// Variables remember things, like the score and where things are.
let score = 0;
let basketX = 130;
let starX = 140;
let starY = 0;

const scoreText = document.getElementById('score');
const basket = document.getElementById('basket');
const star = document.getElementById('star');

function moveBasket(amount) {
  basketX = Math.max(0, Math.min(268, basketX + amount));
  basket.style.left = basketX + 'px';
}

// Events: do something when a key is pressed.
document.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowLeft') moveBasket(-20);
  if (event.key === 'ArrowRight') moveBasket(20);
});
document.getElementById('left').addEventListener('click', function () { moveBasket(-20); });
document.getElementById('right').addEventListener('click', function () { moveBasket(20); });

function resetStar() {
  starY = 0;
  starX = Math.floor(Math.random() * 268);
}

// This runs again and again to make the star fall.
setInterval(function () {
  starY = starY + 5;
  // A condition: did the basket catch the star?
  if (starY > 260 && Math.abs(starX - basketX) < 40) {
    score = score + 1;
    scoreText.textContent = score;
    resetStar();
  } else if (starY > 300) {
    resetStar();
  }
  star.style.left = starX + 'px';
  star.style.top = starY + 'px';
}, 50);

moveBasket(0);
`,
    },
  },

  quiz: {
    title: 'My Animal Quiz',
    description: 'Answer fun questions and see your score.',
    features: ['Show one question at a time', 'Check each answer', 'Show the final score'],
    concepts: ['HTML elements', 'JavaScript variables', 'Lists (arrays)', 'Conditions'],
    summary: {
      en: 'You will make a quiz that checks your answers and counts your score.',
      hi: 'तुम एक क्विज़ बनाओगे जो तुम्हारे जवाब जाँचेगा और स्कोर गिनेगा।',
      hinglish: 'Tum ek quiz banaoge jo tumhare answers check karega aur score ginega.',
    },
    files: {
      'index.html': page(
        'Animal Quiz',
        `    <h1>Animal Quiz</h1>
    <h2 id="question"></h2>
    <div id="answers"></div>
    <p id="message"></p>
    <p>Score: <span id="score">0</span></p>`,
      ),
      'style.css': `${BASE_CSS}
#answers button {
  display: block;
  margin: 10px auto;
  min-width: 200px;
}
`,
      'script.js': `// A list of questions. Each one has the right answer's position.
const questions = [
  { text: 'Which animal says "meow"?', options: ['Dog', 'Cat', 'Cow'], answer: 1 },
  { text: 'Which animal has a long trunk?', options: ['Elephant', 'Tiger', 'Frog'], answer: 0 },
  { text: 'Which animal can fly?', options: ['Fish', 'Horse', 'Parrot'], answer: 2 },
];

let current = 0;
let score = 0;

const questionText = document.getElementById('question');
const answersBox = document.getElementById('answers');
const message = document.getElementById('message');
const scoreText = document.getElementById('score');

function showQuestion() {
  if (current >= questions.length) {
    questionText.textContent = 'All done! You scored ' + score + ' out of ' + questions.length;
    answersBox.innerHTML = '';
    return;
  }
  const q = questions[current];
  questionText.textContent = q.text;
  answersBox.innerHTML = '';
  q.options.forEach(function (option, index) {
    const button = document.createElement('button');
    button.textContent = option;
    button.addEventListener('click', function () { checkAnswer(index); });
    answersBox.appendChild(button);
  });
}

function checkAnswer(index) {
  // A condition: is the chosen answer the right one?
  if (index === questions[current].answer) {
    score = score + 1;
    message.textContent = 'Correct! 🎉';
  } else {
    message.textContent = 'Not quite. Try the next one!';
  }
  scoreText.textContent = score;
  current = current + 1;
  showQuestion();
}

showQuestion();
`,
    },
  },

  calculator: {
    title: 'My Calculator',
    description: 'Add, subtract, multiply and divide two numbers.',
    features: ['Type two numbers', 'Pick an operation', 'See the answer'],
    concepts: ['HTML elements', 'JavaScript variables', 'JavaScript events', 'Functions'],
    summary: {
      en: 'You will make a calculator that adds, subtracts, multiplies and divides.',
      hi: 'तुम एक कैलकुलेटर बनाओगे जो जोड़ता, घटाता, गुणा और भाग करता है।',
      hinglish: 'Tum ek calculator banaoge jo add, subtract, multiply aur divide karta hai.',
    },
    files: {
      'index.html': page(
        'Calculator',
        `    <h1>Calculator</h1>
    <input id="a" type="number" value="6" />
    <input id="b" type="number" value="3" />
    <div>
      <button data-op="+">+</button>
      <button data-op="-">−</button>
      <button data-op="*">×</button>
      <button data-op="/">÷</button>
    </div>
    <h2>Answer: <span id="result">?</span></h2>`,
      ),
      'style.css': `${BASE_CSS}
input {
  font-size: 1.2rem;
  width: 90px;
  padding: 8px;
  margin: 8px;
}

div button {
  margin: 4px;
}
`,
      'script.js': `// A function is a small recipe we can use again and again.
function calculate(a, b, operation) {
  if (operation === '+') return a + b;
  if (operation === '-') return a - b;
  if (operation === '*') return a * b;
  if (operation === '/') return b === 0 ? 'Cannot divide by 0' : a / b;
}

const buttons = document.querySelectorAll('button[data-op]');
const result = document.getElementById('result');

buttons.forEach(function (button) {
  button.addEventListener('click', function () {
    const a = Number(document.getElementById('a').value);
    const b = Number(document.getElementById('b').value);
    result.textContent = calculate(a, b, button.dataset.op);
  });
});
`,
    },
  },

  animation: {
    title: 'My Dancing Shape',
    description: 'A colourful shape that dances and changes colour when clicked.',
    features: ['A shape that moves by itself', 'Click to change its colour'],
    concepts: ['HTML elements', 'CSS animation', 'JavaScript events', 'JavaScript variables'],
    summary: {
      en: 'You will make a shape that dances and changes colour when you click it.',
      hi: 'तुम एक ऐसी आकृति बनाओगे जो नाचती है और क्लिक करने पर रंग बदलती है।',
      hinglish: 'Tum ek shape banaoge jo naachti hai aur click karne par colour badalti hai.',
    },
    files: {
      'index.html': page(
        'Dancing Shape',
        `    <h1>Click the shape!</h1>
    <div id="shape"></div>`,
      ),
      'style.css': `${BASE_CSS}
#shape {
  width: 100px;
  height: 100px;
  margin: 60px auto;
  background: #f25c54;
  border-radius: 20%;
  cursor: pointer;
  animation: dance 1.5s ease-in-out infinite;
}

@keyframes dance {
  0% { transform: translateX(-80px) rotate(0deg); }
  50% { transform: translateX(80px) rotate(180deg); }
  100% { transform: translateX(-80px) rotate(360deg); }
}
`,
      'script.js': `// A list of colours to pick from.
const colours = ['#f25c54', '#ffc93c', '#2bb673', '#5b48d6'];
let colourIndex = 0;

const shape = document.getElementById('shape');

shape.addEventListener('click', function () {
  colourIndex = (colourIndex + 1) % colours.length;
  shape.style.background = colours[colourIndex];
});
`,
    },
  },

  webpage: {
    title: 'My First Webpage',
    description: 'A friendly page with a heading, a message and a button.',
    features: ['A big heading', 'A message about me', 'A button that changes the message'],
    concepts: ['HTML elements', 'CSS colours', 'JavaScript events'],
    summary: {
      en: 'You will make your very first webpage with a button that changes a message.',
      hi: 'तुम अपना पहला वेबपेज बनाओगे जिसमें एक बटन संदेश बदलता है।',
      hinglish: 'Tum apna pehla webpage banaoge jisme ek button message badalta hai.',
    },
    files: {
      'index.html': page(
        'My First Webpage',
        `    <h1>Hello, world!</h1>
    <p id="message">This is my very first webpage.</p>
    <button id="change">Click me</button>`,
      ),
      'style.css': BASE_CSS,
      'script.js': `// Find the message and the button on the page.
const message = document.getElementById('message');
const button = document.getElementById('change');

// When the button is clicked, change the message.
button.addEventListener('click', function () {
  message.textContent = 'You clicked the button. Great job! 🎉';
});
`,
    },
  },
};

const LANGUAGE_BY_EXTENSION = { html: 'html', css: 'css', js: 'javascript' };
export const languageOf = (path) => LANGUAGE_BY_EXTENSION[path.split('.').pop()] ?? 'html';

// Keyword detection in English, Hindi and Hinglish.
const KEYWORDS = [
  ['game', /game|catch|play|star|खेल|गेम|khel/i],
  ['quiz', /quiz|question|trivia|क्विज़|क्विज|prashn|सवाल/i],
  ['calculator', /calculat|math|add|sum|कैलकुलेटर|जोड़/i],
  ['animation', /animat|dance|move|shape|एनिमेशन|नाच/i],
];
export const detectType = (prompt) => KEYWORDS.find(([, re]) => re.test(prompt))?.[0] ?? 'webpage';

// ----- concept explanations (en / hi / hinglish) -----
export const CONCEPTS = {
  variable: {
    name: 'variable',
    explanation: {
      en: 'This line creates a variable, a labelled box that remembers a value for later.',
      hi: 'यह लाइन एक वेरिएबल बनाती है, यानी एक नाम वाला डिब्बा जो कोई वैल्यू याद रखता है।',
      hinglish: 'Ye line ek variable banati hai, ek naam wala dabba jo value yaad rakhta hai.',
    },
    example: {
      en: 'Think of a scoreboard that remembers your points.',
      hi: 'इसे एक स्कोरबोर्ड की तरह समझो जो तुम्हारे पॉइंट याद रखता है।',
      hinglish: 'Isko ek scoreboard ki tarah samjho jo tumhare points yaad rakhta hai.',
    },
    tryThis: 'What do you think happens if you change the starting number?',
  },
  function: {
    name: 'function',
    explanation: {
      en: 'A function is a small recipe. You write the steps once and use them whenever you need.',
      hi: 'फ़ंक्शन एक छोटी रेसिपी है। तुम स्टेप एक बार लिखते हो और जब चाहो इस्तेमाल करते हो।',
      hinglish: 'Function ek chhoti recipe hai. Steps ek baar likho aur jab chaho use karo.',
    },
    example: {
      en: 'Like a recipe card you can cook from again and again.',
      hi: 'जैसे एक रेसिपी कार्ड जिससे तुम बार-बार खाना बना सकते हो।',
      hinglish: 'Jaise ek recipe card jisse tum baar-baar khana bana sakte ho.',
    },
    tryThis: 'Can you call this function a second time? What happens?',
  },
  event: {
    name: 'event',
    explanation: {
      en: 'This waits for something to happen, like a click or a key press, and then runs your code.',
      hi: 'यह इंतज़ार करता है कि कुछ हो, जैसे क्लिक या कीबोर्ड की कोई कुंजी, और फिर तुम्हारा कोड चलाता है।',
      hinglish:
        'Ye intezaar karta hai ki kuch ho, jaise click ya key press, aur phir tumhara code chalata hai.',
    },
    example: {
      en: 'Like a doorbell: nothing happens until someone presses it.',
      hi: 'जैसे दरवाज़े की घंटी: जब तक कोई दबाए नहीं, कुछ नहीं होता।',
      hinglish: 'Jaise doorbell: jab tak koi dabaye nahi, kuch nahi hota.',
    },
    tryThis: 'What happens if you click the button twice?',
  },
  condition: {
    name: 'condition',
    explanation: {
      en: 'An if checks a question. If the answer is yes, the code inside runs.',
      hi: 'if एक सवाल जाँचता है। अगर जवाब हाँ है, तो अंदर का कोड चलता है।',
      hinglish: 'if ek sawaal check karta hai. Agar jawab haan hai, to andar ka code chalta hai.',
    },
    example: {
      en: 'If it is raining, take an umbrella.',
      hi: 'अगर बारिश हो रही है, तो छाता ले लो।',
      hinglish: 'Agar baarish ho rahi hai, to chhata le lo.',
    },
    tryThis: 'What could you change so the condition is true more often?',
  },
  css: {
    name: 'CSS rule',
    explanation: {
      en: 'This is a style rule. It tells the page how something should look, like its colour or size.',
      hi: 'यह एक स्टाइल नियम है। यह पेज को बताता है कि कुछ कैसा दिखे, जैसे उसका रंग या आकार।',
      hinglish:
        'Ye ek style rule hai. Ye page ko batata hai ki kuch kaisa dikhe, jaise colour ya size.',
    },
    example: {
      en: 'Like choosing the colour of your clothes.',
      hi: 'जैसे अपने कपड़ों का रंग चुनना।',
      hinglish: 'Jaise apne kapdon ka colour chunna.',
    },
    tryThis: 'Change one colour. What do you see?',
  },
  html: {
    name: 'HTML element',
    explanation: {
      en: 'This is an HTML element. It puts something on the page, like a heading, text or a button.',
      hi: 'यह एक HTML एलिमेंट है। यह पेज पर कुछ रखता है, जैसे हेडिंग, टेक्स्ट या बटन।',
      hinglish:
        'Ye ek HTML element hai. Ye page par kuch rakhta hai, jaise heading, text ya button.',
    },
    example: {
      en: 'Like the building blocks of a toy house.',
      hi: 'जैसे खिलौना घर के ब्लॉक।',
      hinglish: 'Jaise khilone ghar ke blocks.',
    },
    tryThis: 'Change the words inside it. What changes on the page?',
  },
  general: {
    name: 'code',
    explanation: {
      en: 'This part of the code is one step in the program. Read it slowly and guess what it does.',
      hi: 'कोड का यह हिस्सा प्रोग्राम का एक कदम है। इसे धीरे से पढ़ो और अंदाज़ा लगाओ कि यह क्या करता है।',
      hinglish:
        'Code ka ye hissa program ka ek step hai. Ise dheere se padho aur guess karo ye kya karta hai.',
    },
    example: {
      en: 'Like one step in a recipe.',
      hi: 'जैसे रेसिपी का एक स्टेप।',
      hinglish: 'Jaise recipe ka ek step.',
    },
    tryThis: 'What do you think this line does? Change it and check.',
  },
};

// ----- visual explanations per concept (en / hi / hinglish) -----
const l = (en, hi, hinglish) => ({ en, hi, hinglish });
export const VISUALS = {
  variable: {
    title: l('How a variable works', 'वेरिएबल कैसे काम करता है', 'Variable kaise kaam karta hai'),
    steps: [
      l('Give the box a name.', 'डिब्बे को एक नाम दो।', 'Dabbe ko ek naam do.'),
      l('Put a value inside.', 'अंदर एक वैल्यू रखो।', 'Andar ek value rakho.'),
      l('Use the name to read it later.', 'बाद में नाम से उसे पढ़ो।', 'Baad mein naam se use padho.'),
    ],
    examples: [
      { input: 'score = 0', output: 'score is 0' },
      { input: 'score = score + 1', output: 'score is 1' },
    ],
  },
  function: {
    title: l('How a function runs', 'फ़ंक्शन कैसे चलता है', 'Function kaise chalta hai'),
    flow: {
      nodes: [
        {
          id: 'call',
          kind: 'start',
          text: l('You call the function', 'तुम फ़ंक्शन बुलाते हो', 'Tum function bulate ho'),
          next: 'run',
        },
        {
          id: 'run',
          kind: 'step',
          text: l('Its steps run', 'उसके स्टेप चलते हैं', 'Uske steps chalte hain'),
          next: 'done',
        },
        {
          id: 'done',
          kind: 'end',
          text: l('Back to where you were', 'वापस वहीं जहाँ थे', 'Wapas wahin jahan the'),
        },
      ],
    },
  },
  event: {
    title: l('What happens on a click', 'क्लिक पर क्या होता है', 'Click par kya hota hai'),
    flow: {
      nodes: [
        {
          id: 'wait',
          kind: 'start',
          text: l('The page waits', 'पेज इंतज़ार करता है', 'Page intezaar karta hai'),
          next: 'click',
        },
        {
          id: 'click',
          kind: 'decision',
          text: l('Did someone click?', 'क्या किसी ने क्लिक किया?', 'Kya kisi ne click kiya?'),
          yes: 'run',
          no: 'wait',
        },
        {
          id: 'run',
          kind: 'step',
          text: l('Your code runs', 'तुम्हारा कोड चलता है', 'Tumhara code chalta hai'),
          next: 'wait',
        },
      ],
    },
  },
  condition: {
    title: l('How a choice works', 'चुनाव कैसे काम करता है', 'Choice kaise kaam karta hai'),
    flow: {
      nodes: [
        {
          id: 'ask',
          kind: 'decision',
          text: l('Is the answer right?', 'क्या जवाब सही है?', 'Kya jawab sahi hai?'),
          yes: 'win',
          no: 'try',
        },
        {
          id: 'win',
          kind: 'step',
          text: l('Add a point', 'एक पॉइंट जोड़ो', 'Ek point jodo'),
          next: 'end',
        },
        {
          id: 'try',
          kind: 'step',
          text: l('Show "try again"', '"फिर कोशिश करो" दिखाओ', '"Phir try karo" dikhao'),
          next: 'end',
        },
        { id: 'end', kind: 'end', text: l('Go on', 'आगे बढ़ो', 'Aage badho') },
      ],
    },
    examples: [
      { input: 'answer is right', output: 'score goes up' },
      { input: 'answer is wrong', output: 'try again' },
    ],
  },
  css: {
    title: l(
      'How a style rule works',
      'स्टाइल नियम कैसे काम करता है',
      'Style rule kaise kaam karta hai',
    ),
    steps: [
      l('Pick what to style.', 'चुनो किसे सजाना है।', 'Chuno kise sajana hai.'),
      l('Say how it should look.', 'बताओ वह कैसा दिखे।', 'Batao woh kaisa dikhe.'),
      l('The page updates.', 'पेज बदल जाता है।', 'Page badal jata hai.'),
    ],
  },
  html: {
    title: l('How a page is built', 'पेज कैसे बनता है', 'Page kaise banta hai'),
    steps: [
      l('Each tag is a building block.', 'हर टैग एक ब्लॉक है।', 'Har tag ek block hai.'),
      l(
        'Blocks sit inside other blocks.',
        'ब्लॉक दूसरे ब्लॉक के अंदर रहते हैं।',
        'Blocks doosre blocks ke andar rehte hain.',
      ),
      l(
        'The browser shows them in order.',
        'ब्राउज़र उन्हें क्रम से दिखाता है।',
        'Browser unhe order mein dikhata hai.',
      ),
    ],
  },
  general: {
    title: l('Reading code step by step', 'कोड को स्टेप-दर-स्टेप पढ़ना', 'Code ko step by step padhna'),
    steps: [
      l('Read one line at a time.', 'एक बार में एक लाइन पढ़ो।', 'Ek baar mein ek line padho.'),
      l('Guess what it does.', 'अंदाज़ा लगाओ कि यह क्या करती है।', 'Guess karo ye kya karti hai.'),
      l('Change it and check.', 'उसे बदलो और जाँचो।', 'Use badlo aur check karo.'),
    ],
  },
};

export const detectConcept = (path, snippet) => {
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.html')) return 'html';
  if (/addEventListener|onclick/.test(snippet)) return 'event';
  if (/\bfunction\b|=>/.test(snippet)) return 'function';
  if (/\bif\s*\(/.test(snippet)) return 'condition';
  if (/\b(let|const|var)\b/.test(snippet)) return 'variable';
  return 'general';
};

// ----- refinement -----
export const COLOURS = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#facc15',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  नीला: '#3b82f6',
  लाल: '#ef4444',
  हरा: '#22c55e',
  पीला: '#facc15',
  neela: '#3b82f6',
  laal: '#ef4444',
  hara: '#22c55e',
  peela: '#facc15',
};

// How the child uses each sample project, and what happens when they do (used in project plans).
export const PLAN_DETAILS = {
  game: {
    interaction: [
      l(
        'Press the left and right arrow keys or buttons.',
        'बाएँ और दाएँ तीर वाली कुंजियाँ या बटन दबाओ।',
        'Left aur right arrow keys ya buttons dabao.',
      ),
    ],
    expectedBehaviour: [
      l('The basket moves.', 'टोकरी चलती है।', 'Basket move karti hai.'),
      l(
        'Catching a star adds one point.',
        'सितारा पकड़ने पर एक अंक मिलता है।',
        'Star pakadne par ek point milta hai.',
      ),
    ],
  },
  quiz: {
    interaction: [l('Click an answer.', 'एक जवाब पर क्लिक करो।', 'Ek answer par click karo.')],
    expectedBehaviour: [
      l(
        'The quiz says if you are right.',
        'क्विज़ बताता है कि जवाब सही है या नहीं।',
        'Quiz batata hai ki answer sahi hai ya nahi.',
      ),
      l(
        'At the end you see your score.',
        'आखिर में तुम्हारा स्कोर दिखता है।',
        'End mein tumhara score dikhta hai.',
      ),
    ],
  },
  calculator: {
    interaction: [
      l(
        'Type two numbers and pick an operation.',
        'दो संख्याएँ लिखो और एक क्रिया चुनो।',
        'Do numbers type karo aur ek operation chuno.',
      ),
    ],
    expectedBehaviour: [
      l('The answer appears on the page.', 'जवाब पेज पर दिखता है।', 'Answer page par dikhta hai.'),
    ],
  },
  animation: {
    interaction: [l('Click the shape.', 'आकृति पर क्लिक करो।', 'Shape par click karo.')],
    expectedBehaviour: [
      l('The shape moves by itself.', 'आकृति अपने आप चलती है।', 'Shape apne aap move karti hai.'),
      l(
        'Clicking changes its colour.',
        'क्लिक करने पर रंग बदलता है।',
        'Click karne par colour badalta hai.',
      ),
    ],
  },
  webpage: {
    interaction: [l('Click the button.', 'बटन पर क्लिक करो।', 'Button par click karo.')],
    expectedBehaviour: [
      l(
        'The message on the page changes.',
        'पेज का संदेश बदल जाता है।',
        'Page ka message badal jata hai.',
      ),
    ],
  },
};
