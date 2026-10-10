import { awaitsRazorpayConfirmation, displayOrderNumber, type Order, type OrderItem } from "./api";

/**
 * The orders report handed to the accountant, for one or more calendar months.
 *
 * Built in the browser from the orders the panel has already loaded — the
 * admin orders endpoint returns every order, so there is nothing more to fetch.
 * The PDF is the browser's own "Save as PDF": the report opens as a print-ready
 * page in a new tab, which keeps a PDF library (and the font embedding the ₹
 * and ś glyphs would need) out of the bundle.
 *
 * What counts as a sale here:
 *  - An online checkout the customer never paid for is left out entirely. It
 *    never earned an order number and nothing was shipped or collected.
 *  - A cancelled order is listed in its own table but kept out of every total,
 *    the same rule the on-screen Sales report follows.
 *
 * Months are Indian calendar months regardless of where the panel is opened.
 */

const IST = "Asia/Kolkata";
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// en-CA formats as YYYY-MM-DD, so the IST month is just the first 7 characters.
const istIsoDate = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" });

// Dates are assembled by hand rather than with Intl month names, because
// browsers disagree on the short form ("Sep" in some, "Sept" in others).
function istParts(date: Date) {
  const [year, month, day] = istIsoDate.format(date).split("-").map(Number);
  return { year, month: MONTH_NAMES[month - 1], day };
}
/** "8 Sep" */
const fmtDay = {
  format: (date: Date) => {
    const { month, day } = istParts(date);
    return `${day} ${month.slice(0, 3)}`;
  },
};
/** "8 Sep 2026" */
const fmtDate = { format: (date: Date) => `${fmtDay.format(date)} ${istParts(date).year}` };
/** "8 September 2026" */
const fmtLongDate = {
  format: (date: Date) => {
    const { year, month, day } = istParts(date);
    return `${day} ${month} ${year}`;
  },
};
const fmtTime = new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });

/** "2026-09" — the Indian calendar month a timestamp falls in. */
export function monthKey(iso: string | Date): string {
  return istIsoDate.format(new Date(iso)).slice(0, 7);
}

/** "2026-09" → "September 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;

function isContiguous(sortedKeys: string[]): boolean {
  return sortedKeys.every((k, i) => i === 0 || monthIndex(k) === monthIndex(sortedKeys[i - 1]) + 1);
}

/** "September 2026", "July – September 2026", or a plain list when months are skipped. */
export function periodLabel(keys: string[]): string {
  const sorted = [...keys].sort();
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return monthLabel(sorted[0]);
  if (!isContiguous(sorted)) return sorted.map(monthLabel).join(", ");
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  return `${sameYear ? MONTH_NAMES[Number(first.slice(5, 7)) - 1] : monthLabel(first)} – ${monthLabel(last)}`;
}

/** File name stem shared by the PDF and the spreadsheet. */
export function reportFileName(keys: string[]): string {
  const sorted = [...keys].sort();
  const span =
    sorted.length === 1
      ? sorted[0]
      : isContiguous(sorted)
        ? `${sorted[0]}_to_${sorted[sorted.length - 1]}`
        : `${sorted.length}_months`;
  return `Visvam_Orders_Report_${span}`;
}

const isUnpaidCheckout = awaitsRazorpayConfirmation;
const isSale = (o: Order) => !isUnpaidCheckout(o) && o.status !== "Cancelled";

export interface ReportMonth {
  key: string;
  label: string;
  /** Sales in the month — unpaid checkouts and cancelled orders excluded. */
  orders: number;
  value: number;
}

