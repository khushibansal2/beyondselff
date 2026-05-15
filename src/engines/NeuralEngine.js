import * as tf from '@tensorflow/tfjs';

export class NeuralEngine {
  constructor() {
    this.model = this.initModel();
  }

  initModel() {
    const model = tf.sequential();

    // Input Layer
    model.add(
      tf.layers.dense({
        units: 16,
        activation: 'relu',
        inputShape: [3],
      })
    );

    // Hidden Layer
    model.add(
      tf.layers.dense({
        units: 8,
        activation: 'sigmoid',
      })
    );

    // Output Layer
    model.add(
      tf.layers.dense({
        units: 2,
        activation: 'softmax',
      })
    );

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
    });

    return model;
  }

  async runInference(state) {
    return tf.tidy(() => {
      // 1. DATA EXTRACTION
      const rawHealth = state?.health?.score || 75;
      const rawFinance = state?.finance?.income || 50000;

      // Career inputs
      const study = parseFloat(state?.career?.studyHoursDaily || 0);
      const coding = parseFloat(state?.career?.codingHoursDaily || 0);

      const totalEffort = study + coding;

      // 2. NORMALIZATION
      let h = parseFloat(rawHealth) / 100;

      let f = Math.min(
        Math.log10(parseFloat(rawFinance) + 1) / 10,
        1
      );

      let c = Math.min(totalEffort / 12, 1);

      let trajectory = [];

      // 3. FUTURE PREDICTION LOOP
      for (let i = 0; i < 20; i++) {
        const inputTensor = tf.tensor2d([[h, f, c]]);

        const prediction = this.model.predict(inputTensor);

        const [stability, risk] = prediction.dataSync();

        trajectory.push({
          year: 2026 + i,
          stability: parseFloat((stability * 100).toFixed(2)),
          risk: parseFloat((risk * 100).toFixed(2)),
        });

        // Future evolution logic
        h = Math.max(0.05, h - risk * 0.02);

        f = Math.min(
          1,
          f + c * 0.05 * stability
        );
      }

      return trajectory;
    });
  }
}