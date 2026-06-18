import svgPaths from "./svg-c3v6ubgvmh";
import imgMap from "./4e2d738902beedab13745a0c7e647c44bc1a5a69.png";

function YourLocation() {
  return (
    <div className="absolute contents left-[47px] top-[720px]" data-name="Your location">
      <div className="absolute bg-white border-[#b8b8b8] border-b border-solid h-[35px] left-[84px] top-[720px] w-[263px]" />
      <p className="[word-break:break-word] absolute font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] left-[84px] text-[13px] text-black top-[731px] tracking-[-0.08px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Your location
      </p>
      <p className="[word-break:break-word] absolute font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] left-[313px] text-[13px] text-black top-[732px] tracking-[-0.08px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        18:08
      </p>
      <div className="absolute left-[47px] overflow-clip size-[24px] top-[731px]" data-name="location_on">
        <div className="absolute inset-[8.33%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
            <path d={svgPaths.p27d45600} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function EndNavigation() {
  return (
    <button className="absolute contents cursor-pointer left-[337px] top-[27px]" data-name="end navigation">
      <div className="absolute left-[337px] size-[40px] top-[27px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
          <circle cx="20" cy="20" fill="var(--fill-0, white)" id="Ellipse 1" r="20" />
        </svg>
      </div>
      <div className="absolute left-[345px] overflow-clip size-[24px] top-[35px]" data-name="close">
        <div className="absolute inset-[20.83%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
            <path d={svgPaths.p2aa77200} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function Navigation() {
  return (
    <div className="bg-white relative size-full" data-name="Navigation">
      <div className="absolute h-[869px] left-[-339px] top-0 w-[1071px]" data-name="map">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[110.53%] left-0 max-w-none top-[-10.44%] w-full" src={imgMap} />
        </div>
      </div>
      <div className="absolute bg-[#d9d9d9] h-[110px] left-[19px] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[708px] w-[355px]" data-name="background" />
      <div className="absolute h-[86px] left-[30px] top-[720px] w-[335px]" data-name="bg">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 335 86">
          <path d={svgPaths.p17ebbd40} fill="var(--fill-0, white)" id="bg" />
        </svg>
      </div>
      <p className="[word-break:break-word] absolute font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] left-[84px] text-[#5b5b5b] text-[13px] top-[764px] tracking-[-0.08px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        walk 5 min (350 m)
      </p>
      <div className="absolute left-[49px] overflow-clip size-[20px] top-[763px]" data-name="More vertical">
        <div className="absolute inset-[16.67%_45.83%]" data-name="Icon">
          <div className="absolute inset-[-7.5%_-60%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3.66667 15.3333">
              <g id="Icon">
                <path d={svgPaths.p32d79700} stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p61f2c00} stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p2a96b080} stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </g>
            </svg>
          </div>
        </div>
      </div>
      <YourLocation />
      <div className="absolute left-[-88px] overflow-clip size-[24px] top-[138px]" data-name="Arrow up-right">
        <div className="absolute inset-[29.17%]" data-name="Icon">
          <div className="absolute inset-[-12.5%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.5 12.5">
              <path d={svgPaths.p230240} id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      </div>
      <EndNavigation />
    </div>
  );
}