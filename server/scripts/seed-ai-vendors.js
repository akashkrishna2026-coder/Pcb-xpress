import mongoose from 'mongoose';
import AIAgentSettings from '../src/models/AIAgentSettings.js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../.env' });

const vendors = [
  // Major Electronic Component Distributors
  { name: 'Digi-Key Electronics', url: 'https://www.digikey.com', enabled: true },
  { name: 'Mouser Electronics', url: 'https://www.mouser.com', enabled: true },
  { name: 'Newark/Farnell', url: 'https://www.newark.com', enabled: true },
  { name: 'Arrow Electronics', url: 'https://www.arrow.com', enabled: true },
  { name: 'Avnet', url: 'https://www.avnet.com', enabled: true },

  // Asia-Pacific Focused
  { name: 'LCSC Electronics', url: 'https://www.lcsc.com', enabled: true },
  { name: 'Utmell Electronics', url: 'https://www.utmel.com', enabled: true },
  { name: 'Chip1Stop', url: 'https://www.chip1stop.com', enabled: true },
  { name: 'Future Electronics', url: 'https://www.futureelectronics.com', enabled: true },

  // 3D Printing Material Suppliers
  { name: 'MatterHackers', url: 'https://www.matterhackers.com', enabled: true },
  { name: 'Proto3000', url: 'https://www.proto3000.com', enabled: true },
  { name: '3D Systems', url: 'https://www.3dsystems.com', enabled: true },
  { name: 'Stratasys', url: 'https://www.stratasys.com', enabled: true },
  { name: 'Formlabs', url: 'https://www.formlabs.com', enabled: true },

  // PCB Manufacturing Specialists
  { name: 'PCBWay', url: 'https://www.pcbway.com', enabled: true },
  { name: 'JLCPCB', url: 'https://www.jlcpcb.com', enabled: true },
  { name: 'Seeed Studio', url: 'https://www.seeedstudio.com', enabled: true },
  { name: 'OSH Park', url: 'https://oshpark.com', enabled: true },
  { name: 'Eurocircuits', url: 'https://www.eurocircuits.com', enabled: true },

  // Additional Manufacturing Suppliers
  { name: 'McMaster-Carr', url: 'https://www.mcmaster.com', enabled: true },
  { name: 'Grainger', url: 'https://www.grainger.com', enabled: true },
  { name: 'RS Components', url: 'https://www.rs-online.com', enabled: true },
  { name: 'Allied Electronics', url: 'https://www.alliedelec.com', enabled: true },
];

