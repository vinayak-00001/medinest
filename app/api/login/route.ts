import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionCookieOptions, sessionCookieName } from "@/lib/auth";
import { authenticateUser, createSession } from "@/lib/data";
import { validateLoginInput } from "@/lib/workflow-rules";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  const inputError = validateLoginInput({ email, password });
  if (inputError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(inputError)}&next=${encodeURIComponent(safeNext)}`, request.url));
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    return NextResponse.redirect(new URL(`/login?error=Invalid%20email%20or%20password&next=${encodeURIComponent(safeNext)}`, request.url));
  }

  const { token } = await createSession(user.id, user.role);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, getSessionCookieOptions());

  return NextResponse.redirect(new URL(safeNext, request.url));
}
