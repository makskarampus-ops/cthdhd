const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

const app = express();
const db = new sqlite3.Database('./database.db');

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// СТВОРЕННЯ БАЗИ З НОВОЮ КОЛОНКОЮ "category"
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS drones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        title TEXT,
        description TEXT,
        specs TEXT,
        image TEXT
    )`);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.get('/', (req, res) => {
    res.render(path.join(__dirname, 'views', 'index.html'));
});

// КАТАЛОГ НА САЙТІ
app.get('/projects.html', (req, res) => {
    // Сортуємо так, щоб спочатку йшли нові
    db.all("SELECT * FROM drones ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.send("Помилка БД");
        const drones = rows.map(drone => ({
            ...drone,
            specsArray: drone.specs ? drone.specs.split('\n') : []
        }));
        res.render(path.join(__dirname, 'views', 'projects.html'), { drones });
    });
});

// АДМІНКА: ГОЛОВНА
app.get('/admin', (req, res) => {
    db.all("SELECT * FROM drones ORDER BY id DESC", [], (err, rows) => {
        res.render(path.join(__dirname, 'views', 'admin.html'), { drones: rows });
    });
});

// АДМІНКА: ДОДАВАННЯ
app.post('/admin/add', upload.single('drone_image'), (req, res) => {
    const { category, title, description, specs } = req.body;
    const imagePath = req.file ? '/uploads/' + req.file.filename : 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800';

    db.run("INSERT INTO drones (category, title, description, specs, image) VALUES (?, ?, ?, ?, ?)", 
        [category, title, description, specs, imagePath], 
        (err) => res.redirect('/admin')
    );
});

// АДМІНКА: СТОРІНКА РЕДАГУВАННЯ
app.get('/admin/edit/:id', (req, res) => {
    db.get("SELECT * FROM drones WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) return res.send("Помилка: запис не знайдено.");
        res.render(path.join(__dirname, 'views', 'edit.html'), { drone: row });
    });
});

// АДМІНКА: ЗБЕРЕЖЕННЯ РЕДАГУВАННЯ
app.post('/admin/edit/:id', upload.single('drone_image'), (req, res) => {
    const { category, title, description, specs } = req.body;
    
    if (req.file) {
        const imagePath = '/uploads/' + req.file.filename;
        db.run("UPDATE drones SET category = ?, title = ?, description = ?, specs = ?, image = ? WHERE id = ?", 
            [category, title, description, specs, imagePath, req.params.id], 
            (err) => res.redirect('/admin')
        );
    } else {
        db.run("UPDATE drones SET category = ?, title = ?, description = ?, specs = ? WHERE id = ?", 
            [category, title, description, specs, req.params.id], 
            (err) => res.redirect('/admin')
        );
    }
});

// АДМІНКА: ВИДАЛЕННЯ
app.post('/admin/delete/:id', (req, res) => {
    db.run("DELETE FROM drones WHERE id = ?", [req.params.id], (err) => {
        res.redirect('/admin');
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер працює! Сайт: http://localhost:${PORT} | Адмінка: http://localhost:${PORT}/admin`);
});