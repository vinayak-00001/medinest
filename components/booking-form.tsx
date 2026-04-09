"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface BookingFormProps {
  doctorProfileId: string;
  clinicId: string;
  slotId: string;
  mode: "video" | "in-person";
}

export function BookingForm({ doctorProfileId, clinicId, slotId, mode }: BookingFormProps) {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorProfileId, clinicId, slotId, mode, symptoms })
    });

    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login?next=%2Fdoctors");
        return;
      }
      setError(payload.error ?? "Unable to request appointment.");
      return;
    }

    setSymptoms("");
    setMessage("Request sent. Check your dashboard for confirmation and call links.");
    router.refresh();
  }

  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor={`symptoms-${slotId}`}>Reason for visit</label>
        <textarea
          id={`symptoms-${slotId}`}
          value={symptoms}
          onChange={(event) => setSymptoms(event.target.value)}
          placeholder="Describe your symptoms or what you need help with"
          required
        />
      </div>
      <p className="tiny muted">You are requesting this slot. The clinic confirms it before the visit starts.</p>
      <div className="inline-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Sending..." : "Request this slot"}
        </button>
      </div>
      {error ? <p className="pill pill--warm">{error}</p> : null}
      {message ? <p className="pill">{message}</p> : null}
    </form>
  );
}
