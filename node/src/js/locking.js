module.exports = function(m) {
  var locks = {};
  
  m.setLock = function(lockName) {
    locks[lockName] = true;
  };

  m.removeLock = function(lockName) {
    delete(locks[lockName]);
  };

  m.getLock = function(lockName) {
    if (typeof(locks[lockName])!=="undefined") {
      return locks[lockName];
    }
    return false;
  };

  m.locked = function(ignoreLock) {
    for (var lock in locks) {
      if (locks.hasOwnProperty(lock)) {
        if (lock!==ignoreLock) {
          return true;
        }
      }
    }
    return false;
  };

};