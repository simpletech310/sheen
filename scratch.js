const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgres://postgres:oSMWMoYqgrioU3XI@db.ezfvbcrjnpelrralvjof.supabase.co:5432/postgres' });
  await client.connect();
  
  try {
    await client.query(`ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'funded';`);
    console.log("Added 'funded' to job_status enum");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
