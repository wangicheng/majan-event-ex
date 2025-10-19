import { solve } from './src/solve.js';
import { sortMahjongTiles } from './src/mahjongSorter.js';

let board = null; // 用於儲存從 background.js 獲取的版面狀態

// 當 sidepanel 打開時，向 background.js 請求最新的版面狀態
chrome.runtime.sendMessage({ type: "GET_LAST_WS_MESSAGE" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    resultEl.textContent = '無法連接到背景腳本。';
    return;
  }
  if (response && response.currentBoard) {
    board = response.currentBoard;
    console.log('已獲取初始版面狀態:', board);
  } else {
    resultEl.textContent = '尚未從遊戲中獲取任何版面狀態。';
  }
});

// 監聽來自 background.js 的即時更新
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "WS_MESSAGE_UPDATE" && request.payload) {
    board = request.payload;
    console.log('版面狀態已更新:', board);
    resultEl.innerHTML = ''; // 清空舊的計算結果
    solutionDisplayEl.textContent = ''; // 清空解法顯示
    solutionContainerEl.classList.add('hidden'); // 隱藏解法區塊
  }
});

const form = document.getElementById('solver-form');
const handsInput = document.getElementById('hands-input');
const maxTimesInput = document.getElementById('maxTimes');
const maxChoiceInput = document.getElementById('maxChoice');
const lockedInput = document.getElementById('lockedInput');
const resultEl = document.getElementById('result');
const solutionDisplayEl = document.getElementById('solution-display');
const solutionContainerEl = document.getElementById('solution-display-container');
const closeSolutionBtn = document.getElementById('close-solution-btn');
const executeSolutionBtn = document.getElementById('execute-solution-btn');

// 預設隱藏換牌步驟區塊
solutionContainerEl.classList.add('hidden');

