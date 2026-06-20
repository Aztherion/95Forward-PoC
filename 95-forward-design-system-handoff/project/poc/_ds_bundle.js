/* @ds-bundle: {"format":3,"namespace":"Ds95ForwardDesignSystem_31a0c4","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"AISuggestion","sourcePath":"components/fundraising/AISuggestion.jsx"},{"name":"HorizonTag","sourcePath":"components/fundraising/HorizonTag.jsx"},{"name":"ProspectRow","sourcePath":"components/fundraising/ProspectRow.jsx"},{"name":"QPIScore","sourcePath":"components/fundraising/QPIScore.jsx"},{"name":"RoleChip","sourcePath":"components/fundraising/RoleChip.jsx"},{"name":"SourceTag","sourcePath":"components/fundraising/SourceTag.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"d11e2e6a25be","components/core/Badge.jsx":"24422a6085f4","components/core/Button.jsx":"9219c46c7bc8","components/core/Card.jsx":"739bb76294d3","components/core/Input.jsx":"8cf0891c8f4a","components/core/Tag.jsx":"4494db85df4d","components/fundraising/AISuggestion.jsx":"b4cefc215beb","components/fundraising/HorizonTag.jsx":"d843978dba87","components/fundraising/ProspectRow.jsx":"9971215ce3de","components/fundraising/QPIScore.jsx":"99e9b034e1d0","components/fundraising/RoleChip.jsx":"b60babc0d0c7","components/fundraising/SourceTag.jsx":"22af454a1d79","poc/app.jsx":"e6770065f46e","poc/data.js":"07ecf4e7e24c","poc/f95_greensheet.jsx":"4fbf202bd20d","poc/f95_initiatives.jsx":"d2889071493a","poc/f95_prospect.jsx":"f3d2c3e189c7","poc/f95_prospects.jsx":"bd21dc4a8d48","poc/f95_today.jsx":"e70fe3a99385","poc/f95_visit.jsx":"c0fa07b2a032","poc/host_core.jsx":"afd12161123e","poc/host_more.jsx":"0b05421a0670","poc/shell.jsx":"12639b603076","ui_kits/workspace/App.jsx":"cd45f4c0190f","ui_kits/workspace/GreenSheet.jsx":"c63022f13689","ui_kits/workspace/MasterList.jsx":"17e2263d1878","ui_kits/workspace/ProspectProfile.jsx":"3d06e063e866","ui_kits/workspace/Shell.jsx":"640a50976dac","ui_kits/workspace/VisitCompanion.jsx":"1443f1765e4b","ui_kits/workspace/data.js":"0eeab1314b3a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Ds95ForwardDesignSystem_31a0c4 = window.Ds95ForwardDesignSystem_31a0c4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%; overflow: hidden; flex: none;
  font: var(--fw-semibold) var(--fs-caption)/1 var(--font-sans);
  color: var(--white); background: var(--blue-500);
  box-shadow: inset 0 0 0 1px rgba(22,32,43,0.08); position: relative;
}
.f95-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.f95-avatar--sm { width: 28px; height: 28px; font-size: 11px; }
.f95-avatar--md { width: 36px; height: 36px; font-size: var(--fs-caption); }
.f95-avatar--lg { width: 48px; height: 48px; font-size: var(--fs-body); }
/* org/foundation avatars read as rounded-square, not people */
.f95-avatar--org { border-radius: var(--radius-sm); }
.f95-avatar__ring {
  position: absolute; inset: -3px; border-radius: inherit;
  box-shadow: 0 0 0 2px var(--surface-card), 0 0 0 3.5px var(--role-manager);
  pointer-events: none;
}
`;
if (typeof document !== "undefined" && !document.getElementById("f95-avatar-css")) {
  const el = document.createElement("style");
  el.id = "f95-avatar-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
const TINTS = ["#235C86", "#3B7458", "#C8862A", "#4A4F94", "#2F7E8C"];
function tintFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = h * 31 + seed.charCodeAt(i) >>> 0;
  return TINTS[h % TINTS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/**
 * Avatar — a person, company, or foundation. People are circular; orgs render
 * as rounded-squares (`kind="org"`) so the three prospect types never blur.
 */
function Avatar({
  name = "",
  src,
  size = "md",
  kind = "person",
  ringColor,
  className = "",
  ...rest
}) {
  const cls = ["f95-avatar", `f95-avatar--${size}`, kind === "org" ? "f95-avatar--org" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: {
      background: src ? undefined : tintFor(name)
    },
    title: name
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials(name), ringColor ? /*#__PURE__*/React.createElement("span", {
    className: "f95-avatar__ring",
    style: {
      boxShadow: `0 0 0 2px var(--surface-card), 0 0 0 3.5px ${ringColor}`
    }
  }) : null);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-badge {
  display: inline-flex; align-items: center; gap: 6px;
  height: 22px; padding: 0 9px; box-sizing: border-box;
  font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans);
  letter-spacing: 0.01em; border-radius: var(--radius-pill);
  white-space: nowrap; border: 1px solid transparent;
}
.f95-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.f95-badge--neutral  { background: var(--haze-100); color: var(--ink-600); }
.f95-badge--info     { background: var(--blue-100); color: var(--blue-700); }
.f95-badge--success  { background: var(--sage-100); color: var(--sage-700); }
.f95-badge--attention{ background: var(--gold-100); color: var(--gold-700); }
.f95-badge--danger   { background: var(--brick-100); color: var(--brick-600); }
.f95-badge--go       { background: var(--gold-600); color: var(--white); }
.f95-badge--ai       { background: var(--ai-tint); color: var(--ai-ink); border-color: var(--ai-border); }
/* Unknown — honorable research gap, never an error */
.f95-badge--unknown  { background: var(--unknown-surface); color: var(--unknown-ink); border: 1px dashed var(--unknown-border); }
.f95-badge--solid.f95-badge--info     { background: var(--blue-600);  color: #fff; }
.f95-badge--solid.f95-badge--success  { background: var(--sage-600);  color: #fff; }
.f95-badge--solid.f95-badge--attention{ background: var(--gold-600);  color: #fff; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-badge-css")) {
  const el = document.createElement("style");
  el.id = "f95-badge-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Badge — a compact status pill (visit planned, ask logged, follow-up due).
 * Tone carries meaning; `unknown` is the honorable research-gap state.
 */
function Badge({
  children,
  tone = "neutral",
  dot = false,
  solid = false,
  className = "",
  ...rest
}) {
  const cls = ["f95-badge", `f95-badge--${tone}`, solid ? "f95-badge--solid" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "f95-badge__dot"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Self-inject component CSS once (references design-system tokens). */
const CSS = `
.f95-btn {
  --_h: var(--control-md);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--_h); padding: 0 16px; box-sizing: border-box;
  font: var(--fw-semibold) var(--fs-body)/1 var(--font-sans);
  letter-spacing: var(--ls-snug);
  border-radius: var(--radius-md); border: 1px solid transparent;
  cursor: pointer; user-select: none; white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out),
              transform var(--dur-instant) var(--ease-out);
}
.f95-btn:focus-visible { outline: none; box-shadow: var(--ring); }
.f95-btn:active { transform: translateY(0.5px); }
.f95-btn[disabled] { cursor: not-allowed; opacity: 0.45; }
.f95-btn .f95-btn__ic { display: inline-flex; width: 16px; height: 16px; }

/* sizes */
.f95-btn--sm { --_h: var(--control-sm); padding: 0 12px; font-size: var(--fs-small); border-radius: var(--radius-sm); }
.f95-btn--lg { --_h: var(--control-lg); padding: 0 22px; font-size: var(--fs-lg); }

/* primary — horizon blue */
.f95-btn--primary { background: var(--brand-primary); color: var(--text-on-accent); }
.f95-btn--primary:hover:not([disabled]) { background: var(--brand-primary-hover); }
.f95-btn--primary:active:not([disabled]) { background: var(--brand-primary-press); }

/* go — the momentum CTA (dawn gold). Use sparingly: the next right move. */
.f95-btn--go { background: var(--accent-go); color: var(--text-on-accent); }
.f95-btn--go:hover:not([disabled]) { background: var(--gold-500); }
.f95-btn--go:active:not([disabled]) { background: var(--gold-700); }
.f95-btn--go:focus-visible { box-shadow: var(--ring-go); }

/* secondary — calm outline on surface */
.f95-btn--secondary { background: var(--surface-card); color: var(--text-strong); border-color: var(--border-default); }
.f95-btn--secondary:hover:not([disabled]) { background: var(--haze-50); border-color: var(--border-strong); }
.f95-btn--secondary:active:not([disabled]) { background: var(--haze-100); }

/* ghost — quietest */
.f95-btn--ghost { background: transparent; color: var(--text-body); }
.f95-btn--ghost:hover:not([disabled]) { background: var(--haze-100); }
.f95-btn--ghost:active:not([disabled]) { background: var(--haze-200); }

/* danger — destructive, rare */
.f95-btn--danger { background: transparent; color: var(--color-danger); border-color: var(--brick-100); }
.f95-btn--danger:hover:not([disabled]) { background: var(--brick-100); }

