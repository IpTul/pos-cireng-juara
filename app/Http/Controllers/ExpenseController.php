<?php

namespace App\Http\Controllers;

use App\Models\Cabang;
use App\Models\Expense;
use App\Models\Sale;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pengeluaran dari uang tunai (mis. beli gas). Sisa tunai = penjualan tunai
 * pada hari itu dikurangi total pengeluaran hari itu, per cabang.
 *
 * Kasir hanya mengelola pengeluaran cabangnya pada hari ini. Owner bisa
 * melihat semua cabang dan mengubah/menghapus kapan saja.
 */
class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $this->authorizeRole($request);

        $day = $this->resolveDate($request->input('date'));
        $cabangId = $user->activeCabangId();

        $expenses = Expense::with('cabang:id,name')
            ->whereBetween('created_at', [$day->copy()->startOfDay(), $day->copy()->endOfDay()])
            ->when($cabangId, fn ($q) => $q->where('cabang_id', $cabangId))
            ->latest()
            ->latest('id')
            ->get();

        $cashSales = $this->cashSalesByCabang($day, $cabangId);
        $spent = $expenses->groupBy('cabang_id')->map->sum('amount');

        $perCabang = Cabang::query()
            ->when($cabangId, fn ($q) => $q->where('id', $cabangId))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function (Cabang $cabang) use ($cashSales, $spent) {
                $sales = (int) ($cashSales[$cabang->id] ?? 0);
                $out = (int) ($spent[$cabang->id] ?? 0);

                return [
                    'cabang' => $cabang->name,
                    'cash_sales' => $sales,
                    'expenses' => $out,
                    'balance' => $sales - $out,
                ];
            })
            ->values();

        return Inertia::render('expenses/index', [
            'date' => $day->toDateString(),
            'isToday' => $day->isSameDay(now()),
            'cabangName' => $cabangId ? Cabang::find($cabangId)?->name : null,
            'canAdd' => $cabangId !== null && $day->isSameDay(now()),
            'summary' => [
                'cash_sales' => (int) $perCabang->sum('cash_sales'),
                'expenses' => (int) $perCabang->sum('expenses'),
                'balance' => (int) $perCabang->sum('balance'),
            ],
            'perCabang' => $cabangId ? [] : $perCabang,
            'expenses' => $expenses->map(fn (Expense $e) => [
                'id' => $e->id,
                'description' => $e->description,
                'amount' => $e->amount,
                'cabang' => $e->cabang?->name,
                'operator' => $e->operator_name ?? '-',
                'created_at' => $e->created_at,
                'can_modify' => $this->canModify($user, $e),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->authorizeRole($request);
        $validated = $this->validated($request);

        $cabangId = $user->activeCabangId();
        if (! $cabangId) {
            throw ValidationException::withMessages([
                'description' => 'Pilih cabang terlebih dahulu sebelum mencatat pengeluaran.',
            ]);
        }

        Expense::create($validated + [
            'cabang_id' => $cabangId,
            'user_id' => $user->id,
            'operator_name' => $user->operator_name ?? $user->name,
        ]);

        return redirect()->back()->with('success', 'Pengeluaran dicatat.');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $user = $this->authorizeRole($request);
        abort_unless($this->canModify($user, $expense), 403, 'Pengeluaran ini tidak bisa diubah.');

        $expense->update($this->validated($request));

        return redirect()->back()->with('success', 'Pengeluaran diperbarui.');
    }

    public function destroy(Request $request, Expense $expense): RedirectResponse
    {
        $user = $this->authorizeRole($request);
        abort_unless($this->canModify($user, $expense), 403, 'Pengeluaran ini tidak bisa dihapus.');

        $expense->delete();

        return redirect()->back()->with('success', 'Pengeluaran dihapus.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
        ]);
    }

    private function authorizeRole(Request $request)
    {
        $user = $request->user();
        abort_unless($user?->inRole(['owner', 'kasir']), 403, 'Akses ditolak.');

        return $user;
    }

    private function canModify($user, Expense $expense): bool
    {
        if ($user->isOwner()) {
            return true;
        }

        return $user->cabang_id !== null
            && $expense->cabang_id === $user->cabang_id
            && $expense->created_at->isSameDay(now());
    }

    private function resolveDate(?string $value): CarbonInterface
    {
        if ($value && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            try {
                $date = Date::createFromFormat('Y-m-d', $value);
                if ($date) {
                    return $date->startOfDay();
                }
            } catch (\Throwable) {
                // tanggal tidak valid: pakai hari ini
            }
        }

        return now()->startOfDay();
    }

    /**
     * Total penjualan tunai (uang yang masuk laci) per cabang pada satu hari.
     *
     * @return array<int, int>
     */
    private function cashSalesByCabang(CarbonInterface $day, ?int $cabangId): array
    {
        return Sale::query()
            ->selectRaw('cabang_id, SUM(total) as total')
            ->where('status', 'completed')
            ->where(fn ($q) => $q->where('payment_method', 'cash')->orWhereNull('payment_method'))
            ->whereBetween('created_at', [$day->copy()->startOfDay(), $day->copy()->endOfDay()])
            ->when($cabangId, fn ($q) => $q->where('cabang_id', $cabangId))
            ->groupBy('cabang_id')
            ->pluck('total', 'cabang_id')
            ->map(fn ($total) => (int) $total)
            ->all();
    }
}