// 從本地儲存中載入已儲存的表單資料
chrome.storage.local.get(['handsInput', 'maxTimes', 'maxChoice', 'lockedInput'], (items) => {
  if (items.handsInput) {
    handsInput.value = items.handsInput;
  }
  if (items.maxTimes) {
    maxTimesInput.value = items.maxTimes;
  }
  if (items.maxChoice) {
    maxChoiceInput.value = items.maxChoice;
  }
  if (items.lockedInput) {
    lockedInput.value = items.lockedInput;
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const handsInputText = handsInput.value;
  const maxTimes = parseInt(maxTimesInput.value, 10);
  const maxChoice = parseInt(maxChoiceInput.value, 10);
  const locked = parseInt(lockedInput.value, 10);

  // 將多行輸入分割成陣列
  const lines = handsInputText.split('\n').map(s => s.trim()).filter(s => s);

  // 將表單資料儲存到本地儲存
  chrome.storage.local.set({
    handsInput: handsInputText,
    maxTimes: maxTimesInput.value,
    maxChoice: maxChoiceInput.value,
    lockedInput: lockedInput.value,
  });

  if (!board) {
    resultEl.innerHTML = '<p>尚未獲取版面狀態，無法進行計算。</p>';
    return;
  }

  if (lines.length === 0 || isNaN(maxTimes) || isNaN(maxChoice) || isNaN(locked)) {
    resultEl.innerHTML = '<p>請輸入有效的參數。</p>';
    return;
  }

  // 清空先前的結果
  resultEl.innerHTML = '';
  solutionDisplayEl.textContent = ''; // Clear solution display as well

  // 為了結果一致性，對手牌進行排序
  const currentBoard = {
      ...board,
      hand: sortMahjongTiles(board.hand),
      wall: board.wall.slice(locked)
  };

  const allResults = [];

  lines.forEach(line => {
    const spaceIndex = line.indexOf(' ');
    const targetStr = spaceIndex === -1 ? line : line.substring(0, spaceIndex);
    const waitingStr = spaceIndex === -1 ? '' : line.substring(spaceIndex + 1);

    const target = targetStr.match(/.{2}/g) || [];
    const waiting = waitingStr.match(/.{2}/g) || [];
    
    if (target.length === 0) return;

    const sortedTarget = sortMahjongTiles(target);
    const result = solve(currentBoard, sortedTarget, maxTimes, maxChoice, waiting);

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';

    // 將原始 solution 數據儲存為 JSON 字串，以便後續使用
    resultItem.dataset.rawSolution = JSON.stringify(result.solution || []);
    // 同時儲存用於計算此解法的手牌
    resultItem.dataset.hand = JSON.stringify(currentBoard.hand);

    let solutionOutput = '';
    if (result.solution && result.solution.length > 0) {
      result.solution.forEach((step, i) => {
        solutionOutput += `  步驟 ${i + 1}: 丟 ${sortMahjongTiles(step).join(', ')}\n`;
      });
    } else {
      solutionOutput += '  不需要換牌。\n';
    }
    resultItem.dataset.solution = solutionOutput;

    let output = `<h3>${sortedTarget.join(', ')}</h3>`;

    if (result.take === -1) {
      output += `<p>找不到解法。</p>`;
    } else {
      output += `<p>${result.take}</p>`;
      output += `<p>${result.waited}</p>`;
    }
    resultItem.innerHTML = output;
    
    // 直接使用 result.waited 進行排序
    allResults.push({ element: resultItem, waited: result.waited });
  });

  // 根據 waited 由大到小排序
  allResults.sort((a, b) => b.waited - a.waited);

  // 將排序後的結果附加到 DOM
  allResults.forEach(res => {
    resultEl.appendChild(res.element);
  });
});

// 使用事件委派來處理所有 result-item 的點擊
resultEl.addEventListener('click', (e) => {
  const resultItem = e.target.closest('.result-item');
  if (resultItem) {
    // 移除其他項目的 selected class
    document.querySelectorAll('.result-item.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // 為點擊的項目添加 selected class
    resultItem.classList.add('selected');

    // 更新 solution display
    solutionDisplayEl.textContent = resultItem.dataset.solution;
    // 點擊時顯示換牌步驟區塊
    solutionContainerEl.classList.remove('hidden');
  }
});

// 監聽關閉按鈕的點擊事件
closeSolutionBtn.addEventListener('click', () => {
  solutionContainerEl.classList.add('hidden');
});

// 監聽自動執行按鈕的點擊事件
executeSolutionBtn.addEventListener('click', async () => {
  const selectedItem = document.querySelector('.result-item.selected');
  if (!selectedItem || !selectedItem.dataset.rawSolution || !selectedItem.dataset.hand) {
    alert('請先選擇一個解法。');
    return;
  }

  const solution = JSON.parse(selectedItem.dataset.rawSolution);
  const initialHand = JSON.parse(selectedItem.dataset.hand);
  
  if (!solution || solution.length === 0) {
    console.log('沒有找到需要執行的換牌步驟。');
    return;
  }

  if (!board || !board.deadwall) {
    alert('無法獲取牌山 (deadwall) 狀態，無法執行自動換牌。');
    return;
  }

  // 建立手牌和牌山的副本，以便在執行過程中修改
  let currentHand = [...initialHand];
  let deadwall = [...board.deadwall];

  // --- 座標計算函式 ---
  // 計算手牌區第 n 張牌的座標 (0-12)
  function getTileCoords(n) {
    const normalizedX = 0.140 + 0.049 * n;
    const normalizedY = 0.903;
    return { normalizedX, normalizedY };
  }

  // --- 執行邏輯 ---
  // 找到當前活動的遊戲分頁
  const [tab] = await chrome.tabs.query({ active: true, url: ["*://*.maj-soul.com/*", "*://game.mahjongsoul.com/*"] });
  if (!tab) {
    alert('找不到符合條件的遊戲分頁。請確保遊戲分頁是當前活動的分頁。');
    return;
  }

  // 異步發送點擊訊息的輔助函式
  async function performClick(coords) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "PERFORM_CANVAS_CLICK",
        payload: { selector: "canvas", ...coords }
      });
    } catch (e) {
      console.error("發送點擊訊息失敗:", e);
      throw new Error("無法與遊戲分頁通訊。請確認內容腳本已注入或重新整理遊戲頁面。");
    }
  }

  // 遍歷解法的每一步
  for (let i = 0; i < solution.length; i++) {
    const tilesToDiscard = solution[i];
    console.log(`步驟 ${i + 1}: 丟 ${tilesToDiscard.join(', ')}`);

    if (tilesToDiscard.length === 0) {
      console.log('本步驟無需丟牌，跳過。');
      continue;
    }

    // 1. 找出要丟的牌在當前手牌中的索引
    const handCopyForFindingIndices = [...currentHand];
    const indicesToClick = [];
    for (const tile of tilesToDiscard) {
      const index = handCopyForFindingIndices.indexOf(tile);
      if (index !== -1) {
        indicesToClick.push(index);
        handCopyForFindingIndices[index] = null; // 標記為已使用，以處理重複的牌
      } else {
        console.error(`在當前手牌 ${currentHand.join(', ')} 中找不到要丟的牌 "${tile}"。`);
        alert(`錯誤：在手牌中找不到要丟棄的牌 "${tile}"。手牌可能已變更，自動化中止。`);
        return;
      }
    }

    // 2. 模擬點擊手牌以選取要丟棄的牌
    // console.log(`點擊手牌索引: ${indicesToClick.join(', ')}`);
    for (const index of indicesToClick) {
      await performClick(getTileCoords(index));
    }

    // 點擊確認換牌按鈕
    await performClick({ normalizedX: 0.651, normalizedY: 0.739 });

    // 3. 從內部狀態更新牌山與手牌，不進行點擊
    const numToDraw = tilesToDiscard.length;
    const drawnTiles = [];
    for (let j = 0; j < numToDraw; j++) {
      if (deadwall.length === 0) {
        alert('錯誤：牌山已空，無法摸牌。自動化中止。');
        return;
      }
      // 從我們的內部狀態中取出牌，不模擬點擊
      const drawnTile = deadwall.shift();
      drawnTiles.push(drawnTile);
    }

    // 4. 更新內部手牌狀態以進行下一輪計算
    let tempHand = [...currentHand];
    for (const tile of tilesToDiscard) {
      const indexToRemove = tempHand.indexOf(tile);
      if (indexToRemove > -1) {
        tempHand.splice(indexToRemove, 1);
      }
    }
    const newHand = [...tempHand, ...drawnTiles];
    currentHand = sortMahjongTiles(newHand);
    // console.log(`步驟 ${i + 1} 完成後的新手牌: ${currentHand.join(', ')}`);

    // 在進入下一步驟前稍作等待
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('✅ 自動化步驟執行完畢。');
});