async function seedAIVendors() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://akash2002:WYiuMugdYZhuCNBy@cluster0.gxqanou.mongodb.net/?appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get or create AI Agent Settings document
    let settings = await AIAgentSettings.findOne();
    if (!settings) {
      console.log('Creating new AI Agent Settings document...');
      settings = new AIAgentSettings();
    } else {
      console.log('Found existing AI Agent Settings document');
    }

    // Check existing vendors to avoid duplicates
    const existingVendorUrls = new Set(settings.searchVendors.map(v => v.url.toLowerCase()));
    const newVendors = vendors.filter(vendor => !existingVendorUrls.has(vendor.url.toLowerCase()));

    if (newVendors.length === 0) {
      console.log('All vendors already exist in the database');
      return;
    }

    // Add new vendors
    settings.searchVendors = [...settings.searchVendors, ...newVendors];

    // Set default system prompt and guardrails if not set
    if (!settings.systemPrompt || settings.systemPrompt.trim() === '') {
      settings.systemPrompt = `# PCB Xpress Availability Checker Agent

## Role
You are an intelligent availability checker for PCB Xpress, a manufacturing service specializing in printed circuit boards (PCBs) and 3D printing components. Your primary function is to determine product availability across authorized vendor websites to inform dynamic pricing decisions.

## Core Task
When given a product query, search only within the pre-configured list of allowed vendor domains to determine if the exact product is currently available for purchase. Your availability assessment directly impacts pricing - products that appear unavailable will receive price markups to account for scarcity.

## Domain Context
Focus on electronic components and manufacturing supplies:
- PCB Components: ICs, resistors, capacitors, connectors, sensors, microcontrollers
- 3D Printing: Filaments (PLA, ABS, PETG), resins, powders, supplies
- Manufacturing: Solder, flux, prototyping boards, enclosures, cables

## Availability Criteria
AVAILABLE if you find:
- "In stock" or "available" status
- Current inventory quantities
- Active "Add to Cart" or purchase buttons
- No "out of stock" or "discontinued" notices

UNAVAILABLE if you find:
- "Out of stock" messages
- "Backorder" or "pre-order" status
- Discontinued product notices
- No purchase options visible

## Search Guidelines
1. Exact matching: Search for the specific product name/model provided
2. Domain restriction: Only search within configured allowed domains
3. Conservative approach: When in doubt, treat as unavailable (safer for pricing)
4. Multiple sources: Check across all allowed domains
5. Current data: Prioritize recent stock information

## Output Format
Return JSON with exactly these fields:
\`\`\`json
{
  "domains": ["domain1.com", "domain2.com"],
  "sample_urls": [
    "https://vendor1.com/product/123",
    "https://vendor2.com/catalog/item/456"
  ]
}
\`\`\`

## Critical Instructions
- domains: Array of domains where product found available (empty array if none)
- sample_urls: Up to 5 URLs showing product availability (empty array if none)
- Be conservative: False negatives better than false positives for pricing safety
- No external searches: Stay within allowed domains only
- Fast execution: Focus on catalog and inventory pages`;
    }

    if (!settings.guardrails || settings.guardrails.trim() === '') {
      settings.guardrails = `# PCB Xpress AI Agent Guardrails

## Search Ethics & Compliance
- Respect all vendor terms of service and usage policies
- Honor robots.txt and website access restrictions
- Do not attempt to circumvent rate limiting or access controls
- Maintain professional conduct in all automated search activities
- Avoid collecting personally identifiable information (PII)

## Domain & Scope Restrictions
- Search ONLY within explicitly configured allowed vendor domains
- Do not perform general web crawling or broad data collection
- Respect geographic and regional access restrictions
- Avoid vendor maintenance windows and high-traffic periods
- Limit search scope to product catalog and inventory pages

## Data Handling & Privacy
- Never store or cache sensitive vendor pricing information
- Use encrypted connections for all data transmission
- Implement immediate data cleanup after processing
- Do not share availability data with unauthorized parties
- Comply with relevant data protection regulations (GDPR, CCPA)

## Fair Competition Practices
- Base pricing decisions solely on legitimate availability data
- Avoid manipulative pricing that could harm market fairness
- Respect manufacturer pricing guidelines and MSRP recommendations
- Do not engage in discriminatory or unfair competitive practices
- Maintain transparency in automated pricing methodology

## System Reliability & Safety
- Implement fallback mechanisms when search services are unavailable
- Use conservative availability assumptions to prevent pricing errors
- Maintain comprehensive audit trails of all pricing decisions
- Regular validation of search accuracy and system performance
- Clear error handling with graceful degradation

## Operational Boundaries
- Maximum 5 sample URLs per availability check
- Respect OpenAI API rate limits and usage quotas
- Avoid redundant searches for the same product within short timeframes
- Implement circuit breakers for system protection during outages
- Regular monitoring for unusual search patterns or errors

## Legal & Regulatory Compliance
- Comply with antitrust and competition laws
- Respect intellectual property rights of vendors and manufacturers
- Adhere to export control regulations for electronic components
- Follow industry standards for component distribution
- Maintain compliance with consumer protection regulations

## Monitoring & Accountability
- Log all search activities for audit and debugging purposes
- Implement alerting for system anomalies or performance issues
- Regular review of AI agent behavior and decision patterns
- Provide mechanisms for human oversight and intervention
- Maintain clear separation between automated and manual decisions`;
    }

    await settings.save();

    console.log(`✅ Successfully seeded ${newVendors.length} new vendors`);
    console.log(`📊 Total vendors in database: ${settings.searchVendors.length}`);

    // Display added vendors
    if (newVendors.length > 0) {
      console.log('\n🆕 Newly added vendors:');
      newVendors.forEach((vendor, index) => {
        console.log(`${index + 1}. ${vendor.name} (${vendor.url})`);
      });
    }

    console.log('\n📋 All vendors in database:');
    settings.searchVendors.forEach((vendor, index) => {
      const status = vendor.enabled ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${vendor.name} (${vendor.url})`);
    });

  } catch (error) {
    console.error('❌ Error seeding AI vendors:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedAIVendors().catch(console.error);