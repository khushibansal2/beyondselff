// Nutrition Service — powered by Groq (meta-llama/llama-4-scout-17b-16e-instruct)
// Handles AI generation of Indian-focused daily meal plans.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

function getApiKey() {
  const key = import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || '';
  return key;
}

const INDIAN_FOOD_DATABASE = `
Breakfast items:
- Poha: ~250 cal (P: 5g, C: 45g, F: 6g)
- Upma: ~220 cal (P: 6g, C: 40g, F: 4g)
- Idli (2 pcs) with Sambar: ~180 cal (P: 6g, C: 35g, F: 2g)
- Dosa (Plain) with Chutney: ~280 cal (P: 6g, C: 45g, F: 8g)
- Aloo Paratha (1 pc) with Yogurt: ~320 cal (P: 9g, C: 48g, F: 10g)
- Paneer Paratha (1 pc): ~340 cal (P: 14g, C: 40g, F: 14g)
- Bread Omelette (2 eggs, 2 slices): ~350 cal (P: 18g, C: 28g, F: 16g)
- Masala Oats: ~180 cal (P: 6g, C: 30g, F: 4g)
- Boiled Eggs (2 pcs): ~140 cal (P: 12g, C: 1g, F: 10g)

Lunch/Dinner items:
- Dal Tadka (1 bowl) + Roti (2 pcs): ~380 cal (P: 15g, C: 65g, F: 8g)
- Rajma Chawal (1 bowl rajma, 1 cup rice): ~450 cal (P: 16g, C: 80g, F: 6g)
- Chole Bhature (2 pcs): ~600 cal (P: 16g, C: 75g, F: 25g)
- Paneer Butter Masala (1 bowl) + Roti (2 pcs): ~550 cal (P: 18g, C: 50g, F: 30g)
- Palak Paneer (1 bowl) + Roti (2 pcs): ~480 cal (P: 16g, C: 45g, F: 25g)
- Aloo Gobi (1 bowl) + Roti (2 pcs): ~320 cal (P: 8g, C: 55g, F: 10g)
- Kadhi Pakora (1 bowl) + Rice (1 cup): ~420 cal (P: 12g, C: 65g, F: 12g)
- Chicken Curry (1 bowl) + Roti (2 pcs): ~480 cal (P: 35g, C: 45g, F: 18g)
- Butter Chicken (1 bowl) + Naan (1 pc): ~650 cal (P: 30g, C: 60g, F: 32g)
- Fish Curry (1 bowl) + Rice (1 cup): ~450 cal (P: 28g, C: 55g, F: 14g)
- Egg Curry (2 eggs) + Roti (2 pcs): ~420 cal (P: 20g, C: 45g, F: 16g)
- Mutton Rogan Josh (1 bowl) + Roti (2 pcs): ~550 cal (P: 30g, C: 45g, F: 28g)
- Veg Biryani (1 bowl) + Raita: ~450 cal (P: 10g, C: 75g, F: 12g)
- Chicken Biryani (1 bowl) + Raita: ~550 cal (P: 35g, C: 65g, F: 16g)
- Khichdi (1 bowl) + Ghee: ~350 cal (P: 10g, C: 55g, F: 10g)

Snacks/Sides:
- Roasted Makhana (1 cup): ~100 cal (P: 3g, C: 20g, F: 1g)
- Roasted Chana (half cup): ~150 cal (P: 8g, C: 25g, F: 2g)
- Sprouts Chaat (1 bowl): ~120 cal (P: 8g, C: 20g, F: 1g)
- Samosa (1 pc): ~250 cal (P: 3g, C: 25g, F: 15g)
- Mixed Fruit Bowl: ~100 cal (P: 1g, C: 25g, F: 0g)
- Greek Yogurt / Dahi (1 cup): ~120 cal (P: 8g, C: 12g, F: 4g)
- Masala Chai (with milk & sugar): ~100 cal (P: 2g, C: 15g, F: 3g)
- Marie Biscuits (3 pcs): ~85 cal (P: 2g, C: 15g, F: 2g)
`;