.f95-btn--block { display: flex; width: 100%; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-button-css")) {
  const el = document.createElement("style");
  el.id = "f95-button-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Button — the system's primary action control.
 * Variants: primary (horizon blue), go (dawn-gold momentum CTA — use for the
 * single next right move), secondary, ghost, danger.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  className = "",
  ...rest
}) {
  const cls = ["f95-btn", `f95-btn--${variant}`, size !== "md" ? `f95-btn--${size}` : "", block ? "f95-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls
  }, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
    className: "f95-btn__ic"
  }, iconLeft) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
    className: "f95-btn__ic"
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-card {
  background: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.f95-card--raised { box-shadow: var(--shadow-md); }
.f95-card--flat { box-shadow: none; }
.f95-card--sunk { background: var(--surface-sunk); box-shadow: var(--inset-sunk); border-color: transparent; }
.f95-card--interactive { cursor: pointer; transition: box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.f95-card--interactive:hover { box-shadow: var(--shadow-md); border-color: var(--border-default); transform: translateY(-1px); }
/* AI card — the copilot surface, set apart but harmonious */
.f95-card--ai { background: var(--ai-surface); border-color: var(--ai-border); }
.f95-card--ai.f95-card--accent { border-left: 3px solid var(--ai-ink); }
/* Go card — the 90+ energizing state */
.f95-card--go { border-color: var(--gold-300); box-shadow: var(--ring-go); }
.f95-card__pad { padding: var(--space-5); }
.f95-card__pad--lg { padding: var(--space-7); }
.f95-card__pad--sm { padding: var(--space-4); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-card-css")) {
  const el = document.createElement("style");
  el.id = "f95-card-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Card — the base surface. A hairline + quiet lift, not a heavy drop shadow.
 * `tone="ai"` is the copilot surface; `tone="go"` the 90+ energizing state.
 */
function Card({
  children,
  tone = "default",
  elevation = "sm",
  pad = "md",
  accent = false,
  interactive = false,
  className = "",
  ...rest
}) {
  const cls = ["f95-card", tone !== "default" ? `f95-card--${tone}` : "", elevation === "md" ? "f95-card--raised" : elevation === "none" ? "f95-card--flat" : "", accent ? "f95-card--accent" : "", interactive ? "f95-card--interactive" : "", className].filter(Boolean).join(" ");
  const padCls = pad === "none" ? "" : `f95-card__pad${pad === "lg" ? " f95-card__pad--lg" : pad === "sm" ? " f95-card__pad--sm" : ""}`;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), pad === "none" ? children : /*#__PURE__*/React.createElement("div", {
    className: padCls
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-field { display: flex; flex-direction: column; gap: 6px; }
.f95-field__label { font: var(--text-label); color: var(--text-strong); }
.f95-field__label .f95-field__opt { color: var(--text-muted); font-weight: var(--fw-regular); }
.f95-field__hint { font: var(--text-caption); color: var(--text-muted); }
.f95-field__err { font: var(--text-caption); color: var(--color-danger); }
.f95-input-wrap { position: relative; display: flex; align-items: center; }
.f95-input {
  width: 100%; height: var(--control-md); box-sizing: border-box;
  padding: 0 12px; font: var(--text-body-r); color: var(--text-strong);
  background: var(--surface-card); border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.f95-input::placeholder { color: var(--text-muted); }
.f95-input:hover { border-color: var(--border-strong); }
.f95-input:focus { outline: none; border-color: var(--blue-500); box-shadow: var(--ring); }
.f95-input--has-icon { padding-left: 36px; }
.f95-input__icon { position: absolute; left: 11px; width: 16px; height: 16px; color: var(--text-muted); display: inline-flex; pointer-events: none; }
.f95-input--invalid { border-color: var(--color-danger); }
.f95-input--invalid:focus { box-shadow: 0 0 0 3px rgba(168,64,47,0.25); }
/* AI-proposed value — provisional, tinted, never silently committed */
.f95-input--ai { background: var(--ai-surface); border-color: var(--ai-border); color: var(--iris-700); }
.f95-input--ai:focus { box-shadow: 0 0 0 3px rgba(91,97,168,0.25); border-color: var(--iris-500); }
.f95-input[disabled] { background: var(--haze-100); color: var(--text-muted); cursor: not-allowed; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-input-css")) {
  const el = document.createElement("style");
  el.id = "f95-input-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Input — a labelled text field. Empties read as invitations
 * ("Add what you know"), not warnings. `ai` marks a provisional copilot value.
 */
function Input({
  label,
  optional = false,
  hint,
  error,
  icon = null,
  ai = false,
  id,
  className = "",
  ...rest
}) {
  const fid = id || (label ? `f95-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const inputCls = ["f95-input", icon ? "f95-input--has-icon" : "", error ? "f95-input--invalid" : "", ai ? "f95-input--ai" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: "f95-field"
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "f95-field__label",
    htmlFor: fid
  }, label, " ", optional ? /*#__PURE__*/React.createElement("span", {
    className: "f95-field__opt"
  }, "\xB7 optional") : null) : null, /*#__PURE__*/React.createElement("div", {
    className: "f95-input-wrap"
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "f95-input__icon"
  }, icon) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    className: inputCls,
    "aria-invalid": !!error
  }, rest))), error ? /*#__PURE__*/React.createElement("span", {
    className: "f95-field__err"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "f95-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-tag {
  display: inline-flex; align-items: center; gap: 6px;
  height: 26px; padding: 0 10px; box-sizing: border-box;
  font: var(--fw-medium) var(--fs-caption)/1 var(--font-sans);
  color: var(--text-body); background: var(--surface-card);
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.f95-tag--interactive { cursor: pointer; }
.f95-tag--interactive:hover { background: var(--haze-50); border-color: var(--border-strong); }
.f95-tag--selected { background: var(--blue-50); border-color: var(--blue-300); color: var(--blue-700); }
.f95-tag__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.f95-tag__x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; margin-right: -3px; border-radius: 50%;
  color: var(--text-muted); cursor: pointer; font-size: 13px; line-height: 1;
}
.f95-tag__x:hover { background: var(--haze-200); color: var(--text-strong); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-tag-css")) {
  const el = document.createElement("style");
  el.id = "f95-tag-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * Tag — a category/filter chip. Distinct from Badge (status): Tag is for
 * filtering and grouping, can carry a color dot, be selectable, or removable.
 */
function Tag({
  children,
  color,
  selected = false,
  onRemove,
  onClick,
  className = "",
  ...rest
}) {
  const interactive = !!onClick || selected;
  const cls = ["f95-tag", interactive ? "f95-tag--interactive" : "", selected ? "f95-tag--selected" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    onClick: onClick
  }, rest), color ? /*#__PURE__*/React.createElement("span", {
    className: "f95-tag__dot",
    style: {
      background: color
    }
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("span", {
    className: "f95-tag__x",
    role: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    }
  }, "\xD7") : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/fundraising/HorizonTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-horizon { display: inline-flex; align-items: center; gap: 7px; height: 24px; padding: 0 10px 0 8px; box-sizing: border-box; border-radius: var(--radius-pill); font: var(--fw-semibold) var(--fs-caption)/1 var(--font-sans); white-space: nowrap; }
.f95-horizon__ic { width: 13px; height: 13px; flex: none; }
.f95-horizon--today    { background: var(--gold-100); color: var(--gold-700); }
.f95-horizon--tomorrow { background: var(--blue-100); color: var(--blue-700); }
.f95-horizon--forever  { background: var(--iris-100); color: var(--iris-700); }
.f95-horizon--solid.f95-horizon--today    { background: var(--horizon-today); color:#fff; }
.f95-horizon--solid.f95-horizon--tomorrow { background: var(--horizon-tomorrow); color:#fff; }
.f95-horizon--solid.f95-horizon--forever  { background: var(--horizon-forever); color:#fff; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-horizon-css")) {
  const el = document.createElement("style");
  el.id = "f95-horizon-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
const LABELS = {
  today: "Today",
  tomorrow: "Tomorrow",
  forever: "Forever"
};
// near → far: a filling sun (today), a half horizon (tomorrow), a distant ring (forever)
const ICONS = {
  today: /*#__PURE__*/React.createElement("circle", {
    cx: "6.5",
    cy: "6.5",
    r: "4",
    fill: "currentColor",
    stroke: "none"
  }),
  tomorrow: /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.5a4 4 0 0 1 8 0",
    fill: "currentColor",
    stroke: "none"
  }),
  forever: /*#__PURE__*/React.createElement("circle", {
    cx: "6.5",
    cy: "6.5",
    r: "4",
    fill: "none"
  })
};

/**
 * HorizonTag — the three funding horizons, near → far: Today (current need),
 * Tomorrow (multi-year priority), Forever (legacy). Icon goes from a full sun
 * to a distant ring to carry the sense of distance.
 */
function HorizonTag({
  horizon = "today",
  solid = false,
  className = "",
  ...rest
}) {
  const cls = ["f95-horizon", `f95-horizon--${horizon}`, solid ? "f95-horizon--solid" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("svg", {
    className: "f95-horizon__ic",
    viewBox: "0 0 13 13",
    stroke: "currentColor",
    strokeWidth: "1.4"
  }, ICONS[horizon]), LABELS[horizon]);
}
Object.assign(__ds_scope, { HorizonTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fundraising/HorizonTag.jsx", error: String((e && e.message) || e) }); }

// components/fundraising/QPIScore.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-qpi { font-family: var(--font-sans); }
.f95-qpi__head { display: flex; align-items: center; gap: var(--space-5); }
.f95-qpi__numwrap { display: flex; align-items: baseline; gap: 3px; line-height: 1; }
.f95-qpi__num { font-weight: var(--fw-heavy); font-size: var(--fs-score); letter-spacing: var(--ls-tight); font-feature-settings: var(--num-tabular); }
.f95-qpi__of { font-weight: var(--fw-semibold); font-size: var(--fs-lg); color: var(--text-muted); }
.f95-qpi__meta { flex: 1; min-width: 0; }
.f95-qpi__tier { display: inline-flex; align-items: center; gap: 7px; font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans); letter-spacing: var(--ls-caps); text-transform: uppercase; }
.f95-qpi__seg { display: flex; gap: 2px; margin-top: 10px; height: 8px; border-radius: var(--radius-pill); overflow: hidden; background: var(--haze-100); }
.f95-qpi__seg span { height: 100%; }
.f95-qpi__toggle {
  display: inline-flex; align-items: center; gap: 5px; margin-top: 12px;
  font: var(--fw-semibold) var(--fs-small)/1 var(--font-sans); color: var(--brand-primary);
  background: none; border: none; cursor: pointer; padding: 4px 0;
}
.f95-qpi__toggle:hover { color: var(--brand-primary-hover); }
.f95-qpi__chev { transition: transform var(--dur-base) var(--ease-out); width: 14px; height: 14px; }
.f95-qpi__chev--open { transform: rotate(180deg); }

.f95-qpi__parts { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--border-hairline); }
.f95-qpi__part { animation: f95-rise var(--dur-base) var(--ease-out) both; }
.f95-qpi__prow { display: flex; align-items: center; gap: 10px; }
.f95-qpi__pdot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
.f95-qpi__plabel { font: var(--text-label); color: var(--text-strong); flex: 1; }
.f95-qpi__pscore { font: var(--fw-bold) var(--fs-small)/1 var(--font-mono); color: var(--text-strong); font-feature-settings: var(--num-tabular); }
.f95-qpi__pmax { color: var(--text-muted); font-weight: var(--fw-regular); }
.f95-qpi__ptrack { height: 5px; border-radius: var(--radius-pill); background: var(--haze-100); margin-top: 7px; overflow: hidden; }
.f95-qpi__pfill { height: 100%; border-radius: var(--radius-pill); transition: width var(--dur-deliberate) var(--ease-emph); }
.f95-qpi__preason { font: var(--fw-regular) var(--fs-small)/1.45 var(--font-sans); color: var(--text-secondary); margin-top: 7px; padding-left: 19px; }
.f95-qpi__psrc { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; margin-left: 19px; }
.f95-qpi__cite { font: var(--fw-medium) var(--fs-micro)/1.3 var(--font-mono); color: var(--ai-ink); background: var(--ai-tint); padding: 2px 6px; border-radius: var(--radius-xs); }
.f95-qpi__unknown { font: var(--fw-medium) var(--fs-micro)/1.3 var(--font-sans); color: var(--unknown-ink); background: var(--unknown-surface); border: 1px dashed var(--unknown-border); padding: 2px 7px; border-radius: var(--radius-xs); }
.f95-qpi__foot { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px dashed var(--border-hairline); }
.f95-qpi__note { font: var(--text-caption); color: var(--text-muted); }
.f95-qpi__adjust { font: var(--fw-semibold) var(--fs-small)/1 var(--font-sans); color: var(--text-secondary); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: var(--radius-sm); }
.f95-qpi__adjust:hover { background: var(--haze-100); color: var(--text-strong); }
/* compact inline variant */
.f95-qpi--compact .f95-qpi__num { font-size: var(--fs-2xl); }
.f95-qpi--compact .f95-qpi__of { font-size: var(--fs-caption); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-qpi-css")) {
  const el = document.createElement("style");
  el.id = "f95-qpi-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
const PART_META = {
  capacity: {
    label: "Capacity",
    color: "var(--qpi-capacity)",
    max: 25
  },
  relationship: {
    label: "Relationship",
    color: "var(--qpi-relationship)",
    max: 25
  },
  timing: {
    label: "Timing",
    color: "var(--qpi-timing)",
    max: 20
  },
  history: {
    label: "Gift History",
    color: "var(--qpi-history)",
    max: 15
  },
  philanthropy: {
    label: "Philanthropy",
    color: "var(--qpi-philanthropy)",
    max: 15
  }
};
const ORDER = ["capacity", "relationship", "timing", "history", "philanthropy"];
function tier(v) {
  if (v >= 90) return {
    key: "go",
    label: "Go — see them today",
    color: "var(--qpi-go)"
  };
  if (v >= 70) return {
    key: "strong",
    label: "Strong — worth a visit",
    color: "var(--qpi-strong)"
  };
  if (v >= 50) return {
    key: "build",
    label: "Building — keep nurturing",
    color: "var(--qpi-build)"
  };
  return {
    key: "early",
    label: "Early — research & nurture",
    color: "var(--qpi-early)"
  };
}
const Chevron = ({
  open
}) => /*#__PURE__*/React.createElement("svg", {
  className: "f95-qpi__chev" + (open ? " f95-qpi__chev--open" : ""),
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3.5 5.5 L7 9 L10.5 5.5"
}));

/**
 * QPIScore — THE signature component. A 0–100 number you can see inside:
 * it opens to reveal the five visible parts and the reasoning + source behind
 * each. The thesis made into one component — transparent, human, decisive.
 */
function QPIScore({
  value = 0,
  parts = {},
  compact = false,
  defaultOpen = false,
  onAdjust,
  className = "",
  ...rest
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const t = tier(value);
  const cls = ["f95-qpi", compact ? "f95-qpi--compact" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "f95-qpi__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "f95-qpi__numwrap",
    style: {
      color: t.color
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-qpi__num"
  }, value), /*#__PURE__*/React.createElement("span", {
    className: "f95-qpi__of"
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    className: "f95-qpi__meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-qpi__tier",
    style: {
      color: t.color
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: t.color,
      display: "inline-block"
    }
  }), t.label), /*#__PURE__*/React.createElement("div", {
    className: "f95-qpi__seg",
    "aria-hidden": "true"
  }, ORDER.map(k => {
    const p = parts[k];
    const meta = PART_META[k];
    const score = p ? p.score : 0;
    return /*#__PURE__*/React.createElement("span", {
      key: k,
      style: {
        flex: score,
        background: meta.color
      }
    });
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: Math.max(0, 100 - value),
      background: "transparent"
    }
  })))), /*#__PURE__*/React.createElement("button", {
    className: "f95-qpi__toggle",
    onClick: () => setOpen(o => !o),
    "aria-expanded": open
  }, open ? "Hide the math" : "See inside the score", " ", /*#__PURE__*/React.createElement(Chevron, {
    open: open
  })), open ? /*#__PURE__*/React.createElement("div", {
    className: "f95-qpi__parts"
  }, ORDER.map((k, i) => {
    const p = parts[k] || {};
    const meta = PART_META[k];
    const max = p.max ?? meta.max;
    const score = p.score ?? 0;
    const pct = Math.round(score / max * 100);
    return /*#__PURE__*/React.createElement("div", {
      className: "f95-qpi__part",
      key: k,
      style: {
        animationDelay: `${i * 45}ms`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "f95-qpi__prow"
    }, /*#__PURE__*/React.createElement("span", {
      className: "f95-qpi__pdot",
      style: {
        background: meta.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "f95-qpi__plabel"
    }, meta.label), /*#__PURE__*/React.createElement("span", {
      className: "f95-qpi__pscore"
    }, score, /*#__PURE__*/React.createElement("span", {
      className: "f95-qpi__pmax"
    }, "/", max))), /*#__PURE__*/React.createElement("div", {
      className: "f95-qpi__ptrack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "f95-qpi__pfill",
      style: {
        width: pct + "%",
        background: meta.color
      }
    })), p.reason ? /*#__PURE__*/React.createElement("div", {
      className: "f95-qpi__preason"
    }, p.reason) : null, /*#__PURE__*/React.createElement("div", {
      className: "f95-qpi__psrc"
    }, p.source ? /*#__PURE__*/React.createElement("span", {
      className: "f95-qpi__cite"
    }, p.source) : /*#__PURE__*/React.createElement("span", {
      className: "f95-qpi__unknown"
    }, "Unknown \u2014 worth researching")));
  }), /*#__PURE__*/React.createElement("div", {
    className: "f95-qpi__foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-qpi__note"
  }, "The copilot proposes this score. You decide."), /*#__PURE__*/React.createElement("button", {
    className: "f95-qpi__adjust",
    onClick: onAdjust
  }, "Adjust the score"))) : null);
}
Object.assign(__ds_scope, { QPIScore });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fundraising/QPIScore.jsx", error: String((e && e.message) || e) }); }

// components/fundraising/RoleChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-role { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px 4px 5px; box-sizing: border-box; border-radius: var(--radius-pill); max-width: 100%; }
.f95-role__av { width: 26px; height: 26px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center; font: var(--fw-semibold) 11px/1 var(--font-sans); color: #fff; }
.f95-role__txt { display: flex; flex-direction: column; min-width: 0; }
.f95-role__lbl { font: var(--fw-semibold) var(--fs-micro)/1.1 var(--font-sans); letter-spacing: var(--ls-caps); text-transform: uppercase; }
.f95-role__name { font: var(--fw-semibold) var(--fs-small)/1.2 var(--font-sans); color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f95-role__ic { width: 15px; height: 15px; flex: none; }

/* MANAGER — ownership. Solid, anchored, filled tint, blue. */
.f95-role--manager { background: var(--role-manager-tint); box-shadow: inset 0 0 0 1px rgba(35,92,134,0.18); }
.f95-role--manager .f95-role__av { background: var(--role-manager); }
.f95-role--manager .f95-role__lbl { color: var(--role-manager); }

/* PARTNER — leverage / the door. Outlined, lighter, sage, leads with a door-opening glyph. */
.f95-role--partner { background: var(--surface-card); border: 1.5px dashed var(--role-partner); padding-left: 11px; }
.f95-role--partner .f95-role__lbl { color: var(--role-partner); }
.f95-role--partner .f95-role__ic { color: var(--role-partner); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-role-css")) {
  const el = document.createElement("style");
  el.id = "f95-role-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
const DoorIcon = () => /*#__PURE__*/React.createElement("svg", {
  className: "f95-role__ic",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 14h10"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10 14V3.5a.5.5 0 0 0-.6-.49L5 4v10"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "6.4",
  cy: "8.6",
  r: "0.6",
  fill: "currentColor",
  stroke: "none"
}));

/**
 * RoleChip — the two roles that must NEVER look alike. `manager` (ownership)
 * is a solid, anchored blue chip with the owner's avatar; `partner` (the warm
 * path / leverage) is a dashed sage chip leading with a door-opening glyph.
 */
function RoleChip({
  role = "manager",
  name = "",
  className = "",
  ...rest
}) {
  const isManager = role === "manager";
  const cls = ["f95-role", `f95-role--${role}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    title: name
  }, rest), isManager ? /*#__PURE__*/React.createElement("span", {
    className: "f95-role__av"
  }, initials(name)) : /*#__PURE__*/React.createElement(DoorIcon, null), /*#__PURE__*/React.createElement("span", {
    className: "f95-role__txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-role__lbl"
  }, isManager ? "Relationship Mgr" : "Natural Partner"), /*#__PURE__*/React.createElement("span", {
    className: "f95-role__name"
  }, name)));
}
Object.assign(__ds_scope, { RoleChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fundraising/RoleChip.jsx", error: String((e && e.message) || e) }); }

// components/fundraising/ProspectRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-prow { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5); background: var(--surface-card); border: 1px solid var(--border-hairline); border-left: 3px solid var(--_tier, var(--border-default)); border-radius: var(--radius-md); transition: box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.f95-prow--interactive { cursor: pointer; }
.f95-prow--interactive:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.f95-prow__rank { display: flex; align-items: baseline; gap: 1px; width: 44px; flex: none; color: var(--text-strong); }
.f95-prow__rank .h { font: var(--fw-medium) var(--fs-caption)/1 var(--font-sans); color: var(--text-muted); }
.f95-prow__rank .n { font: var(--fw-heavy) var(--fs-2xl)/1 var(--font-sans); letter-spacing: var(--ls-tight); font-feature-settings: var(--num-tabular); }
.f95-prow__id { display: flex; align-items: center; gap: 11px; min-width: 0; flex: 1.4; }
.f95-prow__txt { min-width: 0; }
.f95-prow__name { font: var(--fw-semibold) var(--fs-body)/1.2 var(--font-sans); color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f95-prow__sub { font: var(--text-caption); color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f95-prow__roles { display: flex; align-items: center; gap: 8px; flex: 1.5; min-width: 0; flex-wrap: wrap; }
.f95-prow__right { display: flex; align-items: center; gap: var(--space-5); margin-left: auto; flex: none; }
.f95-prow__cad { display: flex; align-items: center; gap: 6px; font: var(--text-caption); color: var(--text-secondary); white-space: nowrap; }
.f95-prow__beat { width: 9px; height: 9px; border-radius: 50%; background: var(--gold-600); flex: none; }
.f95-prow__beat--live { animation: f95-heartbeat var(--beat-period) var(--ease-in-out) infinite; }
.f95-prow__qpi { display: flex; align-items: baseline; gap: 2px; justify-content: flex-end; width: 58px; flex: none; }
.f95-prow__qpi .v { font: var(--fw-heavy) var(--fs-2xl)/1 var(--font-sans); letter-spacing: var(--ls-tight); font-feature-settings: var(--num-tabular); }
.f95-prow__qpi .s { font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans); color: var(--text-muted); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-prow-css")) {
  const el = document.createElement("style");
  el.id = "f95-prow-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function tierColor(v) {
  if (v >= 90) return "var(--qpi-go)";
  if (v >= 70) return "var(--qpi-strong)";
  if (v >= 50) return "var(--qpi-build)";
  return "var(--qpi-early)";
}

/**
 * ProspectRow — one line of the Master Prospect List. Individuals, companies
 * and foundations all live on one ranked surface. A left accent in the QPI tier
 * color ties priority to the score; the cadence dot beats when a follow-up is due.
 */
function ProspectRow({
  rank,
  name,
  kind = "person",
  subtitle,
  qpi = 0,
  horizon,
  manager,
  partner,
  cadence,
  dueSoon = false,
  interactive = true,
  onClick,
  className = "",
  ...rest
}) {
  const cls = ["f95-prow", interactive ? "f95-prow--interactive" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    style: {
      "--_tier": tierColor(qpi)
    },
    onClick: onClick
  }, rest), rank != null ? /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__rank"
  }, /*#__PURE__*/React.createElement("span", {
    className: "h"
  }, "#"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, rank)) : null, /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__id"
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    kind: kind === "person" ? "person" : "org",
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__name"
  }, name), subtitle ? /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__sub"
  }, subtitle) : null)), /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__roles"
  }, manager ? /*#__PURE__*/React.createElement(__ds_scope.RoleChip, {
    role: "manager",
    name: manager
  }) : null, partner ? /*#__PURE__*/React.createElement(__ds_scope.RoleChip, {
    role: "partner",
    name: partner
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__right"
  }, horizon ? /*#__PURE__*/React.createElement(__ds_scope.HorizonTag, {
    horizon: horizon
  }) : null, cadence ? /*#__PURE__*/React.createElement("span", {
    className: "f95-prow__cad"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-prow__beat" + (dueSoon ? " f95-prow__beat--live" : ""),
    style: dueSoon ? null : {
      background: "var(--ink-300)"
    }
  }), cadence) : null, /*#__PURE__*/React.createElement("div", {
    className: "f95-prow__qpi",
    title: `QPI ${qpi}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "v",
    style: {
      color: tierColor(qpi)
    }
  }, qpi), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "QPI"))));
}
Object.assign(__ds_scope, { ProspectRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fundraising/ProspectRow.jsx", error: String((e && e.message) || e) }); }

// components/fundraising/SourceTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-src { display: inline-flex; align-items: center; gap: 5px; font: var(--fw-medium) var(--fs-micro)/1.3 var(--font-mono); padding: 2px 7px; border-radius: var(--radius-xs); white-space: nowrap; }
.f95-src--grounded { color: var(--ai-ink); background: var(--ai-tint); }
.f95-src--grounded.f95-src--link { cursor: pointer; }
.f95-src--grounded.f95-src--link:hover { background: var(--iris-100); text-decoration: underline; }
.f95-src--unknown { color: var(--unknown-ink); background: var(--unknown-surface); border: 1px dashed var(--unknown-border); font-family: var(--font-sans); cursor: pointer; }
.f95-src--unknown:hover { color: var(--text-strong); border-color: var(--border-strong); }
.f95-src__ic { width: 11px; height: 11px; flex: none; }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-src-css")) {
  const el = document.createElement("style");
  el.id = "f95-src-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
const DocIcon = () => /*#__PURE__*/React.createElement("svg", {
  className: "f95-src__ic",
  viewBox: "0 0 11 11",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.1",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 1.5h3.5L8.5 3.5V9.5H3z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M6.5 1.5V3.5H8.5"
}));
const PlusIcon = () => /*#__PURE__*/React.createElement("svg", {
  className: "f95-src__ic",
  viewBox: "0 0 11 11",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.3",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M5.5 2.2v6.6M2.2 5.5h6.6"
}));

/**
 * SourceTag — provenance for a grounded fact (mono citation), or the honorable
 * "Unknown — worth researching" prompt when a fact isn't known. A missing
 * source is an invitation to research, never a broken/empty field.
 */
function SourceTag({
  source,
  onClick,
  label,
  className = "",
  ...rest
}) {
  if (!source) {
    const cls = ["f95-src", "f95-src--unknown", className].filter(Boolean).join(" ");
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls,
      role: "button",
      onClick: onClick
    }, rest), /*#__PURE__*/React.createElement(PlusIcon, null), " ", label || "Unknown — worth researching");
  }
  const cls = ["f95-src", "f95-src--grounded", onClick ? "f95-src--link" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    onClick: onClick
  }, rest), /*#__PURE__*/React.createElement(DocIcon, null), " ", source);
}
Object.assign(__ds_scope, { SourceTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fundraising/SourceTag.jsx", error: String((e && e.message) || e) }); }

// components/fundraising/AISuggestion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.f95-ai { background: var(--ai-surface); border: 1px solid var(--ai-border); border-left: 3px solid var(--ai-ink); border-radius: var(--radius-md); padding: var(--space-4) var(--space-5); }
.f95-ai__top { display: flex; align-items: center; gap: 7px; }
.f95-ai__tag { display: inline-flex; align-items: center; gap: 6px; font: var(--fw-semibold) var(--fs-micro)/1 var(--font-sans); letter-spacing: var(--ls-caps); text-transform: uppercase; color: var(--ai-ink); }
.f95-ai__spark { width: 13px; height: 13px; border-radius: 3px; background: var(--ai-ink); flex: none; }
.f95-ai__prov { margin-left: auto; }
.f95-ai__body { font: var(--fw-medium) var(--fs-body)/1.45 var(--font-sans); color: var(--iris-700); margin-top: 9px; }
.f95-ai__delta { display: inline-flex; align-items: center; gap: 9px; margin-top: 10px; padding: 7px 12px; background: var(--white); border: 1px solid var(--ai-border); border-radius: var(--radius-sm); }
.f95-ai__from { font: var(--fw-medium) var(--fs-small)/1 var(--font-mono); color: var(--text-muted); text-decoration: line-through; }
.f95-ai__arrow { color: var(--ai-ink); }
.f95-ai__to { font: var(--fw-bold) var(--fs-small)/1 var(--font-mono); color: var(--iris-700); }
.f95-ai__acts { display: flex; align-items: center; gap: 8px; margin-top: var(--space-4); }
.f95-ai__resolved { display: flex; align-items: center; gap: 8px; margin-top: var(--space-3); font: var(--text-label); }
.f95-ai__resolved--ok { color: var(--sage-700); }
.f95-ai__resolved--no { color: var(--text-muted); }
`;
if (typeof document !== "undefined" && !document.getElementById("f95-ai-css")) {
  const el = document.createElement("style");
  el.id = "f95-ai-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * AISuggestion — "AI proposes, the human disposes," made visible. A provisional
 * copilot proposal with provenance and explicit approve / edit / dismiss. Never
 * silently applied.
 */
function AISuggestion({
  children,
  source,
  from,
  to,
  onApprove,
  onEdit,
  onDismiss,
  className = "",
  ...rest
}) {
  const [resolved, setResolved] = React.useState(null); // null | "approved" | "dismissed"

  if (resolved === "approved") {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: ["f95-ai", className].filter(Boolean).join(" ")
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "f95-ai__resolved f95-ai__resolved--ok"
    }, "Approved \u2014 applied to the record."));
  }
  if (resolved === "dismissed") {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: ["f95-ai", className].filter(Boolean).join(" ")
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "f95-ai__resolved f95-ai__resolved--no"
    }, "Dismissed \u2014 kept as you had it."));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["f95-ai", className].filter(Boolean).join(" ")
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "f95-ai__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-ai__tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-ai__spark"
  }), " Copilot suggests"), source ? /*#__PURE__*/React.createElement("span", {
    className: "f95-ai__prov"
  }, /*#__PURE__*/React.createElement(__ds_scope.SourceTag, {
    source: source
  })) : null), /*#__PURE__*/React.createElement("div", {
    className: "f95-ai__body"
  }, children), from != null && to != null ? /*#__PURE__*/React.createElement("div", {
    className: "f95-ai__delta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f95-ai__from"
  }, from), /*#__PURE__*/React.createElement("span", {
    className: "f95-ai__arrow"
  }, "\u2192"), /*#__PURE__*/React.createElement("span", {
    className: "f95-ai__to"
  }, to)) : null, /*#__PURE__*/React.createElement("div", {
    className: "f95-ai__acts"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "primary",
    onClick: e => {
      onApprove && onApprove(e);
      setResolved("approved");
    }
  }, "Approve"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "secondary",
    onClick: onEdit
  }, "Edit"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "ghost",
    onClick: e => {
      onDismiss && onDismiss(e);
      setResolved("dismissed");
    }
  }, "Dismiss")));
}
Object.assign(__ds_scope, { AISuggestion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fundraising/AISuggestion.jsx", error: String((e && e.message) || e) }); }

// poc/app.jsx
try { (() => {
/* App — top-level routing for the Keystone CRM + 95 Forward PoC.
   Host routes render in the cool-grey register; 95 Forward routes render warm.
   Visit mode is full-bleed (Register B), outside the shell. */

function App() {
  const D = window.POC_DATA;
  const P = window.POC;
  const {
    Sidebar,
    Topbar,
    isF95
  } = P;
  const [state, setState] = React.useState({
    route: "home",
    params: {}
  });
  const go = (route, params = {}) => {
    setState({
      route,
      params
    });
    const el = document.getElementById("poc-scroll");
    if (el) el.scrollTop = 0;
  };
  const {
    route,
    params
  } = state;

  // Visit mode — full screen, no shell.
  if (route === "visit") return /*#__PURE__*/React.createElement(P.VisitMode, {
    go: go
  });
  const f95 = isF95(route);

  // Per-route meta + body.
  let title = "",
    subtitle = "",
    addLabel = null,
    body = null;
  switch (route) {
    case "home":
      title = "Home";
      subtitle = "Tuesday, June 18 · Riverside Children's Fund";
      addLabel = "Add constituent";
      body = /*#__PURE__*/React.createElement(P.HostHome, {
        go: go
      });
      break;
    case "constituents":
      title = "Constituents";
      subtitle = "The records backbone";
      addLabel = "Add constituent";
      body = /*#__PURE__*/React.createElement(P.HostConstituents, {
        go: go
      });
      break;
    case "constituent":
      {
        const c = D.constituents.find(x => x.id === params.id);
        title = c ? c.name : "Constituent";
        subtitle = "Constituent record";
        addLabel = "Add gift";
        body = /*#__PURE__*/React.createElement(P.HostConstituent, {
          params: params,
          go: go
        });
        break;
      }
    case "revenue":
      title = "Revenue";
      subtitle = "Gifts, pledges, and receipts";
      addLabel = "Add gift";
      body = /*#__PURE__*/React.createElement(P.HostRevenue, null);
      break;
    case "majorgiving":
      title = "Major Giving";
      subtitle = "Pipeline, proposals, and portfolio";
      addLabel = "Add opportunity";
      body = /*#__PURE__*/React.createElement(P.HostMajorGiving, {
        params: params
      });
      break;
    case "lists":
      title = "Lists";
      subtitle = "Build and save segments";
      addLabel = "New list";
      body = /*#__PURE__*/React.createElement(P.HostLists, null);
      break;
    case "analysis":
      title = "Analysis";
      subtitle = "Reports & dashboards";
      body = /*#__PURE__*/React.createElement(P.HostAnalysis, null);
      break;
    case "marketing":
      title = "Marketing";
      subtitle = "Email, appeals, and audiences";
      body = /*#__PURE__*/React.createElement(P.HostStub, {
        route: "marketing"
      });
      break;
    case "events":
      title = "Events";
      subtitle = "Galas, tours, and cultivation";
      body = /*#__PURE__*/React.createElement(P.HostStub, {
        route: "events"
      });
      break;
    case "volunteers":
      title = "Volunteers";
      subtitle = "Roster, hours, and roles";
      body = /*#__PURE__*/React.createElement(P.HostStub, {
        route: "volunteers"
      });
      break;
    case "memberships":
      title = "Memberships";
      subtitle = "Tiers and renewals";
      body = /*#__PURE__*/React.createElement(P.HostStub, {
        route: "memberships"
      });
      break;
    case "settings":
      title = "Settings";
      subtitle = "Configuration";
      body = /*#__PURE__*/React.createElement(P.HostSettings, {
        go: go
      });
      break;
    case "today":
      title = "Today";
      subtitle = "Where your attention goes today";
      addLabel = "Add prospect";
      body = /*#__PURE__*/React.createElement(P.Today, {
        go: go
      });
      break;
    case "mpl":
      title = "Master Prospect List";
      subtitle = "One ranked list — people, companies, and foundations together";
      addLabel = "Add prospect";
      body = /*#__PURE__*/React.createElement(P.Prospects, {
        route: route,
        go: go
      });
      break;
    case "candidates":
      title = "Prospects";
      subtitle = "Off-list candidates from connector research";
      addLabel = "Add prospect";
      body = /*#__PURE__*/React.createElement(P.Prospects, {
        route: route,
        go: go
      });
      break;
    case "prospect":
      {
        const p = D.prospects.find(x => x.id === params.id) || D.prospects[0];
        title = p.name;
        subtitle = "The whole picture — and the next right move";
        body = /*#__PURE__*/React.createElement(P.ProspectDetail, {
          params: params,
          go: go
        });
        break;
      }
    case "greensheet":
      title = "Green Sheet";
      subtitle = "Momentum, honestly kept";
      body = /*#__PURE__*/React.createElement(P.GreenSheet, {
        go: go
      });
      break;
    case "initiatives":
      title = "Initiatives";
      subtitle = "Funding priorities — Today, Tomorrow, Forever";
      addLabel = "Add initiative";
      body = /*#__PURE__*/React.createElement(P.Initiatives, {
        go: go
      });
      break;
    case "initiative":
      {
        const i = D.initiatives.find(x => x.id === params.id) || D.initiatives[0];
        title = i.name;
        subtitle = "Funding priority";
        body = /*#__PURE__*/React.createElement(P.InitiativeDetail, {
          params: params,
          go: go
        });
        break;
      }
    case "settings95":
      title = "95 Forward settings";
      subtitle = "Tune the score and the copilot";
      body = /*#__PURE__*/React.createElement(P.F95Settings, {
        go: go
      });
      break;
    default:
      title = "Home";
      body = /*#__PURE__*/React.createElement(P.HostHome, {
        go: go
      });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "reg-host",
    style: {
      display: "flex",
      minHeight: "100vh",
      background: f95 ? "var(--haze-50)" : "var(--bg-app)"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    route: route,
    params: params,
    go: go
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: f95 ? "var(--haze-50)" : "var(--bg-app)"
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: title,
    subtitle: subtitle,
    register: f95 ? "f95" : "host",
    addLabel: addLabel,
    onAdd: () => {},
    copilotCount: f95 ? D.today.copilotCount : 0,
    go: go
  }), /*#__PURE__*/React.createElement("div", {
    id: "poc-scroll",
    style: {
      flex: 1,
      overflowY: "auto",
      minHeight: 0
    }
  }, body)));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/app.jsx", error: String((e && e.message) || e) }); }

// poc/data.js
try { (() => {
/* ============================================================
   Keystone CRM + 95 Forward — PoC sample data
   One global object. Fictional throughout. No real public figures.
   QPI uses methodology weights: Capacity 35 / Relationship 30 /
   Timing 15 / Gift History 10 / Philanthropy 10. Each part = a
   1–5 rating × its weight; unknowns take the minimum rating and
   pull the score down (never hidden).
   ============================================================ */
window.POC_DATA = {
  org: "Riverside Children's Fund",
  hostBrand: "Keystone CRM",
  user: {
    name: "Dana Reese",
    role: "Major gifts officer",
    org: "Riverside Children's Fund"
  },
  staff: ["Dana Reese", "Priya Nair"],
  /* ---------------------------------------------------------- HOST */
  home: {
    recentGifts: [{
      name: "Maria Alvarez",
      amount: "$10,000",
      type: "Cash",
      date: "Jun 14"
    }, {
      name: "Okoro Logistics",
      amount: "$25,000",
      type: "Pledge",
      date: "Jun 12"
    }, {
      name: "Hartwell Family Foundation",
      amount: "$60,000",
      type: "Grant",
      date: "Jun 9"
    }, {
      name: "T. Brennan",
      amount: "$500",
      type: "Recurring",
      date: "Jun 9"
    }, {
      name: "Cardinal Manufacturing",
      amount: "$5,000",
      type: "Matching",
      date: "Jun 7"
    }],
    yoy: [{
      label: "Q1",
      a: 62,
      b: 71
    }, {
      label: "Q2",
      a: 74,
      b: 88
    }, {
      label: "Q3",
      a: 58,
      b: 64
    }, {
      label: "Q4",
      a: 91,
      b: 0
    }],
    growth: {
      value: "1,284",
      delta: "+6.2%",
      note: "active donors vs. last year"
    },
    tasks: [{
      what: "Acknowledge Hartwell grant",
      due: "Today",
      who: "Dana R."
    }, {
      what: "Q3 appeal proof to print",
      due: "Tomorrow",
      who: "Marketing"
    }, {
      what: "Board packet — gift summary",
      due: "Fri",
      who: "Dana R."
    }]
  },
  constituents: [{
    id: "c1",
    name: "Hartwell Family Foundation",
    type: "Foundation",
    lifetime: "$185,000",
    lastGift: "$60,000 · Mar 2024",
    lastContact: "6d",
    status: "Prospect",
    region: "Riverside, CA",
    owner: "Dana Reese",
    prospect: true,
    prospectId: "p1"
  }, {
    id: "c2",
    name: "Maria Alvarez",
    type: "Individual",
    lifetime: "$94,500",
    lastGift: "$10,000 · Jun 2024",
    lastContact: "6d",
    status: "Prospect",
    region: "Riverside, CA",
    owner: "Dana Reese",
    prospect: true,
    prospectId: "p2"
  }, {
    id: "c3",
    name: "Okoro Logistics",
    type: "Organization",
    lifetime: "$120,000",
    lastGift: "$25,000 · Jun 2024",
    lastContact: "2d",
    status: "Prospect",
    region: "Bay Area, CA",
    owner: "Priya Nair",
    prospect: true,
    prospectId: "p3"
  }, {
    id: "c4",
    name: "James & Eleanor Okoro",
    type: "Individual",
    lifetime: "$210,000",
    lastGift: "$15,000 · Feb 2024",
    lastContact: "12d",
    status: "Prospect",
    region: "Riverside, CA",
    owner: "Dana Reese",
    prospect: true,
    prospectId: "p4"
  }, {
    id: "c5",
    name: "The Beaumont Trust",
    type: "Foundation",
    lifetime: "$40,000",
    lastGift: "$20,000 · Nov 2023",
    lastContact: "—",
    status: "Prospect",
    region: "Sacramento, CA",
    owner: "Priya Nair",
    prospect: true,
    prospectId: "p5"
  }, {
    id: "c6",
    name: "Sandra Kim",
    type: "Individual",
    lifetime: "$2,500",
    lastGift: "$2,500 · May 2024",
    lastContact: "3d",
    status: "Prospect",
    region: "Bay Area, CA",
    owner: "Dana Reese",
    prospect: true,
    prospectId: "p6"
  }, {
    id: "c7",
    name: "Theodore Brennan",
    type: "Individual",
    lifetime: "$18,400",
    lastGift: "$500 · Jun 2024",
    lastContact: "21d",
    status: "Active",
    region: "Riverside, CA",
    owner: "—",
    prospect: false
  }, {
    id: "c8",
    name: "Riverside Rotary Club",
    type: "Organization",
    lifetime: "$31,000",
    lastGift: "$4,000 · Apr 2024",
    lastContact: "40d",
    status: "Active",
    region: "Riverside, CA",
    owner: "—",
    prospect: false
  }, {
    id: "c9",
    name: "Helen Vasquez",
    type: "Individual",
    lifetime: "$6,250",
    lastGift: "$250 · Jan 2024",
    lastContact: "—",
    status: "Lapsed",
    region: "Fresno, CA",
    owner: "—",
    prospect: false
  }, {
    id: "c10",
    name: "Greenfield Community Bank",
    type: "Organization",
    lifetime: "$52,000",
    lastGift: "$12,000 · Dec 2023",
    lastContact: "55d",
    status: "Active",
    region: "Riverside, CA",
    owner: "—",
    prospect: false
  }],
  revenue: {
    summary: {
      total: "$1,284,600",
      count: "412",
      avg: "$3,118"
    },
    gifts: [{
      name: "Maria Alvarez",
      amount: "$10,000",
      date: "Jun 14, 2024",
      fund: "Annual Fund",
      campaign: "FY24 Annual",
      appeal: "Spring mail",
      type: "Cash",
      receipt: "Sent"
    }, {
      name: "Okoro Logistics",
      amount: "$25,000",
      date: "Jun 12, 2024",
      fund: "Youth Center",
      campaign: "Capital",
      appeal: "Corporate",
      type: "Pledge",
      receipt: "Pending"
    }, {
      name: "Hartwell Family Foundation",
      amount: "$60,000",
      date: "Jun 9, 2024",
      fund: "Youth Center",
      campaign: "Capital",
      appeal: "Direct ask",
      type: "Grant",
      receipt: "Sent"
    }, {
      name: "Theodore Brennan",
      amount: "$500",
      date: "Jun 9, 2024",
      fund: "Annual Fund",
      campaign: "FY24 Annual",
      appeal: "Sustainer",
      type: "Recurring",
      receipt: "Sent"
    }, {
      name: "Cardinal Manufacturing",
      amount: "$5,000",
      date: "Jun 7, 2024",
      fund: "After-School",
      campaign: "FY24 Annual",
      appeal: "Match drive",
      type: "Matching",
      receipt: "Sent"
    }, {
      name: "Riverside Rotary Club",
      amount: "$4,000",
      date: "Jun 3, 2024",
      fund: "After-School",
      campaign: "FY24 Annual",
      appeal: "Community",
      type: "Cash",
      receipt: "Sent"
    }, {
      name: "Greenfield Community Bank",
      amount: "$12,000",
      date: "May 28, 2024",
      fund: "Annual Fund",
      campaign: "FY24 Annual",
      appeal: "Corporate",
      type: "Cash",
      receipt: "Sent"
    }]
  },
  majorGiving: {
    opportunities: [{
      name: "Hartwell Family Foundation",
      stage: "Solicitation",
      ask: "$250,000",
      expected: "$200,000",
      close: "Sep 2024",
      likelihood: 72,
      owner: "Dana Reese"
    }, {
      name: "Maria Alvarez",
      stage: "Cultivation",
      ask: "$75,000",
      expected: "$50,000",
      close: "Nov 2024",
      likelihood: 64,
      owner: "Dana Reese"
    }, {
      name: "Okoro Logistics",
      stage: "Cultivation",
      ask: "$100,000",
      expected: "$60,000",
      close: "Dec 2024",
      likelihood: 58,
      owner: "Priya Nair"
    }, {
      name: "James & Eleanor Okoro",
      stage: "Stewardship",
      ask: "$50,000",
      expected: "$40,000",
      close: "Q1 2025",
      likelihood: 51,
      owner: "Dana Reese"
    }, {
      name: "The Beaumont Trust",
      stage: "Identification",
      ask: "—",
      expected: "—",
      close: "—",
      likelihood: 38,
      owner: "Priya Nair"
    }],
    proposals: [{
      name: "Hartwell Family Foundation",
      purpose: "Youth wing naming",
      amount: "$250,000",
      status: "Submitted",
      deadline: "Sep 1"
    }, {
      name: "Okoro Logistics",
      purpose: "ESG community grant",
      amount: "$100,000",
      status: "Drafting",
      deadline: "Oct 15"
    }, {
      name: "The Beaumont Trust",
      purpose: "After-school programs",
      amount: "$40,000",
      status: "LOI",
      deadline: "Nov 30"
    }],
    portfolio: [{
      name: "Hartwell Family Foundation",
      lifetime: "$185,000",
      stage: "Solicitation"
    }, {
      name: "Maria Alvarez",
      lifetime: "$94,500",
      stage: "Cultivation"
    }, {
      name: "James & Eleanor Okoro",
      lifetime: "$210,000",
      stage: "Stewardship"
    }, {
      name: "Sandra Kim",
      lifetime: "$2,500",
      stage: "Identification"
    }, {
      name: "Dr. Aisha Bello",
      lifetime: "$0",
      stage: "Identification"
    }]
  },
  /* ---------------------------------------------------------- 95 FORWARD */
  // The one ranked Master Prospect List.
  prospects: [{
    id: "p1",
    rank: 1,
    name: "Hartwell Family Foundation",
    kind: "foundation",
    subtitle: "Private foundation · Capital campaign",
    qpi: 92,
    horizon: "today",
    manager: "Dana Reese",
    partner: "Tom Bradley",
    cadence: "Follow up in 18h",
    dueSoon: true,
    initiative: "Riverside Youth Center — Capital Campaign",
    stageNote: "Follow-up due"
  }, {
    id: "p2",
    rank: 2,
    name: "Maria Alvarez",
    kind: "person",
    subtitle: "Retired CEO, Alvarez Foods · In district",
    qpi: 84,
    horizon: "tomorrow",
    manager: "Dana Reese",
    partner: "Sofia Lin",
    cadence: "Last contact 6d",
    dueSoon: false,
    initiative: "Riverside Youth Center — Capital Campaign",
    stageNote: "Cultivation"
  }, {
    id: "p3",
    rank: 3,
    name: "Okoro Logistics",
    kind: "company",
    subtitle: "Regional employer · ESG budget",
    qpi: 78,
    horizon: "tomorrow",
    manager: "Priya Nair",
    partner: "",
    cadence: "Visit planned Thu",
    dueSoon: false,
    initiative: "Riverside Youth Center — Capital Campaign",
    stageNote: "Visit planned"
  }, {
    id: "p4",
    rank: 4,
    name: "James & Eleanor Okoro",
    kind: "person",
    subtitle: "Longtime donors · Legacy interest",
    qpi: 71,
    horizon: "forever",
    manager: "Dana Reese",
    partner: "Tom Bradley",
    cadence: "Last contact 12d",
    dueSoon: false,
    initiative: "Legacy & Endowment Fund",
    stageNote: "Cultivation"
  }, {
    id: "p5",
    rank: 5,
    name: "The Beaumont Trust",
    kind: "foundation",
    subtitle: "Community trust · Youth programs",
    qpi: 66,
    horizon: "tomorrow",
    manager: "Priya Nair",
    partner: "Marcus Webb",
    cadence: "Research stage",
    dueSoon: false,
    initiative: "Riverside Youth Center — Capital Campaign",
    stageNote: "Research stage"
  }, {
    id: "p6",
    rank: 6,
    name: "Sandra Kim",
    kind: "person",
    subtitle: "Tech founder · New to the org",
    qpi: 58,
    horizon: "today",
    manager: "Dana Reese",
    partner: "",
    cadence: "Follow up in 3d",
    dueSoon: false,
    initiative: "After-School Program — 2026 Operating",
    stageNote: "Cultivation",
    connector: true
  }, {
    id: "p7",
    rank: 7,
    name: "Cardinal Manufacturing",
    kind: "company",
    subtitle: "Family business · Matching program",
    qpi: 49,
    horizon: "tomorrow",
    manager: "Priya Nair",
    partner: "",
    cadence: "Research stage",
    dueSoon: false,
    initiative: "After-School Program — 2026 Operating",
    stageNote: "Research stage"
  }, {
    id: "p8",
    rank: 8,
    name: "Dr. Aisha Bello",
    kind: "person",
    subtitle: "Board member's colleague",
    qpi: 41,
    horizon: "forever",
    manager: "Dana Reese",
    partner: "Tom Bradley",
    cadence: "No contact yet",
    dueSoon: false,
    initiative: "Legacy & Endowment Fund",
    stageNote: "No contact yet"
  }],
  // QPI breakdowns. Each part: score = rating × weight. Unknowns omit source.
  qpiParts: {
    p1: {
      capacity: {
        score: 35,
        max: 35,
        reason: "Foundation assets ≈ $40M; granted $1.2M to peer orgs last cycle — can give at the top level.",
        source: "IRS 990-PF · 2024"
      },
      relationship: {
        score: 24,
        max: 30,
        reason: "Board chair Eleanor Hartwell is a personal friend of our ED, Ruth; the institutional relationship is still being built.",
        source: "Logged · Dana R."
      },
      timing: {
        score: 15,
        max: 15,
        reason: "Their giving committee meets in Q3 — the campaign window is open now.",
        source: "Logged · Dana R."
      },
      history: {
        score: 8,
        max: 10,
        reason: "Three gifts over five years ($25K → $40K → $60K), trending up.",
        source: "Gift records"
      },
      philanthropy: {
        score: 10,
        max: 10,
        reason: "Actively funds peer youth organizations — $1M+ to peers last year.",
        source: "IRS 990-PF · 2024"
      }
    },
    p5: {
      capacity: {
        score: 7,
        max: 35,
        reason: "Trust size not yet confirmed — no public filing located.",
        source: null
      },
      relationship: {
        score: 24,
        max: 30,
        reason: "Marcus Webb has worked with two of the trustees before.",
        source: "Logged · Priya N."
      },
      timing: {
        score: 15,
        max: 15,
        reason: "Trust's youth-programs cycle opens this fall.",
        source: "Trust website"
      },
      history: {
        score: 10,
        max: 10,
        reason: "$20K gift in 2023; receptive to youth programming.",
        source: "Gift records"
      },
      philanthropy: {
        score: 10,
        max: 10,
        reason: "Funds community youth initiatives regionally.",
        source: "Public grants list"
      }
    },
    p8: {
      capacity: {
        score: 7,
        max: 35,
        reason: "No wealth indicators gathered yet.",
        source: null
      },
      relationship: {
        score: 6,
        max: 30,
        reason: "Known only as a colleague of a board member — no direct contact.",
        source: null
      },
      timing: {
        score: 6,
        max: 15,
        reason: "No active giving window identified.",
        source: "Logged · Dana R."
      },
      history: {
        score: 8,
        max: 10,
        reason: "Serves on two nonprofit boards; gives to education causes.",
        source: "Public bios"
      },
      philanthropy: {
        score: 8,
        max: 10,
        reason: "Signed a regional education funding letter in 2024.",
        source: "Public record"
      }
    },
    p2: {
      capacity: {
        score: 28,
        max: 35,
        reason: "Sold Alvarez Foods in 2021; comfortable at the six-figure level.",
        source: "Press · 2021"
      },
      relationship: {
        score: 24,
        max: 30,
        reason: "Twelve years of annual gifts; knows our ED personally.",
        source: "Gift records"
      },
      timing: {
        score: 12,
        max: 15,
        reason: "Recently retired and looking for a focus.",
        source: "Logged · Dana R."
      },
      history: {
        score: 10,
        max: 10,
        reason: "Steady annual giving, last gift $10K.",
        source: "Gift records"
      },
      philanthropy: {
        score: 10,
        max: 10,
        reason: "Funds food-security and youth causes in the region.",
        source: "Public grants"
      }
    },
    p3: {
      capacity: {
        score: 28,
        max: 35,
        reason: "Regional employer with a dedicated ESG budget line.",
        source: "Annual report"
      },
      relationship: {
        score: 18,
        max: 30,
        reason: "Two prior community grants; building exec sponsorship.",
        source: "Gift records"
      },
      timing: {
        score: 12,
        max: 15,
        reason: "ESG budget allocates in Q4 — proposal window open.",
        source: "Logged · Priya N."
      },
      history: {
        score: 10,
        max: 10,
        reason: "$25K pledge this year; reliable corporate partner.",
        source: "Gift records"
      },
      philanthropy: {
        score: 10,
        max: 10,
        reason: "Funds youth workforce programs across the region.",
        source: "Public CSR report"
      }
    },
    p4: {
      capacity: {
        score: 28,
        max: 35,
        reason: "Long-term donors with significant estate; legacy-minded.",
        source: "Wealth screen"
      },
      relationship: {
        score: 18,
        max: 30,
        reason: "Decades of support; warm but light recent contact.",
        source: "Gift records"
      },
      timing: {
        score: 9,
        max: 15,
        reason: "Exploring estate plans — no fixed window yet.",
        source: "Logged · Dana R."
      },
      history: {
        score: 8,
        max: 10,
        reason: "Consistent mid-level giving over many years.",
        source: "Gift records"
      },
      philanthropy: {
        score: 8,
        max: 10,
        reason: "Supports several education endowments.",
        source: "Public record"
      }
    },
    p6: {
      capacity: {
        score: 21,
        max: 35,
        reason: "Successful exit; capacity likely higher once confirmed.",
        source: "Press · 2023"
      },
      relationship: {
        score: 18,
        max: 30,
        reason: "New to the org but engaged — and a strong connector herself.",
        source: "Logged · Dana R."
      },
      timing: {
        score: 9,
        max: 15,
        reason: "Newly philanthropic; exploring where to focus.",
        source: "Logged · Dana R."
      },
      history: {
        score: 2,
        max: 10,
        reason: "One $2.5K first gift; no track record yet.",
        source: "Gift records"
      },
      philanthropy: {
        score: 8,
        max: 10,
        reason: "Backs STEM-access and youth-coding nonprofits.",
        source: "Public record"
      }
    },
    p7: {
      capacity: {
        score: 7,
        max: 35,
        reason: "Private family business — financials not public.",
        source: null
      },
      relationship: {
        score: 18,
        max: 30,
        reason: "Runs a gift-matching program with us already.",
        source: "Gift records"
      },
      timing: {
        score: 12,
        max: 15,
        reason: "Matching budget renews at fiscal year start.",
        source: "Logged · Priya N."
      },
      history: {
        score: 6,
        max: 10,
        reason: "Matching gifts totaling ~$15K to date.",
        source: "Gift records"
      },
      philanthropy: {
        score: 6,
        max: 10,
        reason: "Community-minded; local civic giving.",
        source: "Public record"
      }
    }
  },
  // Hartwell — the deep prospect, all tabs.
  hartwell: {
    id: "p1",
    suggestions: [{
      id: "s1",
      text: "Capacity looks higher than recorded — the foundation gave $1M+ to peer orgs last year.",
      source: "IRS 990-PF · 2024",
      from: "$50K capacity",
      to: "$250K capacity"
    }, {
      id: "s2",
      text: "Tom Bradley (board) sits on the Hartwell giving committee. Strong Natural Partner to open the door.",
      source: "LinkedIn · Board roster"
    }],
    facts: [{
      label: "Estimated capacity",
      value: "$250,000",
      source: "IRS 990-PF · 2024",
      ai: true
    }, {
      label: "Giving focus",
      value: "Youth & education",
      source: "990-PF Schedule"
    }, {
      label: "Last gift",
      value: "$60,000 · Mar 2024",
      source: "Gift records"
    }, {
      label: "Wealth screen",
      value: null,
      source: null
    }, {
      label: "Spouse / connections",
      value: "Eleanor Hartwell (chair)",
      source: "Board minutes"
    }],
    timeline: [{
      when: "6 days ago",
      what: "Coffee with Tom Bradley — he'll make the intro.",
      who: "Dana R."
    }, {
      when: "3 weeks ago",
      what: "Sent youth-program impact brief.",
      who: "Dana R."
    }, {
      when: "2 months ago",
      what: "$60,000 annual gift received.",
      who: "Gift records"
    }],
    kb: {
      capacity: {
        value: "≈ $40M in assets; granted $1.2M to peers last cycle",
        source: "IRS 990-PF · 2024"
      },
      caseFit: {
        value: "Funds youth & education — direct fit with the youth center",
        source: "990-PF Schedule"
      },
      connectors: [{
        name: "Tom Bradley",
        role: "Board member · sits on giving committee",
        path: "Warm — offered to make the intro"
      }, {
        name: "Eleanor Hartwell",
        role: "Board chair",
        path: "Personal friend of our ED, Ruth"
      }],
      gifts: {
        last: "$60,000 · Mar 2024",
        largest: "$60,000",
        total: "$185,000 lifetime"
      },
      otherPhil: {
        value: "$1M+ to peer youth orgs in 2024",
        source: "IRS 990-PF · 2024"
      },
      timing: {
        value: "Giving committee meets Q3 — window open now",
        source: "Logged · Dana R."
      },
      gaps: ["Confirm 2025 grant budget ceiling", "Identify the program officer who screens proposals", "Verify naming-gift appetite with the chair"],
      relationshipMap: {
        decisionMakers: [{
          name: "Eleanor Hartwell",
          role: "Board chair",
          power: "High — final say on major grants",
          path: "Friend of ED Ruth"
        }, {
          name: "Tom Bradley",
          role: "Giving committee",
          power: "Medium — shapes the shortlist",
          path: "Our Natural Partner"
        }, {
          name: "Program officer",
          role: "Screens proposals",
          power: "Medium — gatekeeper",
          path: "Unknown — worth researching"
        }]
      }
    },
    strategy: {
      goals: "Move from annual supporter to lead capital donor on the youth center.",
      hooks: ["Naming the new youth wing", "Measurable outcomes for under-12 programs", "Multi-year pledge structure"],
      objections: ["Wants proof of program outcomes before a large commitment", "Prefers to give through the foundation's Q3 cycle"],
      predisposition: "Tom Bradley opens the door; invite the chair to a program site visit before the ask.",
      presentation: "Lead with the youth-center capital priority and the naming opportunity.",
      nextSteps: ["Confirm site-visit date with Eleanor", "Draft the $250K naming proposal", "Brief Tom before the committee meets"]
    },
    visits: [{
      when: "Planned · this week",
      goal: "Secure the naming-gift conversation",
      present: "Eleanor Hartwell, Dana, Tom Bradley",
      priority: "Youth center capital",
      status: "planned"
    }, {
      when: "Mar 2024",
      goal: "Steward the annual gift, surface the campaign",
      present: "Eleanor Hartwell, Dana",
      priority: "Youth programs impact",
      debrief: "Warm; asked for outcome data. Receptive to a larger role.",
      outcome: "Roadmap",
      next: "Send impact brief, line up Tom for an intro",
      status: "done"
    }],
    asks: [{
      amount: "$250,000",
      initiative: "Riverside Youth Center — Capital Campaign",
      frame: "tomorrow",
      type: "Naming gift",
      numbers: "On the table",
      outcome: "Roadmap",
      detail: "Wants a site visit + outcome data first; revisit at Q3 committee."
    }],
    referrals: [{
      name: "A peer foundation trustee",
      from: "Eleanor Hartwell",
      useName: "Yes",
      willNote: "Will send a note",
      rel: "Co-funds youth programs"
    }]
  },
  // Initiatives (funding priorities).
  initiatives: [{
    id: "i1",
    name: "Riverside Youth Center — Capital Campaign",
    frame: "tomorrow",
    goal: 5000000,
    raised: 1850000,
    committed: 700000,
    roadmap: 950000,
    openAsks: 3,
    timeline: "Multi-year · through 2027",
    story: "A permanent home for after-school, mentoring, and summer programs — one building that lets us serve three times the children we reach today.",
    widget: "$5,000 names a child's study room for a year.",
    prospects: ["p1", "p2", "p3", "p5"]
  }, {
    id: "i2",
    name: "After-School Program — 2026 Operating",
    frame: "today",
    goal: 400000,
    raised: 232000,
    committed: 40000,
    roadmap: 35000,
    openAsks: 2,
    timeline: "This fiscal year",
    story: "Keeps the doors open after 3pm for 220 kids — staff, snacks, transportation, and tutoring, fully funded for the year.",
    widget: "$2,500 funds one child for a full year.",
    prospects: ["p6", "p7"]
  }, {
    id: "i3",
    name: "Legacy & Endowment Fund",
    frame: "forever",
    goal: 10000000,
    raised: 3100000,
    committed: 250000,
    roadmap: 400000,
    openAsks: 2,
    timeline: "Open-ended",
    story: "An endowment so the mission outlives any one campaign — steady income that protects the programs families count on, forever.",
    widget: "A $100,000 legacy gift yields ~$4,000 every year, in perpetuity.",
    prospects: ["p4", "p8"]
  }],
  // Today screen.
  today: {
    nextMoves: [{
      id: "p1",
      move: "Go see them today — QPI 90+, follow-up due in 18h.",
      action: "Plan the visit",
      primary: true
    }, {
      id: "p3",
      move: "Tom can open the door this week. Visit planned Thursday.",
      action: "Log a touch"
    }, {
      id: "p6",
      move: "New founder, warm intro available — and a strong connector herself.",
      action: "Plan the visit"
    }],
    followups: [{
      id: "p1",
      text: "24-hour follow-up to the Hartwell coffee — copilot drafted it.",
      left: "18h left",
      overdue: false
    }, {
      id: "p2",
      text: "Thank-you + next step after Maria's lunch.",
      left: "6h left",
      overdue: false
    }, {
      id: "p4",
      text: "Legacy materials promised to the Okoros.",
      left: "Overdue 1d",
      overdue: true
    }],
    visits: [{
      id: "p3",
      time: "2:00 PM",
      priority: "ESG community grant — youth center",
      who: "Okoro Logistics"
    }],
    copilotCount: 6,
    coverage: {
      text: "4 of your Top 33 have no active strategy",
      count: 4
    }
  },
  // Green Sheet.
  greenSheet: {
    visits: {
      value: 4,
      goal: 5
    },
    asks: {
      value: 3,
      goal: 6
    },
    followupPct: 92,
    coverage: {
      assigned: 88,
      strategy: 76
    },
    asksByOutcome: {
      commitment: 5,
      roadmap: 4,
      decline: 2
    },
    referralsPerVisit: 1.4,
    pipelineByHorizon: [{
      horizon: "today",
      count: 6,
      total: "$640K"
    }, {
      horizon: "tomorrow",
      count: 14,
      total: "$3.2M"
    }, {
      horizon: "forever",
      count: 8,
      total: "$1.4M"
    }],
    byRM: [{
      rm: "Dana Reese",
      coverage: 91,
      visits: 4,
      asks: 2,
      followup: 95
    }, {
      rm: "Priya Nair",
      coverage: 84,
      visits: 3,
      asks: 1,
      followup: 88
    }],
    streak: 6
  },
  // Connector discovery (candidates).
  discovery: [{
    id: "d1",
    connector: "Sandra Kim",
    connectorId: "p6",
    initiative: "After-School Program — 2026 Operating",
    status: "ready",
    count: 12,
    requested: "2 days ago",
    candidates: [{
      name: "Lena Petrov",
      confidence: "medium",
      connection: "co-director, Bay Area STEM-Access Fund",
      affinity: "funded two youth-coding nonprofits, 2023–24",
      status: "suggested"
    }, {
      name: "David Osei",
      confidence: "high",
      connection: "co-signed the 2024 youth-education open letter",
      affinity: "family foundation focuses on under-12 literacy",
      status: "suggested"
    }, {
      name: "Priscilla Vance",
      confidence: "low",
      connection: "both spoke at the 2025 EdTech for Good summit",
      affinity: null,
      status: "suggested"
    }]
  }, {
    id: "d2",
    connector: "Tom Bradley",
    connectorId: null,
    initiative: "Riverside Youth Center — Capital Campaign",
    status: "researching",
    count: 0,
    requested: "20 minutes ago",
    candidates: []
  }],
  // QPI weight defaults (settings).
  qpiWeights: [{
    key: "capacity",
    label: "Capacity",
    weight: 7,
    max: 35,
    color: "var(--qpi-capacity)",
    note: "Ability to give at the level the case needs."
  }, {
    key: "relationship",
    label: "Relationship",
    weight: 6,
    max: 30,
    color: "var(--qpi-relationship)",
    note: "Depth of connection to the org and the cause."
  }, {
    key: "timing",
    label: "Timing",
    weight: 3,
    max: 15,
    color: "var(--qpi-timing)",
    note: "Is the window open now?"
  }, {
    key: "history",
    label: "Gift History",
    weight: 2,
    max: 10,
    color: "var(--qpi-history)",
    note: "Pattern and trajectory of past giving."
  }, {
    key: "philanthropy",
    label: "Philanthropy",
    weight: 2,
    max: 10,
    color: "var(--qpi-philanthropy)",
    note: "Demonstrated giving to peer causes."
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/data.js", error: String((e && e.message) || e) }); }

// poc/f95_greensheet.jsx
try { (() => {
/* 95 Forward — Green Sheet. Momentum made visible: method-native activity, not
   vanity revenue. Calm, scannable, motivating. */

const GS = window.Ds95ForwardDesignSystem_31a0c4 || {};
function GreenSheet({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Card,
    HorizonTag
  } = GS;
  const g = D.greenSheet;
  const [range, setRange] = React.useState("week");
  const [scope, setScope] = React.useState("me");
  const Pill = ({
    value,
    set,
    opts
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      padding: 3,
      background: "var(--haze-100)",
      borderRadius: "var(--radius-md)"
    }
  }, opts.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => set(k),
    style: {
      padding: "6px 13px",
      borderRadius: "var(--radius-sm)",
      border: "none",
      cursor: "pointer",
      background: value === k ? "var(--surface-card)" : "transparent",
      boxShadow: value === k ? "var(--shadow-sm)" : "none",
      color: value === k ? "var(--text-strong)" : "var(--text-muted)",
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)"
    }
  }, l)));
  const Metric = ({
    label,
    value,
    suffix,
    accent,
    sub,
    bar
  }) => /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 4,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)",
      letterSpacing: "var(--ls-tight)",
      color: accent
    }
  }, value), suffix ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, suffix) : null), bar != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      height: 7,
      borderRadius: 99,
      background: "var(--haze-100)",
      marginTop: 14,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: bar + "%",
      borderRadius: 99,
      background: accent
    }
  })) : null, sub ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 10
    }
  }, sub) : null);
  const totalAsks = g.asksByOutcome.commitment + g.asksByOutcome.roadmap + g.asksByOutcome.decline;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 22,
      maxWidth: 1080
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    value: range,
    set: setRange,
    opts: [["week", "This week"], ["month", "This month"], ["quarter", "Quarter"]]
  }), /*#__PURE__*/React.createElement(Pill, {
    value: scope,
    set: setScope,
    opts: [["me", "Me"], ["dana", "Dana"], ["priya", "Priya"], ["team", "Team"]]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      padding: "8px 14px",
      borderRadius: "var(--radius-pill)",
      background: "var(--sage-50)",
      border: "1px solid var(--sage-100)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flame",
    size: 16,
    color: "var(--sage-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--sage-700)"
    }
  }, g.streak, "-week momentum streak"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Metric, {
    label: "Visits this week",
    value: g.visits.value,
    suffix: "/ " + g.visits.goal,
    accent: "var(--blue-600)",
    bar: g.visits.value / g.visits.goal * 100,
    sub: "One to go \u2014 nicely paced."
  }), /*#__PURE__*/React.createElement(Metric, {
    label: "Asks this month",
    value: g.asks.value,
    suffix: "/ " + g.asks.goal,
    accent: "var(--gold-600)",
    bar: g.asks.value / g.asks.goal * 100,
    sub: "Keep the conversations moving."
  }), /*#__PURE__*/React.createElement(Metric, {
    label: "Follow-ups within 24h",
    value: g.followupPct,
    suffix: "%",
    accent: "var(--sage-600)",
    bar: g.followupPct,
    sub: "The SLA we care about most."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.1fr 1.2fr 0.8fr",
      gap: 16,
      alignItems: "stretch"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Top 33 coverage"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      marginTop: 16
    }
  }, [["Has an assigned RM", g.coverage.assigned, "var(--blue-600)"], ["Has an active strategy", g.coverage.strategy, "var(--sage-600)"]].map(([l, v, c], i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--text-body)"
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-small) var(--font-sans)",
      color: c
    }
  }, v, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 7,
      borderRadius: 99,
      background: "var(--haze-100)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: v + "%",
      background: c,
      borderRadius: 99
    }
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("mpl"),
    style: {
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color: "var(--blue-600)",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      textAlign: "left",
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, "4 without a strategy \u2014 see them ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 13,
    color: "var(--blue-600)"
  })))), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Asks by outcome"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 14,
      borderRadius: 99,
      overflow: "hidden",
      marginTop: 16,
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: g.asksByOutcome.commitment,
      background: "var(--sage-600)"
    },
    title: "Commitment"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: g.asksByOutcome.roadmap,
      background: "var(--blue-500)"
    },
    title: "Roadmap"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: g.asksByOutcome.decline,
      background: "var(--ink-300)"
    },
    title: "Decline"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      marginTop: 14,
      flexWrap: "wrap"
    }
  }, [["Commitment", g.asksByOutcome.commitment, "var(--sage-600)"], ["Roadmap", g.asksByOutcome.roadmap, "var(--blue-500)"], ["Decline", g.asksByOutcome.decline, "var(--ink-300)"]].map(([l, v, c], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 2,
      background: c
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, v), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: 14
    }
  }, "\u201CRoadmap\u201D is a good outcome \u2014 a clear next step, not a no.")), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Referrals per visit"), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)",
      color: "var(--sage-600)",
      marginTop: 14,
      letterSpacing: "var(--ls-tight)"
    }
  }, g.referralsPerVisit), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)/1.5 var(--font-sans)",
      color: "var(--text-secondary)",
      marginTop: 12
    }
  }, "The relationship compounding \u2014 every visit opens the next door."))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Pipeline by horizon"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 4,
      marginBottom: 18
    }
  }, "Today \u2192 Tomorrow \u2192 Forever \u2014 near to far."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16
    }
  }, g.pipelineByHorizon.map((h, i) => {
    const col = {
      today: "var(--horizon-today)",
      tomorrow: "var(--horizon-tomorrow)",
      forever: "var(--horizon-forever)"
    }[h.horizon];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: 18,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-hairline)",
        borderTop: "3px solid " + col
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(HorizonTag, {
      horizon: h.horizon
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ks-num",
      style: {
        font: "var(--fw-heavy) var(--fs-2xl) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, h.count), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-muted)"
      }
    }, "prospects")), /*#__PURE__*/React.createElement("div", {
      className: "ks-num",
      style: {
        font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
        color: col,
        marginTop: 6
      }
    }, h.total, " in pipeline"));
  }))), /*#__PURE__*/React.createElement(Card, {
    pad: "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px 4px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "By Relationship Manager")), /*#__PURE__*/React.createElement("table", {
    className: "ks-table",
    style: {
      "--host-rule": "var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "8px 20px 10px"
    }
  }, "RM"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Top-33 coverage"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Visits"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Asks"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right",
      paddingRight: 20
    }
  }, "24h follow-up"))), /*#__PURE__*/React.createElement("tbody", null, g.byRM.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 20px",
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, r.rm), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, r.coverage, "%"), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, r.visits), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, r.asks), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      paddingRight: 20,
      fontWeight: 600,
      color: "var(--sage-700)"
    }
  }, r.followup, "%")))))));
}
window.POC = Object.assign(window.POC || {}, {
  GreenSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/f95_greensheet.jsx", error: String((e && e.message) || e) }); }

// poc/f95_initiatives.jsx
try { (() => {
/* 95 Forward — Initiatives (funding priorities; lean: list + detail) and the
   95 Forward settings page (the editable QPI weights — the score is ours). */

const IN = window.Ds95ForwardDesignSystem_31a0c4 || {};
const fmtK = n => n >= 1000000 ? "$" + (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + "M" : "$" + Math.round(n / 1000) + "K";

/* ============================ INITIATIVES LIST ============================ */
function Initiatives({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Tag,
    Button,
    HorizonTag
  } = IN;
  const [frame, setFrame] = React.useState("all");
  const rows = D.initiatives.filter(i => frame === "all" || i.frame === frame);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      maxWidth: 980
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, [["all", "All", null], ["today", "Today", "var(--horizon-today)"], ["tomorrow", "Tomorrow", "var(--horizon-tomorrow)"], ["forever", "Forever", "var(--horizon-forever)"]].map(([id, l, c]) => /*#__PURE__*/React.createElement(Tag, {
    key: id,
    color: c,
    selected: frame === id,
    onClick: () => setFrame(id)
  }, l)), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    style: {
      marginLeft: "auto"
    },
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 14
    })
  }, "Add initiative")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, rows.map(i => {
    const pct = Math.round(i.raised / i.goal * 100);
    const col = {
      today: "var(--horizon-today)",
      tomorrow: "var(--horizon-tomorrow)",
      forever: "var(--horizon-forever)"
    }[i.frame];
    return /*#__PURE__*/React.createElement("div", {
      key: i.id,
      onClick: () => go("initiative", {
        id: i.id
      }),
      style: {
        padding: 20,
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderLeft: "3px solid " + col,
        cursor: "pointer",
        transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)"
      },
      onMouseEnter: e => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-1px)";
      },
      onMouseLeave: e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, i.name), /*#__PURE__*/React.createElement(HorizonTag, {
      horizon: i.frame
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-muted)",
        marginTop: 4
      }
    }, i.timeline, " \xB7 ", i.openAsks, " open asks")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ks-num",
      style: {
        font: "var(--fw-bold) var(--fs-lg) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, fmtK(i.raised)), /*#__PURE__*/React.createElement("div", {
      className: "ks-num",
      style: {
        font: "var(--text-caption)",
        color: "var(--text-muted)"
      }
    }, "of ", fmtK(i.goal), " goal"))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8,
        borderRadius: 99,
        background: "var(--haze-100)",
        marginTop: 16,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: pct + "%",
        background: col,
        borderRadius: 99
      }
    })));
  })));
}

