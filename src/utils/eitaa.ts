import type { User } from '../types';

export interface EitaaUser {
  id: string; // شناسه عددی یکتا در ایتا
  username?: string; // آیدی ایتا (بدون @)
  first_name?: string;
  last_name?: string;
  name: string; // نام کامل
  photo_url?: string;
  rawInitData?: any;
}

/**
 * دریافت اطلاعات کاربر از کیت توسعه ایتا (Eitaa WebApp SDK)
 */
export function getEitaaUserData(): EitaaUser | null {
  if (typeof window === 'undefined') return null;

  // 1. Check Eitaa WebApp SDK global object (window.Eitaa or window.Telegram)
  const eitaaSdk = (window as any).Eitaa?.WebApp || (window as any).Telegram?.WebApp;
  
  if (eitaaSdk) {
    try {
      eitaaSdk.ready?.();
      eitaaSdk.expand?.();
    } catch (e) {
      // ignore non-critical SDK ready errors
    }

    const initDataUser = eitaaSdk.initDataUnsafe?.user;
    if (initDataUser && (initDataUser.id || initDataUser.username)) {
      const numericId = String(initDataUser.id || '');
      const username = initDataUser.username ? String(initDataUser.username).replace(/^@/, '') : undefined;
      const firstName = initDataUser.first_name || '';
      const lastName = initDataUser.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || username || numericId;

      return {
        id: numericId,
        username,
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        photo_url: initDataUser.photo_url,
        rawInitData: eitaaSdk.initDataUnsafe
      };
    }
  }

  // 2. Check URL search parameters or hash params for Eitaa MiniApp entry URL
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    
    const eitaaId = urlParams.get('eitaa_id') || hashParams.get('eitaa_id') || urlParams.get('tg_id');
    const username = urlParams.get('eitaa_username') || hashParams.get('eitaa_username') || urlParams.get('username');
    const name = urlParams.get('eitaa_name') || hashParams.get('eitaa_name') || urlParams.get('name');

    if (eitaaId || username) {
      return {
        id: eitaaId || username || '1001',
        username: username ? username.replace(/^@/, '') : undefined,
        name: name || username || eitaaId || 'کاربر ایتا',
      };
    }
  } catch (err) {
    console.warn("Eitaa URL param check error:", err);
  }

  return null;
}

/**
 * تطبیق کاربر ایتا با کاربران ثبت‌شده در پایگاه داده
 * تطبیق بر اساس:
 * ۱. eitaaId برابر با شناسه عددی یا آیدی ایتا
 * ۲. username برابر با آیدی ایتا یا شناسه عددی ایتا
 */
export function findMatchingUserForEitaa(eitaaUser: EitaaUser, users: User[]): User | null {
  if (!eitaaUser || !users || users.length === 0) return null;

  const numericId = String(eitaaUser.id || '').trim();
  const cleanUsername = eitaaUser.username ? String(eitaaUser.username).trim().toLowerCase().replace(/^@/, '') : '';
  const syntheticId = numericId ? `user_${numericId}` : '';

  return users.find(u => {
    const uEitaaUserId = u.eitaaUserId ? String(u.eitaaUserId).trim() : '';
    const uEitaaId = u.eitaaId ? String(u.eitaaId).trim().toLowerCase().replace(/^@/, '') : '';
    const uUsername = u.username ? String(u.username).trim().toLowerCase().replace(/^@/, '') : '';

    if (numericId) {
      if (
        uEitaaUserId === numericId ||
        uEitaaId === numericId ||
        uEitaaId === syntheticId ||
        uUsername === numericId ||
        uUsername === syntheticId
      ) {
        return true;
      }
    }

    if (cleanUsername && cleanUsername !== syntheticId && !cleanUsername.startsWith('user_')) {
      if (
        uEitaaId === cleanUsername ||
        uEitaaUserId === cleanUsername ||
        uUsername === cleanUsername
      ) {
        return true;
      }
    }

    return false;
  }) || null;
}

/**
 * آیا اپلیکیشن در برنامک ایتا باز شده است؟
 */
export function isEitaaMiniAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).Eitaa?.WebApp ||
    (window as any).Telegram?.WebApp ||
    window.location.search.includes('eitaa_id') ||
    window.location.search.includes('tgWebApp')
  );
}
