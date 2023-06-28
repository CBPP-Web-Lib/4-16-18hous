function bbox_overlap(box1, box2) {
  /*box1 left greater than box2 right*/
  if (box1[0] > box2[2]) {
    return false
  }
  /*box1 bottom above box2 top*/
  if (box1[1] > box2[3]) {
    return false
  }
  /*box1 right less than box2 left*/
  if (box1[2] < box2[0]) {
    return false
  }
  /*box1 top below box2 bottom*/
  if (box1[3] < box2[1]) {
    return false
  }
  return true
}

export { bbox_overlap }