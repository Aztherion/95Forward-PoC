import { notFound } from "next/navigation";
import { resolveRegister, type Register } from "@95forward/shared";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Heartbeat,
  HorizonTag,
  Input,
  ProvisionalSuggestion,
  RoleChip,
  SourceTag,
  Tag,
} from "@/components/ds";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="styleguide__group">
      <div className="styleguide__group-label">{label}</div>
      <div className="styleguide__row">{children}</div>
    </section>
  );
}

function Gallery() {
  return (
    <>
      <Group label="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="go">Go</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" size="sm">
          Small
        </Button>
        <Button variant="primary" size="md">
          Medium
        </Button>
        <Button variant="primary" size="lg">
          Large
        </Button>
      </Group>

      <Group label="Badges">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="info" dot>
          Info
        </Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="attention">Attention</Badge>
        <Badge tone="danger">Danger</Badge>
        <Badge tone="go">Go</Badge>
        <Badge tone="ai">AI</Badge>
        <Badge tone="unknown">Unknown</Badge>
      </Group>

      <Group label="Tags">
        <Tag>Foundation</Tag>
        <Tag color="var(--sage-600)">Sage path</Tag>
        <Tag selected>Selected</Tag>
      </Group>

      <Group label="Avatars">
        <Avatar name="Dana Reese" size="sm" kind="person" />
        <Avatar name="Dana Reese" size="md" kind="person" ringColor="var(--role-manager)" />
        <Avatar name="Water For People" size="lg" kind="org" />
      </Group>

      <Group label="Cards">
        <Card tone="default">Default card</Card>
        <Card tone="ai" accent>
          Copilot surface
        </Card>
        <Card tone="go">Go state</Card>
        <Card tone="sunk">Sunk well</Card>
      </Group>

      <Group label="Inputs">
        <Input label="Organization" hint="Add what you know" />
        <Input label="Capacity" ai hint="Copilot proposes this value" />
        <Input label="Email" error="That address looks incomplete" />
      </Group>

      <Group label="Role chips">
        <RoleChip role="manager" name="Dana Reese" />
        <RoleChip role="partner" name="Marcus Webb" />
      </Group>

      <Group label="Horizon tags">
        <HorizonTag horizon="today" />
        <HorizonTag horizon="tomorrow" />
        <HorizonTag horizon="forever" />
      </Group>

      <Group label="Source tags">
        <SourceTag source="IRS 990-PF · 2024" />
        <SourceTag />
      </Group>

      <Group label="Heartbeat">
        <Heartbeat label="Follow up by tomorrow · 18h left" />
      </Group>

      <Group label="Provisional suggestions">
        <ProvisionalSuggestion source="IRS 990-PF · 2024" from="$50,000" to="$250,000">
          Capacity looks higher than recorded — the foundation gave $1M+ to peers last year.
        </ProvisionalSuggestion>
        <ProvisionalSuggestion>
          A board member may know this donor — worth a warm introduction before you reach out.
        </ProvisionalSuggestion>
        <ProvisionalSuggestion state="approved">
          Capacity looks higher than recorded — the foundation gave $1M+ to peers last year.
        </ProvisionalSuggestion>
      </Group>
    </>
  );
}

const REGISTERS: Register[] = ["host", "95-forward"];

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  const detected = resolveRegister("/styleguide");
  return (
    <div className="styleguide" data-testid="styleguide" data-resolved-register={detected}>
      {REGISTERS.map((register) => (
        <div key={register} className="styleguide__register" data-register={register}>
          <h2 className="styleguide__register-title">
            {register === "host" ? "Host register" : "95 Forward register"}
          </h2>
          <Gallery />
        </div>
      ))}
    </div>
  );
}
