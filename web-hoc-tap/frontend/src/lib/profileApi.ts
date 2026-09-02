import { User } from '@/store/useAuthStore';

export async function updateProfile(token: string, profile: Partial<User>): Promise<User> {
  const res = await fetch('http://127.0.0.1:3005/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });

  const updatedUser = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(updatedUser?.message || 'Không thể cập nhật hồ sơ');
  }

  return updatedUser;
}
