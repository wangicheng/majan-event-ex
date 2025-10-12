console.log("Canvas click handler loaded and ready to receive commands.");

/**
 * 使用正規化座標 (0-1) 在指定的 Canvas 元素上模擬一次滑鼠點擊。
 * 已考慮 Canvas 的 CSS 縮放。
 * @param {string} selector - Canvas 的 CSS 選擇器
 * @param {number} normalizedX - 相對水平位置 (0.0 代表最左邊, 1.0 代表最右邊)
 * @param {number} normalizedY - 相對垂直位置 (0.0 代表最上面, 1.0 代表最下面)
 */
function performClickWithNormalizedCoords(selector, normalizedX, normalizedY) {
  const canvas = document.querySelector(selector);

  if (!canvas) {
    console.error(`Canvas Clicker: 無法找到選擇器為 "${selector}" 的 canvas 元素。`);
    return;
  }

  const canvasInternalWidth = canvas.width;
  const canvasInternalHeight = canvas.height;

  const internalX = canvasInternalWidth * normalizedX;
  const internalY = canvasInternalHeight * normalizedY;

  const rect = canvas.getBoundingClientRect();

  if (canvasInternalWidth === 0 || canvasInternalHeight === 0) {
    console.error(`Canvas Clicker: Canvas 的內部 width 或 height 為 0，無法計算。`);
    return;
  }

  const scaleX = rect.width / canvasInternalWidth;
  const scaleY = rect.height / canvasInternalHeight;

  const clientX = rect.left + (internalX * scaleX);
  const clientY = rect.top + (internalY * scaleY);

  console.group("Canvas Click Simulation");
  console.log(`輸入的正規化座標: (${normalizedX}, ${normalizedY})`);
  console.log(`Canvas 內部尺寸: ${canvasInternalWidth}x${canvasInternalHeight}`);
  console.log(`轉換後的內部座標: (${internalX.toFixed(2)}, ${internalY.toFixed(2)})`);
  console.log(`Canvas 視覺尺寸: ${rect.width.toFixed(2)}x${rect.height.toFixed(2)}`);
  console.log(`計算出的縮放比例: scaleX=${scaleX.toFixed(2)}, scaleY=${scaleY.toFixed(2)}`);
  console.log(`最終視窗座標: (${clientX.toFixed(2)}, ${clientY.toFixed(2)})`);
  console.groupEnd();

  const eventProperties = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: clientX,
    clientY: clientY,
  };

  const mouseDownEvent = new MouseEvent('mousedown', eventProperties);
  const mouseUpEvent = new MouseEvent('mouseup', eventProperties);
  const clickEvent = new MouseEvent('click', eventProperties);

  canvas.dispatchEvent(mouseDownEvent);
  canvas.dispatchEvent(mouseUpEvent);
  canvas.dispatchEvent(clickEvent);

  console.log(`在 canvas 的相對位置 (${normalizedX}, ${normalizedY}) 上成功模擬了點擊事件。`);
}

// 監聽來自擴充功能其他部分的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PERFORM_CANVAS_CLICK") {
    const { selector, normalizedX, normalizedY } = request.payload;
    if (selector && typeof normalizedX === 'number' && typeof normalizedY === 'number') {
      performClickWithNormalizedCoords(selector, normalizedX, normalizedY);
      sendResponse({ status: "success", message: "Click performed." });
    } else {
      sendResponse({ status: "error", message: "Invalid payload for click." });
    }
    // 返回 true 表示我們將異步發送響應（如果需要）
    return true;
  }
});