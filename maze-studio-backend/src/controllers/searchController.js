const pool=require("../config/db");
async function search(req,res,next){try{const query=String(req.query.q||"").trim();if(query.length<2)return res.json({results:[]});const result=await pool.query(`
 SELECT 'JOURNEY' type,journey.id,journey.title label,COALESCE(journey.description,'') description,'/studio/journey/'||journey.id action_url
 FROM learning_journeys journey WHERE journey.owner_user_id=$1::uuid AND journey.status<>'ARCHIVED' AND (journey.title ILIKE '%'||$2||'%' OR journey.description ILIKE '%'||$2||'%')
 UNION ALL SELECT 'STUDENT',profile.id,CONCAT_WS(' ',profile.first_name,profile.last_name),COALESCE(profile.contact_email,''),'/studio'
 FROM learner_profiles profile JOIN educator_learner_relationships relation ON relation.learner_profile_id=profile.id WHERE relation.educator_user_id=$1::uuid AND relation.status='ACTIVE' AND (CONCAT_WS(' ',profile.first_name,profile.last_name) ILIKE '%'||$2||'%' OR profile.contact_email ILIKE '%'||$2||'%')
 UNION ALL SELECT 'CHALLENGE',challenge.id,challenge.title,COALESCE(challenge.description,''),'/studio/challenges/'||challenge.id||'/edit'
 FROM challenges challenge JOIN learning_journeys challenge_journey ON challenge_journey.id=challenge.learning_journey_id WHERE challenge_journey.owner_user_id=$1::uuid AND challenge.status<>'ARCHIVED' AND (challenge.title ILIKE '%'||$2||'%' OR challenge.description ILIKE '%'||$2||'%') LIMIT 30`,[req.user.id,query]);res.json({results:result.rows})}catch(error){next(error)}}
module.exports={search};
