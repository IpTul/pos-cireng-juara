// resource/js/pages/products/product-form.tsx

import { Cabang, Product } from '@/types';
import { useForm } from '@inertiajs/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { FormEvent, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

interface Props {
  cabangs: Cabang[];
  product?: Product | null;
  onClose: () => void;
}

export default function ProductForm({ cabangs, product, onClose }: Props) {
  const { data, setData, post, processing, errors, reset, transform } = useForm(
    {
      name: product?.name ?? '',
      cabang_id: product?.cabang_id?.toString() ?? '',
      description: product?.description ?? '',
      price: product?.price ?? '',
      stock: product?.stock?.toString() ?? '0',
      is_active: product?.is_active ?? true,
      image: null as File | null,
    },
  );

  const fileRef = useRef<HTMLInputElement>(null);

  // URL sementara untuk file yang baru dipilih
  const preview = useMemo(
    () => (data.image ? URL.createObjectURL(data.image) : null),
    [data.image],
  );

  // Bebaskan memori saat file diganti atau form ditutup
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Gambar yang sudah tersimpan di produk (sesuaikan dengan datamu, lihat catatan)
  const currentImage = product?.image ? `/storage/${product.image}` : null;

  const shownImage = preview ?? currentImage;

  function clearImage() {
    setData('image', null);
    if (fileRef.current) fileRef.current.value = '';
  }

  //   function submit(e: FormEvent) {
  //     e.preventDefault();
  //     const opts = {
  //       forceFormData: true,
  //       onSuccess: () => {
  //         toast.success(product ? 'Product updated.' : 'Product created.');
  //         reset();
  //         onClose();
  //       },
  //     };
  //     product ? put(`/products/${product.id}`, opts) : post('/products', opts);
  //   }

  function submit(e: FormEvent) {
    e.preventDefault();

    if (product) {
      transform((data) => ({ ...data, _method: 'put' }));
    }

    const url = product ? `/products/${product.id}` : '/products';

    post(url, {
      forceFormData: true,
      onSuccess: () => {
        toast.success(product ? 'Product updated.' : 'Product created.');
        reset();
        onClose();
      },
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => setData('name', e.target.value)}
            />
            <InputError message={errors.name} />
          </div>

          <div>
            <Label>Cabang</Label>
            <Select
              value={data.cabang_id}
              onValueChange={(v) => setData('cabang_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cabang" />
              </SelectTrigger>
              <SelectContent>
                {cabangs.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.cabang_id} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={data.price}
                onChange={(e) => setData('price', e.target.value)}
              />
              <InputError message={errors.price} />
            </div>
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={data.stock}
                onChange={(e) => setData('stock', e.target.value)}
              />
              <InputError message={errors.stock} />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={data.description}
              onChange={(e) => setData('description', e.target.value)}
            />
            <InputError message={errors.description} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image (optional)</Label>

            {shownImage && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  {preview ? 'Preview gambar baru' : 'Gambar saat ini'}
                </p>
                <img
                  src={shownImage}
                  alt={product?.name ?? 'Preview produk'}
                  className="bg-muted h-40 w-full rounded-md border object-contain"
                />
              </div>
            )}

            <Input
              ref={fileRef}
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setData('image', e.target.files?.[0] ?? null)}
            />

            {preview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearImage}
              >
                Batalkan gambar baru
              </Button>
            )}

            <InputError message={errors.image} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={data.is_active}
              onChange={(e) => setData('is_active', e.target.checked)}
            />
            <Label htmlFor="is_active">Active (visible in POS)</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {processing ? 'Saving…' : product ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
