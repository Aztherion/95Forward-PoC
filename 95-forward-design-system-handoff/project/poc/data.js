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
  user: { name: "Dana Reese", role: "Major gifts officer", org: "Riverside Children's Fund" },
  staff: ["Dana Reese", "Priya Nair"],

  /* ---------------------------------------------------------- HOST */
  home: {
    recentGifts: [
      { name: "Maria Alvarez", amount: "$10,000", type: "Cash", date: "Jun 14" },
      { name: "Okoro Logistics", amount: "$25,000", type: "Pledge", date: "Jun 12" },
      { name: "Hartwell Family Foundation", amount: "$60,000", type: "Grant", date: "Jun 9" },
      { name: "T. Brennan", amount: "$500", type: "Recurring", date: "Jun 9" },
      { name: "Cardinal Manufacturing", amount: "$5,000", type: "Matching", date: "Jun 7" },
    ],
    yoy: [
      { label: "Q1", a: 62, b: 71 }, { label: "Q2", a: 74, b: 88 },
      { label: "Q3", a: 58, b: 64 }, { label: "Q4", a: 91, b: 0 },
    ],
    growth: { value: "1,284", delta: "+6.2%", note: "active donors vs. last year" },
    tasks: [
      { what: "Acknowledge Hartwell grant", due: "Today", who: "Dana R." },
      { what: "Q3 appeal proof to print", due: "Tomorrow", who: "Marketing" },
      { what: "Board packet — gift summary", due: "Fri", who: "Dana R." },
    ],
  },

  constituents: [
    { id: "c1", name: "Hartwell Family Foundation", type: "Foundation", lifetime: "$185,000", lastGift: "$60,000 · Mar 2024", lastContact: "6d", status: "Prospect", region: "Riverside, CA", owner: "Dana Reese", prospect: true, prospectId: "p1" },
    { id: "c2", name: "Maria Alvarez", type: "Individual", lifetime: "$94,500", lastGift: "$10,000 · Jun 2024", lastContact: "6d", status: "Prospect", region: "Riverside, CA", owner: "Dana Reese", prospect: true, prospectId: "p2" },
    { id: "c3", name: "Okoro Logistics", type: "Organization", lifetime: "$120,000", lastGift: "$25,000 · Jun 2024", lastContact: "2d", status: "Prospect", region: "Bay Area, CA", owner: "Priya Nair", prospect: true, prospectId: "p3" },
    { id: "c4", name: "James & Eleanor Okoro", type: "Individual", lifetime: "$210,000", lastGift: "$15,000 · Feb 2024", lastContact: "12d", status: "Prospect", region: "Riverside, CA", owner: "Dana Reese", prospect: true, prospectId: "p4" },
    { id: "c5", name: "The Beaumont Trust", type: "Foundation", lifetime: "$40,000", lastGift: "$20,000 · Nov 2023", lastContact: "—", status: "Prospect", region: "Sacramento, CA", owner: "Priya Nair", prospect: true, prospectId: "p5" },
    { id: "c6", name: "Sandra Kim", type: "Individual", lifetime: "$2,500", lastGift: "$2,500 · May 2024", lastContact: "3d", status: "Prospect", region: "Bay Area, CA", owner: "Dana Reese", prospect: true, prospectId: "p6" },
    { id: "c7", name: "Theodore Brennan", type: "Individual", lifetime: "$18,400", lastGift: "$500 · Jun 2024", lastContact: "21d", status: "Active", region: "Riverside, CA", owner: "—", prospect: false },
    { id: "c8", name: "Riverside Rotary Club", type: "Organization", lifetime: "$31,000", lastGift: "$4,000 · Apr 2024", lastContact: "40d", status: "Active", region: "Riverside, CA", owner: "—", prospect: false },
    { id: "c9", name: "Helen Vasquez", type: "Individual", lifetime: "$6,250", lastGift: "$250 · Jan 2024", lastContact: "—", status: "Lapsed", region: "Fresno, CA", owner: "—", prospect: false },
    { id: "c10", name: "Greenfield Community Bank", type: "Organization", lifetime: "$52,000", lastGift: "$12,000 · Dec 2023", lastContact: "55d", status: "Active", region: "Riverside, CA", owner: "—", prospect: false },
  ],

  revenue: {
    summary: { total: "$1,284,600", count: "412", avg: "$3,118" },
    gifts: [
      { name: "Maria Alvarez", amount: "$10,000", date: "Jun 14, 2024", fund: "Annual Fund", campaign: "FY24 Annual", appeal: "Spring mail", type: "Cash", receipt: "Sent" },
      { name: "Okoro Logistics", amount: "$25,000", date: "Jun 12, 2024", fund: "Youth Center", campaign: "Capital", appeal: "Corporate", type: "Pledge", receipt: "Pending" },
      { name: "Hartwell Family Foundation", amount: "$60,000", date: "Jun 9, 2024", fund: "Youth Center", campaign: "Capital", appeal: "Direct ask", type: "Grant", receipt: "Sent" },
      { name: "Theodore Brennan", amount: "$500", date: "Jun 9, 2024", fund: "Annual Fund", campaign: "FY24 Annual", appeal: "Sustainer", type: "Recurring", receipt: "Sent" },
      { name: "Cardinal Manufacturing", amount: "$5,000", date: "Jun 7, 2024", fund: "After-School", campaign: "FY24 Annual", appeal: "Match drive", type: "Matching", receipt: "Sent" },
      { name: "Riverside Rotary Club", amount: "$4,000", date: "Jun 3, 2024", fund: "After-School", campaign: "FY24 Annual", appeal: "Community", type: "Cash", receipt: "Sent" },
      { name: "Greenfield Community Bank", amount: "$12,000", date: "May 28, 2024", fund: "Annual Fund", campaign: "FY24 Annual", appeal: "Corporate", type: "Cash", receipt: "Sent" },
    ],
  },

  majorGiving: {
    opportunities: [
      { name: "Hartwell Family Foundation", stage: "Solicitation", ask: "$250,000", expected: "$200,000", close: "Sep 2024", likelihood: 72, owner: "Dana Reese" },
      { name: "Maria Alvarez", stage: "Cultivation", ask: "$75,000", expected: "$50,000", close: "Nov 2024", likelihood: 64, owner: "Dana Reese" },
      { name: "Okoro Logistics", stage: "Cultivation", ask: "$100,000", expected: "$60,000", close: "Dec 2024", likelihood: 58, owner: "Priya Nair" },
      { name: "James & Eleanor Okoro", stage: "Stewardship", ask: "$50,000", expected: "$40,000", close: "Q1 2025", likelihood: 51, owner: "Dana Reese" },
      { name: "The Beaumont Trust", stage: "Identification", ask: "—", expected: "—", close: "—", likelihood: 38, owner: "Priya Nair" },
    ],
    proposals: [
      { name: "Hartwell Family Foundation", purpose: "Youth wing naming", amount: "$250,000", status: "Submitted", deadline: "Sep 1" },
      { name: "Okoro Logistics", purpose: "ESG community grant", amount: "$100,000", status: "Drafting", deadline: "Oct 15" },
      { name: "The Beaumont Trust", purpose: "After-school programs", amount: "$40,000", status: "LOI", deadline: "Nov 30" },
    ],
    portfolio: [
      { name: "Hartwell Family Foundation", lifetime: "$185,000", stage: "Solicitation" },
      { name: "Maria Alvarez", lifetime: "$94,500", stage: "Cultivation" },
      { name: "James & Eleanor Okoro", lifetime: "$210,000", stage: "Stewardship" },
      { name: "Sandra Kim", lifetime: "$2,500", stage: "Identification" },
      { name: "Dr. Aisha Bello", lifetime: "$0", stage: "Identification" },
    ],
  },

  /* ---------------------------------------------------------- 95 FORWARD */
  // The one ranked Master Prospect List.
  prospects: [
    { id: "p1", rank: 1, name: "Hartwell Family Foundation", kind: "foundation",
      subtitle: "Private foundation · Capital campaign", qpi: 92, horizon: "today",
      manager: "Dana Reese", partner: "Tom Bradley", cadence: "Follow up in 18h", dueSoon: true,
      initiative: "Riverside Youth Center — Capital Campaign", stageNote: "Follow-up due" },
    { id: "p2", rank: 2, name: "Maria Alvarez", kind: "person",
      subtitle: "Retired CEO, Alvarez Foods · In district", qpi: 84, horizon: "tomorrow",
      manager: "Dana Reese", partner: "Sofia Lin", cadence: "Last contact 6d", dueSoon: false,
      initiative: "Riverside Youth Center — Capital Campaign", stageNote: "Cultivation" },
    { id: "p3", rank: 3, name: "Okoro Logistics", kind: "company",
      subtitle: "Regional employer · ESG budget", qpi: 78, horizon: "tomorrow",
      manager: "Priya Nair", partner: "", cadence: "Visit planned Thu", dueSoon: false,
      initiative: "Riverside Youth Center — Capital Campaign", stageNote: "Visit planned" },
    { id: "p4", rank: 4, name: "James & Eleanor Okoro", kind: "person",
      subtitle: "Longtime donors · Legacy interest", qpi: 71, horizon: "forever",
      manager: "Dana Reese", partner: "Tom Bradley", cadence: "Last contact 12d", dueSoon: false,
      initiative: "Legacy & Endowment Fund", stageNote: "Cultivation" },
    { id: "p5", rank: 5, name: "The Beaumont Trust", kind: "foundation",
      subtitle: "Community trust · Youth programs", qpi: 66, horizon: "tomorrow",
      manager: "Priya Nair", partner: "Marcus Webb", cadence: "Research stage", dueSoon: false,
      initiative: "Riverside Youth Center — Capital Campaign", stageNote: "Research stage" },
    { id: "p6", rank: 6, name: "Sandra Kim", kind: "person",
      subtitle: "Tech founder · New to the org", qpi: 58, horizon: "today",
      manager: "Dana Reese", partner: "", cadence: "Follow up in 3d", dueSoon: false,
      initiative: "After-School Program — 2026 Operating", stageNote: "Cultivation", connector: true },
    { id: "p7", rank: 7, name: "Cardinal Manufacturing", kind: "company",
      subtitle: "Family business · Matching program", qpi: 49, horizon: "tomorrow",
      manager: "Priya Nair", partner: "", cadence: "Research stage", dueSoon: false,
      initiative: "After-School Program — 2026 Operating", stageNote: "Research stage" },
    { id: "p8", rank: 8, name: "Dr. Aisha Bello", kind: "person",
      subtitle: "Board member's colleague", qpi: 41, horizon: "forever",
      manager: "Dana Reese", partner: "Tom Bradley", cadence: "No contact yet", dueSoon: false,
      initiative: "Legacy & Endowment Fund", stageNote: "No contact yet" },
  ],

  // QPI breakdowns. Each part: score = rating × weight. Unknowns omit source.
  qpiParts: {
    p1: {
      capacity:     { score: 35, max: 35, reason: "Foundation assets ≈ $40M; granted $1.2M to peer orgs last cycle — can give at the top level.", source: "IRS 990-PF · 2024" },
      relationship: { score: 24, max: 30, reason: "Board chair Eleanor Hartwell is a personal friend of our ED, Ruth; the institutional relationship is still being built.", source: "Logged · Dana R." },
      timing:       { score: 15, max: 15, reason: "Their giving committee meets in Q3 — the campaign window is open now.", source: "Logged · Dana R." },
      history:      { score: 8,  max: 10, reason: "Three gifts over five years ($25K → $40K → $60K), trending up.", source: "Gift records" },
      philanthropy: { score: 10, max: 10, reason: "Actively funds peer youth organizations — $1M+ to peers last year.", source: "IRS 990-PF · 2024" },
    },
    p5: {
      capacity:     { score: 7,  max: 35, reason: "Trust size not yet confirmed — no public filing located.", source: null },
      relationship: { score: 24, max: 30, reason: "Marcus Webb has worked with two of the trustees before.", source: "Logged · Priya N." },
      timing:       { score: 15, max: 15, reason: "Trust's youth-programs cycle opens this fall.", source: "Trust website" },
      history:      { score: 10, max: 10, reason: "$20K gift in 2023; receptive to youth programming.", source: "Gift records" },
      philanthropy: { score: 10, max: 10, reason: "Funds community youth initiatives regionally.", source: "Public grants list" },
    },
    p8: {
      capacity:     { score: 7,  max: 35, reason: "No wealth indicators gathered yet.", source: null },
      relationship: { score: 6,  max: 30, reason: "Known only as a colleague of a board member — no direct contact.", source: null },
      timing:       { score: 6,  max: 15, reason: "No active giving window identified.", source: "Logged · Dana R." },
      history:      { score: 8,  max: 10, reason: "Serves on two nonprofit boards; gives to education causes.", source: "Public bios" },
      philanthropy: { score: 8,  max: 10, reason: "Signed a regional education funding letter in 2024.", source: "Public record" },
    },
    p2: {
      capacity:     { score: 28, max: 35, reason: "Sold Alvarez Foods in 2021; comfortable at the six-figure level.", source: "Press · 2021" },
      relationship: { score: 24, max: 30, reason: "Twelve years of annual gifts; knows our ED personally.", source: "Gift records" },
      timing:       { score: 12, max: 15, reason: "Recently retired and looking for a focus.", source: "Logged · Dana R." },
      history:      { score: 10, max: 10, reason: "Steady annual giving, last gift $10K.", source: "Gift records" },
      philanthropy: { score: 10, max: 10, reason: "Funds food-security and youth causes in the region.", source: "Public grants" },
    },
    p3: {
      capacity:     { score: 28, max: 35, reason: "Regional employer with a dedicated ESG budget line.", source: "Annual report" },
      relationship: { score: 18, max: 30, reason: "Two prior community grants; building exec sponsorship.", source: "Gift records" },
      timing:       { score: 12, max: 15, reason: "ESG budget allocates in Q4 — proposal window open.", source: "Logged · Priya N." },
      history:      { score: 10, max: 10, reason: "$25K pledge this year; reliable corporate partner.", source: "Gift records" },
      philanthropy: { score: 10, max: 10, reason: "Funds youth workforce programs across the region.", source: "Public CSR report" },
    },
    p4: {
      capacity:     { score: 28, max: 35, reason: "Long-term donors with significant estate; legacy-minded.", source: "Wealth screen" },
      relationship: { score: 18, max: 30, reason: "Decades of support; warm but light recent contact.", source: "Gift records" },
      timing:       { score: 9,  max: 15, reason: "Exploring estate plans — no fixed window yet.", source: "Logged · Dana R." },
      history:      { score: 8,  max: 10, reason: "Consistent mid-level giving over many years.", source: "Gift records" },
      philanthropy: { score: 8,  max: 10, reason: "Supports several education endowments.", source: "Public record" },
    },
    p6: {
      capacity:     { score: 21, max: 35, reason: "Successful exit; capacity likely higher once confirmed.", source: "Press · 2023" },
      relationship: { score: 18, max: 30, reason: "New to the org but engaged — and a strong connector herself.", source: "Logged · Dana R." },
      timing:       { score: 9,  max: 15, reason: "Newly philanthropic; exploring where to focus.", source: "Logged · Dana R." },
      history:      { score: 2,  max: 10, reason: "One $2.5K first gift; no track record yet.", source: "Gift records" },
      philanthropy: { score: 8,  max: 10, reason: "Backs STEM-access and youth-coding nonprofits.", source: "Public record" },
    },
    p7: {
      capacity:     { score: 7,  max: 35, reason: "Private family business — financials not public.", source: null },
      relationship: { score: 18, max: 30, reason: "Runs a gift-matching program with us already.", source: "Gift records" },
      timing:       { score: 12, max: 15, reason: "Matching budget renews at fiscal year start.", source: "Logged · Priya N." },
      history:      { score: 6,  max: 10, reason: "Matching gifts totaling ~$15K to date.", source: "Gift records" },
      philanthropy: { score: 6,  max: 10, reason: "Community-minded; local civic giving.", source: "Public record" },
    },
  },

  // Hartwell — the deep prospect, all tabs.
  hartwell: {
    id: "p1",
    suggestions: [
      { id: "s1", text: "Capacity looks higher than recorded — the foundation gave $1M+ to peer orgs last year.",
        source: "IRS 990-PF · 2024", from: "$50K capacity", to: "$250K capacity" },
      { id: "s2", text: "Tom Bradley (board) sits on the Hartwell giving committee. Strong Natural Partner to open the door.",
        source: "LinkedIn · Board roster" },
    ],
    facts: [
      { label: "Estimated capacity", value: "$250,000", source: "IRS 990-PF · 2024", ai: true },
      { label: "Giving focus", value: "Youth & education", source: "990-PF Schedule" },
      { label: "Last gift", value: "$60,000 · Mar 2024", source: "Gift records" },
      { label: "Wealth screen", value: null, source: null },
      { label: "Spouse / connections", value: "Eleanor Hartwell (chair)", source: "Board minutes" },
    ],
    timeline: [
      { when: "6 days ago", what: "Coffee with Tom Bradley — he'll make the intro.", who: "Dana R." },
      { when: "3 weeks ago", what: "Sent youth-program impact brief.", who: "Dana R." },
      { when: "2 months ago", what: "$60,000 annual gift received.", who: "Gift records" },
    ],
    kb: {
      capacity: { value: "≈ $40M in assets; granted $1.2M to peers last cycle", source: "IRS 990-PF · 2024" },
      caseFit: { value: "Funds youth & education — direct fit with the youth center", source: "990-PF Schedule" },
      connectors: [
        { name: "Tom Bradley", role: "Board member · sits on giving committee", path: "Warm — offered to make the intro" },
        { name: "Eleanor Hartwell", role: "Board chair", path: "Personal friend of our ED, Ruth" },
      ],
      gifts: { last: "$60,000 · Mar 2024", largest: "$60,000", total: "$185,000 lifetime" },
      otherPhil: { value: "$1M+ to peer youth orgs in 2024", source: "IRS 990-PF · 2024" },
      timing: { value: "Giving committee meets Q3 — window open now", source: "Logged · Dana R." },
      gaps: [
        "Confirm 2025 grant budget ceiling",
        "Identify the program officer who screens proposals",
        "Verify naming-gift appetite with the chair",
      ],
      relationshipMap: {
        decisionMakers: [
          { name: "Eleanor Hartwell", role: "Board chair", power: "High — final say on major grants", path: "Friend of ED Ruth" },
          { name: "Tom Bradley", role: "Giving committee", power: "Medium — shapes the shortlist", path: "Our Natural Partner" },
          { name: "Program officer", role: "Screens proposals", power: "Medium — gatekeeper", path: "Unknown — worth researching" },
        ],
      },
    },
    strategy: {
      goals: "Move from annual supporter to lead capital donor on the youth center.",
      hooks: ["Naming the new youth wing", "Measurable outcomes for under-12 programs", "Multi-year pledge structure"],
      objections: ["Wants proof of program outcomes before a large commitment", "Prefers to give through the foundation's Q3 cycle"],
      predisposition: "Tom Bradley opens the door; invite the chair to a program site visit before the ask.",
      presentation: "Lead with the youth-center capital priority and the naming opportunity.",
      nextSteps: ["Confirm site-visit date with Eleanor", "Draft the $250K naming proposal", "Brief Tom before the committee meets"],
    },
    visits: [
      { when: "Planned · this week", goal: "Secure the naming-gift conversation", present: "Eleanor Hartwell, Dana, Tom Bradley", priority: "Youth center capital", status: "planned" },
      { when: "Mar 2024", goal: "Steward the annual gift, surface the campaign", present: "Eleanor Hartwell, Dana", priority: "Youth programs impact", debrief: "Warm; asked for outcome data. Receptive to a larger role.", outcome: "Roadmap", next: "Send impact brief, line up Tom for an intro", status: "done" },
    ],
    asks: [
      { amount: "$250,000", initiative: "Riverside Youth Center — Capital Campaign", frame: "tomorrow", type: "Naming gift", numbers: "On the table", outcome: "Roadmap", detail: "Wants a site visit + outcome data first; revisit at Q3 committee." },
    ],
    referrals: [
      { name: "A peer foundation trustee", from: "Eleanor Hartwell", useName: "Yes", willNote: "Will send a note", rel: "Co-funds youth programs" },
    ],
  },

  // Initiatives (funding priorities).
  initiatives: [
    { id: "i1", name: "Riverside Youth Center — Capital Campaign", frame: "tomorrow", goal: 5000000, raised: 1850000, committed: 700000, roadmap: 950000, openAsks: 3, timeline: "Multi-year · through 2027",
      story: "A permanent home for after-school, mentoring, and summer programs — one building that lets us serve three times the children we reach today.",
      widget: "$5,000 names a child's study room for a year.",
      prospects: ["p1", "p2", "p3", "p5"] },
    { id: "i2", name: "After-School Program — 2026 Operating", frame: "today", goal: 400000, raised: 232000, committed: 40000, roadmap: 35000, openAsks: 2, timeline: "This fiscal year",
      story: "Keeps the doors open after 3pm for 220 kids — staff, snacks, transportation, and tutoring, fully funded for the year.",
      widget: "$2,500 funds one child for a full year.",
      prospects: ["p6", "p7"] },
    { id: "i3", name: "Legacy & Endowment Fund", frame: "forever", goal: 10000000, raised: 3100000, committed: 250000, roadmap: 400000, openAsks: 2, timeline: "Open-ended",
      story: "An endowment so the mission outlives any one campaign — steady income that protects the programs families count on, forever.",
      widget: "A $100,000 legacy gift yields ~$4,000 every year, in perpetuity.",
      prospects: ["p4", "p8"] },
  ],

  // Today screen.
  today: {
    nextMoves: [
      { id: "p1", move: "Go see them today — QPI 90+, follow-up due in 18h.", action: "Plan the visit", primary: true },
      { id: "p3", move: "Tom can open the door this week. Visit planned Thursday.", action: "Log a touch" },
      { id: "p6", move: "New founder, warm intro available — and a strong connector herself.", action: "Plan the visit" },
    ],
    followups: [
      { id: "p1", text: "24-hour follow-up to the Hartwell coffee — copilot drafted it.", left: "18h left", overdue: false },
      { id: "p2", text: "Thank-you + next step after Maria's lunch.", left: "6h left", overdue: false },
      { id: "p4", text: "Legacy materials promised to the Okoros.", left: "Overdue 1d", overdue: true },
    ],
    visits: [
      { id: "p3", time: "2:00 PM", priority: "ESG community grant — youth center", who: "Okoro Logistics" },
    ],
    copilotCount: 6,
    coverage: { text: "4 of your Top 33 have no active strategy", count: 4 },
  },

  // Green Sheet.
  greenSheet: {
    visits: { value: 4, goal: 5 },
    asks: { value: 3, goal: 6 },
    followupPct: 92,
    coverage: { assigned: 88, strategy: 76 },
    asksByOutcome: { commitment: 5, roadmap: 4, decline: 2 },
    referralsPerVisit: 1.4,
    pipelineByHorizon: [
      { horizon: "today", count: 6, total: "$640K" },
      { horizon: "tomorrow", count: 14, total: "$3.2M" },
      { horizon: "forever", count: 8, total: "$1.4M" },
    ],
    byRM: [
      { rm: "Dana Reese", coverage: 91, visits: 4, asks: 2, followup: 95 },
      { rm: "Priya Nair", coverage: 84, visits: 3, asks: 1, followup: 88 },
    ],
    streak: 6,
  },

  // Connector discovery (candidates).
  discovery: [
    { id: "d1", connector: "Sandra Kim", connectorId: "p6", initiative: "After-School Program — 2026 Operating",
      status: "ready", count: 12, requested: "2 days ago",
      candidates: [
        { name: "Lena Petrov", confidence: "medium", connection: "co-director, Bay Area STEM-Access Fund", affinity: "funded two youth-coding nonprofits, 2023–24", status: "suggested" },
        { name: "David Osei", confidence: "high", connection: "co-signed the 2024 youth-education open letter", affinity: "family foundation focuses on under-12 literacy", status: "suggested" },
        { name: "Priscilla Vance", confidence: "low", connection: "both spoke at the 2025 EdTech for Good summit", affinity: null, status: "suggested" },
      ] },
    { id: "d2", connector: "Tom Bradley", connectorId: null, initiative: "Riverside Youth Center — Capital Campaign",
      status: "researching", count: 0, requested: "20 minutes ago", candidates: [] },
  ],

  // QPI weight defaults (settings).
  qpiWeights: [
    { key: "capacity", label: "Capacity", weight: 7, max: 35, color: "var(--qpi-capacity)", note: "Ability to give at the level the case needs." },
    { key: "relationship", label: "Relationship", weight: 6, max: 30, color: "var(--qpi-relationship)", note: "Depth of connection to the org and the cause." },
    { key: "timing", label: "Timing", weight: 3, max: 15, color: "var(--qpi-timing)", note: "Is the window open now?" },
    { key: "history", label: "Gift History", weight: 2, max: 10, color: "var(--qpi-history)", note: "Pattern and trajectory of past giving." },
    { key: "philanthropy", label: "Philanthropy", weight: 2, max: 10, color: "var(--qpi-philanthropy)", note: "Demonstrated giving to peer causes." },
  ],
};
