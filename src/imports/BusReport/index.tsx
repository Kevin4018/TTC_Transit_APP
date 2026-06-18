import svgPaths from "./svg-uvmbdghsce";

function BusCard() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col items-center justify-center left-[30px] pb-[45px] pl-[22px] pr-[21px] pt-[46px] rounded-[20px] size-[100px] top-[86px]" data-name="BusCard">
      <p className="[word-break:break-word] font-['Rowdies:Regular',sans-serif] leading-[22px] not-italic relative shrink-0 text-[#4f4f4f] text-[40px] tracking-[-0.08px] whitespace-nowrap">501</p>
    </div>
  );
}

function FinalEstimate() {
  return (
    <div className="[word-break:break-word] absolute contents leading-[22px] left-[46px] top-[145px] tracking-[-0.08px] whitespace-nowrap" data-name="Final estimate">
      <p className="absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] left-[46px] text-[14px] text-black top-[158px]">College St. at Yonge St.</p>
      <p className="absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] left-[262px] text-[#656565] text-[13px] top-[158px]">est.</p>
      <p className="absolute font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] left-[322px] text-[14px] text-black top-[158px]">min.</p>
      <p className="absolute font-['Rowdies:Regular',sans-serif] left-[289px] not-italic text-[#4f4f4f] text-[48px] top-[145px]">2</p>
    </div>
  );
}

function OfficialScheduleOffset() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-[2px] place-items-start relative row-1" data-name="official schedule offset">
      <p className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] ml-[24px] mt-[21px] relative row-1 text-[#656565] text-[13px] tracking-[-0.08px] whitespace-nowrap">schedule</p>
      <p className="[word-break:break-word] col-1 font-['Rowdies:Regular',sans-serif] leading-[22px] ml-[30px] mt-0 not-italic relative row-1 text-[#7d7b7b] text-[35px] tracking-[-0.08px] whitespace-nowrap">-1</p>
      <div className="col-1 ml-0 mt-[20px] overflow-clip relative row-1 size-[24px]" data-name="directions_bus">
        <div className="absolute inset-[8.33%_16.67%_12.5%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 19">
            <path d={svgPaths.p260f4000} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function OfficialSchedule() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="official schedule">
      <OfficialScheduleOffset />
      <div className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] ml-[91px] mt-0 relative row-1 text-[13px] text-black tracking-[-0.08px] whitespace-nowrap">
        <p className="leading-[22px] mb-0">501 is scheduled to arrive at 25:00,</p>
        <p className="leading-[22px]">according to the official TTC data.</p>
      </div>
    </div>
  );
}

function WeatherOffset() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-[4px] place-items-start relative row-1" data-name="weather offset">
      <p className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] ml-[26px] mt-[22px] relative row-1 text-[#656565] text-[13px] tracking-[-0.08px] whitespace-nowrap">weather</p>
      <p className="[word-break:break-word] col-1 font-['Rowdies:Regular',sans-serif] leading-[22px] ml-[27px] mt-0 not-italic relative row-1 text-[#7d7b7b] text-[35px] tracking-[-0.08px] whitespace-nowrap">+2</p>
      <div className="col-1 ml-0 mt-[20px] overflow-clip relative row-1 size-[24px]" data-name="Cloud">
        <div className="absolute inset-[16.67%_4.17%_16.67%_4.14%]" data-name="Icon">
          <div className="absolute inset-[-7.81%_-5.68%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24.506 18.5">
              <path d={svgPaths.pb195300} id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Weather() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="weather">
      <WeatherOffset />
      <div className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] ml-[95px] mt-0 relative row-1 text-[13px] text-black tracking-[-0.08px] whitespace-nowrap">
        <p className="leading-[22px] mb-0 whitespace-pre">{`The weather today is rainy, which `}</p>
        <p className="leading-[22px] whitespace-pre">may cause a slight delay of 2 min.</p>
      </div>
    </div>
  );
}

function TrafficOffset() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-[6px] place-items-start relative row-1" data-name="traffic offset">
      <p className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] ml-[24px] mt-[22px] relative row-1 text-[#656565] text-[13px] tracking-[-0.08px] whitespace-nowrap">traffic</p>
      <p className="[word-break:break-word] col-1 font-['Rowdies:Regular',sans-serif] leading-[22px] ml-[22px] mt-0 not-italic relative row-1 text-[#7d7b7b] text-[35px] tracking-[-0.08px] whitespace-nowrap">+1</p>
      <div className="col-1 ml-0 mt-[20px] overflow-clip relative row-1 size-[24px]" data-name="commute">
        <div className="absolute inset-[16.67%_8.33%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 16">
            <path d={svgPaths.p26c60500} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Traffic() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="traffic">
      <TrafficOffset />
      <div className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] ml-[92px] mt-0 relative row-1 text-[13px] text-black tracking-[-0.08px] whitespace-nowrap">
        <p className="leading-[22px] mb-0 whitespace-pre">{`During high traffic moments, bus `}</p>
        <p className="leading-[22px] whitespace-pre">may delay for 1 min.</p>
      </div>
    </div>
  );
}

