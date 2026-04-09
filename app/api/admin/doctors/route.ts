import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { adminUpdateDoctor } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Please log in as an admin to manage doctors." }, { status: 401 });
    }

    const body = await request.json();
    const doctor = await adminUpdateDoctor({
      doctorUserId: String(body.doctorUserId || ""),
      name: String(body.name || ""),
      phone: String(body.phone || ""),
      specialty: String(body.specialty || ""),
      experienceYears: Number(body.experienceYears || 0),
      feeInr: Number(body.feeInr || 0),
      bio: String(body.bio || ""),
      clinicIds: Array.isArray(body.clinicIds) ? body.clinicIds.map(String) : []
    });

    return NextResponse.json({ doctor });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save doctor." }, { status: 400 });
  }
}
