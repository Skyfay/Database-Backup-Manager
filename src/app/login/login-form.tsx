'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState } from 'react';
import { authenticate } from './actions';
import { AuthError } from 'next-auth'; // We need to check if we can import this client side or need to handle error string

export default function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  // Store credentials temporarily for the second step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    // If we are in step 1 (no code shown yet), we might be resubmitting with code if logic was unified
    // But here we split logic:
    // 1. Submit email/pass -> Server Action
    // 2. Server Action -> Returns "2FA_REQUIRED" error
    // 3. UI shows Code Input
    // 4. User submits again -> Server Action sends email/pass/code

    // However, we are using the `authenticate` server action which calls `signIn`.
    // We need to pass the state to it.

    if (showTwoFactor) {
        formData.append("email", email);
        formData.append("password", password);
    } else {
        // Save for later
        setEmail(formData.get("email") as string);
        setPassword(formData.get("password") as string);
    }

    const result = await authenticate(undefined, formData);

    if (result) {
        if (result === "2FA_REQUIRED") {
            setShowTwoFactor(true);
            setErrorMessage(null); // Clear previous errors
        } else {
            setErrorMessage(result);
        }
    }

    setIsPending(false);
  };

  return (
    <Card className="mx-auto max-w-sm w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {!showTwoFactor && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="m@example.com"
                  required
                  defaultValue={email}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input id="password" type="password" name="password" required defaultValue={password} />
              </div>
            </>
          )}

          {showTwoFactor && (
            <div className="grid gap-2">
              <Label htmlFor="code">Two-Factor Code</Label>
              <Input
                id="code"
                type="text"
                name="code"
                placeholder="123456"
                required
                autoFocus
                maxLength={6}
                pattern="\d{6}"
              />
              <p className="text-xs text-muted-foreground">
                  Enter the code from your authenticator app.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Logging in..." : (showTwoFactor ? "Verify" : "Login")}
          </Button>

          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          >
            {errorMessage && (
              <p className="text-sm text-red-500">
                {errorMessage}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
