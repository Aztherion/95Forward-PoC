import type { Metadata } from "next";
import { Mark } from "@/components/ds";
import { HOST_BRAND, ADDON_BRAND } from "@95forward/shared";

export const metadata: Metadata = {
  title: "Sign in · 95 Forward",
};

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo } = await searchParams;
  const loginHref = returnTo
    ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/auth/login";

  return (
    <main className="login">
      <section className="login__card" aria-labelledby="login-title">
        <span className="login__mark">
          <Mark size={40} />
        </span>
        <p className="login__eyebrow">{ADDON_BRAND.name}</p>
        <h1 id="login-title" className="login__title">
          Welcome back
        </h1>
        <p className="login__lede">
          Your major-gifts workspace inside {HOST_BRAND.name}. Sign in to pick up where you left
          off.
        </p>
        <a href={loginHref} className="f95-btn f95-btn--primary f95-btn--lg login__cta">
          Sign in
        </a>
      </section>
    </main>
  );
}
