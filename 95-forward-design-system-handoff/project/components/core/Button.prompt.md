Button — the primary action control; encouraging, active-verb labels ("Plan the visit", "Log the ask"), never salesy or pushy.

```jsx
<Button variant="go" onClick={planVisit}>Plan the visit</Button>
<Button variant="primary">Save</Button>
<Button variant="secondary" size="sm">Edit</Button>
<Button variant="ghost">Dismiss</Button>
```

Variants: `primary` (horizon blue, default), `go` (dawn-gold — the ONE next right move; never stack two on a screen), `secondary` (outline), `ghost` (quietest), `danger` (destructive, rare). Sizes: `sm` / `md` / `lg`. Props: `block`, `iconLeft`, `iconRight`, plus all native button attrs.
