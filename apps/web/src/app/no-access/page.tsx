import type { Metadata } from "next";
import { Mark } from "@/components/ds";
import { ADDON_BRAND } from "@95forward/shared";

export const metadata: Metadata = {
  title: "No access · 95 Forward",
};

export default function NoAccessPage() {
  return (
    <main className="login">
      <section className="login__card" aria-labelledby="no-access-title">
        <span className="login__mark">
          <Mark size={40} />
        </span>
        <p className="login__eyebrow">{ADDON_BRAND.name}</p>
        <h1 id="no-access-title" className="login__title">
          Account not provisioned
        </h1>
        <p className="login__lede">
          You are signed in, but this email is not yet linked to a workspace user. Ask an
          administrator to add you, or sign out to use a different account.
        </p>
        <a href="/auth/logout" className="f95-btn f95-btn--secondary f95-btn--lg login__cta">
          Sign out
        </a>
      </section>
    </main>
  );
}
