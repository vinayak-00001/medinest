import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required storage configuration: ${name}`);
  }
  return value;
}

function buildCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "bin";
}

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

async function uploadFileToLocalStorage(input: {
  file: File;
  folder: string;
  fileNamePrefix: string;
}) {
  const folderName = sanitizeSegment(input.folder) || "files";
  const uploadsDir = path.join(process.cwd(), "public", "uploads", folderName);
  await mkdir(uploadsDir, { recursive: true });

  const extension = extensionFromMimeType(input.file.type);
  const fileName = `${sanitizeSegment(input.fileNamePrefix) || "file"}-${randomUUID()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/${folderName}/${fileName}`,
    publicId: fileName,
    originalFilename: input.file.name || fileName,
    provider: "local" as const
  };
}

async function uploadFileToCloudinaryInternal(input: {
  file: File;
  folder: string;
  fileNamePrefix: string;
}) {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const baseFolder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "medinest";
  const folder = `${sanitizeSegment(baseFolder)}/${sanitizeSegment(input.folder)}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = `${sanitizeSegment(input.fileNamePrefix) || "file"}-${randomUUID()}.${
    extensionFromMimeType(input.file.type)
  }`;

  const signature = buildCloudinarySignature(
    {
      folder,
      public_id: publicId,
      timestamp
    },
    apiSecret
  );

  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("api_key", apiKey);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("resource_type", "auto");
  formData.append("signature", signature);
  formData.append("timestamp", timestamp);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json()) as {
    secure_url?: string;
    original_filename?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || "Cloud upload failed.");
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id ?? publicId,
    originalFilename: payload.original_filename,
    provider: "cloudinary" as const
  };
}

export async function uploadFile(input: {
  file: File;
  folder: string;
  fileNamePrefix: string;
}) {
  if (hasCloudinaryConfig()) {
    return uploadFileToCloudinaryInternal(input);
  }

  if (process.env.NODE_ENV !== "production") {
    return uploadFileToLocalStorage(input);
  }

  throw new Error("File upload is not configured. Add Cloudinary credentials to enable uploads in production.");
}

export const uploadFileToCloudinary = uploadFile;
