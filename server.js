require('dotenv').config();
const express = require('express');
const { Pool, Client } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_TEACHER_PASSWORD = '123';
const dbName = process.env.PGDATABASE || 'school_clubs';
const dbPassword = process.env.PGPASSWORD ? String(process.env.PGPASSWORD) : () => '';
const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  password: dbPassword,
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10)
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let pool;

async function initDatabase() {
  // 1. Connect to default 'postgres' database to check if 'school_clubs' exists
  const tempClient = new Client({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    await tempClient.connect();
    const res = await tempClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Database '${dbName}' does not exist. Creating...`);
      // We must escape database names or use safe characters
      await tempClient.query(`CREATE DATABASE ${dbName}`);
      console.log("Database created successfully.");
    }
  } catch (err) {
    console.error("Error checking/creating database:", err);
  } finally {
    await tempClient.end();
  }

  pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  // Test main pool connection
  try {
    await pool.query('SELECT NOW()');
    console.log("Connected to PostgreSQL successfully.");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }

  // 3. Create Tables
  try {
    // Create Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL
      );
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(100)
    `);

    // Create Students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        phone VARCHAR(20) NOT NULL
      );
    `);

    // Create Clubs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        instructor_name VARCHAR(100) NOT NULL,
        instructor_username VARCHAR(50) NOT NULL,
        schedule VARCHAR(100) NOT NULL,
        capacity INTEGER NOT NULL,
        description TEXT NOT NULL,
        image VARCHAR(50) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        registered_at DATE DEFAULT CURRENT_DATE,
        UNIQUE(club_id, student_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        UNIQUE(club_id, student_id, date)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_schedule_preferences (
        student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
        sections_per_week INTEGER NOT NULL DEFAULT 2,
        preferred_days TEXT[] NOT NULL DEFAULT '{}',
        notes TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database tables verified/created successfully.");

    // 4. Seed initial mock data if empty
    await seedDatabase();
    await migrateExistingData();

  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

async function migrateExistingData() {
  const teacherUsers = [
    { username: 'admin', password: DEFAULT_TEACHER_PASSWORD, role: 'admin', fullName: 'Әкімші' },
    { username: 'baurjan', password: DEFAULT_TEACHER_PASSWORD, role: 'teacher', fullName: 'Жақыпов Бауыржан' },
    { username: 'kairat', password: DEFAULT_TEACHER_PASSWORD, role: 'teacher', fullName: 'Ахметов Қайрат' },
    { username: 'aliya', password: DEFAULT_TEACHER_PASSWORD, role: 'teacher', fullName: 'Смағұлова Әлия' },
    { username: 'murat', password: DEFAULT_TEACHER_PASSWORD, role: 'teacher', fullName: 'Исаев Мұрат' },
    { username: 'dulat', password: DEFAULT_TEACHER_PASSWORD, role: 'teacher', fullName: 'Аманжол Дулат' },
    { username: 'serik', password: DEFAULT_TEACHER_PASSWORD, role: 'teacher', fullName: 'Рахметов Серік' }
  ];

  for (const user of teacherUsers) {
    await pool.query(
      `INSERT INTO users (username, password, role, full_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username)
       DO UPDATE SET full_name = COALESCE(users.full_name, EXCLUDED.full_name)`,
      [user.username, user.password, user.role, user.fullName]
    );
  }

  const clubUpdates = [
    { name: "Робототехника және электроника", image: "tech", instructorUsername: "baurjan" },
    { name: "Футбол секциясы", image: "sport", instructorUsername: "kairat" },
    { name: "Бейнелеу өнері және кескіндеме", image: "art", instructorUsername: "aliya" },
    { name: "Шахмат академиясы", image: "science", instructorUsername: "murat" },
    { name: "3D модельдеу және дизайн", image: "school", instructorUsername: "dulat" },
    { name: "Волейбол секциясы", image: "volleyball", instructorUsername: "serik" }
  ];

  for (const club of clubUpdates) {
    await pool.query(
      "UPDATE clubs SET image = $1, instructor_username = $2 WHERE name = $3",
      [club.image, club.instructorUsername, club.name]
    );
  }
}

async function seedDatabase() {
  const clubsCount = await pool.query("SELECT COUNT(*) FROM clubs");
  if (parseInt(clubsCount.rows[0].count) > 0) {
    return; // database already seeded
  }

  console.log("Seeding database with initial data...");

  // Seed Users
  // Teachers
  const teacherUsers = [
    { username: 'admin', password: '123', role: 'admin', fullName: 'Әкімші' },
    { username: 'baurjan', password: '123', role: 'teacher', fullName: 'Жақыпов Бауыржан' },
    { username: 'kairat', password: '123', role: 'teacher', fullName: 'Ахметов Қайрат' },
    { username: 'aliya', password: '123', role: 'teacher', fullName: 'Смағұлова Әлия' },
    { username: 'murat', password: '123', role: 'teacher', fullName: 'Исаев Мұрат' },
    { username: 'dulat', password: '123', role: 'teacher', fullName: 'Аманжол Дулат' },
    { username: 'serik', password: '123', role: 'teacher', fullName: 'Рахметов Серік' }
  ];

  const seededUserMap = {}; // map username to userId
  for (const user of teacherUsers) {
    const res = await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role
       RETURNING id`,
      [user.username, user.password, user.role]
    );
    await pool.query("UPDATE users SET full_name = $1 WHERE id = $2", [user.fullName, res.rows[0].id]);
    seededUserMap[user.username] = res.rows[0].id;
  }

  const studentProfiles = [
    { username: 'dauren', password: '123', role: 'student', name: 'Қанатұлы Дәурен', grade: '8 «А»', phone: '+7 702 333 2211' },
    { username: 'sanzhar', password: '123', role: 'student', name: 'Әлібек Санжар', grade: '7 «Ә»', phone: '+7 775 555 4433' },
    { username: 'nurasyl', password: '123', role: 'student', name: 'Бақытжан Нұрасыл', grade: '9 «Б»', phone: '+7 701 444 5566' },
    { username: 'aruzhan', password: '123', role: 'student', name: 'Серік Аружан', grade: '6 «В»', phone: '+7 705 999 8877' },
    { username: 'ayaulym', password: '123', role: 'student', name: 'Амангелді Аяулым', grade: '8 «Б»', phone: '+7 777 111 2233' }
  ];

  const seededStudentMap = {}; // map student name to studentId
  for (const std of studentProfiles) {
    const userRes = await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role
       RETURNING id`,
      [std.username, std.password, std.role]
    );
    const userId = userRes.rows[0].id;

    const existingStudent = await pool.query(
      "SELECT id FROM students WHERE user_id = $1",
      [userId]
    );

    if (existingStudent.rowCount > 0) {
      await pool.query(
        "UPDATE students SET name = $1, grade = $2, phone = $3 WHERE user_id = $4",
        [std.name, std.grade, std.phone, userId]
      );
      seededStudentMap[std.name] = existingStudent.rows[0].id;
    } else {
      const stdRes = await pool.query(
        "INSERT INTO students (user_id, name, grade, phone) VALUES ($1, $2, $3, $4) RETURNING id",
        [userId, std.name, std.grade, std.phone]
      );
      seededStudentMap[std.name] = stdRes.rows[0].id;
    }
  }

  const clubs = [
    {
      name: "Робототехника және электроника",
      category: "Tech",
      instructor_name: "Жақыпов Бауыржан",
      instructor_username: "baurjan",
      schedule: "Дс, Ср 15:00 - 16:30",
      capacity: 15,
      description: "Оқушыларға роботтарды модельдеуді, схемалар құрастыруды, Arduino платформасында жұмыс істеуді және негізгі бағдарламалау тілдерін үйретеді. Болашақ инженерлерге арналған үйірме.",
      image: "tech"
    },
    {
      name: "Футбол секциясы",
      category: "Sport",
      instructor_name: "Ахметов Қайрат",
      instructor_username: "kairat",
      schedule: "Сс, Жм 16:00 - 17:30",
      capacity: 22,
      description: "Жалпы дене шынықтыру, доппен жұмыс істеу техникасы, тактика және командалық ойын негіздерін үйрету. Мектепішілік және қалалық турнирлерге қатысу мүмкіндігі.",
      image: "sport"
    },
    {
      name: "Бейнелеу өнері және кескіндеме",
      category: "Art",
      instructor_name: "Смағұлова Әлия",
      instructor_username: "aliya",
      schedule: "Ср, Жм 14:30 - 16:00",
      capacity: 12,
      description: "Сурет салудың түрлі техникаларын (акварель, гуашь, қарындаш, майлы бояу) меңгеру, шығармашылық ойлау мен түстермен жұмыс істеуді дамыту.",
      image: "art"
    },
    {
      name: "Шахмат академиясы",
      category: "Science",
      instructor_name: "Исаев Мұрат",
      instructor_username: "murat",
      schedule: "Дс, Бс 16:30 - 18:00",
      capacity: 20,
      description: "Логикалық ойлауды, стратегиялық жоспарлауды және шахмат ойынының комбинацияларын тереңдетіп оқыту. Концентрация мен зейінді арттыруға таптырмас құрал.",
      image: "science"
    },
    {
      name: "3D модельдеу және дизайн",
      category: "Tech",
      instructor_name: "Аманжол Дулат",
      instructor_username: "dulat",
      schedule: "Сс, Бс 15:30 - 17:00",
      capacity: 10,
      description: "Blender және Tinkercad бағдарламаларында 3D модельдер жасау, кеңістіктік ойлау мен анимация негіздерін үйрену. Ойындар мен архитектура дизайнына бағытталған.",
      image: "school"
    },
    {
      name: "Волейбол секциясы",
      category: "Sport",
      instructor_name: "Рахметов Серік",
      instructor_username: "serik",
      schedule: "Сс, Бс 17:00 - 18:30",
      capacity: 18,
      description: "Волейбол ойынының техникасы, секіру қабілеті, допты қабылдау және беру тактикасы. Командалық рухты дамыту және белсенді спорттық өмір.",
      image: "volleyball"
    }
  ];

  const seededClubMap = {}; 
  for (const club of clubs) {
    const res = await pool.query(
      `INSERT INTO clubs (name, category, instructor_name, instructor_username, schedule, capacity, description, image) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [club.name, club.category, club.instructor_name, club.instructor_username, club.schedule, club.capacity, club.description, club.image]
    );
    seededClubMap[club.name] = res.rows[0].id;
  }

  const registrations = [
    { clubName: "Робототехника және электроника", studentName: "Қанатұлы Дәурен", date: "2026-06-12" },
    { clubName: "Робототехника және электроника", studentName: "Әлібек Санжар", date: "2026-06-13" },
    { clubName: "Футбол секциясы", studentName: "Бақытжан Нұрасыл", date: "2026-06-11" },
    { clubName: "Бейнелеу өнері және кескіндеме", studentName: "Серік Аружан", date: "2026-06-14" },
    { clubName: "Шахмат академиясы", studentName: "Амангелді Аяулым", date: "2026-06-10" }
  ];

  for (const reg of registrations) {
    const clubId = seededClubMap[reg.clubName];
    const studentId = seededStudentMap[reg.studentName];
    if (clubId && studentId) {
      await pool.query(
        "INSERT INTO registrations (club_id, student_id, registered_at) VALUES ($1, $2, $3)",
        [clubId, studentId, reg.date]
      );
    }
  }

  const pastDates = ["2026-06-15", "2026-06-18", "2026-06-22"];
  
  const robClubId = seededClubMap["Робототехника және электроника"];
  const robStd1 = seededStudentMap["Қанатұлы Дәурен"];
  const robStd2 = seededStudentMap["Әлібек Санжар"];
  
  if (robClubId) {
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [robClubId, robStd1, pastDates[0], 'present']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [robClubId, robStd2, pastDates[0], 'present']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [robClubId, robStd1, pastDates[1], 'present']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [robClubId, robStd2, pastDates[1], 'absent']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [robClubId, robStd1, pastDates[2], 'present']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [robClubId, robStd2, pastDates[2], 'present']);
  }

  const footClubId = seededClubMap["Футбол секциясы"];
  const footStd1 = seededStudentMap["Бақытжан Нұрасыл"];
  
  if (footClubId) {
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [footClubId, footStd1, pastDates[0], 'present']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [footClubId, footStd1, pastDates[1], 'absent']);
    await pool.query("INSERT INTO attendance (club_id, student_id, date, status) VALUES ($1, $2, $3, $4)", [footClubId, footStd1, pastDates[2], 'present']);
  }

  console.log("Database seeded successfully!");
}


