ProspectRow — one line of the Master Prospect List. Individuals, companies and foundations all live on one ranked surface; ranking is sacred.

```jsx
<ProspectRow
  rank={1}
  name="Hartwell Family Foundation"
  kind="foundation"
  subtitle="Private foundation · Capital campaign"
  qpi={92}
  horizon="today"
  manager="Dana Reese"
  partner="Tom Bradley"
  cadence="Follow up in 18h"
  dueSoon
  onClick={openProfile}
/>
```

The left accent uses the QPI tier color so priority is felt. `dueSoon` pulses the cadence dot (the 24-hour heartbeat). Composes RoleChip, HorizonTag, Avatar.
