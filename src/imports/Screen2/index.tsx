import svgPaths from "./svg-d6d7v74u6s";
import imgRectangle3467599 from "./68143c346ca972cc10d7f55aff2dd8ffb41326d2.png";
import imgSubtract from "./b6197db0286b3fb64e87acc7002782fc157ea3a8.png";

function Frame3() {
  return (
    <div className="relative shrink-0 size-[361px]">
      <div className="absolute left-0 size-[361px] top-0" data-name="Subtract">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="361" src={imgSubtract} width="361" />
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-[361px]">
      <Frame3 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="relative shrink-0 size-[361px]">
      <div className="absolute left-0 size-[361px] top-0" data-name="Subtract">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="361" src={imgSubtract} width="361" />
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-[361px]">
      <Frame5 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="relative shrink-0 size-[361px]">
      <div className="absolute left-0 size-[361px] top-0" data-name="Subtract">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="361" src={imgSubtract} width="361" />
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-[361px]">
      <Frame6 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[40px] items-center justify-center left-[16px] top-[123.98px] w-[361px]">
      <div className="[word-break:break-word] flex flex-col font-['Season_Mix-TRIAL:Bold',sans-serif] justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#232323] text-[36px] text-center w-[min-content]">
        <p className="leading-[normal]">Modak Pushp Backdrop</p>
      </div>
      <Frame />
      <Frame1 />
      <Frame2 />
    </div>
  );
}

export default function Screen() {
  return (
    <div className="bg-white relative size-full" data-name="Screen 2">
      <div className="-translate-x-1/2 absolute h-[1264.402px] left-1/2 top-[-0.4px] w-[393px]">
        <img alt="" className="absolute inset-0 max-w-none object-cover opacity-85 pointer-events-none size-full" src={imgRectangle3467599} />
      </div>
      <Frame4 />
      <div className="absolute aspect-[392.9949645996094/211.42298889160156] left-[0.01px] right-0 top-0" data-name="Subtract">
        <svg className="absolute block inset-0 size-full" fill="none" height="211.423" preserveAspectRatio="none" viewBox="0 0 392.995 211.423" width="392.995">
          <foreignObject height="235.423" width="416.995" x="-12" y="-12">
            <div style={{ backdropFilter: "blur(6px)", clipPath: "url(#bgblur_0_0_5_clip_path)", height: "100%", width: "100%" }} xmlns="http://www.w3.org/1999/xhtml" />
          </foreignObject>
          <path d={svgPaths.p2a04380} fill="url(#paint0_linear_0_5)" fillOpacity="0.75" id="Subtract" data-figma-bg-blur-radius="12" />
          <defs>
            <clipPath id="bgblur_0_0_5_clip_path" transform="translate(12 12)">
              <path d={svgPaths.p2a04380} />
            </clipPath>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_0_5" x1="196.498" x2="196.498" y1="15.8788" y2="211.423">
              <stop stopColor="#007AB1" />
              <stop offset="1" stopColor="#00579A" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="absolute aspect-[393/87.3858871459961] bottom-0 left-0 right-0" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="87.3859" preserveAspectRatio="none" viewBox="0 0 393 87.3859" width="393">
          <foreignObject height="111.386" width="417" x="-12" y="-12">
            <div style={{ backdropFilter: "blur(6px)", clipPath: "url(#bgblur_0_0_4_clip_path)", height: "100%", width: "100%" }} xmlns="http://www.w3.org/1999/xhtml" />
          </foreignObject>
          <path d={svgPaths.pcf21b80} fill="url(#paint0_linear_0_4)" fillOpacity="0.75" id="Vector" data-figma-bg-blur-radius="12" />
          <defs>
            <clipPath id="bgblur_0_0_4_clip_path" transform="translate(12 12)">
              <path d={svgPaths.pcf21b80} />
            </clipPath>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_0_4" x1="196.5" x2="196.5" y1="6.56305" y2="87.3859">
              <stop stopColor="#6CEB3E" />
              <stop offset="1" stopColor="#4CED77" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="[word-break:break-word] absolute bottom-[36.8px] flex flex-col font-['Season_Mix-TRIAL:Bold',sans-serif] h-[73.597px] justify-center leading-[0] left-0 not-italic right-0 text-[16px] text-center text-white translate-y-1/2">
        <p className="leading-[normal]">DM us for more information</p>
      </div>
    </div>
  );
}