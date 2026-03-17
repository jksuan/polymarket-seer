import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

export interface MarketDef {
  id: string;
  title: string;
  question: string;
  image: string;
  yesTokenId: string;
  noTokenId: string;
  yesPrice: string;
  noPrice: string;
}

interface MarketSearchProps {
  onSelect: (market: MarketDef | null) => void;
  className?: string;
}

export default function MarketSearch({ onSelect, className = "" }: MarketSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketDef | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (selectedMarket && query === selectedMarket.title) {
       // if user hasn't modified the string after selection, don't search.
       return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          // Gamma returns an array for events sometimes
          const items = Array.isArray(data) ? data : (data.events || data.value || []);
          setResults(items);
          setIsOpen(items.length > 0);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (eventInfo: any) => {
    // an event has markets. we pick the first valid market
    const marketInfo = eventInfo.markets?.[0];
    if (!marketInfo) return;

    let yesTokenId = "";
    let noTokenId = "";
    try {
      if (typeof marketInfo.clobTokenIds === 'string') {
        const ids = JSON.parse(marketInfo.clobTokenIds);
        yesTokenId = ids[0];
        noTokenId = ids[1];
      } else if (Array.isArray(marketInfo.clobTokenIds)) {
        yesTokenId = marketInfo.clobTokenIds[0];
        noTokenId = marketInfo.clobTokenIds[1];
      }
    } catch(e) {}
    
    let yesPrice = "0.5";
    let noPrice = "0.5";
    try {
        if (typeof marketInfo.outcomePrices === 'string') {
            const prices = JSON.parse(marketInfo.outcomePrices);
            yesPrice = prices[0];
            noPrice = prices[1];
        } else if (Array.isArray(marketInfo.outcomePrices)) {
            yesPrice = marketInfo.outcomePrices[0];
            noPrice = marketInfo.outcomePrices[1];
        }
    } catch(e) {}

    const md: MarketDef = {
      id: eventInfo.id,
      title: eventInfo.title || marketInfo.question,
      question: marketInfo.question,
      image: eventInfo.image || "",
      yesTokenId,
      noTokenId,
      yesPrice,
      noPrice
    };

    setSelectedMarket(md);
    setQuery(md.title);
    setIsOpen(false);
    onSelect(md);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (selectedMarket) {
      setSelectedMarket(null);
      onSelect(null);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <label className="text-sm font-bold text-zinc-400 px-1 uppercase tracking-wider text-[10px]">我们在赌什么？</label>
      <div className="relative flex items-center mt-1.5">
        <Search className="absolute left-3 text-zinc-500" size={18} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="搜索真实 Polymarket 市场 (英文)..."
          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-10 pr-10 text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold"
        />
        {isLoading && <Loader2 className="absolute right-3 animate-spin text-zinc-500" size={18} />}
        {selectedMarket && !isLoading && (
            <div className="absolute right-3 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="已链接真实市场"></div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className="flex items-center gap-3 p-3 hover:bg-zinc-800 cursor-pointer transition-colors border-b border-zinc-800/50 last:border-0"
            >
              {item.image && (
                <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-zinc-950" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{item.title}</div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">Vol: ${(item.volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
