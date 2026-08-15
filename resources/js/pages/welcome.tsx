import { useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import { login, dashboard } from '@/routes';

export default function Welcome() {
  const { auth } = usePage().props;

  useEffect(() => {
    if (auth.user) {
      router.visit(dashboard(), { replace: true });
    } else {
      router.visit(login(), { replace: true });
    }
  }, [auth.user]);

  return null;
}