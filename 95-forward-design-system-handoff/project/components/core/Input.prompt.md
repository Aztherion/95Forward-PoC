Input — a labelled text field. Write hints and empties as invitations ("No research yet — add what you know"), never as warnings.

```jsx
<Input label="Estimated capacity" optional hint="A range is fine" placeholder="$" />
<Input label="Capacity" ai value="$250,000" />
<Input label="Email" error="Check the address" />
```

Props: `label`, `optional`, `hint`, `error`, `icon`, `ai` (provisional copilot value), plus all native input attrs.
