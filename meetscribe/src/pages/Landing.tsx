import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, FileText, Zap, Link2, Shield, Sparkles, ArrowRight, Check } from 'lucide-react';
import Scene3D from '../components/Scene3D';

const features = [
  { icon: Mic, title: 'One-click Record', desc: 'Capture Zoom, Google Meet & Teams with a single click. Auto-join or upload audio.' },
  { icon: FileText, title: 'AI Transcription', desc: 'Crystal-clear transcripts with speaker labels in seconds using advanced speech models.' },
  { icon: Sparkles, title: 'Smart Summaries', desc: 'Key points, decisions & action items extracted automatically so you never miss context.' },
  { icon: Link2, title: 'Deep Integrations', desc: 'Native connectors for Zoom, Google Meet, Microsoft Teams and calendar sync.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'From meeting end to searchable notes in under 2 minutes. Real-time processing.' },
  { icon: Shield, title: 'Enterprise Ready', desc: 'Encrypted storage, SOC2-ready architecture and full data ownership for your team.' }
];

const plans = [
  {
    name: 'Starter',
    price: '4.99',
    period: '/mo',
    features: ['30 meetings / month', 'AI summaries & action items', 'Zoom + Google Meet', 'Export to Notion / Slack', 'Email support'],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    name: 'Pro',
    price: '9.99',
    period: '/mo',
    features: ['Unlimited meetings', 'Everything in Starter', 'Teams integration', 'Custom vocabulary', 'Priority processing', 'SSO & admin controls'],
    cta: 'Go Pro',
    popular: true
  }
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 3D Background */}
      <Scene3D />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-neon-purple/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center font-display font-bold text-sm">
            MS
          </div>
          <span className="font-display font-semibold text-xl tracking-wide">MeetScribe</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <Link to="/login" className="hover:text-white transition">Log in</Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple font-medium text-slate-950 hover:opacity-90 transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-neon-cyan mb-8">
            <Sparkles className="w-4 h-4" />
            AI-powered meeting intelligence
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
            Turn every meeting
            <br />
            <span className="text-gradient">into actionable notes</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Record, transcribe and summarize Zoom, Google Meet & Teams calls automatically.
            Never take notes again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple font-semibold text-slate-950 flex items-center gap-2 shadow-lg shadow-neon-purple/30 hover:shadow-neon-purple/50 transition-all"
            >
              Start free — 3 meetings
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#pricing"
              className="px-8 py-4 rounded-2xl glass font-medium hover:bg-white/5 transition"
            >
              View pricing
            </a>
          </div>
        </motion.div>

        {/* Floating cards preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9 }}
          className="mt-24 relative max-w-4xl mx-auto"
        >
          <div className="glass-strong rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl card-3d">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-sm text-slate-400">Weekly Product Sync — Summary ready</span>
            </div>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="text-sm font-medium text-neon-cyan mb-2">Key Points</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Q3 up 18% vs target</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Mobile redesign next sprint</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Pricing locked at $4.99 / $9.99</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neon-purple mb-2">Action Items</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-neon-pink">→</span> Sam: wireframes by Friday</li>
                  <li className="flex gap-2"><span className="text-neon-pink">→</span> Jordan: update landing page</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl font-bold mb-4">Everything you need</h2>
          <p className="text-slate-400 max-w-xl mx-auto">From recording to searchable knowledge — built for modern teams.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 card-3d hover:border-neon-purple/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-neon-cyan" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-400">Start free. Upgrade when you need more power.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              whileHover={{ y: -8 }}
              className={`relative rounded-3xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-neon-purple/20 to-slate-900/80 border border-neon-purple/50 shadow-xl shadow-neon-purple/20'
                  : 'glass'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-neon-purple text-xs font-semibold">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-slate-400">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-neon-cyan shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block w-full text-center py-3.5 rounded-xl font-semibold transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-purple text-slate-950'
                    : 'glass hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 text-center text-sm text-slate-500">
        <p>© 2026 MeetScribe. Built for teams who value their time.</p>
      </footer>
    </div>
  );
}
