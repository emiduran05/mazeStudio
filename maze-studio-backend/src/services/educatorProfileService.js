const pool = require("../config/db");
const storageService = require("./storageService");

const blockTypes = new Set(["HEADING", "TEXT", "IMAGE", "VIDEO", "QUOTE", "CALLOUT", "DIVIDER", "TABLE", "BUTTON", "FILE", "PDF"]);

function slugify(value) {
  return String(value || "educator").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "educator";
}

async function ensureProfile(userId) {
  const user = (await pool.query("SELECT id,first_name,last_name,avatar_url FROM users WHERE id=$1::uuid", [userId])).rows[0];
  if (!user) throw Object.assign(new Error("Educator not found"), { statusCode: 404 });
  const base = slugify(`${user.first_name}-${user.last_name}`);
  await pool.query(`INSERT INTO educator_profiles(educator_user_id,slug)
    VALUES($1::uuid,$2) ON CONFLICT(educator_user_id) DO NOTHING`, [userId, `${base}-${String(userId).slice(0, 8)}`]);
  return user;
}

async function getMine(userId) {
  const user = await ensureProfile(userId);
  const profile = (await pool.query("SELECT * FROM educator_profiles WHERE educator_user_id=$1::uuid", [userId])).rows[0];
  const blocks = (await pool.query("SELECT * FROM educator_profile_blocks WHERE educator_user_id=$1::uuid ORDER BY position", [userId])).rows;
  return { ...profile, first_name: user.first_name, last_name: user.last_name, avatar_url: user.avatar_url, blocks };
}

async function save(userId, data = {}) {
  await ensureProfile(userId);
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  for (const block of blocks) if (!blockTypes.has(block.block_type)) throw Object.assign(new Error("Unsupported profile block type"), { statusCode: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE educator_profiles SET headline=$2,short_bio=$3,location=$4,languages=$5::jsonb,
      specialties=$6::jsonb,is_published=$7,updated_at=NOW() WHERE educator_user_id=$1::uuid`,
      [userId, data.headline || null, data.short_bio || null, data.location || null, JSON.stringify(data.languages || []), JSON.stringify(data.specialties || []), Boolean(data.is_published)]);
    await client.query("DELETE FROM educator_profile_blocks WHERE educator_user_id=$1::uuid", [userId]);
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      await client.query(`INSERT INTO educator_profile_blocks(id,educator_user_id,block_type,content,settings,position)
        VALUES(COALESCE($1::uuid,gen_random_uuid()),$2::uuid,$3,$4::jsonb,$5::jsonb,$6)`,
        [block.id || null, userId, block.block_type, JSON.stringify(block.content || {}), JSON.stringify(block.settings || {}), index + 1]);
    }
    await client.query("COMMIT");
    return getMine(userId);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function uploadAsset(userId, file) {
  await ensureProfile(userId);
  const uploaded = await storageService.uploadFile({ file, folder: "educator-profiles", ownerId: userId });
  return { url: uploaded.publicUrl, objectKey: uploaded.objectKey, name: uploaded.originalName, mimeType: uploaded.mimeType, size: uploaded.size };
}

async function getPublic(identifier) {
  const result = await pool.query(`SELECT profile.*,educator.first_name,educator.last_name,educator.avatar_url
    FROM educator_profiles profile JOIN users educator ON educator.id=profile.educator_user_id
    WHERE (profile.slug=$1 OR profile.educator_user_id::text=$1) AND profile.is_published=TRUE AND educator.status='ACTIVE'`, [identifier]);
  const profile = result.rows[0];
  if (!profile) throw Object.assign(new Error("Educator profile not found"), { statusCode: 404 });
  const [blocks, journeys] = await Promise.all([
    pool.query("SELECT id,block_type,content,settings,position FROM educator_profile_blocks WHERE educator_user_id=$1 ORDER BY position", [profile.educator_user_id]),
    pool.query(`SELECT DISTINCT journey.id,journey.title,journey.description,journey.cover_url,journey.difficulty,journey.language
      FROM learning_journeys journey JOIN offerings offering ON offering.learning_journey_id=journey.id
      WHERE journey.owner_user_id=$1 AND journey.status='PUBLISHED' AND journey.visibility='PUBLIC'
        AND offering.status='PUBLISHED' ORDER BY journey.title`, [profile.educator_user_id])
  ]);
  return { ...profile, blocks: blocks.rows, journeys: journeys.rows };
}

module.exports = { getMine, save, uploadAsset, getPublic };