/* ============================ INITIATIVE DETAIL ============================ */
function InitiativeDetail({
  params,
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Card,
    HorizonTag,
    Button,
    Badge
  } = IN;
  const i = D.initiatives.find(x => x.id === (params && params.id)) || D.initiatives[0];
  const col = {
    today: "var(--horizon-today)",
    tomorrow: "var(--horizon-tomorrow)",
    forever: "var(--horizon-forever)"
  }[i.frame];
  const pct = Math.round(i.raised / i.goal * 100);
  const cPct = Math.round(i.committed / i.goal * 100);
  const rPct = Math.round(i.roadmap / i.goal * 100);
  const prospects = i.prospects.map(id => D.prospects.find(p => p.id === id));
  const outcomeTone = {
    Commitment: "success",
    Roadmap: "info",
    Decline: "neutral"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px 48px",
      display: "flex",
      flexDirection: "column",
      gap: 22,
      maxWidth: 980
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("initiatives"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      padding: 0,
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Initiatives"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) var(--fs-2xl)/1.15 var(--font-sans)",
      color: "var(--text-strong)",
      letterSpacing: "var(--ls-snug)"
    }
  }, i.name), /*#__PURE__*/React.createElement(HorizonTag, {
    horizon: i.frame
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 6
    }
  }, i.timeline)), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-3xl) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, fmtK(i.raised)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-body) var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "raised of ", fmtK(i.goal), " goal \xB7 ", pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 12,
      borderRadius: 99,
      background: "var(--haze-100)",
      marginTop: 16,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: pct + cPct + rPct + "%",
      background: "var(--haze-200)",
      borderRadius: 99
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: pct + cPct + "%",
      background: col,
      opacity: 0.4,
      borderRadius: 99
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: pct + "%",
      background: col,
      borderRadius: 99
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 20,
      marginTop: 14
    }
  }, [["Raised", fmtK(i.raised), col], ["Committed", fmtK(i.committed), col], ["In roadmap", fmtK(i.roadmap), "var(--ink-300)"]].map(([l, v, c], idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: c,
      opacity: idx === 1 ? 0.4 : 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)"
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, v))))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "The story"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fw-regular) var(--fs-xl)/1.5 var(--font-serif)",
      color: "var(--text-strong)",
      margin: "14px 0 0",
      letterSpacing: "var(--ls-snug)"
    }
  }, i.story), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      padding: "14px 16px",
      borderRadius: "var(--radius-md)",
      background: "var(--ai-surface)",
      border: "1px solid var(--ai-border)",
      borderLeft: "3px solid var(--ai-ink)",
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 13,
      height: 13,
      borderRadius: 3,
      background: "var(--ai-ink)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--ai-ink)"
    }
  }, "Copilot \xB7 funding rationale"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--iris-700)",
      marginTop: 5
    }
  }, i.widget)))), /*#__PURE__*/React.createElement(Card, {
    pad: "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px 4px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Prospects & asks on this initiative")), /*#__PURE__*/React.createElement("table", {
    className: "ks-table",
    style: {
      "--host-rule": "var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "8px 20px 10px"
    }
  }, "Prospect"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "QPI"), /*#__PURE__*/React.createElement("th", null, "RM"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Ask"), /*#__PURE__*/React.createElement("th", {
    style: {
      paddingRight: 20
    }
  }, "Outcome"))), /*#__PURE__*/React.createElement("tbody", null, prospects.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: "is-click",
    onClick: () => go("prospect", {
      id: p.id
    })
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 20px",
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, p.name), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      fontWeight: 700,
      color: p.qpi >= 90 ? "var(--gold-600)" : p.qpi >= 70 ? "var(--blue-600)" : "var(--sage-600)"
    }
  }, p.qpi), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--text-secondary)"
    }
  }, p.manager), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, p.id === "p1" ? "$250K" : p.id === "p6" ? "$25K" : "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      paddingRight: 20
    }
  }, p.id === "p1" ? /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "Roadmap") : /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "In cultivation"))))))));
}

