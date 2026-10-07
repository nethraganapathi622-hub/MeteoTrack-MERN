import api from './api';

export const getStations = async () => {
  const response = await api.get('/stations');
  return response.data;
};

export const getStation = async (id) => {
  const response = await api.get(`/stations/${id}`);
  return response.data;
};

export const createStation = async (stationData) => {
  const response = await api.post('/stations', stationData);
  return response.data;
};

export const updateStation = async (id, stationData) => {
  const response = await api.put(`/stations/${id}`, stationData);
  return response.data;
};

export const deleteStation = async (id) => {
  const response = await api.delete(`/stations/${id}`);
  return response.data;
};
