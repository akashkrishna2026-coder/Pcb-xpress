import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Beaker,
  GaugeCircle,
  Lightbulb,
  RefreshCw,
  Save,
  Settings,
  SlidersHorizontal,
  Waves,
  Zap,
} from 'lucide-react';

const PARAMETER_CONFIGS = {
  photo_imaging: {
    parameterKey: 'photoImagingParams',
    title: 'Photo Imaging Parameters',
    defaults: {
      exposureTime: 120,
      uvIntensity: 25,
      focusMode: 'auto',
      resolution: 5080,
      filmType: 'emulsion',
      emulsionThickness: 8,
      filmSize: '18x24',
      developerType: 'positive',
      developerTemp: 25,
      developmentTime: 60,
      developerConcentration: 1,
      lampType: 'mercury',
      vacuumHoldTime: 30,
      registrationAccuracy: 0.05,
      minLineWidth: 0.1,
      maxPinholeSize: 0.05,
      registrationTolerance: 0.025,
      notes: '',
    },
    sections: [
      {
        title: 'Exposure Settings',
        icon: Lightbulb,
        fields: [
          { key: 'exposureTime', label: 'Exposure Time (sec)', type: 'number', min: 10, max: 600 },
          { key: 'uvIntensity', label: 'UV Intensity (mW/cm²)', type: 'number', min: 5, max: 80 },
          { key: 'focusMode', label: 'Focus Mode' },
          { key: 'resolution', label: 'Resolution (DPI)', type: 'number', min: 2400, max: 6400, step: 10 },
        ],
      },
      {
        title: 'Film & Developer',
        icon: Beaker,
        fields: [
          { key: 'filmType', label: 'Film Type' },
          { key: 'filmSize', label: 'Film Size (in)' },
          { key: 'emulsionThickness', label: 'Emulsion Thickness (µm)', type: 'number', min: 2, max: 20, step: 0.5 },
          { key: 'developerType', label: 'Developer Chemistry' },
          { key: 'developerTemp', label: 'Developer Temp (°C)', type: 'number', min: 15, max: 45 },
          { key: 'developmentTime', label: 'Development Time (sec)', type: 'number', min: 30, max: 180 },
          { key: 'developerConcentration', label: 'Developer Concentration (ratio)', type: 'number', min: 0.1, max: 5, step: 0.1 },
        ],
      },
      {
        title: 'Equipment & Quality',
        icon: Settings,
        fields: [
          { key: 'lampType', label: 'Lamp Type' },
          { key: 'vacuumHoldTime', label: 'Vacuum Hold Time (sec)', type: 'number', min: 5, max: 120 },
          { key: 'registrationAccuracy', label: 'Registration Accuracy (mm)', type: 'number', min: 0.01, max: 0.5, step: 0.01 },
          { key: 'minLineWidth', label: 'Min Line Width (mm)', type: 'number', min: 0.01, max: 1, step: 0.01 },
          { key: 'maxPinholeSize', label: 'Max Pinhole Size (mm)', type: 'number', min: 0.01, max: 0.5, step: 0.01 },
          { key: 'registrationTolerance', label: 'Registration Tolerance (mm)', type: 'number', min: 0.01, max: 0.2, step: 0.01 },
        ],
      },
    ],
    notesKey: 'notes',
    notesPlaceholder: 'Add any special notes or instructions for this imaging job...'
  },
  developer: {
    parameterKey: 'developerParams',
    title: 'Developer Parameters',
    defaults: {
      developerType: 'alkaline',
      developerTemp: 32,
      developerPH: 10.5,
      developmentTime: 55,
      sprayPressure: 25,
      conveyorSpeed: 1.2,
      rinseDuration: 45,
      finalRinseTemp: 24,
      dryTemp: 45,
      notes: '',
    },
    sections: [
      {
        title: 'Bath Settings',
        icon: Beaker,
        fields: [
          { key: 'developerType', label: 'Developer Chemistry' },
          { key: 'developerTemp', label: 'Bath Temperature (°C)', type: 'number', min: 20, max: 60 },
          { key: 'developerPH', label: 'Bath pH', type: 'number', min: 7, max: 13, step: 0.1 },
        ],
      },
      {
        title: 'Process Controls',
        icon: SlidersHorizontal,
        fields: [
          { key: 'developmentTime', label: 'Development Time (sec)', type: 'number', min: 20, max: 120 },
          { key: 'conveyorSpeed', label: 'Conveyor Speed (m/min)', type: 'number', min: 0.2, max: 3, step: 0.1 },
          { key: 'sprayPressure', label: 'Spray Pressure (psi)', type: 'number', min: 10, max: 40 },
        ],
      },
      {
        title: 'Rinse & Dry',
        icon: Waves,
        fields: [
          { key: 'rinseDuration', label: 'Rinse Duration (sec)', type: 'number', min: 10, max: 120 },
          { key: 'finalRinseTemp', label: 'Final Rinse Temp (°C)', type: 'number', min: 15, max: 40 },
          { key: 'dryTemp', label: 'Dryer Temperature (°C)', type: 'number', min: 25, max: 80 },
        ],
      },
    ],
    notesKey: 'notes',
    notesPlaceholder: 'Document observations for the development process...'
  },
  etching: {
    parameterKey: 'etchingParams',
    title: 'Etching Parameters',
    defaults: {
      etchantType: 'alkaline',
      chemistryConcentration: 12.5,
      bathTemperature: 48,
      lineSpeed: 1.1,
      sprayPressure: 28,
      dwellTime: 75,
      targetEtchRate: 12,
      copperThickness: 35,
      agitationRate: 70,
      notes: '',
    },
    sections: [
      {
        title: 'Chemistry Settings',
        icon: Beaker,
        fields: [
          { key: 'etchantType', label: 'Etchant Type' },
          { key: 'chemistryConcentration', label: 'Chemistry Concentration (%)', type: 'number', min: 5, max: 25, step: 0.1 },
          { key: 'bathTemperature', label: 'Bath Temperature (°C)', type: 'number', min: 20, max: 70 },
        ],
      },
      {
        title: 'Line Setup',
        icon: GaugeCircle,
        fields: [
          { key: 'lineSpeed', label: 'Line Speed (m/min)', type: 'number', min: 0.2, max: 3, step: 0.1 },
          { key: 'sprayPressure', label: 'Spray Pressure (psi)', type: 'number', min: 10, max: 60 },
          { key: 'dwellTime', label: 'Dwell Time (sec)', type: 'number', min: 20, max: 200 },
          { key: 'agitationRate', label: 'Agitation Rate (%)', type: 'number', min: 0, max: 100 },
        ],
      },
      {
        title: 'Quality Targets',
        icon: Zap,
        fields: [
          { key: 'targetEtchRate', label: 'Target Etch Rate (µm/min)', type: 'number', min: 1, max: 50 },
          { key: 'copperThickness', label: 'Copper Thickness (µm)', type: 'number', min: 10, max: 70 },
        ],
      },
    ],
    notesKey: 'notes',
    notesPlaceholder: 'Record observations or adjustments during etching...'
  },
  solder_mask: {
    parameterKey: 'solderMaskParams',
    title: 'Solder Mask Parameters',
    defaults: {
      coatingMethod: 'curtain_coat',
      coatingSpeed: 1.2,
      coatingGap: 120,
      materialViscosity: 25,
      flashDryTemp: 80,
      flashDryTime: 8,
      exposureEnergy: 180,
      imagingMode: 'double_sided',
      developTime: 65,
      developPressure: 18,
      finalCureTemp: 150,
      finalCureTime: 30,
      thicknessTarget: 25,
      uvIntensity: 12,
      notes: '',
    },
    sections: [
      {
        title: 'Coating Setup',
        icon: SlidersHorizontal,
        fields: [
          { key: 'coatingMethod', label: 'Coating Method' },
          { key: 'coatingSpeed', label: 'Coating Speed (m/min)', type: 'number', min: 0.5, max: 3, step: 0.1 },
          { key: 'coatingGap', label: 'Coating Gap (um)', type: 'number', min: 50, max: 300, step: 5 },
          { key: 'materialViscosity', label: 'Viscosity (Pa*s)', type: 'number', min: 5, max: 60, step: 0.5 },
        ],
      },
      {
        title: 'Flash Dry & Imaging',
        icon: Lightbulb,
        fields: [
          { key: 'flashDryTemp', label: 'Flash Dry Temp (C)', type: 'number', min: 60, max: 120 },
          { key: 'flashDryTime', label: 'Flash Dry Time (min)', type: 'number', min: 2, max: 15, step: 0.5 },
          { key: 'exposureEnergy', label: 'Exposure Energy (mJ/cm2)', type: 'number', min: 50, max: 400, step: 5 },
          { key: 'uvIntensity', label: 'UV Intensity (mW/cm2)', type: 'number', min: 5, max: 30, step: 0.5 },
          { key: 'imagingMode', label: 'Imaging Mode' },
        ],
      },
      {
        title: 'Development & Cure',
        icon: Beaker,
        fields: [
          { key: 'developTime', label: 'Develop Time (sec)', type: 'number', min: 20, max: 120 },
          { key: 'developPressure', label: 'Develop Spray Pressure (psi)', type: 'number', min: 10, max: 40 },
          { key: 'finalCureTemp', label: 'Final Cure Temp (C)', type: 'number', min: 120, max: 180 },
          { key: 'finalCureTime', label: 'Final Cure Time (min)', type: 'number', min: 10, max: 60, step: 1 },
          { key: 'thicknessTarget', label: 'Target Thickness (um)', type: 'number', min: 10, max: 60, step: 1 },
        ],
      },
    ],
    notesKey: 'notes',
    notesPlaceholder: 'Capture special handling notes or cure observations for solder mask...',
  },
};

