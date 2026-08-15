function HeldObject({ type }) {
  if (!type) return null;
  return (
    <g className={`char-object is-${type}`}>
      <rect className="char-object-card" x="-8" y="-10" width="16" height="13" rx="2.4" />
      {type === "calendar" ? (
        <>
          <rect className="char-object-accent" x="-8" y="-10" width="16" height="3.2" rx="2.4" />
          <path className="char-object-mark" d="M-4.2 -3.4h8.4M-4.2 0.2h8.4M-4.2 3.6h5.2" />
        </>
      ) : type === "bell" ? (
        <>
          <path className="char-object-mark" d="M-2.6 -2.2c0-2.2 1.4-3.6 2.6-3.6s2.6 1.4 2.6 3.6c.4 1.6.8 2.6.8 2.6H-3.4s.4-1 .8-2.6z" />
          <circle className="char-object-dot" cx="0" cy="2.6" r="1.1" />
        </>
      ) : type === "chart" ? (
        <path className="char-object-mark" d="M-4.4 3.4v-6.2M-1.2 3.4v-8.4M2 3.4v-4.2M5 3.4v-7" />
      ) : (
        <>
          <path className="char-object-mark" d="M-4.4 -4.6h8.6M-4.4 -1.2h6.8M-4.4 2.2h5" />
          <circle className="char-object-dot" cx="5.2" cy="-4.6" r="1.05" />
        </>
      )}
    </g>
  );
}

