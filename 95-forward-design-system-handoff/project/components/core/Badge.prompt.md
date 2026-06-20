Badge — a compact status pill for record state (visit planned, ask logged, follow-up due). Tone carries meaning.

```jsx
<Badge tone="success" dot>Ask logged</Badge>
<Badge tone="attention" dot>Follow up by tomorrow</Badge>
<Badge tone="unknown">Unknown — worth researching</Badge>
<Badge tone="ai">Copilot</Badge>
```

Tones: `neutral`, `info`, `success`, `attention`, `danger`, `go`, `ai`, `unknown`. Props: `dot` (leading status dot), `solid` (filled high-emphasis). `unknown` is the honorable research-gap state — dashed, neutral, never red.
