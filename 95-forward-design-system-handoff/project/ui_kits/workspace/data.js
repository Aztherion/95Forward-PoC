/* Sample data for the 95 Forward workspace UI kit. Plain global (no modules). */
window.F95_DATA = {
  user: { name: "Dana Reese", role: "Major Gifts Officer", org: "Riverside Children's Fund" },

  // The one ranked Master Prospect List — people, companies, foundations together.
  prospects: [
    { id: "p1", rank: 1, name: "Hartwell Family Foundation", kind: "foundation",
      subtitle: "Private foundation · Capital campaign", qpi: 92, horizon: "today",
      manager: "Dana Reese", partner: "Tom Bradley", cadence: "Follow up in 18h", dueSoon: true },
    { id: "p2", rank: 2, name: "Maria Alvarez", kind: "person",
      subtitle: "Retired CEO, Alvarez Foods · In district", qpi: 84, horizon: "tomorrow",
      manager: "Dana Reese", partner: "Sofia Lin", cadence: "Last contact 6d", dueSoon: false },
    { id: "p3", rank: 3, name: "Okoro Logistics", kind: "company",
      subtitle: "Regional employer · ESG budget", qpi: 78, horizon: "tomorrow",
      manager: "Priya Nair", partner: "", cadence: "Visit planned Thu", dueSoon: false },
    { id: "p4", rank: 4, name: "James & Eleanor Okoro", kind: "person",
      subtitle: "Longtime donors · Legacy interest", qpi: 71, horizon: "forever",
      manager: "Dana Reese", partner: "Tom Bradley", cadence: "Last contact 12d", dueSoon: false },
    { id: "p5", rank: 5, name: "The Beaumont Trust", kind: "foundation",
      subtitle: "Community trust · Youth programs", qpi: 66, horizon: "tomorrow",
      manager: "Priya Nair", partner: "Marcus Webb", cadence: "Research stage", dueSoon: false },
    { id: "p6", rank: 6, name: "Sandra Kim", kind: "person",
      subtitle: "Tech founder · New to the org", qpi: 58, horizon: "today",
      manager: "Dana Reese", partner: "", cadence: "Follow up in 3d", dueSoon: false },
    { id: "p7", rank: 7, name: "Cardinal Manufacturing", kind: "company",
      subtitle: "Family business · Matching program", qpi: 49, horizon: "tomorrow",
      manager: "Priya Nair", partner: "", cadence: "Research stage", dueSoon: false },
    { id: "p8", rank: 8, name: "Dr. Aisha Bello", kind: "person",
      subtitle: "Board member's colleague", qpi: 41, horizon: "forever",
      manager: "Dana Reese", partner: "Tom Bradley", cadence: "No contact yet", dueSoon: false },
  ],

  // Detail for the top prospect (drives the profile screen).
  hartwell: {
    qpi: 92,
    parts: {
      capacity:     { score: 24, reason: "Foundation assets ≈ $40M; granted $1.2M to peer orgs in the last cycle.", source: "IRS 990-PF · 2024" },
      relationship: { score: 22, reason: "Board chair Eleanor Hartwell is a personal friend of our ED, Ruth.", source: "Logged · Dana R." },
      timing:       { score: 18, reason: "Their giving committee meets in Q3 — the campaign window is open now." },
      history:      { score: 15, reason: "Three gifts over five years ($25K → $40K → $60K), trending up.", source: "Gift records" },
      philanthropy: { score: 13 },
    },
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
  },

  // Green Sheet scoreboard.
  greenSheet: {
    visits:     { value: 4, goal: 5, label: "Visits this week" },
    asks:       { value: 3, goal: 6, label: "Asks this month" },
    followups:  { value: 11, goal: 12, label: "Follow-ups on time" },
    streak: 6,
  },
};
