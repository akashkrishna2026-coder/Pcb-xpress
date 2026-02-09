import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import User from '../models/User.js';
import { findQuoteDocuments } from '../models/Quote.js';
import Transaction from '../models/Transaction.js';
import Enquiry from '../models/Enquiry.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper function to validate file types
const validateFile = (file, allowedTypes) => {
  if (!file) return false;
  const fileExtension = file.originalname?.split('.').pop()?.toLowerCase();
  return allowedTypes.includes(fileExtension);
};

function tryDecodeToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      return jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
    } catch (_) {}
  }
  return null;
}

function requireSales(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || decoded.role !== 'sales') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = { userId: decoded.sub, email: decoded.email, role: decoded.role };
  next();
}

// Get current sales user
router.get('/me', requireSales, async (req, res) => {
  try {
    const salesUser = await User.findById(req.user.userId).select('-password');
    
    if (!salesUser || salesUser.role !== 'sales') {
      return res.status(404).json({ error: 'Sales user not found' });
    }

    res.json({ salesUser });
  } catch (error) {
    console.error('Get sales user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', requireSales, async (req, res) => {
  try {
    const salesUserId = req.user.userId;
    
    // Get all customers (for overall stats)
    const allCustomers = await User.find({ role: { $in: ['user', 'customer'] } });
    
    // Get customers assigned to this sales rep
    const assignedCustomers = await User.find({ salesRep: salesUserId, role: { $in: ['user', 'customer'] } });
    
    // Calculate real stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const thisMonthCustomers = allCustomers.filter(c => 
      new Date(c.createdAt) >= startOfMonth && new Date(c.createdAt) < endOfMonth
    );
    
    // Count visits in the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let totalVisits = 0;
    allCustomers.forEach(customer => {
      if (customer.visitHistory) {
        totalVisits += customer.visitHistory.filter(visit => 
          new Date(visit.visitDate) >= thirtyDaysAgo
        ).length;
      }
    });
    
    // Count follow-ups (visits with nextFollowup date in future)
    let activeFollowups = 0;
    allCustomers.forEach(customer => {
      if (customer.visitHistory) {
        activeFollowups += customer.visitHistory.filter(visit => 
          visit.nextFollowup && new Date(visit.nextFollowup) > now
        ).length;
      }
    });
    
    // Mock negotiations count - replace with actual logic if needed
    const ongoingNegotiations = Math.floor(totalVisits * 0.2);
    
    // Mock revenue - replace with actual calculation from orders/quotes
    const thisMonthRevenue = 0; // Calculate from actual orders
    
    const stats = {
      totalCustomers: allCustomers.length,
      totalEnquiries: 0, // Replace with actual enquiries count
      activeFollowups,
      ongoingNegotiations,
      customerVisits: totalVisits,
      thisMonthRevenue,
      newCustomersThisMonth: thisMonthCustomers.length,
      conversionRate: allCustomers.length > 0 ? Math.round((thisMonthCustomers.length / allCustomers.length) * 100) : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync user quotes to sales customers
router.post('/sync-quotes', requireSales, async (req, res) => {
  try {
    // Get all quotes from the system
    const quotes = await findQuoteDocuments({});
    
    let syncedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const quote of quotes) {
      try {
        // Check if customer already exists
        const existingCustomer = await User.findOne({
          $or: [
            { email: quote.contact?.email },
            { 'gtInfo.gtNumber': quote.gtNumber }
          ]
        });

        if (!existingCustomer && quote.contact?.email) {
          // Create customer from quote
          const customerData = {
            name: quote.contact?.name || quote.contact?.email?.split('@')[0] || 'Unknown',
            email: quote.contact?.email,
            phone: quote.contact?.phone || '',
            company: quote.contact?.company || '',
            address: quote.contact?.address || '',
            city: quote.contact?.city || '',
            state: quote.contact?.state || '',
            pincode: quote.contact?.pincode || '',
            industry: quote.contact?.industry || 'General',
            role: 'customer',
            gtInfo: {
              gtNumber: quote.gtNumber || '',
              issuedDate: new Date(),
              issuedBy: req.user.userId
            },
            salesRep: req.user.userId,
            isActive: true,
            notes: `Auto-created from quote #${quote._id} for ${quote.service}`,
            sourceQuote: quote._id,
            createdAt: quote.createdAt || new Date()
          };

          const newCustomer = new User(customerData);
          await newCustomer.save();
          syncedCount++;
        }
      } catch (error) {
        errorCount++;
        errors.push(`Quote ${quote._id}: ${error.message}`);
      }
    }

    res.json({
      message: 'Sync completed',
      syncedCount,
      errorCount,
      errors: errors.slice(0, 10) // Limit errors to prevent large responses
    });
  } catch (error) {
    console.error('Sync Customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customers from quotes (for sales dashboard)
router.get('/customers-from-quotes', requireSales, async (req, res) => {
  try {
    // Load all quotes using the helper exported from models/Quote
    let quotes = [];
    try {
      const { findQuoteDocuments } = await import('../models/Quote.js');
      // findQuoteDocuments returns an array; pass sort via options
      quotes = await findQuoteDocuments({}, { sort: { createdAt: -1 }, limit: undefined });
    } catch (importError) {
      console.error('Import error while loading quotes:', importError);
      // On failure, keep quotes as empty array to avoid crashing the dashboard
      quotes = [];
    }
    
    // Get all real customers to check against
    const realCustomers = await User.find({ role: { $in: ['user', 'customer'] } }).select('email source');
    const customerEmailMap = new Map();
    realCustomers.forEach(customer => {
      if (customer.email) {
        customerEmailMap.set(customer.email.toLowerCase(), customer.source);
      }
    });
    
    const customersFromQuotes = quotes.map(quote => {
      const customerEmail = quote.contact?.email?.toLowerCase();
      const realCustomerSource = customerEmail ? customerEmailMap.get(customerEmail) : null;
      
      return {
        id: `quote-${quote._id}`,
        _id: `quote-${quote._id}`,
        name: quote.contact?.name || quote.contact?.email?.split('@')[0] || 'Unknown',
        email: quote.contact?.email || '',
        phone: quote.contact?.phone || '',
        company: quote.contact?.company || '',
        address: quote.contact?.address || '',
        city: quote.contact?.city || '',
        state: quote.contact?.state || '',
        pincode: quote.contact?.pincode || '',
        industry: quote.contact?.industry || 'General',
        gtNumber: quote.gtNumber || '',
        // Use real customer source if exists, otherwise default to 'quote'
        source: realCustomerSource || 'quote',
        quoteId: quote._id,
        service: quote.service,
        status: quote.status || 'pending',
        estimatedValue: quote.estimatedValue || 0,
        createdAt: quote.createdAt,
        notes: `Quote for ${quote.service}`
      };
    });

    res.json({ customers: customersFromQuotes });
  } catch (error) {
    console.error('Get customers from quotes error:', error);
    // Return empty array instead of 500 error to prevent dashboard from breaking
    res.json({ customers: [] });
  }
});

// Sales quote management endpoints
router.get('/quotes', requireSales, async (req, res) => {
  try {
    const { limit = 10, page = 1, service } = req.query;
    
    // Use the quotes route with sales permissions
    const { findQuoteDocuments } = await import('../models/Quote.js');
    const filter = service && ['pcb', '3dprinting', 'pcb_assembly', 'testing', 'wire_harness'].includes(service) 
      ? { service } 
      : {};
    
    const quotes = await findQuoteDocuments(filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit)
    });
    
    const { countQuoteDocuments } = await import('../models/Quote.js');
    const total = await (countQuoteDocuments ? countQuoteDocuments(filter) : 0);
    
    res.json({
      quotes,
      total,
      pages: Math.ceil(total / limit),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Sales quotes error:', error);
    res.json({ quotes: [], total: 0, pages: 0, page: 1, limit: 10 });
  }
});

router.put('/quotes/:id', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    const quoteData = req.body;
    
    // Use the quotes update endpoint
    const { findQuoteByIdAndUpdate } = await import('../models/Quote.js');
    const updatedQuote = await findQuoteByIdAndUpdate(id, quoteData);
    
    if (!updatedQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json({ quote: updatedQuote });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

router.post('/quotes/:id/send', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    const { total, currency, notes } = req.body;
    
    console.log('Sales send quote - ID:', id, 'User:', req.user, 'Body:', { total, currency, notes });
    
    // Update quote with adminQuote and mark as sent
    const { findQuoteByIdAndUpdate } = await import('../models/Quote.js');
    const updatedQuote = await findQuoteByIdAndUpdate(id, {
      adminQuote: { total, currency },
      status: 'sent',
      sentAt: new Date(),
      notes
    });
    
    if (!updatedQuote) {
      console.log('Quote not found with ID:', id);
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    console.log('Quote updated successfully:', updatedQuote._id);
    res.json({ quote: updatedQuote });
  } catch (error) {
    console.error('Send quote error:', error);
    res.status(500).json({ error: 'Failed to send quote' });
  }
});

router.put('/quotes/:id/payment-status', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('Sales payment status update - ID:', id, 'Status:', status, 'User:', req.user);
    
    // Update payment proof status
    const { findQuoteByIdAndUpdate } = await import('../models/Quote.js');
    const updatedQuote = await findQuoteByIdAndUpdate(id, {
      'paymentProof.status': status,
      // Also update proforma invoice status to 'paid' when payment is approved
      ...(status === 'approved' && {
        'proformaInvoice.status': 'paid',
        'proformaInvoice.paidAt': new Date()
      })
    });
    
    console.log('Payment status updated successfully:', updatedQuote?._id);
    
    if (!updatedQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    // If payment is approved by sales, automatically send to manufacturing
    if (status === 'approved') {
      console.log('Payment approved by sales, automatically sending to manufacturing...');
      
      try {
        // Import required modules for manufacturing approval
        const { findQuoteById } = await import('../models/Quote.js');
        const MfgWorkOrder = (await import('../models/MfgWorkOrder.js')).default;
        const AssemblyMfgWorkOrder = (await import('../models/AssemblyMfgWorkOrder.js')).default;
        const TestingWorkOrder = (await import('../models/TestingWorkOrder.js')).default;
        
        // Get the full quote details
        const quote = await findQuoteById(id);
        if (!quote) {
          console.error('Quote not found for manufacturing approval');
          return res.json({ quote: updatedQuote, warning: 'Payment approved but could not find quote for manufacturing approval' });
        }
        
        // Check if work order already exists
        const existingWO = await MfgWorkOrder.findOne({ quoteId: id });
        if (existingWO) {
          console.log('Work order already exists for this quote');
          return res.json({ quote: updatedQuote, message: 'Payment approved and sent to manufacturing (work order already exists)' });
        }
        
        // Generate WO number (same logic as admin approval)
        let woNumber = `WO-QUOTE-${id}`;
        if (quote.service === 'pcb') {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          const todayCount = await MfgWorkOrder.countDocuments({ createdAt: { $gte: todayStart, $lt: todayEnd } });
          const seq = String(todayCount + 1).padStart(3, '0');
          woNumber = `WO-${year}${month}${day}-${seq}`;
        }
        
        // Build product description (simplified version)
        let productDescription = '';
        if (quote.service === 'pcb' && quote.specs) {
          const s = quote.specs;
          productDescription = `PCB: ${s.widthMm}mm x ${s.heightMm}mm, ${s.layers} layers, Qty: ${s.quantity}`;
        } else {
          productDescription = `${quote.service} Quote - Qty: ${quote.specs?.quantity || quote.specsAssembly?.quantity || 1}`;
        }
        
        // Determine work order model and initial stage
        const WorkOrderModel = 
          quote.service === 'pcb_assembly' || quote.service === 'wire_harness'
            ? AssemblyMfgWorkOrder
            : quote.service === 'testing'
            ? TestingWorkOrder
            : MfgWorkOrder;
            
        let initialStage = 'cam';
        if (quote.service === 'pcb_assembly') {
          initialStage = 'assembly_store';
        } else if (quote.service === 'testing') {
          initialStage = 'testing_intake';
        } else if (quote.service === '3dprinting') {
          initialStage = '3d_printing';
        }
        
        // Get quantity
        const rawQuantity = quote.specs?.quantity || quote.specsAssembly?.quantity || quote.specsTesting?.quantity || 1;
        const quantity = typeof rawQuantity === 'number' && isFinite(rawQuantity) ? rawQuantity : 1;
        
        // Prepare intake attachments from quote attachments
        const intakeAttachments = [];
        if (quote.attachments) {
          quote.attachments.forEach(att => {
            const isPcbAttachment = att.kind === 'gerber' || att.kind === 'bom';
            const isAssemblyAttachment =
              att.kind === 'bom' ||
              att.kind === 'assembly' ||
              att.kind === 'assembly_instruction';
            const isHarnessAttachment =
              [
                'harness',
                'harness_drawing',
                'connector_list',
                'wire_spec',
                'connector_spec',
                'wire_test_report',
                'continuity_log',
                'dispatch_note',
                'packing_list',
                'invoice',
                'bom',
                'assembly',
                'assembly_instruction',
              ].includes(att.kind);
            const isTestingAttachment =
              [
                'test_plan',
                'test_report',
                'test_data',
                'procedure',
                'calibration_certificate',
                'safety_checklist',
                'dispatch_note',
                'packing_list',
                'invoice',
                'qa_certificate',
              ].includes(att.kind);
            const isThreeDAttachment =
              att.kind === 'model' ||
              att.kind === 'stl' ||
              att.kind === 'step' ||
              att.kind === '3mf' ||
              att.kind === 'slicing_profile' ||
              att.kind === 'gcode' ||
              att.kind === 'print_log' ||
              att.kind === 'timelapse';

            const shouldCopy =
              (quote.service === 'pcb' && isPcbAttachment) ||
              (quote.service === '3dprinting' && isThreeDAttachment) ||
              (quote.service === 'pcb_assembly' && isAssemblyAttachment) ||
              (quote.service === 'wire_harness' && isHarnessAttachment) ||
              (quote.service === 'testing' && isTestingAttachment);

            if (shouldCopy) {
              let attachmentCategory = 'intake';
              if (quote.service === '3dprinting') attachmentCategory = '3d_printing';
              if (quote.service === 'testing') attachmentCategory = 'testing';
              
              intakeAttachments.push({
                kind: att.kind,
                category: attachmentCategory,
                originalName: att.originalName,
                filename: att.filename,
                mimeType: att.mimeType,
                size: att.size,
                url: att.url,
                uploadedBy: req.user.userId, // Use actual user ObjectId instead of string
                uploadedAt: new Date(),
                description: `${att.kind.toUpperCase()} file from quote`,
              });
            }
          });
        }
        
        // Create work order with customer files
        const workOrder = await WorkOrderModel.create({
          woNumber,
          customer: quote.contact?.name || quote.contact?.company || 'Unknown',
          product: productDescription,
          quoteId: id,
          quantity,
          mfgApproved: true,
          stage: initialStage,
          travelerReady: true,
          status: initialStage,
          approvedBy: 'sales_auto',
          approvedAt: new Date(),
          salesApproved: true,
          // Include relevant specs
          ...(quote.specs && { specs: quote.specs }),
          ...(quote.specsAssembly && { specsAssembly: quote.specsAssembly }),
          ...(quote.specsTesting && { specsTesting: quote.specsTesting }),
          // Add service-specific status fields and attachments
          ...(quote.service === 'testing' && { 
            testingAttachments: intakeAttachments,
            testingStatus: { state: 'pending', startedAt: new Date() },
            dispatchStatus: { state: 'pending' },
            reviewStatus: { state: 'pending' }
          }),
          ...(quote.service === 'pcb_assembly' && { 
            assemblyAttachments: intakeAttachments,
            assemblyStoreStatus: { state: 'pending' }
          }),
          ...(quote.service === 'wire_harness' && { 
            assemblyAttachments: intakeAttachments,
            wireHarnessIntakeStatus: { state: 'pending' }
          }),
          ...(quote.service === 'pcb' && { 
            camAttachments: intakeAttachments,
            camStatus: { state: 'pending' }
          }),
          ...(quote.service === '3dprinting' && { 
            attachments3D: intakeAttachments,
            printingAttachments: intakeAttachments,
            threeDPrintingStatus: { state: 'pending', lastReviewedAt: new Date() },
            threeDPrintingIntakeStatus: { state: 'pending', lastReviewedAt: new Date() },
            threeDPrintingFilePrepStatus: { state: 'pending' },
            threeDPrintingSlicingStatus: { state: 'pending' },
            threeDPrintingQueueStatus: { state: 'pending' },
            threeDPrintingActiveStatus: { state: 'pending' },
            threeDPrintingPostProcessingStatus: { state: 'pending' },
            threeDPrintingQcStatus: { state: 'pending' },
            threeDPrintingDispatchStatus: { state: 'pending' }
          }),
        });
        
        console.log('Work order created successfully:', {
          woNumber: workOrder.woNumber,
          stage: workOrder.stage,
          service: quote.service,
          attachmentsCount: intakeAttachments.length
        });
        
        // Update quote with manufacturing approval
        await findQuoteByIdAndUpdate(id, {
          mfgApproved: true,
          stage: initialStage,
          salesApprovedAt: new Date(),
          autoMfgApproved: true
        });
        
        console.log('Quote updated with manufacturing approval');
        
        return res.json({ 
          quote: updatedQuote, 
          message: 'Payment approved and automatically sent to manufacturing',
          workOrder: {
            id: workOrder._id,
            woNumber: workOrder.woNumber,
            stage: workOrder.stage
          }
        });
        
      } catch (mfgError) {
        console.error('Error auto-sending to manufacturing:', mfgError);
        console.error('Error stack:', mfgError.stack);
        console.error('Error details:', {
          message: mfgError.message,
          name: mfgError.name,
          quoteId: id,
          quoteService: quote?.service,
          quoteExists: !!quote
        });
        return res.json({ 
          quote: updatedQuote, 
          warning: 'Payment approved but auto-sending to manufacturing failed',
          error: mfgError.message,
          details: mfgError.stack
        });
      }
    }
    
    res.json({ quote: updatedQuote });
  } catch (error) {
    console.error('Update payment status error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      quoteId: req.params?.id,
      requestBody: req.body,
      user: req.user
    });
    res.status(500).json({ 
      error: 'Failed to update payment status',
      details: error.message,
      stack: error.stack
    });
  }
});

// Proforma invoice endpoints for sales
router.post('/proforma-invoices', requireSales, async (req, res) => {
  try {
    const piData = req.body;
    
    // Create proforma invoice (simplified version)
    const { findQuoteByIdAndUpdate } = await import('../models/Quote.js');
    const updatedQuote = await findQuoteByIdAndUpdate(piData.quoteId, {
      proformaInvoice: {
        ...piData,
        createdAt: new Date(),
        status: 'draft'
      }
    });
    
    if (!updatedQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json({ proformaInvoice: updatedQuote.proformaInvoice });
  } catch (error) {
    console.error('Create PI error:', error);
    res.status(500).json({ error: 'Failed to create proforma invoice' });
  }
});

router.put('/proforma-invoices/:id', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    const piData = req.body;
    
    // Update proforma invoice
    const { default: Quote } = await import('../models/Quote.js');
    const updatedQuote = await Quote.findOneAndUpdate(
      { 'proformaInvoice._id': id },
      { 'proformaInvoice': { ...piData, updatedAt: new Date() } },
      { new: true }
    );
    
    if (!updatedQuote) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }
    
    res.json({ proformaInvoice: updatedQuote.proformaInvoice });
  } catch (error) {
    console.error('Update PI error:', error);
    res.status(500).json({ error: 'Failed to update proforma invoice' });
  }
});

router.post('/proforma-invoices/:id/send', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Sales send PI - Quote ID:', id, 'User:', req.user);
    
    // Send proforma invoice by quote ID
    const { findQuoteByIdAndUpdate } = await import('../models/Quote.js');
    const updatedQuote = await findQuoteByIdAndUpdate(id, {
      'proformaInvoice.status': 'sent',
      'proformaInvoice.sentAt': new Date()
    });
    
    if (!updatedQuote) {
      console.log('Quote not found with ID:', id);
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }
    
    console.log('PI sent successfully for quote:', updatedQuote._id);
    res.json({ proformaInvoice: updatedQuote.proformaInvoice });
  } catch (error) {
    console.error('Send PI error:', error);
    res.status(500).json({ error: 'Failed to send proforma invoice' });
  }
});

// Update customer source
router.put('/customers/:id/source', requireSales, async (req, res) => {
  try {
    const { source } = req.body;
    const { id } = req.params;

    console.log('=== BACKEND SOURCE UPDATE DEBUG ===');
    console.log('Request ID:', id);
    console.log('Request source:', source);
    console.log('ID type:', typeof id);
    console.log('ID starts with quote-?:', id.startsWith('quote-'));

    // Validate source value
    const validSources = ['website', 'phone', 'office_visit', 'email', 'quote', 'signup', 'referral', 'other'];
    if (!validSources.includes(source)) {
      console.log('Invalid source value:', source);
      return res.status(400).json({ error: 'Invalid source value' });
    }

    let customer;

    // Handle quote-based customers (virtual customers from quotes)
    if (id.startsWith('quote-')) {
      console.log('Handling quote-based customer');
      const quoteId = id.replace('quote-', '');
      console.log('Extracted quote ID:', quoteId);
      
      // Find the original quote
      const { default: Quote } = await import('../models/Quote.js');
      const quote = await Quote.findById(quoteId);
      console.log('Found quote:', !!quote);
      
      if (!quote) {
        console.log('Quote not found');
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Check if real customer already exists for this email
      if (quote.contact?.email) {
        customer = await User.findOne({ 
          email: quote.contact.email.toLowerCase(),
          role: { $in: ['user', 'customer'] }
        });
        console.log('Found existing customer for email:', !!customer);
      }

      // Create real customer if doesn't exist
      if (!customer && quote.contact?.email) {
        console.log('Creating new customer');
        customer = new User({
          name: quote.contact?.name || quote.contact?.email?.split('@')[0] || 'Unknown',
          email: quote.contact?.email.toLowerCase(),
          phone: quote.contact?.phone || '',
          company: quote.contact?.company || '',
          address: quote.contact?.address || '',
          city: quote.contact?.city || '',
          state: quote.contact?.state || '',
          pincode: quote.contact?.pincode || '',
          industry: quote.contact?.industry || 'General',
          role: 'customer',
          source: source,
          gtInfo: quote.gtNumber ? {
            gtNumber: quote.gtNumber,
            issuedDate: new Date(),
            issuedBy: req.user.userId
          } : undefined,
          isActive: true,
          createdAt: new Date(),
          salesRep: req.user.userId
        });
        await customer.save();
        console.log('New customer created with source:', source);
      } else if (customer) {
        console.log('Updating existing customer source from', customer.source, 'to', source);
        customer.source = source;
        await customer.save();
        console.log('Customer updated successfully');
      }
    } else {
      console.log('Handling regular database customer');
      // Regular database customers
      customer = await User.findOneAndUpdate(
        { _id: id, role: { $in: ['user', 'customer'] } },
        { $set: { source: source } },
        { new: true }
      ).select('-password');
      console.log('Regular customer updated:', !!customer);
      console.log('Updated customer source:', customer?.source);
    }

    if (!customer) {
      console.log('Customer not found after update attempt');
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log('Final customer source:', customer.source);
    console.log('=== END BACKEND SOURCE UPDATE DEBUG ===');

    res.json({
      message: 'Customer source updated successfully',
      customer: {
        ...customer.toObject(),
        id: customer._id.toString()
      }
    });
  } catch (error) {
    console.error('=== BACKEND SOURCE UPDATE ERROR ===');
    console.error('Error:', error);
    console.error('=== END BACKEND SOURCE UPDATE ERROR ===');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customers CRUD operations
router.get('/customers', requireSales, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    let query = { role: { $in: ['user', 'customer'] } };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'gtInfo.gtNumber': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get customers
    const customers = await User.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    // ----- Build a quote-count-by-email lookup from ALL quote collections -----
    let quoteCountByEmail = new Map();
    try {
      const allQuotes = await findQuoteDocuments({});
      allQuotes.forEach(q => {
        const email = (q.contact?.email || '').toLowerCase().trim();
        if (email) {
          quoteCountByEmail.set(email, (quoteCountByEmail.get(email) || 0) + 1);
        }
      });
    } catch (quoteErr) {
      console.error('Error building quote lookup:', quoteErr.message);
    }

    // Transform customers to include id field and hasQuote / quoteCount
    const transformedCustomers = customers.map(customer => {
      const emailKey = (customer.email || '').toLowerCase().trim();
      const quoteCount = quoteCountByEmail.get(emailKey) || 0;
      return {
        ...customer.toObject(),
        id: customer._id.toString(), // Add id field for frontend compatibility
        hasQuote: quoteCount > 0,
        quoteCount,
      };
    });

    // Get total count
    const total = await User.countDocuments(query);

    res.json({
      customers: transformedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/customers', requireSales, async (req, res) => {
  try {
    const {
      name,
      company,
      gtNumber,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      industry,
      visitType,
      priority,
      notes
    } = req.body;
    const { deadline } = req.body;

    // Normalize data for comparison
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const normalizedGstNumber = gtNumber ? gtNumber.toUpperCase().trim() : '';

    // Build query conditions only for non-empty fields
    const orConditions = [];
    
    if (normalizedEmail) {
      orConditions.push({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
    }
    
    if (normalizedGstNumber) {
      orConditions.push({ 'gtInfo.gtNumber': { $regex: new RegExp(`^${normalizedGstNumber}$`, 'i') } });
    }

    // Only check for duplicates if we have fields to compare
    let existingCustomer = null;
    if (orConditions.length > 0) {
      existingCustomer = await User.findOne({ $or: orConditions });
    }

    if (existingCustomer) {
      // Determine which field caused the duplicate
      if (normalizedEmail && existingCustomer.email && existingCustomer.email.toLowerCase() === normalizedEmail) {
        return res.status(400).json({ 
          error: `Customer with email "${normalizedEmail}" already exists` 
        });
      } else if (normalizedGstNumber && existingCustomer.gtInfo?.gtNumber && existingCustomer.gtInfo.gtNumber.toUpperCase() === normalizedGstNumber) {
        return res.status(400).json({ 
          error: `Customer with GST number "${normalizedGstNumber}" already exists` 
        });
      } else {
        return res.status(400).json({ 
          error: 'Customer with this email or GST number already exists' 
        });
      }
    }

    // Create new customer
    const customer = new User({
      name: name?.trim(),
      company: company?.trim() || '',
      email: normalizedEmail,
      password: 'customer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9), // Generate random password for customers
      phone: phone?.trim(),
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      pincode: pincode?.trim() || '',
      role: 'customer',
      source: 'website', // Set source as website for manually added customers
      gtInfo: normalizedGstNumber ? {
        gtNumber: normalizedGstNumber,
        issuedDate: new Date(),
        issuedBy: req.user.userId
      } : undefined,
      industry: industry?.trim() || '',
      visitType: visitType || 'office',
      priority: priority || 'normal',
      notes: notes?.trim() || '',
      salesRep: req.user.userId,
      isActive: true,
      createdAt: new Date()
    });

    try {
    await customer.save();

    // Remove password from response and add id field
    const { password: _, ...customerWithoutPassword } = customer.toObject();
    const customerResponse = {
      ...customerWithoutPassword,
      id: customer._id.toString() // Add id field for frontend compatibility
    };

    res.status(201).json({
      message: 'Customer created successfully',
      customer: customerResponse
    });
  } catch (validationError) {
    console.error('Customer creation validation error:', validationError);
    
    if (validationError.name === 'ValidationError') {
      const errors = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }
    
    if (validationError.code === 11000) {
      // Duplicate key error
      const field = Object.keys(validationError.keyPattern)[0];
      return res.status(400).json({ 
        error: `Duplicate ${field}. Customer with this ${field} already exists.` 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create customer', 
      message: validationError.message 
    });
  }
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer payment history and revenue
router.get('/customers/:customerId/payments', requireSales, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Find all completed transactions for this customer
    const transactions = await Transaction.find({
      user: customerId,
      status: 'completed',
      type: { $ne: 'refund' }
    }).sort({ createdAt: -1 });

    // Calculate total revenue
    const totalRevenue = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    res.json({
      payments: transactions.map(t => ({
        id: t._id,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        service: t.metadata?.service || '',
        orderNumber: t.metadata?.orderNumber || '',
        quoteNumber: t.metadata?.quoteNumber || ''
      })),
      totalRevenue,
      paymentCount: transactions.length
    });

  } catch (error) {
    console.error('Get customer payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer priority
router.patch('/customers/:id/priority', requireSales, async (req, res) => {
  try {
    const { priority } = req.body;
    const customerId = req.params.id;

    console.log('Updating priority for customer:', customerId, 'to:', priority);

    // Validate priority value
    if (!['high', 'normal', 'low'].includes(priority)) {
      console.log('Invalid priority value:', priority);
      return res.status(400).json({ error: 'Invalid priority value' });
    }

    // Find and update customer
    const customer = await User.findById(customerId);
    if (!customer) {
      console.log('Customer not found with ID:', customerId);
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!['user', 'customer'].includes(customer.role)) {
      console.log('User is not a customer, role:', customer.role);
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log('Found customer:', customer.name, 'current priority:', customer.priority);

    // Update priority
    customer.priority = priority;
    await customer.save();

    console.log('Priority updated successfully to:', customer.priority);

    res.status(200).json({
      message: 'Customer priority updated successfully',
      priority: customer.priority
    });

  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer visits
router.post('/customers/:id/visits', requireSales, async (req, res) => {
  try {
    const { visitDate, visitType, purpose, outcome, nextFollowup, notes } = req.body;
    const customerId = req.params.id;

    // Verify customer exists (accept both 'user' and 'customer' roles)
    const customer = await User.findById(customerId);
    if (!customer || !['user', 'customer'].includes(customer.role)) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create visit record
    const visit = {
      visitDate: new Date(visitDate),
      visitType,
      purpose,
      outcome,
      nextFollowup: nextFollowup ? nextFollowup : null, // Store as string, not Date object
      notes,
      salesRep: req.user.userId,
      createdAt: new Date()
    };

    // Add visit to customer's visit history
    if (!customer.visitHistory) {
      customer.visitHistory = [];
    }
    customer.visitHistory.push(visit);
    customer.lastVisit = new Date(visitDate);

    await customer.save();

    res.status(201).json({
      message: 'Visit logged successfully',
      visit
    });
  } catch (error) {
    console.error('Log visit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow-ups CRUD operations
// Aggregates real follow-ups from:
//   1. Customer visitHistory entries with a nextFollowup date
//   2. Enquiries with a nextFollowup date
router.get('/followups', requireSales, async (req, res) => {
  try {
    const { status } = req.query;
    const now = new Date();
    const followups = [];

    // 1. Customer visit-based follow-ups
    const customers = await User.find({
      role: { $in: ['user', 'customer'] },
      'visitHistory.nextFollowup': { $ne: null }
    }).select('name email phone company visitHistory');

    customers.forEach(customer => {
      (customer.visitHistory || []).forEach(visit => {
        if (!visit.nextFollowup) return;
        const followupDate = new Date(visit.nextFollowup);
        const isCompleted = visit.outcome && visit.outcome.toLowerCase().includes('completed');
        const computedStatus = isCompleted ? 'completed' : (followupDate < now ? 'overdue' : 'scheduled');

        // Apply status filter if provided
        if (status && status !== 'all' && computedStatus !== status) return;

        followups.push({
          id: `visit-${customer._id}-${visit._id}`,
          type: 'visit',
          customerId: customer._id.toString(),
          customerName: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          company: customer.company || '',
          contactPerson: customer.name,
          followupType: visit.visitType || 'phone',
          scheduledDate: visit.nextFollowup,
          scheduledTime: '',
          purpose: visit.purpose || 'Follow-up from previous visit',
          outcome: visit.outcome || '',
          notes: visit.notes || '',
          priority: 'medium',
          status: computedStatus,
          source: 'customer_visit',
          createdAt: visit.createdAt || customer.createdAt,
          updatedAt: visit.createdAt || customer.updatedAt,
          completedAt: isCompleted ? (visit.createdAt || null) : null,
        });
      });
    });

    // 2. Enquiry-based follow-ups
    const enquiryQuery = { nextFollowup: { $ne: null } };
    const enquiries = await Enquiry.find(enquiryQuery).sort({ nextFollowup: 1 });

    enquiries.forEach(enq => {
      const followupDate = new Date(enq.nextFollowup);
      const isResolved = enq.status === 'resolved' || enq.status === 'closed';
      const computedStatus = isResolved ? 'completed' : (followupDate < now ? 'overdue' : 'scheduled');

      if (status && status !== 'all' && computedStatus !== status) return;

      followups.push({
        id: `enquiry-${enq._id}`,
        type: 'enquiry',
        customerId: enq.customerId?.toString() || '',
        customerName: enq.customerName || '',
        email: enq.email || '',
        phone: enq.phone || '',
        company: enq.company || '',
        contactPerson: enq.customerName || '',
        followupType: enq.source === 'phone' ? 'phone' : (enq.source === 'email' ? 'email' : 'meeting'),
        scheduledDate: enq.nextFollowup,
        scheduledTime: '',
        purpose: enq.subject || 'Enquiry follow-up',
        outcome: enq.resolution || '',
        notes: enq.followupNotes || enq.notes || '',
        priority: enq.priority || 'medium',
        status: computedStatus,
        source: 'enquiry',
        enquiryId: enq._id.toString(),
        createdAt: enq.createdAt,
        updatedAt: enq.updatedAt,
        completedAt: isResolved ? (enq.resolvedAt || enq.updatedAt) : null,
      });
    });

    // Sort: overdue first, then scheduled by date
    const statusOrder = { overdue: 0, scheduled: 1, completed: 2 };
    followups.sort((a, b) => {
      const sa = statusOrder[a.status] ?? 1;
      const sb = statusOrder[b.status] ?? 1;
      if (sa !== sb) return sa - sb;
      return new Date(a.scheduledDate) - new Date(b.scheduledDate);
    });

    res.json({ followups, total: followups.length });
  } catch (error) {
    console.error('Get followups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/followups', requireSales, async (req, res) => {
  try {
    const followupData = {
      ...req.body,
      salesRep: req.user.userId,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock save - replace with actual database save
    const newFollowup = {
      id: Date.now(),
      ...followupData
    };

    res.status(201).json({
      message: 'Follow-up scheduled successfully',
      followup: newFollowup
    });
  } catch (error) {
    console.error('Create followup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a follow-up (works for both visit-based and enquiry-based)
router.put('/followups/:followupId/complete', requireSales, async (req, res) => {
  try {
    const { followupId } = req.params;

    // Visit-based follow-up: id format is "visit-<userId>-<visitId>"
    if (followupId.startsWith('visit-')) {
      const parts = followupId.split('-');
      // visit-<userId>-<visitId>  (userId and visitId are ObjectIds, 24 hex chars each)
      const userId = parts[1];
      const visitId = parts.slice(2).join('-');

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'Customer not found' });

      const visit = user.visitHistory.id(visitId);
      if (!visit) return res.status(404).json({ error: 'Visit not found' });

      visit.outcome = (visit.outcome || '') + (visit.outcome ? ' | ' : '') + 'Follow-up completed';
      visit.nextFollowup = null; // Clear the follow-up since it is done
      user.updatedAt = new Date();
      await user.save();

      return res.json({ message: 'Follow-up marked as completed', followupId });
    }

    // Enquiry-based follow-up: id format is "enquiry-<enquiryId>"
    if (followupId.startsWith('enquiry-')) {
      const enquiryId = followupId.replace('enquiry-', '');

      const enquiry = await Enquiry.findById(enquiryId);
      if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

      enquiry.status = 'resolved';
      enquiry.resolution = (enquiry.resolution || '') + (enquiry.resolution ? ' | ' : '') + 'Follow-up completed';
      enquiry.resolvedAt = new Date();
      enquiry.updatedAt = new Date();
      await enquiry.save();

      return res.json({ message: 'Follow-up marked as completed', followupId });
    }

    return res.status(400).json({ error: 'Unknown follow-up type' });
  } catch (error) {
    console.error('Complete followup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Negotiations CRUD operations
router.get('/negotiations', requireSales, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    // Return empty array - no mock data
    res.json({ negotiations: [] });
  } catch (error) {
    console.error('Get negotiations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/negotiations', requireSales, async (req, res) => {
  try {
    const negotiationData = {
      ...req.body,
      salesRep: req.user.userId,
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock save - replace with actual database save
    const newNegotiation = {
      id: Date.now(),
      ...negotiationData
    };

    res.status(201).json({
      message: 'Negotiation created successfully',
      negotiation: newNegotiation
    });
  } catch (error) {
    console.error('Create negotiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// (Brochures endpoints removed)

// Enquiry Management Routes

// Get all enquiries for the current sales rep
router.get('/enquiries', requireSales, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    let query = { salesRep: req.user.userId };
    
    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    // Add search
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const enquiries = await Enquiry.find(query)
      .populate('customerId', 'name email phone company')
      .populate('salesRep', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Get total count for pagination
    const total = await Enquiry.countDocuments(query);
    
    res.json({
      enquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get enquiries error:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// Create new enquiry
router.post('/enquiries', requireSales, async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      email,
      phone,
      company,
      subject,
      message,
      deadline,
      category = 'general',
      priority = 'medium',
      source = 'website',
      tags = [],
      notes = ''
    } = req.body;
    
    // Log incoming data for debugging
    console.log('Create Enquiry request body:', { customerId, customerName, email, phone, company, subject, message, category, priority, source, tags, notes, deadline });

    // Validate required fields: accept if either a customerId is provided, or full contact details are present
    const missing = [];
    if (!customerId) {
      if (!customerName) missing.push('customerName');
      if (!email) missing.push('email');
      if (!phone) missing.push('phone');
    }
    if (!subject) missing.push('subject');
    if (!message) missing.push('message');

    if (missing.length > 0) {
      console.warn('Create enquiry missing fields:', missing);
      return res.status(400).json({ error: 'Missing required fields', missing });
    }
    
    // Create enquiry
    const enquiry = new Enquiry({
      // If a customerId was provided, associate it; otherwise leave undefined
      ...(customerId ? { customerId } : {}),
      customerName,
      email,
      phone,
      company,
      subject,
      message,
      category,
      priority,
      source,
      // Store deadline if provided (expecting ISO-like string)
      ...(deadline ? { deadline: new Date(deadline) } : {}),
      tags,
      notes,
      salesRep: req.user.userId
    });
    
    await enquiry.save();
    
    // Populate customer and sales rep info for response
    await enquiry.populate('customerId', 'name email phone company');
    await enquiry.populate('salesRep', 'name email');
    
    res.status(201).json({
      message: 'Enquiry created successfully',
      enquiry
    });
  } catch (error) {
    console.error('Create enquiry error:', error);
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

// Update enquiry
router.put('/enquiries/:id', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Find and update enquiry
    const enquiry = await Enquiry.findOneAndUpdate(
      { _id: id, salesRep: req.user.userId },
      updates,
      { new: true, runValidators: true }
    ).populate('customerId', 'name email phone company')
     .populate('salesRep', 'name email');
    
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json({
      message: 'Enquiry updated successfully',
      enquiry
    });
  } catch (error) {
    console.error('Update enquiry error:', error);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// Delete enquiry
router.delete('/enquiries/:id', requireSales, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and delete enquiry
    const enquiry = await Enquiry.findOneAndDelete({
      _id: id,
      salesRep: req.user.userId
    });
    
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json({
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete enquiry error:', error);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// Quote Creation for Sales
router.post('/quotes', requireSales, upload.fields([
  { name: 'gerber', maxCount: 1 },
  { name: 'bom', maxCount: 1 }
]), async (req, res) => {
  try {
    // Handle both JSON and FormData requests
    let quoteData, gerberFile, bomFile, bomStats;

    if (req.files && (req.files.gerber || req.files.bom)) {
      // Handle FormData with file uploads
      console.log('Processing FormData with files:', {
        gerber: req.files.gerber?.[0]?.originalname,
        bom: req.files.bom?.[0]?.originalname
      });

      // Parse the data field
      if (req.body.data) {
        quoteData = JSON.parse(req.body.data);
      } else {
        return res.status(400).json({ error: 'Missing quote data' });
      }

      gerberFile = req.files?.gerber?.[0];
      bomFile = req.files?.bom?.[0];
      
      if (req.body.bomStats) {
        bomStats = JSON.parse(req.body.bomStats);
      }

      // Validate file types
      if (gerberFile) {
        const allowedGerberTypes = ['zip', 'drl', 'gbl', 'gbo', 'gbp', 'gbs', 'gml', 'gpi', 'gtl', 'gto', 'gtp', 'gts'];
        if (!validateFile(gerberFile, allowedGerberTypes)) {
          return res.status(400).json({ error: 'Invalid Gerber file type. Allowed: .zip, .drl, .GBR files' });
        }
      }

      

      if (bomFile) {
        const allowedBomTypes = ['csv', 'txt', 'xlsx'];
        if (!validateFile(bomFile, allowedBomTypes)) {
          return res.status(400).json({ error: 'Invalid BOM file type. Allowed: .csv, .txt, .xlsx' });
        }
      }
    } else {
      // Handle regular JSON request (for non-PCB services)
      quoteData = req.body;
    }

    const {
      service,
      delivery,
      contact,
      specs,
      specs3d,
      specsAssembly,
      enquiryId
    } = quoteData;

    console.log('Quote data received:', { service, delivery, contact: { name: contact?.name, email: contact?.email } });

    // Validate required fields
    if (!service || !contact || !contact.email || !contact.name) {
      return res.status(400).json({ error: 'Missing required fields: service, contact name, and email are required' });
    }

    // Validate files for PCB service
    if (service === 'pcb' && (!gerberFile || !bomFile)) {
      return res.status(400).json({ error: 'Both Gerber and BOM files are required for PCB quotes' });
    }

    // Import the quote model dynamically
    const { getQuoteModel } = await import('../models/Quote.js');
    const QuoteModel = getQuoteModel(service);

    // Generate custom quote ID
    const { generateCustomQuoteId } = await import('../models/Quote.js');
    const quoteId = await generateCustomQuoteId(service);

    // Create quote object
    const quoteDataToSave = {
      quoteId,
      service,
      delivery,
      contact,
      status: 'requested',
      quote: {
        subtotal: 0, // Will be calculated by admin
        tax: 0,
        total: 0,
        currency: 'INR'
      }
    };

    // Add service-specific specifications
    if (service === 'pcb' && specs) {
      quoteDataToSave.specs = specs;
    } else if (service === '3dprinting' && specs3d) {
      quoteDataToSave.specs3d = specs3d;
    } else if (service === 'pcb_assembly' && specsAssembly) {
      quoteDataToSave.specsAssembly = specsAssembly;
    }

    // Add BOM stats if available
    if (bomStats) {
      quoteDataToSave.bomStats = bomStats;
    }

    // Add enquiry reference if provided
    if (enquiryId) {
      quoteDataToSave.enquiryId = enquiryId;
    }

    // Create and save the quote
    const quote = new QuoteModel(quoteDataToSave);
    await quote.save();

    // Handle file uploads
    if (gerberFile || bomFile) {
      import('fs').then(fs => {
        import('path').then(path => {
          const fsModule = fs;
          const pathModule = path;
          
          // Create uploads directory if it doesn't exist
          const uploadsDir = pathModule.join(process.cwd(), 'uploads', 'quotes');
          if (!fsModule.existsSync(uploadsDir)) {
            fsModule.mkdirSync(uploadsDir, { recursive: true });
          }

          // Save Gerber file
          if (gerberFile) {
            const gerberPath = pathModule.join(uploadsDir, `${quoteId}_gerber${pathModule.extname(gerberFile.originalname || '.zip')}`);
            fsModule.writeFileSync(gerberPath, gerberFile.buffer);
            
            // Add file info to quote.attachments (use schema 'attachments')
            quote.attachments = quote.attachments || [];
            quote.attachments.push({
              kind: 'gerber',
              originalName: gerberFile.originalname || 'gerber.zip',
              filename: pathModule.basename(gerberPath),
              mimeType: gerberFile.mimetype || 'application/zip',
              size: gerberFile.size,
              url: `/uploads/quotes/${pathModule.basename(gerberPath)}`
            });
          }

          // Save BOM file
          if (bomFile) {
            const bomPath = pathModule.join(uploadsDir, `${quoteId}_bom${pathModule.extname(bomFile.originalname || '.csv')}`);
            fsModule.writeFileSync(bomPath, bomFile.buffer);
            
            // Add file info to quote.attachments (use schema 'attachments')
            quote.attachments = quote.attachments || [];
            quote.attachments.push({
              kind: 'bom',
              originalName: bomFile.originalname || 'bom.csv',
              filename: pathModule.basename(bomPath),
              mimeType: bomFile.mimetype || 'text/csv',
              size: bomFile.size,
              url: `/uploads/quotes/${pathModule.basename(bomPath)}`
            });
          }

          // Save quote with file info and continue
          quote.save().then(() => {
            // Populate related data if needed
            quote.populate('enquiryId', 'subject customerName').then(() => {
              console.log('Quote created successfully:', { quoteId, service, customer: contact.name });

              res.status(201).json({
                message: 'Quote created successfully',
                quote: {
                  ...quote.toObject(),
                  id: quote._id.toString()
                }
              });
            });
          });
        });
      });
      return; // Return early since we're handling async operations
    }

    // Populate related data if needed
    if (enquiryId) {
      try {
        await quote.populate({
          path: 'enquiryId',
          select: 'subject customerName'
        });
      } catch (populateError) {
        console.log('Populate failed (enquiryId may not be in schema):', populateError.message);
        // Continue without population
      }
    }

    console.log('Quote created successfully:', { quoteId, service, customer: contact.name });

    res.status(201).json({
      message: 'Quote created successfully',
      quote: {
        ...quote.toObject(),
        id: quote._id.toString()
      }
    });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote: ' + error.message });
  }
});

export default router;
