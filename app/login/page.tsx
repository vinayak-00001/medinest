import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getClinics } from "@/lib/data";
import { AuthForms } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const next = params?.next && params.next.startsWith("/") ? params.next : "/dashboard";
  const session = await getSession();
  if (session) {
    redirect(next);
  }

  const clinics = await getClinics();

  return (
    <main className="auth-wrap">
      <section className="auth-layout">
        <div className="auth-panel">
          <span className="eyebrow">Secure access</span>
          <h1 className="page-title">Sign in or create an account.</h1>
          <p className="muted">Patients, doctors, and admins use the same portal.</p>
          {params?.error ? <p className="pill pill--warm">{params.error}</p> : null}
          <div className="pill-row" style={{ marginTop: "1rem" }}>
            <span className="pill">Patient</span>
            <span className="pill">Doctor</span>
            <span className="pill">Admin</span>
          </div>
        </div>

        <AuthForms clinics={clinics} next={next} />
      </section>
    </main>
  );
}
