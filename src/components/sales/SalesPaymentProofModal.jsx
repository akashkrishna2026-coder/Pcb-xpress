import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getSalesToken } from '@/lib/storage';
import { formatInr } from '@/lib/currency';

const statusConfig = {
  not_submitted: { label: 'Not Submitted', color: 'bg-red-100 text-red-800' },
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-800' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', color: 'bg-orange-100 text-orange-800' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.not_submitted;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const SalesPaymentProofModal = ({ quote, onClose, onStatusUpdate }) => {
  const { toast } = useToast();
  const [action, setAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!quote) return null;

  const handleStatusUpdate = async (status) => {
    setLoading(true);
    try {
      const token = getSalesToken();
      const result = await api.salesUpdatePaymentProofStatus(token, quote._id || quote.id, status);
      
      toast({ 
        title: `Payment proof ${status}`,
        description: result.message || result.warning || ''
      });
      
      onStatusUpdate?.();
      onClose?.();
    } catch (err) {
      toast({ title: 'Update failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const proof = quote.paymentProof;

  const openProof = () => {
    const pf = proof?.proofFile || {};
    const base = getApiBaseUrl();
    let openUrl = '';
    if (pf.filename) {
      openUrl = `${base}/api/uploads/${encodeURIComponent(pf.filename)}`;
    } else if (typeof pf.url === 'string' && pf.url.length > 0) {
      try {
        if (pf.url.startsWith('http')) {
          const u = new URL(pf.url);
          let p = u.pathname || '';
          if (p.startsWith('/uploads/')) p = `/api${p}`;
          openUrl = `${base}${p}`;
        } else {
          let rel = pf.url;
          if (rel.startsWith('/uploads/')) rel = `/api${rel}`;
          openUrl = `${base}${rel.startsWith('/') ? '' : '/'}${rel}`;
        }
      } catch {
        openUrl = pf.url;
      }
    }
    if (openUrl) window.open(openUrl, '_blank', 'noopener');
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 flex items-start justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment Proof Review (Sales)</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Quote ID</p>
              <p className="font-medium">{quote.quoteId || quote._id || quote.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{quote.contact?.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">
                {formatInr((quote.adminQuote?.total != null ? quote.adminQuote.total : quote.quote?.total) || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={proof?.status || 'not_submitted'} />
            </div>
          </div>

          {proof?.proofFile ? (
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">Payment Proof</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {proof.proofFile.originalName || proof.proofFile.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted: {proof.submittedAt ? new Date(proof.submittedAt).toLocaleString() : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Size: {proof.proofFile.size ? Math.ceil(proof.proofFile.size / 1024) : 0} KB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={openProof}>
                  View File
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No payment proof uploaded yet.
            </div>
          )}

          {proof?.status === 'submitted' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Approving this payment will automatically send the order to manufacturing (CAM intake).
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes (optional)</label>
                <textarea
                  className="w-full min-h-[80px] border rounded-md px-3 py-2 text-sm mt-1"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about the payment verification..."
                />
              </div>

              {action === 'reject' && (
                <div>
                  <label className="text-sm font-medium">Rejection Reason</label>
                  <textarea
                    className="w-full min-h-[60px] border rounded-md px-3 py-2 text-sm mt-1"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    required
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Processing...' : 'Approve Payment & Send to Manufacturing'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAction(action === 'reject' ? '' : 'reject')}
                  disabled={loading}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {action === 'reject' ? 'Cancel Rejection' : 'Reject Payment'}
                </Button>
                {action === 'reject' && (
                  <Button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={loading || !rejectionReason.trim()}
                    variant="destructive"
                  >
                    {loading ? 'Processing...' : 'Confirm Rejection'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {proof?.status && proof.status !== 'submitted' && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {proof.status === 'approved' && (
                <>
                  <p>Approved on {proof.approvedAt ? new Date(proof.approvedAt).toLocaleString() : 'N/A'}</p>
                  {quote.autoMfgApproved && (
                    <p className="text-green-600 font-medium">✓ Automatically sent to manufacturing</p>
                  )}
                </>
              )}
              {proof.status === 'rejected' && (
                <>
                  {proof.rejectedAt && <p>Rejected on {new Date(proof.rejectedAt).toLocaleString()}</p>}
                  {proof.rejectionReason && <p>Reason: {proof.rejectionReason}</p>}
                </>
              )}
              {proof.reviewNotes && <p>Review notes: {proof.reviewNotes}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesPaymentProofModal;