/* ============================ 95 FORWARD SETTINGS ============================ */
function F95Settings({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Card
  } = IN;
  const [weights, setWeights] = React.useState(D.qpiWeights.map(w => w.weight));
  const [toggles, setToggles] = React.useState({
    research: true,
    autoscore: true,
    drafts: true
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const Toggle = ({
    on,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      width: 42,
      height: 24,
      borderRadius: 99,
      border: "none",
      cursor: "pointer",
      background: on ? "var(--blue-600)" : "var(--ink-200)",
      position: "relative",
      transition: "background var(--dur-base)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: on ? 21 : 3,
      width: 18,
      height: 18,
      borderRadius: 99,
      background: "#fff",
      transition: "left var(--dur-base) var(--ease-out)",
      boxShadow: "var(--shadow-sm)"
    }
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px 48px",
      display: "flex",
      flexDirection: "column",
      gap: 22,
      maxWidth: 820
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("settings"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      padding: 0,
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Settings"), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "QPI weights"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color: total === 20 ? "var(--sage-700)" : "var(--gold-700)"
    }
  }, "Points sum to ", total * 5, " / 100")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-secondary)",
      margin: "0 0 20px",
      maxWidth: 580
    }
  }, "Each prospect is rated 1\u20135 on five dimensions; the rating is multiplied by the dimension's weight. This is what makes the score ours to tune \u2014 and explainable, not a black box."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, D.qpiWeights.map((w, idx) => /*#__PURE__*/React.createElement("div", {
    key: w.key,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 0",
      borderBottom: idx < 4 ? "1px solid var(--border-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: 3,
      background: w.color,
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, w.label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, w.note)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeights(ws => ws.map((x, i) => i === idx ? Math.max(1, x - 1) : x)),
    style: {
      width: 28,
      height: 28,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      cursor: "pointer",
      color: "var(--text-body)",
      font: "var(--fw-bold) 16px var(--font-sans)"
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      width: 24,
      textAlign: "center",
      font: "var(--fw-bold) var(--fs-body) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, weights[idx]), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeights(ws => ws.map((x, i) => i === idx ? Math.min(10, x + 1) : x)),
    style: {
      width: 28,
      height: 28,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      cursor: "pointer",
      color: "var(--text-body)",
      font: "var(--fw-bold) 16px var(--font-sans)"
    }
  }, "+")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 70,
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-body) var(--font-sans)",
      color: w.color
    }
  }, "max ", weights[idx] * 5))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeights(D.qpiWeights.map(w => w.weight)),
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--text-secondary)",
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, "Reset to defaults"))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Copilot behavior"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      marginTop: 12
    }
  }, [["research", "Let the copilot research public sources", "990-PF filings, board rosters, press — always shown with provenance."], ["autoscore", "Propose QPI updates automatically", "New evidence proposes a score change. You always approve before it applies."], ["drafts", "Draft 24-hour follow-ups after visits", "A ready-to-edit follow-up the moment you log a debrief."]].map(([k, l, d], idx) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "13px 0",
      borderBottom: idx < 2 ? "1px solid var(--border-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, d)), /*#__PURE__*/React.createElement(Toggle, {
    on: toggles[k],
    onClick: () => setToggles(t => ({
      ...t,
      [k]: !t[k]
    }))
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 11,
      padding: "14px 18px",
      borderRadius: "var(--radius-md)",
      background: "var(--haze-100)",
      border: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 16,
    color: "var(--ink-500)",
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-caption)/1.5 var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, "The copilot only researches public sources, and every grounded fact carries a citation. Nothing is applied to a record without your approval. Discovery candidates stay off the ranked list until a human and the connector validate them.")));
}
window.POC = Object.assign(window.POC || {}, {
  Initiatives,
  InitiativeDetail,
  F95Settings
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/f95_initiatives.jsx", error: String((e && e.message) || e) }); }

// poc/f95_prospect.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* 95 Forward — Prospect detail. "The whole picture — and the next right move."
   Overview (the QPI signature) · Knowledge Base · Strategy · Visits & Asks. */

const PD = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* ---- shared rail used on Overview ---- */
function NextMoveRail({
  p,
  go
}) {
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Card,
    Button
  } = PD;
  const D = window.POC_DATA;
  const H = D.hartwell;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      position: "sticky",
      top: 24
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "default",
    pad: "md",
    elevation: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--gold-700)"
  }, "The next move"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      margin: "13px 0 6px"
    }
  }, p.dueSoon ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 99,
      background: "var(--gold-600)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite",
      flex: "none"
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, p.dueSoon ? "Follow up by tomorrow" : p.cadence)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-secondary)",
      margin: "0 0 16px"
    }
  }, p.id === "p1" ? "Tom can open the door this week. Fast and good beats slow and perfect." : "Keep the relationship warm — the next conversation is what moves this forward."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "go",
    block: true,
    onClick: () => go("visit"),
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-check",
      size: 16
    })
  }, "Plan the visit"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "message-square",
      size: 15
    })
  }, "Log a touch"))), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Recent activity"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      marginTop: 14
    }
  }, (p.id === "p1" ? H.timeline : [{
    when: "Last week",
    what: "Added to the " + p.initiative.split(" — ")[0] + " initiative.",
    who: "Dana R."
  }, {
    when: "2 weeks ago",
    what: "Qualified and scored — entered the ranked list.",
    who: "Copilot"
  }]).map((t, i, arr) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 11,
      paddingBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: "var(--ink-300)",
      marginTop: 5,
      flex: "none"
    }
  }), i < arr.length - 1 ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1.5,
      flex: 1,
      background: "var(--border-hairline)",
      marginTop: 3
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) var(--fs-small)/1.4 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, t.what), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, t.when, " \xB7 ", t.who)))))));
}

/* ---- What we know fact row ---- */
function FactRow({
  label,
  value,
  source,
  ai
}) {
  const {
    SourceTag
  } = PD;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      padding: "12px 0",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 160,
      flex: "none",
      font: "var(--text-label)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, value ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-body)/1.3 var(--font-sans)",
      color: ai ? "var(--iris-700)" : "var(--text-strong)"
    }
  }, value), ai ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--ai-ink)",
      background: "var(--ai-tint)",
      padding: "2px 6px",
      borderRadius: "var(--radius-xs)"
    }
  }, "Copilot") : null, source ? /*#__PURE__*/React.createElement(SourceTag, {
    source: source
  }) : null) : /*#__PURE__*/React.createElement(SourceTag, {
    onClick: () => {}
  })));
}

/* ============================ OVERVIEW ============================ */
function OverviewTab({
  p,
  go
}) {
  const D = window.POC_DATA;
  const {
    Eyebrow
  } = window.POC;
  const {
    Card,
    QPIScore,
    AISuggestion
  } = PD;
  const H = D.hartwell;
  const parts = D.qpiParts[p.id];
  const isHart = p.id === "p1";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) 330px",
      gap: 28,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "go",
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--gold-700)"
  }, "Qualified Prospect Index"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Updated 6h ago")), /*#__PURE__*/React.createElement(QPIScore, {
    value: p.qpi,
    parts: parts,
    defaultOpen: isHart,
    onAdjust: () => {}
  })), isHart ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--ai-ink)"
  }, "From your copilot \xB7 ", H.suggestions.length, " to review"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      marginTop: 12
    }
  }, H.suggestions.map(s => /*#__PURE__*/React.createElement(AISuggestion, {
    key: s.id,
    source: s.source,
    from: s.from,
    to: s.to,
    onApprove: () => {},
    onEdit: () => {},
    onDismiss: () => {}
  }, s.text)))) : /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--ai-ink)"
  }, "From your copilot"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-secondary)",
      margin: "10px 0 0"
    }
  }, "No open suggestions right now. The copilot is watching public sources and will propose updates as it finds them \u2014 you'll always approve before anything changes.")), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "What we know"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Gaps are invitations, not errors")), (isHart ? H.facts : [{
    label: "Estimated capacity",
    value: parts.capacity.source ? "Being confirmed" : null,
    source: parts.capacity.source
  }, {
    label: "Giving focus",
    value: p.subtitle.split(" · ")[0],
    source: "Logged · " + p.manager.split(" ")[0] + "."
  }, {
    label: "Last gift",
    value: D.constituents.find(c => c.prospectId === p.id) ? D.constituents.find(c => c.prospectId === p.id).lastGift : "—",
    source: "Gift records"
  }, {
    label: "Wealth screen",
    value: null,
    source: null
  }]).map((f, i) => /*#__PURE__*/React.createElement(FactRow, _extends({
    key: i
  }, f))))), /*#__PURE__*/React.createElement(NextMoveRail, {
    p: p,
    go: go
  }));
}

/* ============================ KNOWLEDGE BASE ============================ */
function KBTab({
  p
}) {
  const D = window.POC_DATA;
  const {
    Eyebrow,
    Icon
  } = window.POC;
  const {
    Card,
    SourceTag,
    RoleChip
  } = PD;
  const isOrg = p.kind !== "person";
  const isHart = p.id === "p1";
  const kb = D.hartwell.kb;
  const Row = ({
    label,
    value,
    source,
    last
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "13px 0",
      borderBottom: last ? "none" : "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: 7
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-body)/1.4 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, value), source ? /*#__PURE__*/React.createElement(SourceTag, {
    source: source
  }) : null));
  if (!isHart) {
    return /*#__PURE__*/React.createElement(Card, {
      pad: "lg"
    }, /*#__PURE__*/React.createElement(Eyebrow, null, "Knowledge base"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fs-body)/1.6 var(--font-sans)",
        color: "var(--text-secondary)",
        margin: "14px 0 18px",
        maxWidth: 520
      }
    }, "No research worksheet yet for ", p.name, ". This is where the case-readiness picture comes together \u2014 capacity, the relationship, connectors, and the gaps worth filling."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--ai-border)",
        background: "var(--ai-surface)",
        color: "var(--ai-ink)",
        cursor: "pointer",
        font: "var(--fw-semibold) var(--fs-small) var(--font-sans)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 12,
        borderRadius: 3,
        background: "var(--ai-ink)"
      }
    }), " Ask the copilot to research")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isOrg ? "minmax(0,1fr) 320px" : "minmax(0, 720px)",
      gap: 28,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "The research worksheet"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Capacity & source",
    value: kb.capacity.value,
    source: kb.capacity.source
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Fit to the case",
    value: kb.caseFit.value,
    source: kb.caseFit.source
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Gift history",
    value: `Last ${kb.gifts.last} · Largest ${kb.gifts.largest} · ${kb.gifts.total}`,
    source: "Gift records"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Other philanthropy",
    value: kb.otherPhil.value,
    source: kb.otherPhil.source
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Timing",
    value: kb.timing.value,
    source: kb.timing.source,
    last: true
  }))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Connectors"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      marginTop: 14
    }
  }, kb.connectors.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: "var(--haze-50)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement(RoleChip, {
    role: "partner",
    name: c.name
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, c.role), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--sage-700)",
      marginTop: 2
    }
  }, c.path)))))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    tone: "default",
    style: {
      background: "var(--haze-50)"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Research gaps"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 14
    }
  }, kb.gaps.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "11px 14px",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-md)",
      border: "1px dashed var(--border-default)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15,
    color: "var(--ink-400)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--text-body)"
    }
  }, g), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color: "var(--ai-ink)",
      cursor: "pointer"
    }
  }, "Ask the copilot")))))), isOrg ? /*#__PURE__*/React.createElement(Card, {
    pad: "lg",
    style: {
      position: "sticky",
      top: 24
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Relationship map"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      margin: "6px 0 14px"
    }
  }, "Who decides \u2014 and the warm path to each."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, kb.relationshipMap.decisionMakers.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "12px 14px",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 3
    }
  }, d.role), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 6
    }
  }, d.power), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, d.path.startsWith("Unknown") ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-micro) var(--font-sans)",
      color: "var(--unknown-ink)",
      background: "var(--unknown-surface)",
      border: "1px dashed var(--unknown-border)",
      padding: "2px 7px",
      borderRadius: "var(--radius-xs)"
    }
  }, d.path) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)",
      color: "var(--sage-700)"
    }
  }, "\u21B3 ", d.path)))))) : null);
}

