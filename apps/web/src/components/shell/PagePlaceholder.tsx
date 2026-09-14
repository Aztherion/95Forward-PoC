import { Topbar } from "./Topbar";

export interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  empty?: string;
}

export function PagePlaceholder({
  eyebrow,
  title,
  subtitle,
  empty = "Built in a later initiative. Nothing to do here yet — check back as the workspace grows.",
}: PagePlaceholderProps) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} heading={false} />
      <div className="page-placeholder">
        <div className="page-placeholder__eyebrow">{eyebrow}</div>
        <h1 className="page-placeholder__title">{title}</h1>
        <p className="page-placeholder__empty">{empty}</p>
      </div>
    </>
  );
}
