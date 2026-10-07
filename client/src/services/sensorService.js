import api from './api';

export const getSensors = async () => {
  const response = await api.get('/sensors');
  return response.data;
};

export const getSensorsByStation = async (stationId) => {
  const response = await api.get(`/stations/${stationId}/sensors`);
  return response.data;
};

export const getSensor = async (id) => {
  const response = await api.get(`/sensors/${id}`);
  return response.data;
};

export const createSensor = async (sensorData) => {
  const response = await api.post('/sensors', sensorData);
  return response.data;
};

export const updateSensor = async (id, sensorData) => {
  const response = await api.put(`/sensors/${id}`, sensorData);
  return response.data;
};

export const deleteSensor = async (id) => {
  const response = await api.delete(`/sensors/${id}`);
  return response.data;
};
