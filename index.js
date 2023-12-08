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
app.use(express.static('headlines'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('style'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const readHTMLFile = function (filename) {
  return fs.readFileSync(filename, "utf8");
};

const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));

// Hämta registreringssidan
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

// Hämta skapandet av trådar
app.get("/createTopic", (req, res) => {
  res.sendFile(__dirname + "/homepage.html");
});

// Hämta sidan för nya inlägg
app.get("/newPost", (req, res) => {
  res.sendFile(__dirname + "/post.html");
});

// Funktion för att generera HTML för inlägg i en tråd
const generateTopicPostHTML = function(posts){
  const output = posts.map(post => `
    <ul>
      <li>
        ${new Date(post.timestamp).toLocaleString()} <br>
        Namn: ${post.namn}<br><br>
        ${post.kommentar}
      </li>
    </ul>`
  ).join("");

  return output;
}

// Funktion för att generera HTML för en användarpost på startsidan
const generatePostHTML = function (username) {
  let html = readHTMLFile("homepage.html");
  html = html.replace("***NAMN***", username);
  return html;
};

// Funktion för att generera HTML för listan med trådar
const getThreadListHTML = function (threads) {
  const listItems = threads.map(thread => `<li><a href="/topic/${thread.id}">${thread.title}</a></li>`).join("");
  return `<ul>${listItems}</ul>`;
};

// Funktion för att generera HTML för innehållet i en tråd
const generatePostContent = function (topicId) {
  const posts = []; 
  return posts.map(post => `<p>${post}</p>`).join("");
};

// Registrera en ny användare
app.post("/register", (req, res) => {
  const signIn = JSON.parse(fs.readFileSync("signin.json").toString());

  signIn.push({
    username: req.body.username,
    password: req.body.password,
  });

  fs.writeFileSync("signin.json", JSON.stringify(signIn, null, 2));
  res.redirect("/");
});

// Logga in
app.post("/login", (req, res) => {
  const signIn = JSON.parse(fs.readFileSync("signin.json").toString());

  if (loginSuccess(signIn, req.body.username, req.body.password)) {
    const session = req.session;
    session.username = req.body.username;
    res.redirect("/homepage");
  } else {
    res.send(`
      <link rel="stylesheet" href="style.css">
      <div id="felmeddelande-wrapper">
        <div id="felmeddelande">
          <p>Inloggningen misslyckades!</p>
          <button><a href='/'>Gå tillbaka till inloggningssidan</a></button>
        </div>
      </div> 
    `);
  }
});

// Kontrollera om inloggningen lyckades
const loginSuccess = function (signIn, username, password) {
  for (let user of signIn) {
    if (user.username === username && user.password === password) {
      return true;
    }
  }
  return false;
};

// Startsidan
app.get("/", (req, res) => {
  const session = req.session;
  if (session && session.username) {
    res.send(`
      <p>Välkommen ${session.username}!</p>
    `);
  } else {
    res.sendFile(__dirname + "/login.html");
  }
});

// Startsidan för inloggade användare
app.get("/homepage", (req, res) => {
  let posts = JSON.parse(fs.readFileSync("headlines.json").toString());
  let htmlContent = generatePostHTML(req.session ? req.session.username : null);
  const initialThreadListHTML = getThreadListHTML(topics);

  htmlContent = htmlContent.replace("<!-- Thread list will be dynamically inserted here -->", initialThreadListHTML);
  res.send(htmlContent);
});

// Skapa en ny tråd
app.get("/createTopic", (req, res) => {
  const formHtml = fs.readFileSync("homepage.html", "utf8");
  res.send(formHtml);
});

// Skapa en ny tråd (POST-metod)
app.post("/createTopic", (req, res) => {
  const topicTitle = req.body.topicTitle;
  const postContent = req.body.postContent;

  addNewThread(topicTitle, postContent);
  const updatedThreadListHTML = getThreadListHTML(topics);
  let html = generatePostHTML(req.session ? req.session.username : null);

  html = html.replace("<!-- Thread list will be dynamically inserted here -->", updatedThreadListHTML);
  res.send(html);
});

const topics = JSON.parse(fs.readFileSync("headlines.json", "utf8"));

// Lägga till en ny tråd
const addNewThread = (topicTitle, postContent) => {
  const newTopicId = topics.length + 1;
  const newPostId = posts.length + 1;

  const newTopic = { id: newTopicId, title: topicTitle };
  const newPost = { id: newPostId, content: postContent, topicId: newTopicId };

  topics.push(newTopic);
  posts.push(newPost);

  fs.writeFileSync("headlines.json", JSON.stringify(topics, null, 2), "utf8");
  fs.writeFileSync("posts.json", JSON.stringify(posts, null, 2), "utf8");
};

// Visa en tråd
app.get("/topic/:id", function (req, res) {
  const htmlTemplate = fs.readFileSync("post.html", "utf8");

  const topics = JSON.parse(fs.readFileSync("headlines.json", "utf8"));
  const currentTopic = topics.find((topic) => topic.id == req.params.id);

  let posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
  let firstPost = posts.find((post) => post.topicId == Number(req.params.id));

  if (currentTopic) {
    const topicTitle = currentTopic.title;
    req.session.topicTitle = topicTitle;
    let postContent = posts.content;
    postContent = generatePostContent(req.params.id);
    req.session.postContent = postContent;
    
    let inlagg = JSON.parse(fs.readFileSync("output.json", "utf8"));

    let isMyId = (inl) => {
      console.log(inl.idTopic == req.params.id);
      return inl.idTopic == req.params.id;
    };
    let allaInlagg = inlagg.filter(isMyId);

    let html = htmlTemplate
      .replace("***TRÅDNAMN***", currentTopic.title)
      .replace("***TRÅDINLÄGG***", firstPost.content)
      .replace("***INLÄGG***", generateTopicPostHTML (req.session ? allaInlagg : null))
      .replace("***TOPICID***", req.params.id);
      res.send(html);
  } else {
    res.send("<h1>Trådämnet hittades inte.</h1>");
  }
});

// Skapa ett nytt inlägg i en tråd
app.post("/newPost", (req, res) => {
  let newPost = req.body;
 
  if (!newPost || !newPost.namn || !newPost.kommentar) {
    res.send('<h1>Alla fält måste vara ifyllda! </h1>');
    return;
  }

  generatePostHTML(posts, req.session ? req.session.username : null);
  let existingPosts = JSON.parse(fs.readFileSync("output.json").toString());
  let isDuplicate = existingPosts.some(post => post.namn === newPost.namn && post.kommentar === newPost.kommentar);

  if (!isDuplicate) {
    existingPosts.push({ ...newPost, timestamp: new Date() });

    fs.writeFileSync("output.json", JSON.stringify(existingPosts, null, 2));

    req.session.postContent = generatePostContent(newPost.topicId);
    
    res.redirect(`/topic/${newPost.idTopic}`);
  } else {
    res.send('<h>Duplicerat inlägg! </h1>');
  }
});
