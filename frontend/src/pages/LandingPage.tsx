import React, { useEffect, useState } from 'react';
import { civicfixApi, API_BASE_URL } from '../services/api';
import { Section } from '../components/landing/Section';
import { SectionHeading } from '../components/landing/SectionHeading';
import { Card } from '../components/landing/Card';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

const STEPS = [
  { icon: 'add_a_photo', title: 'Report', text: 'Snap a photo, drop a real GPS pin, describe the issue — no category to pick, AI reads the photo and description and classifies it for you.' },
  { icon: 'fact_check', title: 'Admin Review', text: 'City staff review the report and route it to the specialist crew that matches its category.' },
  { icon: 'engineering', title: 'Crew Fixes It', text: 'The assigned crew accepts the job, fixes it, and uploads a photo as proof of the fix.' },
  { icon: 'verified', title: 'AI Verifies', text: 'AI compares the before/after photos to confirm the issue is actually resolved before it closes.' },
];

const FEATURES = [
  { icon: 'auto_awesome', title: 'AI Auto-Categorization', text: 'No dropdowns to fill in. AI reads your photo and description and determines the right category and severity on its own.' },
  { icon: 'fact_check', title: 'Photo-Match Verification', text: 'AI checks that your photo actually matches your description before a report ever reaches an admin.' },
  { icon: 'my_location', title: 'Real GPS Location', text: 'Reports are pinned to your device’s actual GPS coordinates and reverse-geocoded to a real street address.' },
  { icon: 'join', title: 'Smart Duplicate Detection', text: 'Nearby reports with similar photos are detected automatically — you’re added as a watcher instead of filing a duplicate.' },
  { icon: 'group', title: 'Community-Driven Severity', text: 'The more people watching a report, the higher its severity climbs, so admins see what matters most first.' },
  { icon: 'notifications_active', title: 'Real-Time Notifications', text: 'Get notified the moment your report is submitted, routed to a crew, and resolved.' },
];

const CATEGORIES = [
  { icon: 'edit_road', name: 'Road Damage' },
  { icon: 'lightbulb', name: 'Street Lighting' },
  { icon: 'delete', name: 'Waste Management' },
  { icon: 'water_drop', name: 'Water Leak' },
  { icon: 'shield', name: 'Public Safety' },
];

