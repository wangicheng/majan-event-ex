/**
 * 尋找成為目標手牌的操作方式。
 * @param {{hand: string[], dora: string[], wall: string[], deadwall: string[]}} board - 版面狀態。
 * @param {string[]} target - 目標手牌。
 * @param {number} maxTimes - 最大換牌次數。
 * @param {number} maxChoice - 最大選擇數量。
 * @param {string[]} waiting - 聽牌。
 * @returns {{take: number, solution: string[][], waited: number}} 包含摸牌數量和每次換牌需選擇的牌。
 */
export function solve(board, target, maxTimes, maxChoice, waiting) {
  /**
   * 計算牌組中每種牌的數量。
   * @param {string[]} tiles - 牌的陣列。
   * @returns {Map<string, number>} 每種牌及其數量的對應。
   */
  const countTiles = (tiles) => {
    const counts = new Map();
    for (const tile of tiles) {
      counts.set(tile, (counts.get(tile) || 0) + 1);
    }
    return counts;
  };

  /**
   * 測試給定的摸牌數量（take）是否可行。
   * @param {number} take - 從牌山摸的牌數。
   * @returns {{take: number, solution: string[][]}|null} 如果找到解法則回傳結果，否則回傳 null。
   */
  const _solveTest = (take) => {
    for (let change = 0; change <= board.deadwall.length; change++) {
      if (change > 0 && !target.includes(board.deadwall[change - 1])) {
        continue;
      }

      const need = countTiles(target);
      const hand = countTiles(board.hand);

      for (const [majan, count] of hand.entries()) {
        need.set(majan, (need.get(majan) || 0) - count);
      }
      for (let i = 0; i < change; i++) {
        const majan = board.deadwall[i];
        need.set(majan, (need.get(majan) || 0) - 1);
      }
      for (let i = 0; i < take; i++) {
        const majan = board.wall[i];
        need.set(majan, (need.get(majan) || 0) - 1);
      }

      let maxNeed = 0;
      for (const count of need.values()) {
        maxNeed = Math.max(maxNeed, count);
      }
      if (maxNeed > 0) {
        continue;
      }

      const solution = [];
      let totalChanged = 0;
      let times = 0;
      const currentHand = new Map(hand);

      while (totalChanged < change) {
        const operation = new Map();
        let changed = 0;

        for (const [majan, count] of currentHand.entries()) {
          if (count <= 0) continue;
          const surplus = -(need.get(majan) || 0);
          if (surplus <= 0) continue;

          const throwCount = Math.min(
            surplus,
            count,
            maxChoice - changed,
            change - totalChanged - changed
          );

          if (throwCount > 0) {
            need.set(majan, need.get(majan) + throwCount);
            currentHand.set(majan, currentHand.get(majan) - throwCount);
            operation.set(majan, throwCount);
            changed += throwCount;
          }
        }

        if (changed === 0) {
          break;
        }

        for (let i = 0; i < changed; i++) {
          const majan = board.deadwall[totalChanged + i];
          currentHand.set(majan, (currentHand.get(majan) || 0) + 1);
        }

        const operationList = [];
        for (const [majan, count] of operation.entries()) {
          for (let i = 0; i < count; i++) {
            operationList.push(majan);
          }
        }
        solution.push(operationList);

        totalChanged += changed;
        times++;

        if (times >= maxTimes) {
          break;
        }
      }

      if (totalChanged === change) {
        return { take, solution };
      }
    }

    return null;
  };

  let takeL = 0;
  let takeR = board.wall.length;
  let ans = { take: -1, solution: null, waited: -1 };

  while (takeL <= takeR) {
    const takeM = Math.floor((takeL + takeR) / 2);
    const result = _solveTest(takeM);

    if (result === null) {
      takeL = takeM + 1;
    } else {
      if (ans.take === -1 || ans.take > result.take) {
        ans = result;
      }
      takeR = takeM - 1;
    }
  }

  // 計算聽牌在剩餘牌山中的數量
  if (ans.take !== -1) {
    const remainingWall = board.wall.slice(ans.take);
    const waitingTiles = new Set(waiting);
    ans.waited = remainingWall.filter((tile) => waitingTiles.has(tile)).length;
  }

  return ans;
}