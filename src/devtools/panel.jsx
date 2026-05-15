import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import WebSocketList from "../components/WebSocketList.jsx";
import MessageDetails from "../components/MessageDetails.jsx";
import LanguageSelector from "../components/LanguageSelector.jsx";
import ExtensionIcon from "../Icons/ExtensionIcon.jsx";
import { BUILD_VERSION_TEXT, BUILD_VERSION_TITLE } from "../utils/buildInfo.js";
import { t, addLanguageChangeListener, getCurrentLanguage, initForPanel } from "../utils/i18n.js";
import i18n from "../utils/i18n.js";
import { hasProjectLink, openProjectLink } from "../utils/projectLinks.js";
import "../styles/main.css";
import { AlertTriangle } from "lucide-react";

// Performance configuration
const MAX_MESSAGES_PER_CONNECTION = 5000; // Max messages retained per connection
const MAX_TOTAL_MESSAGES = 20000; // Max total messages across all connections
const MAX_PROCESSED_IDS = 50000; // Max processed message IDs to retain

const WebSocketPanel = () => {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [websocketEvents, setWebsocketEvents] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [currentTabId, setCurrentTabId] = useState(null);

  // Circuit breaker state - for showing banner when high traffic stops monitoring
  const [circuitBreakerTriggered, setCircuitBreakerTriggered] = useState(false);
  const [circuitBreakerRate, setCircuitBreakerRate] = useState(0);

  // Separate connection management and message management
  const [connectionsMap, setConnectionsMap] = useState(new Map()); // Basic info for all connections (including active and inactive)

  // Message deduplication mechanism
  const processedMessageIds = useRef(new Set());
  const devtoolsPortRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const isDisposedRef = useRef(false);

  // Language state for triggering re-renders when language changes
  const [currentLanguage, setCurrentLanguage] = useState(() => getCurrentLanguage());

  useEffect(() => {
    // Initialize panel with saved preference priority
    initForPanel();
    
    // Language change listener for re-rendering when language changes
    const unsubscribeLanguage = addLanguageChangeListener((newLanguage) => {
      setCurrentLanguage(newLanguage);
    });

    return () => {
      unsubscribeLanguage();
    };
  }, []);

  useEffect(() => {
    isDisposedRef.current = false;

    // Get the tab ID that current DevTools is attached to
    const tabId = chrome.devtools.inspectedWindow.tabId;
    setCurrentTabId(tabId);

    // Request existing data
    const loadExistingData = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "get-existing-data",
        });

        if (response && response.success) {
          // Sync monitoring state
          if (response.isMonitoring !== undefined) {
            setIsMonitoring(response.isMonitoring);
          }

          // Load existing event data
          if (response.data && response.data.length > 0) {
            // Filter events for current tab
            const tabEvents = response.data.filter(
              (event) => event.tabId === tabId
            );

            // Update connection info
            const newConnectionsMap = new Map();
            tabEvents.forEach((eventData) => {
              if (
                eventData.type === "connection" ||
                eventData.type === "open"
              ) {
                newConnectionsMap.set(eventData.id, {
                  id: eventData.id,
                  url: eventData.url,
                  status:
                    eventData.type === "connection" ? "connecting" : "open",
                  timestamp: eventData.timestamp,
                  lastActivity: eventData.timestamp,
                  frameContext: eventData.frameContext, // Preserve iframe context information
                });
              } else if (
                eventData.type === "close" ||
                eventData.type === "error"
              ) {
                const existing = newConnectionsMap.get(eventData.id);
                newConnectionsMap.set(eventData.id, {
                  id: eventData.id,
                  url: existing?.url || eventData.url || "Unknown URL",
                  status: eventData.type,
                  timestamp: existing?.timestamp || eventData.timestamp,
                  lastActivity: eventData.timestamp,
                  frameContext: existing?.frameContext || eventData.frameContext, // Preserve iframe context information
                });
              } else if (eventData.type === "message") {
                const existing = newConnectionsMap.get(eventData.id);
                if (existing) {
                  newConnectionsMap.set(eventData.id, {
                    ...existing,
                    lastActivity: eventData.timestamp,
                    frameContext: existing.frameContext || eventData.frameContext, // Preserve iframe context information
                  });
                }
              }
            });

            setConnectionsMap(newConnectionsMap);
            setWebsocketEvents(tabEvents);
          }
        }
      } catch (error) {
        console.error("❌ Failed to load existing data:", error);
      }
    };

    // Listen to messages from background script
    const messageListener = (message, sender, sendResponse) => {
      // Check if sendResponse is available (runtime message) or not (port message)
      const hasSendResponse = typeof sendResponse === 'function';
      
      // Handle batched events
      if (message.type === "websocket-event-batch") {
        const batchEvents = message.data;
        if (!batchEvents || !Array.isArray(batchEvents)) return;

        // Filter valid events for current tab
        const validEvents = batchEvents.filter(eventData => {
          if (eventData.tabId !== tabId) return false;

          // Deduplication
          if (eventData.messageId && processedMessageIds.current.has(eventData.messageId)) {
            return false;
          }

          if (eventData.messageId) {
            processedMessageIds.current.add(eventData.messageId);
          }

          return true;
        });

        if (validEvents.length === 0) return;

        // Batch update connection info
        setConnectionsMap((prevConnections) => {
          const newConnections = new Map(prevConnections);
          const hadConnections = prevConnections.size > 0;
          let newConnectionIdToSelect = null;

          validEvents.forEach(eventData => {
            if (eventData.type === "connection" || eventData.type === "open") {
              // Create or update connection to active status
              newConnections.set(eventData.id, {
                id: eventData.id,
                url: eventData.url,
                status: eventData.type === "connection" ? "connecting" : "open",
                timestamp: eventData.timestamp,
                lastActivity: eventData.timestamp,
                frameContext: eventData.frameContext,
              });

              // Auto-select logic
              if (!hadConnections && newConnections.size === 1) {
                newConnectionIdToSelect = eventData.id;
              }
            } else if (eventData.type === "close" || eventData.type === "error") {
              // Update connection to inactive status
              const existing = newConnections.get(eventData.id);
              newConnections.set(eventData.id, {
                id: eventData.id,
                url: existing?.url || eventData.url || "Unknown URL",
                status: eventData.type,
                timestamp: existing?.timestamp || eventData.timestamp,
                lastActivity: eventData.timestamp,
                frameContext: existing?.frameContext || eventData.frameContext,
              });
            } else if (eventData.type === "message") {
              // Update last activity
              const existing = newConnections.get(eventData.id);
              if (existing) {
                newConnections.set(eventData.id, {
                  ...existing,
                  lastActivity: eventData.timestamp,
                  frameContext: existing.frameContext || eventData.frameContext,
                });
              }
            }
          });

          // Handle delayed selection
          if (newConnectionIdToSelect) {
            setTimeout(() => {
              setSelectedConnectionId(newConnectionIdToSelect);
            }, 100);
          }

          return newConnections;
        });

        // Batch update events list with capacity limit
        setWebsocketEvents((prevEvents) => {
          const newEvents = [...prevEvents, ...validEvents];
          // Limit total messages to prevent memory overflow
          if (newEvents.length > MAX_TOTAL_MESSAGES) {
            return newEvents.slice(-MAX_TOTAL_MESSAGES);
          }
          return newEvents;
        });

        // Clean up processed message IDs if too large
        if (processedMessageIds.current.size > MAX_PROCESSED_IDS) {
          const idsArray = Array.from(processedMessageIds.current);
          processedMessageIds.current = new Set(idsArray.slice(-MAX_PROCESSED_IDS / 2));
        }

      } else if (message.type === "websocket-event") {
        const eventData = message.data;
        const messageId = message.messageId;

        // Filter: only process events from current tab
        if (eventData.tabId !== tabId) {
          if (hasSendResponse) {
            sendResponse({
              received: true,
              ignored: true,
              messageId,
              reason: "different-tab",
            });
          }
          return;
        }

        // MessageId-based deduplication mechanism
        if (messageId && processedMessageIds.current.has(messageId)) {
          if (hasSendResponse) {
            sendResponse({ received: true, duplicate: true, messageId });
          }
          return;
        }

        // Add to processed set
        if (messageId) {
          processedMessageIds.current.add(messageId);
        }

        // Handle circuit breaker triggered - show banner and update UI
        if (eventData.type === "circuit-breaker-triggered") {
          console.warn(`[WebSocket Proxy Panel] Circuit breaker triggered: ${eventData.messagesPerSecond} msg/s`);

          // Turn off monitoring in UI and show banner
          setIsMonitoring(false);
          setCircuitBreakerTriggered(true);
          setCircuitBreakerRate(eventData.messagesPerSecond || 0);

          if (hasSendResponse) {
            sendResponse({ received: true, messageId });
          }
          return;
        }

        // Update connection info
        setConnectionsMap((prevConnections) => {
          const newConnections = new Map(prevConnections);
          const hadConnections = prevConnections.size > 0;

          if (eventData.type === "connection" || eventData.type === "open") {
            // Create or update connection to active status
            newConnections.set(eventData.id, {
              id: eventData.id,
              url: eventData.url,
              status: eventData.type === "connection" ? "connecting" : "open",
              timestamp: eventData.timestamp,
              lastActivity: eventData.timestamp,
              frameContext: eventData.frameContext, // Preserve iframe context information
            });

            // Auto-select connection: automatically select when transitioning from 0 to 1 connection
            if (!hadConnections && newConnections.size === 1) {
              setTimeout(() => {
                setSelectedConnectionId(eventData.id);
              }, 100);
            }
          } else if (eventData.type === "close" || eventData.type === "error") {
            // Update connection to inactive status, create if connection does not exist
            const existing = newConnections.get(eventData.id);
            newConnections.set(eventData.id, {
              id: eventData.id,
              url: existing?.url || eventData.url || "Unknown URL",
              status: eventData.type, // "close" or "error"
              timestamp: existing?.timestamp || eventData.timestamp,
              lastActivity: eventData.timestamp,
              frameContext: existing?.frameContext || eventData.frameContext, // Preserve iframe context information
            });
          } else if (eventData.type === "message") {
            // Update last activity time (for message events)
            const existing = newConnections.get(eventData.id);
            if (existing) {
              newConnections.set(eventData.id, {
                ...existing,
                lastActivity: eventData.timestamp,
                frameContext: existing.frameContext || eventData.frameContext, // Preserve iframe context information
              });
            }
          }

          return newConnections;
        });

        setWebsocketEvents((prevEvents) => {
          const newEvents = [...prevEvents, eventData];
          // Limit total messages to prevent memory overflow
          if (newEvents.length > MAX_TOTAL_MESSAGES) {
            return newEvents.slice(-MAX_TOTAL_MESSAGES);
          }
          return newEvents;
        });
      } else if (message.type === "page-refresh") {
        const eventData = message.data;
        
        // Filter: only process events from current tab
        if (eventData.tabId !== tabId) {
          if (hasSendResponse) {
            sendResponse({
              received: true,
              ignored: true,
              reason: "different-tab",
            });
          }
          return;
        }

        // Clear all connections and events for this tab
        handleClearConnections();
        
        // Clear processed message IDs
        processedMessageIds.current.clear();
      } else if (message.type === "keep-alive-active") {
        // Handle active keep-alive from page context
        const source = message.data?.source || "unknown";
        console.log(`[WebSocket Proxy] Active keep-alive received from ${source}`);
        
        // Update connection status to show active communication
        // setConnectionStatus("connected"); // This line was removed as per the new_code, as setConnectionStatus is not defined.
      }

      // New: Handle ping/pong for connection health
      if (message.type === "ping") {
        try {
          port.postMessage({ type: "pong", timestamp: Date.now() });
        } catch (error) {
          console.warn("Failed to respond to ping, connection may be broken");
        }
        return;
      }
      
      // New: Handle keep-alive messages
      if (message.type === "keep-alive") {
        // Respond to keep-alive to maintain connection
        try {
          port.postMessage({ type: "keep-alive-ack", timestamp: Date.now() });
        } catch (error) {
          console.warn("Failed to respond to keep-alive, connection may be broken");
        }
        return;
      }

      // Only call sendResponse if it's available
      if (hasSendResponse) {
        sendResponse({ received: true, messageId: message.messageId });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    const attachDevtoolsPort = () => {
      if (isDisposedRef.current) return;

      const port = chrome.runtime.connect({ name: "devtools" });
      devtoolsPortRef.current = port;
      window._wsInspectorPort = port; // Keep global reference to prevent GC

      port.onMessage.addListener(messageListener);
      port.postMessage({ type: "init", tabId });
      loadExistingData();

      port.onDisconnect.addListener(() => {
        try {
          port.onMessage.removeListener(messageListener);
        } catch {
          // ignore cleanup errors
        }

        if (window._wsInspectorPort === port) {
          window._wsInspectorPort = null;
        }
        if (devtoolsPortRef.current === port) {
          devtoolsPortRef.current = null;
        }

        if (isDisposedRef.current) {
          return;
        }

        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }

        reconnectTimerRef.current = setTimeout(() => {
          attachDevtoolsPort();
        }, 1000);
      });
    };

    attachDevtoolsPort();

    return () => {
      isDisposedRef.current = true;
      chrome.runtime.onMessage.removeListener(messageListener);

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (devtoolsPortRef.current) {
        try {
          devtoolsPortRef.current.onMessage.removeListener(messageListener);
        } catch {
          // ignore cleanup errors
        }
        try {
          devtoolsPortRef.current.disconnect();
        } catch {
          // Ignore errors
        }
        devtoolsPortRef.current = null;
      }

      window._wsInspectorPort = null;
      
      // Clean up health check
      if (connectionHealthCheck) {
        clearInterval(connectionHealthCheck);
      }
      
      // Clean up connection check interval
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
        connectionCheckInterval.current = null;
      }
      
    };
  }, []);

  const handleResumeMonitoring = () => {
    setIsMonitoring(true);
    setCircuitBreakerTriggered(false);
    setCircuitBreakerRate(0);

    chrome.runtime
      .sendMessage({
        type: "start-monitoring",
        tabId: currentTabId,
      })
      .catch((error) => {
        console.error("Failed to resume monitoring:", error);
      });
  };

  const handleClearConnections = () => {
    setWebsocketEvents([]);
    setConnectionsMap(new Map());
    setSelectedConnectionId(null);
  };

  const handleClearMessages = (connectionId) => {
    setWebsocketEvents((prevEvents) => {
      // Remove all events (messages and system events) for the target connection
      return prevEvents.filter((event) => event.id !== connectionId);
    });
    // Basic connection information remains in the connections Map, so the connection will still be displayed in the list
  };

  const handleSelectConnection = (connectionId) => {
    setSelectedConnectionId(connectionId);
  };

  const handleImportMessages = (connectionId, importedMessages) => {
    if (!connectionId || !Array.isArray(importedMessages) || importedMessages.length === 0) {
      return;
    }

    const connectionInfo = connectionsMap.get(connectionId);
    const baseTimestamp = Date.now();
    const normalizedEvents = importedMessages.map((message, index) => {
      const parsedTimestamp = Number(message.timestamp);
      return {
        id: connectionId,
        url: connectionInfo?.url || message.url || "Imported Connection",
        type: message.type || "message",
        data: message.data ?? "",
        direction: message.direction || null,
        timestamp: Number.isFinite(parsedTimestamp)
          ? parsedTimestamp
          : baseTimestamp + index,
        status: connectionInfo?.status || "open",
        messageId:
          message.messageId ||
          `msg_imported_${baseTimestamp}_${index}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        simulated: Boolean(message.simulated),
        blocked: Boolean(message.blocked),
        reason: message.reason || null,
        isProtobuf: Boolean(message.isProtobuf),
        protobufDecoded: message.protobufDecoded ?? null,
        imported: true,
      };
    });

    setConnectionsMap((prevConnections) => {
      const newConnections = new Map(prevConnections);
      const existing = newConnections.get(connectionId);
      const lastImportedTimestamp = normalizedEvents.reduce(
        (maxTimestamp, event) => Math.max(maxTimestamp, event.timestamp),
        existing?.lastActivity || 0
      );

      newConnections.set(connectionId, {
        id: connectionId,
        url: existing?.url || connectionInfo?.url || "Imported Connection",
        status: existing?.status || "open",
        timestamp: existing?.timestamp || lastImportedTimestamp,
        lastActivity: lastImportedTimestamp,
        frameContext: existing?.frameContext,
      });

      return newConnections;
    });

    setWebsocketEvents((prevEvents) => [...prevEvents, ...normalizedEvents]);
  };

  // Get all messages and events for the selected connection
  const getSelectedConnectionData = () => {
    if (!selectedConnectionId) return null;

    // Get basic connection info from connectionsMap
    const connectionInfo = connectionsMap.get(selectedConnectionId);
    if (!connectionInfo) return null;

    // Get all events/messages for this connection
    const connectionMessages = websocketEvents.filter(
      (event) => event.id === selectedConnectionId
    );

    return {
      id: selectedConnectionId,
      url: connectionInfo.url,
      messages: connectionMessages,
    };
  };

  const selectedConnection = getSelectedConnectionData();

  // Show loading while i18n initializes


  return (
    <MantineProvider>
      <div className="websocket-panel">
        <div className="panel-header">
          <div className="panel-header-left" />
          <div className="panel-status">
            <span className="build-version-badge" title={BUILD_VERSION_TITLE}>
              {BUILD_VERSION_TEXT}
            </span>
            <LanguageSelector />
            {hasProjectLink("homepage") && (
              <button
                className="extension-icon-panel"
                onClick={() => {
                  openProjectLink("homepage");
                }}
                style={{
                  marginLeft: '8px',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  border: '0px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(71, 85, 105, 0.1)',
                  outline: 'none',
                }}
              >
                <ExtensionIcon
                  size={20}
                  // backgroundColor="rgba(71, 85, 105, 0.6)"
                  // primaryColor="#10b981"
                  // accentColor="#fbbf24"
                  // secondaryColor="#047857"
                />
              </button>
            )}
          </div>
        </div>

        {/* Circuit Breaker Warning Banner */}
        {circuitBreakerTriggered && (
          <div className="traffic-pause-banner">
            <div className="traffic-pause-content">
              <AlertTriangle size={18} className="traffic-pause-icon" />
              <div className="traffic-pause-text">
                <span className="traffic-pause-title">
                  {t("panel.circuitBreaker.title") || "High Traffic Detected"}
                </span>
                <span className="traffic-pause-description">
                  {`Monitoring paused due to high traffic (${circuitBreakerRate} msg/s).`}
                </span>
              </div>
              <button
                type="button"
                className="traffic-pause-resume-btn"
                onClick={handleResumeMonitoring}
              >
                Resume
              </button>
            </div>
          </div>
        )}

        <div className="panel-content-fixed">
          {/* 左侧：WebSocketList */}
          <div className="panel-left-section-fixed">
            <div className="websocket-list-container-fixed">
              <div className="panel-wrapper">
                <div className="panel-body">
                  <WebSocketList
                    websocketEvents={websocketEvents}
                    connectionsMap={connectionsMap}
                    selectedConnectionId={selectedConnectionId}
                    onSelectConnection={handleSelectConnection}
                    onClearConnections={handleClearConnections}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="panel-resize-handle vertical disabled" />

          {/* 右侧：MessageDetails */}
          <div className="panel-right-section-fixed">
            <div className="panel-wrapper">
              <div className="panel-body">
                <MessageDetails
                  connection={selectedConnection}
                  selectedConnectionId={selectedConnectionId}
                  onClearMessages={handleClearMessages}
                  onImportMessages={handleImportMessages}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MantineProvider>
  );
};

// 渲染到 DOM
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<WebSocketPanel />);