app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, grade, phone } = req.body;
  if (!username || !password || !name || !grade || !phone) {
    return res.status(400).json({ error: "Барлық өрістерді толтыру қажет" });
  }

  try {
    const checkUser = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (checkUser.rowCount > 0) {
      return res.status(400).json({ error: "Бұл логин жүйеде тіркелген" });
    }

    const userRes = await pool.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, password, 'student']
    );
    const userId = userRes.rows[0].id;

    const stdRes = await pool.query(
      "INSERT INTO students (user_id, name, grade, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, grade, phone",
      [userId, name, grade, phone]
    );

    res.status(201).json({
      message: "Тіркелу сәтті аяқталды",
      user: {
        id: userId,
        username: userRes.rows[0].username,
        role: userRes.rows[0].role,
        studentId: stdRes.rows[0].id,
        name: stdRes.rows[0].name
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Серверде қате орын алды" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Логин мен құпия сөзді енгізіңіз" });
  }

  try {
    const userRes = await pool.query(
      "SELECT id, username, password, role, full_name FROM users WHERE username = $1",
      [username]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: "Пайдаланушы табылмады" });
    }

    const user = userRes.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: "Құпия сөз қате" });
    }


    let studentId = null;
    let name = user.username; // default fallback
    
    if (user.role === 'student') {
      const stdRes = await pool.query(
        "SELECT id, name FROM students WHERE user_id = $1",
        [user.id]
      );
      if (stdRes.rowCount > 0) {
        studentId = stdRes.rows[0].id;
        name = stdRes.rows[0].name;
      }
    } else if (user.role === 'teacher') {
      const teacherRes = await pool.query(
        "SELECT instructor_name FROM clubs WHERE instructor_username = $1 ORDER BY id ASC LIMIT 1",
        [user.username]
      );
      name = user.full_name || (teacherRes.rowCount > 0 ? teacherRes.rows[0].instructor_name : user.username);
    } else if (user.role === 'admin') {
      name = user.full_name || user.username;
    }

    res.json({
      message: "Кіру сәтті аяқталды",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        studentId: studentId,
        name: name
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Серверде қате орын алды" });
  }
});


