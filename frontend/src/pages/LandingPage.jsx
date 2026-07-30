import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import Pillars from "@/components/landing/Pillars";
import Modules from "@/components/landing/Modules";
import Workflow from "@/components/landing/Workflow";
import Metrics from "@/components/landing/Metrics";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const FadeIn = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" id="top">
      <Navbar />
      <main>
        <Hero />
        <FadeIn><TrustBar /></FadeIn>
        <FadeIn><Pillars /></FadeIn>
        <FadeIn><Modules /></FadeIn>
        <FadeIn><Workflow /></FadeIn>
        <FadeIn><Metrics /></FadeIn>
        <FadeIn><Testimonials /></FadeIn>
        <FadeIn><Pricing /></FadeIn>
        <FadeIn><FAQ /></FadeIn>
        <FadeIn><FinalCTA /></FadeIn>
      </main>
      <Footer />
    </div>
  );
}
