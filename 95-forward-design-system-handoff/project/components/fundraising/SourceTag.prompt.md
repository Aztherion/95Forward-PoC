SourceTag — provenance on a grounded fact, or the honorable research-gap prompt when no source is known.

```jsx
<SourceTag source="IRS 990-PF · 2024" onClick={openSource} />
<SourceTag />                          {/* → "Unknown — worth researching" */}
<SourceTag label="No capacity data yet" onClick={addResearch} />
```

A grounded source is a mono citation tag (iris). A missing source renders a dashed, neutral invitation to research — never an error.
