

var tape = require('tape')
var level = require('level-test')()
var pull = require('pull-stream')
var update = require('../')

tape('test', function (t) {

  var db = level('test-level-update-stream')

  pull(
    pull.count(100),
    pull.asyncMap(function (v, cb) {
      setTimeout(function () {
        cb(null, v)
      }, Math.random()*10)
    }),
    pull.map(function (e) {
      return {key : ~~(Math.random()*10), value: ~~(Math.random()*2), type: 'put'}
    }),
//    pull.through(console.log),
    update(db, function (err, count) {
      console.log('end')
      console.log(count)
      t.end()
    })
  )
})
