import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrescriptionFileAccess } from "@/lib/data";

export async function GET(
  request: Request,
  context: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in to access prescription files." }, { status: 401 });
    }

    const { prescriptionId } = await context.params;
    const access = await getPrescriptionFileAccess({
      prescriptionId,
      actorUserId: session.userId,
      actorRole: session.role
    });

    const attachmentUrl = access.prescription.attachmentUrl;
    if (!attachmentUrl) {
      return NextResponse.json({ error: "This prescription does not have an uploaded file." }, { status: 404 });
    }

    const remoteResponse = await fetch(attachmentUrl, {
      cache: "no-store"
    });
    if (!remoteResponse.ok) {
      return NextResponse.json({ error: "Unable to fetch the stored prescription file." }, { status: 502 });
    }

    const url = new URL(request.url);
    const dispositionType = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    const downloadName = access.prescription.attachmentName || "prescription-file";

    return new NextResponse(remoteResponse.body, {
      headers: {
        "Content-Type": access.prescription.attachmentType || remoteResponse.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `${dispositionType}; filename="${downloadName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open prescription file.";
    const status = message.includes("access") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
