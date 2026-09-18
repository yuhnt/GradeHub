import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toDateTimeLocalValue } from '../../lib/dates';
import { addSubmission, addTask, db, inDays, otherTeacher, student, teacher } from '../../test/db';
import { renderApp } from '../../test/render';

describe('task list', () => {
  it("shows a student the open tasks with where they stand on each", async () => {
    const todo = addTask({ title: 'Essay', deadline: inDays(3) });
    const submitted = addTask({ title: 'Lab 1', deadline: inDays(5) });
    const graded = addTask({ title: 'Lab 2', deadline: inDays(6) });
    addTask({ title: 'Old quiz', deadline: inDays(-2) });
    addSubmission({ taskId: submitted.id });
    addSubmission({ taskId: graded.id, grade: 88 });

    renderApp('/tasks', { as: student });
    const rows = await screen.findAllByRole('listitem');
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual(['Essay', 'Lab 1', 'Lab 2']);
    expect(within(rows[0]!).getByText('To do')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Submitted')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('88 / 100')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New task' })).not.toBeInTheDocument();
    expect(todo).toBeDefined();
  });

  it('lists closed tasks, newest first, and flags missed ones', async () => {
    addTask({ title: 'Older', deadline: inDays(-5) });
    addTask({ title: 'Recent', deadline: inDays(-1) });
    const { user } = renderApp('/tasks', { as: student });

    await user.click(await screen.findByRole('button', { name: 'Closed' }));
    const rows = await screen.findAllByRole('listitem');
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual(['Recent', 'Older']);
    expect(within(rows[0]!).getByText('Not submitted')).toBeInTheDocument();
  });

  it("starts a teacher on their own tasks and can show everyone's", async () => {
    addTask({ title: 'Mine' });
    addTask({ title: 'Theirs', createdBy: otherTeacher.id });
    const { user } = renderApp('/tasks', { as: teacher });

    expect(await screen.findByRole('link', { name: 'Mine' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Theirs' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Show' }), 'all');
    expect(await screen.findByRole('link', { name: 'Theirs' })).toBeInTheDocument();
    expect(screen.getByText('Yours')).toBeInTheDocument();
  });

  it('pages through long lists', async () => {
    for (let i = 1; i <= 12; i++) addTask({ title: `Task ${i}`, deadline: inDays(i) });
    const { user } = renderApp('/tasks', { as: student });

    expect(await screen.findByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Page 1 of 2');
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('link', { name: 'Task 12' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('invites a teacher with no tasks to create one', async () => {
    renderApp('/tasks', { as: teacher });
    expect(await screen.findByText('No open tasks')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'New task' })).toHaveLength(2);
  });
});

describe('creating and editing tasks', () => {
  it('creates a task and opens it', async () => {
    const { user, router } = renderApp('/tasks/new', { as: teacher });
    await user.type(await screen.findByLabelText('Title'), 'Final project');
    await user.type(screen.getByLabelText('Instructions'), 'Build a REST API.');
    await user.type(screen.getByLabelText('Deadline'), toDateTimeLocalValue(inDays(10)));
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByRole('heading', { name: 'Final project' })).toBeInTheDocument();
    const created = db.tasks.find((t) => t.title === 'Final project');
    expect(created).toMatchObject({ description: 'Build a REST API.', createdBy: teacher.id });
    expect(router.state.location.pathname).toBe(`/tasks/${created!.id}`);
  });

  it('refuses a deadline in the past before sending anything', async () => {
    const { user } = renderApp('/tasks/new', { as: teacher });
    await user.type(await screen.findByLabelText('Title'), 'Late');
    await user.type(screen.getByLabelText('Instructions'), 'Too late.');
    await user.type(screen.getByLabelText('Deadline'), toDateTimeLocalValue(inDays(-1)));
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(screen.getByLabelText('Deadline')).toHaveAccessibleDescription('The deadline must be in the future.');
    expect(db.tasks).toHaveLength(0);
  });

  it('keeps students out of the task editor', async () => {
    renderApp('/tasks/new', { as: student });
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
  });

  it("doesn't let a teacher edit someone else's task", async () => {
    const task = addTask({ createdBy: otherTeacher.id });
    renderApp(`/tasks/${task.id}/edit`, { as: teacher });
    expect(await screen.findByText(/Only the teacher who created this task/)).toBeInTheDocument();
  });

  it('warns that saving a closed task reopens it', async () => {
    const task = addTask({ deadline: inDays(-1) });
    renderApp(`/tasks/${task.id}/edit`, { as: teacher });
    expect(await screen.findByText("This task's deadline has passed")).toBeInTheDocument();
    expect(screen.getByLabelText('Deadline')).toHaveValue('');
  });

  it('updates a task', async () => {
    const task = addTask({ title: 'Draft title' });
    const { user } = renderApp(`/tasks/${task.id}/edit`, { as: teacher });
    const title = await screen.findByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Better title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { name: 'Better title' })).toBeInTheDocument();
    expect(db.tasks[0]!.title).toBe('Better title');
  });
});

describe('deleting a task', () => {
  it('warns how many submissions go with it, then deletes', async () => {
    const task = addTask({ title: 'Doomed' });
    addSubmission({ taskId: task.id });
    addSubmission({ taskId: task.id, userId: 4 });
    const { user, router } = renderApp(`/tasks/${task.id}`, { as: teacher });

    await screen.findByText('2 submitted · 0 graded · 2 to grade');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this task?' });
    expect(dialog).toHaveTextContent('2 student submissions, with grades and PDFs, will be deleted too.');

    await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tasks'));
    expect(db.tasks).toHaveLength(0);
    expect(db.submissions).toHaveLength(0);
  });
});

describe('task page', () => {
  it("shows another teacher's task without its submissions", async () => {
    const task = addTask({ createdBy: otherTeacher.id, title: 'Not mine' });
    renderApp(`/tasks/${task.id}`, { as: teacher });
    expect(await screen.findByText("Another teacher's task")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByText('Submissions')).not.toBeInTheDocument();
  });

  it('says so when the task is gone', async () => {
    renderApp('/tasks/999', { as: student });
    expect(await screen.findByText('Task not found')).toBeInTheDocument();
  });
});
