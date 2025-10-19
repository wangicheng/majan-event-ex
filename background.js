let currentBoard = null; // 用於儲存當前版面狀態。

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "WS_MESSAGE" && request.payload) {
    const rawMessage = new Uint8Array(Object.values(request.payload));

    // 直接嘗試解讀訊息，並在解讀過程中進行過濾
    const newBoard = interpretMessage(rawMessage);

    if (newBoard !== null) { // 只有當訊息被成功解讀且符合規則時才處理
      currentBoard = newBoard;

      // 通知 sidepanel.js 有新的已解讀訊息
      chrome.runtime.sendMessage({ type: "WS_MESSAGE_UPDATE", payload: newBoard });
    }
  } else if (request.type === "GET_LAST_WS_MESSAGE") {
    // 當 sidepanel.js 請求時，回傳最後一條已解讀的訊息
    sendResponse({ currentBoard: currentBoard });
  }
});

/**
 * 解讀 WebSocket 訊息，並在解讀過程中判斷其是否符合規則。
 * @param {Uint8Array} rawMessage - 原始的 WebSocket 訊息資料。
 * @returns {string | object | null} - 解讀後的訊息（字串、物件等），如果訊息不符合規則則返回 null。
 */
function interpretMessage(rawMessage) {
  // 由於每個單元是 8 個字符長，我們只處理總長度合理的訊息
  // 8 * 107 = 856 (最小長度)
  if (rawMessage.length < 856) {
    return null; 
  }

  try {
    const decoder = new TextDecoder();
    const decodedString = decoder.decode(rawMessage);

    // --- 步驟 1: 尋找符合 107 到 108 次重複的長字串區塊 ---
    
    // 定義牌的子模式 (Pattern P)
    const tilePattern = '[19]m|[0-9]p|[0-9]s|[1-7]z';
    
    // 定義完整的區塊正則表達式
    // 注意：我們將整個長區塊用一個捕獲組包起來，以便提取完整的匹配字串。
    // P 加上六個任意字符，重複 107 到 108 次。
    const blockRegex = new RegExp(
      `((?:(?:${tilePattern})(?:[\\s\\S]{6})){107,108})`
    );
    
    const blockMatch = decodedString.match(blockRegex);
    
    if (!blockMatch) {
      // 找不到符合規則的長度區塊
      return null;
    }
    
    // 提取整個符合條件的長字串區塊 (在 blockMatch[1] 中)
    const targetBlock = blockMatch[1];
    
    
    // --- 步驟 2: 從長字串區塊中，循環提取每一個牌的代碼 ---
    
    // 定義提取單個牌的正則表達式 (需要全局標誌 /g)
    // 這裡我們必須在牌的部分使用捕獲組 ()
    const tileExtractionRegex = new RegExp(
      `(${tilePattern})(?:[\\s\\S]{6})`, 
      'g' 
    );
    
    // 使用 matchAll 找到所有匹配項，並提取捕獲組 1 (即牌代碼)
    const tiles = [...targetBlock.matchAll(tileExtractionRegex)]
      .map(match => match[1]);

    if (tiles.length >= 107) {
      return tiles; // 直接返回原始牌組陣列
    } else {
      // 理論上這不應該發生，但作為防禦性檢查
      return null; 
    }
    
  } catch (e) {
    console.error("解讀訊息失敗:", e);
    return null; // 解讀失敗
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  if (tab.url.startsWith("https://game.maj-soul.com/1/")) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));