app.get('/api/admin/teachers', async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.password, u.full_name,
             COALESCE(c.assigned_clubs, 0) as assigned_clubs
      FROM users u
      LEFT JOIN (
        SELECT instructor_username, COUNT(*) as assigned_clubs
        FROM clubs
        GROUP BY instructor_username
      ) c ON c.instructor_username = u.username
      WHERE u.role = 'teacher'
      ORDER BY u.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows.map(row => ({
      ...row,
      assigned_clubs: parseInt(row.assigned_clubs)
    })));
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ error: "Мұғалімдер тізімін жүктеу қатесі" });
  }
});

app.post('/api/admin/teachers', async (req, res) => {
  const { fullName, username, password } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: "Аты-жөні, логин және пароль міндетті" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (username, password, role, full_name)
       VALUES ($1, $2, 'teacher', $3)
       RETURNING id, username, password, full_name`,
      [username.trim(), password, fullName.trim()]
    );
    res.status(201).json({ ...result.rows[0], assigned_clubs: 0 });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Бұл логин бұрын тіркелген" });
    }
    console.error("Error creating teacher:", err);
    res.status(500).json({ error: "Мұғалім қосу қатесі" });
  }
});

app.put('/api/admin/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, username, password } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: "Аты-жөні, логин және пароль міндетті" });
  }

  try {
    const current = await pool.query("SELECT username FROM users WHERE id = $1 AND role = 'teacher'", [id]);
    if (current.rowCount === 0) {
      return res.status(404).json({ error: "Мұғалім табылмады" });
    }

    const oldUsername = current.rows[0].username;
    const cleanUsername = username.trim();
    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, username = $2, password = $3
       WHERE id = $4 AND role = 'teacher'
       RETURNING id, username, password, full_name`,
      [fullName.trim(), cleanUsername, password, id]
    );

    if (oldUsername !== cleanUsername) {
      await pool.query(
        "UPDATE clubs SET instructor_username = $1 WHERE instructor_username = $2",
        [cleanUsername, oldUsername]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Бұл логин бұрын тіркелген" });
    }
    console.error("Error updating teacher:", err);
    res.status(500).json({ error: "Мұғалімді жаңарту қатесі" });
  }
});

