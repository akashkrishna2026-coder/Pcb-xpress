import React from 'react';
import { Helmet } from 'react-helmet';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold">{title}</h2>
    <div className="text-sm text-muted-foreground space-y-2">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div className="container py-24">
      <Helmet>
        <title>Privacy Policy | PCB Xpress</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-3xl space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <Section title="Overview">
          <p>
            We respect your privacy. This policy explains what data we collect, how we use it, and your choices. By using our
            site and services, you agree to the collection and use of information in accordance with this policy.
          </p>
        </Section>

        <Section title="Information We Collect">
          <ul className="list-disc pl-5">
            <li>Contact details you provide (name, email, phone, company).</li>
            <li>Project files uploaded for quotes (e.g., Gerber, BOM, 3D models).</li>
            <li>Usage data such as pages visited and interactions for improving the service.</li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc pl-5">
            <li>Provide quotes, support, and order fulfillment.</li>
            <li>Improve site performance and customer experience.</li>
            <li>Send service updates or promotional emails (opt-out available at any time).</li>
          </ul>
        </Section>

        <Section title="File Confidentiality">
          <p>Uploaded files are processed solely for quotation and manufacturing purposes and handled with confidentiality.</p>
        </Section>

        <Section title="Your Rights">
          <p>
            You can request access, correction, or deletion of your data by contacting us at
            {' '}<a className="text-primary underline" href="mailto:sales@pcbxpress.online">sales@pcbxpress.online</a>.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy inquiries, contact: VST IoT Solutions Pvt Ltd, Thripunithura 682306, India —
            {' '}<a className="text-primary underline" href="tel:+919745001075">+91 9745001075</a>.
          </p>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