/* ============================ STRATEGY ============================ */
function StrategyTab({
  p
}) {
  const D = window.POC_DATA;
  const {
    Eyebrow,
    Icon
  } = window.POC;
  const {
    Card
  } = PD;
  const isHart = p.id === "p1";
  const s = D.hartwell.strategy;
  if (!isHart) {
    return /*#__PURE__*/React.createElement(Card, {
      pad: "lg"
    }, /*#__PURE__*/React.createElement(Eyebrow, null, "Strategy"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fs-body)/1.6 var(--font-sans)",
        color: "var(--text-secondary)",
        margin: "14px 0 0",
        maxWidth: 520
      }
    }, "No strategy drafted yet for ", p.name, ". Relationship goals, hooks, likely objections, and the plan to warm the path will live here \u2014 the copilot can draft a first pass for you to shape."));
  }
  const Block = ({
    title,
    children
  }) => /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, children));
  const Chips = ({
    items,
    color
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, items.map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      color: color || "var(--text-body)",
      background: "var(--haze-100)",
      padding: "6px 12px",
      borderRadius: "var(--radius-pill)"
    }
  }, h)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      maxWidth: 760
    }
  }, /*#__PURE__*/React.createElement(Block, {
    title: "Relationship goal"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-body)/1.5 var(--font-sans)",
      color: "var(--text-strong)",
      margin: 0
    }
  }, s.goals)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Block, {
    title: "Hooks & interests"
  }, /*#__PURE__*/React.createElement(Chips, {
    items: s.hooks,
    color: "var(--blue-700)"
  })), /*#__PURE__*/React.createElement(Block, {
    title: "Likely objections"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, s.objections.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 9,
      font: "var(--fs-small)/1.45 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle-warning",
    size: 15,
    color: "var(--gold-600)",
    style: {
      marginTop: 2,
      flexShrink: 0
    }
  }), o))))), /*#__PURE__*/React.createElement(Block, {
    title: "Predisposition plan"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-body)/1.5 var(--font-sans)",
      color: "var(--text-strong)",
      margin: 0
    }
  }, s.predisposition)), /*#__PURE__*/React.createElement(Block, {
    title: "Presentation \u2014 what to lead with"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-body)/1.5 var(--font-sans)",
      color: "var(--text-strong)",
      margin: 0
    }
  }, s.presentation)), /*#__PURE__*/React.createElement(Block, {
    title: "Action plan / next steps"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, s.nextSteps.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 99,
      background: "var(--blue-50)",
      color: "var(--blue-700)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "var(--fw-bold) var(--fs-caption) var(--font-sans)",
      flex: "none"
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--text-body)"
    }
  }, n))))));
}

/* ============================ VISITS & ASKS ============================ */
function VisitsAsksTab({
  p,
  go
}) {
  const D = window.POC_DATA;
  const {
    Eyebrow,
    Icon
  } = window.POC;
  const {
    Card,
    Button,
    HorizonTag,
    Badge
  } = PD;
  const isHart = p.id === "p1";
  const H = D.hartwell;
  if (!isHart) {
    return /*#__PURE__*/React.createElement(Card, {
      pad: "lg"
    }, /*#__PURE__*/React.createElement(Eyebrow, null, "Visits & asks"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fs-body)/1.6 var(--font-sans)",
        color: "var(--text-secondary)",
        margin: "14px 0 18px",
        maxWidth: 520
      }
    }, "No visits logged yet for ", p.name, ". Plan the first conversation and the history \u2014 goals, debriefs, asks, and referrals \u2014 will build here."), /*#__PURE__*/React.createElement(Button, {
      variant: "go",
      onClick: () => go("visit"),
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "calendar-check",
        size: 16
      })
    }, "Plan a visit"));
  }
  const outcomeTone = {
    Commitment: "success",
    Roadmap: "info",
    Decline: "neutral"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22,
      maxWidth: 820
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Visits"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => go("visit"),
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-check",
      size: 14
    })
  }, "Plan a visit")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, H.visits.map((v, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    pad: "md",
    tone: v.status === "planned" ? "default" : "default"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 8
    }
  }, v.status === "planned" ? /*#__PURE__*/React.createElement(Badge, {
    tone: "attention",
    dot: true
  }, "Planned") : /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, v.when), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, v.goal)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)"
    }
  }, "Present: ", v.present, " \xB7 Priority: ", v.priority), v.debrief ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-body)",
      margin: "10px 0 0",
      padding: "10px 12px",
      background: "var(--haze-50)",
      borderRadius: "var(--radius-sm)"
    }
  }, v.debrief) : null, v.outcome ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: outcomeTone[v.outcome]
  }, v.outcome), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Next: ", v.next)) : null)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Asks"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 14
    })
  }, "Log an ask")), H.asks.map((a, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-2xl) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, a.amount), /*#__PURE__*/React.createElement(HorizonTag, {
    horizon: a.frame
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, a.outcome), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--text-caption)",
      color: "var(--sage-700)"
    }
  }, a.numbers)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 8
    }
  }, a.type, " \xB7 funds ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-body)"
    }
  }, a.initiative)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-body)",
      margin: "10px 0 0"
    }
  }, a.detail)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Referrals captured"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, H.referrals.map((r, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "git-branch",
    size: 16,
    color: "var(--sage-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "from ", r.from)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 10,
      font: "var(--text-caption)",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Use your name? ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--sage-700)"
    }
  }, r.useName)), /*#__PURE__*/React.createElement("span", null, r.willNote), /*#__PURE__*/React.createElement("span", null, r.rel)))))));
}

/* ============================ DETAIL SHELL ============================ */
function ProspectDetail({
  params,
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon
  } = window.POC;
  const {
    RoleChip,
    HorizonTag,
    Badge,
    Avatar
  } = PD;
  const p = D.prospects.find(x => x.id === (params && params.id)) || D.prospects[0];
  const [tab, setTab] = React.useState("overview");
  React.useEffect(() => {
    setTab("overview");
  }, [params && params.id]);
  const kindLabel = {
    person: "Individual",
    company: "Company",
    foundation: "Foundation"
  }[p.kind];
  const TABS = [["overview", "Overview"], ["kb", "Knowledge base"], ["strategy", "Strategy"], ["visits", "Visits & asks"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px 48px",
      display: "flex",
      flexDirection: "column",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("mpl"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      padding: 0,
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Back to the list"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 18,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.name,
    kind: p.kind === "person" ? "person" : "org",
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) var(--fs-3xl)/1.1 var(--font-sans)",
      color: "var(--text-strong)",
      letterSpacing: "var(--ls-snug)"
    }
  }, p.name), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, kindLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-micro) var(--font-mono)",
      color: "var(--text-muted)"
    }
  }, "#", p.rank, " on the list")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-body) var(--font-sans)",
      color: "var(--text-secondary)",
      marginTop: 5
    }
  }, p.subtitle), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
      flexWrap: "wrap"
    }
  }, p.manager ? /*#__PURE__*/React.createElement(RoleChip, {
    role: "manager",
    name: p.manager
  }) : null, p.partner ? /*#__PURE__*/React.createElement(RoleChip, {
    role: "partner",
    name: p.partner
  }) : null, /*#__PURE__*/React.createElement(HorizonTag, {
    horizon: p.horizon
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, TABS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    style: {
      padding: "11px 16px",
      border: "none",
      background: "none",
      cursor: "pointer",
      font: (tab === k ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
      color: tab === k ? "var(--text-strong)" : "var(--text-muted)",
      borderBottom: "2px solid " + (tab === k ? "var(--blue-600)" : "transparent"),
      marginBottom: -1
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    key: tab,
    className: "f95-rise"
  }, tab === "overview" ? /*#__PURE__*/React.createElement(OverviewTab, {
    p: p,
    go: go
  }) : tab === "kb" ? /*#__PURE__*/React.createElement(KBTab, {
    p: p
  }) : tab === "strategy" ? /*#__PURE__*/React.createElement(StrategyTab, {
    p: p
  }) : /*#__PURE__*/React.createElement(VisitsAsksTab, {
    p: p,
    go: go
  })));
}
window.POC = Object.assign(window.POC || {}, {
  ProspectDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/f95_prospect.jsx", error: String((e && e.message) || e) }); }

// poc/f95_prospects.jsx
try { (() => {
/* 95 Forward — Prospects. Two views under one tab:
   · Master Prospect List (the one ranked list — sacred ranking)
   · Candidates (connector-discovery batches, firmly OFF the ranked list) */

const PR = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* ============================ MASTER PROSPECT LIST ============================ */
function MasterList({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    ProspectRow,
    Tag,
    Button,
    Badge
  } = PR;
  const [horizon, setHorizon] = React.useState("all");
  const [rm, setRm] = React.useState("all");
  const [entity, setEntity] = React.useState("all");
  const [band, setBand] = React.useState("all");
  const [top33, setTop33] = React.useState(false);
  const top = D.prospects[0];
  let rows = D.prospects.filter(p => {
    if (horizon !== "all" && p.horizon !== horizon) return false;
    if (rm === "mine" && p.manager !== D.user.name) return false;
    if (entity !== "all" && p.kind !== entity) return false;
    if (band === "90" && p.qpi < 90) return false;
    if (band === "70" && (p.qpi < 70 || p.qpi >= 90)) return false;
    if (band === "50" && (p.qpi < 50 || p.qpi >= 70)) return false;
    if (band === "u50" && p.qpi >= 50) return false;
    if (top33 && p.rank > 6) return false;
    return true;
  });
  const HPILL = [["all", "All", null], ["today", "Today", "var(--horizon-today)"], ["tomorrow", "Tomorrow", "var(--horizon-tomorrow)"], ["forever", "Forever", "var(--horizon-forever)"]];
  const Select = ({
    value,
    onChange,
    options,
    label
  }) => /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      height: 30,
      padding: "0 11px",
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)",
      color: "var(--text-body)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: e => onChange(e.target.value),
    style: {
      border: "none",
      background: "transparent",
      outline: "none",
      font: "inherit",
      color: "var(--text-strong)",
      cursor: "pointer"
    }
  }, options.map(([v, l]) => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v
  }, l))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "18px 24px",
      borderRadius: "var(--radius-lg)",
      background: "linear-gradient(180deg, var(--gold-50), var(--white))",
      border: "1px solid var(--gold-300)",
      boxShadow: "var(--ring-go)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 2,
      color: "var(--gold-700)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)",
      letterSpacing: "var(--ls-tight)"
    }
  }, top.qpi), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--gold-600)"
    }
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--gold-700)"
  }, "Your next right move"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)",
      color: "var(--text-strong)",
      marginTop: 5
    }
  }, top.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 99,
      background: "var(--gold-600)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)"
    }
  }, "QPI 90+ \u2014 go see them today. Follow up in 18h."))), /*#__PURE__*/React.createElement(Button, {
    variant: "go",
    onClick: () => go("prospect", {
      id: top.id
    }),
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-check",
      size: 16
    })
  }, "Plan the visit")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, HPILL.map(([id, l, c]) => /*#__PURE__*/React.createElement(Tag, {
    key: id,
    color: c,
    selected: horizon === id,
    onClick: () => setHorizon(id)
  }, l)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, rows.length, " on the list \xB7 ranked by QPI")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      marginTop: -8
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "RM",
    value: rm,
    onChange: setRm,
    options: [["all", "Anyone"], ["mine", "Mine"], ["Dana Reese", "Dana Reese"], ["Priya Nair", "Priya Nair"]]
  }), /*#__PURE__*/React.createElement(Select, {
    label: "QPI",
    value: band,
    onChange: setBand,
    options: [["all", "All bands"], ["90", "90+ · Go today"], ["70", "70–89"], ["50", "50–69"], ["u50", "Under 50"]]
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Type",
    value: entity,
    onChange: setEntity,
    options: [["all", "All types"], ["person", "Individual"], ["company", "Company"], ["foundation", "Foundation"]]
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTop33(t => !t),
    style: {
      height: 30,
      padding: "0 12px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      border: "1px solid " + (top33 ? "var(--blue-300)" : "var(--border-default)"),
      background: top33 ? "var(--blue-50)" : "var(--surface-card)",
      color: top33 ? "var(--blue-700)" : "var(--text-body)",
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 13,
    color: top33 ? "var(--blue-600)" : "var(--ink-400)"
  }), " Top 33"), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 30,
      padding: "0 12px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      color: "var(--text-body)",
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sliders-horizontal",
    size: 13,
    color: "var(--ink-400)"
  }), " More filters")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, rows.map(p => /*#__PURE__*/React.createElement(ProspectRow, {
    key: p.id,
    rank: p.rank,
    name: p.name,
    kind: p.kind,
    subtitle: p.subtitle,
    qpi: p.qpi,
    horizon: p.horizon,
    manager: p.manager,
    partner: p.partner,
    cadence: p.cadence,
    dueSoon: p.dueSoon,
    onClick: () => go("prospect", {
      id: p.id
    })
  })), rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center",
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "No prospects match these filters.") : null));
}

/* ============================ CANDIDATES ============================ */
function ConfidencePip({
  level
}) {
  const map = {
    high: ["var(--sage-600)", 3, "High"],
    medium: ["var(--gold-600)", 2, "Medium"],
    low: ["var(--ink-400)", 1, "Low"]
  };
  const [color, n, label] = map[level] || map.low;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: 2
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: i < n ? color : "var(--haze-200)"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color
    }
  }, label, " confidence"));
}
function CandidateCard({
  c
}) {
  const {
    Icon
  } = window.POC;
  const {
    Button,
    SourceTag
  } = PR;
  const [status, setStatus] = React.useState(c.status);
  const Evidence = ({
    label,
    value
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), value ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-micro)/1.4 var(--font-mono)",
      color: "var(--ai-ink)",
      background: "var(--ai-tint)",
      padding: "4px 8px",
      borderRadius: "var(--radius-xs)",
      width: "fit-content"
    }
  }, value) : /*#__PURE__*/React.createElement(SourceTag, null));
  if (status === "endorsed") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 18px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--sage-300)",
        background: "var(--sage-50)",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check-circle-2",
      size: 18,
      color: "var(--sage-600)"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
        color: "var(--sage-700)"
      }
    }, c.name, " \u2014 endorsed for intro"), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-secondary)",
        marginTop: 2
      }
    }, "Intro requested. On a successful intro, promotes to the MPL with Sandra Kim as Natural Partner.")), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      onClick: () => setStatus(c.status)
    }, "Undo"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18,
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-hairline)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 99,
      background: "var(--haze-200)",
      color: "var(--ink-600)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      flex: "none"
    }
  }, c.name.split(" ").map(w => w[0]).slice(0, 2).join("")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement(ConfidencePip, {
    level: c.confidence
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) 10px var(--font-sans)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      border: "1px dashed var(--border-default)",
      padding: "3px 8px",
      borderRadius: 99
    }
  }, "Hypothesis")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Evidence, {
    label: "Evidence \u2014 connection",
    value: c.connection
  }), /*#__PURE__*/React.createElement(Evidence, {
    label: "Evidence \u2014 affinity",
    value: c.affinity
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      paddingTop: 14,
      borderTop: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: () => setStatus("endorsed"),
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    })
  }, "Endorse for intro"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Keep researching"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    style: {
      marginLeft: "auto"
    }
  }, "Dismiss")));
}
function DiscoveryBatch({
  batch,
  defaultOpen
}) {
  const D = window.POC_DATA;
  const {
    Icon
  } = window.POC;
  const [open, setOpen] = React.useState(!!defaultOpen);
  const researching = batch.status === "researching";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-lg)",
      border: "1px solid " + (researching ? "var(--ai-border)" : "var(--border-hairline)"),
      background: researching ? "var(--ai-surface)" : "var(--surface-card)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => !researching && setOpen(o => !o),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      width: "100%",
      textAlign: "left",
      padding: "16px 20px",
      border: "none",
      background: "transparent",
      cursor: researching ? "default" : "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 99,
      background: researching ? "var(--ai-tint)" : "var(--haze-100)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: researching ? "loader" : "users-round",
    size: 18,
    color: researching ? "var(--ai-ink)" : "var(--ink-500)",
    style: researching ? {
      animation: "f95-heartbeat 1.6s var(--ease-in-out) infinite"
    } : null
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "Introductions via ", batch.connector), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 3
    }
  }, "for the ", batch.initiative.split(" — ")[0], " \xB7 ", researching ? "requested " + batch.requested : batch.count + " candidates")), researching ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color: "var(--ai-ink)",
      background: "var(--ai-tint)",
      padding: "5px 11px",
      borderRadius: 99
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: "var(--ai-ink)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
    }
  }), " Researching\u2026") : /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color: "var(--sage-700)",
      background: "var(--sage-100)",
      padding: "5px 11px",
      borderRadius: 99
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13,
    color: "var(--sage-600)"
  }), " Ready"), !researching ? /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 18,
    color: "var(--ink-400)",
    style: {
      transition: "transform var(--dur-base)",
      transform: open ? "none" : "rotate(-90deg)"
    }
  }) : null), researching ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px 18px 72px",
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, "The copilot is searching public sources for people ", batch.connector, " could plausibly introduce, matched to this initiative. This runs for a few minutes \u2014 you'll get a \"ready to review\" note on Today when the batch lands.") : open ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-caption)/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      padding: "0 0 4px"
    }
  }, "Showing 3 of ", batch.count, ". Each is a hypothesis for ", batch.connector, " to react to \u2014 not a verified prospect. They stay off the ranked list until a human and the connector validate them."), batch.candidates.map((c, i) => /*#__PURE__*/React.createElement(CandidateCard, {
    key: i,
    c: c
  }))) : null);
}
function Candidates({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Button
  } = PR;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      maxWidth: 980
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      padding: "16px 20px",
      borderRadius: "var(--radius-lg)",
      background: "var(--haze-100)",
      border: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "git-branch",
    size: 18,
    color: "var(--ink-500)",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "The front of the referral funnel"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--text-secondary)",
      margin: "4px 0 0",
      maxWidth: 620
    }
  }, "Pick a connector and an initiative; the copilot researches who they could plausibly introduce. Candidates live here \u2014 never on the Master Prospect List \u2014 until validated. \"No public connection found\" is a fine, honest answer.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    })
  }, "New introduction search")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Discovery batches \xB7 by connector \xD7 initiative"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "2 tasks")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, D.discovery.map((b, i) => /*#__PURE__*/React.createElement(DiscoveryBatch, {
    key: b.id,
    batch: b,
    defaultOpen: i === 0
  }))));
}

