import "lenis/dist/lenis.css";
import SmoothScroll from "@/components/marketing/SmoothScroll";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      {children}
    </SmoothScroll>
  )
}