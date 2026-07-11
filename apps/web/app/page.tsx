import { ActionCard } from "@/components/ActionCard";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import {
  ClipboardHeartIcon,
  DocumentUserIcon,
  MapPinIcon
} from "@/components/icons";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-cream">
      <Header />

      <main>
        <HeroSection />

        <section className="px-5 pb-20 sm:px-10 sm:pb-24 lg:px-16 lg:pb-28">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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
