import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { saveClinic } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Please log in as an admin to manage clinics." }, { status: 401 });
    }

    const body = await request.json();
    const clinic = await saveClinic({
      clinicId: body.clinicId ? String(body.clinicId) : undefined,
      name: String(body.name || ""),
      city: String(body.city || ""),
      address: String(body.address || ""),
      phone: String(body.phone || "")
    });

    return NextResponse.json({ clinic });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save clinic." }, { status: 400 });
  }
}