/* ============================ WRAPPER ============================ */
function Prospects({
  route,
  go
}) {
  const {
    Icon
  } = window.POC;
  const view = route === "candidates" ? "candidates" : "mpl";
  const Toggle = () => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      padding: "0 32px",
      borderBottom: "1px solid var(--border-hairline)",
      background: "var(--surface-card)"
    }
  }, [["mpl", "Master Prospect List", "list-ordered"], ["candidates", "Candidates", "git-branch"]].map(([k, l, ic]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => go(k),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "13px 14px",
      border: "none",
      background: "none",
      cursor: "pointer",
      font: (view === k ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
      color: view === k ? "var(--text-strong)" : "var(--text-muted)",
      borderBottom: "2px solid " + (view === k ? "var(--blue-600)" : "transparent"),
      marginBottom: -1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15,
    color: view === k ? "var(--blue-600)" : "var(--ink-400)"
  }), l, k === "candidates" ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "10px var(--font-sans)",
      background: "var(--ai-tint)",
      color: "var(--ai-ink)",
      padding: "1px 6px",
      borderRadius: 99
    }
  }, "2") : null)));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Toggle, null), view === "candidates" ? /*#__PURE__*/React.createElement(Candidates, {
    go: go
  }) : /*#__PURE__*/React.createElement(MasterList, {
    go: go
  }));
}
window.POC = Object.assign(window.POC || {}, {
  Prospects
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/f95_prospects.jsx", error: String((e && e.message) || e) }); }

// poc/f95_today.jsx
try { (() => {
/* 95 Forward — Today. The daily focus screen: where attention goes today.
   Action over archive. Warm register. */

const TD = window.Ds95ForwardDesignSystem_31a0c4 || {};
function Today({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Card,
    Button,
    HorizonTag
  } = TD;
  const t = D.today;
  const [scope, setScope] = React.useState("me");
  const byId = id => D.prospects.find(p => p.id === id);
  const Section = ({
    icon,
    title,
    count,
    accent,
    children
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17,
    color: accent || "var(--ink-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-secondary)"
    }
  }, title), count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "\xB7 ", count) : null), children);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 30,
      maxWidth: 1080
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: -6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      padding: 3,
      background: "var(--haze-100)",
      borderRadius: "var(--radius-md)"
    }
  }, [["me", "Me"], ["team", "Team"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setScope(k),
    style: {
      padding: "6px 16px",
      borderRadius: "var(--radius-sm)",
      border: "none",
      cursor: "pointer",
      background: scope === k ? "var(--surface-card)" : "transparent",
      boxShadow: scope === k ? "var(--shadow-sm)" : "none",
      color: scope === k ? "var(--text-strong)" : "var(--text-muted)",
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)"
    }
  }, l))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Tuesday, June 18 \xB7 ", scope === "me" ? "Your day" : "The team's day")), /*#__PURE__*/React.createElement(Section, {
    icon: "compass",
    title: "Your next right moves",
    accent: "var(--gold-600)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: 14
    }
  }, t.nextMoves.map((m, i) => {
    const p = byId(m.id);
    const go90 = p.qpi >= 90;
    return /*#__PURE__*/React.createElement(Card, {
      key: i,
      tone: go90 ? "go" : "default",
      pad: "md",
      interactive: true,
      onClick: () => go("prospect", {
        id: p.id
      })
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        color: go90 ? "var(--gold-600)" : p.qpi >= 70 ? "var(--blue-600)" : "var(--sage-600)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ks-num",
      style: {
        font: "var(--fw-heavy) var(--fs-3xl)/1 var(--font-sans)",
        letterSpacing: "-0.02em"
      }
    }, p.qpi)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-semibold) var(--fs-body)/1.2 var(--font-sans)",
        color: "var(--text-strong)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, p.subtitle)), /*#__PURE__*/React.createElement(HorizonTag, {
      horizon: p.horizon
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fs-small)/1.5 var(--font-sans)",
        color: "var(--text-body)",
        margin: "0 0 14px"
      }
    }, m.move), /*#__PURE__*/React.createElement(Button, {
      variant: go90 ? "go" : "secondary",
      size: "sm",
      onClick: e => {
        e.stopPropagation();
        go(m.primary ? "visit" : "prospect", {
          id: p.id
        });
      },
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: m.action === "Plan the visit" ? "calendar-check" : "message-square",
        size: 15
      })
    }, m.action));
  }))), /*#__PURE__*/React.createElement(Section, {
    icon: "clock",
    title: "Follow-ups due",
    count: t.followups.length,
    accent: "var(--gold-600)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, t.followups.map((f, i) => {
    const p = byId(f.id);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => go("prospect", {
        id: p.id
      }),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 18px",
        cursor: "pointer",
        background: "var(--surface-card)",
        border: "1px solid " + (f.overdue ? "var(--gold-300)" : "var(--border-hairline)"),
        borderRadius: "var(--radius-md)",
        transition: "box-shadow var(--dur-base) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        borderRadius: 99,
        background: f.overdue ? "var(--gold-600)" : "var(--gold-600)",
        animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite",
        flex: "none"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-secondary)",
        marginTop: 2
      }
    }, f.text)), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)",
        color: f.overdue ? "var(--gold-700)" : "var(--text-secondary)"
      }
    }, f.left), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 14
      })
    }, "Open the draft"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement(Section, {
    icon: "map-pin",
    title: "Today's visits",
    accent: "var(--blue-600)"
  }, t.visits.map((v, i) => {
    const p = byId(v.id);
    return /*#__PURE__*/React.createElement(Card, {
      key: i,
      pad: "md"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ks-num",
      style: {
        font: "var(--fw-bold) var(--fs-lg) var(--font-sans)",
        color: "var(--blue-700)"
      }
    }, v.time), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, v.who), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-secondary)",
        marginTop: 2
      }
    }, "Lead with: ", v.priority))), /*#__PURE__*/React.createElement(Button, {
      variant: "go",
      size: "sm",
      block: true,
      onClick: () => go("visit"),
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "radio",
        size: 15
      })
    }, "Enter visit mode"));
  })), /*#__PURE__*/React.createElement(Section, {
    icon: "cpu",
    title: "From your copilot",
    accent: "var(--ai-ink)"
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "ai",
    accent: true,
    pad: "md",
    interactive: true,
    onClick: () => go("prospect", {
      id: "p1"
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 13,
      height: 13,
      borderRadius: 3,
      background: "var(--ai-ink)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--ai-ink)"
    }
  }, t.copilotCount, " suggestions to review")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-small)/1.5 var(--font-sans)",
      color: "var(--iris-700)",
      margin: 0
    }
  }, "Capacity bumps, two new Natural Partners, and a fresh discovery batch \u2014 across your portfolio. Each proposes; you decide."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--ai-ink)",
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, "Review them ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14,
    color: "var(--ai-ink)"
  }))))), /*#__PURE__*/React.createElement("div", {
    onClick: () => go("mpl"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "13px 18px",
      cursor: "pointer",
      background: "var(--haze-100)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users-round",
    size: 16,
    color: "var(--ink-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--text-body)"
    }
  }, t.coverage.text, " \u2014 worth a look."), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--blue-600)",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, "See them ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14,
    color: "var(--blue-600)"
  }))));
}
window.POC = Object.assign(window.POC || {}, {
  Today
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/f95_today.jsx", error: String((e && e.message) || e) }); }

// poc/f95_visit.jsx
try { (() => {
/* 95 Forward — Visit mode (Register B). Full-screen, calm, large type, low
   chrome. Three phases: Before · During · After (debrief). The ask is serif. */

const VM = window.Ds95ForwardDesignSystem_31a0c4 || {};
const DISCOVERY = ["What first drew you to this work?", "What would you most want to see change for kids in this city in five years?", "When you picture the new youth center full of children, what does that mean to you?", "What would make a gift like this feel right for your family's foundation?"];
function VisitTop({
  phase,
  onExit
}) {
  const {
    Icon
  } = window.POC;
  const labels = {
    before: "Before — prepare",
    during: "During — at their side",
    after: "After — debrief"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "16px 24px",
      borderBottom: "1px solid var(--border-hairline)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onExit,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }), " Exit"), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: "var(--gold-600)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
    }
  }), "With the Hartwell Family Foundation"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, labels[phase], " \xB7 Tom Bradley made the intro")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44
    }
  }));
}
function VisitMode({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    Eyebrow
  } = window.POC;
  const {
    Button,
    Badge,
    HorizonTag
  } = VM;
  const [phase, setPhase] = React.useState("before");
  const [qi, setQi] = React.useState(0);
  const [showAsk, setShowAsk] = React.useState(false);
  const [outcome, setOutcome] = React.useState(null);
  const shell = {
    position: "absolute",
    inset: 0,
    background: "var(--haze-50)",
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
    overflow: "hidden"
  };

  /* ---------------- BEFORE ---------------- */
  if (phase === "before") {
    const facts = [["Estimated capacity", "$250,000"], ["Last gift", "$60,000 · Mar 2024"], ["Giving focus", "Youth & education"], ["Window", "Committee meets Q3"]];
    return /*#__PURE__*/React.createElement("div", {
      style: shell
    }, /*#__PURE__*/React.createElement(VisitTop, {
      phase: "before",
      onExit: () => go("prospect", {
        id: "p1"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 32px 56px",
        display: "flex",
        flexDirection: "column",
        gap: 32
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
      color: "var(--gold-700)"
    }, "The goal of this visit"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fw-regular) var(--fs-2xl)/1.3 var(--font-serif)",
        color: "var(--text-strong)",
        margin: "12px 0 0",
        letterSpacing: "var(--ls-snug)"
      }
    }, "Secure the naming-gift conversation \u2014 and a date for Eleanor to see the program herself.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 20px",
        borderRadius: "var(--radius-lg)",
        background: "var(--blue-50)",
        border: "1px solid var(--blue-100)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "flag",
      size: 18,
      color: "var(--blue-600)"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
        color: "var(--blue-700)"
      }
    }, "Lead with"), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fs-body) var(--font-sans)",
        color: "var(--text-strong)",
        marginTop: 2
      }
    }, "The youth-center capital priority and the naming opportunity."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Discovery & power questions"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 14
      }
    }, DISCOVERY.map((q, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 12,
        padding: "14px 18px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-bold) var(--fs-small) var(--font-mono)",
        color: "var(--text-muted)",
        flex: "none"
      }
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fs-body)/1.4 var(--font-sans)",
        color: "var(--text-body)"
      }
    }, q))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 20,
        borderRadius: "var(--radius-lg)",
        background: "var(--gold-50)",
        border: "1px solid var(--gold-300)"
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      color: "var(--gold-700)"
    }, "The planned ask"), /*#__PURE__*/React.createElement("div", {
      className: "ks-num",
      style: {
        font: "var(--fw-heavy) var(--fs-3xl) var(--font-sans)",
        color: "var(--gold-700)",
        margin: "10px 0 8px"
      }
    }, "$250,000"), /*#__PURE__*/React.createElement(HorizonTag, {
      horizon: "tomorrow"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-secondary)",
        marginTop: 10
      }
    }, "Names the new youth wing \xB7 funds the capital campaign.")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 20,
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)"
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, null, "Who opens the door"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        margin: "12px 0 10px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 99,
        border: "1.5px dashed var(--sage-600)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "door-open",
      size: 15,
      color: "var(--sage-600)"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, "Tom Bradley")), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--text-caption)",
        color: "var(--text-secondary)"
      }
    }, "Board member on the giving committee \u2014 made the warm intro."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "What we know"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px 24px",
        marginTop: 12
      }
    }, facts.map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: "1px solid var(--border-hairline)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fs-small) var(--font-sans)",
        color: "var(--text-secondary)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
        color: "var(--text-strong)"
      }
    }, v))))))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "none",
        padding: "18px 32px",
        borderTop: "1px solid var(--border-hairline)",
        display: "flex",
        justifyContent: "center",
        background: "var(--surface-card)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 720
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "go",
      size: "lg",
      block: true,
      onClick: () => {
        setPhase("during");
        setQi(0);
      },
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 18
      })
    }, "Start the visit"))));
  }

  /* ---------------- DURING ---------------- */
  if (phase === "during") {
    return /*#__PURE__*/React.createElement("div", {
      style: shell
    }, /*#__PURE__*/React.createElement(VisitTop, {
      phase: "during",
      onExit: () => go("prospect", {
        id: "p1"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        gap: 8,
        padding: "20px"
      }
    }, DISCOVERY.map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: i === qi ? 30 : 8,
        height: 8,
        borderRadius: 99,
        background: i <= qi ? "var(--blue-600)" : "var(--ink-200)",
        transition: "all var(--dur-base) var(--ease-out)"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 32px",
        textAlign: "center",
        maxWidth: 760,
        margin: "0 auto"
      }
    }, showAsk ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Eyebrow, {
      color: "var(--gold-700)"
    }, "The ask \u2014 clear and dignified"), /*#__PURE__*/React.createElement("p", {
      key: "ask",
      className: "f95-rise",
      style: {
        font: "var(--fw-regular) var(--fs-4xl)/1.25 var(--font-serif)",
        color: "var(--text-strong)",
        letterSpacing: "var(--ls-snug)",
        margin: "22px 0 0",
        textWrap: "balance"
      }
    }, "\u201CWould you consider a gift of $250,000 to name the new youth wing?\u201D"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fs-lg)/1.5 var(--font-sans)",
        color: "var(--text-muted)",
        marginTop: 20
      }
    }, "Say the number. Then stop talking, and listen."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "ai"
    }, "Copilot drafted this from their $250K capacity"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Eyebrow, {
      color: "var(--blue-600)"
    }, "Question ", qi + 1, " of ", DISCOVERY.length), /*#__PURE__*/React.createElement("p", {
      key: qi,
      className: "f95-rise",
      style: {
        font: "var(--fw-regular) var(--fs-3xl)/1.3 var(--font-serif)",
        color: "var(--text-strong)",
        letterSpacing: "var(--ls-snug)",
        margin: "22px 0 0",
        textWrap: "balance"
      }
    }, DISCOVERY[qi]), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--fs-lg)/1.5 var(--font-sans)",
        color: "var(--text-muted)",
        marginTop: 20
      }
    }, "A question, then space. Resist filling the silence."))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        justifyContent: "center",
        padding: "12px 32px"
      }
    }, [["Note", "pencil"], ["Capture a referral", "git-branch"], ["Log an objection", "message-circle-warning"]].map(([l, ic]) => /*#__PURE__*/React.createElement("button", {
      key: l,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 15px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border-default)",
        background: "var(--surface-card)",
        cursor: "pointer",
        font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
        color: "var(--text-body)",
        minHeight: 44
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 15,
      color: "var(--ink-500)"
    }), l))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "none",
        padding: "16px 32px 28px",
        borderTop: "1px solid var(--border-hairline)",
        display: "flex",
        gap: 12,
        justifyContent: "center",
        background: "var(--surface-card)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        width: "100%",
        maxWidth: 720
      }
    }, showAsk ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "lg",
      onClick: () => setShowAsk(false)
    }, "Back"), /*#__PURE__*/React.createElement(Button, {
      variant: "go",
      size: "lg",
      block: true,
      onClick: () => setPhase("after"),
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 18
      })
    }, "Capture the outcome")) : qi < DISCOVERY.length - 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, qi > 0 ? /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "lg",
      onClick: () => setQi(qi - 1)
    }, "Back") : null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      onClick: () => setQi(qi + 1),
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 18
      })
    }, "Next question")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "lg",
      onClick: () => setQi(qi - 1)
    }, "Back"), /*#__PURE__*/React.createElement(Button, {
      variant: "go",
      size: "lg",
      block: true,
      onClick: () => setShowAsk(true),
      iconLeft: /*#__PURE__*/React.createElement(Icon, {
        name: "hand-coins",
        size: 18
      })
    }, "Make the ask")))));
  }

  /* ---------------- AFTER (debrief) ---------------- */
  const OUTCOMES = [["Commitment", "check-circle-2", "var(--sage-600)"], ["Roadmap", "route", "var(--blue-600)"], ["Decline", "circle-slash", "var(--ink-400)"]];
  return /*#__PURE__*/React.createElement("div", {
    style: shell
  }, /*#__PURE__*/React.createElement(VisitTop, {
    phase: "after",
    onExit: () => go("prospect", {
      id: "p1"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 680,
      margin: "0 auto",
      padding: "36px 32px 56px",
      display: "flex",
      flexDirection: "column",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "The outcome"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 14
    }
  }, OUTCOMES.map(([l, ic, c]) => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => setOutcome(l),
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 9,
      padding: "20px 12px",
      cursor: "pointer",
      borderRadius: "var(--radius-lg)",
      background: outcome === l ? "var(--surface-card)" : "var(--surface-card)",
      border: "2px solid " + (outcome === l ? c : "var(--border-hairline)"),
      boxShadow: outcome === l ? "var(--shadow-md)" : "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 24,
    color: c
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: outcome === l ? "var(--text-strong)" : "var(--text-secondary)"
    }
  }, l)))), outcome === "Roadmap" ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: 10,
      textAlign: "center"
    }
  }, "A clear next step is a win \u2014 not a no.") : null), outcome ? /*#__PURE__*/React.createElement("div", {
    className: "f95-rise",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Numbers on the table"), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-2xl) var(--font-sans)",
      color: "var(--text-strong)",
      marginTop: 10
    }
  }, "$250,000"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 4
    }
  }, "Named, not yet committed.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "The next step"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-body)/1.4 var(--font-sans)",
      color: "var(--text-strong)",
      marginTop: 10
    }
  }, "Site visit with Eleanor before the Q3 committee."))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--ai-border)",
      borderLeft: "3px solid var(--ai-ink)",
      background: "var(--ai-surface)",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 13,
      height: 13,
      borderRadius: 3,
      background: "var(--ai-ink)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--ai-ink)"
    }
  }, "Copilot drafted your 24-hour follow-up")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-body)/1.6 var(--font-serif)",
      color: "var(--iris-700)",
      margin: 0
    }
  }, "\u201CEleanor \u2014 thank you for the time today. I'll send the program outcomes you asked about and propose two dates for a site visit before your committee meets. It was a real pleasure.\u201D"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14
    })
  }, "Approve & schedule"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Edit"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "13px 18px",
      borderRadius: "var(--radius-pill)",
      background: "var(--gold-50)",
      border: "1px solid var(--gold-300)",
      alignSelf: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: 99,
      background: "var(--gold-600)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--gold-700)"
    }
  }, "The 24-hour clock starts now \u2014 follow up by tomorrow"))) : null)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      padding: "16px 32px",
      borderTop: "1px solid var(--border-hairline)",
      display: "flex",
      justifyContent: "center",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 680
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "go",
    size: "lg",
    block: true,
    disabled: !outcome,
    onClick: () => go("today"),
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    })
  }, "Finish \u2014 back to Today"))));
}
window.POC = Object.assign(window.POC || {}, {
  VisitMode
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/f95_visit.jsx", error: String((e && e.message) || e) }); }

// poc/host_core.jsx
try { (() => {
/* Host CRM — the "grey room". Home · Constituents (list + record) · Revenue ·
   Major Giving (the deliberate black-box foil). Calm, dense, minimal color. */

const HC = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* Generic, deliberately-opaque host "AI" mark — NOT iris (that's reserved for
   the 95 Forward copilot). A flat grey number with no story. */
function BlackBoxBadge({
  small
}) {
  const {
    Icon
  } = window.POC;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: small ? "1px 7px" : "3px 9px",
      borderRadius: "var(--radius-pill)",
      background: "#E4E8EB",
      color: "#6B7882",
      font: "var(--fw-semibold) " + (small ? "9px" : "10px") + " var(--font-sans)",
      letterSpacing: "0.06em",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cpu",
    size: small ? 10 : 12,
    color: "#8895A0"
  }), " AI");
}

/* -------------------------------------------------- HOME */
function HostHome({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    HostCard,
    Eyebrow
  } = window.POC;
  const h = D.home;
  const maxBar = 100;
  const Tile = ({
    children,
    style
  }) => /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 18,
      ...style
    }
  }, children);
  const TileHead = ({
    children,
    action
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--host-muted, #71808B)",
      whiteSpace: "nowrap"
    }
  }, children), action);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "grid",
      gridTemplateColumns: "repeat(12, 1fr)",
      gap: 18,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Tile, {
    style: {
      gridColumn: "span 5"
    }
  }, /*#__PURE__*/React.createElement(TileHead, null, "Recent gifts"), /*#__PURE__*/React.createElement("table", {
    className: "ks-table",
    style: {
      "--host-rule": "#E7ECEF"
    }
  }, /*#__PURE__*/React.createElement("tbody", null, h.recentGifts.map((g, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "9px 4px"
    }
  }, g.name), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "9px 4px",
      color: "var(--host-muted, #71808B)"
    }
  }, g.type), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      padding: "9px 4px",
      textAlign: "right",
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, g.amount), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      padding: "9px 4px",
      textAlign: "right",
      color: "var(--host-muted, #8896A0)",
      width: 56
    }
  }, g.date)))))), /*#__PURE__*/React.createElement(Tile, {
    style: {
      gridColumn: "span 4"
    }
  }, /*#__PURE__*/React.createElement(TileHead, null, "Year-over-year fundraising"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 16,
      height: 132,
      padding: "0 4px"
    }
  }, h.yoy.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 4,
      height: 110,
      width: "100%",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: q.a / maxBar * 100 + "%",
      background: "#B9C4CC",
      borderRadius: "3px 3px 0 0"
    }
  }), q.b ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: q.b / maxBar * 100 + "%",
      background: "#4A5965",
      borderRadius: "3px 3px 0 0"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: 4,
      background: "#E2E8EC",
      borderRadius: 2
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "10px var(--font-sans)",
      color: "var(--host-muted, #8896A0)"
    }
  }, q.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 12,
      font: "10px var(--font-sans)",
      color: "var(--host-muted, #8896A0)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      background: "#B9C4CC",
      borderRadius: 2
    }
  }), " Last year"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      background: "#4A5965",
      borderRadius: 2
    }
  }), " This year"))), /*#__PURE__*/React.createElement(Tile, {
    style: {
      gridColumn: "span 3"
    }
  }, /*#__PURE__*/React.createElement(TileHead, null, "Active donor growth"), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) 40px/1 var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)",
      letterSpacing: "-0.02em"
    }
  }, h.growth.value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      marginTop: 10,
      color: "var(--sage-600)",
      font: "var(--fw-semibold) var(--fs-caption) var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trending-up",
    size: 14,
    color: "var(--sage-600)"
  }), " ", h.growth.delta), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      marginTop: 6
    }
  }, h.growth.note)), /*#__PURE__*/React.createElement(Tile, {
    style: {
      gridColumn: "span 5"
    }
  }, /*#__PURE__*/React.createElement(TileHead, {
    action: /*#__PURE__*/React.createElement(BlackBoxBadge, {
      small: true
    })
  }, "Major gift likelihood"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) 40px/1 var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)",
      letterSpacing: "-0.02em"
    }
  }, "12"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-small)/1.45 var(--font-sans)",
      color: "var(--host-muted, #71808B)"
    }
  }, "donors trending toward a major gift")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 12,
      borderTop: "1px solid #E7ECEF",
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12,
    color: "#A4AFB7"
  }), " Model output \xB7 no breakdown available")), /*#__PURE__*/React.createElement(Tile, {
    style: {
      gridColumn: "span 4"
    }
  }, /*#__PURE__*/React.createElement(TileHead, {
    action: /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fs-caption) var(--font-sans)",
        color: "var(--host-muted, #8896A0)"
      }
    }, h.tasks.length, " due")
  }, "Tasks & actions"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 11
    }
  }, h.tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 4,
      border: "1.5px solid #B9C4CC",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--ink-700)"
    }
  }, t.what), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "10px var(--font-sans)",
      color: t.due === "Today" ? "var(--gold-700)" : "var(--host-muted, #8896A0)",
      fontWeight: t.due === "Today" ? 600 : 400
    }
  }, t.due))))), /*#__PURE__*/React.createElement(Tile, {
    style: {
      gridColumn: "span 3",
      background: "linear-gradient(160deg, var(--blue-50), var(--white))",
      border: "1px solid var(--blue-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/mark.svg",
    width: "26",
    height: "26",
    alt: "",
    style: {
      borderRadius: 6
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-bold) var(--fs-small) var(--font-sans)",
      color: "var(--blue-700)"
    }
  }, "95 Forward")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body)/1.35 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "Your major-gifts workspace"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-caption)/1.45 var(--font-sans)",
      color: "var(--text-secondary)",
      marginTop: 6,
      marginBottom: 14
    }
  }, "The whole picture \u2014 and the next right move."), HC.Button ? /*#__PURE__*/React.createElement(HC.Button, {
    variant: "primary",
    size: "sm",
    block: true,
    onClick: () => go("today"),
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 15
    })
  }, "Open") : null));
}

/* -------------------------------------------------- CONSTITUENTS LIST */
function HostConstituents({
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    HostBtn
  } = window.POC;
  const [f, setF] = React.useState("all");
  const FILTERS = [["all", "All"], ["Prospect", "Prospects"], ["Active", "Active"], ["Lapsed", "Lapsed"]];
  const rows = D.constituents.filter(c => f === "all" || c.status === f);
  const StatusPill = ({
    s
  }) => {
    const map = {
      Prospect: ["#E7EEF4", "#2C5B7E"],
      Active: ["#E6EFEA", "#3B7458"],
      Lapsed: ["#EFE9E6", "#A8765A"]
    };
    const [bg, col] = map[s] || ["#E7ECEF", "#71808B"];
    return /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-semibold) 10px var(--font-sans)",
        padding: "2px 8px",
        borderRadius: 99,
        background: bg,
        color: col
      }
    }, s);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, FILTERS.map(([id, l]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setF(id),
    style: {
      height: 32,
      padding: "0 13px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      border: "1px solid " + (f === id ? "#9FB0BC" : "var(--host-rule, #D5DCE1)"),
      background: f === id ? "#4A5965" : "var(--surface-card)",
      color: f === id ? "#fff" : "var(--ink-700)",
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)"
    }
  }, l))), /*#__PURE__*/React.createElement(HostBtn, {
    icon: "sliders-horizontal",
    style: {
      height: 32
    }
  }, "Filters"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #8896A0)"
    }
  }, rows.length, " constituents \xB7 AND logic")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--host-rule, #D5DCE1)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Name"), /*#__PURE__*/React.createElement("th", null, "Type"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Lifetime"), /*#__PURE__*/React.createElement("th", null, "Last gift"), /*#__PURE__*/React.createElement("th", null, "Last contact"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Assigned"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, rows.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.id,
    className: "is-click",
    onClick: () => go("constituent", {
      id: c.id
    })
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, c.name), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, c.type), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, c.lifetime), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, c.lastGift), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #8896A0)"
    }
  }, c.lastContact), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StatusPill, {
    s: c.status
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, c.owner), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: "right",
      width: 30
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 15,
    color: "#A4AFB7"
  }))))))));
}

/* -------------------------------------------------- CONSTITUENT RECORD */
function HostConstituent({
  params,
  go
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    HostCard,
    HostBtn
  } = window.POC;
  const c = D.constituents.find(x => x.id === (params && params.id)) || D.constituents[0];
  const [tab, setTab] = React.useState("Profile");
  const TABS = ["Profile", "Giving history", "Relationships", "Actions", "Tags", "Volunteer"];
  const initials = c.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("constituents"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--host-muted, #71808B)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      padding: 0,
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Constituents"), /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 22,
      display: "flex",
      alignItems: "flex-start",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 56,
      height: 56,
      borderRadius: c.type === "Individual" ? "50%" : 10,
      background: "#4A5965",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "var(--fw-semibold) var(--fs-lg) var(--font-sans)",
      flex: "none"
    }
  }, initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-bold) var(--fs-2xl)/1.1 var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #71808B)",
      padding: "2px 9px",
      borderRadius: 99,
      background: "var(--host-fill, #EDF1F3)"
    }
  }, c.type), c.status === "Prospect" ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      padding: "2px 8px",
      borderRadius: 99,
      background: "#E7EEF4",
      color: "#2C5B7E"
    }
  }, "Prospect") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 28,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--host-muted, #8896A0)"
    }
  }, "Lifetime giving"), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-xl) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)",
      marginTop: 4
    }
  }, c.lifetime)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--host-muted, #8896A0)"
    }
  }, "Last gift"), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--ink-700)",
      marginTop: 6
    }
  }, c.lastGift)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--host-muted, #8896A0)"
    }
  }, "Region"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--ink-700)",
      marginTop: 6
    }
  }, c.region)))), c.prospect ? /*#__PURE__*/React.createElement("button", {
    onClick: () => go("prospect", {
      id: c.prospectId
    }),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      height: 38,
      padding: "0 14px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--blue-100)",
      background: "linear-gradient(160deg, var(--blue-50), var(--white))",
      cursor: "pointer",
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--blue-700)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/mark.svg",
    width: "18",
    height: "18",
    alt: "",
    style: {
      borderRadius: 5
    }
  }), " Open in 95 Forward") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      borderBottom: "1px solid var(--host-rule, #D5DCE1)"
    }
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTab(t),
    style: {
      padding: "10px 14px",
      border: "none",
      background: "none",
      cursor: "pointer",
      font: (tab === t ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)",
      color: tab === t ? "var(--host-ink-strong, #2A3640)" : "var(--host-muted, #8896A0)",
      borderBottom: "2px solid " + (tab === t ? "#4A5965" : "transparent"),
      marginBottom: -1
    }
  }, t))), tab === "Giving history" ? /*#__PURE__*/React.createElement(HostCard, {
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Date"), /*#__PURE__*/React.createElement("th", null, "Fund"), /*#__PURE__*/React.createElement("th", null, "Campaign"), /*#__PURE__*/React.createElement("th", null, "Type"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Amount"))), /*#__PURE__*/React.createElement("tbody", null, D.revenue.gifts.filter(g => g.name === c.name).concat([{
    date: "Mar 2024",
    fund: "Youth Center",
    campaign: "Capital",
    type: "Grant",
    amount: "$60,000"
  }, {
    date: "Feb 2023",
    fund: "Youth Center",
    campaign: "Capital",
    type: "Grant",
    amount: "$40,000"
  }, {
    date: "Jan 2022",
    fund: "Annual Fund",
    campaign: "FY22",
    type: "Cash",
    amount: "$25,000"
  }]).slice(0, 5).map((g, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.date), /*#__PURE__*/React.createElement("td", null, g.fund), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.campaign), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.type), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, g.amount)))))) : /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, tab), /*#__PURE__*/React.createElement(window.POC.StubNote, null, "Static in this PoC")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px 32px",
      maxWidth: 640
    }
  }, [["Primary contact", c.type === "Individual" ? c.name : "Eleanor Hartwell"], ["Email", "—"], ["Phone", "—"], ["Address", c.region], ["Constituent since", "2019"], ["Assigned to", c.owner]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "9px 0",
      borderBottom: "1px solid #E7ECEF"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--host-muted, #8896A0)"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      color: "var(--ink-700)"
    }
  }, v))))));
}

/* -------------------------------------------------- REVENUE */
function HostRevenue() {
  const D = window.POC_DATA;
  const {
    HostBtn
  } = window.POC;
  const r = D.revenue;
  const Stat = ({
    label,
    value
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--host-muted, #8896A0)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fw-heavy) var(--fs-2xl)/1 var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)",
      marginTop: 8,
      letterSpacing: "-0.01em"
    }
  }, value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      padding: "18px 22px",
      background: "var(--surface-card)",
      border: "1px solid var(--host-rule, #D5DCE1)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Total raised \xB7 FY24",
    value: r.summary.total
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: "var(--host-rule, #E7ECEF)",
      margin: "0 8px"
    }
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Gifts",
    value: r.summary.count
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: "var(--host-rule, #E7ECEF)",
      margin: "0 8px"
    }
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Average gift",
    value: r.summary.avg
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(HostBtn, {
    icon: "sliders-horizontal",
    style: {
      height: 32
    }
  }, "Filters"), /*#__PURE__*/React.createElement(HostBtn, {
    icon: "download",
    style: {
      height: 32
    }
  }, "Export"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #8896A0)"
    }
  }, "Showing recent gifts")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--host-rule, #D5DCE1)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Constituent"), /*#__PURE__*/React.createElement("th", null, "Date"), /*#__PURE__*/React.createElement("th", null, "Fund"), /*#__PURE__*/React.createElement("th", null, "Campaign"), /*#__PURE__*/React.createElement("th", null, "Appeal"), /*#__PURE__*/React.createElement("th", null, "Type"), /*#__PURE__*/React.createElement("th", null, "Receipt"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Amount"))), /*#__PURE__*/React.createElement("tbody", null, r.gifts.map((g, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, g.name), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.date), /*#__PURE__*/React.createElement("td", null, g.fund), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.campaign), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.appeal), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, g.type), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) 10px var(--font-sans)",
      color: g.receipt === "Sent" ? "var(--sage-600)" : "var(--gold-700)"
    }
  }, g.receipt)), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, g.amount)))))));
}