/** Every month that has at least one sale, newest first. */
export function reportMonths(orders: Order[]): ReportMonth[] {
  const map = new Map<string, ReportMonth>();
  for (const o of orders) {
    if (!isSale(o)) continue;
    const key = monthKey(o.createdAt);
    const month = map.get(key) ?? { key, label: monthLabel(key), orders: 0, value: 0 };
    month.orders += 1;
    month.value += o.totalPrice || 0;
    map.set(key, month);
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

function ordersInMonths(orders: Order[], keys: string[]) {
  const wanted = new Set(keys);
  const inPeriod = orders
    .filter((o) => wanted.has(monthKey(o.createdAt)))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return {
    sold: inPeriod.filter(isSale),
    cancelled: inPeriod.filter((o) => !isUnpaidCheckout(o) && o.status === "Cancelled"),
    unpaidCheckouts: inPeriod.filter(isUnpaidCheckout).length,
  };
}

function paymentMode(o: Order): string {
  if (o.paymentResult?.razorpayPaymentId) return "Online (Razorpay)";
  if (/cash/i.test(o.paymentMethod || "")) return "Cash on Delivery";
  if (/pickup/i.test(o.paymentMethod || "")) return "Pay on Pickup";
  // Went to Razorpay but no payment came back, yet the order is paid: someone
  // flipped it to paid in the panel. The accountant needs to know how.
  if (/razorpay/i.test(o.paymentMethod || "")) return "Marked paid manually";
  return o.paymentMethod || "Other";
}

const packOf = (i: OrderItem) => i.variantTitle || i.serving || "Standard";
const netItems = (o: Order) => (o.itemsPrice || 0) - (o.discountAmount || 0);
const emailOf = (o: Order) => o.shippingAddress?.email || o.guestEmail || o.user?.email || "";
const placeOf = (o: Order) => [o.shippingAddress?.city, o.shippingAddress?.state].filter(Boolean).join(", ");
const addressOf = (o: Order) =>
  [o.shippingAddress?.address, o.shippingAddress?.city, o.shippingAddress?.state, o.shippingAddress?.postalCode]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(", ");

interface Totals {
  orders: number;
  items: number;
  delivery: number;
  cod: number;
  tax: number;
  total: number;
}

function addTo(t: Totals, o: Order): Totals {
  t.orders += 1;
  t.items += netItems(o);
  t.delivery += o.shippingPrice || 0;
  t.cod += o.codFee || 0;
  t.tax += o.taxPrice || 0;
  t.total += o.totalPrice || 0;
  return t;
}

const emptyTotals = (): Totals => ({ orders: 0, items: 0, delivery: 0, cod: 0, tax: 0, total: 0 });

function groupBy(orders: Order[], keyOf: (o: Order) => string): Map<string, Totals> {
  const groups = new Map<string, Totals>();
  for (const o of orders) {
    const key = keyOf(o);
    groups.set(key, addTo(groups.get(key) ?? emptyTotals(), o));
  }
  return groups;
}

/* ── HTML helpers ───────────────────────────────────────── */

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const orDash = (v: unknown) => {
  const text = String(v ?? "").trim();
  return text ? esc(text) : "—";
};

const amt = (n: number) =>
  (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const inr = (n: number) => `₹${amt(n)}`;

function totalsCells(t: Totals): string {
  return (
    `<td class="n">${t.orders}</td><td class="n">${amt(t.items)}</td><td class="n">${amt(t.delivery)}</td>` +
    `<td class="n">${amt(t.cod)}</td><td class="n">${amt(t.tax)}</td><td class="n">${amt(t.total)}</td>`
  );
}

function breakdown(heading: string, firstColumn: string, groups: Map<string, Totals>, grand: Totals): string {
  const rows = [...groups.entries()].map(([k, t]) => `<tr><td>${esc(k)}</td>${totalsCells(t)}</tr>`).join("");
  return `<div class="keep"><h2>${heading}</h2>
<table><thead><tr><th>${firstColumn}</th><th class="n">Orders</th><th class="n">Items value</th><th class="n">Delivery</th><th class="n">COD fee</th><th class="n">GST charged</th><th class="n">Total</th></tr></thead>
<tbody>${rows}</tbody><tfoot><tr><td>Total</td>${totalsCells(grand)}</tr></tfoot></table></div>`;
}

function orderBlock(o: Order, n: number): string {
  const a = o.shippingAddress || {};
  const items = o.orderItems
    .map(
      (i) =>
        `<tr><td>${esc(i.name)}</td><td>${esc(packOf(i))}</td><td class="mono">${orDash(i.variantSku)}</td>` +
        `<td class="n">${i.qty}</td><td class="n">${amt(i.price)}</td><td class="n">${amt(i.price * i.qty)}</td></tr>`
    )
    .join("");
  const sums: Array<[string, number]> = [["Items subtotal", o.itemsPrice || 0]];
  if (o.discountAmount) sums.push([`Coupon discount${o.couponCode ? ` (${esc(o.couponCode)})` : ""}`, -o.discountAmount]);
  sums.push(["Delivery charge", o.shippingPrice || 0], ["COD fee", o.codFee || 0], ["GST charged", o.taxPrice || 0]);
  const created = new Date(o.createdAt);
  const paidOn = o.paidAt ? ` on ${fmtDate.format(new Date(o.paidAt))}` : "";
  return `
<div class="order">
  <div class="order-head"><span class="order-no">${n}. ${esc(displayOrderNumber(o))}</span><span>${fmtDate.format(created)}, ${fmtTime.format(created)} IST</span></div>
  <div class="cols">
    <dl>
      <dt>Customer</dt><dd>${orDash(a.fullName || o.user?.name)}</dd>
      <dt>Phone</dt><dd>${orDash(a.phone)}</dd>
      <dt>Email</dt><dd>${orDash(emailOf(o))}</dd>
      <dt>Address</dt><dd>${orDash(addressOf(o))}</dd>
      <dt>Delivery</dt><dd>${o.fulfillmentMethod === "pickup" ? "Collected from warehouse" : "Courier"}</dd>
    </dl>
    <dl>
      <dt>Payment</dt><dd>${esc(paymentMode(o))}</dd>
      <dt>Razorpay payment ID</dt><dd class="mono">${orDash(o.paymentResult?.razorpayPaymentId)}</dd>
      <dt>Razorpay order ID</dt><dd class="mono">${orDash(o.paymentResult?.razorpayOrderId)}</dd>
      <dt>Payment status</dt><dd>${o.isPaid ? `Paid${paidOn}` : "Unpaid"}</dd>
      <dt>Order status</dt><dd>${esc(o.status)}</dd>
    </dl>
  </div>
  <table><thead><tr><th>Product</th><th>Pack</th><th>SKU</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>${items}</tbody></table>
  <table class="sums"><tbody>${sums.map(([k, v]) => `<tr><td>${k}</td><td class="n">${amt(v)}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td>Order total</td><td class="n">${inr(o.totalPrice || 0)}</td></tr></tfoot></table>
</div>`;
}

const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f1a15; font-size: 10.5px; line-height: 1.5; margin: 0; background: #efe9e0; }
  .toolbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 14px; padding: 10px 20px; background: #2b2018; color: #f4ede2; font-size: 12px; }
  .toolbar button { font: inherit; font-weight: 600; padding: 7px 16px; border: 0; border-radius: 4px; background: #f4ede2; color: #2b2018; cursor: pointer; }
  .sheet { width: 210mm; max-width: 100%; margin: 20px auto; padding: 15mm; background: #fff; box-shadow: 0 1px 8px rgba(31, 26, 21, 0.15); }
  .masthead { border-bottom: 1px solid #1f1a15; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-family: 'Baskerville Old Face', Baskerville, Georgia, serif; font-size: 30px; font-style: italic; margin: 0; line-height: 1; }
  .meta { text-align: right; color: #5c5248; font-size: 10px; line-height: 1.6; }
  h1 { font-family: 'Baskerville Old Face', Baskerville, Georgia, serif; font-weight: 400; font-size: 21px; margin: 0 0 4px; }
  h2 { font-family: 'Baskerville Old Face', Baskerville, Georgia, serif; font-weight: 400; font-size: 16px; margin: 22px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #cfc6ba; break-after: avoid; }
  .lead { color: #5c5248; margin: 0 0 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 600; color: #5c5248; border-bottom: 1px solid #1f1a15; padding: 5px 6px; font-size: 9.5px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e6dfd5; vertical-align: top; }
  tfoot td { font-weight: 700; border-top: 1px solid #1f1a15; border-bottom: none; }
  tr { break-inside: avoid; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .nw { white-space: nowrap; }
  .mono { font-family: Consolas, 'Courier New', monospace; font-size: 9.5px; }
  .figures { width: 62%; }
  .figures .grand td { font-weight: 700; border-top: 1px solid #1f1a15; border-bottom: none; font-size: 12px; }
  .keep { break-inside: avoid; }
  .order { break-inside: avoid; border-top: 1px solid #1f1a15; padding: 9px 0 14px; }
  .order-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; color: #5c5248; }
  .order-no { font-family: 'Baskerville Old Face', Baskerville, Georgia, serif; font-size: 14px; color: #1f1a15; }
  .cols { display: flex; gap: 28px; margin-bottom: 6px; }
  .cols dl { flex: 1; margin: 0; display: grid; grid-template-columns: 108px 1fr; row-gap: 2px; }
  dt { color: #5c5248; } dd { margin: 0; overflow-wrap: anywhere; }
  .sums { width: 44%; margin: 4px 0 0 auto; }
  .sums td { border-bottom: none; padding: 2px 6px; }
  .sums tfoot td { border-top: 1px solid #1f1a15; padding-top: 4px; }
  ol.notes { padding-left: 18px; margin: 0; } ol.notes li { margin-bottom: 7px; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { width: auto; margin: 0; padding: 0; box-shadow: none; }
  }
`;

/**
 * The full report as a standalone HTML page. It prints to A4 and asks the
 * browser for the print dialog as soon as it has loaded.
 */
export function buildOrderReportHtml(orders: Order[], keys: string[]): string {
  const period = periodLabel(keys);
  const { sold, cancelled, unpaidCheckouts } = ordersInMonths(orders, keys);
  const grand = sold.reduce(addTo, emptyTotals());
  const listed = sold.reduce((s, o) => s + (o.itemsPrice || 0), 0);
  const discounts = sold.reduce((s, o) => s + (o.discountAmount || 0), 0);
  const packs = sold.reduce((s, o) => s + o.orderItems.reduce((q, i) => q + i.qty, 0), 0);
  const received = sold.filter((o) => o.isPaid).reduce((s, o) => s + (o.totalPrice || 0), 0);

  const products = new Map<string, { name: string; pack: string; sku: string; qty: number; value: number }>();
  for (const o of sold) {
    for (const i of o.orderItems) {
      const key = `${i.name}|${packOf(i)}|${i.variantSku || ""}`;
      const row = products.get(key) ?? { name: i.name, pack: packOf(i), sku: i.variantSku || "", qty: 0, value: 0 };
      row.qty += i.qty;
      row.value += i.price * i.qty;
      products.set(key, row);
    }
  }
  const productRows = [...products.values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.pack.localeCompare(b.pack))
    .map(
      (p) =>
        `<tr><td>${esc(p.name)}</td><td>${esc(p.pack)}</td><td>${orDash(p.sku)}</td><td class="n">${p.qty}</td><td class="n">${amt(p.value)}</td></tr>`
    )
    .join("");

  const registerRows = sold
    .map(
      (o, i) =>
        `<tr><td class="n">${i + 1}</td><td class="mono nw">${esc(displayOrderNumber(o))}</td><td class="nw">${fmtDay.format(new Date(o.createdAt))}</td>` +
        `<td>${orDash(o.shippingAddress?.fullName || o.user?.name)}</td><td>${orDash(placeOf(o))}</td><td>${esc(paymentMode(o))}</td>` +
        `<td class="n">${amt(netItems(o))}</td><td class="n">${amt(o.shippingPrice || 0)}</td><td class="n">${amt(o.codFee || 0)}</td>` +
        `<td class="n">${amt(o.taxPrice || 0)}</td><td class="n">${amt(o.totalPrice || 0)}</td></tr>`
    )
    .join("");

  const cancelledSection = cancelled.length
    ? `<div class="keep"><h2>Cancelled orders</h2>
<table><thead><tr><th>Order no.</th><th>Date</th><th>Customer</th><th>Place</th><th>Payment</th><th>Money received</th><th class="n">Order value</th></tr></thead><tbody>${cancelled
        .map(
          (o) =>
            `<tr><td class="mono nw">${esc(displayOrderNumber(o))}</td><td class="nw">${fmtDate.format(new Date(o.createdAt))}</td>` +
            `<td>${orDash(o.shippingAddress?.fullName || o.user?.name)}</td><td>${orDash(placeOf(o))}</td><td>${esc(paymentMode(o))}</td>` +
            `<td>${o.isPaid ? "Yes — check for a refund" : "No"}</td><td class="n">${amt(o.totalPrice || 0)}</td></tr>`
        )
        .join("")}</tbody></table></div>`
    : "";

  const taxed = sold.filter((o) => o.taxPrice);
  const manual = sold.filter((o) => paymentMode(o) === "Marked paid manually");
  const unpaid = sold.filter((o) => !o.isPaid);
  const unnumbered = sold.filter((o) => !o.orderNumber);
  const describe = (o: Order) =>
    `${esc(displayOrderNumber(o))} (${esc(o.shippingAddress?.fullName || o.user?.name || "customer")}, ${inr(o.totalPrice || 0)})`;

  const notes: string[] = [
    `<strong>Period.</strong> Orders placed in ${esc(period)}, by Indian Standard Time.` +
      (sold.length
        ? ` The first is dated ${fmtDate.format(new Date(sold[0].createdAt))} and the last ${fmtDate.format(new Date(sold[sold.length - 1].createdAt))}.`
        : ""),
    `<strong>Status.</strong> ${sold.length - unpaid.length} of ${sold.length} orders are paid` +
      (unpaid.length ? `; ${unpaid.length} worth ${inr(grand.total - received)} are still to be collected.` : "."),
  ];
  if (taxed.length) {
    notes.push(
      `<strong>GST.</strong> On ${taxed.length} of the ${sold.length} orders the website added GST on top of the item value, ${inr(grand.tax)} in total. ` +
        (taxed.length < sold.length
          ? "On the others no tax was added separately and the customer paid the listed price; whether those prices are GST-inclusive is for the business to confirm. "
          : "") +
        "The website records no HSN code, GST rate per product, or customer GSTIN."
    );
  } else {
    notes.push(
      "<strong>GST.</strong> The website added no tax separately on these orders; the customer paid the listed price. Whether those prices are GST-inclusive is for the business to confirm. The website records no HSN code, GST rate per product, or customer GSTIN."
    );
  }
  if (manual.length) {
    notes.push(
      `<strong>Payment marked manually.</strong> ${manual.map(describe).join(", ")} ${manual.length === 1 ? "was" : "were"} started as an online payment but ${manual.length === 1 ? "has" : "have"} no Razorpay payment ID, and ${manual.length === 1 ? "was" : "were"} marked paid by hand in the admin panel. Please confirm how this money was received.`
    );
  }
  notes.push(
    "<strong>Cash on Delivery.</strong> “Paid” on a COD order means the cash was marked as collected in the admin panel on the date shown. The courier's COD remittance statement is the record of when it reached the bank.",
    "<strong>Delivery charge and COD fee.</strong> These are the amounts charged to the customer, not what the business paid the courier. Courier bills are in the Shiprocket account.",
    "<strong>Not in this report.</strong> Razorpay gateway fees and settlement dates, refunds, and courier costs are not held in the website's order records. Use the Razorpay settlement report and Shiprocket invoices for those."
  );
  if (unnumbered.length) {
    notes.push(
      `<strong>Order numbers.</strong> Orders normally carry a number in the form VSV-W-YYMMDD-serial. ${unnumbered.map((o) => esc(displayOrderNumber(o))).join(", ")} ${unnumbered.length === 1 ? "carries" : "carry"} no such number in the records, so the start of the system ID is shown instead.`
    );
  }
  if (cancelled.length) {
    notes.push(
      `<strong>Cancelled.</strong> ${cancelled.length} cancelled ${cancelled.length === 1 ? "order is" : "orders are"} listed separately and not counted in any total.`
    );
  }
  if (unpaidCheckouts) {
    notes.push(
      `<strong>Left out.</strong> ${unpaidCheckouts} online ${unpaidCheckouts === 1 ? "checkout was" : "checkouts were"} started but never paid. No order number was issued and nothing was shipped, so ${unpaidCheckouts === 1 ? "it is" : "they are"} not included.`
    );
  }

  const lead = sold.length
    ? `${sold.length} ${sold.length === 1 ? "order" : "orders"} worth ${inr(grand.total)} ${sold.length === 1 ? "was" : "were"} placed on visvam.in between ${fmtDay.format(new Date(sold[0].createdAt))} and ${fmtDate.format(new Date(sold[sold.length - 1].createdAt))}. Summary first, then the full register, then each order in detail.`
    : "No sales were recorded in this period.";

  const title = reportFileName(keys);
  const footer = `Viśvam · Orders Report · ${period} · Confidential — contains customer details`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 15mm 15mm 18mm;
    @bottom-left { content: "${footer.replace(/"/g, "")}"; font: 8px 'Segoe UI', Arial, sans-serif; color: #7a7067; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8px 'Segoe UI', Arial, sans-serif; color: #7a7067; } }
${REPORT_CSS}</style></head><body>

<div class="toolbar"><button type="button" onclick="window.print()">Save as PDF</button><span>In the print window, set the destination to “Save as PDF”.</span></div>

<div class="sheet">
<div class="masthead">
  <p class="brand">Viśvam</p>
  <div class="meta">Orders Report · ${esc(period)}<br>Prepared ${fmtLongDate.format(new Date())} from the website's order records<br>All amounts in Indian Rupees</div>
</div>

<h1>Orders for ${esc(period)}</h1>
<p class="lead">${lead}</p>

<h2>Sales summary</h2>
<table class="figures"><tbody>
  <tr><td>Number of orders</td><td class="n">${sold.length}</td></tr>
  <tr><td>Packs sold</td><td class="n">${packs}</td></tr>
  <tr><td>Items value at listed price</td><td class="n">${inr(listed)}</td></tr>
  <tr><td>Less: coupon discounts</td><td class="n">${inr(discounts)}</td></tr>
  <tr><td>Net items value</td><td class="n">${inr(grand.items)}</td></tr>
  <tr><td>Delivery charges collected</td><td class="n">${inr(grand.delivery)}</td></tr>
  <tr><td>COD fees collected</td><td class="n">${inr(grand.cod)}</td></tr>
  <tr><td>GST charged separately</td><td class="n">${inr(grand.tax)}</td></tr>
  <tr class="grand"><td>Total billed to customers</td><td class="n">${inr(grand.total)}</td></tr>
  <tr><td>Of which received (marked paid)</td><td class="n">${inr(received)}</td></tr>
  <tr><td>Outstanding</td><td class="n">${inr(grand.total - received)}</td></tr>
</tbody></table>

${keys.length > 1 ? breakdown("By month", "Month", groupBy(sold, (o) => monthLabel(monthKey(o.createdAt))), grand) : ""}
${breakdown("By payment mode", "Payment mode", groupBy(sold, paymentMode), grand)}
${breakdown("By state (place of supply)", "State", new Map([...groupBy(sold, (o) => o.shippingAddress?.state?.trim() || "Not recorded")].sort(([a], [b]) => a.localeCompare(b))), grand)}
${breakdown("By day", "Order date", groupBy(sold, (o) => fmtDate.format(new Date(o.createdAt))), grand)}

<div class="keep"><h2>Products sold</h2>
<table><thead><tr><th>Product</th><th>Pack</th><th>SKU</th><th class="n">Qty</th><th class="n">Value at listed price</th></tr></thead>
<tbody>${productRows}</tbody><tfoot><tr><td colspan="3">Total</td><td class="n">${packs}</td><td class="n">${amt(listed)}</td></tr></tfoot></table></div>

<h2>Order register</h2>
<table><thead><tr><th class="n">#</th><th>Order no.</th><th>Date</th><th>Customer</th><th>Place</th><th>Payment</th><th class="n">Items</th><th class="n">Delivery</th><th class="n">COD fee</th><th class="n">GST</th><th class="n">Total</th></tr></thead>
<tbody>${registerRows}</tbody>
<tfoot><tr><td colspan="6">Total</td><td class="n">${amt(grand.items)}</td><td class="n">${amt(grand.delivery)}</td><td class="n">${amt(grand.cod)}</td><td class="n">${amt(grand.tax)}</td><td class="n">${amt(grand.total)}</td></tr></tfoot></table>

${cancelledSection}

<h2>Order details</h2>
${sold.map((o, i) => orderBlock(o, i + 1)).join("")}

<div class="keep"><h2>Notes for the accountant</h2>
<ol class="notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ol></div>
</div>

<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });</script>
</body></html>`;
}

/**
 * Opens the report in a new tab, ready to save as a PDF. Returns false when the
 * browser blocked the tab, so the caller can say so.
 */
export function openOrderReport(orders: Order[], keys: string[]): boolean {
  const url = URL.createObjectURL(new Blob([buildOrderReportHtml(orders, keys)], { type: "text/html" }));
  const tab = window.open(url, "_blank");
  // The tab has long finished reading the blob by then; a blocked one never will.
  setTimeout(() => URL.revokeObjectURL(url), tab ? 60_000 : 0);
  return Boolean(tab);
}

/* ── Spreadsheet ────────────────────────────────────────── */

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(Math.round((value + Number.EPSILON) * 100) / 100);
  // Names and addresses are typed by customers. A leading = + - @ would be run
  // as a formula by Excel, and "+91…" phone numbers would lose their plus.
  const text = /^[=+\-@]/.test(value) ? `\t${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * One row per order for the selected months, cancelled orders included (see the
 * Order Status column) and unpaid online checkouts left out, as in the PDF.
 */
export function buildOrderRegisterCsv(orders: Order[], keys: string[]): string {
  const { sold, cancelled } = ordersInMonths(orders, keys);
  const rows = [...sold, ...cancelled].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const header = [
    "Order No", "Order Date", "Month", "Customer", "Phone", "Email", "Address", "City", "State", "Pincode",
    "Delivery Mode", "Payment Mode", "Payment Status", "Paid On", "Razorpay Payment ID", "Order Status",
    "Items", "Total Qty", "Items Subtotal", "Coupon Code", "Discount", "Delivery Charge", "COD Fee",
    "GST Charged", "Order Total",
  ];
  const lines = rows.map((o) => {
    const a = o.shippingAddress || {};
    return [
      displayOrderNumber(o),
      istIsoDate.format(new Date(o.createdAt)),
      monthLabel(monthKey(o.createdAt)),
      a.fullName || o.user?.name || "",
      a.phone || "",
      emailOf(o),
      a.address || "",
      a.city || "",
      a.state || "",
      a.postalCode || "",
      o.fulfillmentMethod === "pickup" ? "Warehouse Pickup" : "Courier",
      paymentMode(o),
      o.isPaid ? "Paid" : "Unpaid",
      o.paidAt ? istIsoDate.format(new Date(o.paidAt)) : "",
      o.paymentResult?.razorpayPaymentId || "",
      o.status,
      o.orderItems.map((i) => `${i.qty} x ${i.name} (${packOf(i)})`).join("; "),
      o.orderItems.reduce((q, i) => q + i.qty, 0),
      o.itemsPrice || 0,
      o.couponCode || "",
      o.discountAmount || 0,
      o.shippingPrice || 0,
      o.codFee || 0,
      o.taxPrice || 0,
      o.totalPrice || 0,
    ]
      .map(csvCell)
      .join(",");
  });
  // The BOM makes Excel read the file as UTF-8 instead of mangling ś and names.
  return "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
}

export function downloadOrderRegisterCsv(orders: Order[], keys: string[]) {
  const url = URL.createObjectURL(new Blob([buildOrderRegisterCsv(orders, keys)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportFileName(keys)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
