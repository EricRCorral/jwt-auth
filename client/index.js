const BODY = document.querySelector("body");

const FORM = `
<form>
<h3>Login</h3>
<div>
<label>Username</label>
<input placeholder="Write your username" id="username" type="text" />
<small id='username-error'></small>
</div>
<div>
<label>Password</label>
<input placeholder="Write your password" id="password" type="password" />
<small id="password-error"></small>
</div>
<button>Login</button>
<small id="post-error"></small>
<p id="login-or-register" onclick="handleIsLogin()">Does not have an account?</p>
</form>`;

let isLogin = true;

const sessionHTML = ({ id, username }) => `<div class='session-container'>
<h3>ID: ${id}</h3>
<h3>Username: ${username}</h3>
<button onclick="logout()">Logout</button>
</div>`;

const validateSession = async () => {
  BODY.innerHTML = `<div class='loader' />`;

  const RESP = await fetch("/session");

  if (RESP.status !== 200) {
    BODY.innerHTML = FORM;
    return;
  }

  const data = await RESP.json();

  BODY.innerHTML = sessionHTML(data);
};

BODY.innerHTML = FORM;

validateSession();

const logout = async () => {
  await fetch("/logout");
  BODY.innerHTML = FORM;
};

const handleIsLogin = () => {
  isLogin = !isLogin;

  document.querySelector("h3").textContent = isLogin ? "Login" : "Register";

  document.querySelector("button").textContent = isLogin ? "Login" : "Register";

  document.getElementById("login-or-register").textContent = isLogin
    ? "Does not have an account?"
    : "Have an account?";
};

const validateInputs = (username, password) => {
  const PASSWORD_ERROR = document.getElementById("password-error");
  const USERNAME_ERROR = document.getElementById("username-error");

  if (username.length < 6) {
    USERNAME_ERROR.textContent = "Username must have at least 6 characters";
    return true;
  }

  USERNAME_ERROR.textContent = "";

  if (password.length < 6) {
    PASSWORD_ERROR.textContent = "Password must have at least 6 characters";
    return true;
  }

  PASSWORD_ERROR.textContent = "";
};

const handlePost = async (e) => {
  e.preventDefault();
  const USERNAME = document.getElementById("username")?.value;
  const PASSWORD = document.getElementById("password")?.value;
  if (validateInputs(USERNAME, PASSWORD)) return;

  try {
    const resp = await fetch(isLogin ? "/login" : "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });

    const POST_ERROR = document.getElementById("post-error");

    if (resp.status !== 200) {
      const { message } = await resp.json();
      POST_ERROR.textContent = message;
      return;
    }

    POST_ERROR.textContent = "";

    const data = await resp.json();

    BODY.innerHTML = sessionHTML(data);
  } catch (error) {
    alert(error);
  }
};

addEventListener("submit", handlePost);
