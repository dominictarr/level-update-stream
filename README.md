# level-update-stream

A pull stream that writes to a leveldb instance, but only when it's actually a change.

``` js
var pull = require('pull-stream')
var level = require('level')

var db = level(path...)

pull(
  source,
  update(db, function (err, updateCount) {
    //this callback is optional.
    console.log(updateCount, 'records written')
  })
)

```

If you want to use this with ordinary streams,
use [pull-stream-to-stream](https://github.com/dominictarr/pull-stream-to-stream)

## License

MIT
