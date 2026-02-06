import mongoose from 'mongoose';
import { PcbMaterial, PcbFinish } from '../models/PcbSpecification.js';

const defaultMaterials = [
  { name: 'FR4', description: 'Standard fiberglass material for PCBs', isActive: true },
  { name: 'Isola', description: 'High-performance material for advanced applications', isActive: true },
  { name: 'Rogers', description: 'High-frequency material for RF applications', isActive: true },
  { name: 'Aluminum', description: 'Metal core PCB material for thermal management', isActive: true },
  { name: 'Ceramic', description: 'Ceramic substrate for high-temperature applications', isActive: true }
];

const defaultFinishes = [
  { name: 'HASL', description: 'Hot Air Solder Leveling - Standard finish', isActive: true },
  { name: 'ENIG', description: 'Electroless Nickel Immersion Gold - Premium finish', isActive: true },
  { name: 'OSP', description: 'Organic Solderability Preservative - Lead-free finish', isActive: true },
  { name: 'Immersion Silver', description: 'Silver finish for high conductivity', isActive: true },
  { name: 'Immersion Tin', description: 'Tin finish for soldering', isActive: true },
  { name: 'Hard Gold', description: 'Gold plating for edge connectors', isActive: true }
];

async function seedPcbSpecifications() {
  try {
    console.log('Seeding PCB specifications...');

    // Seed materials
    for (const material of defaultMaterials) {
      const existing = await PcbMaterial.findOne({ name: material.name });
      if (!existing) {
        await PcbMaterial.create(material);
        console.log(`Created material: ${material.name}`);
      } else {
        console.log(`Material already exists: ${material.name}`);
      }
    }

    // Seed finishes
    for (const finish of defaultFinishes) {
      const existing = await PcbFinish.findOne({ name: finish.name });
      if (!existing) {
        await PcbFinish.create(finish);
        console.log(`Created finish: ${finish.name}`);
      } else {
        console.log(`Finish already exists: ${finish.name}`);
      }
    }

    console.log('PCB specifications seeding completed!');
  } catch (error) {
    console.error('Error seeding PCB specifications:', error);
  }
}

export default seedPcbSpecifications;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../lib/db.js').then(({ connectDB }) => {
    connectDB().then(() => {
      seedPcbSpecifications().then(() => {
        console.log('Seeding completed, exiting...');
        process.exit(0);
      }).catch((err) => {
        console.error('Seeding failed:', err);
        process.exit(1);
      });
    }).catch((err) => {
      console.error('Database connection failed:', err);
      process.exit(1);
    });
  });
}