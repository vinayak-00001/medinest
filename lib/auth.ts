import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { deleteSessionByToken, getSessionByToken, getUserById } from "@/lib/data";
import { SESSION_DURATION_SECONDS } from "@/lib/security";
import { Role } from "@/lib/types";

const SESSION_COOKIE = "medinest-session";

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  };
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getSessionByToken(token);
}

export async function requireSession(role?: Role) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (role && session.role !== role) {
    redirect("/dashboard");
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  return { session, user };
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSessionByToken(token);
  }

  store.delete(SESSION_COOKIE);
}

export const sessionCookieName = SESSION_COOKIE;