const ParametersView = ({
  workOrder,
  token,
  onUpdate,
  station = 'photo_imaging',
}) => {
  const { toast } = useToast();
  const config = useMemo(
    () => PARAMETER_CONFIGS[station] || PARAMETER_CONFIGS.photo_imaging,
    [station]
  );

  const [parameters, setParameters] = useState(() => ({ ...config.defaults }));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setParameters({ ...config.defaults });
  }, [config]);

  useEffect(() => {
    if (!workOrder || !token) {
      setParameters({ ...config.defaults });
      return;
    }

    setLoading(true);
    try {
      const existing = workOrder?.[config.parameterKey];
      if (existing && typeof existing === 'object') {
        setParameters((prev) => ({
          ...config.defaults,
          ...Object.fromEntries(
            Object.entries(existing).map(([key, value]) => [
              key,
              value === null || typeof value === 'undefined' ? prev[key] ?? config.defaults[key] : value,
            ])
          ),
        }));
      } else {
        setParameters({ ...config.defaults });
      }
    } finally {
      setLoading(false);
    }
  }, [workOrder, token, config]);

  const handleParameterChange = (field, rawValue) => {
    let value = rawValue;
    if (field.type === 'number') {
      value = rawValue === '' ? '' : Number(rawValue);
    }

    setParameters((prev) => ({
      ...prev,
      [field.key]: value,
    }));
  };

  const handleReset = () => {
    setParameters({ ...config.defaults });
    toast({ title: 'Parameters reset' });
  };

  const handleSave = async () => {
    if (!workOrder || !token) return;

    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(parameters).map(([key, value]) => [key, value === '' ? null : value])
      );

      const result = await api.mfgUpdateWorkOrder(token, workOrder._id || workOrder.id, {
        [config.parameterKey]: payload,
      });

      const updatedWorkOrder = result?.workOrder;
      if (updatedWorkOrder?.[config.parameterKey]) {
        setParameters({
          ...config.defaults,
          ...updatedWorkOrder[config.parameterKey],
        });
      }

      toast({
        title: 'Parameters saved',
        description: `${config.title} updated successfully.`,
      });

      onUpdate?.(updatedWorkOrder || null);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Unable to save station parameters.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!workOrder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a work order to view parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{config.title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={loading || saving}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading || saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Parameters'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure process parameters for work order {workOrder.woNumber}
          </p>
        </CardHeader>
      </Card>

      {config.sections.map((section) => {
        const Icon = section.icon || Settings;
        return (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => {
                  const value = parameters[field.key] ?? '';
                  const handleChange = (event) =>
                    handleParameterChange(field, event.target.value);

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.key} className="md:col-span-2">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Textarea
                          id={field.key}
                          value={value}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          rows={field.rows || 3}
                        />
                      </div>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <div key={field.key}>
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <select
                          id={field.key}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={value}
                          onChange={handleChange}
                        >
                          {(field.options || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={handleChange}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        placeholder={field.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {config.notesKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={config.notesPlaceholder || 'Add notes...'}
              value={parameters[config.notesKey] ?? ''}
              onChange={(event) => handleParameterChange({ key: config.notesKey }, event.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParametersView;
