// Sample files shown until real project versions are loaded into the workspace (Prompt 24).
export const MOCK_PROJECT = {
  title: 'Sample: Hello button',
  files: [
    {
      path: 'index.html',
      content:
        '<!doctype html>\n<html>\n  <head>\n    <link rel="stylesheet" href="style.css" />\n  </head>\n  <body>\n    <h1 id="hello">Hello!</h1>\n    <button id="btn">Click me</button>\n    <script src="script.js"></script>\n  </body>\n</html>\n',
    },
    {
      path: 'style.css',
      content: 'body {\n  font-family: sans-serif;\n  text-align: center;\n}\n',
    },
    {
      path: 'script.js',
      content:
        "const button = document.getElementById('btn');\nbutton.addEventListener('click', () => {\n  document.getElementById('hello').textContent = 'You did it!';\n});\n",
    },
  ],
};
