var router = require("express").Router();

router.get("/sports", function (요청, 응답) {
  응답.send("스포츠 게시판");
});

router.get("/game", function (요청, 응답) {
  응답.send("게임 게시판");
});
//borad/sub/sports라고 치면 스포츠 게시판으로 감

module.exports = router;
