import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";

// Load environment variables strictly on server side from .env file
dotenv.config();

// Ignore SSL certificate verification issues for custom S3/MinIO endpoints
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { createServer as createViteServer } from "vite";
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  HeadBucketCommand,
  ListObjectsV2Command,
  CreateBucketCommand
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const app = express();
const PORT = 3000;

// Enable JSON body parsing with higher payload limit for database dumps/backups
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Local Storage Setup on Server Disk
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");

const BACKUPS_DIR = path.join(STORAGE_PATH, "backups");
const ATTACHMENTS_DIR = path.join(STORAGE_PATH, "attachments");
const UPDATES_DIR = path.join(STORAGE_PATH, "updates");

// Ensure local storage directories exist automatically
[STORAGE_PATH, BACKUPS_DIR, ATTACHMENTS_DIR, UPDATES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to get MinIO / S3 Client (Optional fallback)
function getS3Client() {
  let endpoint = (process.env.MINIO_ENDPOINT || "https://gift.nodrive.ir").trim().replace(/\/+$/, "");
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    endpoint = `https://${endpoint}`;
  }

  const accessKeyId = (process.env.MINIO_ACCESS_KEY_ID || "").trim().replace(/^["']|["']$/g, "");
  const secretAccessKey = (process.env.MINIO_SECRET_ACCESS_KEY || "").trim().replace(/^["']|["']$/g, "");
  const region = (process.env.MINIO_REGION || "us-east-1").trim();

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
  });

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
      httpsAgent,
      connectionTimeout: 10000,
      requestTimeout: 15000,
    }),
  });
}

