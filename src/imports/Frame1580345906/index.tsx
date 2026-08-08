import svgPaths from "./svg-5x2tp2zf7g";

export default function Frame() {
  return (
    <div className="relative size-full">
      <svg className="absolute block inset-0 size-full" fill="none" height="120" preserveAspectRatio="none" viewBox="0 0 361 120" width="361">
        <g id="Frame 1580345906">
          <foreignObject height="128" width="369" x="-4" y="-4">
            <div style={{ backdropFilter: "blur(2px)", clipPath: "url(#bgblur_0_0_4_clip_path)", height: "100%", width: "100%" }} xmlns="http://www.w3.org/1999/xhtml" />
          </foreignObject>
          <path d={svgPaths.p1991e980} fill="url(#paint0_linear_0_4)" fillOpacity="0.5" id="Subtract" data-figma-bg-blur-radius="4" />
        </g>
        <defs>
          <clipPath id="bgblur_0_0_4_clip_path" transform="translate(4 4)">
            <path d={svgPaths.p1991e980} />
          </clipPath>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_0_4" x1="180.5" x2="180.5" y1="120" y2="2.30016e-06">
            <stop />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}