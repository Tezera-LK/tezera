import Opening from "@/components/marketing/Opening";
import Hero from "@/components/marketing/Hero";
import Navigation from "@/components/marketing/Navigation";
import Audience from "@/components/marketing/Audience";
import Organiser from "@/components/marketing/Organiser";
import Vendor from "@/components/marketing/Vendor";
import Freelance from "@/components/marketing/Freelance";
import Attendee from "@/components/marketing/Attendee";
import Purpose from "@/components/marketing/Purpose";
import Team from "@/components/marketing/Team";
import Footer from "@/components/marketing/Footer";

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
        <section id="vendor">
          <Vendor />
        </section>
        <section id="freelancer">
          <Freelance />
        </section>
        <section id="attendee">
          <Attendee />
        </section>
        <section id="purpose">
          <Purpose />
        </section>
        <section id="team">
          <Team />
        </section>
        <section id="contact">
          <Footer />
        </section>

      </main>
    </>
  )
}
