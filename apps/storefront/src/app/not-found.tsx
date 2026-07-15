import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-12 bg-theme-bg">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h1 className="text-8xl md:text-9xl font-serif text-primary/20 mb-4 tracking-tighter">404</h1>
        
        <h2 className="text-3xl md:text-4xl font-serif text-theme-text mb-6">
          Page Not Found
        </h2>
        
        <p className="text-theme-text-muted font-sans font-light text-lg mb-12 max-w-md mx-auto">
          We couldn't find the page you're looking for. It may have been moved, deleted, or never existed in the first place.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="luxury-button w-full sm:w-auto">
            Return to Home
          </Link>
          
          <Link href="/collections/all" className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs hover:text-primary/70 transition-colors py-4 px-8 border border-transparent hover:border-primary/20 rounded-full w-full sm:w-auto justify-center">
            Shop Collections <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
