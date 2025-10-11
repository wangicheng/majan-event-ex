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

  // 為了結果一致性，對手牌進行排序
  const currentBoard = {
      ...board,
      hand: sortMahjongTiles(board.hand)
  };

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

    let output = `<h3>目標: ${sortedTarget.join(', ')}</h3>`;

    if (result.take === -1) {
      output += '<p>找不到解法。</p>';
    } else {
      output += `<p>摸牌數量 (Take): ${result.take}</p>`;
      output += `<p>聽牌張數 (Waited): ${result.waited}</p>`;
      output += `<button class="toggle-solution">顯示換牌步驟</button>`;
      
      let solutionOutput = '';
      if (result.solution && result.solution.length > 0) {
        result.solution.forEach((step, i) => {
          solutionOutput += `  步驟 ${i + 1}: 丟 ${sortMahjongTiles(step).join(', ')}\n`;
        });
      } else {
        solutionOutput += '  不需要換牌。\n';
      }
      output += `<div class="solution-details" style="display: none;"><pre>${solutionOutput}</pre></div>`;
    }
    resultItem.innerHTML = output;
    resultEl.appendChild(resultItem);
  });
});

// 使用事件委派來處理所有 solution 的切換按鈕
resultEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('toggle-solution')) {
    const solutionDetails = e.target.nextElementSibling;
    const isVisible = solutionDetails.style.display === 'block';

    // 先隱藏所有其他的 solution
    document.querySelectorAll('.solution-details').forEach(el => {
      if (el !== solutionDetails) {
        el.style.display = 'none';
        el.previousElementSibling.textContent = '顯示換牌步驟';
      }
    });

    // 切換被點擊的 solution
    if (isVisible) {
      solutionDetails.style.display = 'none';
      e.target.textContent = '顯示換牌步驟';
    } else {
      solutionDetails.style.display = 'block';
      e.target.textContent = '隱藏換牌步驟';
    }
  }
});