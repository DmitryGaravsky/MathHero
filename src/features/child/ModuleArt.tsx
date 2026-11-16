export function ModuleArt({ module }: { module: "multiplication" | "columns" }) {
  return module === "multiplication" ? (
    <svg className="module-art" viewBox="0 0 100 88" aria-hidden="true">
      <rect width="100" height="88" rx="14" fill="#5735a3" />
      <path d="M0 13Q0 0 14 0H82L0 75Z" fill="#7851c6" />
      <g transform="rotate(-9 44 40)">
        <rect x="15" y="11" width="58" height="62" rx="10" fill="#3c256b" stroke="#d5bcff" strokeWidth="2" />
        {["#ffc366", "#ffe07e", "#a4edc0"].map((color, row) =>
          [28, 44, 60].map((x) => <circle key={color + x} cx={x} cy={26 + row * 15} r="5.8" fill={color} />))}
      </g>
      <g transform="rotate(10 75 67)">
        <rect x="61" y="53" width="29" height="29" rx="8" fill="#f1dbff" />
        <path d="m70 62 11 11m0-11L70 73" stroke="#5735a3" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  ) : (
    <svg className="module-art" viewBox="0 0 100 88" aria-hidden="true">
      <rect width="100" height="88" rx="14" fill="#18798e" />
      <path d="M0 14Q0 0 14 0h74L0 76Z" fill="#268da3" />
      <g transform="rotate(-9 42 42)">
        <rect x="18" y="10" width="51" height="66" rx="4" fill="#103e68" />
        <rect x="17" y="8" width="51" height="65" rx="4" fill="#f3fbff" />
        <path d="M24 9v63m8-63v63m8-63v63m8-63v63m8-63v63m8-63v63M18 16h49m-49 8h49m-49 8h49m-49 8h49m-49 8h49m-49 8h49m-49 8h49"
          stroke="#aacbdf" strokeWidth=".7" />
        <path d="M19 10v61" stroke="#4aa7d5" strokeWidth="4" />
        <g fill="#154769" textAnchor="end" fontFamily="system-ui" fontWeight="750" fontSize="14">
          <text x="62" y="35">586</text>
          <text x="62" y="51">+647</text>
        </g>
        <path d="M28 55h34" stroke="#154769" strokeWidth="1.5" />
      </g>
      <g transform="rotate(31 78 55)">
        <rect x="74" y="31" width="9" height="10" rx="3" fill="#ffa2aa" />
        <path d="M74 39h9v33h-9z" fill="#ffae53" />
        <path d="M74 40h4v32h-4z" fill="#ffcf79" />
        <path d="m74 72 4.5 10L83 72z" fill="#ffdfb0" />
        <path d="m76.8 78.2 1.7 3.8 1.7-3.8z" fill="#183b58" />
      </g>
    </svg>
  );
}
