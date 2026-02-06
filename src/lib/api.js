const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:4000';
};

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || data?.message || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  async signup({ name, email, password, gstNo, phone }) {
    return request('/api/auth/signup', { method: 'POST', body: { name, email, password, gstNo, phone } });
  },

  async login({ email, password }) {
    return request('/api/auth/login', { method: 'POST', body: { email, password } });
  },

  async adminLogin({ email, password }) {
    return request('/api/auth/admin/login', { method: 'POST', body: { email, password } });
  },

  async forgotPassword({ email }) {
    return request('/api/auth/forgot', { method: 'POST', body: { email } });
  },

  async resetPasswordWithOtp({ email, otp, password }) {
    return request('/api/auth/reset-otp', { method: 'POST', body: { email, otp, password } });
  },

  async mfgLogin({ identifier, password }) {
    return request('/api/auth/mfg/login', { method: 'POST', body: { identifier, password } });
  },

  async salesLogin({ email, password }) {
    return request('/api/auth/sales/login', { method: 'POST', body: { email, password } });
  },

  async salesSignup({ name, email, password, phone, department, experience, address, notes }) {
    return request('/api/auth/sales/signup', { method: 'POST', body: { name, email, password, phone, department, experience, address, notes } });
  },

  async getSalesQuotes(token) {
    return request('/api/quotes', { token });
  },

  async getSalesRevenue(token) {
    return request('/api/sales/revenue', { token });
  },

  async getSalesQuotes(token, { limit = 10, page = 1, service } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));
    if (service) params.set('service', service);
    const qs = params.toString();
    return request(`/api/quotes${qs ? `?${qs}` : ''}`, { token });
  },

  async salesUpdateQuote(token, quoteId, quoteData) {
    return request(`/api/quotes/${encodeURIComponent(quoteId)}`, {
      method: 'PUT',
      body: quoteData,
      token,
    });
  },

  async salesSendQuote(quoteId, token, quoteData) {
    return request(`/api/sales/quotes/${encodeURIComponent(quoteId)}/send`, {
      method: 'POST',
      body: quoteData,
      token,
    });
  },

  async salesUpdatePaymentProofStatus(token, quoteId, status) {
    return request(`/api/sales/quotes/${encodeURIComponent(quoteId)}/payment-status`, {
      method: 'PUT',
      body: { status },
      token,
    });
  },

  async salesCreatePI(token, piData) {
    return request('/api/sales/proforma-invoices', {
      method: 'POST',
      body: piData,
      token,
    });
  },

  async salesUpdatePI(token, piId, piData) {
    return request(`/api/sales/proforma-invoices/${encodeURIComponent(piId)}`, {
      method: 'PUT',
      body: piData,
      token,
    });
  },

  async salesSendPI(token, piId) {
    return request(`/api/sales/proforma-invoices/${encodeURIComponent(piId)}/send`, {
      method: 'POST',
      token,
    });
  },

  async getSalesMe(token) {
    return request('/api/sales/me', { token });
  },

  async getSalesDashboardStats(token) {
    return request('/api/sales/dashboard/stats', { token });
  },

  async getSalesCustomers(token, { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    const qs = params.toString();
    return request(`/api/sales/customers${qs ? `?${qs}` : ''}`, { token });
  },

  async createSalesCustomer(token, customerData) {
    return request('/api/sales/customers', {
      method: 'POST',
      body: customerData,
      token,
    });
  },

  async logCustomerVisit(token, customerId, visitData) {
    return request(`/api/sales/customers/${encodeURIComponent(customerId)}/visits`, {
      method: 'POST',
      body: visitData,
      token,
    });
  },

  async updateCustomerPriority(token, customerId, priority) {
    return request(`/api/sales/customers/${encodeURIComponent(customerId)}/priority`, {
      method: 'PATCH',
      body: { priority },
      token,
    });
  },

  async updateCustomerSource(token, customerId, source) {
    return request(`/api/sales/customers/${encodeURIComponent(customerId)}/source`, {
      method: 'PUT',
      body: { source },
      token,
    });
  },

  async getCustomerPayments(token, customerId) {
    return request(`/api/sales/customers/${encodeURIComponent(customerId)}/payments`, {
      method: 'GET',
      token,
    });
  },

  async getSalesEnquiries(token, { page = 1, limit = 10, status, priority, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request(`/api/sales/enquiries${qs ? `?${qs}` : ''}`, { token });
  },

  async createSalesEnquiry(token, enquiryData) {
    return request('/api/sales/enquiries', {
      method: 'POST',
      body: enquiryData,
      token,
    });
  },

  async syncQuotesToCustomers(token) {
    return request('/api/sales/sync-quotes', {
      method: 'POST',
      token,
    });
  },

  async getCustomersFromQuotes(token) {
    return request('/api/sales/customers-from-quotes', { token });
  },

  async getFinanceSummary(token) {
    return request('/api/finance/reports/summary-sales', { token });
  },

  async me(token) {
    return request('/api/auth/me', { token });
  },

  async mfgMe(token) {
    return request('/api/auth/mfg/me', { token });
  },

  async mfgSummary(token) {
    return request('/api/mfg/summary', { token });
  },

  async mfgWorkOrders(token, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      qs.set(key, String(value));
    });
    const queryString = qs.toString();
    return request(`/api/mfg/work-orders${queryString ? `?${queryString}` : ''}`, { token });
  },

  async mfgWorkOrder(token, id) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(id)}`, { token });
  },

  async mfgCreateWorkOrder(token, body) {
    return request('/api/mfg/work-orders', { method: 'POST', body, token });
  },

  async adminMfgApproveQuote(token, quoteId) {
    return request(`/api/quotes/${encodeURIComponent(quoteId)}/mfg-approve`, { method: 'PUT', token });
  },

  async mfgUpdateWorkOrder(token, id, body) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(id)}`, { method: 'PATCH', body, token });
  },

  async mfgUpdateWorkOrderStage(token, id, stage) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(id)}/stage`, { method: 'PATCH', body: { stage }, token });
  },

  async mfgApproveWorkOrder(token, id) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(id)}/approve`, { method: 'PATCH', token });
  },

  async mfgListOperators(token, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      qs.set(key, String(value));
    });
    const query = qs.toString();
    return request(`/api/mfg/operators${query ? `?${query}` : ''}`, { token });
  },

  async mfgCreateOperator(token, body) {
    return request('/api/mfg/operators', { method: 'POST', body, token });
  },

  async mfgUpdateOperator(token, id, body) {
    return request(`/api/mfg/operators/${encodeURIComponent(id)}`, { method: 'PATCH', body, token });
  },

  async mfgLogTravelerEvent(token, workOrderId, body) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/traveler-events`, {
      method: 'POST',
      body,
      token,
    });
  },

  async mfgListTravelerEvents(token, workOrderId, { limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request(
      `/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/traveler-events${qs ? `?${qs}` : ''}`,
      { token }
    );
  },

  async mfgUploadAttachment(token, workOrderId, formData) {
    const res = await fetch(`${BASE_URL}/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/attachments`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async mfgListAttachments(token, workOrderId) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/attachments`, { token });
  },

  async mfgDeleteAttachment(token, workOrderId, filename) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/attachments/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      token,
    });
  },

  async mfgDownloadAttachment(token, workOrderId, filename) {
    const res = await fetch(`${BASE_URL}/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/attachments/${encodeURIComponent(filename)}/download`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return res.blob();
  },

  async createQuote(body, token) {
    return request('/api/quotes', { method: 'POST', body, token });
  },

  async createQuoteMultipart(formData, token) {
    const res = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async listMyQuotes(token, { limit = 100, page = 1 } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));
    const qs = params.toString();
    const res = await request(`/api/quotes/mine${qs ? `?${qs}` : ''}`, { token });
    // Normalize id field for convenience
    if (Array.isArray(res.quotes)) {
      res.quotes = res.quotes.map((q) =>
        q && typeof q === 'object' ? { id: q._id || q.id, quoteId: q.quoteId, ...q } : q
      );
    }
    return res;
  },

  async listAllQuotesAdmin(token, { limit = 100, page = 1, service, email, from, to } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));
    if (service) params.set('service', service);
    if (email) params.set('email', String(email).toLowerCase());
    if (from) params.set('from', String(from));
    if (to) params.set('to', String(to));
    const qs = params.toString();
    const res = await request(`/api/quotes${qs ? `?${qs}` : ''}`, { token });
    // Normalize id field for convenience
    if (Array.isArray(res.quotes)) {
      res.quotes = res.quotes.map((q) =>
        q && typeof q === 'object' ? { id: q._id || q.id, quoteId: q.quoteId, ...q } : q
      );
    }
    return res;
  },

  async deleteQuote(id, token) {
    return request(`/api/quotes/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async adminSendQuote(id, token, { total, currency = 'INR', notes = '', breakdown } = {}) {
    const body = { total, currency, notes };
    if (breakdown && typeof breakdown === 'object') body.breakdown = breakdown;
    return request(`/api/quotes/${encodeURIComponent(id)}/admin-quote`, { method: 'PUT', body, token });
  },

  async adminGetSmtp(token) {
    return request('/api/settings/smtp', { token });
  },

  async adminUpdateSmtp(token, body) {
    return request('/api/settings/smtp', { method: 'PUT', body, token });
  },

  async adminGetMaintenanceMode(token) {
    return request('/api/settings/maintenance-mode', { token });
  },

  async adminUpdateMaintenanceMode(token, body) {
    return request('/api/settings/maintenance-mode', { method: 'PUT', body, token });
  },

  async getMaintenanceModePublic() {
    return request('/api/settings/maintenance-mode-public');
  },

  async listProducts({ q = '', limit = 100, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const qs = params.toString();
    const res = await request(`/api/products${qs ? `?${qs}` : ''}`);
    return { items: Array.isArray(res.items) ? res.items : [], count: res.count || 0 };
  },

  async lookupProductsByExternalIds(ids = []) {
    const list = Array.isArray(ids) ? ids.filter((n) => Number.isFinite(Number(n))) : [];
    if (list.length === 0) return { items: [] };
    const params = new URLSearchParams();
    params.set('ids', list.join(','));
    return request(`/api/products/lookup?${params.toString()}`);
  },

  async getProduct(id) {
    return request(`/api/products/${encodeURIComponent(id)}`);
  },

  async createProduct(body) {
    return request('/api/products', { method: 'POST', body });
  },

  async updateProduct(id, body) {
    return request(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body });
  },

  async deleteProduct(id) {
    return request(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async deleteAllProducts() {
    return request('/api/products', { method: 'DELETE' });
  },

  async seedDefaultProducts({ replace = false } = {}) {
    const params = new URLSearchParams();
    if (replace) params.set('replace', '1');
    const qs = params.toString();
    const res = await request(`/api/products/seed-defaults${qs ? `?${qs}` : ''}`, { method: 'POST' });
    return Array.isArray(res.items) ? res.items : [];
  },

  async syncProducts() {
    const res = await request('/api/products/sync', { method: 'POST' });
    console.log('API syncProducts response:', res); // Debug log
    return Array.isArray(res.items) ? res.items : [];
  },

  // Orders
  async createOrder(body, token) {
    return request('/api/orders', { method: 'POST', body, token });
  },

  async listMyOrders(token, { limit = 100, page = 1 } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));
    return request(`/api/orders/mine?${params.toString()}`, { token });
  },

  async adminListOrders(token, { limit = 100, page = 1, status } = {}) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('page', String(page));
    if (status) params.set('status', status);
    return request(`/api/orders?${params.toString()}`, { token });
  },

  // Optional helper for the UI to fetch the canonical list
  async adminGetOrderMeta(token) {
    return request('/api/orders/meta', { token });
  },

  /**
   * TOLERANT: accepts either a string ("Delivered") or an object ({ status: "Delivered" }).
   * Always sends { status: "<string>" } to the server.
   */
  async adminUpdateOrderStatus(token, id, statusInput) {
    let status = statusInput;
    if (status && typeof status === 'object') {
      // If UI accidentally passed { status: "Delivered" }, unwrap it
      if (typeof status.status === 'string' || typeof status.status === 'number') {
        status = status.status;
      } else {
        throw new Error('Invalid status payload');
      }
    }
    if (status == null) throw new Error('Status is required');

    // Keep it as a string (your backend canonicalizes case)
    const statusString = String(status);

    return request(
      `/api/orders/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: { status: statusString }, token }
    );
  },

  async adminDeleteOrder(token, id) {
    return request(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async updateQuoteUser(id, token) {
    return request(`/api/quotes/${encodeURIComponent(id)}/user`, { method: 'PUT', token });
  },

  async updateQuote(id, token, updates) {
    return request(`/api/quotes/${encodeURIComponent(id)}`, { 
      method: 'PUT', 
      body: updates, 
      token 
    });
  },

  async updateQuoteCustomer(id, token, updates) {
    return request(`/api/quotes/${encodeURIComponent(id)}/update`, { 
      method: 'PUT', 
      body: updates, 
      token 
    });
  },

  // Proforma Invoice API methods
  async createProformaInvoice(id, token, piData) {
    return request(`/api/quotes/${encodeURIComponent(id)}/proforma`, { 
      method: 'POST', 
      body: piData, 
      token 
    });
  },

  async updateProformaInvoice(id, token, piData) {
    return request(`/api/quotes/${encodeURIComponent(id)}/proforma`, { 
      method: 'PUT', 
      body: piData, 
      token 
    });
  },

  async sendProformaInvoice(id, token) {
    return request(`/api/quotes/${encodeURIComponent(id)}/proforma/send`, { 
      method: 'POST', 
      token 
    });
  },

  async salesSendProformaInvoice(id, token) {
    return request(`/api/sales/proforma-invoices/${encodeURIComponent(id)}/send`, { 
      method: 'POST', 
      token 
    });
  },

  async confirmProformaInvoice(id, token) {
    return request(`/api/quotes/${encodeURIComponent(id)}/proforma/confirm`, { 
      method: 'POST', 
      token 
    });
  },

  async adminListUsers(token, { limit = 100, page = 1, role } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));
    if (role) params.set('role', role);
    return request(`/api/auth/admin/users?${params.toString()}`, { token });
  },

  async adminGetAttendance(token, { limit = 100, page = 1, role = 'mfg', search, startDate, endDate } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request(`/api/auth/admin/attendance?${params.toString()}`, { token });
  },

  async adminAddAttendanceBreak(token, attendanceId, { type, note = '' } = {}) {
    return request(`/api/auth/admin/attendance/${encodeURIComponent(attendanceId)}/breaks`, {
      method: 'POST',
      body: { type, note },
      token,
    });
  },

  async adminAddAttendanceMovement(token, attendanceId, { type, note = '' } = {}) {
    return request(`/api/auth/admin/attendance/${encodeURIComponent(attendanceId)}/movements`, {
      method: 'POST',
      body: { type, note },
      token,
    });
  },

  async adminClockOut(token, attendanceId) {
    return request(`/api/auth/admin/attendance/${encodeURIComponent(attendanceId)}/clock-out`, {
      method: 'POST',
      token,
    });
  },

  async mfgGetMyAttendance(token) {
    return request('/api/auth/mfg/attendance/me', { token });
  },

  async mfgGetAttendanceHistory(token, limit = 30) {
    return request(`/api/auth/mfg/attendance/history?limit=${limit}`, { token });
  },

  async mfgAddAttendanceBreak(token, { type, note = '' } = {}) {
    return request('/api/auth/mfg/attendance/me/breaks', {
      method: 'POST',
      body: { type, note },
      token,
    });
  },

  async mfgAddAttendanceMovement(token, { type, note = '' } = {}) {
    return request('/api/auth/mfg/attendance/me/movements', {
      method: 'POST',
      body: { type, note },
      token,
    });
  },

  async mfgSetOperatorName(token, operatorName) {
    return request('/api/auth/mfg/attendance/me/operator-name', {
      method: 'POST',
      body: { operatorName },
      token,
    });
  },

  async adminUpdateUserRole(token, userId, role) {
    return request(`/api/auth/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: { role },
      token,
    });
  },

  async adminToggleUserActive(token, userId, isActive) {
    return request(`/api/auth/admin/users/${encodeURIComponent(userId)}/activate`, {
      method: 'PATCH',
      body: { isActive },
      token,
    });
  },

  // Payment Methods
  async getPaymentMethod() {
    return request('/api/payment-methods');
  },

  async adminGetPaymentMethods(token) {
    return request('/api/payment-methods/admin', { token });
  },

  async adminCreatePaymentMethod(token, formData) {
    const res = await fetch(`${BASE_URL}/api/payment-methods`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async adminUpdatePaymentMethod(token, id, formData) {
    const res = await fetch(`${BASE_URL}/api/payment-methods/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async adminDeletePaymentMethod(token, id) {
    return request(`/api/payment-methods/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async adminUpdateOrderPaymentProofStatus(token, orderId, status, rejectionReason = '', reviewNotes = '') {
    return request(`/api/payment-methods/orders/${encodeURIComponent(orderId)}/proof-status`, {
      method: 'PUT',
      body: { status, rejectionReason, reviewNotes },
      token
    });
  },

  async uploadPaymentProof(formData, token) {
    const res = await fetch(`${BASE_URL}/api/payment-methods/upload-proof`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async adminUpdatePaymentProofStatus(token, quoteId, status, rejectionReason = '', reviewNotes = '') {
    const body = { status, rejectionReason, reviewNotes };
    return request(`/api/payment-methods/${encodeURIComponent(quoteId)}/proof-status`, {
      method: 'PUT',
      body,
      token
    });
  },

  // PCB Specifications
  async getPcbSpecifications() {
    return request('/api/pcb-specifications');
  },

  async adminGetPcbSpecifications(token) {
    return request('/api/pcb-specifications/admin', { token });
  },

  async adminCreatePcbMaterial(token, data) {
    return request('/api/pcb-specifications/materials', { method: 'POST', body: data, token });
  },

  async adminUpdatePcbMaterial(token, id, data) {
    return request(`/api/pcb-specifications/materials/${encodeURIComponent(id)}`, { method: 'PUT', body: data, token });
  },

  async adminDeletePcbMaterial(token, id) {
    return request(`/api/pcb-specifications/materials/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async adminCreatePcbFinish(token, data) {
    return request('/api/pcb-specifications/finishes', { method: 'POST', body: data, token });
  },

  async adminUpdatePcbFinish(token, id, data) {
    return request(`/api/pcb-specifications/finishes/${encodeURIComponent(id)}`, { method: 'PUT', body: data, token });
  },

  async adminDeletePcbFinish(token, id) {
    return request(`/api/pcb-specifications/finishes/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  // 3D Printing Specifications
  async getThreeDPrintingSpecifications() {
    return request('/api/3d-printing-specifications');
  },

  async adminGetThreeDPrintingSpecifications(token) {
    return request('/api/3d-printing-specifications/admin', { token });
  },

  async adminCreateThreeDPrintingTech(token, data) {
    return request('/api/3d-printing-specifications/techs', { method: 'POST', body: data, token });
  },

  async adminUpdateThreeDPrintingTech(token, id, data) {
    return request(`/api/3d-printing-specifications/techs/${encodeURIComponent(id)}`, { method: 'PUT', body: data, token });
  },

  async adminDeleteThreeDPrintingTech(token, id) {
    return request(`/api/3d-printing-specifications/techs/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async adminCreateThreeDPrintingMaterial(token, data) {
    return request('/api/3d-printing-specifications/materials', { method: 'POST', body: data, token });
  },

  async adminUpdateThreeDPrintingMaterial(token, id, data) {
    return request(`/api/3d-printing-specifications/materials/${encodeURIComponent(id)}`, { method: 'PUT', body: data, token });
  },

  async adminDeleteThreeDPrintingMaterial(token, id) {
    return request(`/api/3d-printing-specifications/materials/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async adminCreateThreeDPrintingResolution(token, data) {
    return request('/api/3d-printing-specifications/resolutions', { method: 'POST', body: data, token });
  },

  async adminUpdateThreeDPrintingResolution(token, id, data) {
    return request(`/api/3d-printing-specifications/resolutions/${encodeURIComponent(id)}`, { method: 'PUT', body: data, token });
  },

  async adminDeleteThreeDPrintingResolution(token, id) {
    return request(`/api/3d-printing-specifications/resolutions/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async adminCreateThreeDPrintingFinishing(token, data) {
    return request('/api/3d-printing-specifications/finishings', { method: 'POST', body: data, token });
  },

  async adminUpdateThreeDPrintingFinishing(token, id, data) {
    return request(`/api/3d-printing-specifications/finishings/${encodeURIComponent(id)}`, { method: 'PUT', body: data, token });
  },

  async adminDeleteThreeDPrintingFinishing(token, id) {
    return request(`/api/3d-printing-specifications/finishings/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  // Promotional Images
  async getPromotionalImages() {
    return request('/api/promotional-images');
  },

  async adminGetPromotionalImages(token) {
    return request('/api/promotional-images/admin', { token });
  },

  async adminCreatePromotionalImage(token, formData) {
    const res = await fetch(`${BASE_URL}/api/promotional-images`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async adminUpdatePromotionalImage(token, id, formData) {
    const res = await fetch(`${BASE_URL}/api/promotional-images/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async adminDeletePromotionalImage(token, id) {
    return request(`/api/promotional-images/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async trackPromotionalImageClick(id) {
    return request(`/api/promotional-images/${encodeURIComponent(id)}/click`, { method: 'PUT' });
  },

  async trackPromotionalImageView(id) {
    return request(`/api/promotional-images/${encodeURIComponent(id)}/view`, { method: 'PUT' });
  },
  // AI Pricing
  async getAiPricingSettings(token) {
    return request('/api/ai-pricing/settings', { token });
  },
  async updateAiPricingSettings(token, body) {
    return request('/api/ai-pricing/settings', { method: 'PUT', body, token });
  },
  async previewAiPricing(token, body) {
    return request('/api/ai-pricing/preview', { method: 'POST', body, token });
  },
  async runAiPricing(token, body = {}) {
    return request('/api/ai-pricing/run', { method: 'POST', body, token });
  },
  async getAiPricingStatus(token) {
    return request('/api/ai-pricing/status', { token });
  },
  async getAiPricingHistory(token) {
    return request('/api/ai-pricing/history', { token });
  },
  async getAiPricingRun(token, runId) {
    return request(`/api/ai-pricing/runs/${encodeURIComponent(runId)}`, { token });
  },
  async getAiPricingLatestRun(token) {
    return request('/api/ai-pricing/runs/latest', { token });
  },
  async deleteAiPricingRun(token, runId) {
    return request(`/api/ai-pricing/runs/${encodeURIComponent(runId)}`, { method: 'DELETE', token });
  },

  // DFM Exception Management
  async mfgListDfmExceptions(token, workOrderId) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/dfm-exceptions`, { token });
  },

  async mfgAddDfmException(token, workOrderId, exceptionData) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/dfm-exceptions`, {
      method: 'POST',
      body: exceptionData,
      token,
    });
  },

  async mfgUpdateDfmException(token, workOrderId, exceptionId, updates) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/dfm-exceptions/${encodeURIComponent(exceptionId)}`, {
      method: 'PATCH',
      body: updates,
      token,
    });
  },

  async mfgDeleteDfmException(token, workOrderId, exceptionId) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/dfm-exceptions/${encodeURIComponent(exceptionId)}`, {
      method: 'DELETE',
      token,
    });
  },

  // CAM Status Management
  async mfgUpdateCamStatus(token, workOrderId, statusData) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/cam-status`, {
      method: 'PATCH',
      body: statusData,
      token,
    });
  },

  // DFM Analytics
  // Film Management
  async filmList(token, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      qs.set(key, String(value));
    });
    const queryString = qs.toString();
    return request(`/api/film${queryString ? `?${queryString}` : ''}`, { token });
  },

  async filmSummary(token) {
    return request('/api/film/summary', { token });
  },

  async filmCreate(token, body) {
    return request('/api/film', { method: 'POST', body, token });
  },

  async filmCreateWithFile(token, formData) {
    const res = await fetch(`${BASE_URL}/api/film`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  async filmGet(token, id) {
    return request(`/api/film/${encodeURIComponent(id)}`, { token });
  },

  async filmUpdate(token, id, body) {
    return request(`/api/film/${encodeURIComponent(id)}`, { method: 'PUT', body, token });
  },

  async filmDelete(token, id) {
    return request(`/api/film/${encodeURIComponent(id)}`, { method: 'DELETE', token });
  },

  async filmUpload(token, id, formData) {
    const res = await fetch(`${BASE_URL}/api/film/${encodeURIComponent(id)}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },
  async mfgAnalytics(token) {
    return request('/api/mfg/analytics/dfm', { token });
  },

  // Job Card Management
  async mfgGetJobCards(token, workOrderId) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/job-cards`, { token });
  },

  async mfgApproveJobCard(token, workOrderId, filename, body) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/job-cards/${encodeURIComponent(filename)}/approve`, {
      method: 'PATCH',
      body,
      token,
    });
  },

  async mfgRejectJobCard(token, workOrderId, filename, body) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/job-cards/${encodeURIComponent(filename)}/reject`, {
      method: 'PATCH',
      body,
      token,
    });
  },

  async mfgAddJobCardComment(token, workOrderId, filename, body) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/job-cards/${encodeURIComponent(filename)}/comments`, {
      method: 'POST',
      body,
      token,
    });
  },

  async mfgUpdateJobCard(token, workOrderId, filename, formData) {
    const hasFile = formData.has('file');
    const endpoint = hasFile 
      ? `/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/job-cards/${encodeURIComponent(filename)}/update`
      : `/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/job-cards/${encodeURIComponent(filename)}/update-text-only`;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  // Assembly Card Generation
  async generateAssemblyCard(token, workOrderId, body = {}) {
    return request(`/api/mfg/work-orders/${encodeURIComponent(workOrderId)}/generate-assembly-card`, {
      method: 'POST',
      body,
      token,
    });
  },

  // Dispatch Management
  async mfgListDispatches(token, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      qs.set(key, String(value));
    });
    const queryString = qs.toString();
    return request(`/api/mfg/dispatches${queryString ? `?${queryString}` : ''}`, { token });
  },

  async mfgCreateDispatch(token, body) {
    return request('/api/mfg/dispatches', { method: 'POST', body, token });
  },

  async mfgApproveDispatch(token, id) {
    return request(`/api/mfg/dispatches/${encodeURIComponent(id)}/approve`, { method: 'PATCH', token });
  },

  async mfgRejectDispatch(token, id, body) {
    return request(`/api/mfg/dispatches/${encodeURIComponent(id)}/reject`, { method: 'PATCH', body, token });
  },

  async mfgUpdateDispatchStatus(token, id, body) {
    return request(`/api/mfg/dispatches/${encodeURIComponent(id)}/status`, { method: 'PATCH', body, token });
  },

  async mfgUploadDispatchDocument(token, id, formData) {
    const res = await fetch(`${BASE_URL}/api/mfg/dispatches/${encodeURIComponent(id)}/documents`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  },

  // Finance API methods
  async adminGetFinanceTransactions(token, queryParams = '') {
    const url = queryParams instanceof URLSearchParams
      ? `/api/finance/transactions?${queryParams.toString()}`
      : `/api/finance/transactions${queryParams ? `?${queryParams}` : ''}`;
    return request(url, { token });
  },

  async adminGetFinanceSummary(token, queryParams = '') {
    const url = queryParams instanceof URLSearchParams
      ? `/api/finance/reports/summary?${queryParams.toString()}`
      : `/api/finance/reports/summary${queryParams ? `?${queryParams}` : ''}`;
    return request(url, { token });
  },

  async adminUpdateTransactionStatus(token, transactionId, status) {
    return request(`/api/finance/transactions/${encodeURIComponent(transactionId)}/status`, {
      method: 'PUT',
      body: { status },
      token
    });
  },

  async adminUpdateTransactionPaymentProof(token, transactionId, action, rejectionReason = '') {
    return request(`/api/finance/transactions/${encodeURIComponent(transactionId)}/payment-proof`, {
      method: 'PUT',
      body: { status: action, rejectionReason },
      token
    });
  },

  async adminExportFinanceData(token, queryParams = '') {
    const url = queryParams instanceof URLSearchParams
      ? `/api/finance/reports/export?${queryParams.toString()}`
      : `/api/finance/reports/export${queryParams ? `?${queryParams}` : ''}`;

    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || data?.message || 'Request failed');
    }

    return res.text(); // Return CSV content as text
  },

  async adminProcessRefund(token, transactionId, refundData) {
    return request(`/api/finance/transactions/${encodeURIComponent(transactionId)}/refund`, {
      method: 'POST',
      body: refundData,
      token
    });
  },

  async adminSyncTransactions(token, type) {
    return request('/api/finance/transactions/sync', {
      method: 'POST',
      body: { type },
      token
    });
  },

  // Enquiry Management APIs
  async getEnquiries(token, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return request(`/api/sales/enquiries${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      token
    });
  },

  async createEnquiry(token, enquiryData) {
    return request('/api/sales/enquiries', {
      method: 'POST',
      body: enquiryData,
      token
    });
  },

  async updateEnquiry(token, enquiryId, updates) {
    return request(`/api/sales/enquiries/${enquiryId}`, {
      method: 'PUT',
      body: updates,
      token
    });
  },

  async deleteEnquiry(token, enquiryId) {
    return request(`/api/sales/enquiries/${enquiryId}`, {
      method: 'DELETE',
      token
    });
  },

  // Quote Management APIs
  async createQuote(token, quoteData) {
    return request('/api/sales/quotes', {
      method: 'POST',
      body: quoteData,
      token
    });
  },
};
