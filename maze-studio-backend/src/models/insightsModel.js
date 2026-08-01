const pool = require("../config/db");

const scopeCte = `
  WITH owned AS (
    SELECT id,title,status,updated_at FROM learning_journeys
    WHERE owner_user_id=$1::uuid AND status<>'ARCHIVED'
      AND ($2::uuid IS NULL OR id=$2::uuid)
      AND ($3::uuid IS NULL OR EXISTS (
        SELECT 1 FROM learning_paths selected_path
        JOIN journey_enrollments selected_enrollment ON selected_enrollment.id=selected_path.enrollment_id
        WHERE selected_path.id=$3::uuid AND selected_enrollment.learning_journey_id=learning_journeys.id
      ))
  ), scoped_enrollments AS (
    SELECT enrollment.* FROM journey_enrollments enrollment
    JOIN owned ON owned.id=enrollment.learning_journey_id
    WHERE enrollment.status IN ('ACTIVE','COMPLETED')
      AND ($3::uuid IS NULL OR EXISTS (
        SELECT 1 FROM learning_paths path
        WHERE path.id=$3::uuid AND path.enrollment_id=enrollment.id AND path.status<>'ARCHIVED'
      ))
  ), eligible_steps AS (
    SELECT enrollment.id enrollment_id,step.id step_id
    FROM scoped_enrollments enrollment
    JOIN stages stage ON stage.learning_journey_id=enrollment.learning_journey_id
    JOIN steps step ON step.stage_id=stage.id AND step.status='PUBLISHED'
    WHERE $3::uuid IS NULL OR EXISTS (
      SELECT 1 FROM learning_path_items item
      WHERE item.learning_path_id=$3::uuid AND item.step_id=step.id
    )
  )`;

