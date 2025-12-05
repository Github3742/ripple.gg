process.on("uncaughtException", err => {
    console.log("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", err => {
    console.log("❌ UNHANDLED PROMISE REJECTION:", err);
});


const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// DATABASE
const path = require("path");  
const db = new sqlite3.Database(path.join(__dirname, "database.db"));


// Create table if it does not exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    balance REAL DEFAULT 1000
)`);

// REGISTER
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: "Missing fields" });
    }

    const hashed = bcrypt.hashSync(password, 10);

    db.run(
        `INSERT INTO users (username, password) VALUES (?, ?)`,
        [username, hashed],
        err => {
            if (err) {
                return res.json({ success: false, message: "User already exists" });
            }
            res.json({ success: true });
        }
    );
});

// LOGIN
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        (err, user) => {
            if (!user) {
                return res.json({ success: false, message: "User not found" });
            }

            const match = bcrypt.compareSync(password, user.password);
            if (!match) {
                return res.json({ success: false, message: "Incorrect password" });
            }

            res.json({ success: true });
        }
    );
});

// GET BALANCE
app.post("/balance", (req, res) => {
    const { username } = req.body;

    db.get(
        `SELECT balance FROM users WHERE username = ?`,
        [username],
        (err, row) => {
            if (err || !row) {
                return res.json({ success: false, balance: 0 });
            }

            res.json({ success: true, balance: row.balance });
        }
    );
});

// UPDATE BALANCE (win or loss)
// amount can be positive (win) or negative (loss)
app.post("/updateBalance", (req, res) => {
    const { username, amount } = req.body;

    if (!username || typeof amount !== "number" || Number.isNaN(amount)) {
        return res.json({ success: false, message: "Invalid balance update request" });
    }

    db.get(`SELECT balance FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            return res.json({ success: false, message: "Database error" });
        }
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const nextBalance = Number(user.balance) + amount;
        if (nextBalance < 0) {
            return res.json({ success: false, message: "Insufficient balance" });
        }

        db.run(
            `UPDATE users
             SET balance = ?
             WHERE username = ?`,
            [nextBalance, username],
            err => {
                if (err) {
                    return res.json({ success: false, message: "Database error" });
                }

                res.json({ success: true, balance: nextBalance });
            }
        );
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
