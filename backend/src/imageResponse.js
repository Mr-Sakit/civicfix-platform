const supportedImageTypes = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"]
]);

const getExtension = (fileName) => {
  const match = /\.([a-z0-9]+)$/i.exec(String(fileName ?? ""));
  return match?.[1]?.toLowerCase();
};

const hasExpectedMagicBytes = (image, contentType) => {
  if (!Buffer.isBuffer(image)) return false;

  if (contentType === "image/png") {
    return (
      image.length >= 8 &&
      image[0] === 0x89 &&
      image[1] === 0x50 &&
      image[2] === 0x4e &&
      image[3] === 0x47 &&
      image[4] === 0x0d &&
      image[5] === 0x0a &&
      image[6] === 0x1a &&
      image[7] === 0x0a
    );
  }

  if (contentType === "image/jpeg") {
    return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  }

  if (contentType === "image/webp") {
    return (
      image.length >= 12 &&
      image.subarray(0, 4).toString("ascii") === "RIFF" &&
      image.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
};

const createUnsupportedImageError = () => {
  const error = new Error("Stored photo has an unsupported or invalid image type");
  error.statusCode = 415;
  return error;
};

export const validateStoredImage = ({ fileName, mimeType, image }) => {
  const extension = getExtension(fileName);
  const expectedType = supportedImageTypes.get(extension);

  if (!expectedType || mimeType !== expectedType || !hasExpectedMagicBytes(image, expectedType)) {
    throw createUnsupportedImageError();
  }

  return expectedType;
};

export const sendStoredImage = (response, { fileName, mimeType, image }) => {
  const contentType = validateStoredImage({ fileName, mimeType, image });

  response
    .set("Cache-Control", "private, max-age=300")
    .set("Content-Type", contentType)
    .set("X-Content-Type-Options", "nosniff")
    .end(image);
};
