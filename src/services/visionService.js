import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Converts a File object to the base64 format required by the Gemini API.
 */
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Analyzes a food image using Gemini Vision to estimate calories and macros.
 * 
 * @param {File} imageFile - The uploaded image file.
 * @param {string} apiKey - The Gemini API Key.
 * @returns {Promise<Object>} JSON object containing foodName, calories, protein, carbs, fat.
 */
export async function analyzeMealImage(imageFile, apiKey) {
  if (!apiKey) {
    throw new Error("No API key provided. Please configure your Gemini API Key.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert nutritionist AI. Analyze the food in this image.
      Identify what the meal is and estimate its nutritional value.
      Return the result STRICTLY as a raw JSON object with no markdown formatting, no backticks, and no extra text.
      The JSON object must have the following keys:
      - "foodName": A short descriptive name of the meal (string).
      - "calories": Estimated total calories (integer).
      - "protein": Estimated protein in grams (integer).
      - "carbs": Estimated carbohydrates in grams (integer).
      - "fat": Estimated fat in grams (integer).
      
      Example valid response:
      {"foodName": "Grilled Chicken Salad", "calories": 350, "protein": 45, "carbs": 12, "fat": 15}
    `;

    const imagePart = await fileToGenerativePart(imageFile);
    
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Clean up response in case the model wraps it in markdown despite instructions
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(cleanedText);

  } catch (error) {
    console.error("Vision Service Error:", error);
    throw new Error("Failed to analyze image. Ensure your API key is valid and the image is clear.");
  }
}
