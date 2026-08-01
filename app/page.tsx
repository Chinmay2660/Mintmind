import Header from "./_components/Header";
import Hero from "./_components/Hero";
import Marquee from "./_components/Marquee";
import CTA from "./_components/CTA";
import HowItWorks from "./_components/HowItWorks";
import Testimonials from "./_components/Testimonials";
import FAQ from "./_components/FAQ";
import { ContactDialogProvider } from "./_components/Contact";
import Footer from "./_components/Footer";

export default function Home() {
  return (
    <ContactDialogProvider>
      <div className="min-h-screen landing-bg text-foreground">
        <Header />
        <main>
          <Hero />
          <Marquee />
          <CTA />
          <HowItWorks />
          <Testimonials />
          <FAQ />
        </main>
        <Footer />
      </div>
    </ContactDialogProvider>
  );
}