const getBucketAndPrefix = () => {
  const bucket = (process.env.MINIO_BUCKET || "09107739189main").trim().replace(/^["']|["']$/g, "");
  let prefix = (process.env.MINIO_PREFIX || "tahzibApp/").trim().replace(/^["']|["']$/g, "");
  if (prefix && !prefix.endsWith("/")) {
    prefix += "/";
  }
  return { bucket, prefix };
};

// API Route: Server Time Sync for Clock Synchronization & Offset
app.get("/api/time", (req, res) => {
  const now = Date.now();
  res.setHeader("Date", new Date(now).toUTCString());
  res.json({ serverTime: now });
});

// API Route: Server Storage Status Check
app.get("/api/sync/status", async (req, res) => {
  try {
    const accessKey = (process.env.MINIO_ACCESS_KEY_ID || "").trim().replace(/^["']|["']$/g, "");
    const secretKey = (process.env.MINIO_SECRET_ACCESS_KEY || "").trim().replace(/^["']|["']$/g, "");
    const { bucket, prefix } = getBucketAndPrefix();
    let endpoint = (process.env.MINIO_ENDPOINT || "https://gift.nodrive.ir").trim().replace(/\/+$/, "");
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      endpoint = `https://${endpoint}`;
    }

    const isMinioConfigured = Boolean(accessKey && secretKey);

    if (isMinioConfigured) {
      const s3 = getS3Client();

      // Test 1: ListObjectsV2
      try {
        await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
        return res.json({
          configured: true,
          connected: true,
          storageType: "minio",
          message: `اتصال به سرور مینیو (MinIO) و باکت "${bucket}" با موفقیت برقرار است.`,
          endpoint,
          bucket,
          prefix
        });
      } catch (listErr: any) {
        console.warn("MinIO ListObjectsV2 check failed, trying HeadBucket/CreateBucket:", listErr.message || listErr);

        // Test 2: HeadBucket
        try {
          await s3.send(new HeadBucketCommand({ Bucket: bucket }));
          return res.json({
            configured: true,
            connected: true,
            storageType: "minio",
            message: `اتصال به سرور مینیو (MinIO) و باکت "${bucket}" برقرار است.`,
            endpoint,
            bucket,
            prefix
          });
        } catch (headErr: any) {
          // Test 3: Try creating bucket if it doesn't exist
          try {
            await s3.send(new CreateBucketCommand({ Bucket: bucket }));
            return res.json({
              configured: true,
              connected: true,
              storageType: "minio",
              message: `باکت "${bucket}" بر روی سرور MinIO ایجاد شد و اتصال برقرار گردید.`,
              endpoint,
              bucket,
              prefix
            });
          } catch (createErr: any) {
            const errDetail = listErr.name || listErr.message || headErr.message || createErr.message || String(listErr);
            console.error("MinIO connection failed completely:", errDetail);
            return res.json({
              configured: true,
              connected: false,
              storageType: "local",
              message: `کلیدهای MinIO تنظیم شده اما اتصال به باکت "${bucket}" در سرور ${endpoint} برقرار نشد (${errDetail}). لطفاً صحت کلیدها و نام باکت را در فایل .env بررسی نمایید.`,
              endpoint,
              bucket,
              prefix,
              error: errDetail
            });
          }
        }
      }
    }

    // Primary Storage: Server Direct Disk Storage
    return res.json({
      configured: true,
      connected: true,
      storageType: "server",
      message: "ذخیره‌سازی و همگام‌سازی داده‌ها مستقیماً بر روی دیسک سرور اصلی سامانه با موفقیت برقرار است.",
      storagePath: STORAGE_PATH,
    });
  } catch (error: any) {
    return res.json({
      configured: false,
      connected: false,
      storageType: "local",
      message: `خطا در عیب‌یابی ذخیره‌ساز: ${error.message}`,
      endpoint: process.env.MINIO_ENDPOINT || "https://gift.nodrive.ir",
      bucket: (process.env.MINIO_BUCKET || "").trim(),
      prefix: (process.env.MINIO_PREFIX || "").trim(),
      storagePath: STORAGE_PATH,
    });
  }
});

// API Route: Backup/Sync Data Upload
app.post("/api/sync/upload", async (req, res) => {
  try {
    const { key, data } = req.body;
    const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);

    const relativePath = key || "backups/latest.json";
    const cleanRelPath = relativePath.replace(/^tahzibApp\//, "").replace(/^\/+/, "");
    const localFilePath = path.join(STORAGE_PATH, cleanRelPath);

    // 1. Save to Local Disk
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
    fs.writeFileSync(localFilePath, jsonString, "utf-8");

    // Also write a copy to BACKUPS_DIR if key is latest or device backup
    const filename = path.basename(cleanRelPath);
    const backupCopyPath = path.join(BACKUPS_DIR, filename);
    if (backupCopyPath !== localFilePath) {
      fs.writeFileSync(backupCopyPath, jsonString, "utf-8");
    }

    // 2. Upload to MinIO Cloud if configured
    const accessKey = (process.env.MINIO_ACCESS_KEY_ID || "").trim();
    const secretKey = (process.env.MINIO_SECRET_ACCESS_KEY || "").trim();

    if (accessKey && secretKey) {
      try {
        const { bucket, prefix } = getBucketAndPrefix();
        const objectKey = cleanRelPath.startsWith(prefix) ? cleanRelPath : `${prefix}${cleanRelPath}`;
        const s3 = getS3Client();

        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: jsonString,
          ContentType: "application/json",
        }));

        return res.json({
          success: true,
          storageType: "minio",
          message: "داده‌ها با موفقیت در ذخیره‌ساز ابری MinIO همگام‌سازی و ذخیره شدند.",
          key: cleanRelPath,
          timestamp: new Date().toISOString()
        });
      } catch (minioErr: any) {
        console.error("MinIO sync upload error:", minioErr.message || minioErr);
        return res.json({
          success: false,
          storageType: "local_only",
          message: `داده‌ها به صورت محلی ذخیره شدند اما ارسال به سرور ابری MinIO با خطا مواجه شد: ${minioErr.message || "خطای ارسال"}`,
          key: cleanRelPath,
          timestamp: new Date().toISOString()
        });
      }
    }

    return res.json({
      success: true,
      storageType: "local",
      message: "داده‌ها با موفقیت در ذخیره‌ساز محلی سرور ذخیره شدند.",
      key: cleanRelPath,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Sync Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: `خطا در ذخیره‌سازی: ${error.message}`
    });
  }
});

// API Route: Backup/Sync List Objects
app.get("/api/sync/list", async (req, res) => {
  try {
    let files: any[] = [];
    const fileMap = new Map<string, any>();

    const accessKey = (process.env.MINIO_ACCESS_KEY_ID || "").trim();
    const secretKey = (process.env.MINIO_SECRET_ACCESS_KEY || "").trim();

    // 1. Fetch from MinIO if configured
    if (accessKey && secretKey) {
      try {
        const { bucket, prefix } = getBucketAndPrefix();
        const s3 = getS3Client();
        const response = await s3.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        }));

        if (response.Contents && response.Contents.length > 0) {
          for (const item of response.Contents) {
            if (!item.Key) continue;
            const cleanKey = item.Key.startsWith(prefix) ? item.Key.slice(prefix.length) : item.Key;
            if (cleanKey.endsWith('.json')) {
              fileMap.set(cleanKey, {
                key: cleanKey,
                fullKey: item.Key,
                size: item.Size || 0,
                lastModified: item.LastModified || new Date()
              });
            }
          }
        }
      } catch (minioErr) {
        console.warn("MinIO list warning (fallback to local):", minioErr);
      }
    }

    // 2. Combine with Local Disk files
    const scanDir = (dirPath: string, baseRel: string = "") => {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          scanDir(fullPath, path.join(baseRel, entry));
        } else if (entry.endsWith('.json')) {
          const relKey = path.join(baseRel, entry).replace(/\\/g, '/');
          const cleanKey = relKey.startsWith('backups/') ? relKey : `backups/${relKey}`;
          if (!fileMap.has(cleanKey)) {
            fileMap.set(cleanKey, {
              key: cleanKey,
              fullKey: cleanKey,
              size: stats.size,
              lastModified: stats.mtime
            });
          }
        }
      }
    };

    scanDir(BACKUPS_DIR, "backups");
    scanDir(STORAGE_PATH, "");

    files = Array.from(fileMap.values()).sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return res.json({
      success: true,
      files
    });
  } catch (error: any) {
    console.error("Sync List Error:", error);
    return res.status(500).json({
      success: false,
      message: `خطا در دریافت لیست فایل‌ها: ${error.message}`
    });
  }
});

