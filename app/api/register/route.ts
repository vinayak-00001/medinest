import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionCookieOptions, sessionCookieName } from "@/lib/auth";
import { createSession, registerUser } from "@/lib/data";
import { Role } from "@/lib/types";
import { validateRole } from "@/lib/validation";
import { validateSignupInput } from "@/lib/workflow-rules";

const allowedRoles = new Set<Role>(["doctor", "patient"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const next = String(formData.get("next") || "/dashboard");
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  try {
    const role = String(formData.get("role") || "") as Role;

    if (!allowedRoles.has(role) || !validateRole(role)) {
      return NextResponse.redirect(
        new URL(`/login?error=Please%20choose%20a%20valid%20signup%20role&next=${encodeURIComponent(safeNext)}`, request.url)
      );
    }

    const inputError = validateSignupInput({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || ""),
      role,
      clinicId: String(formData.get("clinicId") || ""),
      specialty: String(formData.get("specialty") || "")
    });

    if (inputError) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(inputError)}&next=${encodeURIComponent(safeNext)}`, request.url));
    }

    const user = await registerUser({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || ""),
      role,
      clinicId: String(formData.get("clinicId") || ""),
      specialty: String(formData.get("specialty") || "")
    });

    const { token } = await createSession(user.id, user.role);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, token, getSessionCookieOptions());

    return NextResponse.redirect(new URL(safeNext, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create account";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(safeNext)}`, request.url));
  }
}
