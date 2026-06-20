AISuggestion — the copilot's voice. "AI proposes, the human disposes," made visible: a provisional, iris-tinted proposal with provenance and explicit approve / edit / dismiss. Never silently applied.

```jsx
<AISuggestion
  source="IRS 990-PF · 2024"
  from="$50,000"
  to="$250,000"
  onApprove={applyCapacity}
  onEdit={openEditor}
  onDismiss={keepMine}
>
  Capacity looks higher than recorded — the foundation gave $1M+ elsewhere last year.
</AISuggestion>
```

Resolves inline to "Approved — applied" or "Dismissed — kept as you had it." Pass `from`/`to` for a before→after delta. Use for every AI-originated change to a human record.
