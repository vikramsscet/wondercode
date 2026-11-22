import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Workspace from './Workspace.jsx';

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

  it('shows real files without the Sample badge, with line numbers', () => {
    render(<Workspace files={FILES} title="My Game" />);
    expect(screen.queryByText('Sample')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Game');
    const code = screen.getByLabelText('Code of index.html');
    expect(code).toHaveTextContent('<h1>Hi</h1>');
    expect(within(code).getByText('1')).toBeInTheDocument();
  });

  it('switches files on click and shows the new code', async () => {
    render(<Workspace files={FILES} title="T" />);
    await userEvent.click(screen.getByRole('button', { name: /style\.css/ }));
    expect(screen.getByLabelText('Code of style.css')).toHaveTextContent('color: red;');
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
    expect(screen.getByLabelText('Code of script.js')).toBeInTheDocument();
    await userEvent.keyboard('{Home}');
    expect(screen.getByLabelText('Code of index.html')).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(screen.getByLabelText('Code of script.js')).toBeInTheDocument();
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
    expect(screen.getByText(/Nothing has been run yet/)).toBeInTheDocument();
  });

  it('copes with an empty project', () => {
    render(<Workspace files={[]} title="Empty" />);
    expect(screen.getByText('Pick a file to see its code.')).toBeInTheDocument();
  });
});
