import Header from "./_components/Header";
import Hero from "./_components/Hero";
import CTA from "./_components/CTA";
import FAQ from "./_components/FAQ";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header/>
      <Hero/>
      <CTA/>
      <FAQ/>
    </div>
  );
}
