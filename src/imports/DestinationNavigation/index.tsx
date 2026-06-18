import svgPaths from "./svg-sftorhr5k7";
import imgMap from "./4e2d738902beedab13745a0c7e647c44bc1a5a69.png";
import imgImage1 from "./cb0afd1c8831cacec947b71a1ac0f19474ebe314.png";

function Frame2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0">
      <div className="overflow-clip relative shrink-0 size-[24px]" data-name="directions_bus">
        <div className="absolute inset-[8.33%_16.67%_12.5%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 19">
            <path d={svgPaths.p260f4000} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] h-[17px] leading-[22px] relative shrink-0 text-[13px] text-black tracking-[-0.08px] w-[43px]">30 min</p>
    </div>
  );
}

function Bus() {
  return (
    <div className="bg-white h-[50px] relative rounded-tl-[10px] rounded-tr-[10px] shrink-0 w-[80px]" data-name="bus">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col items-center justify-center pb-[45px] pl-[22px] pr-[21px] pt-[46px] relative size-full">
          <Frame2 />
        </div>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0">
      <div className="overflow-clip relative shrink-0 size-[24px]" data-name="directions_car">
        <div className="absolute inset-[20.83%_12.5%_12.5%_12.5%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 16">
            <path d={svgPaths.p14c7e3f0} fill="var(--fill-0, #FEF7FF)" id="icon" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] h-[17px] leading-[22px] relative shrink-0 text-[13px] text-white tracking-[-0.08px] w-[43px]">20 min</p>
    </div>
  );
}

function Car() {
  return (
    <div className="bg-[#aaa] h-[50px] relative rounded-tl-[10px] rounded-tr-[10px] shrink-0 w-[80px]" data-name="car">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col items-center justify-center pb-[45px] pl-[22px] pr-[21px] pt-[46px] relative size-full">
          <Frame3 />
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0">
      <div className="overflow-clip relative shrink-0 size-[24px]" data-name="directions_walk">
        <div className="absolute bottom-[4.17%] left-1/4 right-[20.83%] top-[6.25%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 21.5">
            <path d={svgPaths.p2e3eeb00} fill="var(--fill-0, #FEF7FF)" id="icon" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] h-[17px] leading-[22px] relative shrink-0 text-[13px] text-white tracking-[-0.08px] w-[43px]">50 min</p>
    </div>
  );
}

function Walk() {
  return (
    <div className="bg-[#aaa] h-[50px] relative rounded-tl-[10px] rounded-tr-[10px] shrink-0 w-[80px]" data-name="walk">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col items-center justify-center pb-[45px] pl-[22px] pr-[21px] pt-[46px] relative size-full">
          <Frame4 />
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0">
      <div className="h-[24px] relative shrink-0 w-[27px]" data-name="image 1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[146.94%] left-[-14.7%] max-w-none top-[-19.59%] w-[129.03%]" src={imgImage1} />
        </div>
      </div>
      <p className="[word-break:break-word] font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] h-[17px] leading-[22px] relative shrink-0 text-[13px] text-white tracking-[-0.08px] w-[43px]">20 min</p>
    </div>
  );
}

function Bike() {
  return (
    <div className="bg-[#aaa] h-[50px] relative rounded-tl-[10px] rounded-tr-[10px] shrink-0 w-[80px]" data-name="bike">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col items-center justify-center pb-[45px] pl-[22px] pr-[21px] pt-[46px] relative size-full">
          <Frame5 />
        </div>
      </div>
    </div>
  );
}

function TransitMethod() {
  return (
    <div className="absolute content-stretch flex gap-[5px] items-center left-[30px] overflow-x-auto overflow-y-clip top-[451px] w-[335px]" data-name="Transit Method">
      <Bus />
      <Car />
      <Walk />
      <Bike />
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] relative shrink-0 text-[#08f] text-[17px] tracking-[-0.08px] whitespace-pre" style={{ fontVariationSettings: '"wdth" 100' }}>{`        Your location`}</p>
    </div>
  );
}

