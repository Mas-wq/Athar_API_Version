import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const uploadsDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const formats = {
  "image/jpeg": { extension: ".jpg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { extension: ".png", signature: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: ".webp", signature: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  "image/gif": { extension: ".gif", signature: (b) => ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6)) },
};

export const uploadImages = async (req, res) => {
  try {
    const images = req.body?.images;
    if (!Array.isArray(images) || images.length < 1 || images.length > MAX_IMAGES) {
      return res.status(400).json({ message: "Upload between 1 and 5 images." });
    }

    await mkdir(uploadsDirectory, { recursive: true });
    const urls = [];
    for (const image of images) {
      const format = formats[image?.mimeType];
      if (!format || typeof image.data !== "string") {
        return res.status(400).json({ message: "Only JPEG, PNG, WebP, and GIF images are supported." });
      }
      const buffer = Buffer.from(image.data, "base64");
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !format.signature(buffer)) {
        return res.status(400).json({ message: "An image is invalid or exceeds the 5 MB limit." });
      }
      const filename = `${randomUUID()}${format.extension}`;
      await writeFile(path.join(uploadsDirectory, filename), buffer, { flag: "wx" });
      urls.push(`/uploads/${filename}`);
    }
    return res.status(201).json({ urls });
  } catch (error) {
    console.error("Local image upload error:", error);
    return res.status(500).json({ message: "Could not save images locally." });
  }
};
