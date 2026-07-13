import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

process.env.DATABASE_URL = "postgres://example";
process.env.STORAGE_PROVIDER = "local";

const { ensureStorageReady, loadImageObject, saveImageObject } = await import("./storage.js");
const { validateStoredImage } = await import("./imageResponse.js");

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00
]);

test("local storage keeps uploaded image bytes out of the file system", async () => {
  const uploadRoot = path.resolve(process.cwd(), "uploads");
  await rm(uploadRoot, { force: true, recursive: true });

  await ensureStorageReady();
  const saved = await saveImageObject({
    fileName: "issue-1.png",
    buffer: validPng,
    mimeType: "image/png"
  });

  assert.equal(saved.provider, "local-memory");
  assert.equal(saved.objectPath, "issue-1.png");
  assert.equal(saved.publicUrl, "/api/photos/issue-1.png");
  assert.equal(existsSync(uploadRoot), false);

  const loaded = await loadImageObject(saved.objectPath);
  assert.deepEqual(loaded, validPng);
});

test("stored image validation rejects executable or mismatched content", () => {
  assert.equal(
    validateStoredImage({
      fileName: "issue-1.png",
      mimeType: "image/png",
      image: validPng
    }),
    "image/png"
  );

  assert.throws(
    () =>
      validateStoredImage({
        fileName: "issue-1.svg",
        mimeType: "image/svg+xml",
        image: Buffer.from("<svg><script>alert(1)</script></svg>")
      }),
    /unsupported or invalid image type/
  );

  assert.throws(
    () =>
      validateStoredImage({
        fileName: "issue-1.png",
        mimeType: "image/png",
        image: Buffer.from("<script>alert(1)</script>")
      }),
    /unsupported or invalid image type/
  );
});
