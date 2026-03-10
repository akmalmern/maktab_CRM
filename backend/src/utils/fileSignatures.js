const fs = require("fs/promises");

function startsWithBytes(buffer, bytes) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function detectFileSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return null;

  // %PDF-
  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "pdf";
  }

  // JPEG FF D8 FF
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return "jpeg";
  }

  // PNG 89 50 4E 47 0D 0A 1A 0A
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }

  // WEBP: RIFF....WEBP
  const riff = buffer.slice(0, 4).toString("ascii");
  const webp = buffer.slice(8, 12).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") {
    return "webp";
  }

  return null;
}

async function detectFileSignatureFromPath(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(16), 0, 16, 0);
    return detectFileSignature(buffer.slice(0, bytesRead));
  } finally {
    await handle.close();
  }
}

module.exports = {
  detectFileSignature,
  detectFileSignatureFromPath,
};
