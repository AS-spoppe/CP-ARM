import { useEffect, useMemo, useRef, useState } from "react";

type ClientMode = "repo" | "full";
type Tone = "info" | "success" | "warning" | "neutral";
type Tab = "Details" | "Source";
type Filter = "All" | "Recovery" | "Title" | "Auction" | "Financial";
type ArmPhase = "Title work" | "Repossession" | "Transportation" | "Remarketing";

type EventItem = {
  label: string;
  date: string;
  category: Exclude<Filter, "All">;
  coverage?: "Current" | "Partial" | "Delayed" | "Unavailable";
  source?: string;
};

type CaseRow = {
  asset: string;
  account: string;
  armCase: string;
  recoveryOutcome: string;
  titleStatus: string;
  remarketingStatus: string;
  latestMilestone: string;
  statusGroup: "Active" | "On hold" | "Attention needed" | "Completed";
  lastUpdate: string;
  dataCondition?: string;
  featured?: boolean;
};

type Scenario = {
  id: string;
  mode: ClientMode;
  name: string;
  situation: string;
  context: string;
  tone: Tone;
  semantic: string;
  phase: string;
  where: string;
  whereMeta: string;
  happening: string;
  happeningMeta: string;
  blocker: string;
  blockerMeta: string;
  next: string;
  nextMeta: string;
  guidance: string;
  task: string;
  interpretation: string;
  observe: string;
  dataCondition?: string;
  events: EventItem[];
};

const repoScenarios: Scenario[] = [
  {
    id: "assignment",
    mode: "repo",
    name: "Assignment received",
    situation: "Assignment received. Recovery work has not started.",
    context: "The order is available in ARM and is waiting for a recovery partner.",
    tone: "info",
    semantic: "Expected wait",
    phase: "Assignment",
    where: "Location not available",
    whereMeta: "No verified location",
    happening: "Assignment received",
    happeningMeta: "Oct 6, 2026",
    blocker: "No verified blocker",
    blockerMeta: "Normal wait",
    next: "Partner assignment",
    nextMeta: "Expected next event",
    guidance: "No lender action is needed.",
    task: "Determine whether recovery has started and whether action is needed.",
    interpretation: "The order is received, but recovery is not underway.",
    observe: "Does the participant distinguish received from accepted?",
    events: [{ label: "Assignment received", date: "Oct 6 · 9:14 AM", category: "Recovery" }],
  },
  {
    id: "underway",
    mode: "repo",
    name: "Recovery underway",
    situation: "Recovery is underway. The latest verified recovery information is shown.",
    context: "Metro Recovery accepted the assignment and is actively working it.",
    tone: "info",
    semantic: "In progress",
    phase: "Recovery",
    where: "North district",
    whereMeta: "Last verified Oct 8",
    happening: "Recovery underway",
    happeningMeta: "Metro Recovery",
    blocker: "No active hold",
    blockerMeta: "Work can proceed",
    next: "Recovery update",
    nextMeta: "Partner reported",
    guidance: "No lender action is needed.",
    task: "Identify the latest verified recovery state and location.",
    interpretation: "Recovery is active; the location is not a real-time tracker.",
    observe: "Does the participant understand the freshness cue?",
    events: [
      { label: "Assignment received", date: "Oct 6 · 9:14 AM", category: "Recovery" },
      { label: "Recovery partner assigned", date: "Oct 6 · 11:42 AM", category: "Recovery" },
      { label: "Assignment accepted", date: "Oct 7 · 8:05 AM", category: "Recovery" },
    ],
  },
  {
    id: "hold",
    mode: "repo",
    name: "Recovery on hold",
    situation: "Recovery is on hold. CenterPoint remains read-only.",
    context: "A hold was requested and Metro Recovery confirmed it is active.",
    tone: "warning",
    semantic: "Verified attention",
    phase: "Recovery",
    where: "North district",
    whereMeta: "Last verified Oct 8",
    happening: "Hold active",
    happeningMeta: "Confirmed Oct 9",
    blocker: "Recovery paused",
    blockerMeta: "Verified hold",
    next: "Contact hold owner",
    nextMeta: "For governed changes",
    guidance: "Contact the authorized hold owner for any change. No hold controls are available here.",
    task: "Explain the hold state and how a lender would follow up.",
    interpretation: "The hold is active, not merely requested. CenterPoint cannot change it.",
    observe: "Does the participant look for an operational control?",
    events: [
      { label: "Assignment received", date: "Oct 6 · 9:14 AM", category: "Recovery" },
      { label: "Hold requested", date: "Oct 9 · 2:18 PM", category: "Recovery" },
      { label: "Hold active", date: "Oct 9 · 2:46 PM", category: "Recovery" },
    ],
  },
  {
    id: "recovered",
    mode: "repo",
    name: "Vehicle recovered",
    situation: "Vehicle recovered. The Repo-only journey is complete.",
    context: "Recovery details were accepted and no downstream Remarketing stages apply.",
    tone: "success",
    semantic: "Outcome",
    phase: "Outcome",
    where: "1000 Mockingbird Ln",
    whereMeta: "Verified recovery location",
    happening: "Vehicle recovered",
    happeningMeta: "Oct 8, 2026",
    blocker: "No active blocker",
    blockerMeta: "Recovery complete",
    next: "No next ARM phase",
    nextMeta: "Repo-only outcome",
    guidance: "No lender action is needed.",
    task: "Confirm the recovery outcome and determine whether Remarketing follows.",
    interpretation: "Recovery is complete; this client does not have downstream stages.",
    observe: "Does the participant consider the case complete without empty phases?",
    events: [
      { label: "Assignment received", date: "Oct 6 · 9:14 AM", category: "Recovery" },
      { label: "Recovery partner assigned", date: "Oct 6 · 11:42 AM", category: "Recovery" },
      { label: "Vehicle recovered", date: "Oct 8 · 4:32 PM", category: "Recovery" },
    ],
  },
  {
    id: "recovery-unavailable",
    mode: "repo",
    name: "Recovery information unavailable",
    situation: "Recovery details are unavailable in CenterPoint.",
    context: "Supported assignment information is retained; no Recovery status is inferred.",
    tone: "warning",
    semantic: "Data condition",
    phase: "Recovery",
    where: "Unavailable",
    whereMeta: "Coverage not validated",
    happening: "Status unavailable",
    happeningMeta: "Not inferred",
    blocker: "Unknown",
    blockerMeta: "Insufficient coverage",
    next: "Use RDN support path",
    nextMeta: "For current details",
    guidance: "Use the approved RDN support path for current Recovery details.",
    task: "Determine what is known without inferring a recovery status.",
    interpretation: "Assignment data exists, but validated Recovery details do not.",
    observe: "Does the participant avoid treating unavailable as not started?",
    dataCondition: "Validated client-facing Recovery coverage is unavailable.",
    events: [
      { label: "Assignment received", date: "Oct 6 · 9:14 AM", category: "Recovery" },
      { label: "Recovery coverage unavailable", date: "Current", category: "Recovery", coverage: "Unavailable" },
    ],
  },
];

