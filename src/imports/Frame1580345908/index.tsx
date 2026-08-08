import svgPaths from "./svg-bfsv4i05ys";

function Group() {
  return (
    <div className="absolute bottom-0 contents left-0 right-0">
      <div className="absolute aspect-[393/87.3858871459961] bottom-0 left-0 right-0" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="87.3859" preserveAspectRatio="none" viewBox="0 0 393 87.3859" width="393">
          <path d={svgPaths.pcf21b80} fill="url(#paint0_linear_0_4)" id="Vector" />
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_0_4" x1="196.5" x2="196.5" y1="6.56305" y2="87.3859">
              <stop stopColor="#6CEB3E" />
              <stop offset="1" stopColor="#4CED77" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="[word-break:break-word] absolute bottom-[35.08px] flex flex-col font-['Season_Mix-TRIAL:Bold',sans-serif] h-[70.159px] justify-center leading-[0] left-0 not-italic right-0 text-[16px] text-center text-white translate-y-1/2">
        <p className="leading-[normal]">Whatsapp Us</p>
      </div>
    </div>
  );
}

export default function Frame() {
  return (
    <div className="relative size-full">
      <Group />
    </div>
  );
}