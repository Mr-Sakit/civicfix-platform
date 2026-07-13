import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

process.env.DATABASE_URL = "postgres://example";
process.env.STORAGE_PROVIDER = "local";

const { ensureStorageReady, loadImageObject, saveImageObject } = await import("./storage.js");

test("local storage keeps uploaded image bytes out of the file system", async () => {
  const uploadRoot = path.resolve(process.cwd(), "uploads");
  await rm(uploadRoot, { force: true, recursive: true });

  await ensureStorageReady();
  const saved = await saveImageObject({
    fileName: "issue-1.png",
    buffer: Buffer.from("image-bytes"),
    mimeType: "image/png"
  });

  assert.equal(saved.provider, "local-memory");
  assert.equal(saved.objectPath, "issue-1.png");
  assert.equal(saved.publicUrl, "/api/photos/issue-1.png");
  assert.equal(existsSync(uploadRoot), false);

  const loaded = await loadImageObject(saved.objectPath);
  assert.equal(loaded.toString("utf8"), "image-bytes");
});