const fullScenarios: Scenario[] = [
  {
    id: "transition",
    name: "Recovery-to-Post-Recovery transition",
    mode: "full",
    situation: "Vehicle recovered. Title and Remarketing work has begun.",
    context: "Recovery history is complete and retained as parallel downstream work starts.",
    tone: "success",
    semantic: "Phase change",
    phase: "Post-Recovery",
    where: "ABC Auto Auction",
    whereMeta: "Received Oct 9",
    happening: "Post-Recovery begins",
    happeningMeta: "Two workstreams open",
    blocker: "No active blocker",
    blockerMeta: "Work can proceed",
    next: "Title and condition",
    nextMeta: "Expected in parallel",
    guidance: "No lender action is needed.",
    task: "Identify what completed and which workstreams begin next.",
    interpretation: "Recovery completed; Title and Remarketing now progress in parallel.",
    observe: "Does the participant retain the Recovery history?",
    events: [
      { label: "Vehicle recovered", date: "Aug 28", category: "Recovery" },
      { label: "Arrived at auction", date: "Sep 3", category: "Auction" },
      { label: "Title requested", date: "Sep 3", category: "Title" },
    ],
  },
  {
    id: "title-wait",
    name: "Waiting on Title",
    mode: "full",
    situation: "Waiting on Title. No verified intervention is needed.",
    context: "The title request was submitted and is within normal processing.",
    tone: "info",
    semantic: "Expected wait",
    phase: "Post-Recovery",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 9",
    happening: "Title processing",
    happeningMeta: "Requested Sep 3",
    blocker: "No verified blocker",
    blockerMeta: "Normal wait",
    next: "Title received",
    nextMeta: "Expected event",
    guidance: "No lender action is needed. Do not escalate based on elapsed time alone.",
    task: "Decide whether the Title state requires action.",
    interpretation: "This is a neutral expected wait, not an alert.",
    observe: "Does the participant interpret waiting as normal?",
    events: [
      { label: "Vehicle recovered", date: "Aug 28", category: "Recovery" },
      { label: "Arrived at auction", date: "Sep 3", category: "Auction" },
      { label: "Title requested", date: "Sep 3", category: "Title" },
    ],
  },
  {
    id: "title-issue",
    name: "Title attention needed",
    mode: "full",
    situation: "Title needs attention. A verified issue is preventing readiness.",
    context: "The title state does not match the sale state. Location Services owns resolution.",
    tone: "warning",
    semantic: "Verified attention",
    phase: "Post-Recovery",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 9",
    happening: "Title issue verified",
    happeningMeta: "State mismatch",
    blocker: "Sale readiness blocked",
    blockerMeta: "Owner: Location Services",
    next: "Resolve title issue",
    nextMeta: "Governed follow-up",
    guidance: "Use the approved Location Services contact path if lender follow-up is requested.",
    task: "Identify the issue, owner, and lender action.",
    interpretation: "A verified title issue—not elapsed time—is blocking sale readiness.",
    observe: "Does the participant find the owner and governed follow-up?",
    events: [
      { label: "Title requested", date: "Sep 3", category: "Title" },
      { label: "Title issue verified", date: "Oct 10 · 8:32 AM", category: "Title" },
    ],
  },
  {
    id: "repairs",
    name: "Condition complete / repairs pending",
    mode: "full",
    situation: "Condition is complete while repairs remain in progress.",
    context: "Parallel workstreams can progress independently; the whole case is not blocked.",
    tone: "info",
    semantic: "In progress",
    phase: "Post-Recovery",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 9",
    happening: "Repairs in progress",
    happeningMeta: "Condition complete",
    blocker: "One dependency open",
    blockerMeta: "Other work continues",
    next: "Repairs complete",
    nextMeta: "Auction readiness follows",
    guidance: "No lender action is needed.",
    task: "Determine whether the entire case is blocked.",
    interpretation: "Condition is complete; repairs are a separate open workstream.",
    observe: "Does the participant understand parallel progression?",
    events: [
      { label: "Condition report complete", date: "Oct 7", category: "Auction" },
      { label: "Repair estimate accepted", date: "Oct 8", category: "Auction" },
      { label: "Repairs underway", date: "Current", category: "Auction" },
    ],
  },
  {
    id: "condition-restricted",
    name: "Condition Report permission restricted",
    mode: "full",
    situation: "Remarketing is in progress. Condition Report access is restricted for this user.",
    context: "Supported Title and Remarketing information remains visible; document access is a separate permission condition.",
    tone: "neutral",
    semantic: "Permission condition",
    phase: "Post-Recovery",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 9",
    happening: "Preparing for sale",
    happeningMeta: "Condition data accepted",
    blocker: "No verified blocker",
    blockerMeta: "Document permission restricted",
    next: "Readiness review",
    nextMeta: "Remarketing team",
    guidance: "No lender action is needed. Use the approved support path if Condition Report access is required.",
    task: "Determine whether restricted document access changes the business state.",
    interpretation: "Remarketing remains in progress; only the document link is permission restricted.",
    observe: "Does the participant keep the permission condition separate from business progress?",
    dataCondition: "Condition Report access is restricted for this user.",
    events: [
      { label: "Condition report complete", date: "Oct 9", category: "Auction" },
      { label: "Condition Report permission restricted", date: "Current", category: "Auction", coverage: "Unavailable" },
    ],
  },
  {
    id: "ready",
    name: "Ready for sale",
    mode: "full",
    situation: "Ready for sale. Documentary, physical, operational, and commercial checks are complete.",
    context: "Title is complete, condition is accepted, sale clearance is recorded, and floor price is approved.",
    tone: "success",
    semantic: "Ready",
    phase: "Disposition",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 11",
    happening: "Cleared for sale",
    happeningMeta: "All readiness checks",
    blocker: "No active blocker",
    blockerMeta: "Evidence available",
    next: "Sale scheduled",
    nextMeta: "Auction team",
    guidance: "No lender action is needed.",
    task: "Verify that the asset is ready for sale.",
    interpretation: "Readiness is supported by four distinct evidence areas.",
    observe: "Which evidence does the participant inspect?",
    events: [
      { label: "Title received", date: "Oct 9", category: "Title" },
      { label: "Condition report complete", date: "Oct 10", category: "Auction" },
      { label: "Cleared for sale", date: "Oct 11", category: "Auction" },
    ],
  },
  {
    id: "scheduled",
    name: "Auction scheduled",
    mode: "full",
    situation: "At ABC Auto Auction. Sale scheduled October 14. No active blocker.",
    context: "Approved commercial information is shown with the expected sale outcome.",
    tone: "info",
    semantic: "Scheduled",
    phase: "Disposition",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 9",
    happening: "Sale scheduled",
    happeningMeta: "October 14",
    blocker: "No active blocker",
    blockerMeta: "Cleared for sale",
    next: "Auction sale",
    nextMeta: "Expected Oct 14",
    guidance: "No lender action is needed.",
    task: "Find the auction, sale date, and expected next outcome.",
    interpretation: "The vehicle is cleared and scheduled; it is not yet sold.",
    observe: "Does the participant distinguish scheduled from sold?",
    events: [
      { label: "Vehicle recovered", date: "Aug 28", category: "Recovery" },
      { label: "Arrived at auction", date: "Sep 3", category: "Auction" },
      { label: "Cleared for sale", date: "Oct 11", category: "Auction" },
      { label: "Sale scheduled", date: "Oct 14", category: "Auction" },
    ],
  },
  {
    id: "not-sold",
    name: "Not Sold",
    mode: "full",
    situation: "The asset was not sold. Disposition remains the current phase.",
    context: "A rerun or alternate route is pending; the asset does not return to Recovery.",
    tone: "warning",
    semantic: "Outcome",
    phase: "Disposition",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 14",
    happening: "Not sold",
    happeningMeta: "First run complete",
    blocker: "Next route pending",
    blockerMeta: "Disposition continues",
    next: "Rerun or alternate route",
    nextMeta: "Auction team",
    guidance: "No lender action is needed unless the auction team requests governed input.",
    task: "Determine the current phase after an unsuccessful sale.",
    interpretation: "Disposition continues; the journey does not move backward.",
    observe: "Does the participant incorrectly return it to Recovery?",
    events: [
      { label: "Sale scheduled", date: "Oct 14 · 10:00 AM", category: "Auction" },
      { label: "Not sold", date: "Oct 14 · 3:44 PM", category: "Auction" },
    ],
  },
  {
    id: "redeemed",
    name: "Redeemed",
    mode: "full",
    situation: "Redemption completed. The vehicle did not sell.",
    context: "The redemption outcome is complete and no sale proceeds are implied.",
    tone: "success",
    semantic: "Outcome",
    phase: "Disposition",
    where: "Released",
    whereMeta: "Redemption complete",
    happening: "Redeemed",
    happeningMeta: "Oct 14",
    blocker: "No active blocker",
    blockerMeta: "Hold released",
    next: "Financial close",
    nextMeta: "No sale proceeds",
    guidance: "No lender action is needed.",
    task: "Determine whether this asset sold and whether proceeds are expected.",
    interpretation: "Redemption is distinct from sale; there are no sale proceeds.",
    observe: "Does the participant infer a sale from a completed outcome?",
    events: [
      { label: "Redemption stated", date: "Oct 12", category: "Financial" },
      { label: "Redemption completed", date: "Oct 14", category: "Financial" },
    ],
  },
  {
    id: "sold",
    name: "Sold / funds pending",
    mode: "full",
    situation: "Sold. Sale price is recorded; funds have not been sent.",
    context: "The Disposition outcome is complete while Financial Close remains open.",
    tone: "success",
    semantic: "Outcome",
    phase: "Financial Close",
    where: "ABC Auto Auction",
    whereMeta: "AutoIMS · Oct 14",
    happening: "Sold",
    happeningMeta: "$12,450.00",
    blocker: "No sale blocker",
    blockerMeta: "Funds pending",
    next: "Funds sent",
    nextMeta: "Financial milestone",
    guidance: "No lender action is needed.",
    task: "Separate the sale outcome from financial completion.",
    interpretation: "The asset sold, but the financial milestone is still pending.",
    observe: "Does the participant treat sold as financially closed?",
    events: [
      { label: "Sold", date: "Oct 14 · 3:44 PM", category: "Auction" },
      { label: "Funds pending", date: "Current", category: "Financial" },
    ],
  },
  {
    id: "funds",
    name: "Funds sent",
    mode: "full",
    situation: "Funds sent. The durable financial milestone is complete.",
    context: "Sale and remittance details remain available without internal case-closure language.",
    tone: "success",
    semantic: "Completed",
    phase: "Financial Close",
    where: "ABC Auto Auction",
    whereMeta: "Final auction",
    happening: "Funds sent",
    happeningMeta: "Oct 18, 2026",
    blocker: "No active blocker",
    blockerMeta: "Journey complete",
    next: "No next event",
    nextMeta: "Financial close complete",
    guidance: "No lender action is needed.",
    task: "Confirm the final durable financial milestone.",
    interpretation: "Funds were sent; the lender-facing journey is complete.",
    observe: "Does the participant need internal case status to understand completion?",
    events: [
      { label: "Sold", date: "Oct 14", category: "Auction" },
      { label: "Funds sent", date: "Oct 18", category: "Financial" },
    ],
  },
  {
    id: "delayed",
    name: "Remarketing source update delayed",
    mode: "full",
    situation: "Sold. Sale price is recorded; funds have not been sent.",
    context: "The latest accepted business state remains visible while a source update is delayed.",
    tone: "success",
    semantic: "Outcome",
    phase: "Financial Close",
    where: "ABC Auto Auction",
    whereMeta: "Last accepted Oct 14",
    happening: "Sold",
    happeningMeta: "$12,450.00",
    blocker: "No verified blocker",
    blockerMeta: "Business state retained",
    next: "Funds sent",
    nextMeta: "Awaiting accepted update",
    guidance: "No lender action is needed. Contact support only if the delay exceeds the published service window.",
    task: "Identify the business state and the separate data condition.",
    interpretation: "The asset remains Sold; a technical delay does not replace that state.",
    observe: "Does the participant confuse source delay with business delay?",
    dataCondition: "AutoIMS source update delayed. Last accepted update: Oct 14 at 3:48 PM.",
    events: [
      { label: "Sold", date: "Oct 14 · 3:44 PM", category: "Auction" },
      { label: "Source update delayed", date: "Since Oct 15", category: "Auction", coverage: "Delayed" },
    ],
  },
];

