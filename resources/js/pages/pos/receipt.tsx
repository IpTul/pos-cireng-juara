import { Head, Link } from '@inertiajs/react';
import type { Sale } from '@/types';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface Props {
  sale: Sale;
}

export default function Receipt({ sale }: Props) {
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
            <span>Rp{sale.total.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span>Cash</span>
            <span>Rp{sale.cash_tendered.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span>Change</span>
            <span>Rp{sale.change_amount.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    </>
  );
}