app.delete('/api/admin/teachers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = await pool.query("SELECT username FROM users WHERE id = $1 AND role = 'teacher'", [id]);
    if (teacher.rowCount === 0) {
      return res.status(404).json({ error: "Мұғалім табылмады" });
    }

    const assigned = await pool.query("SELECT COUNT(*) FROM clubs WHERE instructor_username = $1", [teacher.rows[0].username]);
    if (parseInt(assigned.rows[0].count) > 0) {
      return res.status(400).json({ error: "Бұл мұғалімге үйірме бекітілген. Алдымен үйірмедегі жетекшіні ауыстырыңыз." });
    }

    await pool.query("DELETE FROM users WHERE id = $1 AND role = 'teacher'", [id]);
    res.json({ message: "Мұғалім өшірілді", id });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ error: "Мұғалімді өшіру қатесі" });
  }
});

app.get('/api/clubs', async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
             COALESCE(r.registered_count, 0) as registered_count
      FROM clubs c
      LEFT JOIN (
        SELECT club_id, COUNT(*) as registered_count 
        FROM registrations 
        GROUP BY club_id
      ) r ON c.id = r.club_id
      ORDER BY c.id ASC
    `;
    const result = await pool.query(query);
    
    const clubs = result.rows.map(row => ({
      ...row,
      capacity: parseInt(row.capacity),
      registered_count: parseInt(row.registered_count)
    }));

    res.json(clubs);
  } catch (err) {
    console.error("Error fetching clubs:", err);
    res.status(500).json({ error: "Үйірмелерді жүктеу қатесі" });
  }
});

// Add club (Admin only)
app.post('/api/clubs', async (req, res) => {
  const { name, category, instructorName, instructorUsername, schedule, capacity, description, image } = req.body;
  if (!name || !category || !instructorName || !instructorUsername || !schedule || !capacity || !description || !image) {
    return res.status(400).json({ error: "Барлық өрістерді толтыру қажет" });
  }

  try {
    // Check if instructor user exists, if not create a mock teacher user automatically!
    const checkUser = await pool.query("SELECT id FROM users WHERE username = $1", [instructorUsername]);
    if (checkUser.rowCount === 0) {
      await pool.query(
        "INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4)",
        [instructorUsername, DEFAULT_TEACHER_PASSWORD, 'teacher', instructorName]
      );
    } else {
      await pool.query(
        "UPDATE users SET full_name = COALESCE(full_name, $1) WHERE username = $2 AND role = 'teacher'",
        [instructorName, instructorUsername]
      );
    }

    const result = await pool.query(
      `INSERT INTO clubs (name, category, instructor_name, instructor_username, schedule, capacity, description, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, category, instructorName, instructorUsername, schedule, parseInt(capacity), description, image]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating club:", err);
    res.status(500).json({ error: "Үйірме қосу қатесі" });
  }
});

