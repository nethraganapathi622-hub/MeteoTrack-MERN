import api from './api';

export const getMaintenanceRecords = async (params = {}) => {
  try {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) query.append(key, params[key]);
    });
    
    const res = await api.get(`/maintenance?${query.toString()}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMaintenanceSummary = async () => {
  try {
    const res = await api.get('/maintenance/summary');
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const createMaintenanceRecord = async (data) => {
  try {
    const res = await api.post('/maintenance', data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateMaintenanceRecord = async (id, data) => {
  try {
    const res = await api.put(`/maintenance/${id}`, data);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteMaintenanceRecord = async (id) => {
  try {
    const res = await api.delete(`/maintenance/${id}`);
    return res.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
