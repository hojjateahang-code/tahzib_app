import type { User } from '../types';

export interface EitaaDetectedUser {
  id: string | number;
  username?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  photo_url?: string;
}

export interface EitaaMatchedRole {
  role: string;
  currentUser?: User;
  title: string;
  adminType?: string;
}

/**
 * الگوریتم ۴ لایه‌ای استخراج اطلاعات کاربر ایتا
 */
export function detectEitaaUserFromEnvironment(): EitaaDetectedUser | null {
  if (typeof window === "undefined") return null;

  try {
    let user: any = null;

    // لایه ۱: بررسی کش موقت (sessionStorage)
    const cached = sessionStorage.getItem("eitaa_detected_user");
    if (cached) {
      try {
        user = JSON.parse(cached);
      } catch (e) {
        // invalid JSON in cache
      }
    }

    // لایه ۲: خواندن از SDK بومی ایتا (Eitaa.WebApp یا Telegram.WebApp)
    const eitaaApp = (window as any).Eitaa?.WebApp || (window as any).Telegram?.WebApp;
    if (!user && eitaaApp?.initDataUnsafe?.user) {
      user = eitaaApp.initDataUnsafe.user;
    }

    // لایه ۳: استخراج مستقیم از URL در صورت وجود tgWebAppData / eitaa_id / params
    if (!user) {
      const hashStr = window.location.hash || window.location.search;
      if (hashStr.includes("tgWebAppData=")) {
        const match = hashStr.match(/tgWebAppData=([^&]+)/);
        if (match) {
          const params = new URLSearchParams(decodeURIComponent(match[1]));
          const userStr = params.get("user");
          if (userStr) {
            try {
              user = JSON.parse(userStr);
            } catch (e) {}
          }
        }
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const eitaaId = urlParams.get("eitaa_id") || urlParams.get("tg_id");
        const username = urlParams.get("eitaa_username") || urlParams.get("username");
        const name = urlParams.get("eitaa_name") || urlParams.get("name");

        if (eitaaId || username) {
          user = {
            id: eitaaId || username || "1001",
            username: username ? username.replace(/^@/, "") : undefined,
            first_name: name || "کاربر ایتا",
          };
        }
      }
    }

    // لایه ۴: مقداردهی و کش اولیه
    if (user) {
      let rawUsername = user.username ? String(user.username).replace(/^@/, "").trim() : "";
      // Ignore synthetic "user_123" usernames coming from old cache
      if (rawUsername.startsWith("user_")) {
        rawUsername = "";
      }

      const userId = user.id ? String(user.id).trim() : "";
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || (rawUsername ? `@${rawUsername}` : "کاربر ایتا");

      const formattedUser: EitaaDetectedUser = {
        id: userId || "1001",
        username: rawUsername || undefined, // Only keep true user-chosen username e.g. "h_ahang"
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        photo_url: user.photo_url
      };

      sessionStorage.setItem("eitaa_detected_user", JSON.stringify(formattedUser));
      return formattedUser;
    }
  } catch (err) {
    console.warn("خطا در شناسایی خودکار کاربر ایتا:", err);
  }

  return null;
}

/**
 * تابع تطبیق آیدی ایتا با دیتابیس کاربران و مدیران
 */
export const matchEitaaUser = (
  rawUsername: string | undefined, 
  userId: string | number | undefined, 
  userList: User[]
): EitaaMatchedRole | null => {
  const cleanUsername = rawUsername ? rawUsername.trim().toLowerCase().replace(/^@/, "") : "";
  const cleanUserId = userId ? userId.toString().trim() : "";
  const syntheticId = cleanUserId ? `user_${cleanUserId}` : "";

  // ۱. بررسی ادمین‌های ثابت سیستم
  const storedAdminEitaa = (localStorage.getItem("admin_eitaa_username") || "modir").toLowerCase().replace(/^@/, "");
  
  if (
    (cleanUsername && (cleanUsername === storedAdminEitaa || cleanUsername === "admin")) ||
    (cleanUserId && (cleanUserId === storedAdminEitaa || syntheticId === storedAdminEitaa))
  ) {
    const adminUser = userList.find(u => u.role === "DIRECTOR" || u.username === "modir");
    return {
      role: "admin",
      adminType: "full",
      currentUser: adminUser,
      title: "مدیر کل سیستم"
    };
  }

  // ۲. بررسی در لیست کاربران / طلاب / اساتید ثبت‌شده در دیتابیس
  const foundUser = userList.find((u) => {
    const uEitaaUserId = u.eitaaUserId ? u.eitaaUserId.toString().trim() : "";
    const uEitaaId = u.eitaaId ? u.eitaaId.trim().toLowerCase().replace(/^@/, "") : "";
    const uUsername = u.username ? u.username.trim().toLowerCase().replace(/^@/, "") : "";

    // A) Match by unique Eitaa numerical User ID
    if (cleanUserId) {
      if (
        uEitaaUserId === cleanUserId ||
        uEitaaId === cleanUserId ||
        uEitaaId === syntheticId ||
        uUsername === cleanUserId ||
        uUsername === syntheticId
      ) {
        return true;
      }
    }

    // B) Match by custom Eitaa Username (e.g. h_ahang)
    if (cleanUsername && cleanUsername !== syntheticId && !cleanUsername.startsWith("user_")) {
      if (
        uEitaaId === cleanUsername ||
        uEitaaUserId === cleanUsername ||
        uUsername === cleanUsername
      ) {
        return true;
      }
    }

    return false;
  });

  if (foundUser) {
    const roleTitles: Record<string, string> = {
      STUDENT: "طلبه محترم",
      VICE_PRINCIPAL: "معاون محترم تهذیب",
      DIRECTOR: "مدیر محترم مدرسه",
      MENTOR: "استاد محترم راهنما",
      COUNSELOR: "مشاور محترم"
    };

    return {
      role: foundUser.role,
      currentUser: foundUser,
      title: `${roleTitles[foundUser.role] || "کاربر محترم"}: ${foundUser.name}`
    };
  }

  // کاربر در ایتا هست اما هنوز در سیستم ثبت‌نام نکرده است
  return null;
};
