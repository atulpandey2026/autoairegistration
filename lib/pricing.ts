export function calculatePrice(count: number) {
  const unit = count === 1 ? 10000 : count <= 4 ? 8000 : 7000;
  const subtotal = unit * count;
  const gstRate = Number(process.env.GST_RATE ?? 18);
  const gst = Math.round(subtotal * gstRate / 100);
  const category = count === 1 ? 'Individual Pass' : count <= 4 ? 'Team Access' : 'Group Access';
  return { unit, subtotal, gst, total: subtotal + gst, gstRate, category };
}
export const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
