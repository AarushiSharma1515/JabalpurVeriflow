// services/carbonService.js

import axios from "axios";

// ⚠️ Put your ngrok URL here (no trailing slash)
const BASE_URL = "https://annabel-unperpetuated-unmythologically.ngrok-free.dev";

export const analyzePlantation = async ({ imageUri, startDate, endDate, manualHeight }) => {
  // Convert image to form-data
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "upload.jpg"
  });
  formData.append("start_date", startDate);
  formData.append("end_date", endDate);
  formData.append("manual_height", manualHeight);

  // Send POST request
  const response = await axios.post(`${BASE_URL}/api/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