export function CharacterRenderer({ compact = false, hold = null }) {
  return (
    <svg
      className="char-svg"
      viewBox={compact ? "22 3 36 40" : "0 0 80 120"}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse className="char-shadow" cx="40" cy="115.2" rx="13" ry="2.3" />
      <g className="char-figure">
        <g className="char-leg char-leg-left">
          <rect className="char-pants" x="31" y="75.2" width="6.4" height="18.6" rx="3.2" />
          <g className="char-shin char-shin-left">
            <rect className="char-pants" x="31.3" y="92.4" width="5.8" height="14.8" rx="2.9" />
            <path className="char-shoe" d="M28.4 106.4h11.6c1.5 0 2.3 1.15 1.55 2.25H28c-.7-1.1.1-2.25 1.45-2.25z" />
          </g>
        </g>
        <g className="char-leg char-leg-right">
          <rect className="char-pants" x="42.6" y="75.2" width="6.4" height="18.6" rx="3.2" />
          <g className="char-shin char-shin-right">
            <rect className="char-pants" x="42.9" y="92.4" width="5.8" height="14.8" rx="2.9" />
            <path className="char-shoe" d="M40 106.4h11.6c1.5 0 2.3 1.15 1.55 2.25H39.6c-.7-1.1.1-2.25 1.45-2.25z" />
          </g>
        </g>

        <g className="char-torso">
          <path className="guide-blazer" d="M25.6 39.6c.8-4.2 6.2-7 14.4-7s13.6 2.8 14.4 7v35.2c0 3.4-6.2 5.2-14.4 5.2s-14.4-1.8-14.4-5.2z" />
          <path className="char-jacket-shade" d="M25.6 39.6c.4-2.2 2.4-4.2 6.2-5.4v41.8c-4.2-.8-6.2-2.2-6.2-4.2z" />
          <path className="guide-shirt" d="M36.2 35.4L40 54.2l3.8-18.8z" />
          <path className="char-collar" d="M34.4 34.8l5.6 6.4 5.6-6.4-2.2-.4-3.4 3.6-3.4-3.6z" />
          <circle className="char-button" cx="40" cy="58.5" r="0.85" />
          <circle className="char-button" cx="40" cy="64.2" r="0.85" />
        </g>

        <g className="char-arm char-arm-left">
          <rect className="char-sleeve" x="23.1" y="38.4" width="6.2" height="17.8" rx="3.1" />
          <g className="char-forearm char-forearm-left">
            <rect className="char-sleeve-fore" x="22.6" y="54.4" width="5.6" height="13.6" rx="2.8" />
            <ellipse className="char-hand" cx="25.4" cy="69" rx="2.7" ry="3.05" />
          </g>
        </g>
        <g className="char-arm char-arm-right">
          <rect className="char-sleeve" x="50.7" y="38.4" width="6.2" height="17.8" rx="3.1" />
          <g className="char-forearm char-forearm-right">
            <rect className="char-sleeve-fore" x="51.8" y="54.4" width="5.6" height="13.6" rx="2.8" />
            <g className="char-hand-right">
              <ellipse className="char-hand" cx="54.6" cy="69" rx="2.7" ry="3.05" />
              <path className="char-finger" d="M55.6 67.1l4.8-6.4" />
              <g className="char-grip" transform="translate(54.6 61.4)">
                <HeldObject type={hold} />
              </g>
            </g>
          </g>
        </g>

        <rect className="guide-neck" x="37.1" y="30.2" width="5.8" height="6.6" rx="1.8" />
        <g className="char-head">
          <ellipse className="char-ear" cx="28.2" cy="21.2" rx="2.15" ry="2.85" />
          <ellipse className="char-ear" cx="51.8" cy="21.2" rx="2.15" ry="2.85" />
          <circle className="guide-head-fill" cx="40" cy="20.2" r="12.1" />
          <g className="char-hair-group">
            <path className="char-hair" d="M28.2 21.6c.3-9.2 5.4-13.6 11.8-13.6s11.5 4.4 11.8 13.6c-2.4-4-5.8-5.6-11.8-5.6s-9.4 1.6-11.8 5.6z" />
            <path className="char-hair-side" d="M28.1 20.4c-.2 3.2.4 6.2 1.5 7.4-.8-3.2-.8-5.6-.4-7.6zM51.9 20.4c.2 3.2-.4 6.2-1.5 7.4.8-3.2.8-5.6.4-7.6z" />
          </g>
          <ellipse className="char-blush" cx="32.4" cy="24.6" rx="2.1" ry="1.15" />
          <ellipse className="char-blush" cx="47.6" cy="24.6" rx="2.1" ry="1.15" />
          <g className="char-brows">
            <path className="char-brow" d="M33.2 16.05h5.1" />
            <path className="char-brow" d="M41.7 16.05h5.1" />
          </g>
          <g className="char-eyes">
            <g className="char-eye-socket">
              <ellipse className="char-eye-white" cx="35.5" cy="20.35" rx="2.55" ry="2.7" />
              <circle className="char-iris" cx="35.7" cy="20.5" r="1.45" />
              <circle className="companion-pupil char-eye" cx="35.85" cy="20.6" r="0.72" />
              <circle className="char-shine" cx="36.45" cy="19.85" r="0.42" />
              <rect className="char-lid" x="32.8" y="17.4" width="5.5" height="6" rx="2.4" />
            </g>
            <g className="char-eye-socket">
              <ellipse className="char-eye-white" cx="44.5" cy="20.35" rx="2.55" ry="2.7" />
              <circle className="char-iris" cx="44.7" cy="20.5" r="1.45" />
              <circle className="companion-pupil char-eye" cx="44.85" cy="20.6" r="0.72" />
              <circle className="char-shine" cx="45.45" cy="19.85" r="0.42" />
              <rect className="char-lid" x="41.8" y="17.4" width="5.5" height="6" rx="2.4" />
            </g>
          </g>
          <path className="char-nose" d="M39.2 22.7c.4 1.3 1.2 1.3 1.6 0" />
          <path className="char-mouth char-mouth-closed" d="M37.1 25.35c1.1 1.15 2.7 1.15 3.8 0" />
          <ellipse className="char-mouth char-mouth-open" cx="40" cy="25.7" rx="1.55" ry="0.95" />
        </g>
      </g>
    </svg>
  );
}
