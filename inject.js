(function () {
  // 注入 websocket_override.js 到網頁的主執行環境
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('websocket_override.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = function() {
    script.remove(); // 載入完成後移除 script 標籤以保持 DOM 清潔
  };

  // 監聽來自網頁主執行環境的訊息 (由 websocket_override.js 發送)
  window.addEventListener('message', event => {
    // 確保訊息是來自我們自己的頁面，而不是其他擴充功能或 iframe
    if (event.source !== window) {
      return;
    }

    if (event.data && event.data.type === "WS_RECV_DATA_FROM_MAIN") {
      const view = new Uint8Array(event.data.payload);
      chrome.runtime.sendMessage({ type: "WS_MESSAGE", payload: view });
    }
  });
})();