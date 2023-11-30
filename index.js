const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const http = require("http");
const fs = require("fs");

const app = express();
const PORT = 8080;
const thirtyMinutes = 1000 * 60 * 30;

app.use(
  session({
    secret: "thiskey",
    saveUninitialized: true,
    cookie: { maxAge: thirtyMinutes },
    resave: false,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("style"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", function (req, res) {
  const session = req.session;
  if (session && session.username) {
    res.send(`
      <p>Välkommen ${session.username}!</p>
    `);
  } else {
    res.sendFile(__dirname + "/login.html");
  }
});

app.post("/login", (req, res) => {
  const signIn = JSON.parse(fs.readFileSync("signin.json").toString());

  if (loginSuccess(signIn, req.body.username, req.body.password)) {
    const session = req.session;
    session.username = req.body.username;
    res.redirect("/homepage");
  } else {
    res.send(`
    <p>Inloggningen misslyckades!</p>
    <p><a href='/'>Tillbaka till inloggningssidan</a></p>
    `);
  }
});

app.get("/homepage", (req, res) => {
  let posts = JSON.parse(fs.readFileSync("output.json").toString());
  posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  let html = generatePostHTML(posts, req.session ? req.session.username : null);
  res.send(html);
});

app.post("/newPost", (req, res) => {
  let newPost = req.body;

  if (!newPost || !newPost.namn || !newPost.email || !newPost.nummer || !newPost.kommentar) {
    res.write('<h>Alla fält måste vara ifyllda!</h1>');
    res.send();
    return;
  }

  let input = JSON.parse(fs.readFileSync("output.json").toString());
  input.push({ ...newPost, timestamp: new Date() });
  fs.writeFileSync("output.json", JSON.stringify(input));

  res.redirect("/homepage");
});

let loginSuccess = function (signIn, username, password) {
  for (let user of signIn) {
    if (user.username === username && user.password === password) {
      return true;
    }
  }
  return false;
};

let generatePostHTML = function (posts, username) {
  let output = posts
    .map(
      (post) =>
        `<li>
      ${new Date(post.timestamp).toLocaleString()}<br><br>
      Namn: ${post.namn}<br>
      Email: ${post.email}<br>
      Nummer: ${post.nummer}<br><br>
      Idéer & förslag: <br> ${post.kommentar}</li>`
    )
    .join("");

  let html = fs.readFileSync("homepage.html", "utf8");
  return html.replace("******", `<ul>${output}</ul>`).replace("***NAMN***", username || "");
};
