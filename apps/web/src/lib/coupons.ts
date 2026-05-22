export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function formatDiscountSummary(
  discountType: string,
  discountValue: number,
): string {
  if (discountType === 'percent') return `${discountValue}% off`;
  return `₦${discountValue.toLocaleString()} off`;
}
