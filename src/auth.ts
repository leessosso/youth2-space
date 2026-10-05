import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { resolveLoginUser, userMustChangePassword } from "@/lib/login";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    phone: string | null;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      /** 로그인 시점 전화. SSO 티켓용. 구세션 JWT에는 없을 수 있음. */
      phone?: string | null;
      mustChangePassword: boolean;
    };
  }
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-auth-secret"),
  providers: [
    Credentials({
      name: "이름 또는 전화번호",
      credentials: {
        identifier: { label: "이름 또는 전화번호", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const identifier = (credentials?.identifier as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        const result = await resolveLoginUser(identifier, password);
        if (!result.ok) return null;

        const user = result.user;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone ?? null,
          mustChangePassword: userMustChangePassword(user),
        };
      },
    }),
  ],
});
