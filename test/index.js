

var tape = require('tape')
var level = require('level-test')()
var pull = require('pull-stream')
var update = require('../')
var pl = require('pull-level')

function kvize (ary, obj) {
  ary.forEach(function (row) {
    obj[row.key] = row.value
  })
  return obj
}

tape('test', function (t) {

  var db = level('test-level-update-stream')
  var results = {}

  pull(
    pull.count(100),
    pull.asyncMap(function (v, cb) {
      if(Math.random() < 0.5) return cb(null, v)
      setTimeout(function () {
        cb(null, v)
      }, Math.random()*10)
    }),
    pull.map(function (e) {
      return {key : ~~(Math.random()*20), value: ''+~~(Math.random()*2)}
    }),
    pull.through(function (row) {
      kvize([row], results)
    }),
    update(db, function (err, count) {
      console.log('end')
      console.log(count)
      pull(pl.read(db), pull.collect(function (err, r) {
        t.deepEqual(results, kvize(r, {}))
        t.end()
      }))
    })
  )
})

function kvStream (obj) {
  var a = []
  for(var k in obj)
    a.push({key: k, value: obj[k], type: obj[k] ? 'put' : 'del'})

  return pull.values(a)
}

tape('test', function (t) {

  var db = level('test-level-update-stream2')

  pull(
    kvStream({
      foo:'1',
      bar: '2',
      baz: '3',
      blerg: '4'
    }),
    update(db, function (err, count) {
      if(err) throw err
      t.equal(count, 4) //updated everything.

      pull(
        kvStream({
          foo:'1',
          bar: '20',
          baz: '3',
          blerg: '40'
        }),
        update(db, function (err, count) {
          if(err) throw err
          t.equal(count, 2) //updated bar and blerg

          pull(pl.read(db), pull.collect(function (err, ary) {
            t.deepEqual(ary,
              [ { key: 'bar', value: '20' },
                { key: 'baz', value: '3' },
                { key: 'blerg', value: '40' },
                { key: 'foo', value: '1' } ])

            t.end()
          }))
        })
      )
    })
  )


})


