var equal = require('deep-equal')

function empty (obj) {
  for(var k in obj)
    return false
  return true
}

//let objects stream in, and check whether each one is already in tha database before saving it.
//on each write - get the value first,

/*
                @ need_read
         .--- 2
         |    ^
 reading |    | need_read
         |    |
         `->START
              |
              | end
              v
              END
*/

function each (obj, iter) {
  for(var k in obj)
    iter(obj[k], k, obj)
}

// (empty_read | (reading, (empty_write | (writing, written))) ) *, end

// (need_read+, reading)*, end

// (reading, (need_write+, writing) | empty_write)*, end

module.exports = function (db, cb) {

  cb = cb || function () {}
  var reading = {}, writing = [], idle = true, wake, count = 0, getting = 0, toRead = 0
  var state = 'idle'

  function setState (set, expected) {
    if(state !== expected)
      throw new Error('expected state to be ' + expected + ' , was:' + state)
    state = set
  }


  // This part is a state machine which reads
  // and then writes if there are any thing to write.

  function run () {
    if(!idle) return

    if(wake) {
      var _wake = wake
      wake = null
      return _wake()
    }

    //EVENT: empty read
    if(empty(reading)) return setState('idle', 'idle')
    idle = false

    var n = 0
    setState('reading', 'idle')

    //EVENT: reading
    each(reading, function (rv, k) {
      n++
      getting ++
      db.get(k, function (err, v) {
        getting --

        //event: need_write
        if(!equal(v, rv)) writing.push({
          key: k, value: rv, type: rv == null ? 'del' : 'put'
        })

        next()
      })
    })
    //clear current reading list.
    reading = {}; toRead = 0

    function next () {
      if(--n) return
      //EVENT: read
      // if there are no updates, just go back to reading.

      if(!writing.length) {
        //EVENT: empty_writes
        setState('idle', 'reading')
        return idle = true, run()
      }
     setState('writing', 'reading')

      var _writing = writing
      writing = []

      count += _writing.length
      //EVENT: writing
      db.batch(_writing, function (err) {
        setState('idle', 'writing')
        //EVENT: written
        if(idle) throw new Error('expect !idle')
        idle = true
        run()
      })
    }
  }

  return function (read) {
    read(null, function next (end, data) {
      if(end) {
        var err = end === true ? null : end
        if(idle) cb(err, count)
        else wake = function () { cb(err, count) }
        return
      }
      //EVENT: need read.
      if(!reading[data.key]) toRead ++
      reading[data.key] = data.value
      run()
      //if there are lots of things moving already, wait until they have saved.

      function more () {
        read(null, next)
      }

      if(getting + toRead + writing.length > 100) wake = more
      else                        more()
    })
  }
}
