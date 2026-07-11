import { ActionCard } from "@/components/ActionCard";
import { VoiceMissionControl } from "@/components/VoiceMissionControl";
import {
  ClipboardHeartIcon,
  DocumentUserIcon,
  MapPinIcon
} from "@/components/icons";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-cream">
      <main>
        <VoiceMissionControl />

        <section className="px-4 py-12 sm:px-8 sm:py-16 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            <ActionCard
              icon={<ClipboardHeartIcon className="h-8 w-8" aria-hidden />}
              title="Find Coverage"
              text="See what coverage may fit your household."
              ariaLabel="Find Coverage: See what coverage may fit your household."
              href="/coverage/intake"
              variant="primary"
            />
            <ActionCard
              icon={<DocumentUserIcon className="h-8 w-8" aria-hidden />}
              title="Continue Application"
              text="Pick up where you left off."
              ariaLabel="Continue Application: Pick up where you left off."
              href="/dashboard"
              variant="secondary"
            />
            <ActionCard
              icon={<MapPinIcon className="h-8 w-8" aria-hidden />}
              title="Find Local Help"
              text="Connect with trusted help nearby."
              ariaLabel="Find Local Help: Connect with trusted help nearby."
              href="/coverage/help"
              variant="local"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
