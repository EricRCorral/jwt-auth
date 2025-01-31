import { createServer } from "node:http";

import { config } from "dotenv";
import { createConnection } from "mysql2/promise";
import { hash, compare } from "bcrypt";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import validate from "./schemas/user.js";

config();

const PORT = process.env.PORT ?? 3000;
const DEFAULT_CONFIG = {
  host: "localhost",
  user: "root",
  port: 3306,
  password: "password",
  database: "auth_db",
};

const APP = express();
const SERVER = createServer(APP);
const CONNECTION = await createConnection(
  process.env.DATABASE_URL ?? DEFAULT_CONFIG
);

await CONNECTION.query(`CREATE TABLE IF NOT EXISTS user (
  id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
  username VARCHAR(32) UNIQUE NOT NULL,
  password VARCHAR(64) NOT NULL
  );`);

APP.use(express.static("client"));
APP.use(cookieParser());
APP.use(express.json());

const validateUser = (req, res) => {
  const VALIDATED_USER = validate(req.body);

  if (!VALIDATED_USER.success)
    res.status(400).json({
      message: VALIDATED_USER.error.errors
        .map(({ message }) => message)
        .join("\n"),
    });

  return VALIDATED_USER;
};

APP.get("/", (_, res) => res.sendFile(`${process.cwd()}/client/index.html`));

APP.post("/register", async (req, res) => {
  const VALIDATED_USER = validateUser(req, res);

  if (!VALIDATED_USER.success) return;

  const { password, username } = VALIDATED_USER.data;

  const HASHED_PASSWORD = await hash(password, Number(process.env.SALT_ROUNDS));

  try {
    await CONNECTION.query(
      `INSERT INTO user (username, password) VALUES
    (? , ?)`,
      [username, HASHED_PASSWORD]
    );
    const [USER] = await CONNECTION.query(
      `SELECT BIN_TO_UUID(id) as id, username FROM user WHERE username = ?`,
      [username]
    );

    const TOKEN = jwt.sign(USER[0], process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    res
      .cookie("access_token", TOKEN, { httpOnly: true, sameSite: "strict" })
      .json(USER[0]);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Username already exists" });
  }
});

APP.post("/login", async (req, res) => {
  const VALIDATED_USER = validateUser(req, res);

  if (!VALIDATED_USER.success) return;

  const { password: validatedPassword, username } = VALIDATED_USER.data;

  try {
    const [user] = await CONNECTION.query(
      `SELECT BIN_TO_UUID(id) as id, username, password FROM user WHERE username = ?`,
      [username]
    );

    if (user.length === 0) {
      res.status(400).json({ message: "User does not exists" });
      return;
    }

    const passwordEqual = await compare(validatedPassword, user[0].password);

    if (!passwordEqual) {
      res.status(400).json({ message: "Wrong username or password" });
      return;
    }

    const { password, ...rest } = user[0];

    const TOKEN = jwt.sign(rest, process.env.SECRET_KEY, { expiresIn: "1h" });

    res
      .cookie("access_token", TOKEN, { httpOnly: true, sameSite: "strict" })
      .json(rest);
  } catch (error) {
    console.log(error);
  }
});

APP.get("/session", async (req, res) => {
  const TOKEN = req.cookies.access_token;

  if (!TOKEN) {
    res.status(401).send(false);
    return;
  }

  try {
    const data = jwt.verify(TOKEN, process.env.SECRET_KEY);

    res.json(data);
  } catch (error) {
    res.status(401).json({ message: "Session expired" });
  }
});

APP.get("/logout", async (_, res) =>
  res.clearCookie("access_token").status(204).send()
);

SERVER.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
