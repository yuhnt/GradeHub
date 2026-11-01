import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { authApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { AuthHeading } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { errorMessage, isApiError } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/hooks';
import { registerSchema, type RegisterValues } from './schemas';

export function RegisterPage() {
  useDocumentTitle('Create account');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async ({ username, email, password }) => {
    setFormError(null);
    try {
      await authApi.register({ username, email, password });
    } catch (error) {
      // Point duplicate-account errors at the field that caused them.
      if (isApiError(error, 409)) {
        const field = error.message.includes('email') ? 'email' : 'username';
        setError(field, { message: errorMessage(error) }, { shouldFocus: true });
      } else {
        setFormError(errorMessage(error));
      }
      return;
    }

    // Registration doesn't return a token, so sign in right away
    // (PublicOnly then redirects to the task list).
    try {
      await login(username, password);
      toast.success(`Welcome, ${username}! Your student account is ready.`);
    } catch {
      toast.success('Your account is ready. Please sign in.');
      navigate('/login', { replace: true });
    }
  });

  return (
    <>
      <AuthHeading
        title="Create a student account"
        description="Teachers get their accounts from the school administrator."
      />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Username"
          autoComplete="username"
          autoFocus
          hint="3 to 50 characters. Your teachers will see it."
          error={errors.username?.message}
          {...register('username')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          hint="Used to reset your password."
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </>
  );
}
