import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, Button, Dialog, LoadingState, TextField, buttonClasses } from './index.js';

describe('Button', () => {
  it('renders variants and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('exposes class names for links', () => {
    expect(buttonClasses({ variant: 'danger' })).toContain('bg-coral-600');
  });
});

describe('TextField', () => {
  it('connects label, hint and error for assistive technology', () => {
    render(<TextField label="Email" hint="We never share it." error="Please check this." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const described = input.getAttribute('aria-describedby').split(' ');
    expect(described).toHaveLength(2);
    expect(document.getElementById(described[0])).toHaveTextContent('We never share it.');
    expect(document.getElementById(described[1])).toHaveTextContent('Please check this.');
  });

  it('has no aria-invalid when valid', () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });
});

describe('Alert', () => {
  it('announces errors assertively and others politely', () => {
    render(
      <>
        <Alert tone="error">Bad</Alert>
        <Alert>Fine</Alert>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Bad');
    expect(screen.getByRole('status')).toHaveTextContent('Fine');
  });
});

describe('LoadingState', () => {
  it('shows a status message', () => {
    render(<LoadingState message="Please wait" />);
    expect(screen.getByRole('status')).toHaveTextContent('Please wait');
  });
});

describe('Dialog', () => {
  it('is labelled by its title and calls onClose from the button', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Hello">
        Body
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Hello' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
