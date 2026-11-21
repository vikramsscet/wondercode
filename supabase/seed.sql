-- Development seed: learning catalog only. Idempotent; contains no user data.

insert into public.learning_concepts (slug, title, description, language, sort_order) values
  ('html-elements', 'HTML elements', 'Headings, paragraphs and buttons are the building blocks of a page.', 'html', 1),
  ('css-colors', 'CSS colours', 'Change how things look with colours and backgrounds.', 'css', 2),
  ('css-positioning', 'CSS positioning', 'Decide where things sit on the page.', 'css', 3),
  ('js-variables', 'JavaScript variables', 'A variable remembers a value, like a score.', 'javascript', 4),
  ('js-events', 'JavaScript events', 'Make something happen when you click or press a key.', 'javascript', 5),
  ('js-conditions', 'JavaScript conditions', 'Use if to make choices in your code.', 'javascript', 6)
on conflict (slug) do nothing;

insert into public.challenges (slug, concept_id, title, instructions, difficulty, language, hints) values
  ('change-the-background', (select id from public.learning_concepts where slug = 'css-colors'),
   'Change the background', 'Make the page background your favourite colour.', 1, 'css',
   '["Look for the word background-color.", "Try a colour name like skyblue."]'),
  ('add-a-button', (select id from public.learning_concepts where slug = 'html-elements'),
   'Add a button', 'Add a button that says Click me.', 1, 'html',
   '["Buttons use the <button> tag.", "Put your words between the opening and closing tags."]'),
  ('count-the-clicks', (select id from public.learning_concepts where slug = 'js-variables'),
   'Count the clicks', 'Show a number that goes up every time the button is clicked.', 2, 'javascript',
   '["Make a variable to remember the count.", "Add 1 to it inside the click code."]')
on conflict (slug) do nothing;

insert into public.learning_paths (slug, title, description, sort_order) values
  ('my-first-webpage', 'My First Webpage', 'Build and change your very first page.', 1)
on conflict (slug) do nothing;

insert into public.learning_path_steps (path_id, position, challenge_id)
select (select id from public.learning_paths where slug = 'my-first-webpage'), s.position,
       (select id from public.challenges where slug = s.slug)
from (values (1, 'add-a-button'), (2, 'change-the-background'), (3, 'count-the-clicks')) as s (position, slug)
on conflict (path_id, position) do nothing;