const phasesByMode = {
  repo: ["Assignment", "Recovery", "Outcome"],
  full: ["Assignment", "Recovery", "Post-Recovery", "Disposition", "Financial Close"],
};

const caseRows: CaseRow[] = [
  { asset: "2021 Toyota Highlander", account: "6941156", armCase: "104869", recoveryOutcome: "Recovered", titleStatus: "Processing", remarketingStatus: "Preparing for sale", latestMilestone: "Title documents received", statusGroup: "Active", lastUpdate: "Oct 14, 2026" },
  { asset: "2020 Nissan Altima", account: "8249051", armCase: "104870", recoveryOutcome: "Recovery underway", titleStatus: "Not started", remarketingStatus: "Not started", latestMilestone: "Hold requested", statusGroup: "On hold", lastUpdate: "Oct 14, 2026" },
  { asset: "2022 Mazda3", account: "3290712", armCase: "104871", recoveryOutcome: "Recovered", titleStatus: "Attention needed", remarketingStatus: "Awaiting title", latestMilestone: "Title issue verified", statusGroup: "Attention needed", lastUpdate: "Oct 13, 2026" },
  { asset: "2021 BMW 5 Series", account: "8934125", armCase: "104873", recoveryOutcome: "Recovered", titleStatus: "Complete", remarketingStatus: "Sale scheduled", latestMilestone: "Cleared for sale", statusGroup: "Active", lastUpdate: "Oct 13, 2026" },
  { asset: "2022 Ford Escape", account: "8793429", armCase: "104872", recoveryOutcome: "Recovered", titleStatus: "Complete", remarketingStatus: "Sold — funds pending", latestMilestone: "Sold Oct 14", statusGroup: "Active", lastUpdate: "Oct 12, 2026", dataCondition: "AutoIMS update delayed", featured: true },
  { asset: "2019 Honda Civic", account: "8923410", armCase: "104874", recoveryOutcome: "Recovery underway", titleStatus: "Not started", remarketingStatus: "Not started", latestMilestone: "Partner assigned", statusGroup: "Active", lastUpdate: "Oct 11, 2026" },
  { asset: "2020 Nissan 370Z", account: "1348795", armCase: "104875", recoveryOutcome: "Recovered", titleStatus: "Complete", remarketingStatus: "Funds sent", latestMilestone: "Funds sent Oct 10", statusGroup: "Completed", lastUpdate: "Oct 10, 2026" },
  { asset: "2023 Chevrolet Equinox", account: "4902183", armCase: "104876", recoveryOutcome: "Recovered", titleStatus: "Waiting on title", remarketingStatus: "Awaiting title", latestMilestone: "Title requested", statusGroup: "Active", lastUpdate: "Oct 9, 2026" },
  { asset: "2021 Subaru Outback", account: "7110482", armCase: "104877", recoveryOutcome: "On hold", titleStatus: "Not started", remarketingStatus: "Not started", latestMilestone: "Hold active", statusGroup: "On hold", lastUpdate: "Oct 9, 2026" },
  { asset: "2022 Kia Sportage", account: "6502371", armCase: "104878", recoveryOutcome: "Recovered", titleStatus: "Complete", remarketingStatus: "Redeemed", latestMilestone: "Redemption completed", statusGroup: "Completed", lastUpdate: "Oct 8, 2026" },
];

const icon = (name: string) => `/assets/${name}.svg`;

