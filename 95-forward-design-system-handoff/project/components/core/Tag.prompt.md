Tag — a category/filter chip. Use for filtering a list or grouping (distinct from Badge, which is record status).

```jsx
<Tag color="var(--horizon-today)">Today</Tag>
<Tag selected onClick={toggle}>Major gifts</Tag>
<Tag onRemove={() => removeFilter('lapsed')}>Lapsed</Tag>
```

Props: `color` (leading dot), `selected`, `onClick` (makes it interactive), `onRemove` (adds × affordance).