// Edit club (Admin only)
app.put('/api/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, instructorName, instructorUsername, schedule, capacity, description, image } = req.body;

  try {
    // Check capacity against registrations
    const regCountRes = await pool.query("SELECT COUNT(*) FROM registrations WHERE club_id = $1", [id]);
    const registered = parseInt(regCountRes.rows[0].count);
    
    if (parseInt(capacity) < registered) {
      return res.status(400).json({ error: `Орындар санын ${registered}-ден төмендете алмайсыз, тіркелген оқушылар бар.` });
    }

    // Ensure instructor user exists
    const checkUser = await pool.query("SELECT id FROM users WHERE username = $1", [instructorUsername]);
    if (checkUser.rowCount === 0) {
      await pool.query(
        "INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4)",
        [instructorUsername, DEFAULT_TEACHER_PASSWORD, 'teacher', instructorName]
      );
    } else {
      await pool.query(
        "UPDATE users SET full_name = COALESCE(full_name, $1) WHERE username = $2 AND role = 'teacher'",
        [instructorName, instructorUsername]
      );
    }

    const result = await pool.query(
      `UPDATE clubs 
       SET name = $1, category = $2, instructor_name = $3, instructor_username = $4, schedule = $5, capacity = $6, description = $7, image = $8
       WHERE id = $9 RETURNING *`,
      [name, category, instructorName, instructorUsername, schedule, parseInt(capacity), description, image, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Үйірме табылмады" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating club:", err);
    res.status(500).json({ error: "Үйірмені жаңарту қатесі" });
  }
});

