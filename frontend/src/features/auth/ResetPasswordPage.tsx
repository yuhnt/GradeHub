import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { authApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { AuthHeading } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { errorMessage } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/hooks';
import { resetPasswordSchema, type ResetPasswordValues } from './schemas';

/**
 * Opened from the reset email (?token=...). When the backend has no
 * RESET_PASSWORD_URL the email carries a bare code instead, so the code
 * can also be pasted by hand.
 */
export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const tokenFromLink = params.get('token') ?? '';
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenFromLink },
  });

  const onSubmit = handleSubmit(async ({ token, newPassword }) => {
    setFormError(null);
    try {
      await authApi.resetPassword({ token, newPassword });
    } catch (error) {
      setFormError(errorMessage(error));
      return;
    }
    // Whoever is signed in on this device must sign in again with the new password.
    if (user) logout();
    toast.success('Your password has been changed. Sign in with the new one.');
    navigate('/login', { replace: true });
  });

  return (
    <>
      <AuthHeading title="Choose a new password" />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <Alert tone="error">
            {formError}{' '}
            <Link to="/forgot-password" className="font-medium underline">
              Request a new link
            </Link>
          </Alert>
        )}
        {tokenFromLink ? (
          <input type="hidden" {...register('token')} />
        ) : (
          <TextField
            label="Reset code"
            autoComplete="one-time-code"
            hint="The code from the password reset email."
            error={errors.token?.message}
            {...register('token')}
          />
        )}
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus={Boolean(tokenFromLink)}
          hint="At least 8 characters."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Change password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
