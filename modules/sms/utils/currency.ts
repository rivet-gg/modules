import { RuntimeError } from "../module.gen.ts";

export async function convertCurrencyTo(from: string, to: string, amount: number): Promise<number> {
    if (from === to) return amount;

    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${to}.json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const fromPerTo = data[to][from];
        if (!fromPerTo || typeof fromPerTo !== "number") throw new Error();
        return amount / fromPerTo;
    } catch {
        throw new RuntimeError("currency_conversion_error", { meta: { from, to } });
    }
}
