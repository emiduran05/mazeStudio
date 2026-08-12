const pool=require("../config/db");
async function create({recipientUserId,recipientProfileId,actorUserId=null,type,title,body,actionUrl=null,entityType=null,entityId=null,metadata={},deduplicationKey=null},client=pool){
  let userId=recipientUserId;
  if(!userId&&recipientProfileId){const linked=await client.query("SELECT linked_user_id FROM learner_profiles WHERE id=$1::uuid",[recipientProfileId]);userId=linked.rows[0]?.linked_user_id;}
  if(!userId)return null;
  const preferenceKey={STEP_COMPLETED:"learning_activity",CHALLENGE_ASSIGNED:"challenges",CHALLENGE_SUBMITTED:"challenges",CHALLENGE_GRADED:"challenges",CALENDAR_EVENT:"calendar_events",ENROLLED:"enrollments"}[type];
  if(preferenceKey){const preference=await client.query(`SELECT in_app_enabled,${preferenceKey} enabled FROM notification_preferences WHERE user_id=$1::uuid`,[userId]);if(preference.rows[0]&&(!preference.rows[0].in_app_enabled||!preference.rows[0].enabled))return null;}
  const result=await client.query(`INSERT INTO notifications(recipient_user_id,actor_user_id,notification_type,title,body,action_url,entity_type,entity_id,metadata,deduplication_key)
    VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::uuid,$9::jsonb,$10) ON CONFLICT(recipient_user_id,deduplication_key) DO NOTHING RETURNING *`,[userId,actorUserId,type,title,body,actionUrl,entityType,entityId,JSON.stringify(metadata),deduplicationKey]);
  const notification=result.rows[0]||null;
  if(notification){const preference=await client.query("SELECT email_enabled FROM notification_preferences WHERE user_id=$1::uuid",[userId]);if(preference.rows[0]?.email_enabled!==false)await client.query("INSERT INTO notification_deliveries(notification_id,channel) VALUES($1,'EMAIL')",[notification.id]);}
  return notification;
}
module.exports={create};
