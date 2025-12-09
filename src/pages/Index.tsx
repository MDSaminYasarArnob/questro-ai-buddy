import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, MessageSquare, FileText, Image, History, ArrowRight, CheckCircle2, Zap, Brain, Globe, Key, Play } from 'lucide-react';
import { useEffect } from 'react';
const Index = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const features = [{
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Ask anything in any language - get instant, intelligent answers'
  }, {
    icon: FileText,
    title: 'PDF to MCQ Generator',
    description: 'Upload textbooks and automatically generate practice questions'
  }, {
    icon: Image,
    title: 'Image Problem Solver',
    description: 'Snap a picture of any question and get step-by-step solutions'
  }, {
    icon: History,
    title: 'History Tracking',
    description: 'Access all your previous conversations and generated content'
  }];
  const steps = [{
    number: '1',
    title: 'Sign Up',
    description: 'Create your free account in seconds'
  }, {
    number: '2',
    title: 'Choose Your Tool',
    description: 'Pick from Chat, PDF Converter, or Image Solver'
  }, {
    number: '3',
    title: 'Start Learning',
    description: 'Get instant AI-powered assistance with your studies'
  }];
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-background-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-12 h-12 text-primary animate-pulse" />
            <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Questro
            </h1>
          </div>
          <p className="text-xl lg:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Your AI-Powered Study Companion
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Chat with AI, convert PDFs to practice questions, and solve image problems - all in one place
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary hover:opacity-90 transition-opacity text-lg px-8 py-6">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({
            behavior: 'smooth'
          })} className="border-primary text-primary hover:bg-primary/10 text-lg px-8 py-6">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mb-20 scroll-mt-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powerful Features</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need to Excel</h2>
            <p className="text-muted-foreground text-lg">Use your own Gemini API key - completely free!</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => <Card key={idx} className="p-6 bg-background-card border-border shadow-soft hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in" style={{
            animationDelay: `${idx * 100}ms`
          }}>
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>)}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Simple Process</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Get started in three easy steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, idx) => <div key={idx} className="text-center relative animate-fade-in" style={{
            animationDelay: `${idx * 150}ms`
          }}>
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {idx < steps.length - 1 && <ArrowRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-primary/30" />}
              </div>)}
          </div>
        </div>

        {/* API Key Setup Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <Key className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Easy Setup</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Get Your Free Gemini API Key</h2>
            <p className="text-muted-foreground text-lg">Follow these simple steps to start using Questro</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 bg-background-card border-border shadow-soft">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Step-by-Step Guide
              </h3>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Sign in with your Google account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Click "Get API Key" → "Create API key"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">4</span>
                  <span>Copy your API key</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">5</span>
                  <span>Paste it in Questro Settings after signing up</span>
                </li>
              </ol>
              <Button variant="outline" className="mt-6 border-primary text-primary hover:bg-primary/10" onClick={() => window.open('https://makersuite.google.com/app/apikey', '_blank')}>
                Get API Key Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Card>

            <Card className="p-6 bg-background-card border-border shadow-soft">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Video Tutorial
              </h3>
              <p className="text-muted-foreground mb-4">
                Watch this quick video to learn how to get your Gemini API key in under 2 minutes!
              </p>
              <div className="aspect-video rounded-lg overflow-hidden bg-background border border-border">
                <iframe src="https://www.youtube.com/embed/czN-laeLxr8" title="How to get Gemini API Key" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
              </div>
            </Card>
          </div>
        </div>

        {/* Benefits */}
        <Card className="p-8 lg:p-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Why Choose Questro?</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Learn Smarter, Not Harder</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Questro combines cutting-edge AI technology with intuitive design to help you study more effectively.
              </p>
            </div>
            <div className="space-y-4">
              {['Free Gemini API - generous daily limits', 'Support for any language', 'Upload PDFs up to 50 pages', 'Instant image problem solving', 'Complete conversation history', 'Your API key stays private'].map((benefit, idx) => <div key={idx} className="flex items-start gap-3 animate-fade-in" style={{
              animationDelay: `${idx * 100}ms`
            }}>
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-lg">{benefit}</span>
                </div>)}
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="p-12 bg-gradient-primary border-0 shadow-elegant">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">Ready to Transform Your Learning?</h2>
            <p className="text-lg text-foreground/90 mb-8 max-w-2xl mx-auto">
              Join students worldwide who are already using Questro to ace their studies
            </p>
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-background text-foreground hover:bg-background/90 transition-all text-lg px-8 py-6">
              Start Learning Now - It's Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Questro</span>
          </div>
          <p className="text-sm">Powered by SYA Zone • Your AI Study Companion</p>
        </div>
      </footer>
    </div>;
};
export default Index;