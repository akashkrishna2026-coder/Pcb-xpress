import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, ThermometerSun, Timer } from 'lucide-react';

const statusBadge = (state) => {
  switch ((state || '').toLowerCase()) {
    case 'completed':
    case 'approved':
      return 'bg-green-100 text-green-700 border border-green-200';
    case 'in_progress':
    case 'running':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'blocked':
    case 'hold':
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  return dt.toLocaleString();
};

const ReflowLogsPanel = ({ selectedWorkOrder, handleDownload }) => {
  if (!selectedWorkOrder) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground bg-white">
        Select a work order to review reflow run history and reports.
      </div>
    );
  }

  const attachments = Array.isArray(selectedWorkOrder.assemblyAttachments)
    ? selectedWorkOrder.assemblyAttachments
    : [];

  const reflowReports = useMemo(
    () =>
      attachments.filter((att) =>
        ['reflow_report', 'reflow_profile', 'excel_report'].includes(att.kind)
      ),
    [attachments]
  );

  const bomFiles = useMemo(
    () => attachments.filter((att) => att.kind === 'bom'),
    [attachments]
  );

  const reflowParams = selectedWorkOrder.assemblyReflowParams || {};
  const recordedRuns = Array.isArray(reflowParams.runs) ? reflowParams.runs : [];
  const derivedRuns =
    recordedRuns.length > 0
      ? recordedRuns
      : [
          {
            runId: `${selectedWorkOrder.woNumber || 'WO'}-R1`,
            startTime: selectedWorkOrder.stencilStatus?.releasedAt || selectedWorkOrder.stencilStatus?.updatedAt,
            completedTime: selectedWorkOrder.assemblyReflowStatus?.updatedAt,
            peakTemp: reflowParams.peakTemp,
            conveyorSpeed: reflowParams.conveyorSpeed,
            profileName: reflowParams.profileName || 'Lead-free Default',
            status: selectedWorkOrder.assemblyReflowStatus?.state || 'pending',
          },
        ];

  const zoneTargets = Array.isArray(reflowParams.zones)
    ? reflowParams.zones
    : Object.entries(reflowParams.zones || {}).map(([zone, target]) => ({ zone, target }));

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Reflow Process Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Profile Name</p>
            <p className="font-medium">{reflowParams.profileName || 'Lead-free SAC305'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Peak Temperature</p>
            <p className="font-medium">{reflowParams.peakTemp ? `${reflowParams.peakTemp}°C` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Conveyor Speed</p>
            <p className="font-medium">
              {reflowParams.conveyorSpeed ? `${reflowParams.conveyorSpeed} cm/min` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ramp Rate</p>
            <p className="font-medium">{reflowParams.rampRate ? `${reflowParams.rampRate}°C/s` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Soak Duration</p>
            <p className="font-medium">{reflowParams.soakTime ? `${reflowParams.soakTime} sec` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Operator Notes</p>
            <p className="font-medium">{reflowParams.notes || 'No notes captured'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ThermometerSun className="h-5 w-5 text-orange-500" />
              Zone Targets
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Last updated {formatDateTime(selectedWorkOrder.assemblyReflowStatus?.updatedAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {zoneTargets.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {zoneTargets.map((zone) => {
                const zoneLabel = zone.zone || zone.name || `Zone ${zone.index || ''}`.trim();
                const setpoint = zone.target ?? zone.setpoint ?? zone.temperature;
                return (
                  <div
                    key={zoneLabel || JSON.stringify(zone)}
                    className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{zoneLabel || 'Zone'}</p>
                    <p className="text-sm text-muted-foreground">
                      Setpoint: {setpoint !== undefined ? `${setpoint}°C` : 'N/A'}
                    </p>
                    {zone.actual && (
                      <p className="text-xs text-gray-500">Actual: {zone.actual}°C</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No zone configuration has been recorded for this work order yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            Recent Reflow Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {derivedRuns.length > 0 ? (
            derivedRuns.map((run) => (
              <div key={run.runId || run.startTime || Math.random()} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {run.runId || 'Reflow Batch'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(run.startTime)} → {formatDateTime(run.completedTime)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(run.status)}`}>
                    {(run.status || 'Pending').toUpperCase()}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-3 mt-3 text-sm text-muted-foreground">
                  <p>Profile: {run.profileName || reflowParams.profileName || 'Lead-free SAC305'}</p>
                  <p>Peak Temp: {run.peakTemp ? `${run.peakTemp}°C` : 'N/A'}</p>
                  <p>Conveyor Speed: {run.conveyorSpeed ? `${run.conveyorSpeed} cm/min` : 'N/A'}</p>
                </div>
                {run.notes && <p className="text-xs text-gray-500 mt-2">Notes: {run.notes}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No reflow run history captured yet. Upload reflow reports or record a run to populate this section.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Reflow Reports & Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reflowReports.length > 0 ? (
              reflowReports.map((file) => (
                <div
                  key={file.filename || file.originalName}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.originalName || file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Kind: {file.kind.replace(/_/g, ' ')} · Uploaded {formatDateTime(file.createdAt || file.uploadedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload?.(selectedWorkOrder, file)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No reflow reports uploaded. Upload furnace data or SPC logs from the stencil stage to track process
                health.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              BOM Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bomFiles.length > 0 ? (
              bomFiles.map((file) => (
                <div
                  key={file.filename || file.originalName}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.originalName || file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDateTime(file.createdAt || file.uploadedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload?.(selectedWorkOrder, file)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                BOM from stencil transfer not available yet. Ensure stencil operators release BOM and pick list files.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReflowLogsPanel;
