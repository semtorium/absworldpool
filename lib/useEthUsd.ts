import { useState, useEffect } from "react";

export function useEthUsd(): number | null {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json?.ethereum?.usd) setPrice(json.ethereum.usd);
      } catch { /* silent */ }
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 60_000);
    return () => clearInterval(id);
  }, []);

  return price;
}