/* -------------------------------------------------- MAJOR GIVING — THE FOIL */
function HostMajorGiving({
  params
}) {
  const D = window.POC_DATA;
  const {
    Icon,
    HostCard
  } = window.POC;
  const mg = D.majorGiving;
  const tab = params && params.tab || "opportunities";
  const StageDot = ({
    stage
  }) => {
    const order = ["Identification", "Cultivation", "Solicitation", "Stewardship"];
    const idx = order.indexOf(stage);
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        gap: 2
      }
    }, order.map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 6,
        height: 6,
        borderRadius: 99,
        background: i <= idx ? "#4A5965" : "#D5DCE1"
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fs-small) var(--font-sans)",
        color: "var(--ink-700)"
      }
    }, stage));
  };
  const Likelihood = ({
    v
  }) => /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-body) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, v, "%"), /*#__PURE__*/React.createElement(BlackBoxBadge, {
    small: true
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) 280px",
      gap: 18,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, tab === "opportunities" ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--host-rule, #D5DCE1)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Constituent"), /*#__PURE__*/React.createElement("th", null, "Stage"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Ask"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Expected"), /*#__PURE__*/React.createElement("th", null, "Close"), /*#__PURE__*/React.createElement("th", null, "Likelihood"), /*#__PURE__*/React.createElement("th", null, "Owner"))), /*#__PURE__*/React.createElement("tbody", null, mg.opportunities.map((o, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, o.name), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(StageDot, {
    stage: o.stage
  })), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, o.ask), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      color: "var(--host-muted, #71808B)"
    }
  }, o.expected), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, o.close), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Likelihood, {
    v: o.likelihood
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, o.owner)))))) : tab === "proposals" ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--host-rule, #D5DCE1)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Constituent"), /*#__PURE__*/React.createElement("th", null, "Purpose"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Amount"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Deadline"))), /*#__PURE__*/React.createElement("tbody", null, mg.proposals.map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, p.name), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--ink-700)"
    }
  }, p.purpose), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right"
    }
  }, p.amount), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, p.status), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, p.deadline)))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: 12
    }
  }, mg.portfolio.map((p, i) => /*#__PURE__*/React.createElement(HostCard, {
    key: i,
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "ks-num",
    style: {
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      marginTop: 8
    }
  }, p.lifetime, " lifetime"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--host-muted, #71808B)",
      marginTop: 4
    }
  }, p.stage))))), /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 18,
      position: "sticky",
      top: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--host-muted, #71808B)"
    }
  }, "Insights"), /*#__PURE__*/React.createElement(BlackBoxBadge, {
    small: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, ["Hartwell Family Foundation is your highest-likelihood opportunity this quarter.", "3 opportunities are at risk of slipping their close date.", "Cultivation stage is converting below your historical average."].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 9,
      padding: "11px 12px",
      background: "var(--host-fill, #EDF1F3)",
      borderRadius: "var(--radius-sm)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 14,
    color: "#8895A0",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-small)/1.45 var(--font-sans)",
      color: "var(--ink-700)"
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 12,
      borderTop: "1px solid #E7ECEF",
      font: "var(--fs-caption)/1.4 var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12,
    color: "#A4AFB7"
  }), " Conclusions only \xB7 the model does not explain its reasoning.")));
}
window.POC = Object.assign(window.POC || {}, {
  HostHome,
  HostConstituents,
  HostConstituent,
  HostRevenue,
  HostMajorGiving
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/host_core.jsx", error: String((e && e.message) || e) }); }

// poc/host_more.jsx
try { (() => {
/* Host CRM — Lists, Analysis (Medium) · Marketing/Events/Volunteers/Memberships
   (Stub) · Settings (Stub, with the link into the 95 Forward settings page). */

function HostLists() {
  const D = window.POC_DATA;
  const {
    Icon,
    HostCard,
    HostBtn
  } = window.POC;
  const [cat, setCat] = React.useState("Constituents");
  const CATS = ["Actions", "Constituents", "Gifts", "Opportunities"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "grid",
      gridTemplateColumns: "200px minmax(0,1fr)",
      gap: 18,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 8
    }
  }, CATS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setCat(c),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      width: "100%",
      textAlign: "left",
      padding: "9px 11px",
      borderRadius: "var(--radius-sm)",
      border: "none",
      cursor: "pointer",
      background: cat === c ? "var(--host-fill-2, #E2E8EC)" : "transparent",
      color: cat === c ? "var(--host-ink-strong, #2A3640)" : "var(--host-ink, #46545F)",
      font: (cat === c ? "var(--fw-semibold)" : "var(--fw-medium)") + " var(--fs-small) var(--font-sans)"
    }
  }, c))), /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--host-muted, #71808B)",
      marginBottom: 12
    }
  }, "Filter builder"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, ["Lifetime giving ≥ $50,000", "Status is Prospect", "Region is Riverside"].map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, i > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 9px var(--font-sans)",
      letterSpacing: "0.1em",
      color: "var(--host-muted, #9AA7B0)",
      margin: "2px 0 6px"
    }
  }, "AND") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 10px",
      background: "var(--host-fill, #EDF1F3)",
      borderRadius: "var(--radius-sm)",
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--ink-700)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "filter",
    size: 12,
    color: "#8895A0"
  }), f))), /*#__PURE__*/React.createElement(HostBtn, {
    icon: "plus",
    style: {
      height: 30,
      marginTop: 4
    }
  }, "Add condition")))), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, "Major prospects \xB7 ", cat), /*#__PURE__*/React.createElement(window.POC.StubNote, null, "Representative built list"), /*#__PURE__*/React.createElement(HostBtn, {
    icon: "columns-3",
    style: {
      height: 30,
      marginLeft: "auto"
    }
  }, "Columns")), /*#__PURE__*/React.createElement(HostCard, {
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Name"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "First gift"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Greatest gift"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right"
    }
  }, "Lifetime"), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, D.constituents.filter(c => c.prospect).map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.id
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 600,
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, c.name), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      color: "var(--host-muted, #71808B)"
    }
  }, "$5,000"), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      color: "var(--host-muted, #71808B)"
    }
  }, c.lastGift.split(" · ")[0]), /*#__PURE__*/React.createElement("td", {
    className: "ks-num",
    style: {
      textAlign: "right",
      fontWeight: 600
    }
  }, c.lifetime), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--host-muted, #71808B)"
    }
  }, c.status))))))));
}
function HostAnalysis() {
  const {
    Icon,
    HostCard
  } = window.POC;
  const reports = [{
    name: "Fundraising performance",
    icon: "bar-chart-3"
  }, {
    name: "Donor retention",
    icon: "repeat"
  }, {
    name: "Campaign progress",
    icon: "target"
  }, {
    name: "Appeal analysis",
    icon: "mail"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12
    }
  }, reports.map((r, i) => /*#__PURE__*/React.createElement(HostCard, {
    key: i,
    style: {
      padding: 16,
      display: "flex",
      alignItems: "center",
      gap: 11,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      background: "var(--host-fill-2, #E2E8EC)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: r.icon,
    size: 17,
    color: "var(--host-muted, #71808B)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, r.name)))), /*#__PURE__*/React.createElement(HostCard, {
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, "Fundraising performance \xB7 FY24"), /*#__PURE__*/React.createElement(window.POC.StubNote, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 10,
      height: 180,
      paddingBottom: 8,
      borderBottom: "1px solid #E7ECEF"
    }
  }, [42, 58, 50, 71, 64, 80, 76, 92, 70, 88, 95, 84].map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: v + "%",
      background: "linear-gradient(180deg, #6E7C86, #4A5965)",
      borderRadius: "3px 3px 0 0"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 8,
      font: "9px var(--font-sans)",
      color: "var(--host-muted, #9AA7B0)"
    }
  }, ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"].map(m => /*#__PURE__*/React.createElement("span", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      justifyContent: "center"
    }
  }, [["Total raised", "$1.28M"], ["vs. goal", "94%"], ["New donors", "312"], ["Avg gift", "$3,118"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingBottom: 12,
      borderBottom: "1px solid #E7ECEF"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fs-small) var(--font-sans)",
      color: "var(--host-muted, #71808B)"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    className: "ks-num",
    style: {
      font: "var(--fw-bold) var(--fs-lg) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, v)))))));
}

/* ---- Stubs ---- */
function HostStub({
  route
}) {
  const {
    HostCard,
    StubPage
  } = window.POC;
  const CFG = {
    marketing: {
      icon: "megaphone",
      lead: "Email campaigns, appeals, and audience segments — your outbound program lives here.",
      cols: ["Appeal", "Channel", "Sent", "Open rate", "Gifts"],
      rows: [["Spring mail 2024", "Direct mail", "8,400", "—", "212"], ["FY24 sustainer", "Email", "12,100", "38%", "96"], ["Year-end push", "Email", "11,800", "41%", "184"], ["Match drive", "Email", "6,200", "44%", "73"]]
    },
    events: {
      icon: "calendar",
      lead: "Galas, tours, and cultivation events — registration, attendance, and follow-up.",
      cols: ["Event", "Date", "Registered", "Attended", "Raised"],
      rows: [["Youth Center tour", "Jul 18", "24", "—", "—"], ["Annual gala", "Oct 5", "310", "—", "—"], ["Donor breakfast", "May 9", "62", "58", "$48,000"], ["Volunteer thank-you", "Apr 2", "120", "104", "—"]]
    },
    volunteers: {
      icon: "heart-handshake",
      lead: "Your volunteer roster — hours, roles, and the donors among them.",
      cols: ["Name", "Role", "Hours YTD", "Since", "Also a donor"],
      rows: [["Theodore Brennan", "Mentor", "84", "2021", "Yes"], ["Helen Vasquez", "Event lead", "42", "2022", "Yes"], ["Marcus Webb", "Board liaison", "30", "2019", "—"], ["Sofia Lin", "Tutor", "112", "2020", "Yes"]]
    },
    memberships: {
      icon: "id-card",
      lead: "Membership tiers and renewals — the recurring base under the major-gifts program.",
      cols: ["Tier", "Members", "Annual", "Renewal rate", "Revenue"],
      rows: [["Friend", "640", "$50", "71%", "$32,000"], ["Advocate", "210", "$150", "78%", "$31,500"], ["Champion", "88", "$500", "84%", "$44,000"], ["Founder's Circle", "24", "$2,500", "92%", "$60,000"]]
    }
  };
  const c = CFG[route] || CFG.marketing;
  return /*#__PURE__*/React.createElement(StubPage, {
    icon: c.icon,
    title: "",
    lead: c.lead
  }, /*#__PURE__*/React.createElement(HostCard, {
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "ks-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, c.cols.map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: i >= 2 ? {
      textAlign: "right"
    } : null
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, c.rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, r.map((cell, j) => /*#__PURE__*/React.createElement("td", {
    key: j,
    className: j >= 2 ? "ks-num" : "",
    style: {
      textAlign: j >= 2 ? "right" : "left",
      fontWeight: j === 0 ? 600 : 400,
      color: j === 0 ? "var(--host-ink-strong, #2A3640)" : "var(--host-muted, #71808B)"
    }
  }, cell))))))));
}

/* ---- Host Settings (stub) + link into 95 Forward settings ---- */
function HostSettings({
  go
}) {
  const {
    Icon,
    HostCard
  } = window.POC;
  const groups = [{
    label: "Users & roles",
    icon: "users",
    note: "12 users · 3 roles"
  }, {
    label: "Campaigns",
    icon: "target",
    note: "FY24 Annual, Capital"
  }, {
    label: "Funds",
    icon: "wallet",
    note: "8 funds"
  }, {
    label: "Appeals",
    icon: "mail",
    note: "14 appeals"
  }, {
    label: "Integrations",
    icon: "plug",
    note: "Email, payments"
  }, {
    label: "Data & privacy",
    icon: "shield",
    note: "Retention, exports"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => go("settings95"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: 20,
      cursor: "pointer",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--blue-100)",
      background: "linear-gradient(160deg, var(--blue-50), var(--white))"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/mark.svg",
    width: "34",
    height: "34",
    alt: "",
    style: {
      borderRadius: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) var(--fs-body) var(--font-sans)",
      color: "var(--blue-700)"
    }
  }, "95 Forward settings"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fs-caption) var(--font-sans)",
      color: "var(--text-secondary)",
      marginTop: 3
    }
  }, "Tune the QPI weights and copilot behavior \u2014 the score is yours to configure.")), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18,
    color: "var(--blue-600)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--host-muted, #71808B)"
    }
  }, "Keystone configuration"), /*#__PURE__*/React.createElement(window.POC.StubNote, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12
    }
  }, groups.map((g, i) => /*#__PURE__*/React.createElement(HostCard, {
    key: i,
    style: {
      padding: 16,
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      background: "var(--host-fill-2, #E2E8EC)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: g.icon,
    size: 16,
    color: "var(--host-muted, #71808B)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, g.label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      marginTop: 3
    }
  }, g.note)))))));
}
window.POC = Object.assign(window.POC || {}, {
  HostLists,
  HostAnalysis,
  HostStub,
  HostSettings
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/host_more.jsx", error: String((e && e.message) || e) }); }

// poc/shell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Shell — Icon, the dual-register sidebar (host CRM + the 95 Forward add-on),
   the context-aware topbar, and shared helpers. Exports to window.POC. */

const DS_SHELL = window.Ds95ForwardDesignSystem_31a0c4 || {};

/* Lucide icon wrapper — re-renders the SVG each paint. */
function Icon({
  name,
  size = 18,
  stroke = 1.8,
  color = "currentColor",
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          "stroke-width": stroke
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      color,
      flex: "none",
      ...style
    }
  });
}

/* Which routes belong to the warm 95 Forward register. */
const F95_ROUTES = ["today", "mpl", "candidates", "prospect", "greensheet", "visit", "initiatives", "initiative", "settings95"];
function isF95(route) {
  return F95_ROUTES.indexOf(route) !== -1;
}

/* ---- Sidebar -------------------------------------------------------- */
function NavRow({
  icon,
  label,
  active,
  muted,
  onClick,
  indent,
  accent,
  trailing
}) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? accent === "gold" ? "var(--gold-50)" : accent === "blue" ? "var(--blue-50)" : "var(--host-fill-2, #E2E8EC)" : hover ? "rgba(120,135,148,0.10)" : "transparent";
  const col = active ? accent === "gold" ? "var(--gold-700)" : accent === "blue" ? "var(--blue-700)" : "var(--host-ink-strong, #2A3640)" : "var(--host-ink, #46545F)";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      textAlign: "left",
      padding: indent ? "8px 10px 8px 34px" : "9px 11px",
      borderRadius: "var(--radius-md)",
      border: "none",
      cursor: "pointer",
      background: bg,
      color: col,
      font: `${active ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-small)/1.1 var(--font-sans)`,
      position: "relative"
    }
  }, icon ? /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17,
    color: active && accent === "blue" ? "var(--blue-600)" : active && accent === "gold" ? "var(--gold-600)" : "var(--host-muted, #71808B)"
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, label), trailing);
}
function GroupLabel({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) 10px/1 var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--host-muted, #8896A0)",
      padding: "0 11px",
      marginBottom: 7
    }
  }, children);
}
function Sidebar({
  route,
  params,
  go
}) {
  const D = window.POC_DATA;
  const [open95, setOpen95] = React.useState(isF95(route));
  const [openMG, setOpenMG] = React.useState(route === "majorgiving");
  React.useEffect(() => {
    if (isF95(route)) setOpen95(true);
    if (route === "majorgiving") setOpenMG(true);
  }, [route]);
  const Chevron = ({
    open
  }) => /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 15,
    color: "currentColor",
    style: {
      transition: "transform var(--dur-base) var(--ease-out)",
      transform: open ? "none" : "rotate(-90deg)"
    }
  });
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 256,
      flex: "none",
      background: "#F1F4F6",
      borderRight: "1px solid var(--host-rule, #D5DCE1)",
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
      maxHeight: "100vh",
      position: "sticky",
      top: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "16px 16px 14px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 7,
      background: "#54636E",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "hexagon",
    size: 17,
    color: "#fff",
    stroke: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.05
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) 15px var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)",
      letterSpacing: "-0.01em"
    }
  }, D.hostBrand), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) 10px var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      letterSpacing: "0.02em"
    }
  }, D.org))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "4px 12px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(NavRow, {
    icon: "layout-dashboard",
    label: "Home",
    active: route === "home",
    onClick: () => go("home")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "users",
    label: "Constituents",
    active: route === "constituents" || route === "constituent",
    onClick: () => go("constituents")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "hand-coins",
    label: "Revenue",
    active: route === "revenue",
    onClick: () => go("revenue")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "target",
    label: "Major Giving",
    active: route === "majorgiving",
    onClick: () => {
      setOpenMG(o => !o);
      go("majorgiving", {
        tab: "opportunities"
      });
    },
    trailing: /*#__PURE__*/React.createElement(Chevron, {
      open: openMG
    })
  }), openMG ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      marginTop: 1
    }
  }, [["opportunities", "Opportunities"], ["proposals", "Proposals"], ["portfolio", "Portfolio"]].map(([t, l]) => /*#__PURE__*/React.createElement(NavRow, {
    key: t,
    indent: true,
    label: l,
    active: route === "majorgiving" && (params.tab || "opportunities") === t,
    onClick: () => go("majorgiving", {
      tab: t
    })
  }))) : null, /*#__PURE__*/React.createElement(NavRow, {
    icon: "filter",
    label: "Lists",
    active: route === "lists",
    onClick: () => go("lists")
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(GroupLabel, null, "Add-ons"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setOpen95(o => !o);
      go("today");
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      textAlign: "left",
      padding: "9px 11px",
      borderRadius: "var(--radius-md)",
      border: "1px solid",
      borderColor: open95 ? "var(--blue-100)" : "transparent",
      cursor: "pointer",
      position: "relative",
      background: open95 ? "linear-gradient(180deg, var(--blue-50), rgba(238,245,250,0.4))" : "transparent"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/mark.svg",
    width: "22",
    height: "22",
    alt: "",
    style: {
      borderRadius: 6
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "var(--fw-bold) var(--fs-small)/1.1 var(--font-sans)",
      color: "var(--blue-700)",
      letterSpacing: "-0.01em"
    }
  }, "95\xA0Forward"), /*#__PURE__*/React.createElement(Chevron, {
    open: open95
  })), open95 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1,
      marginTop: 2,
      marginLeft: 2,
      paddingLeft: 10,
      borderLeft: "2px solid var(--blue-100)"
    }
  }, /*#__PURE__*/React.createElement(NavRow, {
    indent: true,
    icon: "sunrise",
    label: "Today",
    accent: "gold",
    active: route === "today",
    onClick: () => go("today")
  }), /*#__PURE__*/React.createElement(NavRow, {
    indent: true,
    icon: "list-ordered",
    label: "Prospects",
    accent: "blue",
    active: route === "mpl" || route === "candidates" || route === "prospect",
    onClick: () => go("mpl")
  }), /*#__PURE__*/React.createElement(NavRow, {
    indent: true,
    icon: "trending-up",
    label: "Green Sheet",
    accent: "blue",
    active: route === "greensheet",
    onClick: () => go("greensheet")
  }), /*#__PURE__*/React.createElement(NavRow, {
    indent: true,
    icon: "flag",
    label: "Initiatives",
    accent: "blue",
    active: route === "initiatives" || route === "initiative",
    onClick: () => go("initiatives")
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("visit"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      margin: "7px 0 2px",
      padding: "9px 12px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--gold-300)",
      cursor: "pointer",
      background: "var(--gold-50)",
      color: "var(--gold-700)",
      width: "100%",
      font: "var(--fw-semibold) var(--fs-small)/1 var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "radio",
    size: 16,
    color: "var(--gold-600)"
  }), " Enter visit mode")) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(NavRow, {
    icon: "megaphone",
    label: "Marketing",
    active: route === "marketing",
    onClick: () => go("marketing")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "calendar",
    label: "Events",
    active: route === "events",
    onClick: () => go("events")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "heart-handshake",
    label: "Volunteers",
    active: route === "volunteers",
    onClick: () => go("volunteers")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "id-card",
    label: "Memberships",
    active: route === "memberships",
    onClick: () => go("memberships")
  }), /*#__PURE__*/React.createElement(NavRow, {
    icon: "bar-chart-3",
    label: "Analysis",
    active: route === "analysis",
    onClick: () => go("analysis")
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--host-rule, #D5DCE1)",
      padding: "8px 12px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(NavRow, {
    icon: "settings",
    label: "Settings",
    active: route === "settings" || route === "settings95",
    onClick: () => go("settings")
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("settings"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      textAlign: "left",
      padding: "8px 10px",
      borderRadius: "var(--radius-md)",
      border: "none",
      cursor: "pointer",
      background: "transparent",
      marginTop: 2
    }
  }, DS_SHELL.Avatar ? /*#__PURE__*/React.createElement(DS_SHELL.Avatar, {
    name: D.user.name,
    size: "md",
    ringColor: "var(--role-manager)"
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-small)/1.2 var(--font-sans)",
      color: "var(--host-ink-strong, #2A3640)"
    }
  }, D.user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px var(--font-sans)",
      color: "var(--host-muted, #8896A0)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, D.user.role)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-up",
    size: 14,
    color: "var(--host-muted, #8896A0)",
    style: {
      marginLeft: "auto"
    }
  }))));
}

/* ---- Topbar --------------------------------------------------------- */
function Topbar({
  title,
  subtitle,
  register,
  addLabel,
  onAdd,
  copilotCount,
  go
}) {
  const f95 = register === "f95";
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      flex: "none",
      padding: "14px 28px",
      borderBottom: "1px solid " + (f95 ? "var(--border-hairline)" : "var(--host-rule, #D5DCE1)"),
      background: f95 ? "var(--surface-card)" : "rgba(255,255,255,0.6)",
      backdropFilter: "blur(2px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--fw-semibold) var(--fs-xl)/1.15 var(--font-sans)",
      color: f95 ? "var(--text-strong)" : "var(--host-ink-strong, #2A3640)",
      letterSpacing: "var(--ls-snug)"
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: f95 ? "var(--text-secondary)" : "var(--host-muted, #71808B)",
      marginTop: 3
    }
  }, subtitle) : null), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 12px",
      height: 36,
      width: 240,
      background: f95 ? "var(--haze-100)" : "var(--host-fill, #EDF1F3)",
      borderRadius: "var(--radius-md)",
      border: "1px solid " + (f95 ? "transparent" : "var(--host-rule, #D5DCE1)")
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15,
    color: "var(--ink-400)"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: f95 ? "Search prospects" : "Search constituents, gifts…",
    style: {
      border: "none",
      background: "transparent",
      outline: "none",
      width: "100%",
      font: "var(--text-small, var(--fs-small)) var(--font-sans)",
      fontSize: "var(--fs-small)",
      color: "var(--text-strong)"
    }
  })), f95 && copilotCount ? /*#__PURE__*/React.createElement("button", {
    onClick: () => go && go("today"),
    title: "Copilot suggestions",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      height: 36,
      padding: "0 12px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--ai-border)",
      background: "var(--ai-surface)",
      color: "var(--ai-ink)",
      cursor: "pointer",
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: 3,
      background: "var(--ai-ink)"
    }
  }), " ", copilotCount) : null, /*#__PURE__*/React.createElement("button", {
    title: "Notifications",
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-md)",
      border: "1px solid " + (f95 ? "var(--border-default)" : "var(--host-rule, #D5DCE1)"),
      background: f95 ? "var(--surface-card)" : "transparent",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 16,
    color: "var(--ink-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 8,
      right: 9,
      width: 6,
      height: 6,
      borderRadius: 99,
      background: "var(--gold-600)"
    }
  })), addLabel ? f95 ? DS_SHELL.Button ? /*#__PURE__*/React.createElement(DS_SHELL.Button, {
    variant: "primary",
    size: "sm",
    onClick: onAdd,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 15
    })
  }, addLabel) : null : /*#__PURE__*/React.createElement("button", {
    onClick: onAdd,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      height: 36,
      padding: "0 14px",
      borderRadius: "var(--radius-md)",
      border: "none",
      background: "#4A5965",
      color: "#fff",
      cursor: "pointer",
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15,
    color: "#fff"
  }), " ", addLabel) : null);
}

/* ---- Shared bits ---------------------------------------------------- */
function Eyebrow({
  children,
  color = "var(--text-muted)"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color
    }
  }, children);
}

/* A flat host card (denser, cooler, low elevation). */
function HostCard({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--host-rule, #D5DCE1)",
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, rest), children);
}

/* Neutral host action button — minimal brand color. */
function HostBtn({
  children,
  icon,
  primary,
  onClick,
  style
}) {
  const [h, setH] = React.useState(false);
  const base = primary ? {
    background: h ? "#3E4C57" : "#4A5965",
    color: "#fff",
    border: "1px solid transparent"
  } : {
    background: h ? "var(--host-fill, #EDF1F3)" : "var(--surface-card)",
    color: "var(--host-ink-strong, #2A3640)",
    border: "1px solid var(--host-rule, #D5DCE1)"
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      height: 36,
      padding: "0 14px",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
      whiteSpace: "nowrap",
      ...base,
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 15,
    color: primary ? "#fff" : "var(--ink-500)"
  }) : null, children);
}
function StubNote({
  children
}) {
  const D = window.POC;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 13px",
      borderRadius: "var(--radius-pill)",
      background: "var(--host-fill, #EDF1F3)",
      border: "1px dashed var(--host-rule, #CCD4DA)",
      color: "var(--host-muted, #71808B)",
      font: "var(--fw-medium) var(--fs-caption) var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 14,
    color: "var(--host-muted, #8896A0)"
  }), children || "Static in this PoC");
}

