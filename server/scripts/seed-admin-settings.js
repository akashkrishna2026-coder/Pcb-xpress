import dotenv from 'dotenv';
import path from 'path';
import { ensureDb } from '../lib/db.js';
import {
  PcbMaterial,
  PcbFinish
} from '../src/models/PcbSpecification.js';
import {
  ThreeDPrintingTech,
  ThreeDPrintingMaterial,
  ThreeDPrintingResolution,
  ThreeDPrintingFinishing
} from '../src/models/ThreeDPrintingSpecification.js';
import Setting from '../src/models/Setting.js';
import PromotionalImage from '../src/models/PromotionalImage.js';

async function seedPcbSpecifications() {
  console.log('🌱 Seeding PCB specifications...');

  // PCB Materials
  const pcbMaterials = [
    {
      name: 'FR-4',
      description: 'Standard fiberglass reinforced epoxy laminate - most common PCB material',
      isActive: true
    },
    {
      name: 'Rogers RO4000',
      description: 'High-frequency laminate for RF/microwave applications',
      isActive: true
    },
    {
      name: 'Rogers RT/Duroid',
      description: 'PTFE-based material for high-frequency and low-loss applications',
      isActive: true
    },
    {
      name: 'Aluminum',
      description: 'Metal core PCB for thermal management and heat dissipation',
      isActive: true
    },
    {
      name: 'Ceramic',
      description: 'High thermal conductivity substrate for extreme environments',
      isActive: true
    },
    {
      name: 'Polyimide',
      description: 'Flexible substrate material for flex and rigid-flex PCBs',
      isActive: true
    },
    {
      name: 'Teflon',
      description: 'Low dielectric constant material for high-speed applications',
      isActive: true
    }
  ];

  // PCB Finishes
  const pcbFinishes = [
    {
      name: 'HASL',
      description: 'Hot Air Solder Leveling - Traditional tin-lead finish',
      isActive: true
    },
    {
      name: 'ENIG',
      description: 'Electroless Nickel Immersion Gold - Lead-free, flat surface finish',
      isActive: true
    },
    {
      name: 'OSP',
      description: 'Organic Solderability Preservative - Cost-effective, lead-free finish',
      isActive: true
    },
    {
      name: 'Immersion Silver',
      description: 'Silver finish for excellent solderability and conductivity',
      isActive: true
    },
    {
      name: 'Immersion Tin',
      description: 'Tin finish for good solderability and cost-effectiveness',
      isActive: true
    },
    {
      name: 'Hard Gold',
      description: 'Gold plating for edge connectors and wear-resistant applications',
      isActive: true
    },
    {
      name: 'Soft Gold',
      description: 'Gold finish for wire bonding and high-reliability applications',
      isActive: true
    }
  ];

  // Insert PCB materials
  for (const material of pcbMaterials) {
    try {
      await PcbMaterial.findOneAndUpdate(
        { name: material.name },
        material,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.log(`⚠️  PCB Material "${material.name}" already exists or error:`, err.message);
    }
  }

  // Insert PCB finishes
  for (const finish of pcbFinishes) {
    try {
      await PcbFinish.findOneAndUpdate(
        { name: finish.name },
        finish,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.log(`⚠️  PCB Finish "${finish.name}" already exists or error:`, err.message);
    }
  }

  console.log('✅ PCB specifications seeded');
}

async function seedThreeDPrintingSpecifications() {
  console.log('🌱 Seeding 3D printing specifications...');

  // 3D Printing Technologies
  const threeDTechs = [
    {
      name: 'FDM',
      description: 'Fused Deposition Modeling - Cost-effective, versatile technology for prototyping and functional parts',
      isActive: true
    },
    {
      name: 'SLA',
      description: 'Stereolithography - High-precision resin printing for detailed prototypes and molds',
      isActive: true
    },
    {
      name: 'SLS',
      description: 'Selective Laser Sintering - Powder-based technology for complex geometries and functional parts',
      isActive: true
    },
    {
      name: 'DLP',
      description: 'Digital Light Processing - Fast resin printing with excellent surface finish',
      isActive: true
    },
    {
      name: 'PolyJet',
      description: 'Multi-material jetting technology for complex assemblies and overmolding',
      isActive: true
    },
    {
      name: 'MJF',
      description: 'Multi Jet Fusion - High-speed powder-based technology for production parts',
      isActive: true
    }
  ];

  // 3D Printing Materials
  const threeDMaterials = [
    {
      name: 'PLA',
      description: 'Polylactic Acid - Biodegradable, easy to print, good for prototyping',
      compatibleTechs: ['FDM'],
      isActive: true
    },
    {
      name: 'ABS',
      description: 'Acrylonitrile Butadiene Styrene - Durable, impact-resistant, good for functional parts',
      compatibleTechs: ['FDM'],
      isActive: true
    },
    {
      name: 'PETG',
      description: 'Polyethylene Terephthalate Glycol - Chemical resistant, flexible, good layer adhesion',
      compatibleTechs: ['FDM'],
      isActive: true
    },
    {
      name: 'TPU',
      description: 'Thermoplastic Polyurethane - Flexible, rubber-like material for elastic parts',
      compatibleTechs: ['FDM'],
      isActive: true
    },
    {
      name: 'Nylon',
      description: 'Polyamide - Strong, durable, good for functional and mechanical parts',
      compatibleTechs: ['FDM', 'SLS', 'MJF'],
      isActive: true
    },
    {
      name: 'Resin',
      description: 'Photopolymer resin - High detail, smooth surface finish',
      compatibleTechs: ['SLA', 'DLP'],
      isActive: true
    },
    {
      name: 'Tough Resin',
      description: 'Durable photopolymer resin - Impact-resistant with good mechanical properties',
      compatibleTechs: ['SLA', 'DLP'],
      isActive: true
    },
    {
      name: 'Flexible Resin',
      description: 'Elastic photopolymer resin - Soft, rubber-like material',
      compatibleTechs: ['SLA', 'DLP'],
      isActive: true
    }
  ];

  // 3D Printing Resolutions
  const threeDResolutions = [
    {
      name: 'Draft (0.3mm)',
      description: 'Fast printing with rough surface finish - ideal for initial prototypes',
      isActive: true
    },
    {
      name: 'Standard (0.2mm)',
      description: 'Balanced speed and quality - good for most prototyping needs',
      isActive: true
    },
    {
      name: 'High (0.1mm)',
      description: 'High quality with smooth surface - suitable for presentation models',
      isActive: true
    },
    {
      name: 'Ultra (0.05mm)',
      description: 'Maximum detail and precision - for fine features and smooth surfaces',
      isActive: true
    }
  ];

  // 3D Printing Finishing Options
  const threeDFinishings = [
    {
      name: 'Raw',
      description: 'No post-processing - as-printed finish with support marks',
      isActive: true
    },
    {
      name: 'Sanded',
      description: 'Manual sanding for smooth surface finish',
      isActive: true
    },
    {
      name: 'Polished',
      description: 'Professional polishing for glossy, smooth finish',
      isActive: true
    },
    {
      name: 'Painted',
      description: 'Custom painting and coloring services',
      isActive: true
    },
    {
      name: 'Dyed',
      description: 'Color dyeing for uniform coloration',
      isActive: true
    },
    {
      name: 'Primed',
      description: 'Primer coating for better paint adhesion',
      isActive: true
    },
    {
      name: 'Assembly',
      description: 'Multi-part assembly and fitting services',
      isActive: true
    }
  ];

  // Insert 3D technologies
  for (const tech of threeDTechs) {
    try {
      await ThreeDPrintingTech.findOneAndUpdate(
        { name: tech.name },
        tech,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.log(`⚠️  3D Tech "${tech.name}" already exists or error:`, err.message);
    }
  }

  // Insert 3D materials
  for (const material of threeDMaterials) {
    try {
      await ThreeDPrintingMaterial.findOneAndUpdate(
        { name: material.name },
        material,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.log(`⚠️  3D Material "${material.name}" already exists or error:`, err.message);
    }
  }

  // Insert 3D resolutions
  for (const resolution of threeDResolutions) {
    try {
      await ThreeDPrintingResolution.findOneAndUpdate(
        { name: resolution.name },
        resolution,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.log(`⚠️  3D Resolution "${resolution.name}" already exists or error:`, err.message);
    }
  }

  // Insert 3D finishing options
  for (const finishing of threeDFinishings) {
    try {
      await ThreeDPrintingFinishing.findOneAndUpdate(
        { name: finishing.name },
        finishing,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.log(`⚠️  3D Finishing "${finishing.name}" already exists or error:`, err.message);
    }
  }

  console.log('✅ 3D printing specifications seeded');
}

async function seedDefaultSettings() {
  console.log('🌱 Seeding default settings...');

  // Default factory video URL
  const defaultSettings = [
    {
      key: 'factory-video',
      value: 'https://www.youtube.com/embed/7YcW25PHnAA',
      description: 'YouTube embed URL for factory highlight video'
    },
    {
      key: 'smtp',
      value: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        fromName: '',
        fromEmail: '',
        hasPassword: false
      },
      description: 'SMTP configuration for email sending'
    }
  ];

  for (const setting of defaultSettings) {
    try {
      await Setting.findOneAndUpdate(
        { key: setting.key },
        {
          key: setting.key,
          value: setting.value
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Setting "${setting.key}" seeded`);
    } catch (err) {
      console.log(`⚠️  Setting "${setting.key}" already exists or error:`, err.message);
    }
  }

  console.log('✅ Default settings seeded');
}

async function seedPromotionalImages() {
  console.log('🌱 Seeding promotional images...');

  const promotionalImages = [
    {
      title: 'PCB Fabrication Special Offer',
      image: {
        originalName: 'pcb-special-offer.jpg',
        filename: 'pcb-special-offer.jpg',
        mimeType: 'image/jpeg',
        size: 245760,
        url: '/pcb.png'
      },
      isActive: true,
      displayOrder: 1,
      displayFrequency: 24,
      maxPopupsPerSession: 2,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      targetUrl: '/quote?service=pcb',
      clickCount: 0,
      viewCount: 0
    },
    {
      title: '3D Printing Services',
      image: {
        originalName: '3d-printing-promo.jpg',
        filename: '3d-printing-promo.jpg',
        mimeType: 'image/jpeg',
        size: 198656,
        url: '/3d.png'
      },
      isActive: true,
      displayOrder: 2,
      displayFrequency: 48,
      maxPopupsPerSession: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      targetUrl: '/3d-printing',
      clickCount: 0,
      viewCount: 0
    },
    {
      title: 'Component Sourcing Solutions',
      image: {
        originalName: 'component-sourcing.jpg',
        filename: 'component-sourcing.jpg',
        mimeType: 'image/jpeg',
        size: 167936,
        url: '/sourcing.png'
      },
      isActive: true,
      displayOrder: 3,
      displayFrequency: 72,
      maxPopupsPerSession: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      targetUrl: '/components',
      clickCount: 0,
      viewCount: 0
    },
    {
      title: 'PCB Assembly Excellence',
      image: {
        originalName: 'pcb-assembly.jpg',
        filename: 'pcb-assembly.jpg',
        mimeType: 'image/jpeg',
        size: 223744,
        url: '/assembling.png'
      },
      isActive: true,
      displayOrder: 4,
      displayFrequency: 36,
      maxPopupsPerSession: 2,
      startDate: new Date(),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      targetUrl: '/quote?service=assembly',
      clickCount: 0,
      viewCount: 0
    },
    {
      title: 'Fast Prototyping Services',
      image: {
        originalName: 'prototyping.jpg',
        filename: 'prototyping.jpg',
        mimeType: 'image/jpeg',
        size: 189440,
        url: '/global.jpg'
      },
      isActive: true,
      displayOrder: 5,
      displayFrequency: 24,
      maxPopupsPerSession: 3,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      targetUrl: '/quote',
      clickCount: 0,
      viewCount: 0
    }
  ];

  for (const promoImage of promotionalImages) {
    try {
      await PromotionalImage.findOneAndUpdate(
        { title: promoImage.title },
        promoImage,
        { upsert: true, new: true }
      );
      console.log(`✅ Promotional image "${promoImage.title}" seeded`);
    } catch (err) {
      console.log(`⚠️  Promotional image "${promoImage.title}" already exists or error:`, err.message);
    }
  }

  console.log('✅ Promotional images seeded');
}

async function main() {
  try {
    // Load environment variables
    dotenv.config();
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI or MONGO_URI not set. Define it in .env or environment.');
    }

    console.log('🚀 Starting admin settings seed...');
    await ensureDb();

    await seedPcbSpecifications();
    await seedThreeDPrintingSpecifications();
    await seedDefaultSettings();
    await seedPromotionalImages();

    console.log('🎉 Admin settings seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Admin settings seed failed:', err?.message || err);
    process.exit(1);
  }
}

main();