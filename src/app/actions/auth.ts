'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const VALID_USERS = [
  { username: 'Admin', password: 'AdminDTIS1', role: 'admin' },
  { username: 'Ketua Program Studi', password: 'KaprodiDTIS1', role: 'kaprodi' },
  { username: 'Sekretaris Program Studi', password: 'SekprodiDTIS1', role: 'sekprodi' },
];

export async function loginUser(formData: FormData) {
  const username = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();

  if (!username || !password) {
    return { error: 'Username dan Password wajib diisi' };
  }

  const user = VALID_USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return { error: 'Username atau Password salah' };
  }

  // Set auth cookie, expires in 1 day
  cookies().set('seminar_auth_token', user.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return { success: true };
}

export async function logoutUser() {
  cookies().delete('seminar_auth_token');
  redirect('/login');
}