/* A simple host-side stub page. */
function StubPage({
  icon,
  title,
  lead,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 9,
      background: "var(--host-fill-2, #E2E8EC)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 19,
    color: "var(--host-muted, #71808B)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-regular) var(--fs-body) var(--font-sans)",
      color: "var(--host-muted, #71808B)",
      maxWidth: 520
    }
  }, lead)), /*#__PURE__*/React.createElement(StubNote, null)), children);
}
window.POC = Object.assign(window.POC || {}, {
  Icon,
  isF95,
  Sidebar,
  Topbar,
  Eyebrow,
  HostCard,
  HostBtn,
  StubNote,
  StubPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "poc/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/App.jsx
try { (() => {
/* App — top-level state + screen routing for the workspace kit. */
function App() {
  const {
    Sidebar,
    Topbar,
    MasterList,
    ProspectProfile,
    GreenSheet,
    VisitCompanion,
    Icon
  } = window.F95;
  const [state, setState] = React.useState({
    screen: "list",
    prospect: null
  });
  const go = (screen, prospect = null) => setState({
    screen,
    prospect
  });

  // Register B — full-bleed, no shell.
  if (state.screen === "visit") {
    return /*#__PURE__*/React.createElement(VisitCompanion, {
      go: go
    });
  }
  let title = "Master Prospect List",
    subtitle = "One ranked list — people, companies, and foundations together.",
    body = null;
  if (state.screen === "list" || state.screen === "today") {
    body = /*#__PURE__*/React.createElement(MasterList, {
      go: go
    });
  } else if (state.screen === "profile") {
    title = "Prospect";
    subtitle = "The whole picture — and the next right move.";
    body = /*#__PURE__*/React.createElement(ProspectProfile, {
      prospect: state.prospect,
      go: go
    });
  } else if (state.screen === "green") {
    title = "Green Sheet";
    subtitle = "Momentum, honestly kept.";
    body = /*#__PURE__*/React.createElement(GreenSheet, {
      go: go
    });
  }
  const navScreen = state.screen === "profile" ? "list" : state.screen;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      background: "var(--bg-app)"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    screen: navScreen,
    go: go
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: title,
    subtitle: subtitle,
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 38,
        padding: "0 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "var(--surface-card)",
        cursor: "pointer",
        font: "var(--fw-semibold) var(--fs-small) var(--font-sans)",
        color: "var(--text-body)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16,
      color: "var(--ink-500)"
    }), " Add prospect")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto"
    }
  }, body)));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/GreenSheet.jsx
try { (() => {
/* Green Sheet — the simple scoreboard. Momentum made visible (Register A). */
const GS = window.Ds95ForwardDesignSystem_31a0c4;
function StatCard({
  stat,
  accent
}) {
  const pct = Math.min(100, Math.round(stat.value / stat.goal * 100));
  const done = stat.value >= stat.goal;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, stat.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 4,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-heavy) var(--fs-score)/0.9 var(--font-sans)",
      letterSpacing: "var(--ls-tight)",
      fontFeatureSettings: "var(--num-tabular)",
      color: accent
    }
  }, stat.value), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-xl) var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "/ ", stat.goal)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: 99,
      background: "var(--haze-100)",
      marginTop: 16,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: pct + "%",
      borderRadius: 99,
      background: accent,
      transition: "width var(--dur-deliberate) var(--ease-emph)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: done ? "var(--sage-700)" : "var(--text-secondary)",
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, done ? "Goal met — nicely done." : `${stat.goal - stat.value} to go this period`));
}
function GreenSheet({
  go
}) {
  const D = window.F95_DATA;
  const g = D.greenSheet;
  const {
    Eyebrow,
    Icon
  } = window.F95;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-7)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      padding: "var(--space-5) var(--space-6)",
      background: "var(--sage-50)",
      border: "1px solid var(--sage-100)",
      borderRadius: "var(--radius-lg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 40,
      height: 40,
      borderRadius: 99,
      background: "var(--white)",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid var(--sage-100)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flame",
    size: 20,
    color: "var(--sage-600)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-title)",
      color: "var(--text-strong)"
    }
  }, g.streak, "-week momentum streak"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--sage-700)"
    }
  }, "You've hit your visit goal six weeks running. Keep the cadence."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "This period"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-5)",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    stat: g.visits,
    accent: "var(--blue-600)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    stat: g.asks,
    accent: "var(--gold-600)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    stat: g.followups,
    accent: "var(--sage-600)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "The discipline"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fw-regular) var(--fs-lg)/1.5 var(--font-serif)",
      color: "var(--text-body)",
      marginTop: 12,
      maxWidth: 560,
      letterSpacing: "var(--ls-snug)"
    }
  }, "Three numbers, honestly kept: visits made, asks delivered, and follow-ups sent within 24 hours. Not a vanity dashboard \u2014 a scoreboard for the work that moves a mission forward.")));
}
window.F95 = Object.assign(window.F95 || {}, {
  GreenSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/GreenSheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/MasterList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Master Prospect List — the ranked cockpit (Register A). */
const {
  ProspectRow,
  Tag,
  Button: F95Button,
  Badge: F95Badge
} = window.Ds95ForwardDesignSystem_31a0c4;
function MasterList({
  go
}) {
  const D = window.F95_DATA;
  const {
    Icon,
    Eyebrow
  } = window.F95;
  const [filter, setFilter] = React.useState("all");
  const FILTERS = [{
    id: "all",
    label: "All"
  }, {
    id: "today",
    label: "Today",
    color: "var(--horizon-today)"
  }, {
    id: "tomorrow",
    label: "Tomorrow",
    color: "var(--horizon-tomorrow)"
  }, {
    id: "forever",
    label: "Forever",
    color: "var(--horizon-forever)"
  }];
  const rows = D.prospects.filter(p => filter === "all" || p.horizon === filter);
  const top = D.prospects[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-7)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-5)",
      padding: "var(--space-5) var(--space-6)",
      borderRadius: "var(--radius-lg)",
      background: "linear-gradient(180deg, var(--gold-50), var(--white))",
      border: "1px solid var(--gold-300)",
      boxShadow: "var(--shadow-sm)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 2,
      color: "var(--gold-700)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-heavy) var(--fs-4xl)/0.9 var(--font-sans)",
      letterSpacing: "var(--ls-tight)",
      fontFeatureSettings: "var(--num-tabular)"
    }
  }, top.qpi), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-body) var(--font-sans)",
      color: "var(--gold-600)"
    }
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--gold-700)"
  }, "Your next right move"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-title)",
      color: "var(--text-strong)",
      marginTop: 4
    }
  }, top.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 2
    }
  }, "QPI 90+ \u2014 go see them today. ", top.cadence, ".")), /*#__PURE__*/React.createElement(F95Button, {
    variant: "go",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-check",
      size: 16
    }),
    onClick: () => go("profile", top)
  }, "Plan the visit")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, FILTERS.map(f => /*#__PURE__*/React.createElement(Tag, {
    key: f.id,
    color: f.color,
    selected: filter === f.id,
    onClick: () => setFilter(f.id)
  }, f.label))), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, rows.length, " on the list \xB7 ranked by QPI")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, rows.map(p => /*#__PURE__*/React.createElement(ProspectRow, _extends({
    key: p.id
  }, p, {
    onClick: () => go("profile", p)
  })))));
}
window.F95 = Object.assign(window.F95 || {}, {
  MasterList
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/MasterList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/ProspectProfile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Prospect Profile — the deep view; the QPI signature lives here (Register A). */
const PP = window.Ds95ForwardDesignSystem_31a0c4;
function FactRow({
  label,
  value,
  source,
  ai
}) {
  const {
    SourceTag
  } = PP;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "11px 0",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150,
      flex: "none",
      font: "var(--text-label)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, value ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) var(--fs-body)/1.3 var(--font-sans)",
      color: ai ? "var(--iris-700)" : "var(--text-strong)"
    }
  }, value), ai ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) 10px var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--ai-ink)",
      background: "var(--ai-tint)",
      padding: "2px 6px",
      borderRadius: "var(--radius-xs)"
    }
  }, "Copilot") : null, /*#__PURE__*/React.createElement(SourceTag, {
    source: source
  })) : /*#__PURE__*/React.createElement(SourceTag, {
    onClick: () => {}
  })));
}
function ProspectProfile({
  prospect,
  go
}) {
  const D = window.F95_DATA;
  const H = D.hartwell;
  const p = prospect || D.prospects[0];
  const {
    QPIScore,
    AISuggestion,
    RoleChip,
    HorizonTag,
    Card,
    Button,
    Avatar,
    Badge
  } = PP;
  const {
    Icon,
    Eyebrow
  } = window.F95;
  const kindLabel = {
    person: "Individual",
    company: "Company",
    foundation: "Foundation"
  }[p.kind] || "Prospect";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-7)",
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) 320px",
      gap: "var(--space-7)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("list"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)",
      padding: 0,
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Back to the list"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-5)",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.name,
    kind: p.kind === "person" ? "person" : "org",
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--text-h1)",
      color: "var(--text-strong)",
      letterSpacing: "var(--ls-snug)"
    }
  }, p.name), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, kindLabel), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) var(--fs-micro)/1.3 var(--font-mono)",
      color: "var(--text-muted)"
    }
  }, "#", p.rank, " on the list")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body-r)",
      color: "var(--text-secondary)",
      marginTop: 4
    }
  }, p.subtitle), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
      flexWrap: "wrap"
    }
  }, p.manager ? /*#__PURE__*/React.createElement(RoleChip, {
    role: "manager",
    name: p.manager
  }) : null, p.partner ? /*#__PURE__*/React.createElement(RoleChip, {
    role: "partner",
    name: p.partner
  }) : null, /*#__PURE__*/React.createElement(HorizonTag, {
    horizon: p.horizon
  })))), /*#__PURE__*/React.createElement(Card, {
    tone: "go",
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--gold-700)"
  }, "Qualified Prospect Index"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Updated 6h ago")), /*#__PURE__*/React.createElement(QPIScore, {
    value: H.qpi,
    parts: H.parts,
    defaultOpen: true,
    onAdjust: () => {}
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--ai-ink)"
  }, "From your copilot \xB7 ", H.suggestions.length, " to review"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      marginTop: 12
    }
  }, H.suggestions.map(s => /*#__PURE__*/React.createElement(AISuggestion, {
    key: s.id,
    source: s.source,
    from: s.from,
    to: s.to,
    onApprove: () => {},
    onEdit: () => {},
    onDismiss: () => {}
  }, s.text)))), /*#__PURE__*/React.createElement(Card, {
    pad: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "What we know"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Gaps are invitations, not errors")), H.facts.map((f, i) => /*#__PURE__*/React.createElement(FactRow, _extends({
    key: i
  }, f))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)",
      position: "sticky",
      top: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "default",
    pad: "md",
    elevation: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--gold-700)"
  }, "The next move"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      margin: "12px 0 4px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 99,
      background: "var(--gold-600)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-title)",
      color: "var(--text-strong)"
    }
  }, "Follow up by tomorrow")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--text-small, var(--fs-small)) ",
      fontSize: "var(--fs-small)",
      lineHeight: 1.5,
      color: "var(--text-secondary)",
      marginBottom: 14
    }
  }, "Tom can open the door this week. Fast and good beats slow and perfect."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "go",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-check",
      size: 16
    })
  }, "Plan the visit"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "message-square",
      size: 15
    })
  }, "Log a touch"))), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Recent activity"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      marginTop: 12
    }
  }, H.timeline.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      paddingBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: "var(--ink-300)",
      marginTop: 5
    }
  }), i < H.timeline.length - 1 ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1.5,
      flex: 1,
      background: "var(--border-hairline)",
      marginTop: 3
    }
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-label)",
      color: "var(--text-strong)"
    }
  }, t.what), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, t.when, " \xB7 ", t.who))))))));
}
window.F95 = Object.assign(window.F95 || {}, {
  ProspectProfile
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/ProspectProfile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Shell.jsx
try { (() => {
/* Shell: Icon (Lucide), Sidebar, Topbar, shared bits. Exports to window.F95. */
const DS = window.Ds95ForwardDesignSystem_31a0c4 || {};
const {
  Avatar,
  Badge
} = DS;

/* Lucide icon wrapper — re-renders the SVG each paint. */
function Icon({
  name,
  size = 18,
  stroke = 1.8,
  color = "currentColor",
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          "stroke-width": stroke
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      color,
      ...style
    }
  });
}
const NAV = [{
  id: "today",
  label: "Today",
  icon: "sunrise"
}, {
  id: "list",
  label: "Prospects",
  icon: "list-ordered"
}, {
  id: "green",
  label: "Green Sheet",
  icon: "trending-up"
}];
function Sidebar({
  screen,
  go
}) {
  const D = window.F95_DATA;
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: "var(--sidebar-w)",
      flex: "none",
      background: "var(--surface-card)",
      borderRight: "1px solid var(--border-hairline)",
      display: "flex",
      flexDirection: "column",
      padding: "var(--space-5) var(--space-4)",
      gap: "var(--space-6)",
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "4px 8px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/mark.svg",
    width: "30",
    height: "30",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      lineHeight: 1.1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-heavy) 15px var(--font-sans)",
      color: "var(--text-strong)",
      letterSpacing: "-0.01em"
    }
  }, "95 Forward"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)"
    }
  }, "Major gifts"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, NAV.map(n => {
    const on = screen === n.id;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => go(n.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: on ? "var(--blue-50)" : "transparent",
        color: on ? "var(--blue-700)" : "var(--text-body)",
        font: `${on ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-body)/1 var(--font-sans)`,
        transition: "background var(--dur-fast) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 18,
      color: on ? "var(--blue-600)" : "var(--ink-400)"
    }), n.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("visit"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: "11px 14px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--gold-300)",
      cursor: "pointer",
      background: "var(--gold-50)",
      color: "var(--gold-700)",
      font: "var(--fw-semibold) var(--fs-small)/1 var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "radio",
    size: 17,
    color: "var(--gold-600)"
  }), " Enter visit mode")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px",
      borderTop: "1px solid var(--border-hairline)",
      paddingTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: D.user.name,
    size: "md",
    ringColor: "var(--role-manager)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-label)",
      color: "var(--text-strong)"
    }
  }, D.user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, D.user.org))));
}
function Topbar({
  title,
  subtitle,
  right
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      padding: "var(--space-5) var(--space-7)",
      borderBottom: "1px solid var(--border-hairline)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--text-h2)",
      color: "var(--text-strong)",
      letterSpacing: "var(--ls-snug)"
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-secondary)",
      marginTop: 3
    }
  }, subtitle) : null), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 12px",
      height: 38,
      background: "var(--haze-100)",
      borderRadius: "var(--radius-md)",
      width: 240,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "var(--ink-400)"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search prospects",
    style: {
      border: "none",
      background: "transparent",
      outline: "none",
      width: "100%",
      font: "var(--text-body-r)",
      color: "var(--text-strong)"
    }
  })), right);
}

/* Small eyebrow label */
function Eyebrow({
  children,
  color = "var(--text-muted)"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-micro)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color
    }
  }, children);
}
window.F95 = Object.assign(window.F95 || {}, {
  Icon,
  Sidebar,
  Topbar,
  Eyebrow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/VisitCompanion.jsx
try { (() => {
/* Visit Companion — Register B. In the moment: large, quiet, low-chrome. */
const VC = window.Ds95ForwardDesignSystem_31a0c4;
const STAGES = [{
  key: "open",
  eyebrow: "Open — warm, unhurried",
  prompt: "Start with thanks. What first drew them to this work?",
  help: "Let them talk. You're here to listen first."
}, {
  key: "listen",
  eyebrow: "Listen — ask, listen, ask",
  prompt: "What would they most want to see change in the next five years?",
  help: "A question, then space. Resist filling the silence."
}, {
  key: "ask",
  eyebrow: "The ask — clear and dignified",
  isAsk: true,
  prompt: "Would you consider a gift of $250,000 to name the new youth wing?",
  help: "Say the number. Then stop talking, and listen."
}, {
  key: "close",
  eyebrow: "Close — agree the next step",
  prompt: "Thank them. What's the one thing you'll each do next?",
  help: "Confirm a concrete next step before you leave."
}];
function VisitCompanion({
  go
}) {
  const D = window.F95_DATA;
  const {
    Button,
    Badge
  } = VC;
  const {
    Icon
  } = window.F95;
  const [i, setI] = React.useState(0);
  const [logged, setLogged] = React.useState(false);
  const s = STAGES[i];
  const last = i === STAGES.length - 1;
  if (logged) {
    return /*#__PURE__*/React.createElement("div", {
      style: shellStyle
    }, /*#__PURE__*/React.createElement(CompanionTop, {
      go: go
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-7)",
        gap: "var(--space-6)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        width: 64,
        height: 64,
        borderRadius: 99,
        background: "var(--sage-100)",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 32,
      color: "var(--sage-600)",
      stroke: 2.2
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fw-regular) var(--fs-3xl)/1.2 var(--font-serif)",
        color: "var(--text-strong)",
        letterSpacing: "var(--ls-snug)"
      }
    }, "Ask logged."), /*#__PURE__*/React.createElement("div", {
      style: {
        font: "var(--fs-lg)",
        color: "var(--text-secondary)",
        marginTop: 10,
        maxWidth: 420
      }
    }, "$250,000 to name the youth wing, with the Hartwell Foundation.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "12px 18px",
        borderRadius: "var(--radius-pill)",
        background: "var(--gold-50)",
        border: "1px solid var(--gold-300)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        borderRadius: 99,
        background: "var(--gold-600)",
        animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--text-label)",
        color: "var(--gold-700)"
      }
    }, "Follow up by tomorrow \u2014 we'll remind you")), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      onClick: () => go("profile", D.prospects[0])
    }, "Back to their profile")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: shellStyle
  }, /*#__PURE__*/React.createElement(CompanionTop, {
    go: go
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 8,
      padding: "var(--space-5)"
    }
  }, STAGES.map((st, idx) => /*#__PURE__*/React.createElement("span", {
    key: st.key,
    style: {
      width: idx === i ? 28 : 8,
      height: 8,
      borderRadius: 99,
      background: idx <= i ? "var(--blue-600)" : "var(--ink-200)",
      transition: "all var(--dur-base) var(--ease-out)"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-7)",
      textAlign: "center",
      maxWidth: 680,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-semibold) var(--fs-caption)/1 var(--font-sans)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: s.isAsk ? "var(--gold-700)" : "var(--blue-600)"
    }
  }, s.eyebrow), /*#__PURE__*/React.createElement("p", {
    key: s.key,
    style: {
      font: `var(--fw-regular) ${s.isAsk ? "var(--fs-4xl)" : "var(--fs-3xl)"}/1.25 var(--font-serif)`,
      color: "var(--text-strong)",
      letterSpacing: "var(--ls-snug)",
      margin: "22px 0 0",
      textWrap: "balance",
      animation: "f95-rise var(--dur-slow) var(--ease-out) both"
    }
  }, s.isAsk ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u201C", s.prompt, "\u201D") : s.prompt), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fs-lg)/1.5",
      color: "var(--text-muted)",
      marginTop: 18,
      maxWidth: 460
    }
  }, s.help), s.isAsk ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ai"
  }, "Copilot drafted this ask from their $250K capacity")) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      padding: "var(--space-6) var(--space-7) var(--space-8)",
      maxWidth: 680,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box"
    }
  }, i > 0 ? /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    onClick: () => setI(i - 1)
  }, "Back") : null, s.isAsk ? /*#__PURE__*/React.createElement(Button, {
    variant: "go",
    size: "lg",
    block: true,
    onClick: () => setLogged(true),
    iconLeft: /*#__PURE__*/React.createElement(window.F95.Icon, {
      name: "check",
      size: 18
    })
  }, "Log the ask") : last ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    block: true,
    onClick: () => setLogged(true)
  }, "Finish visit") : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    block: true,
    onClick: () => setI(i + 1),
    iconRight: /*#__PURE__*/React.createElement(window.F95.Icon, {
      name: "arrow-right",
      size: 18
    })
  }, "Next")));
}
const shellStyle = {
  position: "absolute",
  inset: 0,
  background: "var(--haze-50)",
  display: "flex",
  flexDirection: "column",
  zIndex: 5
};
function CompanionTop({
  go
}) {
  const {
    Icon
  } = window.F95;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "var(--space-5) var(--space-6)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("profile", window.F95_DATA.prospects[0]),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      font: "var(--fw-medium) var(--fs-small) var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }), " Exit"), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      font: "var(--text-label)",
      color: "var(--text-strong)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 99,
      background: "var(--gold-600)",
      animation: "f95-heartbeat var(--beat-period) var(--ease-in-out) infinite"
    }
  }), "With the Hartwell Family Foundation"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-caption)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, "Visit mode \xB7 Tom Bradley made the intro")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44
    }
  }));
}
window.F95 = Object.assign(window.F95 || {}, {
  VisitCompanion
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/VisitCompanion.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/data.js
try { (() => {
/* Sample data for the 95 Forward workspace UI kit. Plain global (no modules). */
window.F95_DATA = {
  user: {
    name: "Dana Reese",
    role: "Major Gifts Officer",
    org: "Riverside Children's Fund"
  },
  // The one ranked Master Prospect List — people, companies, foundations together.
  prospects: [{
    id: "p1",
    rank: 1,
    name: "Hartwell Family Foundation",
    kind: "foundation",
    subtitle: "Private foundation · Capital campaign",
    qpi: 92,
    horizon: "today",
    manager: "Dana Reese",
    partner: "Tom Bradley",
    cadence: "Follow up in 18h",
    dueSoon: true
  }, {
    id: "p2",
    rank: 2,
    name: "Maria Alvarez",
    kind: "person",
    subtitle: "Retired CEO, Alvarez Foods · In district",
    qpi: 84,
    horizon: "tomorrow",
    manager: "Dana Reese",
    partner: "Sofia Lin",
    cadence: "Last contact 6d",
    dueSoon: false
  }, {
    id: "p3",
    rank: 3,
    name: "Okoro Logistics",
    kind: "company",
    subtitle: "Regional employer · ESG budget",
    qpi: 78,
    horizon: "tomorrow",
    manager: "Priya Nair",
    partner: "",
    cadence: "Visit planned Thu",
    dueSoon: false
  }, {
    id: "p4",
    rank: 4,
    name: "James & Eleanor Okoro",
    kind: "person",
    subtitle: "Longtime donors · Legacy interest",
    qpi: 71,
    horizon: "forever",
    manager: "Dana Reese",
    partner: "Tom Bradley",
    cadence: "Last contact 12d",
    dueSoon: false
  }, {
    id: "p5",
    rank: 5,
    name: "The Beaumont Trust",
    kind: "foundation",
    subtitle: "Community trust · Youth programs",
    qpi: 66,
    horizon: "tomorrow",
    manager: "Priya Nair",
    partner: "Marcus Webb",
    cadence: "Research stage",
    dueSoon: false
  }, {
    id: "p6",
    rank: 6,
    name: "Sandra Kim",
    kind: "person",
    subtitle: "Tech founder · New to the org",
    qpi: 58,
    horizon: "today",
    manager: "Dana Reese",
    partner: "",
    cadence: "Follow up in 3d",
    dueSoon: false
  }, {
    id: "p7",
    rank: 7,
    name: "Cardinal Manufacturing",
    kind: "company",
    subtitle: "Family business · Matching program",
    qpi: 49,
    horizon: "tomorrow",
    manager: "Priya Nair",
    partner: "",
    cadence: "Research stage",
    dueSoon: false
  }, {
    id: "p8",
    rank: 8,
    name: "Dr. Aisha Bello",
    kind: "person",
    subtitle: "Board member's colleague",
    qpi: 41,
    horizon: "forever",
    manager: "Dana Reese",
    partner: "Tom Bradley",
    cadence: "No contact yet",
    dueSoon: false
  }],
  // Detail for the top prospect (drives the profile screen).
  hartwell: {
    qpi: 92,
    parts: {
      capacity: {
        score: 24,
        reason: "Foundation assets ≈ $40M; granted $1.2M to peer orgs in the last cycle.",
        source: "IRS 990-PF · 2024"
      },
      relationship: {
        score: 22,
        reason: "Board chair Eleanor Hartwell is a personal friend of our ED, Ruth.",
        source: "Logged · Dana R."
      },
      timing: {
        score: 18,
        reason: "Their giving committee meets in Q3 — the campaign window is open now."
      },
      history: {
        score: 15,
        reason: "Three gifts over five years ($25K → $40K → $60K), trending up.",
        source: "Gift records"
      },
      philanthropy: {
        score: 13
      }
    },
    suggestions: [{
      id: "s1",
      text: "Capacity looks higher than recorded — the foundation gave $1M+ to peer orgs last year.",
      source: "IRS 990-PF · 2024",
      from: "$50K capacity",
      to: "$250K capacity"
    }, {
      id: "s2",
      text: "Tom Bradley (board) sits on the Hartwell giving committee. Strong Natural Partner to open the door.",
      source: "LinkedIn · Board roster"
    }],
    facts: [{
      label: "Estimated capacity",
      value: "$250,000",
      source: "IRS 990-PF · 2024",
      ai: true
    }, {
      label: "Giving focus",
      value: "Youth & education",
      source: "990-PF Schedule"
    }, {
      label: "Last gift",
      value: "$60,000 · Mar 2024",
      source: "Gift records"
    }, {
      label: "Wealth screen",
      value: null,
      source: null
    }, {
      label: "Spouse / connections",
      value: "Eleanor Hartwell (chair)",
      source: "Board minutes"
    }],
    timeline: [{
      when: "6 days ago",
      what: "Coffee with Tom Bradley — he'll make the intro.",
      who: "Dana R."
    }, {
      when: "3 weeks ago",
      what: "Sent youth-program impact brief.",
      who: "Dana R."
    }, {
      when: "2 months ago",
      what: "$60,000 annual gift received.",
      who: "Gift records"
    }]
  },
  // Green Sheet scoreboard.
  greenSheet: {
    visits: {
      value: 4,
      goal: 5,
      label: "Visits this week"
    },
    asks: {
      value: 3,
      goal: 6,
      label: "Asks this month"
    },
    followups: {
      value: 11,
      goal: 12,
      label: "Follow-ups on time"
    },
    streak: 6
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.AISuggestion = __ds_scope.AISuggestion;

__ds_ns.HorizonTag = __ds_scope.HorizonTag;

__ds_ns.ProspectRow = __ds_scope.ProspectRow;

__ds_ns.QPIScore = __ds_scope.QPIScore;

__ds_ns.RoleChip = __ds_scope.RoleChip;

__ds_ns.SourceTag = __ds_scope.SourceTag;

})();
