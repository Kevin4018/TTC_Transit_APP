import svgPaths from "./svg-frespjyig5";
import imgIcon from "./e8d0b21b247328a8e92836e60bd74ba4fda1cb94.png";

function Block1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Block">
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative rounded-[32px] shrink-0" data-name="Icon Button">
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Image">
          <div className="absolute inset-[12.5%]" data-name="Icon">
            <div className="absolute inset-[-6.67%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
                <path d={svgPaths.p28dbe600} id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative rounded-[32px] shrink-0" data-name="Icon Button">
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Code">
          <div className="absolute bottom-1/4 left-[8.33%] right-[8.33%] top-1/4" data-name="Icon">
            <div className="absolute inset-[-10%_-6%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.6667 12">
                <path d={svgPaths.p30b65500} id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative rounded-[32px] shrink-0" data-name="Icon Button">
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Mic">
          <div className="absolute inset-[4.17%_20.83%]" data-name="Icon">
            <div className="absolute inset-[-5.45%_-8.57%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.6667 20.3333">
                <path d={svgPaths.p236ed200} id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block() {
  return (
    <div className="content-stretch flex items-start justify-between overflow-clip relative shrink-0 w-full" data-name="block">
      <Block1 />
      <div className="bg-[#d9d9d9] relative rounded-[32px] shrink-0" data-name="Icon Button">
        <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Arrow up">
            <div className="absolute inset-[20.83%]" data-name="Icon">
              <div className="absolute inset-[-8.57%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.6667 13.6667">
                  <path d={svgPaths.p3d198500} id="Icon" stroke="var(--stroke-0, #B3B3B3)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden className="absolute border border-[#b3b3b3] border-solid inset-0 pointer-events-none rounded-[32px]" />
      </div>
    </div>
  );
}

function AiChatChatResponse() {
  return (
    <div className="absolute content-stretch flex gap-[8px] h-[119px] items-start left-[38px] overflow-clip rounded-[8px] top-[271px] w-[309px]" data-name="AI Chat -> Chat Response">
      <div className="relative shrink-0 size-[30px]" data-name="icon">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[130.13%] left-[-10.74%] max-w-none top-[-11.7%] w-[120.83%]" src={imgIcon} />
        </div>
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[1.4] min-w-px not-italic relative text-[#1e1e1e] text-[16px]">{`Sure. 501 is supposed to arrive 5:25 at College & Yonge. However, since it has not arrive, I suspect that it may be delayed due to water pipe explosion at Yonge Street.`}</p>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-[72px] top-[390px]">
      <div className="absolute bg-white border border-[#6f6f6f] border-solid h-[22px] left-[72px] rounded-[30px] top-[390px] w-[76px]" />
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Regular',sans-serif] font-normal leading-[1.4] left-[110px] not-italic text-[#626262] text-[16px] text-center top-[390px] whitespace-nowrap">source</p>
    </div>
  );
}

export default function AiChatbotResult() {
  return (
    <div className="bg-white relative size-full" data-name="AI chatbot-result">
      <div className="absolute bg-white border-2 border-[#9d9d9d] border-solid h-[749px] left-[19px] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[69px] w-[355px]" data-name="background" />
      <button className="absolute block cursor-pointer left-[335px] overflow-clip size-[24px] top-[86px]" data-name="close">
        <div className="absolute inset-[20.83%]" data-name="icon">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
            <path d={svgPaths.p2aa77200} fill="var(--fill-0, #1D1B20)" id="icon" />
          </svg>
        </div>
      </button>
      <div className="absolute bg-white h-[112px] left-[42px] min-h-[80px] min-w-[240px] rounded-[16px] top-[671px] w-[312px]" data-name="AI Chat Box">
        <div className="content-stretch flex flex-col gap-[24px] items-start min-h-[inherit] min-w-[inherit] overflow-clip p-[16px] relative rounded-[inherit] size-full">
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[1.4] not-italic relative shrink-0 text-[#b3b3b3] text-[16px] w-full">Ask me anything about commuting!</p>
          <Block />
        </div>
        <div aria-hidden className="absolute border border-[#d9d9d9] border-solid inset-[-0.5px] pointer-events-none rounded-[16.5px]" />
      </div>
      <AiChatChatResponse />
      <div className="absolute bg-[#f5f5f5] h-[80px] left-[75px] rounded-[8px] top-[167px] w-[272px]" data-name="AI Chat -> User message">
        <div className="content-stretch flex flex-col items-start overflow-clip px-[8px] py-[6px] relative rounded-[inherit] size-full">
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.4] not-italic relative shrink-0 text-[#1e1e1e] text-[16px] w-full">{`Hey Milk! Can you tell me when will 501 arrive at College & Yonge? It is 5:30 already`}</p>
        </div>
        <div aria-hidden className="absolute border border-[#d9d9d9] border-solid inset-0 pointer-events-none rounded-[8px]" />
      </div>
      <Group />
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[1.4] left-[111px] not-italic text-[16px] text-black text-center top-[83px] whitespace-nowrap">Chat with Milk bot</p>
    </div>
  );
}