import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnLogin = nextUrl.pathname === '/login' || nextUrl.pathname === '/';

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && nextUrl.pathname === '/') {
          // Redirect authenticated users from root to dashboard
        return Response.redirect(new URL('/dashboard', nextUrl));
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
          // Redirect authenticated users from login to dashboard
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
