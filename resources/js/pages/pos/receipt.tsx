// resources/js/pages/pos/receipt.tsx

import { Head, Link } from '@inertiajs/react';
import { Printer, ArrowLeft, User, Award } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types';

interface Props {
  sale: Sale;
}

function rupiah(value: number | string) {
  return `Rp${Math.round(Number(value)).toLocaleString('id-ID')}`;
}

export default function Receipt({ sale }: Props) {
  const isQris = sale.payment_method === 'qris';
  const isGrab = sale.payment_method === 'grab';
  const isGoFood = sale.payment_method === 'gofood';
  const isSettled = isQris || isGrab || isGoFood;

  const methodLabel = isQris
    ? 'QRIS'
    : isGrab
      ? 'GRAB'
      : isGoFood
        ? 'GOFOOD'
        : 'Tunai';

  // Tandai perangkat sentuh non-iOS (HP/tablet Android, termasuk mode
  // "situs desktop") supaya memakai ukuran cetak yang lebih besar.
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const isTouch = navigator.maxTouchPoints > 0;

    if (!isTouch || isIOS) return;

    document.documentElement.classList.add('receipt-android');
    return () => document.documentElement.classList.remove('receipt-android');
  }, []);

  return (
    <>
      <Head title={`Receipt #${sale.id}`} />

      {/* Tombol: hanya tampil di layar, tidak ikut tercetak */}
      <div className="no-print flex gap-2 border-b p-4">
        <Link href="/pos">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to POS
          </Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* Isi struk */}
      <div className="receipt-paper">
        <div className="rc-center">
          <p className="rc-title">CIRENG JUARA</p>
          {sale.cabang?.name && (
            <p className="rc-small rc-strong">{sale.cabang.name}</p>
          )}
          <p className="rc-small rc-muted">
            {new Date(sale.created_at).toLocaleString('id-ID')}
          </p>
        </div>

        {sale.operator_name && (
          <div className="rc-section-first rc-row rc-small">
            <span className="rc-muted">Operator</span>
            <span className="rc-strong">{sale.operator_name}</span>
          </div>
        )}

        {sale.customer_name && (
          <div className="rc-section rc-row rc-small">
            <span className="rc-muted">Nama Customer</span>
            <span className="rc-strong">{sale.customer_name}</span>
          </div>
        )}

        {sale.member && (
          <div className="rc-section rc-stack rc-small">
            <div className="rc-row">
              <span className="rc-label rc-muted">
                <User />
                Member
              </span>
              <span className="rc-strong">{sale.member.name}</span>
            </div>
            <div className="rc-row">
              <span className="rc-label rc-muted">
                <Award />
                Poin Member
              </span>
              <span className="rc-strong">{sale.member.points} poin</span>
            </div>
          </div>
        )}

        {/* Daftar item */}
        <div className="rc-section">
          {sale.items.map((item) => (
            <div key={item.id} className="rc-item">
              <div className="rc-row">
                <span className="rc-name">{item.product_name}</span>
                <span className="rc-price">{rupiah(item.subtotal)}</span>
              </div>
              <div className="rc-small rc-muted">
                {item.quantity} × {rupiah(item.unit_price)}
              </div>
            </div>
          ))}
        </div>

        {/* Total dan pembayaran */}
        <div className="rc-section rc-stack">
          <div className="rc-row rc-total">
            <span>TOTAL</span>
            <span>{rupiah(sale.total)}</span>
          </div>

          <div className="rc-row">
            <span className="rc-muted">Metode</span>
            <span className="rc-strong">{methodLabel}</span>
          </div>

          {isSettled ? (
            <div className="rc-row">
              <span className="rc-muted">Dibayar</span>
              <span className="rc-strong">{rupiah(sale.total)}</span>
            </div>
          ) : (
            <>
              <div className="rc-row">
                <span className="rc-muted">Tunai</span>
                <span>{rupiah(sale.cash_tendered)}</span>
              </div>
              <div className="rc-row">
                <span className="rc-muted">Kembalian</span>
                <span>{rupiah(sale.change_amount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer struk */}
        <div className="rc-footer rc-muted">
          <p>Terima Kasih Ya Guys</p>
          <p>IG : Cirengjuara.smd</p>
          {/* <p>WA : 082211495774</p> */}
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://linktr.ee/cirengjuara.smd"
            alt="QR Code Linktree"
            className="rc-qr"
          />
          <div className="rc-feed" />
        </div>
      </div>
    </>
  );
}