function ControlButton({
  children,
  onClick,
  active = false,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      className={`control-button ${active ? "is-active" : ""} ${className}`}
      onClick={onClick}
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function Chip({ children, tone = "info" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

function SideNavigation() {
  const items = [
    ["62236", "Dashboard"],
    ["67daa", "Portfolio"],
    ["09c27", "Search"],
    ["31028", "Asset recovery"],
  ];
  const more = [
    ["a71f2", "Notifications"],
    ["cb9f1", "Resources"],
    ["0403f", "Help & support"],
    ["2a8a7", "Reports"],
  ];
  return (
    <aside className="side-nav" aria-label="Primary navigation">
      <div className="brand-row">
        <img src={icon("8e55d")} alt="CenterPoint" className="brand-logo" />
        <img src={icon("3561f")} alt="" className="nav-icon" />
      </div>
      <nav className="nav-items">
        {items.map(([asset, label]) => (
          <div className={`nav-item ${label === "Asset recovery" ? "selected" : ""}`} key={label}>
            <img src={icon(asset)} alt="" className="nav-icon" />
            <span>{label}</span>
            {(label === "Portfolio" || label === "Search") && <span className="nav-chevron">⌄</span>}
          </div>
        ))}
        <div className="nav-label">More</div>
        {more.map(([asset, label]) => (
          <div className="nav-item" key={label}>
            <img src={icon(asset)} alt="" className="nav-icon" />
            <span>{label}</span>
            {label === "Notifications" && <span className="badge">10</span>}
          </div>
        ))}
      </nav>
      <div className="user-row">
        <span className="avatar">JD</span>
        <span><strong>Jane Doe</strong><small>Lender user</small></span>
        <span className="nav-chevron">⌃</span>
      </div>
    </aside>
  );
}

function PrototypeBar({
  mode,
  onMode,
  scenarios,
  scenario,
  onScenario,
  research,
  onResearch,
}: {
  mode: ClientMode;
  onMode: (mode: ClientMode) => void;
  scenarios: Scenario[];
  scenario: Scenario;
  onScenario: (id: string) => void;
  research: boolean;
  onResearch: () => void;
}) {
  return (
    <section className="prototype-bar" aria-label="Prototype controls">
      <div className="prototype-label"><span>Prototype only</span><strong>Scenario selector</strong></div>
      <label>
        <span>Client configuration</span>
        <select value={mode} onChange={(event) => onMode(event.target.value as ClientMode)}>
          <option value="repo">Repo-only client</option>
          <option value="full">Repo + Remarketing client</option>
        </select>
      </label>
      <label className="scenario-select">
        <span>Scenario</span>
        <select value={scenario.id} onChange={(event) => onScenario(event.target.value)}>
          {scenarios.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="switch-row">
        <span>Research mode</span>
        <input type="checkbox" checked={research} onChange={onResearch} />
      </label>
    </section>
  );
}

function PageSearch({
  value,
  onChange,
  onSubmit,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="page-toolbar">
      <div className="page-toolbar-inner">
        <div className="toolbar-context">
          {onBack ? (
            <ControlButton className="toolbar-back" onClick={onBack}>← All cases</ControlButton>
          ) : (
            <>
              <span>Asset recovery</span>
              <strong>Case search</strong>
            </>
          )}
        </div>
        <form
          className="search-shell"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <img src={icon("81363")} alt="" />
          <label className="sr-only" htmlFor="case-search">Search loan, VIN, or case number</label>
          <input
            id="case-search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search loan, VIN, or case number"
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </div>
  );
}

function PhaseTag({ phase }: { phase: ArmPhase }) {
  const phaseIcon = {
    "Title work": "0db10",
    Repossession: "c821e",
    Transportation: "db81d",
    Remarketing: "a1e78",
  }[phase];
  return (
    <span className={`phase-chip phase-${phase.toLowerCase().replace(" ", "-")}`}>
      <img src={icon(phaseIcon)} alt="" />
      {phase}
    </span>
  );
}

function CasesList({
  query,
  setQuery,
  openCase,
}: {
  query: string;
  setQuery: (value: string) => void;
  openCase: () => void;
}) {
  const [listTab, setListTab] = useState<"All cases" | "On hold" | "Attention needed" | "Completed">("All cases");
  const [progressFilter, setProgressFilter] = useState("All progress");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [dateFilter, setDateFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const filteredCases = caseRows.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [item.asset, item.account, item.armCase].some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesTab = listTab === "All cases" || item.statusGroup === listTab;
    const matchesProgress = progressFilter === "All progress" || item.remarketingStatus === progressFilter || item.recoveryOutcome === progressFilter;
    const matchesStatus = statusFilter === "All statuses" || item.statusGroup === statusFilter;
    const matchesDate = !dateFilter || item.lastUpdate === new Date(`${dateFilter}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return matchesQuery && matchesTab && matchesProgress && matchesStatus && matchesDate;
  });

  return (
    <section className="cases-page">
      <header className="cases-header">
        <div>
          <h1>ARM Cases</h1>
          <p>Open, pending, on hold, and closed recovery cases</p>
        </div>
        <ControlButton className="reports-action">View reports</ControlButton>
      </header>

      <nav className="case-tabs" aria-label="Case status views">
        {([
          ["All cases", "45"],
          ["On hold", "5"],
          ["Attention needed", "3"],
          ["Completed", "10"],
        ] as const).map(([label, count]) => (
          <ControlButton key={label} active={listTab === label} onClick={() => { setListTab(label); setPageNumber(1); }}>
            {label}<span>{count}</span>
          </ControlButton>
        ))}
      </nav>

      <section className="case-filters" aria-label="Case filters">
        <label className="list-search">
          <span>Search ARM cases</span>
          <span className="field-shell"><img src={icon("81363")} alt="" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Account, borrower, or vehicle" /></span>
        </label>
        <div className="filter-fields">
          <label>
            <span>Last update</span>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <label>
            <span>Current progress</span>
            <select value={progressFilter} onChange={(event) => setProgressFilter(event.target.value)}>
              <option>All progress</option>
              <option>Recovery underway</option>
              <option>Recovered</option>
              <option>Awaiting title</option>
              <option>Preparing for sale</option>
              <option>Sale scheduled</option>
              <option>Sold — funds pending</option>
              <option>Funds sent</option>
              <option>Redeemed</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              <option>Active</option>
              <option>On hold</option>
              <option>Attention needed</option>
              <option>Completed</option>
            </select>
          </label>
          <ControlButton className="apply-filters" onClick={() => setPageNumber(1)}>Apply filters</ControlButton>
        </div>
      </section>

      <div className="cases-table-wrap">
        <table className="cases-table">
          <thead>
            <tr>
              <th>Asset and account</th><th>ARM case</th><th>Recovery outcome</th><th>Title status</th><th>Remarketing status</th><th>Latest milestone</th><th>Last update</th><th><span className="sr-only">Open case</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((item) => (
              <tr key={`${item.account}-${item.vehicle}`} className={item.featured ? "featured-row" : ""} onClick={item.featured ? openCase : undefined}>
                <td><strong>{item.asset}</strong><small>Account {item.account}</small></td>
                <td>{item.armCase}</td>
                <td>{item.recoveryOutcome}</td>
                <td><span className={`case-status ${item.titleStatus === "Attention needed" ? "status-attention-needed" : item.titleStatus === "Complete" ? "status-completed" : "status-active"}`}>{item.titleStatus}</span></td>
                <td>{item.remarketingStatus}{item.dataCondition && <small className="row-data-condition"><i className="coverage delayed" />{item.dataCondition}</small>}</td>
                <td>{item.latestMilestone}</td>
                <td><time>{item.lastUpdate}</time></td>
                <td>{item.featured && <ControlButton className="row-action" onClick={openCase} ariaLabel="Open Ford Escape case">›</ControlButton>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCases.length === 0 && (
          <div className="table-empty"><strong>No matching cases</strong><p>Adjust the search or filters to see more cases.</p><ControlButton className="text-action" onClick={() => { setQuery(""); setProgressFilter("All progress"); setStatusFilter("All statuses"); setDateFilter(""); }}>Clear filters</ControlButton></div>
        )}
      </div>

      <footer className="pagination-bar">
        <span>{filteredCases.length ? `1–${filteredCases.length} of 45 cases` : "0 of 45 cases"}</span>
        <div className="pagination-controls">
          <ControlButton className="page-direction" ariaLabel="Previous page">Back</ControlButton>
          {[1, 2, 3, 4, 5].map((number) => <ControlButton key={number} active={pageNumber === number} onClick={() => setPageNumber(number)} ariaLabel={`Page ${number}`}>{number}</ControlButton>)}
          <span>…</span>
          <ControlButton onClick={() => setPageNumber(10)} active={pageNumber === 10} ariaLabel="Page 10">10</ControlButton>
          <ControlButton className="page-direction" onClick={() => setPageNumber(Math.min(10, pageNumber + 1))} ariaLabel="Next page">Next</ControlButton>
        </div>
        <select aria-label="Cases per page" defaultValue="10">
          <option value="10">10 per page</option><option value="15">15 per page</option><option value="20">20 per page</option>
        </select>
      </footer>
    </section>
  );
}

function Lifecycle({ scenario }: { scenario: Scenario }) {
  const phases = phasesByMode[scenario.mode];
  const current = phases.indexOf(scenario.phase);
  return (
    <ol className="lifecycle" aria-label="Asset lifecycle">
      {phases.map((phase, index) => {
        const status = index < current ? "completed" : index === current ? "current" : "upcoming";
        return (
          <li className={status} key={phase}>
            <span className="step-dot" aria-hidden="true">{index < current ? "✓" : index + 1}</span>
            <span className="step-text"><strong>{phase}</strong><small>{status}</small></span>
          </li>
        );
      })}
    </ol>
  );
}

function conditionReportState(scenario: Scenario) {
  if (scenario.mode === "repo") return "not-applicable";
  if (scenario.id === "transition") return "unavailable";
  if (scenario.id === "condition-restricted") return "restricted";
  if (scenario.id === "delayed") return "delayed";
  return "available";
}

function Summary({ scenario, onCondition }: { scenario: Scenario; onCondition: () => void }) {
  const fullLifecycle = scenario.mode === "full";
  const reportState = conditionReportState(scenario);
  const nextEventSupported = scenario.id !== "recovery-unavailable";
  const titleStatus = scenario.id === "title-issue" ? "Attention needed" : scenario.id === "title-wait" ? "Processing" : ["transition", "repairs"].includes(scenario.id) ? "In progress" : "Complete";
  const remarketingStatus = scenario.id === "title-wait" || scenario.id === "title-issue" ? "Awaiting title" : scenario.happening;
  const latestEvent = scenario.events.at(-1);
  const items = fullLifecycle
    ? [
        ["Current location", scenario.where, scenario.whereMeta],
        ["Title", titleStatus, scenario.id === "title-issue" ? "Verified issue" : "Location Services"],
        ["Remarketing", remarketingStatus, scenario.phase],
        ["Latest milestone", latestEvent?.label || scenario.happening, latestEvent?.date || scenario.happeningMeta],
      ]
    : [
        ["Current location", scenario.where, scenario.whereMeta],
        ["Recovery", scenario.happening, scenario.happeningMeta],
        ["Hold", scenario.id === "hold" ? "Active" : "No active hold", scenario.blockerMeta],
        ["Latest milestone", latestEvent?.label || scenario.happening, latestEvent?.date || scenario.happeningMeta],
      ];
  return (
    <section className="accountability-card">
      <div className="current-state-heading">
        <div>
          <span className="eyebrow">Current situation</span>
          <h2>{scenario.situation}</h2>
          <p>{scenario.context}</p>
        </div>
        <Chip tone={scenario.tone}>{scenario.semantic}</Chip>
      </div>
      <div className="accountability-grid">
        {items.map(([label, value, meta]) => (
          <div className="accountability-item" key={label}>
            <span>{label}</span><strong>{value}</strong><small>{meta}</small>
          </div>
        ))}
      </div>
      <div className="accountability-footer">
        <div className="waiting-inline">
          <span>What ARM is waiting for</span>
          <strong>{nextEventSupported ? scenario.next : "No reliable next event available"}</strong>
          <small>{nextEventSupported ? scenario.guidance : "Recovery details are not available in CenterPoint. Use RDN for current details."}</small>
        </div>
        <div className="accountability-actions">
          {scenario.mode === "full" && <>
            <span>Remarketing document</span>
            <button className={`condition-report-action report-${reportState}`} type="button" onClick={onCondition}>
                {reportState === "unavailable" ? "Condition Report unavailable" : reportState === "restricted" ? "Condition Report restricted" : reportState === "delayed" ? "Condition Report · last accepted" : "Condition Report"}
                <span aria-hidden="true">{reportState === "available" ? "↗" : "i"}</span>
            </button>
          </>}
        </div>
      </div>
    </section>
  );
}

function ProgressTimeline({ scenario, onSource }: { scenario: Scenario; onSource: (event: EventItem) => void }) {
  const [selectedPhase, setSelectedPhase] = useState(scenario.phase);
  const [milestonesOpen, setMilestonesOpen] = useState(true);
  const fullGroups = [
    { phase: "Assignment", milestones: [["Assignment received", "Aug 27"]] },
    { phase: "Recovery", milestones: [["Vehicle recovered", "Aug 28"]] },
    {
      phase: "Post-Recovery",
      milestones: [
        ["Arrived at auction", "Sep 3"],
        ["Condition report complete", "Oct 7"],
        [scenario.id === "title-issue" ? "Title issue verified" : "Title documents received", scenario.id === "title-wait" ? "Pending" : scenario.id === "title-issue" ? "Oct 10" : "Oct 9"],
        ["Title processing complete", ["title-wait", "title-issue", "transition", "repairs"].includes(scenario.id) ? "Pending" : "Oct 10"],
      ],
    },
    {
      phase: "Disposition",
      milestones: [
        ["Cleared for sale", ["ready", "scheduled", "not-sold", "sold", "delayed", "funds"].includes(scenario.id) ? "Oct 11" : "Pending"],
        ["Sale scheduled", ["scheduled", "not-sold", "sold", "delayed", "funds"].includes(scenario.id) ? "Oct 14" : "Pending"],
        [scenario.id === "redeemed" ? "Redeemed" : scenario.id === "not-sold" ? "Not sold" : "Sold or redeemed", scenario.id === "redeemed" || scenario.id === "not-sold" ? "Oct 14" : ["sold", "delayed", "funds"].includes(scenario.id) ? "Oct 14" : "Pending"],
      ],
    },
    { phase: "Financial Close", milestones: [["Funds sent", scenario.id === "funds" ? "Oct 18" : "Pending"]] },
  ];
  const repoGroups = phasesByMode.repo.map((phase) => ({
    phase,
    milestones:
      phase === "Assignment"
        ? scenario.events.filter((event) => event.label.toLowerCase().includes("assignment")).map((event) => [event.label, event.date])
        : phase === "Outcome"
          ? scenario.events.filter((event) => event.label === "Vehicle recovered").map((event) => [event.label, event.date])
          : scenario.events.filter((event) => !event.label.toLowerCase().includes("assignment") && event.label !== "Vehicle recovered").map((event) => [event.label, event.date]),
  }));
  let groups = scenario.mode === "full" ? fullGroups : repoGroups;
  if (scenario.id === "redeemed") groups = groups.filter((group) => group.phase !== "Financial Close");
  const phases = phasesByMode[scenario.mode];
  const currentPhaseIndex = phases.indexOf(scenario.phase);
  const selectedGroup = groups.find((group) => group.phase === selectedPhase) || groups[Math.max(0, currentPhaseIndex)] || groups[0];
  const sourceCategory = (phase: string, label: string): EventItem["category"] => {
    if (phase === "Assignment" || phase === "Recovery" || phase === "Outcome") return "Recovery";
    if (phase === "Financial Close") return "Financial";
    if (label.toLowerCase().includes("title")) return "Title";
    return "Auction";
  };

  useEffect(() => {
    setSelectedPhase(scenario.phase);
    setMilestonesOpen(true);
  }, [scenario.phase, scenario.id]);

  return (
    <section className="progress-record">
      <div className="section-heading">
        <div><span className="eyebrow">Asset progress</span><h2>Lifecycle and milestones</h2><p>Phases organize the journey; dated milestones show what ARM has accepted within each phase.</p></div>
        <Chip tone={scenario.tone}>{scenario.semantic}</Chip>
      </div>
      <ol className="horizontal-phases" aria-label="Lifecycle phases">
        {groups.map((group, index) => {
          const phaseState = index < currentPhaseIndex ? "completed" : index === currentPhaseIndex ? "current" : "upcoming";
          return (
            <li className={`${phaseState} ${selectedGroup.phase === group.phase ? "selected" : ""}`} key={group.phase}>
              <button type="button" onClick={() => { setSelectedPhase(group.phase); setMilestonesOpen(true); }} aria-pressed={selectedGroup.phase === group.phase}>
                <span className="phase-marker">{phaseState === "completed" ? "✓" : index + 1}</span>
                <span><strong>{group.phase}</strong><small>{phaseState}</small></span>
              </button>
            </li>
          );
        })}
      </ol>
      <section className="milestone-disclosure" aria-live="polite">
        <button type="button" className="milestone-disclosure-trigger" onClick={() => setMilestonesOpen(!milestonesOpen)} aria-expanded={milestonesOpen}>
          <span>
            <span className="eyebrow">{selectedGroup.phase} phase</span>
            <strong>Milestones</strong>
          </span>
          <span className="disclosure-meta">
            {selectedGroup.milestones.filter(([, date]) => date !== "Pending").length} of {selectedGroup.milestones.length} accepted
            <span className={`disclosure-chevron ${milestonesOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
          </span>
        </button>
        {milestonesOpen && (
          <ol className="vertical-milestones">
            {selectedGroup.milestones.length ? selectedGroup.milestones.map(([label, date]) => (
              <li className={date === "Pending" ? "pending" : "complete"} key={label}>
                <button type="button" onClick={() => onSource({ label, date, category: sourceCategory(selectedGroup.phase, label), coverage: date === "Pending" ? "Partial" : "Current" })}>
                  <span className="vertical-marker" aria-hidden="true">{date === "Pending" ? "" : "✓"}</span>
                  <span><strong>{label}</strong></span>
                  <span className="milestone-row-meta">
                    <time>{date === "Pending" ? "Pending" : date}</time>
                    <small>{date === "Pending" ? "No accepted date" : "Source details ›"}</small>
                  </span>
                </button>
              </li>
            )) : (
              <li className="empty-milestone">
                <span className="vertical-marker" aria-hidden="true" />
                <span><strong>No accepted milestone yet</strong><small>This phase has not started.</small></span>
              </li>
            )}
          </ol>
        )}
      </section>
    </section>
  );
}

function WorkstreamSummary({ title, scenario }: { title: string; scenario: Scenario }) {
  const data =
    title === "Title"
      ? [
          ["Current state", scenario.id === "title-issue" ? "Attention needed" : scenario.id === "title-wait" ? "Processing" : "Complete"],
          ["Latest milestone", scenario.id === "title-wait" ? "Title requested" : scenario.id === "title-issue" ? "Title issue verified" : "Title processing complete"],
          ["Guidance", scenario.id === "title-issue" ? "Use the governed support path" : "No lender action needed"],
        ]
      : title === "Remarketing"
        ? [
            ["Current state", scenario.happening],
            ["Latest milestone", scenario.events.at(-1)?.label || scenario.happening],
            ["Guidance", scenario.guidance],
          ]
        : [
            ["Current state", scenario.happening],
            ["Latest milestone", scenario.events.at(-1)?.label || scenario.happening],
            ["Guidance", scenario.guidance],
          ];
  return (
    <div className="workstream-summary">
      {data.map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}
    </div>
  );
}

function Facts({ scenario, title }: { scenario: Scenario; title: string }) {
  const recoveryPartner =
    scenario.id === "assignment"
      ? "Pending"
      : scenario.id === "recovery-unavailable"
        ? "Unavailable"
        : scenario.id === "hold"
          ? "Assigned partner — name restricted"
          : "Metro Recovery";
  const repo = [
    ["Order Type", "Involuntary repossession"],
    ["Recovery Status", scenario.happening],
    ["Recovery Partner", recoveryPartner],
    ["Hold", scenario.id === "hold" ? "Active" : "No"],
    ["Repossession Date", scenario.id === "recovered" ? "Oct 8, 2026" : "Not recovered"],
    ["Asset Condition", scenario.id === "recovered" ? "Fair" : "Pending recovery"],
    ["Keys in Possession", scenario.id === "recovered" ? "Yes" : "Unknown"],
    ["Recovery Address", scenario.id === "recovered" ? "1000 Mockingbird Ln" : "Not available"],
    ["Recovery Phone", scenario.id === "recovered" ? "(317) 555-0142" : "Not available"],
    ["Notes", scenario.id === "hold" ? "Hold active" : "No approved note"],
    ["Order Date", "Oct 6, 2026"],
    ["Asset Classification", "Automobile"],
  ];
  const auction = [
    ["Status", scenario.happening],
    ["Client ID", "C-10428"],
    ["Current Auction", "ABC Auto Auction"],
    ["Auction State", "IN"],
    ["Current Vendor", "Assigned"],
    ["Mileage", "42,318"],
    ["Auction Status", scenario.id === "sold" || scenario.id === "delayed" ? "Sold" : scenario.id === "redeemed" ? "Redeemed" : "Scheduled"],
    ["Secured Date", "Oct 6, 2026"],
    ["Cleared for Sale", ["ready", "scheduled", "sold", "delayed", "funds"].includes(scenario.id) ? "Yes" : "No"],
    ["On Block", scenario.id === "scheduled" ? "Scheduled" : "No"],
    ["Scheduled Sale Date", "Oct 14, 2026"],
    ["Legal Sale Date", "Oct 14, 2026"],
    ["Days Run", scenario.id === "not-sold" ? "1" : "0"],
    ["Black Book Price", "$13,200.00"],
    ["Floor Price (Accepted)", "$11,000.00"],
    ["Sold Date", ["sold", "delayed", "funds"].includes(scenario.id) ? "Oct 14, 2026" : "—"],
    ["Sale Price", ["sold", "delayed", "funds"].includes(scenario.id) ? "$12,450.00" : "—"],
    ["Funds Sent", scenario.id === "funds" ? "Oct 18, 2026" : "Not yet"],
  ];
  const titleFacts = [
    ["Title Status", scenario.id === "title-issue" ? "Attention needed" : scenario.id === "title-wait" ? "Requested" : "Complete"],
    ["Title Received", ["ready", "scheduled", "sold", "delayed", "funds"].includes(scenario.id) ? "Oct 9, 2026" : "Pending"],
    ["Title Returned", "No"],
    ["Title State", "IN"],
    ["Title Processed Date", "Oct 9, 2026"],
    ["Title Complete Date", ["ready", "scheduled", "sold", "delayed", "funds"].includes(scenario.id) ? "Oct 10, 2026" : "Pending"],
    ["Title Sent Date", "Pending"],
  ];
  if (scenario.mode === "full" && title === "Remarketing") {
    const groups = [
      ["Current position", [["Current Auction", "ABC Auto Auction"], ["Auction State", "IN"], ["Current Vendor", "Assigned — mapping to confirm"], ["Secured Date", "Oct 6, 2026"]]],
      ["Readiness", [["Condition Report", scenario.id === "transition" ? "Link unavailable" : "Completed Oct 9"], ["Repairs", scenario.id === "repairs" ? "In progress" : "Complete"], ["NOI or Clear Date", "Mapping not confirmed"], ["Cleared for Sale", ["ready", "scheduled", "sold", "delayed", "funds"].includes(scenario.id) ? "Yes" : "No"], ["Floor Price (Accepted)", "$11,000.00"]]],
      ["Sale", [["Auction Status", scenario.id === "sold" || scenario.id === "delayed" ? "Sold" : scenario.id === "redeemed" ? "Redeemed" : "Scheduled"], ["Scheduled Sale Date", "Oct 14, 2026"], ["Legal Sale Date", "Oct 14, 2026"], ["On Block", scenario.id === "scheduled" ? "Scheduled" : "No"], ["Days Run", scenario.id === "not-sold" ? "1" : "0"]]],
      ["Outcome", [["Not Sold", scenario.id === "not-sold" ? "Oct 14, 2026" : "—"], ["Redeemed", scenario.id === "redeemed" ? "Oct 14, 2026" : "—"], ["Sold Date", ["sold", "delayed", "funds"].includes(scenario.id) ? "Oct 14, 2026" : "—"], ["Sale Price", ["sold", "delayed", "funds"].includes(scenario.id) ? "$12,450.00" : "—"], ["Funds Sent", scenario.id === "funds" ? "Oct 18, 2026" : "Not yet"]]],
    ] as const;
    return (
      <div className="fact-groups">
        {groups.map(([group, items]) => (
          <section key={group}>
            <h3>{group}</h3>
            <dl className="facts">
              {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>
        ))}
      </div>
    );
  }
  let data = repo;
  if (scenario.mode === "full") data = title === "Title" ? titleFacts : auction;
  return (
    <dl className="facts">
      {data.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

function WorkstreamCard({
  title,
  state,
  scenario,
}: {
  title: string;
  state: string;
  scenario: Scenario;
}) {
  return (
    <details className="tile" open={title === (scenario.mode === "repo" ? "Repossession" : "Title")}>
      <summary>
        <span className="tile-heading-row">
          <span><strong>{title}</strong><Chip tone={scenario.tone}>{state}</Chip></span>
          <span className="tile-meta">View details <span aria-hidden="true">⌄</span></span>
        </span>
        <WorkstreamSummary title={title} scenario={scenario} />
      </summary>
      <div className="tile-body">
        <Facts scenario={scenario} title={title} />
      </div>
    </details>
  );
}

function Timeline({
  scenario,
  filter,
  setFilter,
  onSource,
}: {
  scenario: Scenario;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onSource: (event: EventItem) => void;
}) {
  const filters: Filter[] = scenario.mode === "repo" ? ["All", "Recovery"] : ["All", "Recovery", "Title", "Auction", "Financial"];
  const events = scenario.events.filter((event) => filter === "All" || event.category === filter);
  return (
    <section className="activity-card">
      <div className="content-section-heading">
        <div>
          <span className="eyebrow">Unified asset history</span>
          <h2>Timeline</h2>
          <p>Review accepted milestones and their source coverage.</p>
        </div>
      </div>
      <div className="filter-row" aria-label="Timeline filters">
        {filters.map((item) => <ControlButton key={item} active={filter === item} onClick={() => setFilter(item)}>{item}</ControlButton>)}
      </div>
      <ol className="timeline-list">
        {events.map((event, index) => (
          <li key={`${event.label}-${index}`}>
            <span className={`event-dot ${event.coverage ? event.coverage.toLowerCase() : ""}`} aria-hidden="true" />
            <button type="button" onClick={() => onSource(event)}>
              <span><strong>{event.label}</strong><small>{event.category} · {event.coverage || "Current coverage"}</small></span>
              <time>{event.date}</time>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DetailContent({ scenario }: { scenario: Scenario }) {
  return (
    <section>
      <div className="content-section-heading">
        <div>
          <span className="eyebrow">Reference information</span>
          <h2>Case details</h2>
          <p>Additional asset, case, and data-coverage information.</p>
        </div>
      </div>
      <div className="details-panel">
      <div>
        <h2>Asset & case</h2>
        <dl className="identity-detail-list">
          <div><dt>VIN</dt><dd>1FMCU9HDBNUA12345</dd></div>
          <div><dt>Client account / loan</dt><dd>•• 6789</dd></div>
          <div><dt>ARM case</dt><dd>104872</dd></div>
          <div><dt>Client configuration</dt><dd>{scenario.mode === "repo" ? "Repo-only" : "Repo + Remarketing"}</dd></div>
        </dl>
        <dl className="facts detail-facts">
          <div><dt>Year</dt><dd>2022</dd></div>
          <div><dt>Make</dt><dd>Ford</dd></div>
          <div><dt>Model</dt><dd>Escape</dd></div>
          <div><dt>Mileage</dt><dd>42,318</dd></div>
          <div><dt>Client ID</dt><dd>C-10428</dd></div>
        </dl>
      </div>
      </div>
    </section>
  );
}

function SourceContent({ scenario, onSource }: { scenario: Scenario; onSource: () => void }) {
  const sources =
    scenario.mode === "repo"
      ? [
          {
            workstream: "Recovery",
            source: "RDN",
            sourceTime: scenario.id === "recovery-unavailable" ? "Unavailable" : "Oct 13, 2026 · 8:20 PM",
            acceptedTime: scenario.id === "recovery-unavailable" ? "No accepted update" : "Oct 14, 2026 · 1:05 AM",
            cadence: "Daily delivery · approximately one-day expected delay",
            coverage: scenario.id === "recovery-unavailable" ? "Unavailable" : "Current for daily feed",
          },
        ]
      : [
          {
            workstream: "Recovery",
            source: "RDN",
            sourceTime: "Aug 28, 2026 · 4:32 PM",
            acceptedTime: "Aug 29, 2026 · 1:05 AM",
            cadence: "Daily delivery · approximately one-day expected delay",
            coverage: "Current for daily feed",
          },
          {
            workstream: "Title",
            source: "Location Services",
            sourceTime: "Oct 14, 2026 · 2:42 PM",
            acceptedTime: "Oct 14, 2026 · 2:42 PM",
            cadence: "Documented as real time · cadence requires validation",
            coverage: scenario.id === "title-issue" ? "Verified issue" : "Current",
          },
          {
            workstream: "Remarketing",
            source: "AutoIMS",
            sourceTime: "Oct 14, 2026 · 3:44 PM",
            acceptedTime: "Oct 14, 2026 · 3:48 PM",
            cadence: "Several times daily · cadence requires validation",
            coverage: scenario.id === "delayed" ? "Delayed · last accepted state retained" : "Current",
          },
        ];
  return (
    <section>
      <div className="content-section-heading">
        <div>
          <span className="eyebrow">Information accountability</span>
          <h2>Source and coverage</h2>
          <p>Review where the displayed information came from and when ARM accepted it.</p>
        </div>
      </div>
      <div className="source-overview">
        <div className="source-table" role="table" aria-label="Workstream source coverage">
          <div className="source-table-header" role="row">
            <span role="columnheader">Workstream</span><span role="columnheader">Source</span><span role="columnheader">Source event</span><span role="columnheader">ARM accepted</span><span role="columnheader">Coverage and cadence</span>
          </div>
          {sources.map((item) => (
            <div className="source-table-row" role="row" key={item.workstream}>
              <strong role="cell">{item.workstream}</strong>
              <span role="cell">{item.source}</span>
              <span role="cell">{item.sourceTime}</span>
              <span role="cell">{item.acceptedTime}</span>
              <span role="cell"><strong>{item.coverage}</strong><small>{item.cadence}</small></span>
            </div>
          ))}
        </div>
        {scenario.mode === "full" && (
          <div className="mapping-decisions">
            <span className="eyebrow">Open mapping decisions</span>
            <ul>
              <li><strong>Title Status</strong><span>Confirm source strategy and lender-facing transformation.</span></li>
              <li><strong>Auction Status</strong><span>Confirm mapping before treating scenario semantics as production logic.</span></li>
              <li><strong>Current Vendor</strong><span>Confirm source field and permission behavior.</span></li>
            </ul>
          </div>
        )}
        <ControlButton className="secondary-action" onClick={onSource}>Review full provenance</ControlButton>
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<ClientMode>("full");
  const [scenarioId, setScenarioId] = useState("scheduled");
  const [tab, setTab] = useState<Tab>("Details");
  const [drawer, setDrawer] = useState<EventItem | null>(null);
  const [research, setResearch] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [showCase, setShowCase] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scenarios = mode === "repo" ? repoScenarios : fullScenarios;
  const scenario = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) || scenarios[0],
    [scenarioId, scenarios],
  );
  const reportState = conditionReportState(scenario);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const changeMode = (next: ClientMode) => {
    setMode(next);
    setScenarioId(next === "repo" ? "assignment" : "scheduled");
    setTab("Details");
  };

  if (!showCase) {
    return (
      <div className="app-shell">
        <SideNavigation />
        <main className="main-area">
          <PrototypeBar mode={mode} onMode={changeMode} scenarios={scenarios} scenario={scenario} onScenario={setScenarioId} research={research} onResearch={() => setResearch(!research)} />
          <CasesList query={searchQuery} setQuery={setSearchQuery} openCase={() => setShowCase(true)} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <SideNavigation />
      <main className="main-area">
        <PrototypeBar mode={mode} onMode={changeMode} scenarios={scenarios} scenario={scenario} onScenario={setScenarioId} research={research} onResearch={() => setResearch(!research)} />
        <div className="page">
          <header className={`case-header ${searchOpen ? "search-is-open" : ""}`}>
            <div className="case-header-content">
              <div className="case-header-utility">
                <ControlButton className="case-header-back" onClick={() => setShowCase(false)}>← All cases</ControlButton>
                <button className="header-search-trigger" type="button" aria-label="Search cases" onClick={() => setSearchOpen(true)}>
                  <img src={icon("81363")} alt="" />
                </button>
              </div>
              <div className="case-header-identity">
                <div className="identity-main">
                  <span className="eyebrow">ARM asset recovery</span>
                  <h1>2022 Ford Escape <PhaseTag phase={mode === "repo" ? "Repossession" : "Remarketing"} /></h1>
                  <div className="identity-keyline">
                    <span className="account-identity"><small>Client account / loan</small><strong>•• 6789</strong></span>
                    <span><small>ARM case</small><strong>104872</strong></span>
                  </div>
                </div>
                <div className="header-freshness">
                  <small>Last accepted update</small>
                  <strong>Oct 14, 2026 · 3:48 PM ET</strong>
                  <span><i className={`coverage ${scenario.dataCondition ? "delayed" : "current"}`} />{scenario.dataCondition ? "Source update delayed" : "Coverage current"}</span>
                </div>
              </div>
            </div>
            <form
              className="header-search-takeover"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearchOpen(false);
                setShowCase(false);
              }}
            >
              <img src={icon("81363")} alt="" />
              <label className="sr-only" htmlFor="sticky-case-search">Search loan, VIN, or case number</label>
              <input
                ref={searchInputRef}
                id="sticky-case-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search loan, VIN, or case number"
                tabIndex={searchOpen ? 0 : -1}
              />
              <button className="takeover-submit" type="submit" tabIndex={searchOpen ? 0 : -1}>Search cases</button>
              <button className="takeover-close" type="button" aria-label="Close search" tabIndex={searchOpen ? 0 : -1} onClick={() => setSearchOpen(false)}>×</button>
            </form>
          </header>

          {scenario.tone === "warning" && scenario.id !== "recovery-unavailable" && (
            <div className="verified-exception" role="status">
              <span className="status-icon">!</span>
              <span><strong>Verified attention need</strong><small>{scenario.context}</small></span>
              <Chip tone="warning">{scenario.semantic}</Chip>
            </div>
          )}
          {scenario.dataCondition && (
            <div className="data-condition"><span aria-hidden="true">!</span><strong>Data condition</strong><p>{scenario.dataCondition}</p></div>
          )}

          <div className="content-layout">
            <div className="primary-column">
              <Summary scenario={scenario} onCondition={() => setConditionOpen(true)} />
              <ProgressTimeline scenario={scenario} onSource={setDrawer} />

              <section>
                <div className="content-section-heading">
                  <div>
                    <span className="eyebrow">Current work</span>
                    <h2>Workstreams</h2>
                    <p>Expand a workstream to review its latest accepted details.</p>
                  </div>
                  <span className="read-only-label">Read-only</span>
                </div>
                <div className="workstreams">
                  {scenario.mode === "repo" ? (
                    <WorkstreamCard title="Repossession" state={scenario.happening} scenario={scenario} />
                  ) : (
                    <>
                      <WorkstreamCard title="Title" state={scenario.id === "title-issue" ? "Attention needed" : scenario.id === "title-wait" ? "Processing" : "Complete"} scenario={scenario} />
                      <WorkstreamCard title="Remarketing" state={scenario.happening} scenario={scenario} />
                    </>
                  )}
                </div>
              </section>

              <nav className="tabs" aria-label="Supporting case information">
                {(["Details", "Source"] as Tab[]).map((item) => (
                  <ControlButton key={item} active={tab === item} onClick={() => setTab(item)}>{item}</ControlButton>
                ))}
              </nav>

              {tab === "Details" && <DetailContent scenario={scenario} />}
              {tab === "Source" && <SourceContent scenario={scenario} onSource={() => setDrawer({ label: "Case update", date: "Oct 14 · 3:48 PM", category: mode === "repo" ? "Recovery" : "Auction" })} />}
            </div>

          </div>
        </div>
      </main>

      {research && (
        <aside className="research-panel" aria-label="Facilitator research panel">
          <div><span className="eyebrow">Research mode</span><h2>{scenario.name}</h2></div>
          <dl>
            <div><dt>Participant task</dt><dd>{scenario.task}</dd></div>
            <div><dt>Correct interpretation</dt><dd>{scenario.interpretation}</dd></div>
            <div><dt>Expected action</dt><dd>{scenario.guidance}</dd></div>
            <div><dt>Points to observe</dt><dd>{scenario.observe}</dd></div>
            <div><dt>Source assumptions</dt><dd>Synthetic prototype data. Confirm mappings in technical-discovery workbook.</dd></div>
            <div><dt>Unresolved questions</dt><dd>Confirm production permissions, service windows, and governed support links.</dd></div>
          </dl>
        </aside>
      )}

      {drawer && (
        <div className="scrim" onMouseDown={() => setDrawer(null)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header"><div><span className="eyebrow">Evidence & provenance</span><h2 id="drawer-title">{drawer.label}</h2></div><ControlButton ariaLabel="Close source details" onClick={() => setDrawer(null)}>×</ControlButton></div>
            <dl className="provenance">
              <div><dt>Source system</dt><dd>{drawer.category === "Recovery" ? "RDN" : drawer.category === "Title" ? "Location Services" : "AutoIMS"}</dd></div>
              <div><dt>Mapped event</dt><dd>{drawer.label}</dd></div>
              <div><dt>Source event time</dt><dd>{drawer.date}</dd></div>
              <div><dt>ARM accepted time</dt><dd>Oct 14, 2026 · 3:48 PM ET</dd></div>
              <div><dt>CenterPoint semantic</dt><dd>{scenario.semantic}</dd></div>
              <div><dt>Transformation note</dt><dd>Source event is mapped to a lender-facing business state; technical conditions are displayed separately.</dd></div>
              <div><dt>Data coverage</dt><dd>{drawer.coverage || "Current"}</dd></div>
              <div><dt>Last accepted value</dt><dd>{scenario.happening}</dd></div>
            </dl>
            <div className="support-note"><strong>Delayed or unavailable?</strong><p>Use the approved ARM support path and reference case 104872. CenterPoint remains read-only.</p></div>
          </aside>
        </div>
      )}

      {conditionOpen && (
        <div className="scrim modal-scrim" onMouseDown={() => setConditionOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="condition-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header"><div><span className="eyebrow">Approved document link</span><h2 id="condition-title">Condition Report</h2></div><ControlButton ariaLabel="Close condition report" onClick={() => setConditionOpen(false)}>×</ControlButton></div>
            {reportState === "unavailable" || reportState === "restricted" ? (
              <div className="report-unavailable">
                <span aria-hidden="true">!</span>
                <div>
                  <strong>{reportState === "restricted" ? "Condition Report permission restricted" : "Condition Report link unavailable"}</strong>
                  <p>{reportState === "restricted" ? "The report exists, but this user does not have permission to open it. The Remarketing business state remains unchanged." : "No approved report URL has been accepted from AutoIMS. The report state is not inferred."}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="report-preview"><span aria-hidden="true">CR</span><div><strong>2022 Ford Escape</strong><p>Report completed Oct 9, 2026 · AutoIMS</p></div></div>
                {reportState === "delayed" && <div className="report-delay"><strong>Source update delayed</strong><p>This is the last accepted Condition Report. The business state remains unchanged.</p></div>}
                <p>This prototype simulates opening the approved external Condition Report. No customer or production data is included.</p>
              </>
            )}
            <ControlButton className="primary-action" onClick={() => setConditionOpen(false)}>Close report</ControlButton>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
