// 95 Forward — the Scorecards seed (Initiative 31).
//
// THE SCORECARDS HERE ARE AUTHORED, NOT GENERATED. The seed must run key-free in a DigitalOcean
// console and produce byte-identical results every time, so nothing in this file calls a model.
// Every rationale and every quote was written against its transcript by hand, because a
// stakeholder is going to read them and a fixture that falls apart on close reading is worse than
// no fixture.
//
// The two numbers that are NOT authored are the section scores and the overall score. Those are
// computed here by `aggregateScorecard` — the same function the pipeline uses — so a seeded
// Scorecard can never disagree with the product's own arithmetic. Hardcoding them would create a
// second source of truth for the one thing this feature is judged on.
//
// WAR-ROOM INVARIANCE. This module adds rows to the new I31 tables and sets `users.manager_id`.
// It creates no users, touches no opportunity, no milestone, no event and no goal. The Board, the
// Forecast Room, coverage and the BMW curve read none of these tables, so every war-room figure is
// identical before and after — asserted by `seed.test.ts` and by `pnpm --filter @95forward/db
// verify`.

import { eq } from "drizzle-orm";
import {
  aggregateScorecard,
  type CriterionResultInput,
  type CriterionType,
  type MeetingSourceType,
  type ScorecardDefinitionSnapshot,
} from "@95forward/shared";
import type { Database } from "./client";
import { users } from "./schema/users";
import {
  criterionResults,
  meetingTypes,
  meetings,
  scorecardCriteria,
  scorecardCriterionOptions,
  scorecardDefinitions,
  scorecardSections,
  scorecards,
} from "./schema/scorecards";
import { stableId } from "./seed-records-core";
import { DEMO_TODAY } from "./demo-clock";
import {
  BLUE_MESA_CATCHUP_NOTES,
  CEDAR_HOLLOW_ASK_TRANSCRIPT,
  HALLWORTH_ASK_TRANSCRIPT,
  HOLLOWAY_DISCOVERY_NOTES,
  OSGOOD_FOLLOWUP_NOTES,
  RIDGEWAY_DISCOVERY_TRANSCRIPT,
  VEGA_DISCOVERY_TRANSCRIPT,
  WILLOW_CREEK_DISCOVERY_TRANSCRIPT,
} from "./seed-scorecards-content";

const DAY = 24 * 60 * 60 * 1000;

/** Marks an audit row as authored fixture data rather than anything a model produced. */
const AUTHORED = "seed:authored";

type Rep = "dana" | "priya";

const REP_EMAIL: Record<Rep, string> = {
  dana: "dana.reese@waterforpeople.org",
  priya: "priya.nair@waterforpeople.org",
};
const MANAGER_EMAIL = "ruth.castellanos@waterforpeople.org";

// =================================================================================================
// Meeting Types
//
// The descriptions are written FOR A MODEL. They describe what such a meeting CONTAINS, and they
// deliberately avoid leaning on the words "discovery" and "ask" — a classifier that separates them
// on the appearance of the word "ask" would misfile every discovery visit in which someone says
// "can I ask you something".
// =================================================================================================

interface MeetingTypeSeed {
  key: string;
  name: string;
  description: string;
  isFallback: boolean;
}

const MEETING_TYPES: MeetingTypeSeed[] = [
  {
    key: "discovery",
    name: "Discovery Visit",
    isFallback: true,
    description: [
      "An early relationship conversation whose purpose is to learn rather than to request.",
      "The fundraiser is trying to understand why this person or institution cares about the cause,",
      "what they have funded before and how it went, which part of the organisation's work holds",
      "their attention, who else shapes their decisions, and what they would need to see to go",
      "further. Money may be discussed in general terms — whether they could see themselves",
      "supporting the work at a meaningful level — but no figure is requested and no proposal is on",
      "the table. The conversation ranges across history, motivation and relationships rather than",
      "converging on a decision. Typical signals: open questions about motivation and past giving,",
      "the prospect doing a large share of the talking, agreement to send material or meet again,",
      "and the fundraiser explicitly deferring the question of an amount.",
    ].join(" "),
  },
  {
    key: "ask",
    name: "Ask Visit",
    isFallback: false,
    description: [
      "A conversation in which a specific level of support is requested or negotiated. A figure, a",
      "range, or a named piece of work with a price attached is put in front of the prospect and a",
      "decision — now or on an agreed timetable — is sought. The conversation converges: it moves",
      "from the case for support to the size of the commitment, to who must approve it and by when,",
      "and to the reasons it might not happen. Typical signals: a stated amount or range, a named",
      "programme or priority the money would fund, the prospect responding to a proposition rather",
      "than being interviewed, discussion of approval processes, committee dates or budget cycles,",
      "and an outcome — agreement, refusal, or a defined path to a later decision. A meeting that",
      "revisits a request already made, or that chases one, also belongs here even if no new figure",
      "is named.",
    ].join(" "),
  },
];

// =================================================================================================
// Scorecard Definitions
//
// Grounded in the For Impact methodology the product is built on: discovery is three questions and
// a dialogue, and an ask is a number on the table tied to a priority, followed by silence.
//
// Every section, criterion and option id is derived from a STABLE KEY, so re-running the seed after
// a wording change keeps the ids — which is what lets coaching aggregate a criterion across reps
// and over time once I33 exists.
// =================================================================================================

interface OptionSeed {
  key: string;
  label: string;
  description: string;
}

interface CriterionSeed {
  key: string;
  type: CriterionType;
  prompt: string;
  guidance?: string;
  options?: OptionSeed[];
}

interface SectionSeed {
  key: string;
  title: string;
  description?: string;
  criteria: CriterionSeed[];
}

interface DefinitionSeed {
  key: string;
  name: string;
  meetingTypeKey: string;
  sections: SectionSeed[];
}

