var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_client_s3 = require("@aws-sdk/client-s3");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var STORAGE_PATH = process.env.STORAGE_PATH || import_path.default.join(process.cwd(), "storage");
var BACKUPS_DIR = import_path.default.join(STORAGE_PATH, "backups");
var ATTACHMENTS_DIR = import_path.default.join(STORAGE_PATH, "attachments");
var UPDATES_DIR = import_path.default.join(STORAGE_PATH, "updates");
[STORAGE_PATH, BACKUPS_DIR, ATTACHMENTS_DIR, UPDATES_DIR].forEach((dir) => {
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
});
function getS3Client() {
  let endpoint = (process.env.MINIO_ENDPOINT || "https://gift.nodrive.ir").trim().replace(/\/+$/, "");
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    endpoint = `https://${endpoint}`;
  }
  const accessKeyId = (process.env.MINIO_ACCESS_KEY_ID || "").trim().replace(/^["']|["']$/g, "");
  const secretAccessKey = (process.env.MINIO_SECRET_ACCESS_KEY || "").trim().replace(/^["']|["']$/g, "");
  const region = (process.env.MINIO_REGION || "us-east-1").trim();
  return new import_client_s3.S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    forcePathStyle: true
  });
}
var getBucketAndPrefix = () => {
  const bucket = (process.env.MINIO_BUCKET || "09107739189main").trim().replace(/^["']|["']$/g, "");
  let prefix = (process.env.MINIO_PREFIX || "tahzibApp/").trim().replace(/^["']|["']$/g, "");
  if (prefix && !prefix.endsWith("/")) {
    prefix += "/";
  }
  return { bucket, prefix };
};
app.get("/api/time", (req, res) => {
  const now = Date.now();
  res.setHeader("Date", new Date(now).toUTCString());
  res.json({ serverTime: now });
});
app.get("/api/sync/status", async (req, res) => {
  try {
    const accessKey = process.env.MINIO_ACCESS_KEY_ID;
    const secretKey = process.env.MINIO_SECRET_ACCESS_KEY;
    const isMinioConfigured = Boolean(accessKey && secretKey);
    if (isMinioConfigured) {
      try {
        const s3 = getS3Client();
        const { bucket, prefix } = getBucketAndPrefix();
        await s3.send(new import_client_s3.HeadBucketCommand({ Bucket: bucket }));
        return res.json({
          configured: true,
          connected: true,
          storageType: "minio",
          message: "\u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0633\u0631\u0648\u0631 \u0645\u06CC\u0646\u06CC\u0648 (MinIO) \u0648 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632 \u0645\u062D\u0644\u06CC \u0628\u0631\u0642\u0631\u0627\u0631 \u0627\u0633\u062A.",
          endpoint: process.env.MINIO_ENDPOINT || "https://gift.nodrive.ir",
          bucket,
          prefix
        });
      } catch (headErr) {
      }
    }
    return res.json({
      configured: true,
      connected: true,
      storageType: "local",
      message: "\u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632 \u0645\u062D\u0644\u06CC \u0633\u0631\u0648\u0631 (Local Disk Storage) \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0631\u0642\u0631\u0627\u0631 \u0627\u0633\u062A.",
      storagePath: STORAGE_PATH
    });
  } catch (error) {
    return res.json({
      configured: true,
      connected: true,
      storageType: "local",
      message: "\u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632 \u0645\u062D\u0644\u06CC \u0633\u0631\u0648\u0631 \u0628\u0631\u0642\u0631\u0627\u0631 \u0627\u0633\u062A.",
      storagePath: STORAGE_PATH
    });
  }
});
app.post("/api/sync/upload", async (req, res) => {
  try {
    const { key, data } = req.body;
    const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const relativePath = key || "backups/latest.json";
    const cleanRelPath = relativePath.replace(/^tahzibApp\//, "").replace(/^\/+/, "");
    const localFilePath = import_path.default.join(STORAGE_PATH, cleanRelPath);
    import_fs.default.mkdirSync(import_path.default.dirname(localFilePath), { recursive: true });
    import_fs.default.writeFileSync(localFilePath, jsonString, "utf-8");
    if (!key || key === "backups/latest.json" || cleanRelPath === "backups/latest.json") {
      const timestampPath = import_path.default.join(BACKUPS_DIR, `backup-${Date.now()}.json`);
      import_fs.default.writeFileSync(timestampPath, jsonString, "utf-8");
    }
    if (process.env.MINIO_ACCESS_KEY_ID && process.env.MINIO_SECRET_ACCESS_KEY) {
      try {
        const { bucket, prefix } = getBucketAndPrefix();
        const objectKey = key ? `${prefix}${key}` : `${prefix}backups/latest.json`;
        const s3 = getS3Client();
        await s3.send(new import_client_s3.PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: jsonString,
          ContentType: "application/json"
        }));
      } catch (minioErr) {
        console.warn("MinIO sync mirror warning (ignored):", minioErr);
      }
    }
    return res.json({
      success: true,
      message: "\u062F\u0627\u062F\u0647\u200C\u0647\u0627 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632 \u0633\u0631\u0648\u0631 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F\u0646\u062F.",
      key: cleanRelPath,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Local Sync Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632\u06CC \u0633\u0631\u0648\u0631: ${error.message}`
    });
  }
});
app.get("/api/sync/list", async (req, res) => {
  try {
    let files = [];
    if (import_fs.default.existsSync(BACKUPS_DIR)) {
      const filenames = import_fs.default.readdirSync(BACKUPS_DIR);
      files = filenames.map((file) => {
        const filePath = import_path.default.join(BACKUPS_DIR, file);
        const stats = import_fs.default.statSync(filePath);
        return {
          key: `backups/${file}`,
          fullKey: `backups/${file}`,
          size: stats.size,
          lastModified: stats.mtime
        };
      }).sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    }
    return res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error("Local Sync List Error:", error);
    return res.status(500).json({
      success: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0644\u06CC\u0633\u062A \u0641\u0627\u06CC\u0644\u200C\u0647\u0627: ${error.message}`
    });
  }
});
app.get("/api/sync/download", async (req, res) => {
  try {
    const reqKey = req.query.key || "backups/latest.json";
    const cleanRelPath = reqKey.replace(/^tahzibApp\//, "").replace(/^\/+/, "");
    const localFilePath = import_path.default.join(STORAGE_PATH, cleanRelPath);
    if (import_fs.default.existsSync(localFilePath)) {
      const str = import_fs.default.readFileSync(localFilePath, "utf-8");
      const parsedData = JSON.parse(str);
      return res.json({
        success: true,
        data: parsedData,
        key: cleanRelPath
      });
    }
    if (process.env.MINIO_ACCESS_KEY_ID && process.env.MINIO_SECRET_ACCESS_KEY) {
      try {
        const { bucket, prefix } = getBucketAndPrefix();
        const objectKey = `${prefix}${reqKey}`;
        const s3 = getS3Client();
        const response = await s3.send(new import_client_s3.GetObjectCommand({ Bucket: bucket, Key: objectKey }));
        if (response.Body) {
          const str = await response.Body.transformToString();
          const parsedData = JSON.parse(str);
          return res.json({ success: true, data: parsedData, key: reqKey });
        }
      } catch (e) {
      }
    }
    return res.status(404).json({
      success: false,
      message: "\u0647\u06CC\u0686 \u0646\u0633\u062E\u0647 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC\u200C\u0634\u062F\u0647\u200C\u0627\u06CC \u0631\u0648\u06CC \u0633\u0631\u0648\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F."
    });
  } catch (error) {
    console.error("Sync Download Error:", error);
    return res.status(500).json({
      success: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u0634\u062A\u06CC\u0628\u0627\u0646: ${error.message}`
    });
  }
});
app.post("/api/storage/upload", async (req, res) => {
  try {
    const { name, content, mimeType } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, message: "\u0646\u0627\u0645 \u06CC\u0627 \u0645\u062D\u062A\u0648\u0627\u06CC \u0641\u0627\u06CC\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A." });
    }
    const cleanName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${cleanName}`;
    const fileRelPath = `attachments/${fileName}`;
    const localFilePath = import_path.default.join(ATTACHMENTS_DIR, fileName);
    let buffer;
    let contentType = mimeType || "application/octet-stream";
    if (content.startsWith("data:")) {
      const parts = content.split(";base64,");
      contentType = parts[0].replace("data:", "");
      buffer = Buffer.from(parts[1], "base64");
    } else {
      buffer = Buffer.from(content, "base64");
    }
    import_fs.default.writeFileSync(localFilePath, buffer);
    const proxyUrl = `/api/storage/file?key=${encodeURIComponent(fileRelPath)}`;
    return res.json({
      success: true,
      url: proxyUrl,
      fileKey: fileRelPath,
      name
    });
  } catch (error) {
    console.error("File Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u0622\u067E\u0644\u0648\u062F \u0641\u0627\u06CC\u0644 \u0628\u0647 \u0633\u0631\u0648\u0631: ${error.message}`
    });
  }
});
app.get("/api/storage/file", async (req, res) => {
  try {
    const fileKey = req.query.key;
    if (!fileKey) {
      return res.status(400).send("\u0641\u0627\u06CC\u0644 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC \u0646\u0627\u0645\u0634\u062E\u0635 \u0627\u0633\u062A.");
    }
    const cleanRelPath = fileKey.replace(/^tahzibApp\//, "").replace(/^\/+/, "");
    const localFilePath = import_path.default.join(STORAGE_PATH, cleanRelPath);
    if (import_fs.default.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }
    if (process.env.MINIO_ACCESS_KEY_ID && process.env.MINIO_SECRET_ACCESS_KEY) {
      try {
        const { bucket } = getBucketAndPrefix();
        const s3 = getS3Client();
        const response = await s3.send(new import_client_s3.GetObjectCommand({ Bucket: bucket, Key: fileKey }));
        if (response.Body) {
          if (response.ContentType) {
            res.setHeader("Content-Type", response.ContentType);
          }
          const byteArray = await response.Body.transformToByteArray();
          return res.send(Buffer.from(byteArray));
        }
      } catch (e) {
      }
    }
    return res.status(404).send("\u0641\u0627\u06CC\u0644 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.");
  } catch (error) {
    return res.status(404).send("\u0641\u0627\u06CC\u0644 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.");
  }
});
function isNewerVersion(current, latest) {
  const cParts = current.split(".").map(Number);
  const lParts = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const cVal = cParts[i] || 0;
    const lVal = lParts[i] || 0;
    if (lVal > cVal) return true;
    if (cVal > lVal) return false;
  }
  return false;
}
app.get("/api/update/check", async (req, res) => {
  try {
    const currentVersion = req.query.currentVersion || "1.0.0";
    const updateJsonPath = import_path.default.join(UPDATES_DIR, "update.json");
    let updateConfig = {
      version: "1.0.0",
      releaseNotes: "\u0646\u0633\u062E\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0647\u0630\u06CC\u0628 \u062D\u0648\u0632\u0647 \u0639\u0644\u0645\u06CC\u0647",
      apkKey: "updates/tahzib-app-v1.apk",
      forceUpdate: false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (import_fs.default.existsSync(updateJsonPath)) {
      try {
        const str = import_fs.default.readFileSync(updateJsonPath, "utf-8");
        updateConfig = JSON.parse(str);
      } catch (e) {
        console.error("Error reading update.json locally:", e);
      }
    } else {
      import_fs.default.writeFileSync(updateJsonPath, JSON.stringify(updateConfig, null, 2), "utf-8");
    }
    const updateAvailable = isNewerVersion(currentVersion, updateConfig.version);
    const apkProxyUrl = updateConfig.apkKey ? `/api/storage/file?key=${encodeURIComponent(updateConfig.apkKey)}` : "";
    return res.json({
      success: true,
      currentVersion,
      latestVersion: updateConfig.version,
      updateAvailable,
      releaseNotes: updateConfig.releaseNotes,
      apkUrl: apkProxyUrl,
      forceUpdate: updateConfig.forceUpdate,
      updatedAt: updateConfig.updatedAt
    });
  } catch (error) {
    console.error("Live Update check error:", error);
    return res.json({
      success: false,
      updateAvailable: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u067E\u0627\u06CC\u0634 \u0646\u0633\u062E\u0647 \u062C\u062F\u06CC\u062F: ${error.message}`
    });
  }
});
app.post("/api/update/publish", async (req, res) => {
  try {
    const { version, releaseNotes, apkKey, forceUpdate } = req.body;
    if (!version) {
      return res.status(400).json({ success: false, message: "\u0634\u0645\u0627\u0631\u0647 \u0646\u0633\u062E\u0647 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
    }
    const updateConfig = {
      version,
      releaseNotes: releaseNotes || "\u0628\u0647\u0628\u0648\u062F \u0639\u0645\u0644\u06A9\u0631\u062F \u0648 \u0647\u0645\u0627\u0647\u0646\u06AF\u06CC \u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u062A\u0647\u0630\u06CC\u0628\u06CC",
      apkKey: apkKey || "updates/tahzib-app-v1.apk",
      forceUpdate: Boolean(forceUpdate),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updateJsonPath = import_path.default.join(UPDATES_DIR, "update.json");
    import_fs.default.writeFileSync(updateJsonPath, JSON.stringify(updateConfig, null, 2), "utf-8");
    return res.json({
      success: true,
      message: `\u0646\u0633\u062E\u0647 \u062C\u062F\u06CC\u062F ${version} \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u0633\u0631\u0648\u0631 \u0645\u062D\u0644\u06CC \u0645\u0646\u062A\u0634\u0631 \u06AF\u0631\u062F\u06CC\u062F.`,
      config: updateConfig
    });
  } catch (error) {
    console.error("Publish update config error:", error);
    return res.status(500).json({
      success: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u0627\u0646\u062A\u0634\u0627\u0631 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0646\u0633\u062E\u0647 \u062C\u062F\u06CC\u062F: ${error.message}`
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Tahzib Server running on http://0.0.0.0:${PORT}`);
    console.log(`\u{1F4C1} Local Storage Directory: ${STORAGE_PATH}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
