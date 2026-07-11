"use client";

import { useEffect, useState } from "react";
import type { VoiceState } from "./VoiceInteractionPanel";

const KEY_TIMES = "0;0.2;0.4;0.6;0.8;1";
const KEY_SPLINES =
  "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1";

type AnimatedVoiceState = Exclude<VoiceState, "paused" | "error">;

const wavePaths = {
  idle: [
    "M0 73 C78 68 132 68 204 73 C286 80 340 82 420 75 C508 66 568 65 642 71 C720 78 770 80 848 73 C940 66 1030 68 1200 71",
    "M0 72 C72 71 136 66 206 70 C286 75 346 84 426 78 C506 70 566 63 642 68 C720 74 780 83 852 76 C936 68 1030 66 1200 70",
    "M0 74 C78 70 130 73 204 76 C286 80 342 76 420 70 C508 64 568 68 642 74 C720 81 776 78 850 71 C934 66 1030 71 1200 73",
    "M0 71 C82 66 132 70 204 75 C288 82 346 80 424 72 C510 65 568 66 642 71 C718 77 780 81 854 74 C940 69 1030 64 1200 69",
    "M0 72 C76 69 134 67 204 72 C286 78 344 83 424 76 C508 68 566 64 642 69 C718 75 780 82 854 77 C938 70 1030 67 1200 71"
  ],
  listening: [
    "M0 73 C74 65 132 63 202 72 C286 84 342 90 420 76 C506 59 568 58 642 70 C724 85 782 91 856 76 C948 58 1030 62 1200 70",
    "M0 72 C76 76 132 58 204 64 C290 71 340 91 424 84 C506 76 570 54 644 61 C724 69 780 92 856 84 C940 74 1030 58 1200 68",
    "M0 75 C72 64 132 76 204 83 C284 90 344 72 424 62 C506 54 568 69 644 80 C724 91 782 78 856 65 C944 55 1028 72 1200 74",
    "M0 70 C78 58 136 60 204 70 C286 86 346 88 424 74 C508 62 570 56 644 68 C724 82 780 93 856 80 C944 66 1032 56 1200 67",
    "M0 73 C76 68 134 61 204 67 C286 75 344 91 424 82 C506 72 568 56 644 62 C724 71 780 89 856 82 C944 72 1030 60 1200 69"
  ],
  processing: [
    "M0 72 C80 70 140 70 210 72 C300 75 352 76 430 72 C512 68 575 68 650 71 C730 74 790 75 865 72 C955 69 1040 69 1200 71",
    "M0 73 C82 71 140 69 210 70 C300 72 354 76 430 74 C512 71 576 67 650 69 C730 71 792 76 866 74 C956 72 1040 68 1200 70",
    "M0 71 C80 69 142 72 210 74 C300 76 354 73 430 70 C512 68 576 70 650 73 C732 75 792 73 866 70 C958 68 1040 71 1200 72",
    "M0 72 C82 70 142 69 210 71 C300 74 354 75 430 72 C512 69 576 68 650 70 C732 73 792 76 866 73 C958 70 1040 69 1200 71",
    "M0 73 C82 71 142 70 210 72 C300 75 354 74 430 71 C512 68 576 69 650 72 C732 75 792 74 866 71 C958 69 1040 70 1200 72"
  ],
  speaking: [
    "M0 73 C76 67 134 62 204 70 C292 82 340 85 424 73 C506 64 570 60 644 68 C728 80 778 86 856 74 C944 62 1030 65 1200 70",
    "M0 71 C74 75 136 61 204 64 C288 70 344 88 424 81 C506 72 570 58 644 63 C728 72 778 88 856 82 C944 72 1030 60 1200 69",
    "M0 74 C76 65 136 72 204 80 C288 87 344 76 424 66 C508 59 570 64 644 75 C728 84 780 79 856 68 C944 60 1030 69 1200 73",
    "M0 70 C76 61 136 59 204 69 C288 84 344 86 424 75 C506 66 570 59 644 67 C728 78 780 88 856 77 C944 66 1030 61 1200 68",
    "M0 72 C76 69 136 63 204 67 C288 76 344 86 424 79 C506 70 570 58 644 64 C728 73 780 86 856 80 C944 70 1030 62 1200 69"
  ]
} satisfies Record<AnimatedVoiceState, string[]>;

