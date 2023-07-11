import { initialize } from "./initialize"
import * as viewport from "./viewport"

const VoucherMap = function() {
  Object.keys(viewport).forEach((key) => {
    this[key] = viewport[key].bind(this)
  })

  this.initialize = initialize.bind(this)
}

export {VoucherMap}