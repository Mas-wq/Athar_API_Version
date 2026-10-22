import { api } from "./api.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

const fileToBase64 = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

export const uploadLocalImages = async (files) => {
  if (!files.length) return [];
  if (files.length > MAX_IMAGES) throw new Error("Choose up to 5 images.");
  const images = await Promise.all(files.map(async (file) => {
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} exceeds the 5 MB limit.`);
    return { mimeType: file.type, data: await fileToBase64(file) };
  }));
  const { data } = await api.post("/uploads/images", { images });
  return data.urls;
};
