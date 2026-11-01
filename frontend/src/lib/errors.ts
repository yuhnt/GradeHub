import { ApiError } from '../api/client';

// The backend's error strings are short and technical. These are the ones a
// user can actually run into, rewritten as sentences they can act on.
const FRIENDLY: Record<string, string> = {
  'network error': "Can't reach the server. Check your connection and try again.",
  'internal server error': 'Something went wrong on our side. Please try again in a moment.',
  'invalid username or password': 'Incorrect username or password.',
  'username already taken': 'That username is already taken.',
  'email already registered': 'An account with that email already exists.',
  'invalid or expired token': 'This reset link is invalid, expired or already used. Request a new one.',
  'invalid deadline: deadline must later than now': 'The deadline must be in the future.',
  'title, description too long': 'The title or description is too long.',
  'title, description missing': 'Enter a title and a description.',
  'task not found': 'This task no longer exists.',
  'task not found, or you did not create this task': 'This task no longer exists, or you did not create it.',
  'submission not found': "This submission doesn't exist, or you don't have access to it.",
  'deadline has passed': 'The deadline for this task has passed.',
  'submission already exists for this task':
    'You have already submitted this task. Delete that submission first to upload a different file.',
  'file must be a PDF': 'Only PDF files are accepted.',
  'file must be at most 10MB': 'The file is larger than 10 MB.',
  'file too large': 'The file is larger than 10 MB.',
  'no file attached': 'Choose a PDF file first.',
};

/** A message to show the user for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Same backend text as a bad reset token, but here it means the session ended.
    if (error.status === 401 && error.message !== 'invalid username or password') {
      return 'Your session has expired. Please sign in again.';
    }
    const friendly = FRIENDLY[error.message];
    if (friendly) return friendly;
    if (error.status === 403) return "You don't have permission to do that.";
    return sentence(error.message);
  }
  if (error instanceof Error && error.message) return sentence(error.message);
  return 'Something went wrong. Please try again.';
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

function sentence(text: string) {
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
