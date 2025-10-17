import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Logo } from '../../components/ui/logo';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordScreen() {
  const { resetPassword, error: authError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const email = watch('email');

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      await resetPassword(data.email);
      setSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      console.error('Password reset error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;
    await onSubmit({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            /* Success State */
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="size-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="size-8 text-success" />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <p className="font-medium mb-2">Check your email!</p>
                  <p className="text-sm">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Click the link in the email to reset your password.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email?
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={countdown > 0}
                >
                  {countdown > 0
                    ? `Resend in ${countdown}s`
                    : 'Resend Email'}
                </Button>
              </div>

              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  disabled={isSubmitting}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                loading={isSubmitting}
                loadingText="Sending reset link..."
              >
                Send Reset Link
              </Button>

              {/* Back to Login */}
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