function extractJson(raw) {
  let text = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

const CYCLE_PHASE_GUIDANCE = {
  menstrual: {
    name: 'Menstrual (Day 1–5)',
    focus: 'Iron & Anti-inflammatory',
    prioritize: 'iron-rich foods (spinach, lentils, dark leafy greens), anti-inflammatory spices (turmeric, ginger), dark chocolate, pumpkin seeds, magnesium-rich foods',
    avoid: 'caffeine, alcohol, high-sodium/salty snacks, processed/fried foods',
    calorie_note: 'Maintain normal caloric intake. Energy is lower — opt for easy-to-digest, comforting meals.',
  },
  follicular: {
    name: 'Follicular (Day 6–13)',
    focus: 'Light & Energizing',
    prioritize: 'fermented foods (dahi/yogurt, idli, dosa), flaxseeds, cruciferous vegetables (broccoli, cabbage), avocados, eggs, lean protein',
    avoid: 'heavy fried foods, excess sugar',
    calorie_note: 'Slightly lower caloric intake is fine. Metabolism is efficient and energy is building.',
  },
  ovulation: {
    name: 'Ovulation (Day 14–16)',
    focus: 'Raw & Fiber-rich',
    prioritize: 'raw fruits and vegetables, cruciferous vegetables, quinoa/brown rice, fish (salmon, sardines), flaxseeds, chia seeds',
    avoid: 'excess red meat, refined sugar, processed snacks',
    calorie_note: 'Normal caloric intake. Peak energy window — support with fiber-rich anti-inflammatory foods.',
  },
  luteal: {
    name: 'Luteal (Day 17–28)',
    focus: 'Complex Carbs & Magnesium',
    prioritize: 'sweet potato, oats, dark chocolate, spinach, bananas, chickpeas, lentils, whole grain foods — these stabilize blood sugar and boost serotonin',
    avoid: 'caffeine (worsens anxiety and sleep), alcohol, high-sodium foods (causes bloating), refined sugar (triggers mood swings)',
    calorie_note: 'Add +100–200 kcal to the target — cravings are real and biologically driven during this phase. Honour the hunger.',
  },
};

export async function generateMealPlan(profile, cyclePhase = null) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('[NutritionService] No API key found, returning demo meal plan');
    return getDemoMealPlan(profile);
  }

  let cuisineSpecificList = '';
  if (profile.cuisine === 'South Indian') {
    cuisineSpecificList = 'Allowed South Indian examples:\nBreakfast: Idli + sambar, Dosa + chutney, Upma, Pongal, Rava idli, Medu vada, Uttapam\nLunch: Rice + sambar + rasam + papad, Curd rice, Lemon rice, Bisibelebath, Kootu, Avial, Tamarind rice\nSnack: Murukku, Sundal, Banana, Buttermilk, Kozhukattai\nDinner: Idli + sambar, Set dosa, Ven pongal, Rice + dal + stir-fried sabzi (South Indian style)\n';
  } else if (profile.cuisine === 'North Indian') {
    cuisineSpecificList = 'Allowed North Indian examples: paratha, dal makhani, rajma chawal, paneer dishes, roti + sabzi, chole, etc.\n';
  } else if (profile.cuisine === 'Bengali') {
    cuisineSpecificList = 'Allowed Bengali examples: rice + fish curry, luchi + alur dom, khichuri, shorshe ilish, mishti doi, etc.\n';
  } else if (profile.cuisine === 'Maharashtrian') {
    cuisineSpecificList = 'Allowed Maharashtrian examples: poha, misal pav, varan bhaat, bharli vangi, puran poli, thalipeeth, etc.\n';
  }

  const themes = ["light and refreshing", "hearty and filling", "quick and easy", "high protein focus", "comfort food", "low oil and light"];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const seed = Math.random().toString(36).substring(7);

  const phaseInfo = cyclePhase ? CYCLE_PHASE_GUIDANCE[cyclePhase] : null;
  const effectiveCalories = phaseInfo?.calorie_note?.includes('+100') ? profile.targetCalories + 150 : profile.targetCalories;

  const prompt = `
You are an expert AI Nutritionist. The user wants a daily meal plan with 4 meals: Breakfast, Lunch, Snack, Dinner.
The meals should total approximately ${effectiveCalories} calories (±50 cal).

USER NUTRITION PROFILE:
- Dietary Preference: ${profile.dietaryPreference}
- Regional Cuisine: ${profile.cuisine}
- Food Allergies/Intolerances: ${profile.allergies || 'None'}
- Target Calories: ${effectiveCalories} kcal
${phaseInfo ? `- Menstrual Cycle Phase: ${phaseInfo.name} — ${phaseInfo.focus}` : ''}

INSTRUCTIONS:
1. You MUST only suggest meals from ${profile.cuisine} cuisine. Do not include any meals from other regional cuisines.
${cuisineSpecificList ? `2. Strictly use the following ${profile.cuisine} examples to guide your choices:\n${cuisineSpecificList}\nDo NOT suggest any meal that is not in the above allowed list or a close authentic variant of it. If you are unsure whether a dish belongs to ${profile.cuisine} cuisine, do not include it.` : '2. PRIORITIZE INDIAN MEALS. Do not suggest western food (like quinoa salads, protein shakes, plain grilled chicken breast with asparagus) unless absolutely necessary to hit macros or if requested by the user.'}
3. Ensure the meal plan respects the dietary preference (e.g. no chicken/meat for Veg, no dairy for Vegan).
4. Ensure no allergic foods are included.
5. Distribute calories roughly: Breakfast 25%, Lunch 35%, Snack 10%, Dinner 30%.
${phaseInfo ? `6. MENSTRUAL CYCLE PHASE GUIDANCE (IMPORTANT — follow this strictly):
   - Current phase: ${phaseInfo.name}
   - Focus: ${phaseInfo.focus}
   - PRIORITIZE these nutrients/foods in the plan: ${phaseInfo.prioritize}
   - AVOID or minimize: ${phaseInfo.avoid}
   - Calorie note: ${phaseInfo.calorie_note}
   - Weave phase-appropriate ingredients naturally into authentic ${profile.cuisine} meals. Do not suggest foreign items.
