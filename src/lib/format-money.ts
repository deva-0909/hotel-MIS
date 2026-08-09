// Every property has a currency (defaults to INR — see 0022_currency.sql);
// this is the one place that turns an amount + ISO 4217 code into display
// text, so no page hardcodes a ₹ symbol that would be wrong for a property
// configured in a different currency.
export function formatMoney(amount: number | string, currency: string = "INR") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(
    Number.isFinite(value) ? value : 0,
  );
}
