/**
 * 根據麻將規則排序麻將字串。
 * 排序順序：1a < 1m < ... < 9m < 1p < ... < 4p < 0p < 5p < ... < 9p < 1s < ... < 4s < 0s < 5s < ... < 9s < 1z < ... < 7z
 * @param {string[]} tiles - 要排序的麻將字串陣列。
 * @returns {string[]} 排序後的麻將字串陣列。
 */
export function sortMahjongTiles(tiles) {
  const suitOrder = { 'a': 0, 'm': 1, 'p': 2, 's': 3, 'z': 4 };
  const numberOrderP_S = { '1': 1, '2': 2, '3': 3, '4': 4, '0': 5, '5': 6, '6': 7, '7': 8, '8': 9, '9': 10 };
  const numberOrderM_Z = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9 };

  return [...tiles].sort((a, b) => {
    const suitA = a[a.length - 1];
    const numA = a.slice(0, -1);
    const suitB = b[b.length - 1];
    const numB = b.slice(0, -1);

    // 比較花色
    const suitCompare = suitOrder[suitA] - suitOrder[suitB];
    if (suitCompare !== 0) {
      return suitCompare;
    }

    // 比較數字
    if (suitA === 'p' || suitA === 's') {
      return numberOrderP_S[numA] - numberOrderP_S[numB];
    } else {
      return numberOrderM_Z[numA] - numberOrderM_Z[numB];
    }
  });
}