import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createAppointment } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "patient") {
      return NextResponse.json({ error: "Please log in as a patient to book an appointment." }, { status: 401 });
    }

    const body = await request.json();
    const appointment = await createAppointment({
      patientId: session.userId,
      doctorProfileId: String(body.doctorProfileId),
      clinicId: String(body.clinicId),
      slotId: String(body.slotId),
      mode: body.mode,
      symptoms: String(body.symptoms ?? "")
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create appointment." }, { status: 400 });
  }
}
