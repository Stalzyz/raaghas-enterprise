import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Raaghas — Luxury Ethnic Wear",
  description:
    "Discover the story behind Raaghas, India's leading luxury brand for premium casual and office wear. A celebration of rich textile luxury, brought to life by artisans.",
};

export default function AboutPage() {
  return (
    <main>
      <h1 className="sr-only">Raaghas is India's leading luxury brand for premium casual and office wear.</h1>
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center justify-center bg-primary/5 overflow-hidden">
        <div className="absolute inset-0 luxury-grain opacity-30 pointer-events-none" />
        <div className="text-center px-6 max-w-4xl mx-auto relative z-10">
          <span className="text-xs uppercase tracking-[0.4em] font-bold text-primary opacity-60 block mb-6">
            Our Story
          </span>
          <h1 className="text-6xl md:text-8xl font-serif leading-[0.9] tracking-tighter text-theme-text mb-8">
            Where Luxury<br />Meets Luxury
          </h1>
          <p className="text-xl font-sans text-theme-text-muted font-light leading-relaxed max-w-2xl mx-auto">
            Raaghas was born from a shared passion to weave the luxury of Indian craftsmanship into the modern age. 
            Every stitch carries the legacy of traditional artisans, carefully curated for the contemporary connoisseur.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.4em] font-bold text-primary opacity-60 block mb-6">Our Mission</span>
            <h2 className="text-5xl font-serif leading-none tracking-tighter text-theme-text mb-8">
              Slow Fashion, Timeless Design
            </h2>
            <p className="text-lg text-theme-text-muted font-sans leading-relaxed mb-6 font-light">
              We believe in the power of slow fashion — clothes made with intention, worn with pride, and cherished for generations. 
              Each Raaghas piece is created in limited quantities with hand-selected materials from across India&apos;s weaving heartlands.
            </p>
            <p className="text-lg text-theme-text-muted font-sans leading-relaxed font-light">
              From the kalamkari artists of Andhra Pradesh to the block printers of Jaipur, we partner directly with artisans 
              to ensure fair wages and preserve ancient techniques that are at risk of being lost.
            </p>
          </div>
          <div className="aspect-[4/5] rounded-[4rem] overflow-hidden bg-primary/10 flex items-center justify-center">
            <div className="text-center text-primary/20 p-12">
              <div className="text-9xl font-serif font-bold">R</div>
              <div className="text-2xl font-serif mt-4 tracking-widest">RAAGHAS</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-[0.4em] font-bold text-primary opacity-60 block mb-4">What We Stand For</span>
            <h2 className="text-5xl font-serif leading-none tracking-tighter text-theme-text">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Authentic Artisanship",
                body: "Every product is handcrafted by skilled artisans using techniques passed down through generations. We do not use shortcuts."
              },
              {
                title: "Sustainable Practices",
                body: "From natural dyes to organic fabrics, we prioritise earth-friendly practices at every step of our supply chain."
              },
              {
                title: "Fair Trade",
                body: "We pay artisans directly and fairly. No middlemen, no exploitation. Just a beautiful relationship between maker and wearer."
              }
            ].map((value) => (
              <div key={value.title} className="p-8 bg-theme-surface rounded-3xl border border-theme-border">
                <h3 className="text-2xl font-serif text-theme-text mb-4">{value.title}</h3>
                <p className="text-theme-text-muted font-sans leading-relaxed font-light">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-5xl font-serif text-theme-text mb-6">Wear the Luxury</h2>
        <p className="text-theme-text-muted font-sans mb-12 max-w-lg mx-auto">
          Discover our curated collections — each piece a testament to India&apos;s extraordinary textile tradition.
        </p>
        <Link href="/collections/all" className="luxury-button">
          Shop Collections
        </Link>
      </section>
    </main>
  );
}
