export const getMaxWidth = (columnSize, column, divideInto, withRightMargin) => {
  // .007 is the margin right given to every block. Since we don't need it for last block, therefore have multiplied it by length - 1. // (100/15) is the grid size since we have divided it into 15 blocks // Hence at last the formula derived is 100- (100*.007* (length - 1)) * width / 15 ; // Simplified version is used below.
  // console.log(withRightMargin)
  return withRightMargin
    ? `${columnSize * (100 / divideInto) * (1 - 0.007 * (column - 1))}%`
    : `${columnSize * (100 / divideInto)}%`
}

export const getDynamicStyle = (gridSize, columns, divideInto, withRightMargin = false) => {
  const width = getMaxWidth(gridSize, columns, divideInto, withRightMargin)
  return {
    maxWidth: width,
    flexBasis: width,
    flexGrow: 0
  }
}