const TESTIMONIALS = [
  { quote: 'I reported a pothole on my way to work and it was fixed within three days. I got a notification the moment the crew marked it done.', name: 'Maria R.', role: 'Resident' },
  { quote: 'Routing used to be the bottleneck on my desk. Reports now arrive already categorized, so I dispatch to the right crew in one click.', name: 'David K.', role: 'City Administrator' },
  { quote: 'Uploading the after-photo and letting the AI confirm the fix means less back-and-forth with the office. It just closes the ticket.', name: 'Alina T.', role: 'Maintenance Crew Lead' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof civicfixApi.getMetricsSummary>> | null>(null);

  useEffect(() => {
    civicfixApi.getMetricsSummary().then(setStats).catch(() => setStats(null));
  }, []);

  const resolvedCount = stats?.byStatus.find((s) => s.status === 'resolved')?.count ?? null;
  const avgResolutionDays = stats?.avgResolutionHours != null ? (stats.avgResolutionHours / 24).toFixed(1) : null;

  const statTiles = [
    { value: stats?.totalIssues ?? null, label: 'Reports Filed' },
    { value: resolvedCount, label: 'Issues Resolved' },
    { value: stats?.totalWatchers ?? null, label: 'Community Watchers' },
    { value: avgResolutionDays != null ? `${avgResolutionDays}d` : null, label: 'Avg. Resolution Time' },
  ];

  return (
    <main className="min-h-screen bg-white text-on-surface">
      {/* Header */}
      <Section as="header" padY={false} border="top" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-t-0">
        <div className="flex items-center justify-between py-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
            <span className="text-2xl font-extrabold tracking-tight">CivicFix</span>
          </div>
          <div className="flex items-center gap-sm">
            <button
              onClick={() => onNavigate('/login')}
              className="px-lg h-10 rounded-xl border border-outline-variant font-label-md text-label-md hover:bg-surface-container transition-all"
            >
              Sign in
            </button>
            <button
              onClick={() => onNavigate('/signup')}
              className="px-lg h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-md hover:brightness-105 transition-all"
            >
              Sign up
            </button>
          </div>
        </div>
      </Section>

      {/* Hero */}
      <Section>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-md py-1.5 rounded-full text-xs font-bold mb-lg">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI-Powered Issue Triage
          </div>
          <h1 className="text-display-lg font-headline-lg text-on-surface mb-md">
            Report Local Issues. <br className="hidden md:block" /> Build a Better City.
          </h1>
          <p className="text-body-lg text-on-surface-variant mb-xl">
            CivicFix connects citizens, city administrators, and repair crews so infrastructure problems get fixed
            faster — with AI categorizing, verifying, and de-duplicating reports every step of the way.
          </p>
          <div className="flex items-center justify-center gap-md flex-wrap">
            <button
              onClick={() => onNavigate('/signup')}
              className="h-14 px-xl bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:brightness-105 active:scale-95 transition-all"
            >
              Get Started
            </button>
            <button
              onClick={() => onNavigate('/login')}
              className="h-14 px-xl border border-outline-variant font-bold rounded-xl hover:bg-surface-container transition-all"
            >
              I already have an account
            </button>
          </div>
        </div>
      </Section>

      {/* Live Stats Bar — symmetric 4-up grid, 2-up on mobile (both resolve evenly) */}
      <Section tone="surface" border="both">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-lg text-center">
          {statTiles.map((tile) => (
            <div key={tile.label}>
              <div className="text-3xl font-bold text-primary">{tile.value ?? '—'}</div>
              <div className="text-xs text-on-surface-variant mt-1">{tile.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Features — 2x3 grid, resolves evenly at every breakpoint (1 / 2 / 3 columns of 6 items) */}
      <Section>
        <SectionHeading
          title="Why CivicFix"
          subtitle="Every report is backed by real AI — not just a form that dumps into an inbox."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
          {FEATURES.map((feature) => (
            <Card key={feature.title} icon={feature.icon} title={feature.title}>
              {feature.text}
            </Card>
          ))}
        </div>
      </Section>

      {/* How It Works — 4-up grid, resolves evenly at every breakpoint (1 / 2 / 4 columns of 4 items) */}
      <Section tone="surface" border="both">
        <SectionHeading title="How It Works" subtitle="From a phone photo to a verified fix, in four steps." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
          {STEPS.map((step, index) => (
            <div key={step.title} className="bg-white rounded-2xl p-lg border border-outline-variant/30 relative h-full min-h-[220px] flex flex-col">
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center shadow-md">
                {index + 1}
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-md shrink-0">
                <span className="material-symbols-outlined">{step.icon}</span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-xs">{step.title}</h3>
              <p className="text-body-md text-on-surface-variant flex-1">{step.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Categories — odd count (5), so centered flex-wrap instead of a grid that would strand an orphan tile */}
      <Section>
        <SectionHeading title="What You Can Report" subtitle="Five categories, automatically detected by AI — you just describe the problem." />
        <div className="flex flex-wrap justify-center gap-md">
          {CATEGORIES.map((category) => (
            <div
              key={category.name}
              className="w-36 flex flex-col items-center gap-sm bg-surface-container-low rounded-2xl p-lg border border-outline-variant/30 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">{category.icon}</span>
              </div>
              <span className="font-label-md text-label-md text-on-surface">{category.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonials — 3-up grid, resolves evenly at every breakpoint */}
      <Section tone="surface" border="both">
        <SectionHeading title="What People Are Saying" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name}>
              <div className="flex flex-col gap-md h-full">
                <span className="material-symbols-outlined text-primary/40 text-4xl leading-none">format_quote</span>
                <p className="flex-1">{testimonial.quote}</p>
                <div>
                  <div className="font-bold text-on-surface text-sm">{testimonial.name}</div>
                  <div className="text-xs text-on-surface-variant">{testimonial.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Download App */}
      <Section tone="surface" border="both">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-md py-1.5 rounded-full text-xs font-bold mb-md">
              <span className="material-symbols-outlined text-sm">android</span>
              Android App
            </div>
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-sm">
              Report and Resolve Issues On the Go
            </h2>
            <p className="text-body-md text-on-surface-variant mb-lg">
              The CivicFix Android app opens your camera directly for report and fix photos — no
              gallery picker — and captures your GPS location automatically, so every report is
              accurate and every fix is verified.
            </p>
            <a
              href={`${API_BASE_URL}/downloads/civicfix.apk`}
              download
              className="inline-flex items-center gap-sm h-14 px-xl bg-primary text-on-primary font-bold rounded-xl shadow-lg hover:brightness-105 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">download</span>
              Download for Android (.apk)
            </a>
            <p className="text-xs text-on-surface-variant mt-sm">
              Direct APK install — not on the Play Store yet, so you may need to enable "Install
              unknown apps" for your browser when prompted.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-outline-variant/30 p-lg">
            <ul className="space-y-md">
              {[
                { icon: 'photo_camera', text: 'In-app camera only — reports and fix photos can’t be picked from your gallery.' },
                { icon: 'my_location', text: 'GPS is captured automatically the moment you report an issue.' },
                { icon: 'engineering', text: 'Crew members accept jobs and submit after-photos straight from their phone.' },
                { icon: 'notifications_active', text: 'Push-style in-app notifications as your report moves through review, routing, and resolution.' },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-md">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  </div>
                  <p className="text-body-md text-on-surface-variant">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="bg-primary rounded-3xl p-xl md:p-3xl text-on-primary text-center">
          <h2 className="text-headline-lg font-headline-lg mb-sm">Ready to Improve Your Neighborhood?</h2>
          <p className="text-body-md opacity-90 max-w-xl mx-auto mb-lg">
            Sign up as a citizen, city admin, or crew member and start making infrastructure issues visible today.
          </p>
          <button
            onClick={() => onNavigate('/signup')}
            className="h-14 px-xl bg-white text-primary font-bold rounded-xl shadow-lg hover:brightness-95 active:scale-95 transition-all"
          >
            Create Your Account
          </button>
        </div>
      </Section>

      {/* Footer — 4-column grid, resolves evenly (2 / 4 columns) */}
      <Section border="top" padY={false}>
        <div className="py-xl grid grid-cols-2 md:grid-cols-4 gap-lg">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-sm">
              <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
              <span className="text-lg font-extrabold tracking-tight">CivicFix</span>
            </div>
            <p className="text-xs text-on-surface-variant">AI-assisted civic issue reporting and resolution.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-on-surface-variant mb-sm">Product</h4>
            <ul className="space-y-xs text-sm">
              <li><button onClick={() => onNavigate('/signup')} className="hover:text-primary transition-colors">Sign up</button></li>
              <li><button onClick={() => onNavigate('/login')} className="hover:text-primary transition-colors">Sign in</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-on-surface-variant mb-sm">Roles</h4>
            <ul className="space-y-xs text-sm text-on-surface-variant">
              <li>Citizen</li>
              <li>Admin</li>
              <li>Crew</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-on-surface-variant mb-sm">Categories</h4>
            <ul className="space-y-xs text-sm text-on-surface-variant">
              {CATEGORIES.slice(0, 3).map((c) => (
                <li key={c.name}>{c.name}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="text-center py-lg text-xs text-on-surface-variant border-t border-outline-variant/30">
          Reporting a life-threatening emergency? Please call <strong className="text-on-surface">911</strong> immediately.
        </div>
      </Section>
    </main>
  );
};

export default LandingPage;
