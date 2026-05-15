// import api from "./api";

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// export const fetchSales = async (params = {}) => {
//   const { data } = await api.get("/sales", { params });
//   return data;
// };

// export const createSale = async (payload) => {
//   const { data } = await api.post("/sales", payload);
//   return data;
// };

// export const finalizeSale = async (saleId) => {
//   const { data } = await api.post(`/sales/${saleId}/finalize`);
//   return data;
// };

// // NEW: cancel a draft sale
// export const cancelSale = async (saleId) => {
//   const { data } = await api.post(`/sales/${saleId}/cancel`);
//   return data;
// };

// // NEW: returns URL for PDF download (used as <a href>)
// export const downloadInvoiceUrl = (saleId) => {
//   const token = localStorage.getItem("ims_token");
//   return `${API_BASE}/sales/${saleId}/invoice.pdf?token=${token}`;
// };


import api from "./api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const fetchSales = async (params = {}) => {
  const { data } = await api.get("/sales", { params });
  return data;
};

export const createSale = async (payload) => {
  const { data } = await api.post("/sales", payload);
  return data;
};

export const finalizeSale = async (saleId) => {
  const { data } = await api.post(`/sales/${saleId}/finalize`);
  return data;
};

export const cancelSale = async (saleId) => {
  const { data } = await api.post(`/sales/${saleId}/cancel`);
  return data;
};

// FIX: URL ends with /invoice.pdf — must match the backend route /:id/invoice.pdf
export const downloadInvoiceUrl = (saleId) => {
  const token = localStorage.getItem("ims_token");
  return `${API_BASE}/sales/${saleId}/invoice.pdf?token=${token}`;
};