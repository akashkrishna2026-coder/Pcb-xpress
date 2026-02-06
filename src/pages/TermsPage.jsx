import React from 'react';
import { Helmet } from 'react-helmet';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold">{title}</h2>
    <div className="text-sm text-muted-foreground space-y-2">{children}</div>
  </section>
);

const TermsPage = () => {
  return (
    <div className="container py-24">
      <Helmet>
        <title>Terms & Conditions | PCB Xpress</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-3xl space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <Section title="Scope of Service">
          <p>We provide PCB manufacturing, assembly, component sourcing, and 3D printing services as agreed in individual orders.</p>
        </Section>

        <Section title="Quotes & Orders">
          <ul className="list-disc pl-5">
            <li>Quotes are estimates based on your inputs and files; final pricing may change after DFM review.</li>
            <li>Orders proceed after written confirmation and (where applicable) payment or PO issuance.</li>
          </ul>
        </Section>

        <Section title="Files & IP">
          <p>You retain ownership of your design files. We treat all files as confidential and use them only for your order.</p>
        </Section>

        <Section title="Shipping & Warranty">
          <ul className="list-disc pl-5">
            <li>Lead times are estimates and may vary due to supply or technical constraints.</li>
            <li>We warrant workmanship against defects within a reasonable period after delivery.</li>
          </ul>
        </Section>

        <Section title="Liability">
          <p>To the maximum extent permitted by law, our liability is limited to the value of the order in question.</p>
        </Section>

        <Section title="Contact">
          <p>Questions? Email <a className="text-primary underline" href="mailto:sales@pcbxpress.online">sales@pcbxpress.online</a>.</p>
        </Section>
      </div>
    </div>
  );
};

export default TermsPage;