7. Use the provided Indian Food Database for accurate calorie/macro context:` : '6. Use the provided Indian Food Database for accurate calorie/macro context:'}

${INDIAN_FOOD_DATABASE}

Return ONLY a raw JSON object matching exactly this schema — no markdown, no backticks, no extra text:
{
  "meals": [
    {
      "type": "Breakfast",
      "name": "Food Name",
      "calories": 400,
      "description": "Short 1-line description or ingredients",
      "macros": { "protein": 15, "carbs": 50, "fat": 10 }
    },
    ...
  ],
  "totalCalories": 2000,
  "macros": {
    "protein": 75,
    "carbs": 250,
    "fat": 60
  }
  }
}

Today's plan variation seed: ${seed}. Make sure today's meals are completely different from a typical plan.
IMPORTANT: Do NOT repeat the same meal combinations you might have suggested before. Be creative and suggest a fresh variety of authentic ${profile.cuisine} meals each time.
Today's meal theme: ${theme}
`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[NutritionService] Quota exceeded, returning demo meal plan');
        return getDemoMealPlan(profile);
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from Groq');

    const result = extractJson(raw);
    
    // Ensure all required fields exist
    if (!result.meals || result.meals.length !== 4 || !result.macros) {
      throw new Error('Invalid JSON structure returned by AI');
    }

    return result;
  } catch (err) {
    console.error('[NutritionService] AI Meal Plan generation failed:', err);
    console.warn('[NutritionService] Returning demo meal plan due to error');
    return getDemoMealPlan(profile);
  }
}

