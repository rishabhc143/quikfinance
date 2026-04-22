import { dinero, toDecimal } from "dinero.js";
import { AUD, CAD, EUR, GBP, INR, JPY, USD } from "@dinero.js/currencies";

const currencyMap = {
  AUD,
  CAD,
  EUR,
  GBP,
  INR,
  JPY,
  USD
} as const;

export type SupportedCurrency = keyof typeof currencyMap;

export function toMinorUnits(amount: number, precision = 2) {
  return Math.round(amount * 10 ** precision);
}

export function formatMoney(amount: number, currency = "INR", locale = "en-IN") {
  const supportedCurrency = currency in currencyMap ? (currency as SupportedCurrency) : "INR";
  const value = dinero({
    amount: toMinorUnits(amount, currencyMap[supportedCurrency].exponent),
    currency: currencyMap[supportedCurrency]
  });

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: supportedCurrency
  }).format(Number(toDecimal(value)));
}

export function calculateLineTotal(quantity: number, rate: number, discount = 0, taxRate = 0) {
  const subtotal = quantity * rate;
  const discounted = Math.max(subtotal - discount, 0);
  const tax = discounted * (taxRate / 100);
  return Number((discounted + tax).toFixed(2));
}