const waveProfiles = {
  idle: { duration: "8.5s", echoDuration: "11s", gradientDuration: "10s" },
  listening: { duration: "4.2s", echoDuration: "6.4s", gradientDuration: "5.2s" },
  processing: { duration: "7s", echoDuration: "9.5s", gradientDuration: "8.5s" },
  speaking: { duration: "5.2s", echoDuration: "7.2s", gradientDuration: "6.4s" },
  paused: { duration: "8.5s", echoDuration: "11s", gradientDuration: "10s" },
  error: { duration: "8.5s", echoDuration: "11s", gradientDuration: "10s" }
} satisfies Record<VoiceState, { duration: string; echoDuration: string; gradientDuration: string }>;

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

function loopValues(paths: string[]) {
  return [...paths, paths[0]].join("; ");
}

export function VoiceTransitionWave({ state }: { state: VoiceState }) {
  const reducedMotion = usePrefersReducedMotion();
  const waveState: AnimatedVoiceState = state === "paused" || state === "error" ? "idle" : state;
  const paths = wavePaths[waveState];
  const profile = waveProfiles[state];
  const primaryValues = loopValues(paths);
  const echoValues = loopValues([...paths.slice(2), ...paths.slice(0, 2)]);
  const staticPath = wavePaths.idle[1];

  return (
    <div
      className="hero-transition-wave mx-auto mt-10 h-[72px] w-full max-w-7xl sm:mt-12 sm:h-[104px] lg:mt-10 lg:h-[128px]"
      data-state={state}
      aria-hidden="true"
    >
      <svg
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="careguide-wave-gradient"
            gradientUnits="userSpaceOnUse"
            x1="-160"
            y1="0"
            x2="1360"
            y2="0"
          >
            <stop offset="0%" stopColor="#FAF8F4" />
            <stop offset="24%" stopColor="#D9E3F8" />
            <stop offset="46%" stopColor="#AFC5F4" />
            <stop offset="60%" stopColor="#7EA2ED" />
            <stop offset="78%" stopColor="#D9E3F8" />
            <stop offset="100%" stopColor="#FAF8F4" />
            {!reducedMotion && (
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-120 0;120 0;-120 0"
                dur={profile.gradientDuration}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
              />
            )}
          </linearGradient>
          <linearGradient id="careguide-wave-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop offset="9%" stopColor="white" stopOpacity="1" />
            <stop offset="91%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="black" stopOpacity="0" />
          </linearGradient>
          <mask id="careguide-wave-mask">
            <rect width="1200" height="140" fill="url(#careguide-wave-fade)" />
          </mask>
        </defs>

        <g mask="url(#careguide-wave-mask)">
          <path
            className="hero-transition-wave-path"
            d={reducedMotion ? staticPath : paths[0]}
            fill="none"
            stroke="url(#careguide-wave-gradient)"
            strokeLinecap="round"
            strokeWidth="2.25"
          >
            {!reducedMotion && (
              <animate
                attributeName="d"
                values={primaryValues}
                dur={profile.duration}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes={KEY_TIMES}
                keySplines={KEY_SPLINES}
              />
            )}
          </path>
          {!reducedMotion && (
            <path
              className="hero-transition-wave-echo"
              d={paths[2]}
              fill="none"
              stroke="url(#careguide-wave-gradient)"
              strokeLinecap="round"
              strokeOpacity="0.18"
              strokeWidth="2"
              transform="translate(0 12)"
            >
              <animate
                attributeName="d"
                values={echoValues}
                dur={profile.echoDuration}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes={KEY_TIMES}
                keySplines={KEY_SPLINES}
              />
            </path>
          )}
        </g>
      </svg>
    </div>
  );
}
