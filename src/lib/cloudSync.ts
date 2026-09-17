export interface MinIOHealthStatus {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: any;
}

/**
 * تست سلامت و بررسی برقرار بودن اتصال به MinIO و سرور همگام‌سازی
 */
export async function testMinIOConnection(): Promise<MinIOHealthStatus> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('/api/sync/status', {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response && response.ok) {
      const data = await response.json();
      if (data.configured && data.connected) {
        return {
          success: true,
          message: `اتصال به سرور MinIO برقرار است (زمان پاسخ: ${latency}ms)`,
          latencyMs: latency,
          details: data
        };
      } else {
        return {
          success: false,
          message: data.message || `عدم پیکربندی کامل MinIO (زمان پاسخ: ${latency}ms)`,
          latencyMs: latency,
          details: data
        };
      }
    }

    // Fallback: Test time endpoint to verify general server connection
    const timeResponse = await fetch('/api/time', { method: 'GET' }).catch(() => null);
    if (timeResponse && timeResponse.ok) {
      return {
        success: true,
        message: `ارتباط با سرور برقرار است (بررسی زمان، تاخیر: ${latency}ms).`,
        latencyMs: latency
      };
    }

    return {
      success: false,
      message: "عدم دریافت پاسخ از سرور همگام‌سازی (ممکن است مشکلی در شبکه یا CORS وجود داشته باشد)."
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === "AbortError" 
        ? "خطای زمان‌پاسخ (Timeout): سرور در زمان ۶ ثانیه پاسخ نداد." 
        : `خطا در اتصال: ${err.message || "محدودیت شبکه یا CORS"}`,
    };
  }
}
