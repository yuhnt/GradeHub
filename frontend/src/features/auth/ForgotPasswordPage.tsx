import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { authApi } from '../../api/endpoints';
import { AuthHeading } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { errorMessage } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/hooks';
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas';

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await authApi.forgotPassword({ email });
      setSentTo(email);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (sentTo) {
    // Same message whether or not the account exists (no account enumeration).
    return (
      <>
        <AuthHeading title="Check your email" />
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            If an account uses <span className="font-medium text-slate-900">{sentTo}</span>, we have sent it a
            password reset link. The link only works for a short time, so use it soon.
          </p>
          <p>Didn&apos;t get it? Check your spam folder, or ask again in a few minutes.</p>
          <div className="flex flex-col gap-2 pt-2">
            <ButtonLink to="/reset-password" variant="secondary">
              I have a reset code
            </ButtonLink>
            <ButtonLink to="/login" variant="ghost">
              Back to sign in
            </ButtonLink>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Forgot your password?"
        description="Enter the email of your account and we'll send you a reset link."
      />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send reset link
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
