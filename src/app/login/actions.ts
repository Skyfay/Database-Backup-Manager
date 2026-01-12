'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.cause?.err?.message === "2FA_REQUIRED") {
           return "2FA_REQUIRED";
      }

      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        case 'CallbackRouteError':
             if (error.cause?.err?.message === "2FA_REQUIRED") {
                 return "2FA_REQUIRED";
             }
             return 'Could not login.';
        default:
          return 'Something went wrong.';
      }
    }
    // Auth.js throws error for redirect (success), so we rethrow
    throw error;
  }
}
