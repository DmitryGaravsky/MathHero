export type IconName =
  | "home"
  | "training"
  | "results"
  | "map"
  | "settings"
  | "arrow"
  | "check"
  | "calendar"
  | "trophy"
  | "star"
  | "spark";
const paths: Record<IconName, string> = {
  home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
  training:
    "m14 4 6-1-1 6-8 8-4-4 7-9ZM7 13l-4 1-1 5 5-2m4 0-1 4-5 1 2-5M15 8h.01",
  results: "M4 20V10h4v10m2 0V4h4v16m2 0v-7h4v7",
  map: "M3 3h18v18H3ZM9 3v18M15 3v18M3 9h18M3 15h18",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 5 5L20 7",
  calendar: "M4 6h16v15H4ZM4 10h16M8 3v5m8-5v5m-8 7 2 2 5-5",
  trophy: "M8 3h8v8a4 4 0 0 1-8 0Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 4v4m-4 2h8",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
