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
const handsInput = document.getElementById('hands-input');
const maxTimesInput = document.getElementById('maxTimes');
const maxChoiceInput = document.getElementById('maxChoice');
const resultEl = document.getElementById('result');
const solutionDisplayEl = document.getElementById('solution-display');

// 從本地儲存中載入已儲存的表單資料
chrome.storage.local.get(['handsInput', 'maxTimes', 'maxChoice'], (items) => {
  if (items.handsInput) {
    handsInput.value = items.handsInput;
  }
  if (items.maxTimes) {
    maxTimesInput.value = items.maxTimes;
  }
  if (items.maxChoice) {
    maxChoiceInput.value = items.maxChoice;
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const handsInputText = handsInput.value;
  const maxTimes = parseInt(maxTimesInput.value, 10);
  const maxChoice = parseInt(maxChoiceInput.value, 10);

  // 將多行輸入分割成陣列
  const lines = handsInputText.split('\n').map(s => s.trim()).filter(s => s);

  // 將表單資料儲存到本地儲存
  chrome.storage.local.set({
    handsInput: handsInputText,
    maxTimes: maxTimesInput.value,
    maxChoice: maxChoiceInput.value,
  });

  if (!board) {
    resultEl.innerHTML = '<p>尚未獲取版面狀態，無法進行計算。</p>';
    return;
  }

  if (lines.length === 0 || isNaN(maxTimes) || isNaN(maxChoice)) {
    resultEl.innerHTML = '<p>請輸入有效的參數。</p>';
    return;
  }

  // 清空先前的結果
  resultEl.innerHTML = '';
  solutionDisplayEl.textContent = ''; // Clear solution display as well

  // 為了結果一致性，對手牌進行排序
  const currentBoard = {
      ...board,
      hand: sortMahjongTiles(board.hand)
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
  }
});