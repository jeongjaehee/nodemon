const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
require("dotenv").config();
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

var db;
MongoClient.connect(process.env.DB_URL, function (err, client) {
  if (err) return console.log(err);
  db = client.db("todoapp");
  http.listen(process.env.PORT, function () {
    console.log("listening on 8080");
  });
});

app.get("/", function (요청, 응답) {
  응답.render("index.ejs");
});

app.get("/write", function (요청, 응답) {
  응답.render("write.ejs");
});

app.get("/list", function (요청, 응답) {
  db.collection("post")
    .find()
    .toArray(function (에러, 결과) {
      console.log(결과);
      응답.render("list.ejs", { posts: 결과 });
    });
});

app.get("/detail/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("detail.ejs", { data: 결과 });
    }
  );
});
app.get("/edit/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("edit.ejs", { post: 결과 });
    }
  );
});

app.put("/edit", function (요청, 응답) {
  db.collection("post").updateOne(
    { _id: parseInt(요청.body.id) },
    { $set: { 제목: 요청.body.title, 날짜: 요청.body.date } },
    function () {
      console.log("수정완료");
      응답.redirect("/list");
    }
  );
});

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  function (요청, 응답) {
    응답.redirect("/");
  }
);

app.get("/login", function (요청, 응답) {
  응답.render("login.ejs");
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (입력한아이디, 입력한비번, done) {
      //console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne(
        { id: 입력한아이디 },
        function (에러, 결과) {
          if (에러) return done(에러);

          if (!결과)
            return done(null, false, { message: "존재하지않는 아이디요" });
          if (입력한비번 == 결과.pw) {
            return done(null, 결과);
          } else {
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (아이디, done) {
  db.collection("login").findOne({ id: 아이디 }, function (에러, 결과) {
    done(null, 결과);
  });
});

app.post("/register", function (요청, 응답) {
  db.collection("login").insertOne(
    { id: 요청.body.id, pw: 요청.body.pw },
    function (에러, 결과) {
      응답.redirect("/");
    }
  );
});
app.post("/add", function (요청, 응답) {
  console.log(요청.user._id);
  응답.send("전송완료");
  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (에러, 결과) {
      var 총게시물갯수 = 결과.totalPost;
      var post = {
        _id: 총게시물갯수 + 1,
        작성자: 요청.user._id,
        제목: 요청.body.title,
        날짜: 요청.body.date,
      };
      db.collection("post").insertOne(post, function (에러, 결과) {
        db.collection("counter").updateOne(
          { name: "게시물갯수" },
          { $inc: { totalPost: 1 } },
          function (에러, 결과) {
            if (에러) {
              return console.log(에러);
            }
          }
        );
      });
    }
  );
});

app.post("/message", 로그인했니, function (요청, 응답) {
  var 저장할거 = {
    parent: 요청.body.parent,
    userid: 요청.user._id,
    content: 요청.body.content,
    date: new Date(),
  };
  db.collection("message")
    .insertOne(저장할거)
    .then((결과) => {
      응답.send(결과);
    });
});
app.get("/mypage", 로그인했니, function (요청, 응답) {
  console.log(요청.user);
  응답.render("mypage.ejs", { 사용자: 요청.user });
});

function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next();
  } else {
    응답.send("로그인안하셨어요");
  }
}

app.get("/search", (요청, 응답) => {
  var 검색조건 = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: 요청.query.value,
          path: "제목", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
  ];
  console.log(요청.query);
  db.collection("post")
    .aggregate(검색조건)
    .toArray((에러, 결과) => {
      console.log(결과);
      응답.render("search.ejs", { posts: 결과 });
    });
});
app.delete("/delete", function (요청, 응답) {
  console.log("삭제요청함", 요청.body._id, 요청.user._id);
  요청.body._id = parseInt(요청.body._id);
  //요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
  db.collection("post").deleteOne(
    { _id: 요청.body._id, 작성자: 요청.user._id },
    function (에러, 결과) {
      console.log("삭제완료");
      console.log("에러", 에러);
      if (결과) console.log(결과, "지운갯수나옴");
      응답.status(200).send({ message: "성공했습니다" });
    }
  );
});

app.use("/shop", require("./routes/shop.js"));
app.use("/board/sub", require("./routes/board.js"));

let multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/img");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

var upload = multer({ storage: storage });

app.get("/upload", function (요청, 응답) {
  응답.render("upload.ejs");
});

app.post("/upload", upload.single("profile"), function (요청, 응답) {
  응답.send("업로드완료");
});
app.get("/image/:imageName", function (요청, 응답) {
  응답.sendFile(__dirname + "/public/image/" + 요청.params.imageName);
});

const { ObjectId } = require("mongodb");
app.post("/chatroom", function (요청, 응답) {
  var 저장할거 = {
    title: "무슨채팅방",
    member: [ObjectId(요청.당한사람id), 요청.user._id],
    date: new Date(),
  };
  db.collection("chatroom")
    .insertOne(저장할거)
    .then(function (결과) {
      응답.send("저장완료");
    });
});

app.get("/chat", 로그인했니, function (요청, 응답) {
  db.collection("chatroom")
    .find({ member: 요청.user._id })
    .toArray()
    .then((결과) => {
      console.log(결과);
      응답.render("chat.ejs", { data: 결과 });
    });
});
app.get("/message/:parentid", 로그인했니, function (요청, 응답) {
  응답.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  db.collection("message")
    .find({ parent: 요청.params.parentid })
    .toArray()
    .then((결과) => {
      console.log(결과);
      응답.write("event: test\n");
      응답.write(`data: ${JSON.stringify(결과)}\n\n`);
    });
  const 찾을문서 = [
    { $match: { "fullDocument.parent": 요청.params.parentid } },
  ];
  const changeStream = db.collection("message").watch(찾을문서);
  changeStream.on("change", (result) => {
    console.log(result.fullDocument);
    var 추가된문서 = [result.fullDocument];
    응답.write("event:test\n");
    응답.write(`data:${JSON.stringify(추가된문서)}\n\n`);
  });
});
app.get("/socket", function (요청, 응답) {
  응답.render("socket.ejs");
  io.on("connection", function (socket) {
    socket.on("user-send", function (data) {
      console.log(data);
      io.emit("broadcast", data);
    });
    socket.on("joinroom", function (data) {
      console.log(data);
      socket.join("room1");
    });
    socket.on("room1-send", function (data) {
      console.log(data);
      io.to("room1").emit("broadcast", data);
    });
  });
});
