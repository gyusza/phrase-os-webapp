import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Mic, BookOpen, BarChart2, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">PhraseOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary">
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium hover:text-primary">
              Features
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary">
              FAQ
            </Link>
            <Link href="/auth/login" className="text-sm font-medium hover:text-primary">
              Sign In
            </Link>
          </nav>
          <Button asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted">
          <div className="container flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Learn a Language the Smart Way</h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-10">
              PhraseOS listens, learns, and helps you master the words you actually use every day.
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link href="/auth/signup">
                Join the Beta <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <div className="mt-16 w-full max-w-4xl aspect-video bg-muted rounded-lg border flex items-center justify-center">
              <p className="text-muted-foreground">App Interface Preview Coming Soon</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-background">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Talk naturally</h3>
                <p className="text-muted-foreground">Record short snippets of your daily conversations.</p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI analyzes your speech</h3>
                <p className="text-muted-foreground">Identifies your most frequently used words and phrases.</p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Builds your personal vocabulary</h3>
                <p className="text-muted-foreground">Get translations for what matters to you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-muted">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-16">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4 p-6 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Speech Analysis</h3>
                  <p className="text-muted-foreground">
                    Understands and extracts key phrases from your natural speech.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Personalized Vocabulary Lists</h3>
                  <p className="text-muted-foreground">Learn the words you use most in your daily conversations.</p>
                </div>
              </div>

              <div className="flex gap-4 p-6 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Native Language Translations</h3>
                  <p className="text-muted-foreground">Helps you bridge the gap faster with accurate translations.</p>
                </div>
              </div>

              <div className="flex gap-4 p-6 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
                  <p className="text-muted-foreground">
                    See how your vocabulary grows over time with detailed analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who Is It For */}
        <section className="py-20 bg-background">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-16">Who Is PhraseOS For?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-4">Expats & Travelers</h3>
                <p className="text-muted-foreground">
                  Get conversational fast with real-life phrases that matter in your daily interactions.
                </p>
              </div>

              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-4">Language Learners</h3>
                <p className="text-muted-foreground">
                  Skip textbook vocabulary and focus on what you actually say in real-world situations.
                </p>
              </div>

              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-4">Professionals</h3>
                <p className="text-muted-foreground">
                  Prepare for real-world interactions in a new language with industry-specific vocabulary.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-muted">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-16">Frequently Asked Questions</h2>
            <div className="grid gap-6 max-w-3xl mx-auto">
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-2">How does PhraseOS work?</h3>
                <p className="text-muted-foreground">
                  PhraseOS records your spoken words, identifies common phrases, and translates them into your target
                  language.
                </p>
              </div>

              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-2">What languages are supported?</h3>
                <p className="text-muted-foreground">
                  We're starting with major languages like Danish, English, Spanish, French, German, and more—sign up to
                  get updates!
                </p>
              </div>

              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-2">Will PhraseOS be free?</h3>
                <p className="text-muted-foreground">
                  Yes! The core features are free, with premium upgrades available later.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to learn a language the smart way?</h2>
            <p className="text-xl max-w-2xl mb-10 text-primary-foreground/90">
              Join our beta program today and start building your personalized language learning experience.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/signup">Join the Beta</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-10 bg-muted">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            <span className="font-semibold">PhraseOS</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PhraseOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}