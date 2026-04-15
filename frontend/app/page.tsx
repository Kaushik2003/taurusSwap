"use client";
import Features from '../components/landing/Features';
import BentoGrid from '../components/landing/BentoGrid';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import Hero from '@/components/landing/Hero';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import localFont from 'next/font/local';

const wiseSans = localFont({ src: '../public/fonts/wise-sans.otf' });

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-green">

      <div className="relative z-10 flex flex-col items-center">

        {/* Hero — entrance animations handled inside Hero.tsx */}
        <Hero />

        {/* Features — scroll reveal */}
        <ScrollReveal className="w-full">
          <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 py-16 sm:py-20 md:py-24 lg:py-28">
            <Features />
          </section>
        </ScrollReveal>

        {/* Bento Grid — scroll reveal */}
        <ScrollReveal className="w-full">
          <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 pb-16 sm:pb-20 md:pb-24">
            <BentoGrid />
          </section>
        </ScrollReveal>

        {/* FAQ / Explore — scroll reveal */}
        <ScrollReveal className="w-full">
          <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-20 pb-20 sm:pb-24 md:pb-28">
            <FAQ />
          </section>
        </ScrollReveal>

      </div>

      <Footer />
    </div>
  );
}
