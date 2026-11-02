import Opening from "@/components/marketing/Opening";
import Hero from "@/components/marketing/Hero";
import Navigation from "@/components/marketing/Navigation";
import Audience from "@/components/marketing/Audience";
import Organiser from "@/components/marketing/Organiser";

export default function Home() {
  return (
    <>
      <Opening />
      <main>
        <Navigation />
        <section id="home">
          <Hero />
        </section>
        <section id="audience">
          <Audience />
        </section>
        <section id="organiser">
          <Organiser />
        </section>
      </main>
    </>
  )
}
