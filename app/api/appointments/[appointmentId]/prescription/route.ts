import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createPrescription } from "@/lib/data";
import { validatePrescriptionAttachment } from "@/lib/workflow-rules";
import { uploadFileToCloudinary } from "@/lib/storage";

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "doctor") {
      return NextResponse.json({ error: "Please log in as a doctor to save prescriptions." }, { status: 401 });
    }

    const { appointmentId } = await context.params;
    const formData = await request.formData();
    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    let attachmentType: string | undefined;

    const attachment = formData.get("attachmentFile");
    if (attachment instanceof File && attachment.size > 0) {
      const attachmentError = validatePrescriptionAttachment({ type: attachment.type, size: attachment.size });
      if (attachmentError) {
        return NextResponse.json({ error: attachmentError }, { status: 400 });
      }

      const upload = await uploadFileToCloudinary({
        file: attachment,
        folder: "prescriptions",
        fileNamePrefix: appointmentId
      });

      attachmentUrl = upload.url;
      attachmentName = attachment.name || upload.originalFilename || "prescription";
      attachmentType = attachment.type;
    }

    const prescription = await createPrescription({
      appointmentId,
      doctorUserId: session.userId,
      medicines: String(formData.get("medicines") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      attachmentUrl,
      attachmentName,
      attachmentType
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save prescription." }, { status: 400 });
  }
}