// API Route: Backup/Sync Data Download
app.get("/api/sync/download", async (req, res) => {
  try {
    const reqKey = (req.query.key as string) || "backups/latest.json";
    const cleanRelPath = reqKey.replace(/^tahzibApp\//, "").replace(/^\/+/, "");
    const accessKey = (process.env.MINIO_ACCESS_KEY_ID || "").trim();
    const secretKey = (process.env.MINIO_SECRET_ACCESS_KEY || "").trim();

    // 1. Try MinIO Cloud download FIRST if configured
    if (accessKey && secretKey) {
      try {
        const { bucket, prefix } = getBucketAndPrefix();
        const objectKey = cleanRelPath.startsWith(prefix) ? cleanRelPath : `${prefix}${cleanRelPath}`;
        const s3 = getS3Client();
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
        if (response.Body) {
          const str = await response.Body.transformToString();
          const parsedData = JSON.parse(str);
          
          // Also cache/write locally for offline speed
          const localFilePath = path.join(STORAGE_PATH, cleanRelPath);
          fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
          fs.writeFileSync(localFilePath, str, "utf-8");

          return res.json({ success: true, data: parsedData, key: cleanRelPath, source: "minio" });
        }
      } catch (e) {
        console.warn("MinIO download fallback to local for key:", cleanRelPath);
      }
    }

    // 2. Fallback to local disk file
    const localFilePath = path.join(STORAGE_PATH, cleanRelPath);
    if (fs.existsSync(localFilePath)) {
      const str = fs.readFileSync(localFilePath, "utf-8");
      const parsedData = JSON.parse(str);
      return res.json({
        success: true,
        data: parsedData,
        key: cleanRelPath,
        source: "local"
      });
    }

    return res.status(404).json({
      success: false,
      message: "هیچ نسخه همگام‌سازی‌شده‌ای روی سرور یافت نشد."
    });
  } catch (error: any) {
    console.error("Sync Download Error:", error);
    return res.status(500).json({
      success: false,
      message: `خطا در دریافت پشتیبان: ${error.message}`
    });
  }
});

// API Route: File Upload to Local Storage
app.post("/api/storage/upload", async (req, res) => {
  try {
    const { name, content, mimeType } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, message: "نام یا محتوای فایل نامعتبر است." });
    }

    const cleanName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${cleanName}`;
    const fileRelPath = `attachments/${fileName}`;
    const localFilePath = path.join(ATTACHMENTS_DIR, fileName);

    let buffer: Buffer;
    let contentType = mimeType || "application/octet-stream";

    if (content.startsWith("data:")) {
      const parts = content.split(";base64,");
      contentType = parts[0].replace("data:", "");
      buffer = Buffer.from(parts[1], "base64");
    } else {
      buffer = Buffer.from(content, "base64");
    }

    fs.writeFileSync(localFilePath, buffer);

    const proxyUrl = `/api/storage/file?key=${encodeURIComponent(fileRelPath)}`;

    return res.json({
      success: true,
      url: proxyUrl,
      fileKey: fileRelPath,
      name
    });
  } catch (error: any) {
    console.error("File Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: `خطا در آپلود فایل به سرور: ${error.message}`
    });
  }
});

// API Route: Serve File from Local Storage
app.get("/api/storage/file", async (req, res) => {
  try {
    const fileKey = req.query.key as string;
    if (!fileKey) {
      return res.status(400).send("فایل درخواستی نامشخص است.");
    }

    const cleanRelPath = fileKey.replace(/^tahzibApp\//, "").replace(/^\/+/, "");
    const localFilePath = path.join(STORAGE_PATH, cleanRelPath);

    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }

    // Optional MinIO fallback
    if (process.env.MINIO_ACCESS_KEY_ID && process.env.MINIO_SECRET_ACCESS_KEY) {
      try {
        const { bucket } = getBucketAndPrefix();
        const s3 = getS3Client();
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));
        if (response.Body) {
          if (response.ContentType) {
            res.setHeader("Content-Type", response.ContentType);
          }
          const byteArray = await response.Body.transformToByteArray();
          return res.send(Buffer.from(byteArray));
        }
      } catch (e) {
        // Fallback failed
      }
    }

    return res.status(404).send("فایل یافت نشد.");
  } catch (error: any) {
    return res.status(404).send("فایل یافت نشد.");
  }
});

// ==========================================
// Live Update API endpoints (Local Storage backed)
// ==========================================

function isNewerVersion(current: string, latest: string): boolean {
  const cParts = current.split('.').map(Number);
  const lParts = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const cVal = cParts[i] || 0;
    const lVal = lParts[i] || 0;
    if (lVal > cVal) return true;
    if (cVal > lVal) return false;
  }
  return false;
}

// GET Route: Check if a new version is available locally
app.get("/api/update/check", async (req, res) => {
  try {
    const currentVersion = (req.query.currentVersion as string) || "1.0.0";
    const updateJsonPath = path.join(UPDATES_DIR, "update.json");

    let updateConfig = {
      version: "1.0.0",
      releaseNotes: "نسخه اولیه برنامه تهذیب حوزه علمیه",
      apkKey: "updates/tahzib-app-v1.apk",
      forceUpdate: false,
      updatedAt: new Date().toISOString()
    };

    if (fs.existsSync(updateJsonPath)) {
      try {
        const str = fs.readFileSync(updateJsonPath, "utf-8");
        updateConfig = JSON.parse(str);
      } catch (e) {
        console.error("Error reading update.json locally:", e);
      }
    } else {
      // Auto-publish default configuration to local storage
      fs.writeFileSync(updateJsonPath, JSON.stringify(updateConfig, null, 2), "utf-8");
    }

    const updateAvailable = isNewerVersion(currentVersion, updateConfig.version);
    const apkProxyUrl = updateConfig.apkKey 
      ? `/api/storage/file?key=${encodeURIComponent(updateConfig.apkKey)}` 
      : "";

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

  } catch (error: any) {
    console.error("Live Update check error:", error);
    return res.json({
      success: false,
      updateAvailable: false,
      message: `خطا در پایش نسخه جدید: ${error.message}`
    });
  }
});

// POST Route: Publish/Push a new version config metadata locally
app.post("/api/update/publish", async (req, res) => {
  try {
    const { version, releaseNotes, apkKey, forceUpdate } = req.body;
    if (!version) {
      return res.status(400).json({ success: false, message: "شماره نسخه الزامی است." });
    }

    const updateConfig = {
      version,
      releaseNotes: releaseNotes || "بهبود عملکرد و هماهنگی بخش‌های تهذیبی",
      apkKey: apkKey || "updates/tahzib-app-v1.apk",
      forceUpdate: Boolean(forceUpdate),
      updatedAt: new Date().toISOString()
    };

    const updateJsonPath = path.join(UPDATES_DIR, "update.json");
    fs.writeFileSync(updateJsonPath, JSON.stringify(updateConfig, null, 2), "utf-8");

    return res.json({
      success: true,
      message: `نسخه جدید ${version} با موفقیت در سرور محلی منتشر گردید.`,
      config: updateConfig
    });

  } catch (error: any) {
    console.error("Publish update config error:", error);
    return res.status(500).json({
      success: false,
      message: `خطا در انتشار اطلاعات نسخه جدید: ${error.message}`
    });
  }
});

async function startServer() {
  // Vite middleware setup for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Tahzib Server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Local Storage Directory: ${STORAGE_PATH}`);
  });
}

startServer();
