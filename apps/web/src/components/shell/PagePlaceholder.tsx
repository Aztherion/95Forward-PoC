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
      <Topbar title={title} subtitle={subtitle} />
      <div className="page-placeholder">
        <div className="page-placeholder__eyebrow">{eyebrow}</div>
        <h2 className="page-placeholder__title">{title}</h2>
        <p className="page-placeholder__empty">{empty}</p>
      </div>
    </>
  );
}
