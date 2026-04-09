"use client";

import { useState } from "react";

import { Clinic } from "@/lib/types";

export function AuthForms({ clinics, next }: { clinics: Clinic[]; next: string }) {
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const isDoctor = role === "doctor";

  return (
    <div className="auth-stack">
      <form action="/api/login" className="auth-card" method="post">
        <input name="next" type="hidden" value={next} />
        <h3>Log in</h3>
        <div className="form-grid">
          <div className="field field--full">
            <label htmlFor="login-email">Email</label>
            <input autoComplete="email" id="login-email" name="email" placeholder="you@example.com" required type="email" />
          </div>
          <div className="field field--full">
            <label htmlFor="login-password">Password</label>
            <input
              autoComplete="current-password"
              id="login-password"
              minLength={8}
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </div>
        </div>
        <div className="inline-actions">
          <button className="button" type="submit">
            Log in
          </button>
        </div>
        <p className="tiny muted">Use your email and password.</p>
      </form>

      <form action="/api/register" className="auth-card" method="post">
        <input name="next" type="hidden" value={next} />
        <h3>Create account</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <input id="register-name" name="name" placeholder="Your full name" required type="text" />
          </div>
          <div className="field">
            <label htmlFor="register-phone">Phone</label>
            <input
              autoComplete="tel"
              id="register-phone"
              name="phone"
              pattern="^[+\\d][\\d\\s-]{7,19}$"
              placeholder="+91 90000 00000"
              required
              type="tel"
            />
          </div>
          <div className="field field--full">
            <label htmlFor="register-email">Email</label>
            <input autoComplete="email" id="register-email" name="email" placeholder="you@example.com" required type="email" />
          </div>
          <div className="field">
            <label htmlFor="register-password">Password</label>
            <input
              autoComplete="new-password"
              id="register-password"
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="register-role">Role</label>
            <select
              defaultValue="patient"
              id="register-role"
              name="role"
              onChange={(event) => setRole(event.target.value as "patient" | "doctor")}
              required
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          {isDoctor ? (
            <>
              <div className="field">
                <label htmlFor="register-clinic">Clinic</label>
                <select defaultValue={clinics[0]?.id ?? ""} id="register-clinic" name="clinicId" required={isDoctor}>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="register-specialty">Specialty</label>
                <input id="register-specialty" name="specialty" placeholder="General Medicine" required={isDoctor} type="text" />
              </div>
            </>
          ) : (
            <div className="field field--full">
              <p className="tiny muted">Patient accounts only need your name, phone, email, and password.</p>
            </div>
          )}
        </div>
        <div className="inline-actions">
          <button className="button" type="submit">
            Create account
          </button>
        </div>
        <p className="tiny muted">
          Use a valid email, phone number, and a password with at least 8 characters, including a letter and a number. Admin
          accounts are created separately by the platform team.
        </p>
      </form>
    </div>
  );
}
