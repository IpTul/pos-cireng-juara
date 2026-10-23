import BottomNav from '@/components/bottom-nav';

/**
 * Letakkan tepat setelah {children} di layout.
 * Urutan: [bottom bar (HP/tablet)] lalu [footer copyright], keduanya sticky
 * di dasar layar. Di desktop hanya footer yang tampil.
 */
export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <BottomNav />

      <footer className="no-print sticky bottom-0 z-30 flex h-[var(--footer-total-h)] shrink-0 items-center justify-center border-t border-border bg-background px-4 pb-[env(safe-area-inset-bottom)] text-xs whitespace-nowrap text-muted-foreground desk:mt-auto desk:h-auto desk:py-2 desk:pb-2">
        <p>
          &copy; {year} Cireng Juara. Dikembangkan oleh{' '}
          <a
            href="https://iptul.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            IpTul
          </a>
          .
        </p>
      </footer>
    </>
  );
}