function StartPointSearch() {
  return (
    <div className="absolute contents left-[19px] top-[64px]" data-name="Start point search">
      <div className="absolute left-[34px] overflow-clip size-[24px] top-[75px]" data-name="location_on">
        <div className="absolute inset-[8.33%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
            <path d={svgPaths.p27d45600} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
      <div className="absolute content-stretch flex h-[44px] items-center left-[19px] rounded-[100px] top-[64px] w-[355px]" data-name="start search bar">
        <div className="bg-[rgba(120,120,128,0.16)] flex-[1_0_0] min-w-px relative rounded-[100px]" data-name="Search Field">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[11px] relative size-full">
              <Frame />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] relative shrink-0 text-[#727272] text-[17px] tracking-[-0.08px] whitespace-pre" style={{ fontVariationSettings: '"wdth" 100' }}>{`        Spadina at Nassu`}</p>
    </div>
  );
}

function DestinationSearch() {
  return (
    <div className="absolute contents left-[20px] top-[115px]" data-name="Destination search">
      <div className="absolute left-[35px] overflow-clip size-[24px] top-[128px]" data-name="location_on">
        <div className="absolute inset-[8.33%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
            <path d={svgPaths.p5cd4f00} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
      <div className="absolute content-stretch flex h-[44px] items-center left-[20px] rounded-[100px] top-[115px] w-[355px]" data-name="Destination search bar">
        <div className="bg-[rgba(120,120,128,0.16)] flex-[1_0_0] min-w-px relative rounded-[100px]" data-name="Search Field">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[11px] relative size-full">
              <Frame1 />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalEstimate() {
  return (
    <div className="[word-break:break-word] absolute contents leading-[22px] left-[82px] top-[586px] tracking-[-0.08px] whitespace-nowrap" data-name="Final estimate">
      <p className="absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] left-[82px] text-[14px] text-black top-[586px]">College St. at Yonge St.</p>
      <p className="absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] left-[268px] text-[#656565] text-[13px] top-[609px]">in</p>
      <p className="absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] left-[316px] text-[#656565] text-[14px] top-[607px]">min.</p>
      <p className="absolute font-['Rowdies:Regular',sans-serif] left-[285px] not-italic text-[#4f4f4f] text-[24px] top-[605px]">10</p>
    </div>
  );
}

function RideHowManyStops() {
  return (
    <div className="absolute contents left-[82px] top-[659px]" data-name="Ride how many stops">
      <div className="absolute left-[82px] overflow-clip size-[16px] top-[665px]" data-name="Chevron down">
        <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]" data-name="Icon">
          <div className="absolute inset-[-20%_-10%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.6 5.6">
              <path d="M0.8 0.8L4.8 4.8L8.8 0.8" id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] left-[103px] text-[#6b6b6b] text-[13px] top-[659px] tracking-[-0.08px] whitespace-nowrap">Ride 12 stops</p>
    </div>
  );
}

function MoreStops() {
  return (
    <div className="absolute contents left-[82px] top-[637px]" data-name="more stops">
      <p className="[word-break:break-word] absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] left-[103px] text-[#6b6b6b] text-[13px] top-[637px] tracking-[-0.08px] whitespace-nowrap">Also in 30 min. and 60 min.</p>
      <div className="absolute left-[82px] overflow-clip size-[16px] top-[643px]" data-name="Chevron down">
        <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]" data-name="Icon">
          <div className="absolute inset-[-20%_-10%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.6 5.6">
              <path d="M0.8 0.8L4.8 4.8L8.8 0.8" id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function StartStation() {
  return (
    <div className="absolute contents left-[46px] top-[586px]" data-name="Start Station">
      <div className="absolute bg-white border-[#b8b8b8] border-b border-solid h-[35px] left-[82px] top-[653px] w-[263px]" />
      <p className="[word-break:break-word] absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] left-[84px] text-[#6b6b6b] text-[13px] top-[607px] tracking-[-0.08px] whitespace-nowrap">501 Queen</p>
      <FinalEstimate />
      <RideHowManyStops />
      <MoreStops />
      <div className="absolute left-[46px] overflow-clip size-[24px] top-[588px]" data-name="directions_bus">
        <div className="absolute inset-[8.33%_16.67%_12.5%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 19">
            <path d={svgPaths.p260f4000} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function EndStation() {
  return (
    <div className="absolute contents left-[47px] top-[690px]" data-name="End station">
      <div className="absolute bg-white border-[#b8b8b8] border-b border-solid h-[35px] left-[82px] top-[690px] w-[263px]" />
      <p className="[word-break:break-word] absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] left-[84px] text-[13px] text-black top-[695px] tracking-[-0.08px] whitespace-nowrap">Spadina at Nassu</p>
      <p className="[word-break:break-word] absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] left-[313px] text-[13px] text-black top-[695px] tracking-[-0.08px] whitespace-nowrap">18:38</p>
      <div className="absolute left-[47px] overflow-clip size-[24px] top-[695px]" data-name="location_on">
        <div className="absolute inset-[8.33%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
            <path d={svgPaths.p5cd4f00} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function YourLocation() {
  return (
    <div className="absolute contents left-[46px] top-[513px]" data-name="Your location">
      <div className="absolute bg-white border-[#b8b8b8] border-b border-solid h-[35px] left-[83px] top-[513px] w-[263px]" />
      <p className="[word-break:break-word] absolute font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] left-[83px] text-[13px] text-black top-[524px] tracking-[-0.08px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Your location
      </p>
      <p className="[word-break:break-word] absolute font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] left-[312px] text-[13px] text-black top-[525px] tracking-[-0.08px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        18:08
      </p>
      <div className="absolute left-[46px] overflow-clip size-[24px] top-[524px]" data-name="location_on">
        <div className="absolute inset-[8.33%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
            <path d={svgPaths.p27d45600} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function StartNavigation() {
  return (
    <div className="absolute bg-[#9d9d9d] content-stretch flex h-[39px] items-center justify-center left-[49px] pb-[9px] pt-[8px] px-[86px] rounded-[10px] top-[753px] w-[297px]" data-name="start navigation">
      <p className="[word-break:break-word] font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] relative shrink-0 text-[16px] text-white tracking-[-0.08px] whitespace-nowrap">Start Navigation</p>
    </div>
  );
}

export default function DestinationNavigation() {
  return (
    <div className="bg-white relative size-full" data-name="Destination navigation">
      <div className="absolute h-[280px] left-[25px] top-[166px] w-[345px]" data-name="map">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[110.53%] left-0 max-w-none top-[-10.44%] w-full" src={imgMap} />
        </div>
      </div>
      <div className="absolute bg-[#d9d9d9] h-[375px] left-[19px] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[443px] w-[355px]" data-name="background" />
      <div className="absolute bg-white h-[305px] left-[30px] rounded-bl-[20px] rounded-br-[20px] top-[501px] w-[335px]" data-name="bg" />
      <p className="[word-break:break-word] absolute font-['SF_Pro:Regular',sans-serif] font-normal leading-[22px] left-[83px] text-[#5b5b5b] text-[13px] top-[557px] tracking-[-0.08px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        walk 5 min (350 m)
      </p>
      <TransitMethod />
      <StartPointSearch />
      <DestinationSearch />
      <div className="absolute left-[48px] overflow-clip size-[20px] top-[556px]" data-name="More vertical">
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
      <div className="absolute flex h-[120px] items-center justify-center left-[57px] top-[589px] w-[2px]">
        <div className="-scale-y-100 flex-none rotate-180">
          <div className="content-stretch flex flex-col h-[120px] items-center overflow-clip py-[16px] relative w-[2px]" data-name="Vertical/Middle-inset">
            <div className="flex flex-[1_0_0] items-center justify-center min-h-px relative w-0" style={{ containerType: "size" }}>
              <div className="flex-none rotate-90 w-[100cqh]">
                <div className="h-0 relative w-full" data-name="Divider">
                  <div className="absolute inset-[-1px_0_0_0]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 88 1">
                      <line id="Divider" stroke="var(--stroke-0, #CAC4D0)" x2="88" y1="0.5" y2="0.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StartStation />
      <EndStation />
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
      <StartNavigation />
    </div>
  );
}