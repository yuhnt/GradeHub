import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { AuthHeading } from '../../components/layout/AuthLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { errorMessage } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/hooks';
import { loginSchema, type LoginValues } from './schemas';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setFormError(null);
    try {
      // PublicOnly then takes the user back to where they were going.
      await login(username, password);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <>
      <AuthHeading title="Sign in" description="Welcome back. Sign in to see your tasks." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Username"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          aside={
            <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </Link>
          }
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New student?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </>
  );
}