function getDemoMealPlan(profile) {
  const isVeg = profile.dietaryPreference === 'Veg' || profile.dietaryPreference === 'Vegan';
  const cuisine = profile.cuisine || 'Pan-Indian';

  let plan = { meals: [], totalCalories: 0, macros: { protein: 0, carbs: 0, fat: 0 } };

  if (cuisine === 'South Indian') {
    plan = {
      meals: [
        { type: 'Breakfast', name: 'Idli & Sambar', calories: 350, description: 'Steamed rice cakes with lentil and vegetable stew', macros: { protein: 12, carbs: 65, fat: 4 } },
        { type: 'Lunch', name: isVeg ? 'Lemon Rice & Avial' : 'Rice, Sambar & Chicken Fry', calories: 650, description: isVeg ? 'Tangy lemon rice with mixed vegetable coconut stew' : 'White rice with lentil stew and South Indian spiced chicken fry', macros: { protein: isVeg ? 15 : 35, carbs: 100, fat: 18 } },
        { type: 'Snack', name: 'Sundal & Buttermilk', calories: 200, description: 'Spiced boiled chickpeas with a glass of spiced buttermilk', macros: { protein: 8, carbs: 30, fat: 4 } },
        { type: 'Dinner', name: isVeg ? 'Dosa & Coconut Chutney' : 'Set Dosa & Fish Curry', calories: 650, description: isVeg ? 'Crispy fermented crepe with fresh coconut dip' : 'Soft dosas with tangy fish curry', macros: { protein: isVeg ? 12 : 30, carbs: 90, fat: 20 } }
      ],
      totalCalories: 1850,
      macros: { protein: isVeg ? 47 : 85, carbs: 285, fat: 46 }
    };
  } else if (cuisine === 'North Indian') {
    plan = {
      meals: [
        { type: 'Breakfast', name: 'Aloo Paratha & Yogurt', calories: 450, description: 'Whole wheat flatbread stuffed with spiced potatoes, served with curd', macros: { protein: 12, carbs: 60, fat: 16 } },
        { type: 'Lunch', name: isVeg ? 'Rajma Chawal' : 'Butter Chicken & Naan', calories: 700, description: isVeg ? 'Kidney bean curry with steamed rice' : 'Rich creamy chicken curry with flatbread', macros: { protein: isVeg ? 22 : 40, carbs: 110, fat: 18 } },
        { type: 'Snack', name: 'Roasted Makhana', calories: 150, description: 'Roasted fox nuts with mild spices', macros: { protein: 4, carbs: 28, fat: 2 } },
        { type: 'Dinner', name: isVeg ? 'Dal Makhani & Roti' : 'Egg Curry & Roti', calories: 550, description: isVeg ? 'Slow-cooked black lentils with 2 whole wheat rotis' : 'Spiced egg curry with 2 whole wheat rotis', macros: { protein: isVeg ? 18 : 22, carbs: 80, fat: 16 } }
      ],
      totalCalories: 1850,
      macros: { protein: isVeg ? 56 : 78, carbs: 278, fat: 52 }
    };
  } else if (cuisine === 'Bengali') {
    plan = {
      meals: [
        { type: 'Breakfast', name: 'Luchi & Alur Dom', calories: 450, description: 'Deep fried flatbreads with rich potato curry', macros: { protein: 8, carbs: 60, fat: 20 } },
        { type: 'Lunch', name: isVeg ? 'Khichuri & Begun Bhaja' : 'Rice & Shorshe Ilish', calories: 700, description: isVeg ? 'Lentil and rice porridge with fried eggplant' : 'White rice with Hilsa fish in mustard gravy', macros: { protein: isVeg ? 18 : 35, carbs: 100, fat: 22 } },
        { type: 'Snack', name: 'Mishti Doi & Jhal Muri', calories: 250, description: 'Sweetened yogurt and spicy puffed rice', macros: { protein: 6, carbs: 45, fat: 4 } },
        { type: 'Dinner', name: isVeg ? 'Chholar Dal & Roti' : 'Chicken Dak Bungalow & Roti', calories: 450, description: isVeg ? 'Bengal gram dal with coconut and 2 rotis' : 'Rustic chicken curry with 2 rotis', macros: { protein: isVeg ? 15 : 30, carbs: 65, fat: 12 } }
      ],
      totalCalories: 1850,
      macros: { protein: isVeg ? 47 : 79, carbs: 270, fat: 58 }
    };
  } else if (cuisine === 'Maharashtrian') {
    plan = {
      meals: [
        { type: 'Breakfast', name: 'Kanda Poha', calories: 350, description: 'Flattened rice cooked with onions, peanuts, and spices', macros: { protein: 6, carbs: 55, fat: 10 } },
        { type: 'Lunch', name: isVeg ? 'Varan Bhaat & Batata Bhaji' : 'Chicken Malvani & Bhakri', calories: 650, description: isVeg ? 'Simple dal and rice with dry potato sabzi' : 'Spicy Malvani chicken curry with pearl millet flatbread', macros: { protein: isVeg ? 18 : 42, carbs: 100, fat: 12 } },
        { type: 'Snack', name: 'Kothimbir Vadi', calories: 250, description: 'Crispy coriander and gram flour cakes', macros: { protein: 8, carbs: 30, fat: 10 } },
        { type: 'Dinner', name: 'Misal Pav', calories: 600, description: 'Spicy sprouted moth bean curry served with bread rolls', macros: { protein: 16, carbs: 80, fat: 22 } }
      ],
      totalCalories: 1850,
      macros: { protein: isVeg ? 48 : 72, carbs: 265, fat: 54 }
    };
  } else {
    // Pan-Indian / Default
    plan = {
      meals: [
        { type: 'Breakfast', name: isVeg ? 'Poha & Masala Chai' : 'Bread Omelette & Chai', calories: 350, description: isVeg ? 'Flattened rice with peanuts and spices' : '2 eggs with 2 slices of bread and spices', macros: { protein: isVeg ? 7 : 20, carbs: 60, fat: 9 } },
        { type: 'Lunch', name: isVeg ? 'Dal Tadka, Aloo Gobi & Roti' : 'Chicken Curry & Roti', calories: 700, description: isVeg ? 'Yellow lentils with cauliflower potato curry and 3 whole wheat rotis' : 'Spiced chicken curry with 3 whole wheat rotis', macros: { protein: isVeg ? 23 : 45, carbs: 120, fat: 18 } },
        { type: 'Snack', name: 'Roasted Makhana & Fruit', calories: 200, description: 'Roasted fox nuts with a bowl of mixed fruits', macros: { protein: 4, carbs: 45, fat: 1 } },
        { type: 'Dinner', name: isVeg ? 'Palak Paneer & Roti' : 'Fish Curry & Rice', calories: 600, description: isVeg ? 'Spinach and cottage cheese curry with 2 rotis' : 'Light fish curry with 1 cup of white rice', macros: { protein: isVeg ? 20 : 32, carbs: 70, fat: 28 } }
      ],
      totalCalories: 1850,
      macros: { protein: isVeg ? 54 : 101, carbs: 295, fat: 56 }
    };
  }

  // Simple scaling if target calories are far off
  const scale = profile.targetCalories / plan.totalCalories;
  
  plan.totalCalories = Math.round(plan.totalCalories * scale);
  plan.macros.protein = Math.round(plan.macros.protein * scale);
  plan.macros.carbs = Math.round(plan.macros.carbs * scale);
  plan.macros.fat = Math.round(plan.macros.fat * scale);
  
  plan.meals = plan.meals.map(m => ({
    ...m,
    calories: Math.round(m.calories * scale),
    macros: {
      protein: Math.round(m.macros.protein * scale),
      carbs: Math.round(m.macros.carbs * scale),
      fat: Math.round(m.macros.fat * scale)
    }
  }));

  return new Promise(resolve => setTimeout(() => resolve(plan), 1500)); // Simulate network delay
}

