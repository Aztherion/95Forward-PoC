QPIScore — the signature component. A 0–100 Qualified Prospect Index that opens to reveal its five visible parts (Capacity, Relationship, Timing, Gift History, Philanthropy), the reasoning, and the source behind each. The thesis made into one component: a number you can see inside. 90+ earns the energizing dawn-gold "go" state.

```jsx
<QPIScore
  value={92}
  defaultOpen
  onAdjust={openAdjustPanel}
  parts={{
    capacity:     { score: 24, reason: "Foundation assets ≈ $40M; prior $1M+ gifts.", source: "IRS 990-PF · 2024" },
    relationship: { score: 22, reason: "Board chair is a personal friend of our ED." },
    timing:       { score: 18, reason: "Campaign closes in Q3 — window is open now." },
    history:      { score: 15, reason: "Three gifts over five years, trending up." },
    philanthropy: { score: 13 }, // no source → "Unknown — worth researching"
  }}
/>
```

Use `compact` for list/inline contexts. Tiers: 90+ go, 70–89 strong, 50–69 building, <50 early. A part with no `source` renders an honorable "Unknown — worth researching" tag rather than an empty field.
