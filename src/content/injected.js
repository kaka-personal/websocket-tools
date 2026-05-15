// Injected script - Injects into page context to listen for WebSocket
(function () {
  "use strict";

  // Immediately mark script as loaded

  // Prevent duplicate injection
  if (window.websocketProxyInjected) {
    return;
  }

  // Immediately set flag
  window.websocketProxyInjected = true;

  // Save original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;

  let connectionIdCounter = 0;
  const connections = new Map();

  // Binary Detection and Decoding Utilities
  function isBinaryData(data) {
    try {
      // Direct binary types - always consider as binary
      if (data instanceof ArrayBuffer || data instanceof Uint8Array || data instanceof Blob) {
        return true;
      }
      
      // String types - check if they represent binary data
      if (typeof data === 'string') {
        // Base64 encoded data
        if (isBase64String(data)) {
          return true;
        }
        
        // Hexadecimal data
        if (isHexString(data)) {
          return true;
        }
        
        // String containing binary characters
        if (containsBinaryData(data)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Note: Complex protobuf signature checking removed
  // Now using simple binary type detection instead
  // The decoding logic below will still attempt to parse as protobuf for display purposes

  function readVarint(bytes, position) {
    let value = 0;
    let shift = 0;
    
    while (position < bytes.length) {
      const byte = bytes[position++];
      value |= (byte & 0x7F) << shift;
      
      if ((byte & 0x80) === 0) {
        return { value, nextPosition: position };
      }
      
      shift += 7;
      if (shift >= 64) {
        return null;
      }
    }
    
    return null;
  }

  function skipFieldData(bytes, position, wireType) {
    switch (wireType) {
      case 0:
        const varint = readVarint(bytes, position);
        return varint ? { nextPosition: varint.nextPosition } : null;
        
      case 1:
        return position + 8 <= bytes.length ? { nextPosition: position + 8 } : null;
        
      case 2:
        const length = readVarint(bytes, position);
        if (!length) return null;
        const endPos = length.nextPosition + length.value;
        return endPos <= bytes.length ? { nextPosition: endPos } : null;
        
      case 5:
        return position + 4 <= bytes.length ? { nextPosition: position + 4 } : null;
        
      default:
        return null;
    }
  }

  function isBase64String(str) {
    if (!str || str.length < 4) return false;
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Pattern.test(str) && str.length % 4 === 0;
  }

  function isHexString(str) {
    if (!str || str.length < 2) return false;
    const cleanStr = str.replace(/^(0x|\\x)/i, '');
    return cleanStr.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(cleanStr);
  }

  function hexToBytes(hex) {
    const cleanHex = hex.replace(/^(0x|\\x)/i, '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    
    return bytes;
  }

  function containsBinaryData(str) {
    // Check only first 1000 chars to avoid performance issues with large strings
    const len = Math.min(str.length, 1000);
    let binaryCount = 0;
    for (let i = 0; i < len; i++) {
      const charCode = str.charCodeAt(i);
      if ((charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) || charCode > 126) {
        binaryCount++;
      }
    }
    
    return binaryCount / len > 0.2;
  }



  function reflectiveDecodeProtobuf(bytes) {
    const result = {};
    let position = 0;
    
    while (position < bytes.length) {
      const header = readVarint(bytes, position);
      if (!header) break;
      
      const tag = header.value >>> 3;
      const wireType = header.value & 0x07;
      position = header.nextPosition;
      
      const fieldName = `field_${tag}`;
      
      try {
        const fieldResult = decodeField(bytes, position, wireType);
        if (fieldResult) {
          result[fieldName] = fieldResult.value;
          position = fieldResult.nextPosition;
        } else {
          break;
        }
      } catch (error) {
        result[fieldName] = `<decode_error: ${error.message}>`;
        break;
      }
    }
    
    return result;
  }

  function decodeField(bytes, position, wireType) {
    switch (wireType) {
      case 0:
        const varint = readVarint(bytes, position);
        return varint ? { value: varint.value, nextPosition: varint.nextPosition } : null;
        
      case 1:
        if (position + 8 > bytes.length) return null;
        const fixed64 = new DataView(bytes.buffer, bytes.byteOffset + position, 8);
        return {
          value: fixed64.getBigUint64(0, true),
          nextPosition: position + 8
        };
        
      case 2:
        const length = readVarint(bytes, position);
        if (!length) return null;
        
        const start = length.nextPosition;
        const end = start + length.value;
        if (end > bytes.length) return null;
        
        const data = bytes.slice(start, end);
        
        try {
          const nested = reflectiveDecodeProtobuf(data);
          if (Object.keys(nested).length > 0) {
            return { value: nested, nextPosition: end };
          }
        } catch (e) {
          // Not a nested message
        }
        
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true });
          const str = decoder.decode(data);
          return { value: str, nextPosition: end };
        } catch (e) {
          const base64 = btoa(String.fromCharCode(...data));
          return { value: `<bytes: ${base64}>`, nextPosition: end };
        }
        
      case 5:
        if (position + 4 > bytes.length) return null;
        const fixed32 = new DataView(bytes.buffer, bytes.byteOffset + position, 4);
        return {
          value: fixed32.getUint32(0, true),
          nextPosition: position + 4
        };
        
      default:
        return null;
    }
  }



  const MAX_PREVIEW_SIZE = 100 * 1024; // 100KB limit for preview processing

  function processMessageWithBinary(data) {
    // Simple binary detection - if it's binary data, mark it as binary
    const isBinary = isBinaryData(data);
    
    if (isBinary) {
      // Check data size before attempting to decode
      let size = 0;
      if (data instanceof ArrayBuffer) size = data.byteLength;
      else if (data instanceof Uint8Array) size = data.length;
      else if (data instanceof Blob) size = data.size;
      else if (typeof data === 'string') size = data.length;

      if (size > MAX_PREVIEW_SIZE) {
        // Truncate data for preview instead of hiding it completely
        let truncatedData;

        // Create a truncated copy of the data
        if (data instanceof ArrayBuffer) {
          truncatedData = new Uint8Array(data, 0, MAX_PREVIEW_SIZE);
        } else if (data instanceof Uint8Array) {
          truncatedData = data.subarray(0, MAX_PREVIEW_SIZE);
        } else if (typeof data === 'string') {
          truncatedData = data.substring(0, MAX_PREVIEW_SIZE);
        } else if (data instanceof Blob) {
           // For Blob, we can't easily sync slice in this context without FileReader
           // So we keep the previous behavior for Blobs or just show size
            return {
              isProtobuf: true,
              protobufDecoded: { error: `Blob data too large to preview (${size} bytes)` },
              protobufRaw: `[Blob ${size} bytes - Preview hidden for performance]`,
              protobufError: null
            };
        } else {
           // Fallback for other types
           return {
              isProtobuf: true,
              protobufDecoded: { error: `Data too large to preview (${size} bytes)` },
              protobufRaw: `[Data ${size} bytes - Preview hidden for performance]`,
              protobufError: null
           };
        }

        // Try to decode the truncated data (might fail or show partial data, which is fine)
        const decodeResult = tryDecodeAsProtobuf(truncatedData);

        return {
          isProtobuf: true,
          protobufDecoded: {
            warning: `Data truncated for performance (Total: ${size} bytes). Showing first ${MAX_PREVIEW_SIZE} bytes.`,
            partialDecode: decodeResult.decoded
          },
          protobufRaw: decodeResult.raw + ` ... [Truncated, total ${size} bytes]`,
          protobufError: decodeResult.error
        };
      }

      // Always mark as binary, then try to decode for additional info
      const decodeResult = tryDecodeAsProtobuf(data);
      
      return {
        isProtobuf: true, // Keep the property name for compatibility with existing UI
        protobufDecoded: decodeResult.decoded,
        protobufRaw: decodeResult.raw,
        protobufError: decodeResult.error
      };
    }
    
    return {
      isProtobuf: false
    };
  }

  // Simple decode function
  function tryDecodeAsProtobuf(data) {
    let bytes;
    let raw;
    
    // Convert to bytes
    if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else if (data instanceof Blob) {
      return {
        decoded: `[Blob ${data.size} bytes]`,
        raw: `[Blob ${data.size} bytes]`,
        error: null
      };
    } else if (typeof data === 'string') {
      if (isBase64String(data)) {
        const decoded = atob(data);
        bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          bytes[i] = decoded.charCodeAt(i);
        }
      } else if (isHexString(data)) {
        bytes = hexToBytes(data);
      } else {
        bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          bytes[i] = data.charCodeAt(i);
        }
      }
    } else {
      return { decoded: String(data), raw: String(data), error: null };
    }
    
    // Generate raw display
    raw = bytesToHexString(bytes);
    
    // Try decode
    const decoded = intelligentDecode(bytes);
    
    return { decoded, raw, error: null };
  }

  // Helper function to convert bytes to hex string
  function bytesToHexString(bytes) {
    const hexParts = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      hexParts[i] = (b < 16 ? '0' : '') + b.toString(16);
    }
    return hexParts.join(' ');
  }

  // Simple decode: try protobuf, fallback to hex
  function intelligentDecode(bytes) {
    if (bytes.length === 0) return null;
    
    try {
      const result = reflectiveDecodeProtobuf(bytes);
      if (Object.keys(result).length > 0) {
        return JSON.stringify(result, null, 2);
      }
    } catch (e) {
      // Ignore errors
    }
    
    return bytesToHexString(bytes);
  }



  // Control state
  let proxyState = {
    isMonitoring: true, // Monitoring enabled by default, consistent with background.js
  };
  // Deep copy of initial state
  const proxyStateInitial = JSON.parse(JSON.stringify(proxyState));

  // Generate unique connection ID with frame context
  function generateConnectionId() {
    const frameContext = window !== window.top ? 'iframe' : 'main';
    return `ws_${frameContext}_${Date.now()}_${++connectionIdCounter}`;
  }

  // Generate unique message ID (simple UUID v4)
  function generateMessageId() {
    return 'msg_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Batch processing configuration - 30% performance improvement (moderate)
  const BATCH_SIZE_THRESHOLD = 65; // 30% larger batches (from original 50)
  const BATCH_TIME_THRESHOLD = 70; // ms - 30% faster processing (from original 100ms)
  let eventBatchQueue = [];
  let batchTimer = null;

  // Traffic monitoring configuration - optimized for high-traffic apps like Figma
  // Traffic monitoring - simple circuit breaker
  const TRAFFIC_WINDOW_MS = 1000; // 1 second window
  const TRAFFIC_PAUSE_THRESHOLD = 800; // Stop monitoring when exceeded

  // Connection traffic monitoring
  const connectionTraffic = new Map(); // connectionId -> { count, lastReset }

  function checkTrafficAndCircuitBreak(connectionId) {
    const now = Date.now();
    let traffic = connectionTraffic.get(connectionId);

    if (!traffic) {
      traffic = { count: 0, lastReset: now };
      connectionTraffic.set(connectionId, traffic);
    }

    // Reset counter if window expired
    if (now - traffic.lastReset > TRAFFIC_WINDOW_MS) {
      traffic.count = 0;
      traffic.lastReset = now;
    }

    traffic.count++;

    // Circuit breaker - when threshold exceeded, stop monitoring
    if (traffic.count > TRAFFIC_PAUSE_THRESHOLD && proxyState.isMonitoring) {
      console.warn(`[WebSocket Proxy] Circuit breaker triggered - High traffic (${traffic.count} msg/s). Stopping monitoring.`);

      // Stop monitoring
      proxyState.isMonitoring = false;

      // Notify (will be received by panel if open, or background will update state)
      setTimeout(() => {
        try {
          window.postMessage({
            source: "websocket-proxy-injected",
            type: "websocket-event",
            payload: {
              type: "circuit-breaker-triggered",
              connectionId: connectionId,
              messagesPerSecond: traffic.count,
              timestamp: Date.now()
            }
          }, "*");
        } catch (error) {
          // Ignore
        }
      }, 0);

      return true; // Circuit breaker triggered
    }

    return false; // Normal
  }

  function flushBatchQueue() {
    if (eventBatchQueue.length === 0) return;

    const batchToSend = [...eventBatchQueue];
    eventBatchQueue = [];

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    try {
      window.postMessage(
        {
          source: "websocket-proxy-injected",
          type: "websocket-event-batch",
          payload: batchToSend,
        },
        "*"
      );
    } catch (error) {
      // Silent error
    }
  }

  // Send event to content script (buffered)
  function sendEvent(eventData) {
    if(!proxyState.isMonitoring){
      return;
    }

    // Check traffic and trigger circuit breaker if needed
    if (eventData.id && eventData.type === "message") {
      if (checkTrafficAndCircuitBreak(eventData.id)) {
        return; // Circuit breaker triggered, stop processing
      }
    }

    try {
      // Add frame context to event data
      const getStableFrameId = () => {
        try {
          const url = new URL(window.location.href);
          return `${url.origin}${url.pathname}`;
        } catch (e) {
          return window.location.href;
        }
      };

      const eventWithFrameContext = {
        ...eventData,
        frameContext: {
          url: window.location.href,
          stableId: getStableFrameId(),
          isIframe: window !== window.top,
          frameId: window !== window.top ? getStableFrameId() : null
        }
      };

      // Push to queue
      eventBatchQueue.push(eventWithFrameContext);

      // Check threshold
      if (eventBatchQueue.length >= BATCH_SIZE_THRESHOLD) {
        flushBatchQueue();
      } else if (!batchTimer) {
        // Start timer if not running
        batchTimer = setTimeout(flushBatchQueue, BATCH_TIME_THRESHOLD);
      }

    } catch (error) {
      // Ignore
    }
  }

  // Create proxy WebSocket constructor
  function ProxiedWebSocket(url, protocols) {

    const connectionId = generateConnectionId();
    let ws;

    try {
      ws = new OriginalWebSocket(url, protocols);
    } catch (error) {
      throw error;
    }

    // Store connection info
    const connectionInfo = {
      id: connectionId,
      url: url,
      ws: ws,
      status: "connecting",
      originalSend: ws.send.bind(ws),
      originalClose: ws.close.bind(ws),
      originalAddEventListener: ws.addEventListener.bind(ws),
      originalRemoveEventListener: ws.removeEventListener.bind(ws),
      userOnMessage: null, // User-set onmessage handler
      userEventListeners: [], // User-added event listeners
      messageQueue: [], // Message queue during pause
    };

    connections.set(connectionId, connectionInfo);

    // Send connection event
    sendEvent({
      id: connectionId,
      url: url,
      type: "connection",
      data: "WebSocket connection established",
      direction: "system",
      timestamp: Date.now(),
      status: "connecting",
      messageId: generateMessageId(),
    });
    
    // Always attach our message listener so we capture all incoming frames
    const ourMessageListener = function(event) {
      if (proxyState.isMonitoring) {
        const binaryInfo = processMessageWithBinary(event.data);
        sendEvent({
          id: connectionId,
          url: url,
          type: "message",
          data: event.data,
          direction: "incoming",
          timestamp: Date.now(),
          status: connectionInfo.status,
          messageId: generateMessageId(),
          ...binaryInfo,
        });
      }

      // Forward to user's listeners
      if (connectionInfo.userOnMessage) {
        try {
          connectionInfo.userOnMessage.call(ws, event);
        } catch (error) {
        }
      }

      connectionInfo.userEventListeners.forEach(listener => {
        try {
          listener.call(ws, event);
        } catch (error) {
        }
      });
    };

    // Listen with capture-phase to ensure we receive events first
    connectionInfo.originalAddEventListener("message", ourMessageListener, true);

    // Wrap send method - log only, never block
    const originalSend = ws.send.bind(ws);
    ws.send = function (data) {
      if (proxyState.isMonitoring) {
        const binaryInfo = processMessageWithBinary(data);
        sendEvent({
          id: connectionId,
          url: url,
          type: "message",
          data: data,
          direction: "outgoing",
          timestamp: Date.now(),
          status: connectionInfo.status,
          messageId: generateMessageId(),
          ...binaryInfo,
        });
      }

      try {
        return originalSend(data);
      } catch (error) {
        throw error;
      }
    };

    // Intercept addEventListener - now only responsible for collecting user listeners
    const originalAddEventListener = ws.addEventListener.bind(ws);
    ws.addEventListener = function (type, listener, options) {
      if (type === "message" && listener) {
        // Store user's listeners, but do not register them directly to WebSocket
        connectionInfo.userEventListeners.push(listener);
        
        // Return success, but in fact we will forward messages through our interceptor
        return;
      } else {
        // Non-message events handled normally
        return originalAddEventListener(type, listener, options);
      }
    };

    // Intercept removeEventListener
    ws.removeEventListener = function (type, listener, options) {
      if (type === "message" && listener) {
        // Remove from our list
        const index = connectionInfo.userEventListeners.indexOf(listener);
        if (index > -1) {
          connectionInfo.userEventListeners.splice(index, 1);
        }
        return;
      } else {
        // Non-message events handled normally
        return connectionInfo.originalRemoveEventListener(type, listener, options);
      }
    };

    // Intercept onmessage property - now only responsible for storing user's handler
    Object.defineProperty(ws, "onmessage", {
      get: function () {
        return connectionInfo.userOnMessage;
      },
      set: function (handler) {
        connectionInfo.userOnMessage = handler;
        // No other actions needed here, our interceptor will forward messages
      },
    });

    // Listen for connection status changes
    ["open", "close", "error"].forEach((eventType) => {
      connectionInfo.originalAddEventListener(eventType, (event) => {

        // Update connection status
        if (eventType === "open") {
          connectionInfo.status = "open";
        } else if (eventType === "close") {
          connectionInfo.status = "closed";
        } else if (eventType === "error") {
          connectionInfo.status = "error";
        }

        const payload = {
          id: connectionId,
          url: url,
          type: eventType,
          // Default data, will be updated below if event type is close or error
          data: event.reason || event.message || `WebSocket ${eventType}`,
          direction: "system",
          timestamp: Date.now(),
          status: connectionInfo.status,
          messageId: generateMessageId(),
        };

        if (eventType === "close") {
          const code = event.code;
          const reason = event.reason;
          payload.data = `Client/Server Close: Code: ${code || 'N/A'}, Reason: ${reason || 'No reason'}`;
        } else if (eventType === "error") {
          payload.data = `WebSocket error: ${event.message || 'No message'}`;
        }
        
        sendEvent(payload);

        if (eventType === "close") {
          connections.delete(connectionId);
        }
      });
    });

    // Add proxy control methods
    ws._proxyControl = {
      getConnectionInfo: () => connectionInfo,
    };

    // Add proxy flag
    ws._isProxied = true;
    ws._connectionId = connectionId;

    return ws;
  }

  // Copy original WebSocket's properties and methods
  try {
    Object.setPrototypeOf(ProxiedWebSocket, OriginalWebSocket);
    ProxiedWebSocket.prototype = OriginalWebSocket.prototype;

    // Copy static constants
    ProxiedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    ProxiedWebSocket.OPEN = OriginalWebSocket.OPEN;
    ProxiedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
    ProxiedWebSocket.CLOSED = OriginalWebSocket.CLOSED;

  } catch (error) {
  }

  // Replace global WebSocket!
  try {
    Object.defineProperty(window, "WebSocket", {
      value: ProxiedWebSocket,
      writable: true,
      configurable: true,
    });

  } catch (error) {
    // Fallback
    try {
      window.WebSocket = ProxiedWebSocket;
    } catch (fallbackError) {
    }
  }

  // Listen for URL changes (SPA navigation)
  let lastUrl = window.location.href;
  const checkUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log(`[WebSocket Proxy] URL changed from ${lastUrl} to ${currentUrl}`);
      
      // Send URL change notification
      sendEvent({
        type: "url-changed",
        previousUrl: lastUrl,
        newUrl: currentUrl,
        timestamp: Date.now(),
        messageId: generateMessageId(),
      });
      
      lastUrl = currentUrl;
    }
  };

  // Monitor URL changes using multiple methods
  // Method 1: Override pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(checkUrlChange, 0);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(checkUrlChange, 0);
  };
  
  // Method 2: Listen for popstate events
  window.addEventListener('popstate', checkUrlChange);
  
  // Method 3: Periodic check as fallback
  setInterval(checkUrlChange, 1000);

  // Listen for control messages from content script
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "websocket-proxy-content") {

      switch (event.data.type) {
        case "start-monitoring":
          proxyState.isMonitoring = true;
          // Send state update
          sendEvent({
            type: "proxy-state-change",
            state: proxyState,
            timestamp: Date.now(),
            messageId: generateMessageId(),
          });
          break;

        case "stop-monitoring":
          proxyState.isMonitoring = false;
          // // Send state update
          // sendEvent({
          //   type: "proxy-state-change",
          //   state: proxyState,
          //   timestamp: Date.now(),
          // });
          break;

        case "ignore-connection":
          if (event.data.connectionId) {
            const traffic = connectionTraffic.get(event.data.connectionId);
            if (traffic) {
              traffic.userIgnored = true;
              sendEvent({
                type: "connection-ignored",
                id: event.data.connectionId,
                reason: "user-request",
                timestamp: Date.now(),
                messageId: generateMessageId(),
              });
            }
          }
          break;

        case "unignore-connection":
          if (event.data.connectionId) {
            const traffic = connectionTraffic.get(event.data.connectionId);
            if (traffic) {
              traffic.userIgnored = false;
              traffic.ignored = false;
              sendEvent({
                type: "connection-unignored",
                id: event.data.connectionId,
                timestamp: Date.now(),
                messageId: generateMessageId(),
              });
            }
          }
          break;

        case "get-proxy-state":
          sendEvent({
            type: "proxy-state-response",
            state: proxyState,
            connectionCount: connections.size,
            timestamp: Date.now(),
            messageId: generateMessageId(),
          });
          break;

        case "reset-proxy-state":
          Object.assign(proxyState, JSON.parse(JSON.stringify(proxyStateInitial)));

          break;
          
        case "keep-alive":
          // Respond to keep-alive to maintain connection
          // No action needed, just receiving the message keeps the connection alive
          break;
      }
    }
  });

  // Expose debug info to global
  window.websocketProxyDebug = {
    connections: connections,
    originalWebSocket: OriginalWebSocket,
    proxiedWebSocket: ProxiedWebSocket,
    proxyState: proxyState,
    connectionTraffic: connectionTraffic,
    getConnectionCount: () => connections.size,
    getConnectionIds: () => Array.from(connections.keys()),
    getTrafficStats: () => {
      const stats = {};
      for (const [id, traffic] of connectionTraffic.entries()) {
        stats[id] = {
          messagesPerSecond: traffic.count
        };
      }
      return stats;
    },
  };

  // New: Active keep-alive from page context
  const keepAliveInterval = setInterval(() => {
    try {
      // Send keep-alive to content script
      window.postMessage({
        source: "websocket-proxy-injected",
        type: "keep-alive-active",
        timestamp: Date.now()
      }, "*");
    } catch (error) {
      // Ignore errors
    }
  }, 15000); // Every 15 seconds

  // Clean up interval when page is unloaded
  window.addEventListener('beforeunload', () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  });

  // Also clean up when the script context is destroyed
  window.addEventListener('unload', () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  });
})();
