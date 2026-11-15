import { useApp } from "../../app/AppContext";

export function Mascot({ small = false }: { small?: boolean }) {
  const { t } = useApp();
  return (
    <svg
      className={`mascot ${small ? "mascot-small" : ""}`}
      role="img"
      aria-label={t("foxAlt")}
      viewBox="0 0 300 300"
    >
      <ellipse cx="151" cy="275" rx="65" ry="10" fill="#ccd1e6" opacity=".5" />
      <path d="M197 212q61-65 63-10c4 45-54 60-77 37" fill="#ee8e44" />
      <path d="M240 185q27 0 19 35l-26-10Z" fill="#fff1dc" />
      <path
        d="m112 231-6 34q14 15 32 2l7-29m16 0 5 29q21 11 30-2l-7-34"
        fill="#e6eaf8"
        stroke="#b1bbd7"
        strokeWidth="4"
      />
      <path
        d="M106 178q-32 10-37 48 8 12 19 5l24-29m79-20q30 10 42-13 13-5 17 7-8 40-50 37"
        fill="#e6eaf8"
        stroke="#b1bbd7"
        strokeWidth="4"
      />
      <rect
        x="105"
        y="170"
        width="92"
        height="77"
        rx="30"
        fill="#f8f9ff"
        stroke="#b1bbd7"
        strokeWidth="4"
      />
      <rect x="130" y="202" width="42" height="25" rx="8" fill="#6558d4" />
      <path d="m151 207 3 5 6 1-4 4 1 5-6-3-5 3 1-5-4-4 6-1Z" fill="#fff" />
      <circle
        cx="150"
        cy="119"
        r="86"
        fill="#e3edff"
        fillOpacity=".7"
        stroke="#aebcda"
        strokeWidth="5"
      />
      <path
        d="m91 112-6-60 49 29m32 0 48-29-6 63"
        fill="#ee8e44"
        stroke="#b55b2d"
        strokeWidth="3"
      />
      <path d="m96 90-2-24 25 18m61 0 25-18-3 24" fill="#ffd0b1" />
      <path d="M90 112q60-66 120 0l-6 42q-55 59-108 0Z" fill="#ef9148" />
      <path
        d="M92 125q28-6 58 25 31-31 58-25l-6 29q-52 52-104 0Z"
        fill="#fff3df"
      />
      <path
        d="M115 121q8-9 15 0m40 0q8-9 15 0"
        fill="none"
        stroke="#3e3549"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="m144 144 12 0q-6 12-12 0" fill="#3e3549" />
      <path
        d="M150 152q-1 9-10 7m10-7q1 9 10 7"
        fill="none"
        stroke="#3e3549"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M87 101q5-32 27-43"
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        opacity=".8"
      />
      <path
        d="M98 184q50 26 103-1"
        fill="none"
        stroke="#b1bbd7"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
