/**
 * Analyzes a food image using the new Antigravity FastAPI ML Service.
 * 
 * @param {File} imageFile - The uploaded image file.
 * @param {string} apiKey - (Legacy, ignored in new ML pipeline)
 * @returns {Promise<Object>} JSON object containing foodName, calories, protein, carbs, fat.
 */
export async function analyzeMealImage(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('user_id', 'demo_user'); // Hardcoded for hackathon MVP

  try {
    const mlApiBase = import.meta.env.VITE_ML_API_BASE || 'http://127.0.0.1:8000';
    const response = await fetch(`${mlApiBase}/api/analyze-meal`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ML Service Error: ${errorText}`);
    }

    const result = await response.json();
    return result; // contains foodName, calories, protein, carbs, fat

  } catch (error) {
    console.error("Vision Service Error:", error);
    throw new Error("Failed to analyze image with local ML Service. Ensure it is running on port 8000.");
  }
}
