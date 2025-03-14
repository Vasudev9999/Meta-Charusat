import axios from "axios";

const API_URL = "https://localhost:5000/api/auth";

export const registerUser = async (userData) => {
  return await axios.post(`${API_URL}/register`, userData);
};

export const loginUser = async (userData) => {
  return await axios.post(`${API_URL}/login`, userData);
};

export const updateAvatar = async (data) => {
  return await axios.put(`${API_URL}/update-avatar`, data);
};