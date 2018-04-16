exec = require('child_process').exec;
exec("git clone https://github.com/CenterOnBudget/cbpp_shared_gulp --depth 1 CBPP_shared_gulp", function(err) {
  if (err) {
    if (err.code!==128) {
      console.log(err);
    }
  }
});
