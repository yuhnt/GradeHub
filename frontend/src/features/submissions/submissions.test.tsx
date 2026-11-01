import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { addSubmission, addTask, db, inDays, otherStudent, student, teacher } from '../../test/db';
import { pdfFile, renderApp } from '../../test/render';

describe('student hand-in', () => {
  it('uploads a PDF and then shows it as submitted', async () => {
    const task = addTask();
    const { user } = renderApp(`/tasks/${task.id}`, { as: student });

    await user.upload(await screen.findByLabelText('PDF file'), pdfFile('essay.pdf'));
    expect(screen.getByText('essay.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit PDF' }));

    expect(await screen.findByText(/Submitted! Your teacher can now see your PDF/)).toBeInTheDocument();
    expect(await screen.findByText(/Handed in/)).toBeInTheDocument();
    expect(screen.getByText(/Not graded yet/)).toBeInTheDocument();
    expect(db.submissions).toMatchObject([{ taskId: task.id, userId: student.id }]);
  });

  it('rejects a non-PDF or oversized file before uploading', async () => {
    const task = addTask();
    const { user } = renderApp(`/tasks/${task.id}`, { as: student, applyAccept: false });
    const input = await screen.findByLabelText('PDF file');

    await user.upload(input, new File(['hi'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only PDF files are accepted.');

    await user.upload(input, pdfFile('huge.pdf', 11 * 1024 * 1024));
    expect(await screen.findByRole('alert')).toHaveTextContent('The limit is 10 MB.');
    expect(screen.getByRole('button', { name: 'Submit PDF' })).toBeDisabled();
  });

  it('explains a deadline that passed while the page was open', async () => {
    const task = addTask();
    const { user } = renderApp(`/tasks/${task.id}`, { as: student });
    await user.upload(await screen.findByLabelText('PDF file'), pdfFile());
    task.deadline = inDays(-1);
    await user.click(screen.getByRole('button', { name: 'Submit PDF' }));

    expect(await screen.findByText('The deadline for this task has passed.')).toBeInTheDocument();
    // The task is reloaded, so the upload form gives way to the closed state.
    expect(await screen.findByText(/didn't hand anything in/)).toBeInTheDocument();
  });

  it('shows the grade and feedback once graded', async () => {
    const task = addTask();
    addSubmission({ taskId: task.id, grade: 92, feedback: 'Clear and well argued.', gradedAt: new Date().toISOString() });
    renderApp(`/tasks/${task.id}`, { as: student });

    expect(await screen.findByText('92')).toBeInTheDocument();
    expect(screen.getByText('Clear and well argued.')).toBeInTheDocument();
  });

  it('deletes a submission before the deadline so a new file can go in', async () => {
    const task = addTask();
    addSubmission({ taskId: task.id });
    const { user } = renderApp(`/tasks/${task.id}`, { as: student });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete your submission?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete submission' }));

    expect(await screen.findByLabelText('PDF file')).toBeInTheDocument();
    expect(db.submissions).toHaveLength(0);
  });

  it('locks the submission once the deadline has passed', async () => {
    const task = addTask({ deadline: inDays(-1) });
    addSubmission({ taskId: task.id });
    renderApp(`/tasks/${task.id}`, { as: student });

    expect(await screen.findByText(/can no longer change/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('lists everything handed in on My submissions', async () => {
    const task = addTask({ title: 'Lab 1' });
    addSubmission({ taskId: task.id, grade: 70 });
    addSubmission({ taskId: addTask({ title: 'Lab 2' }).id });
    renderApp('/my-submissions', { as: student });

    expect(await screen.findByRole('link', { name: 'Lab 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lab 2' })).toBeInTheDocument();
    expect(screen.getByText('2 handed in · 1 graded · average 70 / 100')).toBeInTheDocument();
  });
});

describe('teacher grading', () => {
  it('lists submissions with student names and grades one', async () => {
    const task = addTask({ title: 'Lab 1' });
    const first = addSubmission({ taskId: task.id });
    addSubmission({ taskId: task.id, userId: otherStudent.id });
    const { user, router } = renderApp(`/tasks/${task.id}`, { as: teacher });

    const table = await screen.findByRole('table');
    expect(within(table).getByText(student.username)).toBeInTheDocument();
    expect(within(table).getByText(otherStudent.username)).toBeInTheDocument();

    await user.click(within(table).getByRole('link', { name: `Grade ${student.username}'s submission` }));
    expect(await screen.findByRole('heading', { name: `${student.username}'s submission` })).toBeInTheDocument();
    expect(await screen.findByTitle(/PDF preview/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Grade (0–100)'), '85');
    await user.type(screen.getByLabelText('Feedback'), 'Good normalisation.');
    await user.click(screen.getByRole('button', { name: 'Save and grade next' }));

    expect(await screen.findByText('Grade saved: 85 / 100.')).toBeInTheDocument();
    expect(db.submissions.find((s) => s.id === first.id)).toMatchObject({ grade: 85, feedback: 'Good normalisation.' });
    // "Save and grade next" moves on to the other ungraded submission.
    expect(await screen.findByRole('heading', { name: `${otherStudent.username}'s submission` })).toBeInTheDocument();
    expect(router.state.location.pathname).not.toBe(`/submissions/${first.id}`);
  });

  it('checks the grade range before saving', async () => {
    const task = addTask();
    const submission = addSubmission({ taskId: task.id });
    const { user } = renderApp(`/submissions/${submission.id}`, { as: teacher });

    await user.type(await screen.findByLabelText('Grade (0–100)'), '101');
    await user.click(screen.getByRole('button', { name: 'Save grade' }));
    expect(screen.getByLabelText('Grade (0–100)')).toHaveAccessibleDescription('Enter a whole number from 0 to 100.');
    expect(db.submissions[0]!.grade).toBeNull();
  });

  it('re-grades, replacing the earlier grade', async () => {
    const task = addTask();
    const submission = addSubmission({ taskId: task.id, grade: 60, feedback: 'Needs work', gradedAt: inDays(-1) });
    const { user } = renderApp(`/submissions/${submission.id}`, { as: teacher });

    const grade = await screen.findByLabelText('Grade (0–100)');
    expect(grade).toHaveValue(60);
    await user.clear(grade);
    await user.type(grade, '75');
    await user.click(screen.getByRole('button', { name: 'Update grade' }));

    await waitFor(() => expect(db.submissions[0]!.grade).toBe(75));
    expect(db.submissions[0]!.feedback).toBe('Needs work');
  });

  it("hides other people's submissions behind 'not found'", async () => {
    const task = addTask();
    const theirs = addSubmission({ taskId: task.id, userId: otherStudent.id });
    renderApp(`/submissions/${theirs.id}`, { as: student });
    expect(await screen.findByText('Submission not found')).toBeInTheDocument();
  });

  it('lets the owner upload test PDFs that stay out of the list', async () => {
    const task = addTask();
    const { user } = renderApp(`/tasks/${task.id}`, { as: teacher });

    await user.upload(await screen.findByLabelText('Test PDF'), pdfFile('sample.pdf'));
    await user.click(screen.getByRole('button', { name: 'Upload test PDF' }));

    expect(await screen.findByText('Test PDF uploaded.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
    expect(db.submissions).toMatchObject([{ isTest: true, userId: teacher.id }]);
  });
});
