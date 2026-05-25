// Deterministic trajectory engine — no ML library needed.
// Models 20-year stability/risk projection from current health, finance, and career data.
export class NeuralEngine {
  async runInference(state) {
    const healthScore = state?.computed?.healthScore?.score ?? state?.health?.score ?? 75;
    const rawFinance  = state?.finance?.income || 50000;
    const study  = parseFloat(state?.career?.studyHoursDaily  || 0);
    const coding = parseFloat(state?.career?.codingHoursDaily || 0);
    const burnout = state?.computed?.burnout?.risk ?? 0;
    const finScore = state?.computed?.financeScore?.score ?? 50;
    const carScore = state?.computed?.careerScore?.score  ?? 50;

    // Normalize inputs to 0-1
    let h = Math.min(1, Math.max(0, healthScore / 100));
    let f = Math.min(1, Math.max(0, finScore    / 100));
    let c = Math.min(1, Math.max(0, carScore    / 100));
    const effort = Math.min(1, (study + coding) / 12);
    const burnoutPenalty = burnout / 100;

    const trajectory = [];

    for (let i = 0; i < 20; i++) {
      // Stability: how sustainable the current life trajectory is
      const stability = Math.round(
        Math.min(100, Math.max(0,
          (h * 0.35 + f * 0.35 + c * 0.30) * 100
          - burnoutPenalty * 15
          + i * 0.5   // slight upward drift as habits compound
        ))
      );

      // Risk: inverse pressure — burnout, low health, financial stress
      const risk = Math.round(
        Math.min(100, Math.max(0,
          100 - stability
          + burnoutPenalty * 10
          - i * 0.3   // risk reduces as stability compounds
        ))
      );

      trajectory.push({ year: 2026 + i, stability, risk });

      // Evolution: career effort drives finance; burnout degrades health
      h = Math.max(0.05, Math.min(1, h + 0.008 * (1 - burnoutPenalty) - 0.003 * (risk / 100)));
      f = Math.max(0.05, Math.min(1, f + effort * 0.012 * (stability / 100)));
      c = Math.max(0.05, Math.min(1, c + effort * 0.010 - 0.004 * burnoutPenalty));
    }

    return trajectory;
  }
}
