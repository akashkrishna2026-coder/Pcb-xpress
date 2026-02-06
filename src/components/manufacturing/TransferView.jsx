import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Settings,
  CheckSquare,
} from 'lucide-react';

const TransferView = ({
  workOrder,
  token,
  onTransfer,
  currentStage = 'photo_imaging',
  nextStage = 'developer',
  onTravelerAction,
  hasPermission,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [validationResults, setValidationResults] = useState({});

  const computeAllValid = (results) => {
    const keys = Object.keys(results || {});
    if (keys.length === 0) return false;
    return keys.every((key) => results[key]);
  };

  // Validate work order readiness for transfer
  useEffect(() => {
    const validateReadiness = async () => {
      if (!workOrder || !token) return;

      setLoading(true);
      try {
        let validationResults = {};

        if (currentStage === 'photo_imaging') {

          // Check if parameters are set
          const hasParameters =
            workOrder.photoImagingParams && Object.keys(workOrder.photoImagingParams).length > 0;

          // Check if checklist is complete
          const checklist = workOrder.photoImagingChecklist || {};
          const checklistSections = Object.values(checklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isChecklistComplete =
            checklistSections.length > 0 &&
            checklistSections.every((section) => section.items.every((item) => item.checked));

          // Check if quality is approved (simplified check)
          const currentStatus = (workOrder.photoImagingStatus?.state || '').toLowerCase();
          const isQualityApproved = ['approved', 'ready', 'completed'].includes(currentStatus);

          validationResults = {
            filesUploaded: true,
            parametersSet: !!hasParameters,
            checklistComplete: isChecklistComplete,
            qualityApproved: isQualityApproved,
          };
        } else if (currentStage === 'developer') {
          // Check developer station readiness
          const hasDeveloperParams =
            workOrder.developerParams && Object.keys(workOrder.developerParams).length > 0;

          const developerChecklist = workOrder.developerChecklist || {};
          const developerChecklistSections = Object.values(developerChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isDeveloperChecklistComplete =
            developerChecklistSections.length > 0 &&
            developerChecklistSections.every((section) =>
              section.items.every((item) => item.checked)
            );

          const developerStatus = (workOrder.developerStatus?.state || '').toLowerCase();
          const isDeveloperApproved = ['approved', 'ready', 'completed'].includes(developerStatus);

          validationResults = {
            filesUploaded: true,
            parametersSet: !!hasDeveloperParams,
            checklistComplete: isDeveloperChecklistComplete,
            qualityApproved: isDeveloperApproved
          };
        } else if (currentStage === 'etching') {
          const hasEtchingParams =
            workOrder.etchingParams && Object.keys(workOrder.etchingParams).length > 0;

          const etchingChecklist = workOrder.etchingChecklist || {};
          const etchingChecklistSections = Object.values(etchingChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isEtchingChecklistComplete =
            etchingChecklistSections.length > 0 &&
            etchingChecklistSections.every((section) =>
              section.items.every((item) => item.checked || item.completed)
            );

          const etchingStatus = (workOrder.etchingStatus?.state || '').toLowerCase();
          const isEtchingApproved = ['approved', 'ready', 'completed'].includes(etchingStatus);

          validationResults = {
            filesUploaded: true,
            parametersSet: !!hasEtchingParams,
            checklistComplete: isEtchingChecklistComplete,
            qualityApproved: isEtchingApproved,
          };
        } else if (currentStage === 'tin_strip' || currentStage === 'tin_stripping') {
          const tinStripChecklist = workOrder.tinStrippingChecklist || {};
          const tinStripSections = Object.values(tinStripChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isTinStripChecklistComplete =
            tinStripSections.length > 0 &&
            tinStripSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          validationResults = {
            checklistComplete: isTinStripChecklistComplete,
          };
        } else if (currentStage === 'solder_mask') {
          const solderMaskChecklist = workOrder.solderMaskChecklist || {};
          const solderMaskSections = Object.values(solderMaskChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isSolderMaskChecklistComplete =
            solderMaskSections.length > 0 &&
            solderMaskSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const solderMaskStatus = (workOrder.solderMaskStatus?.state || '').toLowerCase();
          const isSolderMaskApproved = ['approved', 'ready', 'completed'].includes(solderMaskStatus);

          validationResults = {
            checklistComplete: isSolderMaskChecklistComplete,
            qualityApproved: isSolderMaskApproved,
          };
        } else if (currentStage === 'surface_finish') {
          const surfaceChecklist = workOrder.surfaceFinishChecklist || {};
          const surfaceSections = Object.values(surfaceChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isSurfaceChecklistComplete =
            surfaceSections.length > 0 &&
            surfaceSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const surfaceStatus = (workOrder.surfaceFinishStatus?.state || '').toLowerCase();
          const isSurfaceApproved = ['approved', 'ready', 'completed'].includes(surfaceStatus);

          validationResults = {
            checklistComplete: isSurfaceChecklistComplete,
            qualityApproved: isSurfaceApproved,
          };
        } else if (currentStage === 'legend_print') {
          const legendChecklist = workOrder.legendPrintingChecklist || {};
          const legendSections = Object.values(legendChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isLegendChecklistComplete =
            legendSections.length > 0 &&
            legendSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const legendStatus = (workOrder.legendPrintingStatus?.state || '').toLowerCase();
          const isLegendApproved = ['approved', 'ready', 'completed'].includes(legendStatus);

          validationResults = {
            checklistComplete: isLegendChecklistComplete,
            qualityApproved: isLegendApproved,
          };
        } else if (currentStage === 'cnc_routing') {
          const routingChecklist = workOrder.cncRoutingChecklist || {};
          const routingSections = Object.values(routingChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isRoutingChecklistComplete =
            routingSections.length > 0 &&
            routingSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const routingStatus = (workOrder.cncRoutingStatus?.state || '').toLowerCase();
          const isRoutingApproved = ['approved', 'ready', 'completed'].includes(routingStatus);

          validationResults = {
            checklistComplete: isRoutingChecklistComplete,
            qualityApproved: isRoutingApproved,
          };
        } else if (currentStage === 'v_score') {
          const vScoreChecklist = workOrder.vScoringChecklist || {};
          const vScoreSections = Object.values(vScoreChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isVScoreChecklistComplete =
            vScoreSections.length > 0 &&
            vScoreSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const vScoreStatus = (workOrder.vScoringStatus?.state || '').toLowerCase();
          const isVScoreApproved = ['approved', 'ready', 'completed'].includes(vScoreStatus);

          validationResults = {
            checklistComplete: isVScoreChecklistComplete,
            qualityApproved: isVScoreApproved,
          };
        } else if (currentStage === 'flying_probe') {
          const flyingProbeChecklist = workOrder.flyingProbeChecklist || {};
          const flyingProbeSections = Object.values(flyingProbeChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isFlyingProbeChecklistComplete =
            flyingProbeSections.length > 0 &&
            flyingProbeSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const flyingProbeStatus = (workOrder.flyingProbeStatus?.state || '').toLowerCase();
          const isFlyingProbeApproved = ['approved', 'ready', 'completed'].includes(flyingProbeStatus);

          validationResults = {
            checklistComplete: isFlyingProbeChecklistComplete,
            qualityApproved: isFlyingProbeApproved,
          };
        } else if (currentStage === 'final_qc_pdir') {
          const finalChecklist = workOrder.finalQCPDIRChecklist || {};
          const finalSections = Object.values(finalChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isFinalChecklistComplete =
            finalSections.length > 0 &&
            finalSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const finalStatus = (workOrder.finalQCPDIRStatus?.state || '').toLowerCase();
          const isFinalApproved = ['approved', 'ready', 'completed'].includes(finalStatus);

          validationResults = {
            checklistComplete: isFinalChecklistComplete,
            qualityApproved: isFinalApproved,
          };
        } else if (currentStage === 'packing') {
          const packingChecklist = workOrder.packingChecklist || {};
          const packingSections = Object.values(packingChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isPackingChecklistComplete =
            packingSections.length > 0 &&
            packingSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const packingStatus = (workOrder.packingStatus?.state || '').toLowerCase();
          const isPackingApproved = ['approved', 'ready', 'completed'].includes(packingStatus);

          validationResults = {
            checklistComplete: isPackingChecklistComplete,
            qualityApproved: isPackingApproved,
          };
        } else if (currentStage === 'dispatch') {
          const dispatchChecklist = workOrder.dispatchChecklist || {};
          const dispatchSections = Object.values(dispatchChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isDispatchChecklistComplete =
            dispatchSections.length > 0 &&
            dispatchSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const dispatchStatus = (workOrder.dispatchStatus?.state || '').toLowerCase();
          const isDispatchApproved = ['approved', 'ready', 'completed'].includes(dispatchStatus);

          validationResults = {
            checklistComplete: isDispatchChecklistComplete,
            qualityApproved: isDispatchApproved,
          };
        } else if (currentStage === 'assembly_store') {
          const storeChecklist = workOrder.assemblyStoreChecklist || {};
          const storeSections = Object.values(storeChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isStoreChecklistComplete =
            storeSections.length > 0 &&
            storeSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const storeStatus = (workOrder.assemblyStoreStatus?.state || '').toLowerCase();
          const isStoreApproved = ['approved', 'ready', 'completed'].includes(storeStatus);

          validationResults = {
            checklistComplete: isStoreChecklistComplete,
            qualityApproved: isStoreApproved,
          };
        } else if (currentStage === 'stencil') {
          const stencilChecklist = workOrder.stencilChecklist || {};
          const stencilSections = Object.values(stencilChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isStencilChecklistComplete =
            stencilSections.length > 0 &&
            stencilSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const stencilStatus = (workOrder.stencilStatus?.state || '').toLowerCase();
          const isStencilApproved = ['approved', 'ready', 'completed'].includes(stencilStatus);

          validationResults = {
            checklistComplete: isStencilChecklistComplete,
            qualityApproved: isStencilApproved,
          };
        } else if (currentStage === 'assembly_reflow') {
          const reflowChecklist = workOrder.assemblyReflowChecklist || {};
          const reflowSections = Object.values(reflowChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isReflowChecklistComplete =
            reflowSections.length > 0 &&
            reflowSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const reflowStatus = (workOrder.assemblyReflowStatus?.state || '').toLowerCase();
          const isReflowApproved = ['approved', 'ready', 'completed'].includes(reflowStatus);

          validationResults = {
            checklistComplete: isReflowChecklistComplete,
            qualityApproved: isReflowApproved,
          };
        } else if (currentStage === 'th_soldering') {
          const thChecklist = workOrder.thSolderingChecklist || {};
          const thSections = Object.values(thChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isTHChecklistComplete =
            thSections.length > 0 &&
            thSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const thStatus = (workOrder.thSolderingStatus?.state || '').toLowerCase();
          const isTHApproved = ['approved', 'ready', 'completed'].includes(thStatus);

          validationResults = {
            checklistComplete: isTHChecklistComplete,
            qualityApproved: isTHApproved,
          };
        } else if (currentStage === 'visual_inspection') {
          const visualChecklist = workOrder.visualInspectionChecklist || {};
          const visualSections = Object.values(visualChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isVisualChecklistComplete =
            visualSections.length > 0 &&
            visualSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const visualStatus = (workOrder.visualInspectionStatus?.state || '').toLowerCase();
          const isVisualApproved = ['approved', 'ready', 'completed'].includes(visualStatus);

          validationResults = {
            checklistComplete: isVisualChecklistComplete,
            qualityApproved: isVisualApproved,
          };
        } else if (currentStage === 'ict') {
          const ictChecklist = workOrder.ictChecklist || {};
          const ictSections = Object.values(ictChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isICTChecklistComplete =
            ictSections.length > 0 &&
            ictSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const ictStatus = (workOrder.ictStatus?.state || '').toLowerCase();
          const isICTApproved = ['approved', 'ready', 'completed'].includes(ictStatus);

          validationResults = {
            checklistComplete: isICTChecklistComplete,
            qualityApproved: isICTApproved,
          };
        } else if (currentStage === 'flashing') {
          const flashingChecklist = workOrder.flashingChecklist || {};
          const flashingSections = Object.values(flashingChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isFlashingChecklistComplete =
            flashingSections.length > 0 &&
            flashingSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const flashingStatus = (workOrder.flashingStatus?.state || '').toLowerCase();
          const isFlashingApproved = ['approved', 'ready', 'completed'].includes(flashingStatus);

          validationResults = {
            checklistComplete: isFlashingChecklistComplete,
            qualityApproved: isFlashingApproved,
          };
        } else if (currentStage === 'functional_test') {
          const functionalChecklist = workOrder.functionalTestChecklist || {};
          const functionalSections = Object.values(functionalChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isFunctionalChecklistComplete =
            functionalSections.length > 0 &&
            functionalSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const functionalStatus = (workOrder.functionalTestStatus?.state || '').toLowerCase();
          const isFunctionalApproved = ['approved', 'ready', 'completed'].includes(functionalStatus);

          validationResults = {
            checklistComplete: isFunctionalChecklistComplete,
            qualityApproved: isFunctionalApproved,
          };
        } else if (currentStage === 'wire_harness_intake') {
          const intakeChecklist = workOrder.wireHarnessIntakeChecklist || {};
          const intakeSections = Object.values(intakeChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isIntakeChecklistComplete =
            intakeSections.length > 0 &&
            intakeSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const intakeStatus = (workOrder.wireHarnessIntakeStatus?.state || '').toLowerCase();
          const isIntakeApproved = ['approved', 'ready', 'completed'].includes(intakeStatus);

          const intakeDocuments = (workOrder.assemblyAttachments || []).filter(
            (att) => att && att.category === 'intake'
          );

          validationResults = {
            documentsReady: intakeDocuments.length > 0,
            checklistComplete: isIntakeChecklistComplete,
            qualityApproved: isIntakeApproved,
          };
        } else if (currentStage === 'wire_harness') {
          const harnessChecklist = workOrder.wireHarnessChecklist || {};
          const harnessSections = Object.values(harnessChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isHarnessChecklistComplete =
            harnessSections.length > 0 &&
            harnessSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const harnessStatus = (workOrder.wireHarnessStatus?.state || '').toLowerCase();
          const isHarnessApproved = ['approved', 'ready', 'completed'].includes(harnessStatus);

          validationResults = {
            checklistComplete: isHarnessChecklistComplete,
            qualityApproved: isHarnessApproved,
          };
        } else if (currentStage === 'wire_testing') {
          const wireTestChecklist = workOrder.wireTestingChecklist || {};
          const wireTestSections = Object.values(wireTestChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isWireTestChecklistComplete =
            wireTestSections.length > 0 &&
            wireTestSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const wireTestStatus = (workOrder.wireTestingStatus?.state || '').toLowerCase();
          const isWireTestApproved = ['approved', 'ready', 'completed'].includes(wireTestStatus);

          validationResults = {
            checklistComplete: isWireTestChecklistComplete,
            qualityApproved: isWireTestApproved,
          };
        } else if (currentStage === 'assembly_3d_printing') {
          const assembly3DPrintingChecklist = workOrder.assembly3DPrintingChecklist || {};
          const assembly3DPrintingSections = Object.values(assembly3DPrintingChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isAssembly3DPrintingChecklistComplete =
            assembly3DPrintingSections.length > 0 &&
            assembly3DPrintingSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const assembly3DPrintingStatus = (workOrder.assembly3DPrintingStatus?.state || '').toLowerCase();
          const isAssembly3DPrintingApproved = ['approved', 'ready', 'completed'].includes(assembly3DPrintingStatus);

          validationResults = {
            checklistComplete: isAssembly3DPrintingChecklistComplete,
            qualityApproved: isAssembly3DPrintingApproved,
          };
        } else if (currentStage === 'assembly_final_dispatch') {
          const finalDispatchChecklist = workOrder.assemblyFinalDispatchChecklist || {};
          const finalDispatchSections = Object.values(finalDispatchChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isFinalDispatchChecklistComplete =
            finalDispatchSections.length > 0 &&
            finalDispatchSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const finalDispatchStatus = (workOrder.assemblyFinalDispatchStatus?.state || '').toLowerCase();
          const isFinalDispatchApproved = ['approved', 'ready', 'completed'].includes(finalDispatchStatus);

          validationResults = {
            checklistComplete: isFinalDispatchChecklistComplete,
            qualityApproved: isFinalDispatchApproved,
          };
        } else if (currentStage === 'testing') {
          const testingChecklist = workOrder.testingChecklist || {};
          const testingSections = Object.values(testingChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isTestingChecklistComplete =
            testingSections.length > 0 &&
            testingSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const testingStatus = (workOrder.testingStatus?.state || '').toLowerCase();
          const isTestingApproved = ['approved', 'ready', 'completed'].includes(testingStatus);

          validationResults = {
            checklistComplete: isTestingChecklistComplete,
            qualityApproved: isTestingApproved,
          };
        } else if (currentStage === 'testing_review') {
          const reviewChecklist = workOrder.testingChecklist || {};
          const reviewSections = Object.values(reviewChecklist).filter(
            (section) => section && Array.isArray(section.items)
          );
          const isReviewChecklistComplete =
            reviewSections.length > 0 &&
            reviewSections.every((section) =>
              section.items.every((item) => item?.completed || item?.checked)
            );

          const reviewStatus = (workOrder.testingStatus?.state || '').toLowerCase();
          const isReviewApproved = ['approved', 'ready', 'completed'].includes(reviewStatus);

          validationResults = {
            checklistComplete: isReviewChecklistComplete,
            qualityApproved: isReviewApproved,
          };
        } else if (currentStage && currentStage.startsWith('3d_printing')) {
          validationResults = { ready: true };
        }

        setValidationResults(validationResults);
      } catch (err) {
        console.error('Validation error:', err);
      } finally {
        setLoading(false);
      }
    };

    validateReadiness();
  }, [workOrder, token, currentStage]);

  // Handle transfer to next stage
  const handleTransfer = async () => {
    if (!workOrder || !token) return;

    // Check if all validations pass
    const allValid = computeAllValid(validationResults);
    if (!allValid) {
      toast({
        title: 'Cannot transfer work order',
        description: 'Please complete all required steps before transferring.',
        variant: 'destructive',
      });
      return;
    }

    setTransferring(true);
    try {
      // Auto-release traveler before transfer if permission is available
      if (onTravelerAction && hasPermission && hasPermission('traveler:release')) {
        try {
          await onTravelerAction('release', workOrder, { boardContext: 'transfer' });
        } catch (travelerErr) {
          toast({
            title: 'Traveler release failed',
            description: 'Failed to release traveler before transfer. Continuing with transfer.',
            variant: 'destructive',
          });
        }
      }

      let updateData = {};
      let createDispatchPayload = null;

      if (currentStage === 'photo_imaging') {
        updateData = {
          stage: 'developer',
          photoImagingStatus: {
            ...workOrder.photoImagingStatus,
            state: 'approved',
            releasedAt: new Date().toISOString()
          },
          travelerReady: true
        };
      } else if (currentStage === 'developer') {
        updateData = {
          stage: 'etching',
          developerStatus: {
            ...workOrder.developerStatus,
            state: 'approved',
            releasedAt: new Date().toISOString()
          },
          travelerReady: true
        };
      } else if (currentStage === 'etching') {
        updateData = {
          stage: 'tin_stripping',
          etchingStatus: {
            ...workOrder.etchingStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'tin_strip' || currentStage === 'tin_stripping') {
        updateData = {
          stage: 'solder_mask',
          tinStrippingStatus: {
            ...workOrder.tinStrippingStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'solder_mask') {
        updateData = {
          stage: 'surface_finish',
          solderMaskStatus: {
            ...workOrder.solderMaskStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'surface_finish') {
        updateData = {
          stage: 'legend_print',
          surfaceFinishStatus: {
            ...workOrder.surfaceFinishStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'legend_print') {
        updateData = {
          stage: 'cnc_routing',
          legendPrintingStatus: {
            ...workOrder.legendPrintingStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'cnc_routing') {
        updateData = {
          stage: 'v_score',
          cncRoutingStatus: {
            ...workOrder.cncRoutingStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'v_score') {
        updateData = {
          stage: 'flying_probe',
          vScoringStatus: {
            ...workOrder.vScoringStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'flying_probe') {
        updateData = {
          stage: 'final_qc_pdir',
          flyingProbeStatus: {
            ...workOrder.flyingProbeStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'final_qc_pdir') {
        updateData = {
          stage: nextStage,
          finalQCPDIRStatus: {
            ...workOrder.finalQCPDIRStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'packing') {
        updateData = {
          stage: 'dispatch',
          packingStatus: {
            ...workOrder.packingStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'dispatch') {
        updateData = {
          stage: 'shipping',
          dispatchStatus: {
            ...workOrder.dispatchStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_intake') {
        const now = new Date().toISOString();
        updateData = {
          stage: '3d_printing_file_prep',
          threeDPrintingIntakeStatus: {
            ...workOrder.threeDPrintingIntakeStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingFilePrepStatus: {
            ...workOrder.threeDPrintingFilePrepStatus,
            state: workOrder.threeDPrintingFilePrepStatus?.state || 'pending',
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'in_review',
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_file_prep') {
        const now = new Date().toISOString();
        updateData = {
          stage: '3d_printing_slicing',
          threeDPrintingFilePrepStatus: {
            ...workOrder.threeDPrintingFilePrepStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingSlicingStatus: {
            ...workOrder.threeDPrintingSlicingStatus,
            state: workOrder.threeDPrintingSlicingStatus?.state || 'pending',
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'in_review',
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_slicing') {
        const now = new Date().toISOString();
        updateData = {
          stage: '3d_printing_active',
          threeDPrintingSlicingStatus: {
            ...workOrder.threeDPrintingSlicingStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingActiveStatus: {
            ...workOrder.threeDPrintingActiveStatus,
            state: workOrder.threeDPrintingActiveStatus?.state || 'pending',
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'in_review',
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_active') {
        const now = new Date().toISOString();
        updateData = {
          stage: '3d_printing_post_processing',
          threeDPrintingActiveStatus: {
            ...workOrder.threeDPrintingActiveStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingPostProcessingStatus: {
            ...workOrder.threeDPrintingPostProcessingStatus,
            state: workOrder.threeDPrintingPostProcessingStatus?.state || 'pending',
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'in_review',
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_post_processing') {
        const now = new Date().toISOString();
        updateData = {
          stage: '3d_printing_qc',
          threeDPrintingPostProcessingStatus: {
            ...workOrder.threeDPrintingPostProcessingStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingQcStatus: {
            ...workOrder.threeDPrintingQcStatus,
            state: workOrder.threeDPrintingQcStatus?.state || 'pending',
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'in_review',
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_qc') {
        const now = new Date().toISOString();
        updateData = {
          stage: '3d_printing_dispatch',
          threeDPrintingQcStatus: {
            ...workOrder.threeDPrintingQcStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingDispatchStatus: {
            ...workOrder.threeDPrintingDispatchStatus,
            state: workOrder.threeDPrintingDispatchStatus?.state || 'pending',
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === '3d_printing_dispatch') {
        const now = new Date().toISOString();
        updateData = {
          threeDPrintingDispatchStatus: {
            ...workOrder.threeDPrintingDispatchStatus,
            state: 'approved',
            releasedAt: now,
            lastReviewedAt: now,
          },
          threeDPrintingStatus: {
            ...workOrder.threeDPrintingStatus,
            state: 'approved',
            releasedAt: workOrder.threeDPrintingStatus?.releasedAt || now,
            lastReviewedAt: now,
          },
          travelerReady: true,
        };
        createDispatchPayload = {
          workOrder: workOrder._id || workOrder.id,
          stage: '3d_printing_dispatch',
          releasedAt: now,
          notes: `3D printing dispatch for ${workOrder.woNumber}`,
          tags: ['3d_printing'],
          priority: workOrder.priority || 'normal',
          items: [
            {
              part: workOrder.product || '3D PRINT',
              name: workOrder.product || '3D Printed Lot',
              description: `3D printing dispatch for ${workOrder.woNumber}`,
              quantity: workOrder.quantity || 1,
            },
          ],
        };
      } else if (currentStage === 'assembly_store') {
        // Trigger automatic assembly card generation on transfer to stencil
        try {
          await api.generateAssemblyCard(token, workOrder._id || workOrder.id);
        } catch (err) {
          console.error('Failed to generate assembly card:', err);
          // Continue with transfer even if card generation fails
        }

        updateData = {
          stage: 'stencil',
          assemblyStoreStatus: {
            ...workOrder.assemblyStoreStatus,
            state: 'approved',
            releasedAt: new Date().toISOString(),
          },
          travelerReady: true,
        };
      } else if (currentStage === 'stencil') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'assembly_reflow',
          stencilStatus: {
            ...workOrder.stencilStatus,
            state: 'approved',
            releasedAt: now,
          },
          assemblyReflowStatus: {
            ...workOrder.assemblyReflowStatus,
            state: workOrder.assemblyReflowStatus?.state || 'pending',
            startedAt: workOrder.assemblyReflowStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'assembly_reflow') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'th_soldering',
          assemblyReflowStatus: {
            ...workOrder.assemblyReflowStatus,
            state: 'approved',
            releasedAt: now,
          },
          thSolderingStatus: {
            ...workOrder.thSolderingStatus,
            state: workOrder.thSolderingStatus?.state || 'pending',
            startedAt: workOrder.thSolderingStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'th_soldering') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'visual_inspection',
          thSolderingStatus: {
            ...workOrder.thSolderingStatus,
            state: 'approved',
            releasedAt: now,
          },
          visualInspectionStatus: {
            ...workOrder.visualInspectionStatus,
            state: workOrder.visualInspectionStatus?.state || 'pending',
            startedAt: workOrder.visualInspectionStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'visual_inspection') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'ict',
          visualInspectionStatus: {
            ...workOrder.visualInspectionStatus,
            state: 'approved',
            releasedAt: now,
          },
          ictStatus: {
            ...workOrder.ictStatus,
            state: workOrder.ictStatus?.state || 'pending',
            startedAt: workOrder.ictStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'ict') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'flashing',
          ictStatus: {
            ...workOrder.ictStatus,
            state: 'approved',
            releasedAt: now,
          },
          flashingStatus: {
            ...workOrder.flashingStatus,
            state: workOrder.flashingStatus?.state || 'pending',
            startedAt: workOrder.flashingStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'flashing') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'functional_test',
          flashingStatus: {
            ...workOrder.flashingStatus,
            state: 'approved',
            releasedAt: now,
          },
          functionalTestStatus: {
            ...workOrder.functionalTestStatus,
            state: workOrder.functionalTestStatus?.state || 'pending',
            startedAt: workOrder.functionalTestStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'functional_test') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'wire_harness_intake',
          functionalTestStatus: {
            ...workOrder.functionalTestStatus,
            state: 'approved',
            releasedAt: now,
          },
          wireHarnessIntakeStatus: {
            ...workOrder.wireHarnessIntakeStatus,
            state: workOrder.wireHarnessIntakeStatus?.state || 'pending',
            startedAt: workOrder.wireHarnessIntakeStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'wire_harness_intake') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'wire_harness',
          wireHarnessIntakeStatus: {
            ...workOrder.wireHarnessIntakeStatus,
            state: 'approved',
            releasedAt: now,
          },
          wireHarnessStatus: {
            ...workOrder.wireHarnessStatus,
            state: workOrder.wireHarnessStatus?.state || 'pending',
            startedAt: workOrder.wireHarnessStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'wire_harness') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'wire_testing',
          wireHarnessStatus: {
            ...workOrder.wireHarnessStatus,
            state: 'approved',
            releasedAt: now,
          },
          wireTestingStatus: {
            ...workOrder.wireTestingStatus,
            state: workOrder.wireTestingStatus?.state || 'pending',
            startedAt: workOrder.wireTestingStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'testing') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'testing_dispatch',
          testingStatus: {
            ...workOrder.testingStatus,
            state: 'approved',
            releasedAt: now,
          },
          testingDispatchStatus: {
            ...workOrder.testingDispatchStatus,
            state: 'pending',
            startedAt: now,
            updatedAt: now,
          },
          travelerReady: true,
        };
        createDispatchPayload = {
          workOrder: workOrder._id || workOrder.id,
          stage: 'testing_dispatch',
          releasedAt: now,
          notes: `Testing dispatch for ${workOrder.woNumber}`,
          tags: ['testing'],
          priority: workOrder.priority || 'normal',
          items: [
            {
              part: workOrder.product || 'TESTING',
              name: workOrder.product || 'Testing Lot',
              description: `Testing dispatch for ${workOrder.woNumber}`,
              quantity: workOrder.quantity || 1,
            },
          ],
        };
      } else if (currentStage === 'wire_testing') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'wire_harness_dispatch',
          wireTestingStatus: {
            ...workOrder.wireTestingStatus,
            state: 'approved',
            releasedAt: now,
          },
          wireHarnessDispatchStatus: {
            ...workOrder.wireHarnessDispatchStatus,
            state: workOrder.wireHarnessDispatchStatus?.state || 'pending',
            startedAt: workOrder.wireHarnessDispatchStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'wire_harness_dispatch') {
        const now = new Date().toISOString();
        updateData = {
          wireHarnessDispatchStatus: {
            ...workOrder.wireHarnessDispatchStatus,
            state: 'approved',
            releasedAt: now,
            updatedAt: now,
          },
          travelerReady: true,
        };
        createDispatchPayload = {
          workOrder: workOrder._id || workOrder.id,
          stage: 'wire_harness_dispatch',
          releasedAt: now,
          notes: `Harness dispatch for ${workOrder.woNumber}`,
          tags: ['wire_harness'],
          priority: workOrder.priority || 'normal',
          items: [
            {
              part: workOrder.product || 'WIRE_HARNESS',
              name: workOrder.product || 'Wire Harness Assembly',
              description: `Wire harness dispatch for ${workOrder.woNumber}`,
              quantity: workOrder.quantity || 1,
            },
          ],
        };
      } else if (currentStage === 'testing_review') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'testing_dispatch',
          testingStatus: {
            ...workOrder.testingStatus,
            state: 'approved',
            releasedAt: now,
          },
          testingDispatchStatus: {
            ...workOrder.testingDispatchStatus,
            state: 'pending',
            startedAt: now,
            updatedAt: now,
          },
          travelerReady: true,
        };
        createDispatchPayload = {
          workOrder: workOrder._id || workOrder.id,
          stage: 'testing_dispatch',
          releasedAt: now,
          notes: `Testing dispatch for ${workOrder.woNumber}`,
          tags: ['testing'],
          priority: workOrder.priority || 'normal',
          items: [
            {
              part: workOrder.product || 'TESTING',
              name: workOrder.product || 'Testing Lot',
              description: `Testing dispatch for ${workOrder.woNumber}`,
              quantity: workOrder.quantity || 1,
            },
          ],
        };
      } else if (currentStage === 'assembly_3d_printing') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'assembly_final_dispatch',
          assembly3DPrintingStatus: {
            ...workOrder.assembly3DPrintingStatus,
            state: 'approved',
            releasedAt: now,
          },
          assemblyFinalDispatchStatus: {
            ...workOrder.assemblyFinalDispatchStatus,
            state: workOrder.assemblyFinalDispatchStatus?.state || 'pending',
            startedAt: workOrder.assemblyFinalDispatchStatus?.startedAt || now,
            updatedAt: now,
          },
          travelerReady: true,
        };
      } else if (currentStage === 'assembly_final_dispatch') {
        const now = new Date().toISOString();
        updateData = {
          stage: 'shipping',
          assemblyFinalDispatchStatus: {
            ...workOrder.assemblyFinalDispatchStatus,
            state: 'approved',
            releasedAt: now,
          },
          travelerReady: true,
        };
        // Send notification to admin dispatch page
        try {
          const dispatchPayload = {
            workOrderId: workOrder._id || workOrder.id,
            woNumber: workOrder.woNumber,
            customer: workOrder.customer,
            product: workOrder.product,
            quantity: workOrder.quantity,
            priority: workOrder.priority,
            stage: 'assembly_final_dispatch',
            status: 'pending',
            notes: 'Transferred from final assembly dispatch',
            releasedAt: now,
            items: [
              {
                part: workOrder.product || 'ASSEMBLY',
                name: workOrder.product || 'Assembled Product',
                description: `Final assembly dispatch for ${workOrder.woNumber}`,
                quantity: workOrder.quantity || 1,
                assemblyType: 'store',
              },
            ],
          };
          console.log('Creating dispatch with payload:', dispatchPayload);
          const dispatchResponse = await api.mfgCreateDispatch(token, dispatchPayload);
          console.log('Assembly dispatch created successfully:', dispatchResponse);
        } catch (dispatchErr) {
          console.error('Failed to create dispatch record:', dispatchErr);
          toast({
            title: 'Dispatch creation failed',
            description: 'Work order transferred but dispatch record creation failed. Please contact admin.',
            variant: 'destructive',
          });
          // Continue with transfer even if dispatch creation fails
        }
      }

      // Update work order stage and status
      await api.mfgUpdateWorkOrder(token, workOrder._id || workOrder.id, updateData);

      if (createDispatchPayload) {
        try {
          console.log('Creating 3D printing dispatch with payload:', createDispatchPayload);
          const dispatchResponse = await api.mfgCreateDispatch(token, createDispatchPayload);
          console.log('3D printing dispatch created successfully:', dispatchResponse);
        } catch (dispatchErr) {
          console.error('Failed to create 3D printing dispatch record:', dispatchErr);
          toast({
            title: 'Dispatch creation failed',
            description: 'Dispatch stage updated but dispatch record creation failed. Contact admin.',
            variant: 'destructive',
          });
        }
      }

      const stageNames = {
        developer: 'developer station',
        etching: 'etching station',
        tin_strip: 'tin stripping station',
        tin_stripping: 'tin stripping station',
        solder_mask: 'solder mask station',
        surface_finish: 'surface finish station',
        legend_print: 'legend printing station',
        cnc_routing: 'CNC routing station',
        v_score: 'V-scoring station',
        flying_probe: 'flying probe station',
        final_qc_pdir: 'Final QC station',
        packing: 'packaging station',
        dispatch: 'dispatch station',
        '3d_printing_intake': '3D printing intake station',
        '3d_printing_file_prep': '3D file preparation station',
        '3d_printing_slicing': '3D slicing station',
        '3d_printing_active': '3D printing station',
        '3d_printing_post_processing': '3D post-processing station',
        '3d_printing_qc': '3D printing QC station',
        '3d_printing_dispatch': '3D printing dispatch station',
        assembly_store: 'assembly store issue station',
        stencil: 'stencil station',
        assembly_reflow: 'assembly reflow station',
        th_soldering: 'TH soldering station',
        visual_inspection: 'visual inspection station',
        ict: 'ICT station',
        flashing: 'flashing station',
        functional_test: 'functional test station',
        wire_harness_intake: 'wire harness intake station',
        wire_harness: 'wire harness station',
        wire_testing: 'wire testing station',
        wire_harness_dispatch: 'wire harness dispatch station',
        assembly_3d_printing: 'assembly 3D printing station',
        assembly_final_dispatch: 'final QC & dispatch station',
        shipping: 'shipping station',
      };

      toast({
        title: 'Work order transferred',
        description: `Work order ${workOrder.woNumber} has been transferred to the ${stageNames[nextStage] || nextStage}.`,
      });

      onTransfer?.();

      // Do not redirect after a proceed action; stay on the current dashboard
      // Navigation was removed to avoid unexpected page changes when operators click Proceed.
    } catch (err) {
      toast({
        title: 'Transfer failed',
        description: err?.message || 'Unable to transfer work order.',
        variant: 'destructive',
      });
    } finally {
      setTransferring(false);
    }
  };

  // Get validation status
  const getValidationStatus = (key) => {
    const result = validationResults[key];
    return {
      icon: result ? CheckCircle : AlertTriangle,
      color: result ? 'text-green-500' : 'text-yellow-500',
      text: result ? 'Complete' : 'Pending'
    };
  };

  const allValid = computeAllValid(validationResults);

  const stageTitles = {
    photo_imaging: 'Transfer to Developer Dashboard',
    developer: 'Transfer to Etching Station',
    etching: 'Transfer to Tin Stripping Station',
    tin_strip: 'Transfer to Solder Mask Station',
    tin_stripping: 'Transfer to Solder Mask Station',
    solder_mask: 'Transfer to Surface Finish Station',
    surface_finish: 'Transfer to Legend Printing Station',
    legend_print: 'Transfer to CNC Routing Station',
    cnc_routing: 'Transfer to V-Scoring Station',
    v_score: 'Transfer to Flying Probe Testing',
    flying_probe: 'Transfer to Final QC PDIR',
    final_qc_pdir: 'Transfer to Packaging',
    packing: 'Transfer to Dispatch',
    dispatch: 'Transfer to Shipping',
    '3d_printing_intake': 'Transfer to File Preparation',
    '3d_printing_file_prep': 'Transfer to Slicing Setup',
    '3d_printing_slicing': 'Transfer to Active Printing',
    '3d_printing_active': 'Transfer to Post-Processing',
    '3d_printing_post_processing': 'Transfer to Quality Control',
    '3d_printing_qc': 'Transfer to Dispatch',
    '3d_printing_dispatch': 'Finalize 3D Printing Dispatch',
    assembly_store: 'Transfer to Stencil Printer',
    stencil: 'Transfer to Assembly Reflow',
    assembly_reflow: 'Transfer to TH Soldering',
    th_soldering: 'Transfer to Visual Inspection',
    visual_inspection: 'Transfer to ICT',
    ict: 'Transfer to Flashing Station',
    flashing: 'Transfer to Functional Test',
    functional_test: 'Transfer to Wire Harness Intake',
    wire_harness_intake: 'Transfer to Wire Harness Station',
    wire_harness: 'Transfer to Wire Testing',
    wire_testing: 'Transfer to Harness Dispatch',
    wire_harness_dispatch: 'Finalize Harness Dispatch',
    testing: 'Transfer to Testing Dispatch',
    testing_review: 'Transfer to Testing Dispatch',
    assembly_3d_printing: 'Transfer to Final QC & Dispatch',
    assembly_final_dispatch: 'Transfer to Shipping',
  };

  const stageDescriptions = {
    photo_imaging: 'Transfer work order {workOrder.woNumber} to the developer station for chemical processing.',
    developer: 'Transfer work order {workOrder.woNumber} to the etching station for copper etching.',
    etching: 'Transfer work order {workOrder.woNumber} to the tin stripping station for resist removal.',
    tin_strip: 'Transfer work order {workOrder.woNumber} to the solder mask station for coating application.',
    tin_stripping: 'Transfer work order {workOrder.woNumber} to the solder mask station for coating application.',
    solder_mask: 'Transfer work order {workOrder.woNumber} to the surface finish station for final finishing.',
    surface_finish: 'Transfer work order {workOrder.woNumber} to the legend printing station for overlay application.',
    legend_print: 'Transfer work order {workOrder.woNumber} to the CNC routing station for final profiling.',
    cnc_routing: 'Transfer work order {workOrder.woNumber} to the V-scoring station for panel separation.',
    v_score: 'Transfer work order {workOrder.woNumber} to flying probe testing for electrical validation.',
    flying_probe: 'Transfer work order {workOrder.woNumber} to Final QC PDIR for closing inspection.',
    final_qc_pdir: 'Transfer work order {workOrder.woNumber} to packaging for shipment preparation.',
    packing: 'Transfer work order {workOrder.woNumber} to dispatch for outbound logistics.',
    dispatch: 'Transfer work order {workOrder.woNumber} to shipping for fulfilment.',
    '3d_printing_intake': 'Transfer work order {workOrder.woNumber} to file preparation for slicing assets.',
    '3d_printing_file_prep': 'Transfer work order {workOrder.woNumber} to slicing for build preparation.',
    '3d_printing_slicing': 'Transfer work order {workOrder.woNumber} to active printing for production.',
    '3d_printing_active': 'Transfer work order {workOrder.woNumber} to post-processing for finishing.',
    '3d_printing_post_processing': 'Transfer work order {workOrder.woNumber} to 3D QC for inspections.',
    '3d_printing_qc': 'Transfer work order {workOrder.woNumber} to dispatch for logistics hand-off.',
    '3d_printing_dispatch': 'Confirm dispatch for work order {workOrder.woNumber} and notify admin logistics.',
    assembly_store: 'Transfer work order {workOrder.woNumber} to the stencil printer for paste application.',
    stencil: 'Transfer work order {workOrder.woNumber} to reflow for soldering operations.',
    assembly_reflow: 'Transfer work order {workOrder.woNumber} to TH soldering for manual operations.',
    th_soldering: 'Transfer work order {workOrder.woNumber} to visual inspection for quality checks.',
    visual_inspection: 'Transfer work order {workOrder.woNumber} to ICT for electrical testing.',
    ict: 'Transfer work order {workOrder.woNumber} to the flashing station for firmware loading.',
    flashing: 'Transfer work order {workOrder.woNumber} to functional test for validation.',
    functional_test: 'Transfer work order {workOrder.woNumber} to wire harness intake for traveler release.',
    wire_harness_intake: 'Transfer work order {workOrder.woNumber} to wire harness station for assembly.',
    wire_harness: 'Transfer work order {workOrder.woNumber} to wire testing for verification.',
    wire_testing: 'Transfer work order {workOrder.woNumber} to harness dispatch for logistics packaging.',
    wire_harness_dispatch: 'Confirm harness dispatch documentation for work order {workOrder.woNumber} and notify logistics.',
    testing: 'Transfer work order {workOrder.woNumber} to testing dispatch for logistics hand-off.',
    testing_review: 'Transfer work order {workOrder.woNumber} to testing dispatch for logistics hand-off.',
    assembly_3d_printing: 'Transfer work order {workOrder.woNumber} to final QC & dispatch for packaging and release.',
    assembly_final_dispatch: 'Transfer work order {workOrder.woNumber} to shipping for delivery.',
  };

  const currentStageName = {
    photo_imaging: 'Photo Imaging',
    developer: 'Developer',
    etching: 'Etching',
    tin_strip: 'Tin Stripping',
    tin_stripping: 'Tin Stripping',
    solder_mask: 'Solder Mask',
    surface_finish: 'Surface Finish',
    legend_print: 'Legend Printing',
    cnc_routing: 'CNC Routing',
    v_score: 'V-Scoring',
    flying_probe: 'Flying Probe Testing',
    final_qc_pdir: 'Final QC (PDIR)',
    packing: 'Packing',
    dispatch: 'Dispatch',
    '3d_printing_intake': '3D Printing Intake',
    '3d_printing_file_prep': '3D File Preparation',
    '3d_printing_slicing': '3D Slicing Setup',
    '3d_printing_active': 'Active 3D Printing',
    '3d_printing_post_processing': '3D Post-Processing',
    '3d_printing_qc': '3D Quality Control',
    '3d_printing_dispatch': '3D Printing Dispatch',
    assembly_store: 'Assembly Store Issue',
    stencil: 'Stencil',
    assembly_reflow: 'Assembly Reflow',
    th_soldering: 'TH Soldering',
    visual_inspection: 'Visual Inspection',
    ict: 'ICT',
    flashing: 'Flashing',
    functional_test: 'Functional Test',
    wire_harness_intake: 'Wire Harness Intake',
    wire_harness: 'Wire Harness',
    wire_testing: 'Wire Testing',
    wire_harness_dispatch: 'Harness Dispatch',
    testing: 'Testing',
    testing_review: 'Testing Review',
    testing_dispatch: 'Testing Dispatch',
    shipping: 'Shipping',
    assembly_3d_printing: 'Assembly 3D Printing & Fixtures',
    assembly_final_dispatch: 'Final QC & Dispatch',
  };

  const nextStageName = {
    developer: 'Developer',
    etching: 'Etching',
    tin_strip: 'Tin Stripping',
    tin_stripping: 'Tin Stripping',
    solder_mask: 'Solder Mask',
    surface_finish: 'Surface Finish',
    legend_print: 'Legend Printing',
    cnc_routing: 'CNC Routing',
    v_score: 'V-Scoring',
    flying_probe: 'Flying Probe Testing',
    final_qc_pdir: 'Final QC (PDIR)',
    packing: 'Dispatch',
    dispatch: 'Shipping',
    '3d_printing_intake': 'File Preparation',
    '3d_printing_file_prep': 'Slicing Setup',
    '3d_printing_slicing': 'Active Printing',
    '3d_printing_active': 'Post-Processing',
    '3d_printing_post_processing': 'Quality Control',
    '3d_printing_qc': '3D Printing Dispatch',
    '3d_printing_dispatch': 'Shipping',
    assembly_store: 'Stencil',
    stencil: 'Assembly Reflow',
    assembly_reflow: 'TH Soldering',
    th_soldering: 'Visual Inspection',
    visual_inspection: 'ICT',
    ict: 'Flashing',
    flashing: 'Functional Test',
    functional_test: 'Wire Harness Intake',
    wire_harness_intake: 'Wire Harness',
    wire_harness: 'Wire Testing',
    wire_testing: 'Harness Dispatch',
    wire_harness_dispatch: 'Shipping',
    testing: 'Testing Dispatch',
    assembly_3d_printing: 'Final QC & Dispatch',
    assembly_final_dispatch: 'Shipping',
  };

  const checklistDescriptions = {
    photo_imaging: 'All setup, imaging, development, and quality checks completed',
    developer: 'All developer setup, processing, and quality checks completed',
    etching: 'All etching setup, processing, and quality checks completed',
    tin_strip: 'All tin stripping checklist items completed',
    tin_stripping: 'All tin stripping checklist items completed',
    solder_mask: 'All solder mask coating, curing, and inspection steps completed',
    surface_finish: 'All surface finish preparation, processing, and inspections completed',
    legend_print: 'All legend printing, curing, and inspection steps completed',
    cnc_routing: 'All routing inspections and documentation completed',
    v_score: 'All scoring operations completed and documented',
    flying_probe: 'All electrical tests executed and logged',
    final_qc_pdir: 'All final QC PDIR checks completed',
    packing: 'All packing, labeling, and ESD tasks completed',
    dispatch: 'Dispatch documentation and logistics tasks completed',
    '3d_printing_intake': 'Intake audit and readiness checks completed',
    '3d_printing_file_prep': 'File preparation tasks completed and verified',
    '3d_printing_slicing': 'Slicing configurations reviewed and approved',
    '3d_printing_active': 'Active print monitoring and logs reviewed',
    '3d_printing_post_processing': 'Post-processing and finishing checklist completed',
    '3d_printing_qc': '3D print dimensional and quality checks completed',
    '3d_printing_dispatch': 'Dispatch packaging, labeling, and documentation completed',
    assembly_store: 'All component issue and line transfer tasks completed',
    stencil: 'Stencil setup and printing tasks completed',
    assembly_reflow: 'Reflow processing and QC tasks completed',
    th_soldering: 'Through-hole soldering and QC tasks completed',
    visual_inspection: 'Visual inspection tasks completed',
    ict: 'ICT testing tasks completed',
    flashing: 'Firmware flashing tasks completed',
    functional_test: 'Functional test tasks completed',
    wire_harness_intake: 'Wire harness intake tasks completed',
    wire_harness: 'Wire harness assembly tasks completed',
    wire_testing: 'Wire testing tasks completed',
    wire_harness_dispatch: 'Harness dispatch packaging and paperwork completed',
    testing: 'All testing operations and quality checks completed',
    assembly_3d_printing: 'Assembly 3D printing checklist completed',
    assembly_final_dispatch: 'Final QC verification and dispatch paperwork completed',
  };

  const parametersTitleByStage = {
    photo_imaging: 'Imaging Parameters Set',
    developer: 'Developer Parameters Set',
    etching: 'Etching Parameters Set',
  };

  const parametersDescriptionByStage = {
    photo_imaging: 'Exposure, development, and equipment parameters configured',
    developer: 'Developer solution, temperature, and timing parameters configured',
    etching: 'Etching chemistry, dwell time, and line parameters configured',
  };

  if (!workOrder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{stageTitles[currentStage] || 'Transfer Work Order'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a work order to transfer to the next station.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            {stageTitles[currentStage] || 'Transfer Work Order'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {stageDescriptions[currentStage]?.replace('{workOrder.woNumber}', workOrder.woNumber) || `Transfer work order ${workOrder.woNumber} to the next station.`}
          </p>
        </CardHeader>
      </Card>

      {/* Validation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer Readiness Check</CardTitle>
          <p className="text-sm text-muted-foreground">
            All items must be completed before transferring the work order.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">Checking readiness...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentStage === 'photo_imaging' && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className={`h-5 w-5 ${getValidationStatus('filesUploaded').color}`} />
                  <div className="flex-1">
                    <div className="font-medium">Required Files Uploaded</div>
                    <div className="text-sm text-muted-foreground">
                      Gerber files and job card must be available
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getValidationStatus('filesUploaded').color}`}>
                    {getValidationStatus('filesUploaded').text}
                  </span>
                </div>
              )}

              {'parametersSet' in validationResults && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Settings className={`h-5 w-5 ${getValidationStatus('parametersSet').color}`} />
                  <div className="flex-1">
                    <div className="font-medium">
                      {parametersTitleByStage[currentStage] || 'Process Parameters Set'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {parametersDescriptionByStage[currentStage] ||
                        'Process parameters configured for this station'}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getValidationStatus('parametersSet').color}`}>
                    {getValidationStatus('parametersSet').text}
                  </span>
                </div>
              )}

              {'documentsReady' in validationResults && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className={`h-5 w-5 ${getValidationStatus('documentsReady').color}`} />
                  <div className="flex-1">
                    <div className="font-medium">Intake Documents Received</div>
                    <div className="text-sm text-muted-foreground">
                      Harness drawings, traveler packets, and intake approvals uploaded
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getValidationStatus('documentsReady').color}`}>
                    {getValidationStatus('documentsReady').text}
                  </span>
                </div>
              )}

              {'checklistComplete' in validationResults && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckSquare className={`h-5 w-5 ${getValidationStatus('checklistComplete').color}`} />
                  <div className="flex-1">
                    <div className="font-medium">Quality Checklist Complete</div>
                    <div className="text-sm text-muted-foreground">
                      {checklistDescriptions[currentStage] ||
                        'All required checklist items completed'}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getValidationStatus('checklistComplete').color}`}>
                    {getValidationStatus('checklistComplete').text}
                  </span>
                </div>
              )}

              {'qualityApproved' in validationResults && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle className={`h-5 w-5 ${getValidationStatus('qualityApproved').color}`} />
                  <div className="flex-1">
                    <div className="font-medium">Quality Approved</div>
                    <div className="text-sm text-muted-foreground">
                      Work order has passed final quality inspection
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getValidationStatus('qualityApproved').color}`}>
                    {getValidationStatus('qualityApproved').text}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Work Order:</span> {workOrder.woNumber}
              </div>
              <div>
                <span className="font-medium">Product:</span> {workOrder.product}
              </div>
              <div>
                <span className="font-medium">Current Stage:</span> {currentStageName[currentStage] || currentStage}
              </div>
              <div>
                <span className="font-medium">Next Stage:</span> {nextStageName[nextStage] || nextStage}
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Ready to transfer to {nextStageName[nextStage] || nextStage} Station
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {currentStage === 'photo_imaging'
                  ? 'The panel will proceed to chemical development and etching processes.'
                  : currentStage === 'tin_strip'
                  ? 'The panel will proceed to solder mask application and curing.'
                  : currentStage === 'solder_mask'
                  ? 'The panel will proceed to surface finish preparation and final cure.'
                  : currentStage === 'surface_finish'
                  ? 'The panel will move forward to legend printing setup and production.'
                  : currentStage === 'legend_print'
                  ? 'The panel will continue to CNC routing for final profiling.'
                  : currentStage === 'cnc_routing'
                  ? 'The panel will proceed to V-scoring for separation.'
                  : currentStage === 'v_score'
                  ? 'The panel will proceed to flying probe electrical testing.'
                  : currentStage === 'flying_probe'
                  ? 'The panel will advance to Final QC PDIR verification.'
                  : currentStage === 'final_qc_pdir'
                  ? 'The panel will proceed to packaging for shipment preparation.'
                  : currentStage === 'packing'
                  ? 'The shipment will proceed to dispatch staging.'
                  : currentStage === 'dispatch'
                  ? 'The shipment will proceed to outbound shipping.'
                  : currentStage === 'assembly_store'
                  ? 'Components will move to stencil printing for paste application.'
                  : currentStage === 'stencil'
                  ? 'Assemblies will move to reflow soldering.'
                  : currentStage === 'assembly_reflow'
                  ? 'Boards will advance to through-hole soldering.'
                  : currentStage === 'th_soldering'
                  ? 'Boards will proceed to visual inspection.'
                  : currentStage === 'visual_inspection'
                  ? 'Units will proceed to ICT electrical testing.'
                  : currentStage === 'ict'
                  ? 'Units will proceed to the flashing station.'
                  : currentStage === 'flashing'
                  ? 'Units will proceed to functional testing.'
                  : currentStage === 'functional_test'
                  ? 'Units will proceed to wire harness intake.'
                  : currentStage === 'wire_harness_intake'
                  ? 'Units will proceed to wire harness assembly.'
                  : currentStage === 'wire_harness'
                  ? 'Harnesses will proceed to electrical wire testing.'
                  : currentStage === 'wire_testing'
                  ? 'Units will transition to shipping for delivery.'
                  : currentStage === 'testing'
                  ? 'The work order will proceed to testing dispatch for logistics hand-off.'
                  : 'The panel will proceed to copper etching processes.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Action */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Transfer Work Order</h3>
              <p className="text-sm text-muted-foreground">
                Move this work order to the {nextStageName[nextStage] || nextStage} station for processing.
              </p>
            </div>
            <Button
              onClick={handleTransfer}
              disabled={!allValid || transferring || loading || (workOrder?.stage && workOrder.stage !== currentStage)}
              size="lg"
              className="min-w-[150px]"
            >
              {transferring ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer Now
                </>
              )}
            </Button>
          </div>

          {/* Show message if work order has already been transferred */}
          {workOrder?.stage && workOrder.stage !== currentStage && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  This work order has already been transferred to the {nextStageName[workOrder?.stage] || workOrder?.stage} station.
                </span>
              </div>
            </div>
          )}

          {!allValid && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Cannot transfer - incomplete requirements
                </span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Please complete all checklist items before transferring.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferView;
