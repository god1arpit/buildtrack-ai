/**
 * AI Summarizer and Project Insights Engine
 * Generates structured, professional site summaries and predictive analytics
 */

export const generateDailyAISummary = ({
  projectName,
  date,
  workersPresent,
  totalWorkers,
  completedTasks = [],
  description = "",
  issues = "",
  materialsReceived = "",
  tomorrowPlan = "",
  overtimeWorkersCount = 0,
}) => {
  const parts = [];

  // Attendance part
  if (totalWorkers > 0) {
    const attendancePct = Math.round((workersPresent / totalWorkers) * 100);
    parts.push(
      `${workersPresent} out of ${totalWorkers} workers attended on-site today (${attendancePct}% turnout).`
    );
  } else {
    parts.push(`${workersPresent} workers logged active shifts today.`);
  }

  // Work done & tasks
  if (completedTasks.length > 0) {
    parts.push(`Key milestones completed include: ${completedTasks.join(", ")}.`);
  } else if (description) {
    parts.push(`Work progress: ${description}`);
  }

  // Overtime
  if (overtimeWorkersCount > 0) {
    parts.push(`${overtimeWorkersCount} worker(s) clocked approved overtime hours.`);
  }

  // Materials
  if (materialsReceived) {
    parts.push(`Material receipts: ${materialsReceived}.`);
  }

  // Issues & Bottlenecks
  if (issues && issues.trim().length > 0) {
    parts.push(`⚠️ Site Alert / Bottleneck: ${issues}`);
  } else {
    parts.push("No major blockers or safety hazards reported.");
  }

  // Tomorrow Plan
  if (tomorrowPlan) {
    parts.push(`Next day agenda: ${tomorrowPlan}`);
  }

  return parts.join(" ");
};

export const generateProjectInsights = (project, stats) => {
  const insights = [];

  // Progress pacing
  if (project.overallProgress < 30) {
    insights.push({
      type: "info",
      title: "Foundation & Early Phase",
      message: `${project.name} is in structural setup phase (${project.overallProgress}% complete). Reinforce steel and cement supply chains to prevent downtime.`,
    });
  } else if (project.overallProgress >= 70) {
    insights.push({
      type: "success",
      title: "Finishing Phase Approaching",
      message: `Project has achieved ${project.overallProgress}% completion. Begin procurement for finishing fixtures, electrical switchgear, and sanitary ware.`,
    });
  }

  // Attendance velocity
  if (stats.averageAttendanceRate && stats.averageAttendanceRate < 75) {
    insights.push({
      type: "warning",
      title: "Labour Absenteeism Risk",
      message: `Average daily turnout is currently ${stats.averageAttendanceRate}%. Consider reviewing subcontractor quotas or scheduling extra shifts to meet target deadlines.`,
    });
  }

  // Pending wages
  if (stats.totalPendingWages > 50000) {
    insights.push({
      type: "critical",
      title: "High Pending Wages Alert",
      message: `₹${stats.totalPendingWages.toLocaleString("en-IN")} in pending wage liabilities. Timely wage disbursement improves on-site productivity and retention.`,
    });
  }

  return insights;
};
