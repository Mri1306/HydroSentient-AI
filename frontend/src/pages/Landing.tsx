import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ArchitectureSection from "@/components/landing/ArchitectureSection";
import Footer from "@/components/landing/Footer";

const Landing = () => (
  <div className="min-h-screen">
    <HeroSection />
    <FeaturesSection />
    <ArchitectureSection />
    <Footer />
  </div>
);

export default Landing;
