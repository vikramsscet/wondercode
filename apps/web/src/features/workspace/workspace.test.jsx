import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Workspace from './Workspace.jsx';

// Monaco needs a real browser, so tests swap in a textarea with the same props.
vi.mock('./MonacoEditor.jsx', () => ({
  default: ({ path, value, onChange, onSelection }) => (
    <div>
      <textarea
        aria-label={`Editor ${path}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={() => onSelection({ startLine: 2, endLine: 4 })}>select 2-4</button>
      <button onClick={() => onSelection({ startLine: 3, endLine: 3 })}>select 3</button>
    </div>
  ),
}));
const editor = (path) => screen.findByLabelText(`Editor ${path}`);

const FILES = [
  { path: 'index.html', content: '<h1>Hi</h1>\n' },
  { path: 'style.css', content: 'h1 {\n  color: red;\n}\n' },
  { path: 'script.js', content: 'let a = 1;\n' },
];

describe('Workspace', () => {
  it('shows sample files with a Sample badge when none are given', () => {
    render(<Workspace />);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /index\.html/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sample');
  });

  it('shows real files without the Sample badge', async () => {
    render(<Workspace files={FILES} title="My Game" />);
    expect(screen.queryByText('Sample')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Game');
    expect(await editor('index.html')).toHaveValue('<h1>Hi</h1>\n');
  });

  it('switches files on click and shows the new code', async () => {
    render(<Workspace files={FILES} title="T" />);
    await userEvent.click(screen.getByRole('button', { name: /style\.css/ }));
    expect(await editor('style.css')).toHaveValue('h1 {\n  color: red;\n}\n');
    expect(screen.getByRole('button', { name: /style\.css/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: /index\.html/ })).not.toHaveAttribute('aria-current');
  });

  it('moves between files with the arrow keys', async () => {
    render(<Workspace files={FILES} title="T" />);
    screen.getByRole('button', { name: /index\.html/ }).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(await editor('script.js')).toBeInTheDocument();
    await userEvent.keyboard('{Home}');
    expect(await editor('index.html')).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(await editor('script.js')).toBeInTheDocument();
  });

  it('has tabs for small screens that keep every pane mounted', async () => {
    render(<Workspace files={FILES} title="T" />);
    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getAllByRole('tab')).toHaveLength(3);
    expect(within(tabs).getByRole('tab', { name: 'Code' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(within(tabs).getByRole('tab', { name: 'Preview' }));
    expect(within(tabs).getByRole('tab', { name: 'Preview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Code pane' })).toHaveClass('hidden');
    expect(screen.getByRole('region', { name: 'Preview pane' })).not.toHaveClass('hidden');
    expect(screen.getByText(/Nothing runs until you press Run/)).toBeInTheDocument();
  });

  it('copes with an empty project', () => {
    render(<Workspace files={[]} title="Empty" />);
    expect(screen.getByText('Pick a file to see its code.')).toBeInTheDocument();
  });

  it('keeps edits per file and marks them as unsaved', async () => {
    render(<Workspace files={FILES} title="T" />);
    const box = await editor('index.html');
    expect(screen.queryByText('Changed, not saved')).not.toBeInTheDocument();
    await userEvent.type(box, '!');
    expect(box).toHaveValue('<h1>Hi</h1>\n!');
    expect(screen.getByText('Changed, not saved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /style\.css/ }));
    expect(await editor('style.css')).toHaveValue('h1 {\n  color: red;\n}\n');
    expect(screen.queryByText('Changed, not saved')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /index\.html/ }));
    expect(await editor('index.html')).toHaveValue('<h1>Hi</h1>\n!');
    await userEvent.type(await editor('index.html'), '{Backspace}');
    await waitFor(() => expect(screen.queryByText('Changed, not saved')).not.toBeInTheDocument());
  });

  it('shows the selected lines, only for the file they belong to', async () => {
    render(<Workspace files={FILES} title="T" />);
    await editor('index.html');
    expect(screen.getByText('Click in the code to pick a line')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'select 2-4' }));
    expect(screen.getByText('Lines 2 to 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'select 3' }));
    expect(screen.getByText('Line 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /style\.css/ }));
    await editor('style.css');
    expect(screen.getByText('Click in the code to pick a line')).toBeInTheDocument();
  });
});
