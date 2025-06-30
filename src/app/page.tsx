// src/app/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const rol = session?.user?.role;

    if (rol === 'superadmin' || rol === 'admin_arg' || rol === 'admin_py') {
      router.replace('/admin');
    } else if (rol === 'playero') {
      router.replace('/playero');
    } else {
      router.replace('/login');
    }
  }, [session, status, router]);

  return null; // no mostrar nada mientras redirige
}
