"use client";

import { GuideAgentCard } from "./GuideAgentCard";
import { HeroIllustration } from "./HeroIllustration";
import { VoiceTransitionWave } from "./VoiceTransitionWave";

export function HeroSection() {
  return (
    <section className="px-5 pb-12 pt-12 sm:px-10 sm:pb-16 sm:pt-16 lg:px-16 lg:pb-18 lg:pt-18">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.45fr)_minmax(30rem,0.5fr)] lg:justify-between xl:gap-[5%]">
        <div>
          <div className="flex items-start gap-4">
            <h1 className="font-editorial max-w-2xl text-[2.15rem] font-medium leading-[1.08] tracking-normal text-navy sm:text-[2.8rem] md:text-[3.15rem] lg:text-[3.45rem] xl:text-[3.8rem]">
              We’re here to help you get the care you deserve.
            </h1>
          </div>

          <p className="mt-6 max-w-[38.75rem] text-[1.05rem] leading-8 text-slatecare sm:text-[1.18rem] sm:leading-9">
            Answer a few simple questions. We’ll help you understand your
            options, prepare your forms, and connect you to local help.
          </p>

          <GuideAgentCard />
        </div>

        <HeroIllustration />
      </div>
      <VoiceTransitionWave state="idle" />
    </section>
  );
}