async function getOverview(educatorId, { journeyId = null, pathId = null } = {}) {
  const params = [educatorId, journeyId || null, pathId || null];
  const [summary, journeys, learners, activity, journeyFilters, pathFilters, finance] = await Promise.all([
    pool.query(`${scopeCte}, enrollment_progress AS (
      SELECT enrollment.id,enrollment.status,COUNT(DISTINCT eligible.step_id)::int total_steps,
        COUNT(DISTINCT eligible.step_id) FILTER (WHERE progress.status='COMPLETED')::int completed_steps,
        MAX(COALESCE(progress.last_accessed_at,progress.completed_at,progress.started_at,enrollment.updated_at)) last_activity
      FROM scoped_enrollments enrollment
      LEFT JOIN eligible_steps eligible ON eligible.enrollment_id=enrollment.id
      LEFT JOIN step_progress progress ON progress.enrollment_id=enrollment.id AND progress.step_id=eligible.step_id
      GROUP BY enrollment.id,enrollment.status
    ) SELECT (SELECT COUNT(*)::int FROM owned) journeys,COUNT(*)::int enrollments,
      COUNT(*) FILTER (WHERE status='COMPLETED')::int completed_enrollments,
      COALESCE(ROUND(AVG(CASE WHEN total_steps>0 THEN completed_steps*100.0/total_steps ELSE 0 END)),0)::int average_progress,
      COUNT(*) FILTER (WHERE status='ACTIVE' AND (last_activity IS NULL OR last_activity<NOW()-INTERVAL '14 days'))::int learners_at_risk
    FROM enrollment_progress`, params),
    pool.query(`${scopeCte}, progress AS (
      SELECT enrollment.learning_journey_id,enrollment.id,COUNT(DISTINCT eligible.step_id)::int total_steps,
        COUNT(DISTINCT eligible.step_id) FILTER (WHERE step_progress.status='COMPLETED')::int completed_steps,
        MAX(COALESCE(step_progress.last_accessed_at,step_progress.completed_at,step_progress.started_at,enrollment.updated_at)) last_activity
      FROM scoped_enrollments enrollment LEFT JOIN eligible_steps eligible ON eligible.enrollment_id=enrollment.id
      LEFT JOIN step_progress ON step_progress.enrollment_id=enrollment.id AND step_progress.step_id=eligible.step_id
      GROUP BY enrollment.learning_journey_id,enrollment.id
    ) SELECT owned.id,owned.title,owned.status,COUNT(progress.id)::int students,
      COALESCE(MAX(progress.total_steps),0)::int total_steps,
      COALESCE(ROUND(AVG(CASE WHEN progress.total_steps>0 THEN progress.completed_steps*100.0/progress.total_steps ELSE 0 END)),0)::int average_progress,
      MAX(progress.last_activity) last_activity FROM owned LEFT JOIN progress ON progress.learning_journey_id=owned.id
      GROUP BY owned.id,owned.title,owned.status,owned.updated_at ORDER BY students DESC,owned.updated_at DESC`, params),
    pool.query(`${scopeCte} SELECT profile.id,CONCAT_WS(' ',profile.first_name,profile.last_name) name,
      profile.status profile_status,owned.title journey_title,enrollment.status,
      COUNT(DISTINCT eligible.step_id)::int total_steps,
      COUNT(DISTINCT eligible.step_id) FILTER (WHERE progress.status='COMPLETED')::int completed_steps,
      CASE WHEN COUNT(DISTINCT eligible.step_id)>0 THEN ROUND(COUNT(DISTINCT eligible.step_id) FILTER (WHERE progress.status='COMPLETED')*100.0/COUNT(DISTINCT eligible.step_id))::int ELSE 0 END progress,
      MAX(COALESCE(progress.last_accessed_at,progress.completed_at,progress.started_at,enrollment.updated_at)) last_activity
      FROM scoped_enrollments enrollment JOIN owned ON owned.id=enrollment.learning_journey_id
      JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      LEFT JOIN eligible_steps eligible ON eligible.enrollment_id=enrollment.id
      LEFT JOIN step_progress progress ON progress.enrollment_id=enrollment.id AND progress.step_id=eligible.step_id
      GROUP BY profile.id,owned.title,enrollment.id,enrollment.status ORDER BY progress ASC,last_activity ASC NULLS FIRST LIMIT 8`, params),
    pool.query(`${scopeCte}, events AS (
      SELECT 'STEP' type,CONCAT_WS(' ',profile.first_name,profile.last_name) learner,step.title item,owned.title journey,
        COALESCE(progress.last_accessed_at,progress.completed_at,progress.started_at) occurred_at,progress.status detail
      FROM step_progress progress JOIN scoped_enrollments enrollment ON enrollment.id=progress.enrollment_id
      JOIN owned ON owned.id=enrollment.learning_journey_id JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      JOIN steps step ON step.id=progress.step_id
      WHERE EXISTS (SELECT 1 FROM eligible_steps eligible WHERE eligible.enrollment_id=enrollment.id AND eligible.step_id=step.id)
      UNION ALL
      SELECT 'CHALLENGE',CONCAT_WS(' ',profile.first_name,profile.last_name),challenge.title,owned.title,attempt.submitted_at,
        COALESCE(attempt.percentage::text || '%',attempt.grading_status)
      FROM challenge_v1_attempts attempt JOIN scoped_enrollments enrollment ON enrollment.id=attempt.enrollment_id
      JOIN owned ON owned.id=enrollment.learning_journey_id JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      JOIN challenges challenge ON challenge.id=attempt.challenge_id
    ) SELECT * FROM events ORDER BY occurred_at DESC NULLS LAST LIMIT 10`, params),
    pool.query(`SELECT id,title FROM learning_journeys WHERE owner_user_id=$1::uuid AND status<>'ARCHIVED' ORDER BY title`, [educatorId]),
    pool.query(`SELECT path.id,path.title,path.status,path.source,enrollment.learning_journey_id,
      CONCAT_WS(' ',profile.first_name,profile.last_name) learner_name,journey.title journey_title
      FROM learning_paths path JOIN journey_enrollments enrollment ON enrollment.id=path.enrollment_id
      JOIN learning_journeys journey ON journey.id=enrollment.learning_journey_id
      JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      WHERE journey.owner_user_id=$1::uuid AND journey.status<>'ARCHIVED' AND path.status<>'ARCHIVED'
      ORDER BY journey.title,learner_name,path.version DESC`, [educatorId]),
    pool.query(`SELECT currency,COALESCE(SUM(gross_amount),0)::int gross_revenue,COALESCE(SUM(platform_fee_amount),0)::int platform_fees,COALESCE(SUM(educator_amount),0)::int educator_earnings,COALESCE(SUM(stripe_fee_amount),0)::int stripe_fees,COUNT(*) FILTER(WHERE entry_type='SALE')::int sales,COUNT(*) FILTER(WHERE entry_type='REFUND')::int refunds FROM financial_ledger WHERE educator_user_id=$1::uuid AND ($2::uuid IS NULL OR learning_journey_id=$2::uuid) GROUP BY currency ORDER BY currency`,[educatorId,journeyId||null]),
  ]);

  return {
    summary: summary.rows[0], journeys: journeys.rows, learners: learners.rows,
    recentActivity: activity.rows,
    filters: { journeys: journeyFilters.rows, paths: pathFilters.rows, selected: { journeyId, pathId } },
    finance: { status: "ACTIVE", currencies: finance.rows },
  };
}

module.exports = { getOverview };
