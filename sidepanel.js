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
  }
});

const form = document.getElementById('solver-form');
const targetInput = document.getElementById('target');
const maxTimesInput = document.getElementById('maxTimes');
const maxChoiceInput = document.getElementById('maxChoice');
const waitingInput = document.getElementById('waiting');
const resultEl = document.getElementById('result');

// 從本地儲存中載入已儲存的表單資料
chrome.storage.local.get(['target', 'maxTimes', 'maxChoice', 'waiting'], (items) => {
  if (items.target) {
    targetInput.value = items.target;
  }
  if (items.maxTimes) {
    maxTimesInput.value = items.maxTimes;
  }
  if (items.maxChoice) {
    maxChoiceInput.value = items.maxChoice;
  }
  if (items.waiting) {
    waitingInput.value = items.waiting;
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const target = targetInput.value.split(',').map(s => s.trim()).filter(s => s);
  const maxTimes = parseInt(maxTimesInput.value, 10);
  const maxChoice = parseInt(maxChoiceInput.value, 10);
  const waiting = waitingInput.value.split(',').map(s => s.trim()).filter(s => s);

  // 將表單資料儲存到本地儲存
  chrome.storage.local.set({
    target: targetInput.value,
    maxTimes: maxTimesInput.value,
    maxChoice: maxChoiceInput.value,
    waiting: waitingInput.value
  });

  if (!board) {
    resultEl.textContent = '尚未獲取版面狀態，無法進行計算。';
    return;
  }

  if (target.length === 0 || isNaN(maxTimes) || isNaN(maxChoice)) {
    resultEl.textContent = '請輸入有效的參數。';
    return;
  }

  // 為了結果一致性，對手牌和目標牌進行排序
  const currentBoard = {
      ...board,
      hand: sortMahjongTiles(board.hand)
  };
  const sortedTarget = sortMahjongTiles(target);

  const result = solve(currentBoard, sortedTarget, maxTimes, maxChoice, waiting);

  if (result.take === -1) {
    resultEl.textContent = '找不到解法。';
  } else {
    let output = `摸牌數量 (Take): ${result.take}\n\n`;
    output += '換牌步驟 (Solution):\n';
    if (result.solution && result.solution.length > 0) {
      result.solution.forEach((step, index) => {
        output += `  步驟 ${index + 1}: 丟 ${sortMahjongTiles(step).join(', ')}\n`;
      });
    } else {
      output += '  不需要換牌。\n';
    }
    output += `\n聽牌張數 (Waited): ${result.waited}\n`;
    resultEl.textContent = output;
  }
});