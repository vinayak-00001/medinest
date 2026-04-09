import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { updateDoctorProfile } from "@/lib/data";
import { uploadFileToCloudinary } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "doctor") {
      return NextResponse.json({ error: "Please log in as a doctor to update the profile." }, { status: 401 });
    }

    const formData = await request.formData();
    let avatarUrl: string | undefined;
    const avatarFile = formData.get("avatarFile");
    const languages = String(formData.get("languages") || "")
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean);

    if (avatarFile instanceof File && avatarFile.size > 0) {
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowedTypes.has(avatarFile.type)) {
        return NextResponse.json({ error: "Profile picture must be JPG, PNG, or WEBP." }, { status: 400 });
      }

      if (avatarFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Profile picture must be 5 MB or smaller." }, { status: 400 });
      }

      const upload = await uploadFileToCloudinary({
        file: avatarFile,
        folder: "doctors",
        fileNamePrefix: session.userId
      });
      avatarUrl = upload.url;
    }

    const profile = await updateDoctorProfile({
      actorUserId: session.userId,
      avatarUrl,
      bio: String(formData.get("bio") || ""),
      specialty: String(formData.get("specialty") || ""),
      experienceYears: Number(formData.get("experienceYears") || 0),
      feeInr: Number(formData.get("feeInr") || 0),
      languages
    });

    return NextResponse.json({ profile, message: "Doctor profile updated successfully." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update doctor profile." }, { status: 400 });
  }
}
