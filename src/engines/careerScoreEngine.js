/**
 * Career Score Engine — Deterministic scoring for career domain.
 * 
 * Rules:
 * - No Math.random() — same input always produces same output
 * - Exposes contributing factors for explainability
 * - All outputs are deterministic and testable
 */

import { safeNum } from '../utils/safeMath.js';

/**
 * Calculate career score from career data.
 * Returns: { score, factors[], placementReadiness, trends[], sources[] }
 */
export function computeCareerScore(careerData, careerRecords = []) {
  const c = careerData || {};

  const studyHoursDaily = safeNum(c.studyHoursDaily, 3);
  const codingHoursDaily = safeNum(c.codingHoursDaily, 2);
  const dsaPractice = safeNum(c.dsaPractice, 1);
  const projectsCompleted = safeNum(c.projectsCompleted, 1);
  const skills = Array.isArray(c.skills) ? c.skills : [];
  const gpa = safeNum(c.gpa, 7);
  const coursesActive = safeNum(c.coursesActive, 1);

  // Factor scores (0-100 each)
  const studyScore = Math.min(100, Math.max(0, (studyHoursDaily / 6) * 100));
  const codingScore = Math.min(100, Math.max(0, (codingHoursDaily / 5) * 100));
  const dsaScore = Math.min(100, Math.max(0, (dsaPractice / 3) * 100));
  const projectScore = Math.min(100, Math.max(0, (projectsCompleted / 5) * 100));
  const skillScore = Math.min(100, Math.max(0, (skills.length / 6) * 100));
  const gpaScore = Math.min(100, Math.max(0, (gpa / 10) * 100));

  const factors = [
    { name: 'Study Hours', value: studyHoursDaily, unit: 'h/day', weight: 0.20, rawScore: Math.round(studyScore), status: studyHoursDaily >= 4 ? 'good' : studyHoursDaily >= 2 ? 'warning' : 'critical' },
    { name: 'Coding Practice', value: codingHoursDaily, unit: 'h/day', weight: 0.20, rawScore: Math.round(codingScore), status: codingHoursDaily >= 3 ? 'good' : codingHoursDaily >= 1 ? 'warning' : 'critical' },
    { name: 'DSA Practice', value: dsaPractice, unit: 'problems/day', weight: 0.20, rawScore: Math.round(dsaScore), status: dsaPractice >= 3 ? 'good' : dsaPractice >= 1 ? 'warning' : 'critical' },
    { name: 'Projects', value: projectsCompleted, unit: 'completed', weight: 0.20, rawScore: Math.round(projectScore), status: projectsCompleted >= 4 ? 'good' : projectsCompleted >= 2 ? 'warning' : 'critical' },
    { name: 'Skills Breadth', value: skills.length, unit: 'skills', weight: 0.10, rawScore: Math.round(skillScore), status: skills.length >= 5 ? 'good' : skills.length >= 3 ? 'warning' : 'critical' },
    { name: 'Academic', value: gpa, unit: 'GPA', weight: 0.10, rawScore: Math.round(gpaScore), status: gpa >= 8 ? 'good' : gpa >= 6 ? 'warning' : 'critical' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.rawScore * f.weight, 0));
  factors.forEach(f => { f.contribution = Math.round(f.rawScore * f.weight); });

  // Placement readiness is a separate derived metric
  const placementReadiness = computePlacementReadiness(c);

  // Skill gap analysis
  const skillGaps = computeSkillGaps(skills);

  const trends = computeCareerTrends(careerRecords);

  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
    placementReadiness,
    skillGaps,
    trends,
    summary: { studyHoursDaily, codingHoursDaily, dsaPractice, projectsCompleted, skills, gpa, coursesActive },
    sources: buildCareerSources(careerRecords, c),
  };
}

/**
 * Compute placement readiness as a percentage.
 * Based on industry benchmarks for top-tier placements.
 */
function computePlacementReadiness(c) {
  const dsaReady = c.dsaPractice >= 3 ? 25 : Math.round(c.dsaPractice * 8);
  const projectsReady = c.projectsCompleted >= 4 ? 25 : Math.round(c.projectsCompleted * 6);
  const skillsReady = (c.skills?.length ?? 0) >= 5 ? 25 : Math.round((c.skills?.length ?? 0) * 5);
  const codingReady = c.codingHoursDaily >= 4 ? 25 : Math.round(c.codingHoursDaily * 6);

  const readiness = Math.min(100, dsaReady + projectsReady + skillsReady + codingReady);

  return {
    score: readiness,
    level: readiness >= 75 ? 'strong' : readiness >= 50 ? 'developing' : 'needs-work',
    breakdown: [
      { area: 'DSA', score: dsaReady, max: 25 },
      { area: 'Projects', score: projectsReady, max: 25 },
      { area: 'Skills', score: skillsReady, max: 25 },
      { area: 'Coding', score: codingReady, max: 25 },
    ],
  };
}

/**
 * Identify skill gaps compared to industry expectations.
 */
function computeSkillGaps(currentSkills) {
  const targetSkills = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Docker', 'AWS', 'TypeScript', 'System Design', 'MongoDB'];
  const missing = targetSkills.filter(s => !currentSkills.some(cs => cs.toLowerCase() === s.toLowerCase()));
  const have = targetSkills.filter(s => currentSkills.some(cs => cs.toLowerCase() === s.toLowerCase()));

  return {
    missing: missing.slice(0, 5), // Top 5 gaps
    matched: have,
    coverage: Math.round((have.length / targetSkills.length) * 100),
  };
}

/**
 * Compute career trends from records.
 */
function computeCareerTrends(records) {
  if (!records || records.length < 3) return [];
  const trends = [];

  const recent = records.slice(-7);
  const older = records.slice(-14, -7);

  if (recent.length > 0 && older.length > 0) {
    const recentStudy = avg(recent.map(r => r.studyHours).filter(Boolean));
    const olderStudy = avg(older.map(r => r.studyHours).filter(Boolean));
    if (recentStudy != null && olderStudy != null) {
      const delta = recentStudy - olderStudy;
      trends.push({
        metric: 'Study Hours',
        direction: delta > 0.5 ? 'improving' : delta < -0.5 ? 'declining' : 'stable',
        delta: Math.round(delta * 10) / 10,
        recentAvg: Math.round(recentStudy * 10) / 10,
      });
    }
  }

  return trends;
}

function buildCareerSources(records, summaryData) {
  const sources = [];
  if (records && records.length > 0) sources.push(`${records.length} career activity records`);
  if (summaryData && Object.keys(summaryData).length > 0) sources.push('User career profile');
  return sources;
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
