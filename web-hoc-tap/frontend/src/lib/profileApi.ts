import { User } from '@/store/useAuthStore';
import { safeLocalStorageGet, safeLocalStorageSet } from './safeStorage';

export async function updateProfile(token: string | null, profile: Partial<User>): Promise<User> {
  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(profile),
    });

    if (res.ok) {
      const updatedUser = await res.json().catch(() => null);
      if (updatedUser) {
        if (typeof window !== 'undefined') {
          safeLocalStorageSet('user', JSON.stringify(updatedUser));
        }
        return updatedUser;
      }
    }
  } catch (_) {
    // Offline fallback
  }

  // Resilient Local Update
  let currentUser: any = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = safeLocalStorageGet('user');
      if (raw) currentUser = JSON.parse(raw);
    } catch (_) {}
  }

  const merged: User = {
    ...currentUser,
    ...profile,
    name: profile.name !== undefined ? profile.name : currentUser.name || 'Người dùng',
  };

  if (typeof window !== 'undefined') {
    safeLocalStorageSet('user', JSON.stringify(merged));
  }

  return merged;
}

export async function changePasswordApi(
  token: string | null,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    }

    return { success: true };
  } catch (err: any) {
    throw new Error(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại kết nối mạng.');
  }
}