// Delete club (Admin only)
app.delete('/api/clubs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM clubs WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Үйірме табылмады" });
    }
    res.json({ message: "Үйірме сәтті өшірілді", id: id });
  } catch (err) {
    console.error("Error deleting club:", err);
    res.status(500).json({ error: "Үйірмені өшіру қатесі" });
  }
});

// --- STUDENT REGISTRATION ---

// Register student to club
app.post('/api/clubs/:clubId/register', async (req, res) => {
  const { clubId } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: "Студент ID көрсетілмеген" });
  }

  try {
    // 1. Check if club exists and capacity is not full
    const clubRes = await pool.query(
      `SELECT c.capacity, COALESCE(r.count, 0) as registered
       FROM clubs c
       LEFT JOIN (SELECT club_id, COUNT(*) as count FROM registrations GROUP BY club_id) r 
       ON c.id = r.club_id
       WHERE c.id = $1`,
      [clubId]
    );

    if (clubRes.rowCount === 0) {
      return res.status(404).json({ error: "Үйірме табылмады" });
    }

    const { capacity, registered } = clubRes.rows[0];
    if (parseInt(registered) >= parseInt(capacity)) {
      return res.status(400).json({ error: "Бұл үйірмеде бос орындар қалмады" });
    }

    // 2. Check if already registered
    const dupRes = await pool.query(
      "SELECT id FROM registrations WHERE club_id = $1 AND student_id = $2",
      [clubId, studentId]
    );

    if (dupRes.rowCount > 0) {
      return res.status(400).json({ error: "Сіз бұл үйірмеге тіркеліп қойғансыз" });
    }

    // 3. Insert registration
    const result = await pool.query(
      "INSERT INTO registrations (club_id, student_id) VALUES ($1, $2) RETURNING *",
      [clubId, studentId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error registering student:", err);
    res.status(500).json({ error: "Тіркелу кезінде сервер қатесі орын алды" });
  }
});

// Cancel registration (Unregister)
app.delete('/api/registrations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM registrations WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Тіркелу жазбасы табылмады" });
    }
    res.json({ message: "Тіркеу сәтті жойылды" });
  } catch (err) {
    console.error("Error deleting registration:", err);
    res.status(500).json({ error: "Тіркеуді жою қатесі" });
  }
});

// --- DASHBOARD DATA FETCHING ---

