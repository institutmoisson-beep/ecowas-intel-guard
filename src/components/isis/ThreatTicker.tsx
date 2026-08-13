import { AlertTriangle } from "lucide-react";

type TickerItem = { label: string; level: string };

export function ThreatTicker({ items }: { items: TickerItem[] }) {
  const feed = items.length
    ? items
    : [{ label: "Aucun signal actif — surveillance en cours", level: "low" }];
  const doubled = [...feed, ...feed];

  return (
    <div className="flex items-center gap-3 overflow-hidden border-b border-border bg-panel px-3 py-1.5">
      <span className="flex shrink-0 items-center gap-1.5 label-mono text-threat">
        <AlertTriangle className="h-3.5 w-3.5" />
        Threat Feed
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-track gap-8">
          {doubled.map((item, i) => (
            <span key={i} className="font-mono text-xs text-muted-foreground">
              <span
                className={
                  item.level === "critical"
                    ? "text-threat"
                    : item.level === "high"
                      ? "text-signal"
                      : "text-verified"
                }
              >
                ●
              </span>{" "}
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
