import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('fm_token');
      localStorage.removeItem('fm_user');
      if (!window.location.pathname.includes('/auth/')) window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  updateProfile: (d: any) => api.put('/auth/profile', d),
  changePassword: (d: any) => api.put('/auth/password', d),
};

export const lettersApi = {
  saveDraft: (data: any) => api.post('/letters/draft', data),
  publishDraft: (id: string, data: any) => api.post('/letters/draft/' + id + '/publish', data),
  getAll: (p?: any) => api.get('/letters', { params: p }),
  getOne: (id: string) => api.get(`/letters/${id}`),
  create: (d: any) => api.post('/letters', d),
  update: (id: string, d: any) => api.put(`/letters/${id}`, d),
  lock: (id: string) => api.post(`/letters/${id}/lock`),
  delete: (id: string) => api.delete(`/letters/${id}`),
  stats: () => api.get('/letters/stats/overview'),
  extend: (id: string, d: any) => api.put(`/letters/${id}/extend`, d),
};

export const collabApi = {
  invite: (letterId: string, email: string) => api.post(`/letters/${letterId}/invite`, { email }),
  getCollaborators: (letterId: string) => api.get(`/letters/${letterId}/collaborators`),
  removeCollaborator: (letterId: string, cId: string) => api.delete(`/letters/${letterId}/collaborators/${cId}`),
  acceptInvite: (token: string) => api.post(`/collaborate/accept/${token}`),
  contribute: (letterId: string, contribution: string) => api.put(`/collaborate/${letterId}/contribute`, { contribution }),
  myCollaborations: () => api.get('/my-collaborations'),
};

export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  timeline: () => api.get('/analytics/timeline'),
};

export const paymentApi = {
  getPlans: () => api.get('/plans'),
  checkout: (plan: string) => api.post('/checkout', { plan }),
  confirmPayment: (id: string) => api.post(`/payment/success/${id}`),
  getHistory: () => api.get('/payments'),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (p?: any) => api.get('/admin/users', { params: p }),
  letters: (p?: any) => api.get('/admin/letters', { params: p }),
  deliverLetter: (id: string) => api.post(`/admin/letters/${id}/deliver`),
  toggleUser: (id: string) => api.put(`/admin/users/${id}/toggle`),
  auditLogs: () => api.get('/admin/audit'),
};

export default api;

export const creditsApi = {
  packages: () => api.get('/credits/packages'),          // public - no auth needed
  balance: () => api.get('/credits/balance'),             // auth required
  purchase: (packageId: string) => api.post('/credits/purchase', { package_id: packageId }),
  confirm: (transactionId: string) => api.post(`/credits/confirm/${transactionId}`),
  transactions: () => api.get('/credits/transactions'),
};
