import mongoose from 'mongoose';

const PcbMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PcbFinishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PcbMaterial = mongoose.model('PcbMaterial', PcbMaterialSchema);
export const PcbFinish = mongoose.model('PcbFinish', PcbFinishSchema);