const DEFINITIONS: DefinitionSeed[] = [
  {
    key: "discovery",
    name: "Discovery Visit Scorecard",
    meetingTypeKey: "discovery",
    sections: [
      {
        key: "discovery",
        title: "Discovery",
        description: "The three questions a discovery visit exists to ask.",
        criteria: [
          {
            key: "why-involved",
            type: "boolean",
            prompt:
              "Did the fundraiser ask why the prospect is involved with — or cares about — the cause?",
            guidance:
              "A direct question about motivation, history or connection to the work. Accepting an explanation the prospect volunteers is not the same as asking for it.",
          },
          {
            key: "which-priority",
            type: "boolean",
            prompt:
              "Did the fundraiser ask which of the organisation's priorities or initiatives matters most to the prospect?",
            guidance:
              "The fundraiser asks the prospect to choose or rank. Presenting several priorities and watching which one lands does not count.",
          },
          {
            key: "could-help-fund",
            type: "boolean",
            prompt:
              "Did the fundraiser ask whether the prospect could see themselves helping to fund the vision?",
            guidance:
              "The money question asked in principle, not an amount. The question must come from the fundraiser; the prospect raising it themselves does not count.",
          },
        ],
      },
      {
        key: "dialogue",
        title: "Dialogue",
        description: "Whether it was a conversation or a presentation.",
        criteria: [
          {
            key: "kept-dialogue",
            type: "score",
            prompt:
              "How well did the fundraiser keep this a dialogue — short stretches of presenting followed by questions, with the prospect talking at least as much as the fundraiser?",
            guidance:
              "Judge from the balance and length of turns and from how often a stretch of presenting ends in a question. 1 is a conversation the prospect led; 0 is an uninterrupted briefing.",
          },
          {
            key: "avoided-objections",
            type: "score",
            prompt:
              "How well did the fundraiser avoid raising objections, risks or concerns that the prospect had not raised?",
            guidance:
              "Pre-emptively apologising for cost, overheads, sector reputation or timing counts against this. Answering a concern the prospect actually raised does not.",
          },
        ],
      },
      {
        key: "next-step",
        title: "Next step",
        description: "What the visit produced.",
        criteria: [
          {
            key: "dated-next-step",
            type: "boolean",
            prompt:
              "Did the fundraiser secure a specific, dated next step before the meeting ended?",
            guidance:
              "A named date or a definite slot. 'I'll call in a few weeks' and 'let me know when you're next in town' are not dated next steps.",
          },
          {
            key: "asked-referral",
            type: "boolean",
            prompt:
              "Did the fundraiser ask the prospect to suggest someone else who should be in this conversation?",
          },
          {
            key: "outcome",
            type: "classification",
            prompt: "What did this visit actually produce?",
            options: [
              {
                key: "next-visit-booked",
                label: "Next visit booked",
                description:
                  "A further meeting was agreed with a specific date or slot before the conversation ended.",
              },
              {
                key: "referral-obtained",
                label: "Referral obtained",
                description:
                  "The prospect named a specific person to approach, and no dated next meeting was agreed.",
              },
              {
                key: "not-interested",
                label: "Not interested",
                description:
                  "The prospect indicated they do not wish to take the relationship further.",
              },
              {
                key: "other",
                label: "Other",
                description:
                  "The conversation ended without a dated next meeting, a named referral, or a refusal — most often a vague agreement to stay in touch, or material promised with no date attached.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "ask",
    name: "Ask Visit Scorecard",
    meetingTypeKey: "ask",
    sections: [
      {
        key: "the-ask",
        title: "The ask",
        description: "Whether a real request was actually made.",
        criteria: [
          {
            key: "specific-amount",
            type: "boolean",
            prompt:
              "Was a specific amount or range stated — numbers on the table?",
            guidance:
              "A figure the prospect could repeat back. 'A significant commitment' and 'something meaningful' are not numbers.",
          },
          {
            key: "tied-to-initiative",
            type: "boolean",
            prompt:
              "Was the request tied to a specific initiative, programme or priority rather than to the organisation in general?",
          },
          {
            key: "framing",
            type: "classification",
            prompt: "How was the request framed in time?",
            options: [
              {
                key: "today",
                label: "Today — current programmes",
                description:
                  "The money funds work already under way, within the current year or cycle.",
              },
              {
                key: "tomorrow",
                label: "Tomorrow — multi-year priority",
                description:
                  "The money funds a commitment that runs over several years, and the multi-year shape was argued for explicitly.",
              },
              {
                key: "forever",
                label: "Forever — legacy",
                description:
                  "The money is endowment, planned or legacy giving, intended to outlast the donor's involvement.",
              },
              {
                key: "not-framed",
                label: "Not framed",
                description:
                  "No timeframe was attached to the request, or no request was made at all.",
              },
            ],
          },
        ],
      },
      {
        key: "dialogue",
        title: "Dialogue",
        description: "What the fundraiser did after asking.",
        criteria: [
          {
            key: "let-them-respond",
            type: "score",
            prompt:
              "After making the request, how well did the fundraiser let the prospect respond rather than filling the silence?",
            guidance:
              "Immediately qualifying, softening or restating the ask counts against this. Yielding the floor — including when the prospect interrupts — counts for it.",
          },
          {
            key: "explored-objections",
            type: "score",
            prompt:
              "How well were objections explored with questions before being answered?",
            guidance:
              "Asking what is behind a concern, or whether it is the real one, scores high. Answering a stated objection immediately with a counter-argument scores low.",
          },
        ],
      },
      {
        key: "close",
        title: "Close",
        description: "Where it was left.",
        criteria: [
          {
            key: "outcome",
            type: "classification",
            prompt: "How did the request end?",
            options: [
              {
                key: "commitment",
                label: "Commitment",
                description:
                  "The prospect agreed to give, in principle or in full, at a stated level.",
              },
              {
                key: "decline",
                label: "Decline",
                description:
                  "The prospect said no to this request. A clear refusal, even a warm one.",
              },
              {
                key: "roadmap",
                label: "Roadmap — agreed path to a decision",
                description:
                  "No decision was given, but a concrete path to one was agreed: what has to happen, who decides, and roughly when.",
              },
              {
                key: "no-ask-made",
                label: "No ask made",
                description:
                  "The meeting happened but no request was put to the prospect, including a meeting that only revisited or chased a request made earlier.",
              },
            ],
          },
          {
            key: "follow-up-timeframe",
            type: "boolean",
            prompt: "Was a follow-up agreed with a timeframe attached?",
            guidance:
              "A date, a week, or a named trigger ('once the committee meets, by the end of July'). 'I'll be in touch' is not a timeframe.",
          },
        ],
      },
    ],
  },
];

// =================================================================================================
// Meetings and their authored Scorecards
// =================================================================================================

interface ResultSeed {
  /** `section-key/criterion-key` — resolved to stable ids below. */
  criterion: string;
  determinable: boolean;
  value?: boolean | number | string;
  rationale: string;
  /** MUST be a verbatim substring of the meeting content. `seed.test.ts` asserts every one. */
  quote?: string;
}

interface MeetingSeed {
  key: string;
  rep: Rep;
  /** Exactly one of these. */
  opportunityKey?: string;
  prospectKey?: string;
  /** Days before the demo anchor. */
  daysAgo: number;
  sourceType: MeetingSourceType;
  content: string;
  definitionKey: string;
  usedFallback: boolean;
  classificationRationale: string;
  results: ResultSeed[];
  /** Why this record is in the seed. Read before changing one. */
  role: string;
}

const MEETINGS: MeetingSeed[] = [
  // -- The strong discovery visit ---------------------------------------------------------------
  {
    key: "vega-discovery",
    rep: "dana",
    opportunityKey: "vega-forever-promise",
    daysAgo: 16,
    sourceType: "transcript",
    content: VEGA_DISCOVERY_TRANSCRIPT,
    definitionKey: "discovery",
    usedFallback: false,
    classificationRationale:
      "The conversation is almost entirely questions about motivation, past giving and who else decides, and the fundraiser explicitly declines to name an amount. No proposal is on the table.",
    role: "The manager comparison's upper half: what a discovery visit looks like done well.",
    results: [
      {
        criterion: "discovery/why-involved",
        determinable: true,
        value: true,
        rationale:
          "Asked directly and early, named as the question she had never put, and then left room for a long answer.",
        quote: "What pulled you into water in the first place?",
      },
      {
        criterion: "discovery/which-priority",
        determinable: true,
        value: true,
        rationale:
          "Asked the prospect to choose between the district work, the monitoring and the legacy side rather than presenting all three.",
        quote:
          "of everything we talk about, the district work, the monitoring, the legacy side, which of those actually holds your attention?",
      },
      {
        criterion: "discovery/could-help-fund",
        determinable: true,
        value: true,
        rationale:
          "The money question was asked in principle, explicitly without an amount, and with a stated willingness to hear no.",
        quote:
          "is this the kind of work you could see yourself helping to fund at a level that actually changes what we can commit to?",
      },
      {
        criterion: "dialogue/kept-dialogue",
        determinable: true,
        value: 0.9,
        rationale:
          "The prospect's turns are consistently the longer ones and the fundraiser's are mostly questions; the one stretch of presenting is four sentences and ends in an offer to send data.",
        quote: "Say more about that.",
      },
      {
        criterion: "dialogue/avoided-objections",
        determinable: true,
        value: 0.9,
        rationale:
          "No concern was introduced that the prospect had not raised. She named her own motive for raising the Forever Promise rather than letting it look accidental, which is candour, not an objection.",
        quote: "But I want to be careful not to sell it at you.",
      },
      {
        criterion: "next-step/dated-next-step",
        determinable: true,
        value: true,
        rationale:
          "A named date, a named place and a named third attendee, agreed in the room rather than left to email.",
        quote: "Thursday the fifteenth of October, here, with your daughter.",
      },
      {
        criterion: "next-step/asked-referral",
        determinable: true,
        value: true,
        rationale:
          "Asked for a name from the Women & Water group, accepted the refusal of a list, and secured one specific person plus permission to use her name.",
        quote:
          "is there anyone in it who you think should be having this conversation with us and is not?",
      },
      {
        criterion: "next-step/outcome",
        determinable: true,
        value: "next-visit-booked",
        rationale:
          "A dated meeting was agreed before the call ended. A referral was also obtained, which the referral criterion records separately.",
        quote: "Thursday works. Afternoon. Here.",
      },
    ],
  },

  // -- The middling discovery visit ------------------------------------------------------------
  {
    key: "ridgeway-discovery",
    rep: "priya",
    opportunityKey: "ridgeway-unrestricted",
    daysAgo: 23,
    sourceType: "transcript",
    content: RIDGEWAY_DISCOVERY_TRANSCRIPT,
    definitionKey: "discovery",
    usedFallback: false,
    classificationRationale:
      "Motivation, past board experience and which priority matters are all explored, and the fundraiser explicitly declines to name a figure. No proposal is on the table.",
    role:
      "The manager comparison's lower half — and deliberately NOT a disaster. A competent visit with two specific, fixable habits: she never asks why he is involved, and she talks for two minutes at a stretch. A scorecard that only separates excellent from catastrophic cannot coach anybody.",
    results: [
      {
        criterion: "discovery/why-involved",
        determinable: true,
        value: false,
        rationale:
          "Never asked. The one moment that invited it — his unprompted remark about reading the annual report — she answered by explaining her own organisation at length instead of asking what drew him to it.",
        quote:
          "Can I tell you where that changed? Because it is the thing I would most want you to understand about how we work now",
      },
      {
        criterion: "discovery/which-priority",
        determinable: true,
        value: true,
        rationale:
          "Asked well: named four things, asked him to choose between them, and explicitly ruled out the dutiful answer — which is what produced an honest one.",
        quote:
          "Of those, which one actually holds your attention? Not which one you think you ought to pick.",
      },
      {
        criterion: "discovery/could-help-fund",
        determinable: true,
        value: true,
        rationale:
          "The money question was put in principle, without a figure, and with a stated willingness to hear no.",
        quote:
          "is this the kind of work you could see yourself supporting at a level that would actually change what we are able to commit to?",
      },
      {
        criterion: "dialogue/kept-dialogue",
        determinable: true,
        value: 0.35,
        rationale:
          "Two monologues of roughly two minutes each dominate the middle of the conversation, and the prospect's reply to the first is three words. The exchanges either side of them are genuinely two-way, which is why this is not lower.",
        quote: "That is a lot.",
      },
      {
        criterion: "dialogue/avoided-objections",
        determinable: true,
        value: 0.75,
        rationale:
          "Largely clean — she gave him permission to decline rather than arguing pre-emptively. One wobble: she volunteered that this is the hardest thing to fundraise for, a difficulty he had not raised.",
        quote: "it is also, I should say, the single hardest thing to fundraise for",
      },
      {
        criterion: "next-step/dated-next-step",
        determinable: true,
        value: false,
        rationale:
          "The close was left entirely open. Material was promised, a further conversation was agreed in principle, and no date, slot or trigger was attached to either.",
        quote: "Yes. Let us see where the house is by then.",
      },
      {
        criterion: "next-step/asked-referral",
        determinable: true,
        value: false,
        rationale:
          "Nobody outside the room was discussed. He mentioned sitting on two boards — an open door to the question — and it went unremarked.",
        quote: "Good. Thank you, Priya. This was more interesting than I expected.",
      },
      {
        criterion: "next-step/outcome",
        determinable: true,
        value: "other",
        rationale:
          "Written material was promised and a further conversation agreed, but no date was fixed and no name was given.",
        quote: "I will send it through and we will go from there.",
      },
    ],
  },

  // -- The ask that ended in a roadmap ----------------------------------------------------------
  {
    key: "hallworth-ask",
    rep: "dana",
    opportunityKey: "hallworth-kamuli",
    daysAgo: 92,
    sourceType: "transcript",
    content: HALLWORTH_ASK_TRANSCRIPT,
    definitionKey: "ask",
    usedFallback: false,
    classificationRationale:
      "A figure is named in the second minute, tied to a specific programme, and the rest of the conversation is about who approves it and by when.",
    role: "The flagship ask. Dated to match the `specific ask made` milestone on the Hallworth record.",
    results: [
      {
        criterion: "the-ask/specific-amount",
        determinable: true,
        value: true,
        rationale:
          "A single figure, stated plainly, with the multi-year shape attached to it, and repeated back by the prospect.",
        quote: "Two hundred and fifty thousand dollars over three years.",
      },
      {
        criterion: "the-ask/tied-to-initiative",
        determinable: true,
        value: true,
        rationale:
          "Tied to the final phase of one named district programme, with the funded and unfunded portions stated before the figure.",
        quote:
          "I would like the Hallworth Family Foundation to be the commitment that makes the last phase of Kamuli certain rather than probable.",
      },
      {
        criterion: "the-ask/framing",
        determinable: true,
        value: "tomorrow",
        rationale:
          "The multi-year shape was argued for explicitly, as the difference between funding construction and funding what comes after it.",
        quote:
          "A single-year gift funds construction. Three years funds the thing after construction, which is where this work usually dies.",
      },
      {
        criterion: "dialogue/let-them-respond",
        determinable: true,
        value: 0.8,
        rationale:
          "The ask was followed by a two-word sentence and then silence; when the size was challenged she confirmed it rather than softening it. She did volunteer a consequence of a 'no' before being asked for one.",
        quote: "It is roughly five times larger.",
      },
      {
        criterion: "dialogue/explored-objections",
        determinable: true,
        value: 0.75,
        rationale:
          "The board-timetable obstacle was turned into a question about what would change it, and the 'water is solved' objection was handed back rather than argued with — after one reflexive contradiction.",
        quote: "No. What would win it?",
      },
      {
        criterion: "close/outcome",
        determinable: true,
        value: "roadmap",
        rationale:
          "No decision, but a defined path: a paper by a stated date, circulated ahead of a named board meeting, with a call in between. The prospect named it as such.",
        quote: "I should be clear that this is a path, not a promise.",
      },
      {
        criterion: "close/follow-up-timeframe",
        determinable: true,
        value: true,
        rationale:
          "Two timeframes were agreed in the room — the paper by the end of July, and a call in the third week of August.",
        quote: "Get me the paper by the end of July.",
      },
    ],
  },

  // -- The ask that was declined. Prospect-linked, deliberately. --------------------------------
  {
    key: "cedar-hollow-ask",
    rep: "priya",
    prospectKey: "cedarhollow-bolivia",
    daysAgo: 38,
    sourceType: "transcript",
    content: CEDAR_HOLLOW_ASK_TRANSCRIPT,
    definitionKey: "ask",
    usedFallback: false,
    classificationRationale:
      "A named figure for a named programme, put to a giving committee, with the conversation converging on whether they will fund it. It ends in a decision.",
    role:
      "The decline, and the one prospect-linked meeting. Linked to the PROSPECT rather than the live Bolivia opportunity on purpose: the request declined here is a separate, parallel one, and the Bolivia record on the board is untouched by it.",
    results: [
      {
        criterion: "the-ask/specific-amount",
        determinable: true,
        value: true,
        rationale: "A single figure named in the first minute, and repeated by the prospect.",
        quote: "For the piece I would want Cedar Hollow to take, sixty thousand dollars.",
      },
      {
        criterion: "the-ask/tied-to-initiative",
        determinable: true,
        value: true,
        rationale:
          "Tied to two named sub-counties within one district programme, with what the money completes and when stated.",
        quote:
          "That funds the final push in the two sub-counties that are still uncovered, and it closes this calendar year rather than running on.",
      },
      {
        criterion: "the-ask/framing",
        determinable: true,
        value: "today",
        rationale:
          "Explicitly framed as a single-year request against work already under way, and explicitly ruled out as a multi-year one.",
        quote:
          "And I am asking for it this year specifically, because Kamuli ends this year.",
      },
      {
        criterion: "dialogue/let-them-respond",
        determinable: true,
        value: 0.7,
        rationale:
          "The prospect interrupted before the case was finished and the fundraiser yielded immediately rather than completing the pitch, then absorbed the refusal without restating the ask.",
        quote: "Can I stop you there, Priya, because I think it is kinder to.",
      },
      {
        criterion: "dialogue/explored-objections",
        determinable: true,
        value: 0.85,
        rationale:
          "Asked whether the stated obstacle was the real one, which surfaced a second and more serious objection about concentration that would not otherwise have been said out loud.",
        quote:
          "Can I ask whether that is the only obstacle, or whether it is the convenient one?",
      },
      {
        criterion: "close/outcome",
        determinable: true,
        value: "decline",
        rationale:
          "An explicit refusal of this request, given plainly at the fundraiser's invitation so that nothing was left ambiguous.",
        quote: "Cedar Hollow is not going to fund Kamuli.",
      },
      {
        criterion: "close/follow-up-timeframe",
        determinable: true,
        value: false,
        rationale:
          "Nothing was agreed for this request. The fundraiser tested a later cycle, accepted that the programme's end date closes it, and stopped.",
        quote: "Then the question does not really arise.",
      },
    ],
  },

  // -- Notes only, sparse: several criteria genuinely cannot be judged --------------------------
  {
    key: "holloway-discovery",
    rep: "dana",
    opportunityKey: "holloway-kamuli",
    daysAgo: 68,
    sourceType: "notes",
    content: HOLLOWAY_DISCOVERY_NOTES,
    definitionKey: "discovery",
    usedFallback: false,
    classificationRationale:
      "A first conversation about history and motivation with money explicitly deferred. No figure and no proposal.",
    role:
      "The sparse-notes case. Three criteria are not determinable, and the system must not read that as failure. Dated to the record's last logged contact so the board's silence counter stays true.",
    results: [
      {
        criterion: "discovery/why-involved",
        determinable: true,
        value: true,
        rationale:
          "The notes record the question being put and the answer given, which is enough to say it was asked.",
        quote: "Asked what pulled her towards us specifically",
      },
      {
        criterion: "discovery/which-priority",
        determinable: false,
        rationale:
          "The notes do not record any question about which part of the work matters most to her, and do not say that none was asked. Absence from a note is not absence from the room.",
      },
      {
        criterion: "discovery/could-help-fund",
        determinable: true,
        value: false,
        rationale:
          "Stated explicitly, and with a reason. The fundraiser chose not to raise it rather than failing to get to it.",
        quote: "Didn't get to money.",
      },
      {
        criterion: "dialogue/kept-dialogue",
        determinable: false,
        rationale:
          "Notes cannot show the balance of talking. There is nothing here to judge the shape of the conversation from.",
      },
      {
        criterion: "dialogue/avoided-objections",
        determinable: false,
        rationale:
          "The notes record no concerns raised in either direction, which says nothing either way about whether any were.",
      },
      {
        criterion: "next-step/dated-next-step",
        determinable: true,
        value: false,
        rationale: "Stated outright, with the vague alternative recorded in the next line.",
        quote: "No next date.",
      },
      {
        criterion: "next-step/asked-referral",
        determinable: true,
        value: false,
        rationale:
          "The notes name the connector, say the introduction was not asked for, and record the fundraiser's own view of that.",
        quote: "Didn't ask Clara about an introduction, which I'm now kicking myself about.",
      },
      {
        criterion: "next-step/outcome",
        determinable: true,
        value: "other",
        rationale:
          "No date, no name, no refusal — an intention to call back at some point in the next few weeks.",
        quote: "Said I'd call in a few weeks.",
      },
    ],
  },

  // -- Notes only: an ask-type meeting where no ask was made ------------------------------------
  {
    key: "osgood-followup",
    rep: "priya",
    opportunityKey: "osgood-bolivia",
    daysAgo: 30,
    sourceType: "notes",
    content: OSGOOD_FOLLOWUP_NOTES,
    definitionKey: "ask",
    usedFallback: false,
    classificationRationale:
      "A call about the status of a request already made, with a named figure in play. A meeting that chases an existing ask belongs to this type even though no new figure was named.",
    role:
      "The second notes-only record, and the `No ask made` outcome. Dated after the record's close date has already passed, which is what the call is about.",
    results: [
      {
        criterion: "the-ask/specific-amount",
        determinable: true,
        value: false,
        rationale:
          "Stated explicitly, with the reasoning. No number was put on the table in this conversation.",
        quote: "Didn't re-ask or put a new number on the table.",
      },
      {
        criterion: "the-ask/tied-to-initiative",
        determinable: false,
        rationale:
          "No request was made in this meeting, so there is nothing to tie to an initiative. The earlier request this call chases is a different record.",
      },
      {
        criterion: "the-ask/framing",
        determinable: true,
        value: "not-framed",
        rationale:
          "No request was made, so no timeframe was attached to one. The call was about the status of an existing proposal.",
        quote:
          "Purpose was to find out where the Bolivia proposal actually sits, since the date we'd been working to has come and gone.",
      },
      {
        criterion: "dialogue/let-them-respond",
        determinable: false,
        rationale:
          "No request was made, so there was no silence to hold. This criterion has nothing to judge.",
      },
      {
        criterion: "dialogue/explored-objections",
        determinable: true,
        value: 0.75,
        rationale:
          "The notes record the real reason for the delay being surfaced and separated from the merits of the proposal, rather than the delay being argued with.",
        quote: "The paper is fine, the process failed it.",
      },
      {
        criterion: "close/outcome",
        determinable: true,
        value: "no-ask-made",
        rationale:
          "An existing request was chased, not re-made, and the notes record the decision not to re-make it as deliberate.",
        quote:
          "re-asking for the same $180,000 when the issue is their internal process would have landed as pressure",
      },
      {
        criterion: "close/follow-up-timeframe",
        determinable: true,
        value: true,
        rationale:
          "A named interval and a named trigger: two weeks, then chase, with the committee date as the thing being waited on.",
        quote: "I said I'd leave it two weeks and then chase.",
      },
    ],
  },

  // -- The one the classifier cannot place ------------------------------------------------------
  {
    key: "bluemesa-catchup",
    rep: "dana",
    opportunityKey: "bluemesa-unrestricted",
    daysAgo: 5,
    sourceType: "notes",
    content: BLUE_MESA_CATCHUP_NOTES,
    definitionKey: "discovery",
    usedFallback: true,
    classificationRationale:
      "No fit. There is no discovery in this record and no request in it — it is a logistics call about a countersignature and a diary change. The organisation's fallback type was used.",
    role:
      "The fallback case, and the all-not-determinable case. The overall score is NULL, not zero: nothing about the fundraiser's craft can be read from five lines about a countersigned letter, and a confident number here would be a lie.",
    results: [
      {
        criterion: "discovery/why-involved",
        determinable: false,
        rationale: "A logistics note. Nothing about motivation was recorded or implied.",
      },
      {
        criterion: "discovery/which-priority",
        determinable: false,
        rationale: "No priorities were discussed in anything the note records.",
      },
      {
        criterion: "discovery/could-help-fund",
        determinable: false,
        rationale:
          "The note concerns an agreement already reached. Nothing here speaks to whether a funding question was asked.",
      },
      {
        criterion: "dialogue/kept-dialogue",
        determinable: false,
        rationale: "Four lines of bullet points cannot show the shape of a conversation.",
      },
      {
        criterion: "dialogue/avoided-objections",
        determinable: false,
        rationale: "No concerns of any kind appear in the note.",
      },
      {
        criterion: "next-step/dated-next-step",
        determinable: false,
        rationale:
          "A diary move is recorded, but the note does not say whether a next step was secured in this call or simply rescheduled in it.",
      },
      {
        criterion: "next-step/asked-referral",
        determinable: false,
        rationale: "Nothing in the note bears on this.",
      },
      {
        criterion: "next-step/outcome",
        determinable: true,
        value: "other",
        rationale:
          "Not a booked visit, not a referral and not a refusal — an administrative call about an outstanding countersignature.",
        quote: "Chasing the countersigned letter.",
      },
    ],
  },

  // -- Mid-range: good in parts ------------------------------------------------------------------
  {
    key: "willowcreek-discovery",
    rep: "priya",
    opportunityKey: "willowcreek-kamuli",
    daysAgo: 74,
    sourceType: "transcript",
    content: WILLOW_CREEK_DISCOVERY_TRANSCRIPT,
    definitionKey: "discovery",
    usedFallback: false,
    classificationRationale:
      "An introductory meeting with no proposal and an explicit refusal to name a figure. The content is motivation, giving history and what they would need to see.",
    role:
      "The middle of the distribution. Two reps at the extremes is a comparison; a third in between is a scale.",
    results: [
      {
        criterion: "discovery/why-involved",
        determinable: true,
        value: true,
        rationale:
          "Opened on the shape of their giving and asked how it came about, which produced the founding story unprompted.",
        quote:
          "Your giving is unusually split — clean water and girls' education, and not much else. How did that come about?",
      },
      {
        criterion: "discovery/which-priority",
        determinable: true,
        value: true,
        rationale:
          "Asked what would count as success for them, and followed it with a question about why the two halves of their giving have never been funded together.",
        quote: "What would change the arithmetic?",
      },
      {
        criterion: "discovery/could-help-fund",
        determinable: true,
        value: false,
        rationale:
          "The funding question was put by the prospect, not by the fundraiser, who then declined to answer it with a figure. Useful restraint, but the question was not hers.",
        quote: "What would you want from us, in an ideal world?",
      },
      {
        criterion: "dialogue/kept-dialogue",
        determinable: true,
        value: 0.8,
        rationale:
          "Mostly short prompts against long answers, with one genuine piece of pushback. The fundraiser's longest turn is three sentences.",
        quote: "Can you say how?",
      },
      {
        criterion: "dialogue/avoided-objections",
        determinable: true,
        value: 0.55,
        rationale:
          "Raised the timing problem unprompted and offered a reason not to proceed before the prospect had raised one. Disagreeing with their analysis of hardware is not the same fault and is not counted here.",
        quote:
          "It is, and I do not want to manufacture urgency out of our calendar.",
      },
      {
        criterion: "next-step/dated-next-step",
        determinable: true,
        value: false,
        rationale:
          "The next step is contingent on a document being written and then read, with the slot to be found afterwards. No date exists.",
        quote: "Send it to me and I will find you a slot once Mother has read it.",
      },
      {
        criterion: "next-step/asked-referral",
        determinable: true,
        value: false,
        rationale:
          "Nobody outside the room was discussed and no referral was sought before the meeting closed.",
        quote: "Thank you both. This was a better conversation than I expected",
      },
      {
        criterion: "next-step/outcome",
        determinable: true,
        value: "other",
        rationale:
          "Written material was requested and a slot was promised once it is read, but no date was fixed and no name was given.",
        quote: "Write it. Nadia handles the diary.",
      },
    ],
  },
];

// =================================================================================================
// Writing it
// =================================================================================================

const sectionId = (definitionKey: string, sectionKey: string): string =>
  stableId(`scorecard-section:${definitionKey}:${sectionKey}`);
const criterionId = (definitionKey: string, sectionKey: string, key: string): string =>
  stableId(`scorecard-criterion:${definitionKey}:${sectionKey}:${key}`);
const optionId = (
  definitionKey: string,
  sectionKey: string,
  criterionKey: string,
  key: string,
): string => stableId(`scorecard-option:${definitionKey}:${sectionKey}:${criterionKey}:${key}`);

export async function seedScorecards(
  db: Database,
  tenantId: string,
  anchor: Date = DEMO_TODAY,
): Promise<void> {
  const userRows = await db.query.users.findMany({ where: eq(users.tenantId, tenantId) });
  const idByEmail = new Map(userRows.map((row) => [row.email, row.id]));
  const managerId = idByEmail.get(MANAGER_EMAIL);
  const repIds: Record<Rep, string | undefined> = {
    dana: idByEmail.get(REP_EMAIL.dana),
    priya: idByEmail.get(REP_EMAIL.priya),
  };

  // ---- The one-level hierarchy ---------------------------------------------------------------
  //
  // Ruth Castellanos, the seeded Chief Development Officer, becomes the manager of the two gift
  // officers. NO NEW USER IS CREATED: a manager-shaped user already existed, she owns no
  // opportunities and no prospects, and inventing a second one would have changed the user count
  // the seed test asserts for no gain. See the report.
  if (managerId !== undefined) {
    for (const rep of ["dana", "priya"] as Rep[]) {
      const repId = repIds[rep];
      if (repId === undefined) continue;
      await db.update(users).set({ managerId }).where(eq(users.id, repId));
    }
  }

  // ---- Meeting Types --------------------------------------------------------------------------
  //
  // The fallback is cleared first. The partial unique index is checked per statement, so writing a
  // second fallback before clearing the first would fail where this cannot.
  for (const type of MEETING_TYPES) {
    const id = stableId(`meeting-type:${type.key}`);
    const values = {
      tenantId,
      name: type.name,
      description: type.description,
      isFallback: false,
    };
    await db
      .insert(meetingTypes)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: meetingTypes.id, set: values });
  }
  for (const type of MEETING_TYPES) {
    if (!type.isFallback) continue;
    await db
      .update(meetingTypes)
      .set({ isFallback: true })
      .where(eq(meetingTypes.id, stableId(`meeting-type:${type.key}`)));
  }

  // ---- Definitions, sections, criteria, options ------------------------------------------------
  for (const definition of DEFINITIONS) {
    const definitionDbId = stableId(`scorecard-definition:${definition.key}`);
    const definitionValues = {
      tenantId,
      name: definition.name,
      meetingTypeId: stableId(`meeting-type:${definition.meetingTypeKey}`),
      isActive: true,
    };
    await db
      .insert(scorecardDefinitions)
      .values({ id: definitionDbId, ...definitionValues })
      .onConflictDoUpdate({ target: scorecardDefinitions.id, set: definitionValues });

    for (const [si, section] of definition.sections.entries()) {
      const sectionDbId = sectionId(definition.key, section.key);
      const sectionValues = {
        tenantId,
        definitionId: definitionDbId,
        title: section.title,
        description: section.description ?? null,
        sortOrder: si,
      };
      await db
        .insert(scorecardSections)
        .values({ id: sectionDbId, ...sectionValues })
        .onConflictDoUpdate({ target: scorecardSections.id, set: sectionValues });

      for (const [ci, criterion] of section.criteria.entries()) {
        const criterionDbId = criterionId(definition.key, section.key, criterion.key);
        const criterionValues = {
          tenantId,
          sectionId: sectionDbId,
          type: criterion.type,
          prompt: criterion.prompt,
          guidance: criterion.guidance ?? null,
          sortOrder: ci,
        };
        await db
          .insert(scorecardCriteria)
          .values({ id: criterionDbId, ...criterionValues })
          .onConflictDoUpdate({ target: scorecardCriteria.id, set: criterionValues });

        for (const [oi, option] of (criterion.options ?? []).entries()) {
          const optionValues = {
            tenantId,
            criterionId: criterionDbId,
            label: option.label,
            description: option.description,
            sortOrder: oi,
          };
          await db
            .insert(scorecardCriterionOptions)
            .values({
              id: optionId(definition.key, section.key, criterion.key, option.key),
              ...optionValues,
            })
            .onConflictDoUpdate({ target: scorecardCriterionOptions.id, set: optionValues });
        }
      }
    }
  }

  // ---- Meetings and their Scorecards -----------------------------------------------------------
  const snapshots = new Map<string, ScorecardDefinitionSnapshot>(
    DEFINITIONS.map((definition) => [definition.key, snapshotOf(definition)]),
  );

  for (const meeting of MEETINGS) {
    const reportedBy = repIds[meeting.rep];
    if (reportedBy === undefined) continue;

    const meetingDbId = stableId(`meeting:${meeting.key}`);
    const meetingValues = {
      tenantId,
      occurredAt: new Date(anchor.getTime() - meeting.daysAgo * DAY),
      reportedBy,
      sourceType: meeting.sourceType,
      content: meeting.content,
      opportunityId:
        meeting.opportunityKey === undefined
          ? null
          : stableId(`forward-opportunity:${meeting.opportunityKey}`),
      prospectId:
        meeting.prospectKey === undefined ? null : stableId(`prospect:${meeting.prospectKey}`),
    };
    await db
      .insert(meetings)
      .values({ id: meetingDbId, ...meetingValues })
      .onConflictDoUpdate({ target: meetings.id, set: meetingValues });

    const definition = DEFINITIONS.find((d) => d.key === meeting.definitionKey);
    const snapshot = snapshots.get(meeting.definitionKey);
    if (definition === undefined || snapshot === undefined) {
      throw new Error(`seedScorecards: unknown definition "${meeting.definitionKey}"`);
    }

    const results = meeting.results.map((result) =>
      resolveResult(definition, meeting, result),
    );
    // Computed, never authored. Same function the pipeline uses, so a seeded Scorecard cannot
    // disagree with a generated one about what its own numbers mean.
    const aggregate = aggregateScorecard(snapshot, results);

    const scorecardDbId = stableId(`scorecard:${meeting.key}`);
    const scorecardValues = {
      tenantId,
      meetingId: meetingDbId,
      definitionSnapshot: snapshot,
      definitionId: stableId(`scorecard-definition:${definition.key}`),
      meetingTypeId: stableId(`meeting-type:${definition.meetingTypeKey}`),
      classificationRationale: meeting.classificationRationale,
      usedFallback: meeting.usedFallback,
      meetingTypeOverriddenBy: null,
      status: "ready" as const,
      failureReason: null,
      overallScore: aggregate.overallScore === null ? null : aggregate.overallScore.toFixed(4),
      sectionScores: aggregate.sectionScores,
      // Authored, not generated — and the audit columns say so rather than inventing a model id
      // and a plausible token count.
      classifyModel: AUTHORED,
      scoreModel: AUTHORED,
      promptVersion: null,
      classifyLatencyMs: null,
      scoreLatencyMs: null,
      classifyInputTokens: null,
      classifyOutputTokens: null,
      scoreInputTokens: null,
      scoreOutputTokens: null,
      scoredAt: meetingValues.occurredAt,
    };
    await db
      .insert(scorecards)
      .values({ id: scorecardDbId, ...scorecardValues })
      .onConflictDoUpdate({ target: scorecards.id, set: scorecardValues });

    for (const result of results) {
      const values = {
        tenantId,
        scorecardId: scorecardDbId,
        criterionId: result.criterionId,
        sectionId: result.sectionId,
        criterionType: result.criterionType,
        determinable: result.determinable,
        booleanValue: result.booleanValue,
        scoreValue: result.scoreValue === null ? null : result.scoreValue.toFixed(4),
        optionId: result.optionId,
        rationale: result.rationale,
        evidenceQuote: result.evidenceQuote,
        // Every authored quote is a verbatim substring of its own content — asserted by the seed
        // test rather than trusted, because a quote that does not verify is the single most
        // embarrassing thing this feature could put in front of a manager.
        evidenceVerified: result.evidenceQuote !== null,
      };
      await db
        .insert(criterionResults)
        .values({ id: stableId(`criterion-result:${meeting.key}:${result.criterionId}`), ...values })
        // Conflict on the NATURAL key (scorecard, criterion), not on the id. A result is identified
        // by which criterion it answers on which Scorecard; the id is just how we address it. The
        // pipeline writes results with generated ids, so a re-seed after any real scoring run would
        // collide on the natural key if this targeted the id — which is exactly the shape of
        // "idempotent only against itself".
        .onConflictDoUpdate({
          target: [criterionResults.scorecardId, criterionResults.criterionId],
          set: values,
        });
    }
  }
}

function resolveResult(
  definition: DefinitionSeed,
  meeting: MeetingSeed,
  result: ResultSeed,
): CriterionResultInput {
  const [sectionKey, criterionKey] = result.criterion.split("/");
  if (sectionKey === undefined || criterionKey === undefined) {
    throw new Error(`seedScorecards: malformed criterion reference "${result.criterion}"`);
  }
  const section = definition.sections.find((s) => s.key === sectionKey);
  const criterion = section?.criteria.find((c) => c.key === criterionKey);
  if (section === undefined || criterion === undefined) {
    throw new Error(
      `seedScorecards: "${meeting.key}" references unknown criterion "${result.criterion}"`,
    );
  }

  const base = {
    criterionId: criterionId(definition.key, section.key, criterion.key),
    sectionId: sectionId(definition.key, section.key),
    criterionType: criterion.type,
    rationale: result.rationale,
    evidenceQuote: result.quote ?? null,
  };

  if (!result.determinable) {
    return { ...base, determinable: false, booleanValue: null, scoreValue: null, optionId: null };
  }

  switch (criterion.type) {
    case "boolean":
      if (typeof result.value !== "boolean") {
        throw new Error(`seedScorecards: "${result.criterion}" needs a boolean value`);
      }
      return {
        ...base,
        determinable: true,
        booleanValue: result.value,
        scoreValue: null,
        optionId: null,
      };
    case "score":
      if (typeof result.value !== "number") {
        throw new Error(`seedScorecards: "${result.criterion}" needs a numeric value`);
      }
      return {
        ...base,
        determinable: true,
        booleanValue: null,
        scoreValue: result.value,
        optionId: null,
      };
    case "classification": {
      if (typeof result.value !== "string") {
        throw new Error(`seedScorecards: "${result.criterion}" needs an option key`);
      }
      const option = (criterion.options ?? []).find((o) => o.key === result.value);
      if (option === undefined) {
        throw new Error(
          `seedScorecards: "${result.criterion}" has no option "${String(result.value)}"`,
        );
      }
      return {
        ...base,
        determinable: true,
        booleanValue: null,
        scoreValue: null,
        optionId: optionId(definition.key, section.key, criterion.key, option.key),
      };
    }
  }
}

/** The snapshot a seeded Scorecard carries — the same shape buildDefinitionSnapshot produces. */
function snapshotOf(definition: DefinitionSeed): ScorecardDefinitionSnapshot {
  const type = MEETING_TYPES.find((t) => t.key === definition.meetingTypeKey);
  if (type === undefined) {
    throw new Error(`seedScorecards: definition "${definition.key}" has no meeting type`);
  }
  return {
    id: stableId(`scorecard-definition:${definition.key}`),
    name: definition.name,
    meetingTypeId: stableId(`meeting-type:${definition.meetingTypeKey}`),
    meetingTypeName: type.name,
    sections: definition.sections.map((section, si) => ({
      id: sectionId(definition.key, section.key),
      title: section.title,
      description: section.description ?? null,
      sortOrder: si,
      criteria: section.criteria.map((criterion, ci) => ({
        id: criterionId(definition.key, section.key, criterion.key),
        type: criterion.type,
        prompt: criterion.prompt,
        guidance: criterion.guidance ?? null,
        sortOrder: ci,
        options: (criterion.options ?? []).map((option, oi) => ({
          id: optionId(definition.key, section.key, criterion.key, option.key),
          label: option.label,
          description: option.description,
          sortOrder: oi,
        })),
      })),
    })),
  };
}

/**
 * Exported for the seed test, so the facts the report quotes are asserted rather than asserted-to.
 *
 * `quotes` is what the verbatim check runs over: every authored quote paired with the content it
 * claims to come from.
 */
export const SCORECARD_SEED_FACTS = {
  meetingTypeKeys: MEETING_TYPES.map((type) => type.key),
  fallbackKey: MEETING_TYPES.find((type) => type.isFallback)?.key ?? null,
  definitionKeys: DEFINITIONS.map((definition) => definition.key),
  meetingKeys: MEETINGS.map((meeting) => meeting.key),
  managerEmail: MANAGER_EMAIL,
  repEmails: REP_EMAIL,
  criterionCount: DEFINITIONS.reduce(
    (total, definition) =>
      total + definition.sections.reduce((n, section) => n + section.criteria.length, 0),
    0,
  ),
  quotes: MEETINGS.flatMap((meeting) =>
    meeting.results
      .filter((result) => result.quote !== undefined)
      .map((result) => ({
        meetingKey: meeting.key,
        criterion: result.criterion,
        quote: result.quote ?? "",
        content: meeting.content,
      })),
  ),
  /** Every seeded result, so the test can check the determinable/value shapes without the DB. */
  results: MEETINGS.map((meeting) => ({
    meetingKey: meeting.key,
    definitionKey: meeting.definitionKey,
    sourceType: meeting.sourceType,
    usedFallback: meeting.usedFallback,
    results: meeting.results,
  })),
} as const;
