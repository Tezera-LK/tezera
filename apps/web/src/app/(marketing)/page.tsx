import About from "@/components/marketing/About";
import Landing from "@/components/marketing/Landing";
import ReactLenis from "lenis/react";

export default function Home() {
  return (
    <>
      <ReactLenis root>
        <Landing />;
        <About />
      </ReactLenis>
    </>
  )
}
