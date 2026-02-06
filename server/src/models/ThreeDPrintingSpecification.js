import mongoose from 'mongoose';

const ThreeDPrintingTechSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ThreeDPrintingMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    compatibleTechs: [{ type: String }], // Array of compatible technology names
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ThreeDPrintingResolutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ThreeDPrintingFinishingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ThreeDPrintingTech = mongoose.model('ThreeDPrintingTech', ThreeDPrintingTechSchema);
export const ThreeDPrintingMaterial = mongoose.model('ThreeDPrintingMaterial', ThreeDPrintingMaterialSchema);
export const ThreeDPrintingResolution = mongoose.model('ThreeDPrintingResolution', ThreeDPrintingResolutionSchema);
export const ThreeDPrintingFinishing = mongoose.model('ThreeDPrintingFinishing', ThreeDPrintingFinishingSchema);