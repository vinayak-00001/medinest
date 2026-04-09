import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createDoctorAvailability } from "@/lib/data";
import { ConsultationMode } from "@/lib/types";

const allowedModes = new Set<ConsultationMode>(["video", "in-person"]);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "doctor") {
      return NextResponse.json({ error: "Please log in as a doctor to add availability." }, { status: 401 });
    }

    const body = await request.json();
    const mode = body.mode as ConsultationMode;
    if (!allowedModes.has(mode)) {
      return NextResponse.json({ error: "Unsupported consultation mode." }, { status: 400 });
    }

    const slot = await createDoctorAvailability({
      actorUserId: session.userId,
      clinicId: String(body.clinicId || ""),
      startsAt: String(body.startsAt || ""),
      mode
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add availability." },
      { status: 400 }
    );
  }
}
