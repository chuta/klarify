'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  applicablePlans: string[];
  billingCycles: string[];
  maxRedemptions: number | null;
  redemptionCount: number;
  maxPerOrg: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AdminCouponsClientProps {
  accessToken: string;
}

function discountLabel(coupon: AdminCoupon): string {
  if (coupon.discountType === 'percent') return `${coupon.discountValue}% off`;
  return `₦${coupon.discountValue.toLocaleString()} off`;
}

function generateCode(): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KLARIFY-${suffix}`;
}

export function AdminCouponsClient({ accessToken }: AdminCouponsClientProps): JSX.Element {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState(generateCode());
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed_ngn'>('percent');
  const [discountValue, setDiscountValue] = useState('20');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as { success: boolean; data?: AdminCoupon[]; error?: string };
      if (!data.success || !data.data) {
        setError(data.error ?? 'Failed to load coupons.');
        return;
      }
      setCoupons(data.data);
    } catch {
      setError('Network error loading coupons.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code,
          description: description.trim() || undefined,
          discountType,
          discountValue: Number(discountValue),
          applicablePlans: ['all'],
          billingCycles: ['monthly', 'annual'],
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          isActive: true,
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) {
        setError(data.error ?? 'Could not create coupon.');
        return;
      }
      setShowForm(false);
      setCode(generateCode());
      setDescription('');
      setDiscountValue('20');
      setMaxRedemptions('');
      setValidUntil('');
      await loadCoupons();
    } catch {
      setError('Network error creating coupon.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon: AdminCoupon): Promise<void> {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = (await res.json()) as { success: boolean };
      if (data.success) await loadCoupons();
    } catch {
      setError('Could not update coupon.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#555555]">
          Create marketing codes for checkout discounts. Users apply codes on the billing page before
          paying via Korapay.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D2B45]"
        >
          + New coupon
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-[#FDF2F2] px-3 py-2 text-sm text-[#C0392B]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#555555]">Loading coupons…</p>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CCCCCC] bg-[#FAFAFA] p-8 text-center text-sm text-[#555555]">
          No coupons yet. Create your first campaign code.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#CCCCCC] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#F5F5F5] bg-[#FAFAFA] text-xs uppercase tracking-wide text-[#555555]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-[#F5F5F5] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-[#1A1A1A]">{coupon.code}</p>
                    {coupon.description ? (
                      <p className="text-xs text-[#555555]">{coupon.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{discountLabel(coupon)}</td>
                  <td className="px-4 py-3">
                    {coupon.redemptionCount}
                    {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ' / ∞'}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.validUntil
                      ? new Date(coupon.validUntil).toLocaleDateString('en-NG')
                      : 'No expiry'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        coupon.isActive ? 'bg-[#EFF7F2] text-[#1A7A4A]' : 'bg-[#F5F5F5] text-[#555555]',
                      ].join(' ')}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(coupon)}
                      className="text-xs font-medium text-[#0B6E6E] hover:underline"
                    >
                      {coupon.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-[#F5F5F5] px-6 py-4">
              <h2 className="text-base font-semibold text-[#1A1A1A]">Create coupon</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium">Code</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border border-[#CCCCCC] px-3 py-2 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setCode(generateCode())}
                    className="rounded-lg border border-[#CCCCCC] px-3 text-xs"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Campaign note</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. BNUG Lagos March 2026"
                  className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed_ngn')}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm"
                  >
                    <option value="percent">Percent off</option>
                    <option value="fixed_ngn">Fixed ₦ off</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Value</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={discountType === 'percent' ? 100 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Max redemptions</label>
                  <input
                    type="number"
                    min={1}
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Expires</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Creating…' : 'Create coupon'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#CCCCCC] px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-[#CCCCCC]">
        Admin access is controlled by <code>KLARIFY_ADMIN_EMAILS</code>.{' '}
        <Link href="/dashboard/billing" className="text-[#0B6E6E] hover:underline">
          Test on billing page →
        </Link>
      </p>
    </div>
  );
}
