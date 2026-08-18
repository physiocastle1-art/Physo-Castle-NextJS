/* Receipt numbering and the words that go under the amount.

   Pure module — the number is *formatted* here, but only lib/clinic.js hands one
   out, and only ever through an atomic counter. */

import { toDateInput } from "./format.js";

/* Indian financial year: 1 April to 31 March. A payment taken on 2 April 2026
   belongs to "2026-27"; one taken on 30 March 2026 belongs to "2025-26".
   Decided in clinic time, so a late-evening payment doesn't land in the
   previous day's — or previous year's — books on a UTC host. */
export function financialYearOf(value = new Date()) {
  const key = toDateInput(value) || toDateInput(new Date());
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function formatReceiptNo(prefix, financialYear, seq) {
  const clean = String(prefix || "PC").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "PC";
  return `${clean}/${financialYear}/${String(seq).padStart(4, "0")}`;
}

/* --------------------------------------------------- amount in words */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function threeDigits(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/* Indian grouping — crore, lakh, thousand — not the western millions. */
export function amountInWords(value) {
  const total = Math.round((Number(value) || 0) * 100);
  const rupees = Math.floor(total / 100);
  const paise = total % 100;

  if (rupees === 0 && paise === 0) return "Rupees Zero Only";

  const parts = [];
  let rest = rupees;

  const crore = Math.floor(rest / 10000000);
  rest %= 10000000;
  const lakh = Math.floor(rest / 100000);
  rest %= 100000;
  const thousand = Math.floor(rest / 1000);
  rest %= 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  const rupeeWords = parts.length ? `Rupees ${parts.join(" ")}` : "";
  const paiseWords = paise ? `${rupeeWords ? " and " : "Rupees "}${twoDigits(paise)} Paise` : "";

  return `${rupeeWords}${paiseWords} Only`.trim();
}