export async function regenerateSingleMeal(profile, mealType, currentMealName, cyclePhase = null) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('[NutritionService] No API key found, returning demo single meal');
    return getDemoSingleMeal(profile, mealType, currentMealName);
  }

  const phaseInfo = cyclePhase ? CYCLE_PHASE_GUIDANCE[cyclePhase] : null;

  const prompt = `
You are an expert AI Nutritionist. The user does not want to eat "${currentMealName}" for ${mealType} today.

Suggest ONE alternative ${mealType} meal only.
- Cuisine: ${profile.cuisine} ONLY. No other cuisine.
- Dietary preference: ${profile.dietaryPreference}
- Allergies: ${profile.allergies || 'None'}
- Target calories for this meal: ${mealType === 'Breakfast' ? '25%' : mealType === 'Lunch' ? '35%' : mealType === 'Snack' ? '10%' : '30%'} of ${profile.targetCalories} kcal
- The suggested meal MUST be different from "${currentMealName}"
- Be creative, suggest something fresh and authentic.
${phaseInfo ? `- MENSTRUAL CYCLE PHASE: ${phaseInfo.name}. PRIORITIZE: ${phaseInfo.prioritize}. AVOID: ${phaseInfo.avoid}.` : ''}

Return ONLY a raw JSON object, no markdown, no backticks:
{
  "type": "${mealType}",
  "name": "Food Name",
  "calories": 400,
  "description": "Short 1-line description",
  "macros": { "protein": 15, "carbs": 50, "fat": 10 }
}
`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[NutritionService] Quota exceeded, returning demo single meal');
        return getDemoSingleMeal(profile, mealType, currentMealName);
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from Groq');

    const result = extractJson(raw);
    if (!result.name || !result.calories || !result.macros) {
      throw new Error('Invalid JSON structure returned by AI for single meal');
    }

    return result;
  } catch (err) {
    console.error('[NutritionService] AI Single Meal generation failed:', err);
    console.warn('[NutritionService] Returning demo single meal due to error');
    return getDemoSingleMeal(profile, mealType, currentMealName);
  }
}

