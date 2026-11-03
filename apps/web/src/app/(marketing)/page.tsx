import Opening from "@/components/marketing/Opening";
import Hero from "@/components/marketing/Hero";
import Navigation from "@/components/marketing/Navigation";
import Audience from "@/components/marketing/Audience";
import Organiser from "@/components/marketing/Organiser";
import Vendor from "@/components/marketing/Vendor";

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
      </main>
    </>
  )
}
