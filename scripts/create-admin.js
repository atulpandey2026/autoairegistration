const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
(async()=>{
 const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const password=process.env.ADMIN_INITIAL_PASSWORD;
 if(!email||!password){console.error('Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD in your environment before running this script.');process.exit(1)}
 if(password.length<12){console.error('Admin password must be at least 12 characters.');process.exit(1)}
 const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const hash=await bcrypt.hash(password,12);
 await db.execute('INSERT INTO admins (email,password_hash) VALUES (?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)',[email,hash]);
 await db.end();console.log(`Admin account configured for ${email}. Remove ADMIN_INITIAL_PASSWORD from your environment after setup.`);
})().catch(e=>{console.error('Could not create admin:',e.message);process.exit(1)});