function getDemoSingleMeal(profile, mealType, currentMealName) {
  // Return a generic alternative based on type
  const isVeg = profile.dietaryPreference === 'Veg' || profile.dietaryPreference === 'Vegan';
  const targetCals = profile.targetCalories * (mealType === 'Breakfast' ? 0.25 : mealType === 'Lunch' ? 0.35 : mealType === 'Snack' ? 0.10 : 0.30);
  
  let name = isVeg ? `Alternative Veg ${mealType}` : `Alternative Non-Veg ${mealType}`;
  let description = `A fresh alternative to ${currentMealName}`;
  
  if (mealType === 'Breakfast') {
    name = isVeg ? 'Masala Oats & Fruits' : 'Scrambled Eggs & Toast';
    description = isVeg ? 'Spiced savory oats with a side of mixed fruits' : '3 soft scrambled eggs with whole wheat toast';
  } else if (mealType === 'Lunch') {
    name = isVeg ? 'Veg Pulao & Raita' : 'Chicken Keema & Roti';
    description = isVeg ? 'Fragrant rice cooked with mixed vegetables and served with yogurt' : 'Minced spiced chicken served with 2 whole wheat rotis';
  } else if (mealType === 'Snack') {
    name = 'Sprouts Chaat';
    description = 'Tangy mixed bean sprouts with tomatoes and onions';
  } else {
    name = isVeg ? 'Paneer Bhurji & Roti' : 'Grilled Fish & Veggies';
    description = isVeg ? 'Scrambled cottage cheese with spices and 2 rotis' : 'Pan-seared fish with seasonal vegetables';
  }

  // Avoid identical name
  if (name === currentMealName) name = "Spiced " + name;

  const meal = {
    type: mealType,
    name,
    calories: Math.round(targetCals),
    description,
    macros: {
      protein: Math.round((targetCals * 0.3) / 4),
      carbs: Math.round((targetCals * 0.45) / 4),
      fat: Math.round((targetCals * 0.25) / 9)
    }
  };

  return new Promise(resolve => setTimeout(() => resolve(meal), 1000));
}
