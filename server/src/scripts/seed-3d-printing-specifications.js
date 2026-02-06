import mongoose from 'mongoose';
import { ThreeDPrintingTech, ThreeDPrintingMaterial, ThreeDPrintingResolution, ThreeDPrintingFinishing } from '../models/ThreeDPrintingSpecification.js';

const seed3DPrintingSpecifications = async () => {
  try {
    console.log('🌱 Seeding 3D Printing Specifications...');

    // Clear existing data
    await ThreeDPrintingTech.deleteMany({});
    await ThreeDPrintingMaterial.deleteMany({});
    await ThreeDPrintingResolution.deleteMany({});
    await ThreeDPrintingFinishing.deleteMany({});

    // Seed Technologies
    const techs = [
      {
        name: 'FDM',
        description: 'Fused Deposition Modeling - Cost-effective for prototyping and functional parts',
        isActive: true
      },
      {
        name: 'SLA',
        description: 'Stereolithography - High precision for detailed models and smooth finishes',
        isActive: true
      },
      {
        name: 'SLS',
        description: 'Selective Laser Sintering - Strong, functional parts with complex geometries',
        isActive: true
      }
    ];

    const createdTechs = await ThreeDPrintingTech.insertMany(techs);
    console.log(`✅ Created ${createdTechs.length} technologies`);

    // Seed Materials
    const materials = [
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
        description: 'Polyethylene Terephthalate Glycol - Chemical resistant, flexible, food-safe',
        compatibleTechs: ['FDM'],
        isActive: true
      },
      {
        name: 'TPU',
        description: 'Thermoplastic Polyurethane - Flexible, rubber-like material',
        compatibleTechs: ['FDM'],
        isActive: true
      },
      {
        name: 'Resin',
        description: 'Photopolymer Resin - High detail, smooth surface finish',
        compatibleTechs: ['SLA'],
        isActive: true
      },
      {
        name: 'Tough Resin',
        description: 'Durable photopolymer resin for functional prototypes',
        compatibleTechs: ['SLA'],
        isActive: true
      },
      {
        name: 'Nylon',
        description: 'Polyamide - Strong, flexible, good for mechanical parts',
        compatibleTechs: ['SLS'],
        isActive: true
      },
      {
        name: 'Nylon PA12',
        description: 'Polyamide 12 - High strength, chemical resistance, medical applications',
        compatibleTechs: ['SLS'],
        isActive: true
      }
    ];

    const createdMaterials = await ThreeDPrintingMaterial.insertMany(materials);
    console.log(`✅ Created ${createdMaterials.length} materials`);

    // Seed Resolutions
    const resolutions = [
      {
        name: 'Draft',
        description: '0.3mm layer height - Fast printing, rough surface',
        isActive: true
      },
      {
        name: 'Standard',
        description: '0.2mm layer height - Good balance of speed and quality',
        isActive: true
      },
      {
        name: 'High',
        description: '0.1mm layer height - High detail, smooth surface',
        isActive: true
      },
      {
        name: 'Ultra',
        description: '0.05mm layer height - Maximum detail and precision',
        isActive: true
      }
    ];

    const createdResolutions = await ThreeDPrintingResolution.insertMany(resolutions);
    console.log(`✅ Created ${createdResolutions.length} resolutions`);

    // Seed Finishing Options
    const finishings = [
      {
        name: 'Raw',
        description: 'No post-processing - As printed finish',
        isActive: true
      },
      {
        name: 'Sanded',
        description: 'Light sanding for smoother surface',
        isActive: true
      },
      {
        name: 'Polished',
        description: 'Polished surface for shiny finish',
        isActive: true
      },
      {
        name: 'Painted',
        description: 'Professional painting service',
        isActive: true
      },
      {
        name: 'Dyed',
        description: 'Color dyeing for consistent appearance',
        isActive: true
      }
    ];

    const createdFinishings = await ThreeDPrintingFinishing.insertMany(finishings);
    console.log(`✅ Created ${createdFinishings.length} finishing options`);

    console.log('🎉 3D Printing Specifications seeding completed successfully!');
    console.log(`📊 Summary:
    - Technologies: ${createdTechs.length}
    - Materials: ${createdMaterials.length}
    - Resolutions: ${createdResolutions.length}
    - Finishing Options: ${createdFinishings.length}
    - Total: ${createdTechs.length + createdMaterials.length + createdResolutions.length + createdFinishings.length} items`);

  } catch (error) {
    console.error('❌ Error seeding 3D Printing Specifications:', error);
    throw error;
  }
};

export default seed3DPrintingSpecifications;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../lib/db.js').then(({ connectDB }) => {
    connectDB()
      .then(() => seed3DPrintingSpecifications())
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });
}