import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { TOKEN_KEY } from '../../auth/tokenStorage';
import { PASSWORD, addTask, student, teacher, tokenFor } from '../../test/db';
import { renderApp } from '../../test/render';
import { server } from '../../test/server';

describe('sign in', () => {
  it('sends a signed-out visitor to the sign-in page, then back where they were going', async () => {
    const task = addTask({ title: 'Essay on transactions' });
    const { user, router } = renderApp(`/tasks/${task.id}`);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Username'), student.username);
    await user.type(screen.getByLabelText('Password'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Essay on transactions' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/tasks/${task.id}`);
    expect(screen.getByText(student.username)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
  });

  it('checks the fields before calling the API', async () => {
    const { user } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('shows one generic message for a wrong username or password', async () => {
    const { user } = renderApp('/login');
    await user.type(await screen.findByLabelText('Username'), student.username);
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('keeps a stored session across reloads, and signs out on request', async () => {
    const { user } = renderApp('/tasks', { as: teacher });
    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('drops an expired token without calling the API', async () => {
    localStorage.setItem(TOKEN_KEY, tokenFor(student, -60));
    renderApp('/tasks');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('signs out with a notice when the API rejects the session', async () => {
    server.use(http.get('*/api/tasks', () => HttpResponse.json({ error: 'invalid or expired token' }, { status: 401 })));
    renderApp('/tasks', { as: student });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(await screen.findByText(/session has expired/)).toBeInTheDocument();
  });

  it('offers a retry when the server is down at startup', async () => {
    server.use(http.get('*/api/auth/me', () => HttpResponse.error()));
    const { user } = renderApp('/tasks', { as: student });
    expect(await screen.findByText("Can't reach Task Grading Hub")).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
  });
});

describe('register', () => {
  it('creates a student account and signs straight in', async () => {
    const { user, router } = renderApp('/register');
    await user.type(await screen.findByLabelText('Username'), 'newstudent');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'LongEnough1');
    await user.type(screen.getByLabelText('Confirm password'), 'LongEnough1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tasks'));
    expect(await screen.findByText('newstudent')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('puts a taken username error on the username field', async () => {
    const { user } = renderApp('/register');
    await user.type(await screen.findByLabelText('Username'), student.username);
    await user.type(screen.getByLabelText('Email'), 'other@example.com');
    await user.type(screen.getByLabelText('Password'), 'LongEnough1');
    await user.type(screen.getByLabelText('Confirm password'), 'LongEnough1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const username = screen.getByLabelText('Username');
    await waitFor(() => expect(username).toHaveAccessibleDescription('That username is already taken.'));
    expect(username).toHaveAttribute('aria-invalid', 'true');
  });

  it('catches mismatched and short passwords', async () => {
    const { user } = renderApp('/register');
    await user.type(await screen.findByLabelText('Username'), 'abc');
    await user.type(screen.getByLabelText('Email'), 'abc@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Use at least 8 characters.');
    expect(screen.getByLabelText('Confirm password')).toHaveAccessibleDescription("The passwords don't match.");
  });
});

describe('password reset', () => {
  it('answers the same way whether or not the email exists', async () => {
    const { user } = renderApp('/forgot-password');
    await user.type(await screen.findByLabelText('Email'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByText(/If an account uses/)).toHaveTextContent('nobody@example.com');
  });

  it('sets a new password from the emailed link', async () => {
    const { user, router } = renderApp('/reset-password?token=valid-reset-token');
    // The token comes from the link, so there is no code field to fill in.
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Reset code')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('New password'), 'BrandNewPass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNewPass1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByText(/password has been changed/)).toBeInTheDocument();
  });

  it('explains an invalid or used code', async () => {
    const { user } = renderApp('/reset-password');
    await user.type(await screen.findByLabelText('Reset code'), 'stale-code');
    await user.type(screen.getByLabelText('New password'), 'BrandNewPass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNewPass1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid, expired or already used/);
  });
});