// Student Dashboard (registered clubs, schedule, attendance log)
app.get('/api/student/dashboard', async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ error: "Студент ID көрсетілуі тиіс" });
  }

  try {
    // 1. Get student profile details
    const studentProfile = await pool.query("SELECT * FROM students WHERE id = $1", [studentId]);
    if (studentProfile.rowCount === 0) {
      return res.status(404).json({ error: "Оқушы профилі табылмады" });
    }

    // 2. Get registered clubs list
    const myClubsQuery = `
      SELECT r.id as registration_id, c.* 
      FROM registrations r
      JOIN clubs c ON r.club_id = c.id
      WHERE r.student_id = $1
      ORDER BY r.id DESC
    `;
    const myClubs = await pool.query(myClubsQuery, [studentId]);

    // 3. Get attendance history details
    const attendanceQuery = `
      SELECT a.id, a.date, a.status, c.name as club_name, c.instructor_name
      FROM attendance a
      JOIN clubs c ON a.club_id = c.id
      WHERE a.student_id = $1
      ORDER BY a.date DESC
    `;
    const attendanceLog = await pool.query(attendanceQuery, [studentId]);

    // 4. Calculate attendance percentage per club
    const attendanceStatsQuery = `
      SELECT club_id,
             COUNT(*) filter (where status = 'present') as present_count,
             COUNT(*) as total_lessons
      FROM attendance
      WHERE student_id = $1
      GROUP BY club_id
    `;
    const statsResult = await pool.query(attendanceStatsQuery, [studentId]);
    const attendanceStats = {};
    statsResult.rows.forEach(row => {
      attendanceStats[row.club_id] = {
        present: parseInt(row.present_count),
        total: parseInt(row.total_lessons)
      };
    });

    res.json({
      profile: studentProfile.rows[0],
      clubs: myClubs.rows,
      attendance: attendanceLog.rows,
      stats: attendanceStats
    });
  } catch (err) {
    console.error("Error loading student dashboard:", err);
    res.status(500).json({ error: "Кабинет деректерін жүктеу қатесі" });
  }
});

