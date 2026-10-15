export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="no-print fixed inset-x-0 bottom-0 z-30 flex h-[var(--footer-total-h)] items-center justify-center border-t border-border bg-background px-4 pb-[env(safe-area-inset-bottom)] text-xs whitespace-nowrap text-muted-foreground md:sticky md:inset-x-auto md:mt-auto md:h-auto md:py-2 md:pb-2">
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
  );
}
