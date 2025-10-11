(function () {
  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);

    ws.addEventListener('message', event => {
      // 將接收到的訊息傳遞給隔離的內容腳本
      window.postMessage({ type: "WS_RECV_DATA_FROM_MAIN", payload: event.data }, "*");
    });

    return ws;
  };

  window.WebSocket.prototype = OriginalWebSocket.prototype;
})();