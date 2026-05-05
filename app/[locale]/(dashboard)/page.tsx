import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare, 
  Zap, 
  Users, 
  BarChart3, 
  Smartphone,
  Bot,
  Search,
  MoreVertical,
  Paperclip,
  Send,
  LayoutDashboard,
  Settings,
  Phone,
  Inbox,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPublishedPlans, getTeamForUser } from '@/lib/db/queries';
import { getBranding } from '@/lib/db/queries/branding';
import Logo from '@/components/interface/Logo';
import { getTranslations } from 'next-intl/server'; 

function DashboardPreview({ t }: { t: any }) {
  return (
    <div className="relative mx-auto max-w-6xl w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
      <div className="relative rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-4 py-3 backdrop-blur-md">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="h-6 w-1/3 rounded-md bg-background/50 border border-border/30 text-[10px] flex items-center justify-center text-muted-foreground font-mono">
            {t('LandingPage.preview.url_bar')}
          </div>
          <div className="w-10" />
        </div>

        <div className="flex h-[600px] bg-background">
          
          <div className="w-64 border-r border-border/40 bg-muted/20 p-4 hidden md:flex flex-col gap-6">
            <div className="flex items-center gap-2 px-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <span className="font-semibold text-sm">Dashboard</span>
            </div>
            
            <div className="space-y-1">
              {[
                { icon: MessageSquare, label: 'Chats', active: true },
                { icon: Users, label: 'Contacts' },
                { icon: BarChart3, label: 'Analytics' },
                { icon: Zap, label: 'Automations' },
                { icon: Smartphone, label: 'Devices' },
                { icon: Settings, label: 'Settings' }
              ].map((item) => (
                <div 
                  key={item.label}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${item.active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          
          <div className="flex-1 flex flex-col bg-background/50">
            <div className="h-16 border-b border-border/40 flex items-center justify-between px-6">
              <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <div className="h-9 w-full rounded-full bg-muted/50 border border-border/40 pl-10" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10" />
                <div className="h-8 w-8 rounded-full bg-muted" />
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-80 border-r border-border/40 overflow-y-auto hidden lg:block p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('LandingPage.preview.inbox_title')}</h3>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`p-3 rounded-xl border border-border/40 ${i === 1 ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                          <span className="text-[10px] text-muted-foreground">12:4{i} PM</span>
                        </div>
                        <div className="h-2 w-full bg-muted/60 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1 flex flex-col relative">
                <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">JD</div>
                    <div>
                      <div className="text-sm font-semibold">John Doe</div>
                      <div className="text-[10px] text-green-500 flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <MoreVertical className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  <div className="flex flex-col items-start gap-2 max-w-[80%]">
                    <div className="p-3 rounded-2xl rounded-tl-none bg-muted text-sm leading-relaxed shadow-sm">
                      {t('LandingPage.preview.chat_incoming')}
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1">12:45 PM</span>
                  </div>
                  <div className="flex flex-col items-end gap-2 max-w-[80%] ml-auto">
                    <div className="p-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground text-sm leading-relaxed shadow-md shadow-primary/20">
                      {t('LandingPage.preview.chat_outgoing')}
                    </div>
                    <span className="text-[10px] text-muted-foreground mr-1">12:46 PM</span>
                  </div>
                </div>

                <div className="p-4 border-t border-border/40 bg-card">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-2 border border-border/40">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-sm text-muted-foreground">{t('LandingPage.preview.chat_placeholder')}</div>
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                      <Send className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute -top-12 -right-12 h-64 w-64 bg-primary/10 blur-[100px] -z-10 rounded-full" />
      <div className="absolute -bottom-12 -left-12 h-64 w-64 bg-purple-500/10 blur-[100px] -z-10 rounded-full" />
    </div>
  );
}

function LogoCarousel({ t }: { t: any }) {
  const logos = [
    "WhatsApp", "Meta", "Twilio", "Stripe", "OpenAI", "Evolution"
  ];

  return (
    <div className="py-20 border-y border-border bg-muted/30 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 text-center mb-10">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('LandingPage.logos.title')}</p>
      </div>
      <div className="flex flex-nowrap gap-12 animate-in fade-in duration-1000 items-center justify-center">
        {logos.map((logo) => (
          <div key={logo} className="text-2xl font-bold text-muted-foreground/30 grayscale hover:grayscale-0 transition-all cursor-default">
            {logo}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: string }) {
  return (
    <div className={`p-8 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4 duration-700 ${delay}`}>
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default async function HomePage() {
  
  const t = await getTranslations(); 
  
  const plans = await getPublishedPlans();
  const branding = await getBranding();
  const siteName = branding?.name || 'WhatSaaS';

  return (
    <main className="flex flex-col min-h-screen bg-background selection:bg-primary/20">
      
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 rounded-full text-sm border-primary/20 bg-primary/5 text-primary font-medium animate-in fade-in zoom-in duration-500">
            {t('LandingPage.hero.badge')}
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 leading-[1.1]">
            {t('LandingPage.hero.title_part1')} <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('LandingPage.hero.title_part2')}
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {t('LandingPage.hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <Link href="/sign-up">
              <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-primary/25 shadow-lg hover:shadow-primary/40 transition-all">
                {t('LandingPage.hero.cta_primary')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base backdrop-blur-sm bg-background/50">
                {t('LandingPage.hero.cta_secondary')}
              </Button>
            </Link>
          </div>

          <DashboardPreview t={t} />
        </div>
      </section>

      <LogoCarousel t={t} />

      <section id="features" className="py-24 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('LandingPage.features.title')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('LandingPage.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Zap} 
              title={t('LandingPage.features.card_flow_title')} 
              description={t('LandingPage.features.card_flow_desc')} 
              delay="delay-0"
            />
            <FeatureCard 
              icon={Bot} 
              title={t('LandingPage.features.card_ai_title')} 
              description={t('LandingPage.features.card_ai_desc')} 
              delay="delay-100"
            />
            <FeatureCard 
              icon={MessageSquare} 
              title={t('LandingPage.features.card_inbox_title')} 
              description={t('LandingPage.features.card_inbox_desc')} 
              delay="delay-200"
            />
            <FeatureCard 
              icon={Smartphone} 
              title={t('LandingPage.features.card_multi_title')} 
              description={t('LandingPage.features.card_multi_desc')} 
              delay="delay-300"
            />
            <FeatureCard 
              icon={Users} 
              title={t('LandingPage.features.card_team_title')} 
              description={t('LandingPage.features.card_team_desc')} 
              delay="delay-400"
            />
            <FeatureCard 
              icon={BarChart3} 
              title={t('LandingPage.features.card_campaigns_title')} 
              description={t('LandingPage.features.card_campaigns_desc')} 
              delay="delay-500"
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('LandingPage.pricing.title')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('LandingPage.pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const isPopular = index === 1;
              return (
                <div 
                  key={plan.id} 
                  className={`relative flex flex-col p-8 rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl ${isPopular ? 'border-primary shadow-lg shadow-primary/10 scale-105 z-10' : 'border-border'}`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {t('LandingPage.pricing.most_popular')}
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">${plan.amount / 100}</span>
                    <span className="text-muted-foreground">/{plan.interval === 'month' ? t('LandingPage.pricing.interval_month') : t('LandingPage.pricing.interval_year')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">{plan.description || "Perfect for getting started."}</p>
                  
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center text-sm gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('LandingPage.pricing.features.users', {count: plan.maxUsers})}
                    </li>
                    <li className="flex items-center text-sm gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('LandingPage.pricing.features.connections', {count: plan.maxInstances})}
                    </li>
                    <li className="flex items-center text-sm gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('LandingPage.pricing.features.contacts', {count: plan.maxContacts.toLocaleString()})}
                    </li>
                    {plan.isAiEnabled && (
                        <li className="flex items-center text-sm gap-3">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('LandingPage.pricing.features.ai')}
                        </li>
                    )}
                    {plan.isFlowBuilderEnabled && (
                        <li className="flex items-center text-sm gap-3">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('LandingPage.pricing.features.flow')}
                        </li>
                    )}
                  </ul>

                  <Link href={`/sign-up?priceId=${plan.stripePriceId}`}>
                    <Button 
                        className={`w-full rounded-full h-11 text-sm font-semibold ${isPopular ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                    >
                      {t('LandingPage.pricing.get_started')}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            {t('LandingPage.cta_final.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            {t('LandingPage.cta_final.subtitle')}
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="rounded-full px-10 h-14 text-lg shadow-xl shadow-primary/20">
              {t('LandingPage.cta_final.button')}
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">{t('LandingPage.cta_final.disclaimer')}</p>
        </div>
      </section>

      <footer className="border-t border-border py-12 bg-muted/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo />
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">{t('LandingPage.footer.terms')}</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t('LandingPage.footer.privacy')}</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">{t('LandingPage.footer.docs')}</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">{t('LandingPage.footer.contact')}</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. {t('LandingPage.footer.rights')}
          </p>
        </div>
      </footer>
    </main>
  );
}