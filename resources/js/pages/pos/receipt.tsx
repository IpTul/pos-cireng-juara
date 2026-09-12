import { Head, Link } from '@inertiajs/react';
import type { Sale } from '@/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, QrCode, Bike, User, Award } from 'lucide-react';

interface Props {
  sale: Sale;
}

function formatRupiah(value: number) {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

export default function Receipt({ sale }: Props) {
  const isQris = sale.payment_method === 'qris';
  const isGrab = sale.payment_method === 'grab';
  const isSettled = isQris || isGrab;

  return (
    <>
      <Head title={`Receipt #${sale.id}`} />

      {/* Screen-only controls */}
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

      {/* Receipt body */}
      <div className="receipt-paper mx-auto max-w-xs p-6 font-mono text-sm">
        <div className="mb-4 text-center">
          <p className="text-xl font-bold">CIRENG JUARA</p>
          {/* <p className="text-xs text-muted-foreground">Your local shop</p> */}
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(sale.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Receipt #{sale.id}</p>
        </div>

        {sale.customer_name && (
          <div className="mb-3 flex justify-between border-t border-dashed pt-3 text-xs">
            <span className="text-muted-foreground">Nama Customer</span>
            <span className="font-medium">{sale.customer_name}</span>
          </div>
        )}

        {sale.member && (
          <div className="mb-3 flex justify-between border-t border-dashed pt-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              Member
            </span>
            <span className="font-medium">{sale.member.name}</span>
          </div>
        )}

        {sale.member && (
          <div className="mb-3 flex justify-between border-t border-dashed pt-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Award className="h-3 w-3" />
              Poin Member
            </span>
            <span className="font-medium">{sale.member.points} poin</span>
          </div>
        )}

        <div className="mb-3 space-y-2 border-t border-dashed pt-3">
          {sale.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between">
                <span className="flex-1 truncate">{item.product_name}</span>
                <span className="ml-2">
                  Rp{item.subtotal.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.quantity} × Rp{item.unit_price.toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-dashed pt-3">
          <div className="flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{formatRupiah(sale.total)}</span>
          </div>

          {/* FIX: setiap baris info pembayaran sekarang jadi flex-row sendiri, */}
          {/* ditumpuk vertikal — bukan digabung jadi 3 flex-item dalam satu baris */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                {isQris ? (
                  <>
                    <QrCode className="h-3 w-3" />
                    Metode
                  </>
                ) : isGrab ? (
                  <>
                    <Bike className="h-3 w-3" />
                    Metode
                  </>
                ) : (
                  <>Metode</>
                )}
              </span>
              <span className="font-medium">
                {isQris ? 'QRIS' : isGrab ? 'GRAB' : 'Tunai'}
              </span>
            </div>

            {isQris ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dibayar</span>
                <span className="font-medium">{formatRupiah(sale.total)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tunai</span>
                  <span>{formatRupiah(sale.cash_tendered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span>{formatRupiah(sale.change_amount)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Terima kasih datang kembali ya heart</p>
          <p>Kritik Saran & Terima Pesanan</p>
          <p>IG : Cirengjuara.smd</p>
          <p>WA : 082211495774</p>
        </div>
      </div>
    </>
  );
}
