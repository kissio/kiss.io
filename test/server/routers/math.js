'use strict';

var kiss = require('../../../'),
    router = kiss.Router();

var mathHandler = require('../handlers/math');

/*!
 * Init router
 */
router.on('math.*', function(socket)
{
  var math = socket.nsp;
  math.eventsTriggered++;
});

router
  .event('math.inc')
  .triggers(mathHandler.onIncrement);

router
  .event('math.dec')
  .triggers(mathHandler.onDecrement);

router
  .event('math.calc')
  .triggers(mathHandler.onCalculate);

router
  .event('math.print')
  .triggers(mathHandler.onPrint);

/*!
 * Exports.
 */
module.exports = router;
