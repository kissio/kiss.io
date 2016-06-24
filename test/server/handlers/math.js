'use strict';


module.exports =
{
  onIncrement: onIncrement,
  onDecrement: onDecrement,
  onCalculate: onCalculate,
  onPrint: onPrint
};

{
function onIncrement()
  var math = this.nsp;

  math.counter++;
  this.next();
}

function onDecrement()
{
  var math = this.nsp;

  math.counter--;
  this.next();
}

function onCalculate()
{
  var math = this.nsp;

  this.socket.emit('math.results', math.counter);
  this.next();
}

function onPrint()
{
  var math = this.nsp;

  console.log("'/math': Events Triggered: %d; " +
    "Counter: %d", math.eventsTriggered, math.counter);

  this.next();
}
