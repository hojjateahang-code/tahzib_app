export interface MinIOHealthStatus {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: any;
}

/**
 * تست سلامت و بررسی برقرار بودن اتصال به سرور اصلی سامانه و دیسک ذخیره‌سازی
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
      if (data.connected) {
        return {
          success: true,
          message: data.message || `اتصال به ذخیره‌ساز سرور اصلی سامانه برقرار است (زمان پاسخ: ${latency}ms)`,
          latencyMs: latency,
          details: data
        };
      } else {
        return {
          success: false,
          message: data.message || `ارتباط با سرور برقرار نشد (زمان پاسخ: ${latency}ms)`,
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
        message: `ارتباط با سرور اصلی برنامه‌ برقرار است (بررسی زمان، تاخیر: ${latency}ms).`,
        latencyMs: latency
      };
    }

    return {
      success: false,
      message: "عدم دریافت پاسخ از سرور اصلی سامانه (لطفاً اتصال اینترنت خود را بررسی کنید)."
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.name === "AbortError" 
        ? "خطای زمان‌پاسخ (Timeout): سرور اصلی در زمان ۶ ثانیه پاسخ نداد." 
        : `خطا در اتصال به سرور: ${err.message || "محدودیت شبکه"}`,
    };
  }
}