// Student custom weekly schedule preferences
app.get('/api/student/schedule-preferences', async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ error: "Студент ID көрсетілуі тиіс" });
  }

  try {
    const result = await pool.query(
      `SELECT student_id, sections_per_week, preferred_days, notes
       FROM student_schedule_preferences
       WHERE student_id = $1`,
      [studentId]
    );

    if (result.rowCount === 0) {
      return res.json({
        student_id: parseInt(studentId),
        sections_per_week: 2,
        preferred_days: [],
        notes: ''
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error loading schedule preferences:", err);
    res.status(500).json({ error: "Жеке графикті жүктеу қатесі" });
  }
});

app.post('/api/student/schedule-preferences', async (req, res) => {
  const { studentId, sectionsPerWeek, preferredDays, notes } = req.body;
  const safeSections = parseInt(sectionsPerWeek);

  if (!studentId || Number.isNaN(safeSections) || safeSections < 1 || safeSections > 12 || !Array.isArray(preferredDays)) {
    return res.status(400).json({ error: "График мәліметтері қате енгізілді" });
  }

  const allowedDays = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн'];
  const safeDays = preferredDays.filter(day => allowedDays.includes(day));

  try {
    const result = await pool.query(
      `INSERT INTO student_schedule_preferences (student_id, sections_per_week, preferred_days, notes, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id)
       DO UPDATE SET
         sections_per_week = EXCLUDED.sections_per_week,
         preferred_days = EXCLUDED.preferred_days,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING student_id, sections_per_week, preferred_days, notes`,
      [studentId, safeSections, safeDays, notes || '']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error saving schedule preferences:", err);
    res.status(500).json({ error: "Жеке графикті сақтау қатесі" });
  }
});

// Teacher Dashboard (assigned clubs, students lists, stats)
app.get('/api/teacher/dashboard', async (req, res) => {
  const { username, role } = req.query;
  if (!username || !role) {
    return res.status(400).json({ error: "Авторизация деректері қате" });
  }

  try {
    let clubsQuery = "";
    let params = [];

    if (role === 'admin') {
      clubsQuery = `
        SELECT c.*, COALESCE(r.count, 0) as registered_count
        FROM clubs c
        LEFT JOIN (SELECT club_id, COUNT(*) as count FROM registrations GROUP BY club_id) r
        ON c.id = r.club_id
        ORDER BY c.id ASC
      `;
    } else {
      clubsQuery = `
        SELECT c.*, COALESCE(r.count, 0) as registered_count
        FROM clubs c
        LEFT JOIN (SELECT club_id, COUNT(*) as count FROM registrations GROUP BY club_id) r
        ON c.id = r.club_id
        WHERE c.instructor_username = $1
        ORDER BY c.id ASC
      `;
      params = [username];
    }

    const clubsRes = await pool.query(clubsQuery, params);
    
    // Parse integers
    const clubs = clubsRes.rows.map(row => ({
      ...row,
      capacity: parseInt(row.capacity),
      registered_count: parseInt(row.registered_count)
    }));

    res.json({
      clubs: clubs
    });
  } catch (err) {
    console.error("Error loading teacher dashboard:", err);
    res.status(500).json({ error: "Кабинет деректерін жүктеу қатесі" });
  }
});

// Get registered students in a selected club, with attendance rate
app.get('/api/clubs/:clubId/students', async (req, res) => {
  const { clubId } = req.params;
  try {
    const query = `
      SELECT r.id as registration_id, r.registered_at, s.id as student_id, s.name, s.grade, s.phone,
             COALESCE(att.present, 0) as present_count,
             COALESCE(att.total, 0) as total_lessons
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN (
        SELECT student_id, 
               COUNT(*) filter (where status = 'present') as present,
               COUNT(*) as total
        FROM attendance
        WHERE club_id = $1
        GROUP BY student_id
      ) att ON s.id = att.student_id
      WHERE r.club_id = $1
      ORDER BY s.name ASC
    `;
    const result = await pool.query(query, [clubId]);
    const students = result.rows.map(row => ({
      ...row,
      present_count: parseInt(row.present_count),
      total_lessons: parseInt(row.total_lessons)
    }));
    res.json(students);
  } catch (err) {
    console.error("Error fetching club students:", err);
    res.status(500).json({ error: "Оқушылар тізімін алу қатесі" });
  }
});

// --- ATTENDANCE TRACKING JOURNAL ---

// Get attendance for a club on a date
app.get('/api/attendance/:clubId', async (req, res) => {
  const { clubId } = req.params;
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: "Күнді көрсету қажет" });
  }

  try {
    // 1. Get all students registered in this club
    const studentsRes = await pool.query(
      `SELECT s.id as student_id, s.name, s.grade
       FROM registrations r
       JOIN students s ON r.student_id = s.id
       WHERE r.club_id = $1
       ORDER BY s.name ASC`,
      [clubId]
    );

    // 2. Get attendance records for this date
    const attendanceRes = await pool.query(
      "SELECT student_id, status FROM attendance WHERE club_id = $1 AND date = $2",
      [clubId, date]
    );

    const attendanceMap = {};
    attendanceRes.rows.forEach(row => {
      attendanceMap[row.student_id] = row.status;
    });

    // Merge students with their attendance status
    const list = studentsRes.rows.map(std => ({
      studentId: std.student_id,
      name: std.name,
      grade: std.grade,
      status: attendanceMap[std.student_id] || null // null if not marked yet
    }));

    res.json(list);
  } catch (err) {
    console.error("Error fetching attendance list:", err);
    res.status(500).json({ error: "Журнал жүктеу қатесі" });
  }
});

// Save attendance for a club on a date
app.post('/api/attendance/:clubId', async (req, res) => {
  const { clubId } = req.params;
  const { date, records } = req.body; // records: [{studentId, status: 'present'|'absent'}]
  
  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: "Мәліметтер қате енгізілді" });
  }

  try {
    // Save each record using upsert (ON CONFLICT)
    for (const record of records) {
      const query = `
        INSERT INTO attendance (club_id, student_id, date, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (club_id, student_id, date) 
        DO UPDATE SET status = EXCLUDED.status
      `;
      await pool.query(query, [clubId, record.studentId, date, record.status]);
    }
    
    res.json({ message: "Қатысу журналы сәтті сақталды" });
  } catch (err) {
    console.error("Error saving attendance:", err);
    res.status(500).json({ error: "Журналды сақтау кезінде сервер қатесі орын алды" });
  }
});

// Start Database & Express Server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
  });
});