function AccidentOffset() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-[3px] place-items-start relative row-1" data-name="accident offset">
      <p className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] ml-[23px] mt-[25px] relative row-1 text-[#656565] text-[13px] tracking-[-0.08px] whitespace-nowrap">accidents</p>
      <p className="[word-break:break-word] col-1 font-['Rowdies:Regular',sans-serif] leading-[22px] ml-[30px] mt-0 not-italic relative row-1 text-[#7d7b7b] text-[35px] tracking-[-0.08px] whitespace-nowrap">±0</p>
      <div className="col-1 ml-0 mt-[21px] overflow-clip relative row-1 size-[24px]" data-name="directions_walk">
        <div className="absolute bottom-[4.17%] left-1/4 right-[20.83%] top-[6.25%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 21.5">
            <path d={svgPaths.p2e3eeb00} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Accidents() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="accidents">
      <AccidentOffset />
      <div className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] ml-[103px] mt-0 relative row-1 text-[13px] text-black tracking-[-0.08px] whitespace-nowrap">
        <p className="leading-[22px] mb-0">no significant accidents happened</p>
        <p className="leading-[22px]">on route of 501.</p>
      </div>
    </div>
  );
}

function ConstructionOffset() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-px place-items-start relative row-1" data-name="construction offset">
      <p className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] ml-[21px] mt-[23px] relative row-1 text-[#656565] text-[13px] tracking-[-0.08px] whitespace-nowrap">construction</p>
      <p className="[word-break:break-word] col-1 font-['Rowdies:Regular',sans-serif] leading-[22px] ml-[35px] mt-0 not-italic relative row-1 text-[#7d7b7b] text-[35px] tracking-[-0.08px] whitespace-nowrap">±0</p>
      <div className="col-1 ml-0 mt-[21px] relative row-1 size-[24px]" data-name="swap_vert">
        <div className="absolute inset-[8.33%_16.67%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 20">
            <path d={svgPaths.p17270380} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Construction() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="construction">
      <ConstructionOffset />
      <div className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] ml-[107px] mt-0 relative row-1 text-[13px] text-black tracking-[-0.08px] w-[212px] whitespace-pre-wrap">
        <p className="leading-[22px] mb-0">{`no significant construction `}</p>
        <p className="leading-[22px]">happening on route of 501.</p>
      </div>
    </div>
  );
}

function OtherOffset() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-[5px] place-items-start relative row-1" data-name="other offset">
      <p className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] leading-[22px] ml-[24px] mt-[23px] relative row-1 text-[#656565] text-[13px] tracking-[-0.08px] whitespace-nowrap">other</p>
      <p className="[word-break:break-word] col-1 font-['Rowdies:Regular',sans-serif] leading-[22px] ml-[20px] mt-0 not-italic relative row-1 text-[#7d7b7b] text-[35px] tracking-[-0.08px] whitespace-nowrap">±0</p>
      <div className="col-1 ml-0 mt-[19px] overflow-clip relative row-1 size-[24px]" data-name="star">
        <div className="absolute inset-[12.5%_8.33%_8.33%_8.33%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 19">
            <path d={svgPaths.p33d87f00} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Other() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="other">
      <OtherOffset />
      <div className="[word-break:break-word] col-1 font-['SF_Compact:Regular',sans-serif] font-[457.8999938964844] ml-[88px] mt-0 relative row-1 text-[13px] text-black tracking-[-0.08px] whitespace-nowrap">
        <p className="leading-[22px] mb-0">no significant other events</p>
        <p className="leading-[22px]">happening effecting route of 501.</p>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[56px] items-center leading-[0] left-[34px] top-[203px] w-[325px]">
      <OfficialSchedule />
      <Weather />
      <Traffic />
      <Accidents />
      <Construction />
      <Other />
    </div>
  );
}

export default function BusReport() {
  return (
    <div className="bg-white relative size-full" data-name="Bus report">
      <div className="absolute bg-white border-2 border-[#9d9d9d] border-solid h-[749px] left-[19px] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[69px] w-[355px]" data-name="background" />
      <BusCard />
      <FinalEstimate />
      <Frame />
      <button className="absolute block cursor-pointer left-[335px] overflow-clip size-[24px] top-[86px]" data-name="close">
        <div className="absolute inset-[20.83%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
            <path d={svgPaths.p2aa77200} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </button>
    </div>
  );
}