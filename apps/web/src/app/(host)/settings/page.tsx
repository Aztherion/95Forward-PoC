import { Topbar } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";
import { getTenantSettings } from "@/server/data/settings";
import { QpiWeightsEditor } from "./QpiWeightsEditor";
import { CopilotBehavior } from "./CopilotBehavior";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { weights, toggles } = await getTenantSettings(user.tenantId);

  return (
    <>
      <Topbar title="Settings" subtitle="Keystone CRM" />
      <div className="f95-page f95-settings">
        <section
          className="f95-settings__section"
          data-register="95-forward"
          data-testid="settings-qpi-weights-section"
        >
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">95 Forward · scoring</div>
            <h2 className="f95-settings__title">QPI weights</h2>
            <p className="f95-settings__sub">
              The score is yours to tune. Split 100 points across the five dimensions &mdash; this
              is the methodology made explicit, not a black box.
            </p>
          </header>
          <QpiWeightsEditor initialWeights={weights} />
        </section>

        <section className="f95-settings__section" data-testid="settings-copilot-section">
          <header className="f95-settings__head">
            <div className="f95-page__eyebrow">95 Forward · copilot</div>
            <h2 className="f95-settings__title">Copilot behavior</h2>
            <p className="f95-settings__sub">
              Decide how much initiative your copilot takes. You can change these any time.
            </p>
          </header>
          <CopilotBehavior initialToggles={toggles} />
          <p className="f95-settings__note" data-testid="settings-reassurance">
            The copilot proposes, you dispose. Every suggestion is tagged with its source and
            requires your approval before it changes anything. Discovery candidates are never added
            to your prospect list without your review.
          </p>
        </section>
      </div>
    </>
  );
}
