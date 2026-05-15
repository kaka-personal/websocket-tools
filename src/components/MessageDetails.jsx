import React, { useState, useEffect, useMemo, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { analyzeFilterFeedback, filterMessages } from "../utils/filterUtils";
import filterPresetsService from "../utils/filterPresetsService";
import JsonViewer from "./JsonViewer";
import useNewMessageHighlight from "../hooks/useNewMessageHighlight";
import {
  Ban,
  Search,
  Settings,
  CircleX,
  Copy,
  Download,
  Upload,
  Star,
  Trash2,
  Table as TableIcon,
  List as ListIcon,
  MessageSquare,
  Braces,
} from "lucide-react";

const VIEW_MODE_STORAGE_KEY = "ws-message-view-mode";
const VIEW_MODES = ["table", "compact", "conversation", "json"];
import { t } from "../utils/i18n.js";
import ProtobufIcon from "../Icons/Protobuf.jsx";

// SVG icon components
const Icons = {
  ArrowUp: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2L10 6H8V10H4V6H2L6 2Z" fill="currentColor" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 10L2 6H4V2H8V6H10L6 10Z" fill="currentColor" />
    </svg>
  ),
  Connection: () => (
    < Settings size={12} />
  ),
  Block: () => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <circle
        cx="6"
        cy="6"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M3 3L9 9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Protobuf: () => (
    <ProtobufIcon size={12} />
  ),
  Star: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 1L7.5 4H10.5L8.25 6L9 9L6 7.5L3 9L3.75 6L1.5 4H4.5L6 1Z"
        fill="currentColor"
      />
    </svg>
  ),
};

const MessageDetails = ({
  connection,
  selectedConnectionId,
  onClearMessages,
  onImportMessages,
}) => {
  const [filterDirection, setFilterDirection] = useState("all"); // 'all' | 'outgoing' | 'incoming'
  const [filterText, setFilterText] = useState(""); // Message content filter
  const [filterInvert, setFilterInvert] = useState(false); // Invert filter
  const [selectedMessageKey, setSelectedMessageKey] = useState(null); // Selected message
  const [copiedMessageKey, setCopiedMessageKey] = useState(null); // Copied message key
  const [hoveredMessageKey, setHoveredMessageKey] = useState(null); // Hovered message key
  const [filterHistory, setFilterHistory] = useState([]);
  const [filterHistoryIndex, setFilterHistoryIndex] = useState(-1);
  const [filterHistoryDraft, setFilterHistoryDraft] = useState("");
  const [filterPresets, setFilterPresets] = useState([]);
  const [selectedFilterPresetId, setSelectedFilterPresetId] = useState("");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return VIEW_MODES.includes(stored) ? stored : "table";
    } catch {
      return "table";
    }
  });

  const handleViewModeChange = (mode) => {
    if (!VIEW_MODES.includes(mode) || mode === viewMode) return;
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore quota errors
    }
  };
  const searchInputRef = useRef(null);
  const importInputRef = useRef(null);
  const messagesTableContainerRef = useRef(null);
  const isNavigatingFilterHistoryRef = useRef(false);
  const isApplyingFilterPresetRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const previousRenderedConnectionIdRef = useRef(null);
  const previousMessageCountRef = useRef(0);

  const filterFeedback = useMemo(
    () => analyzeFilterFeedback(filterText),
    [filterText]
  );
  const connectionMessages = connection?.messages ?? [];

  const commitFilterHistory = (value) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      setFilterHistoryIndex(-1);
      setFilterHistoryDraft("");
      return;
    }

    setFilterHistory((prevHistory) => {
      const nextHistory = [
        value,
        ...prevHistory.filter((item) => item !== value),
      ];
      return nextHistory.slice(0, 20);
    });
    setFilterHistoryIndex(-1);
    setFilterHistoryDraft("");
  };

  const handleFilterTextChange = (e) => {
    isNavigatingFilterHistoryRef.current = false;
    if (!isApplyingFilterPresetRef.current && selectedFilterPresetId) {
      setSelectedFilterPresetId("");
    }
    setFilterText(e.target.value);
    if (filterHistoryIndex !== -1) {
      setFilterHistoryIndex(-1);
      setFilterHistoryDraft("");
    }
  };

  const handleFilterInputKeyDown = (e) => {
    if (e.key === "Enter") {
      commitFilterHistory(filterText);
      return;
    }

    if (filterHistory.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();

      const nextIndex =
        filterHistoryIndex === -1
          ? 0
          : Math.min(filterHistoryIndex + 1, filterHistory.length - 1);

      if (filterHistoryIndex === -1) {
        setFilterHistoryDraft(filterText);
      }

      isNavigatingFilterHistoryRef.current = true;
      setFilterHistoryIndex(nextIndex);
      setFilterText(filterHistory[nextIndex]);
      return;
    }

    if (e.key === "ArrowDown" && filterHistoryIndex !== -1) {
      e.preventDefault();
      e.stopPropagation();

      if (filterHistoryIndex === 0) {
        isNavigatingFilterHistoryRef.current = true;
        setFilterHistoryIndex(-1);
        setFilterText(filterHistoryDraft);
        return;
      }

      const nextIndex = filterHistoryIndex - 1;
      isNavigatingFilterHistoryRef.current = true;
      setFilterHistoryIndex(nextIndex);
      setFilterText(filterHistory[nextIndex]);
    }
  };

  
  // Use new message highlight hook
  const { isNewMessage, clearHighlights } = useNewMessageHighlight(
    connection,
    500
  );
  
  // Reset selected message when connection switches, close detail panel, clear new message highlights
  useEffect(() => {
    setSelectedMessageKey(null);
    clearHighlights();
  }, [selectedConnectionId, clearHighlights]);

  useEffect(() => {
    setFilterHistoryIndex(-1);
    setFilterHistoryDraft("");
    setSelectedFilterPresetId("");
  }, [selectedConnectionId]);

  useEffect(() => {
    if (isNavigatingFilterHistoryRef.current) {
      isNavigatingFilterHistoryRef.current = false;
      return;
    }

    const normalizedValue = filterText.trim();
    if (!normalizedValue) return;

    const timeoutId = setTimeout(() => {
      commitFilterHistory(filterText);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [filterText]);

  useEffect(() => {
    setFilterPresets(filterPresetsService.getPresets());
  }, []);

  useEffect(() => {
    if (isApplyingFilterPresetRef.current) {
      isApplyingFilterPresetRef.current = false;
      return;
    }

    if (selectedFilterPresetId) {
      setSelectedFilterPresetId("");
    }
  }, [filterDirection, filterInvert]);

  // Keyboard navigation for message selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle arrow keys when we have connection and messages
      if (!connection || !connection.messages || connection.messages.length === 0) return;

      const activeElement = document.activeElement;
      const isSearchInputFocused =
        activeElement === searchInputRef.current ||
        activeElement?.closest?.(".filter-input-container");
      if (isSearchInputFocused) return;
      
      // Calculate filtered and sorted messages inside the effect
      const filteredMessages = filterMessages(connection.messages, {
        direction: filterDirection,
        text: filterText,
        invert: filterInvert,
      });
      
      const sortedMessages = [...filteredMessages].sort((a, b) => {
        return a.timestamp - b.timestamp;
      });
      
      if (sortedMessages.length === 0) return;
      
      const tableContainer = document.querySelector('.messages-table-container');
      const isTableFocused = tableContainer && document.activeElement === tableContainer;
      const hasSelectedMessage = selectedMessageKey !== null;
      
      // Handle arrow keys if table is focused OR if we have a selected message
      if ((isTableFocused || hasSelectedMessage) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        
        const currentIndex = selectedMessageKey 
          ? sortedMessages.findIndex(msg => msg.messageId === selectedMessageKey)
          : -1;
        
        let newIndex;
        if (currentIndex === -1) {
          // No message selected, select first message
          newIndex = 0;
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        } else {
          newIndex = currentIndex < sortedMessages.length - 1 ? currentIndex + 1 : currentIndex;
        }
        
        if (newIndex >= 0 && newIndex < sortedMessages.length) {
          const newMessageKey = sortedMessages[newIndex].messageId;
          setSelectedMessageKey(newMessageKey);
          
          // Scroll the selected row into view
          setTimeout(() => {
            const rowElement = document.querySelector(`[data-message-id="${newMessageKey}"]`);
            const tableContainer = document.querySelector('.messages-table-container');
            
            if (rowElement && tableContainer) {
              const containerRect = tableContainer.getBoundingClientRect();
              const rowRect = rowElement.getBoundingClientRect();
              
              // Check if row is visible in container
              const isRowVisible = rowRect.top >= containerRect.top && 
                                   rowRect.bottom <= containerRect.bottom;
              
              if (!isRowVisible) {
                rowElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'nearest',
                  inline: 'nearest'
                });
              }
            }
          }, 0);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [connection, filterDirection, filterText, filterInvert, selectedMessageKey]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
    return `${timeString}.${milliseconds.substring(0, 3)}`;
  };

  const formatExportTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const pad = (value, length = 2) => value.toString().padStart(length, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}.${pad(date.getMilliseconds(), 3)}`;
  };

  const formatExportFileTimestamp = (date = new Date()) => {
    const pad = (value, length = 2) => value.toString().padStart(length, "0");

    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
      date.getDate()
    )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(
      date.getSeconds()
    )}`;
  };

  const normalizeMessageDataForExport = (value) => {
    if (typeof value === "string") {
      return value;
    }

    if (value instanceof ArrayBuffer) {
      const bytes = Array.from(new Uint8Array(value));
      return {
        type: "ArrayBuffer",
        byteLength: value.byteLength,
        hex: bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      };
    }

    if (value instanceof Uint8Array) {
      const bytes = Array.from(value);
      return {
        type: "Uint8Array",
        byteLength: value.byteLength,
        hex: bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      };
    }

    if (value instanceof Blob) {
      return {
        type: "Blob",
        size: value.size,
      };
    }

    if (value === undefined) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return String(value);
    }
  };

  const getMessageSearchText = (message) => {
    if (!message) return "";
    const value = message.data ?? "";
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof ArrayBuffer || value instanceof Uint8Array || value instanceof Blob) {
      return normalizeMessageDataForExport(value) ? JSON.stringify(normalizeMessageDataForExport(value)) : "";
    }
    try {
      return JSON.stringify(normalizeMessageDataForExport(value), null, 2);
    } catch {
      return String(value);
    }
  };

  const getJsonViewPayload = (message) => {
    if (!message) {
      return "";
    }

    return normalizeMessageDataForExport(message.data);
  };

  const filteredMessages = useMemo(
    () =>
      filterMessages(connectionMessages, {
        direction: filterDirection,
        text: filterText,
        invert: filterInvert,
      }),
    [connectionMessages, filterDirection, filterText, filterInvert]
  );

  const sortedMessages = useMemo(
    () =>
      [...filteredMessages].sort((a, b) => {
        return a.timestamp - b.timestamp;
      }),
    [filteredMessages]
  );

  const isContainerNearBottom = (element) => {
    if (!element) {
      return true;
    }

    return element.scrollHeight - element.scrollTop - element.clientHeight <= 24;
  };

  useEffect(() => {
    const tableContainer = messagesTableContainerRef.current;
    if (!tableContainer) {
      return;
    }

    const connectionChanged =
      previousRenderedConnectionIdRef.current !== selectedConnectionId;
    const messageCountChanged =
      previousMessageCountRef.current !== sortedMessages.length;

    previousRenderedConnectionIdRef.current = selectedConnectionId;
    previousMessageCountRef.current = sortedMessages.length;

    if (
      autoScrollEnabled &&
      (connectionChanged || messageCountChanged) &&
      (connectionChanged || isNearBottomRef.current)
    ) {
      requestAnimationFrame(() => {
        tableContainer.scrollTop = tableContainer.scrollHeight;
        isNearBottomRef.current = true;
      });
    }
  }, [autoScrollEnabled, selectedConnectionId, sortedMessages.length]);

  if (!connection) {
    return (
      <div className="message-details">
        <div className="empty-state">
          <p>{t("messageDetails.emptyState.selectConnection")}</p>
        </div>
      </div>
    );
  }

  // formatMessage function has been moved to the JsonViewer component for internal handling

  const handleMessageClick = (messageKey) => {
    setSelectedMessageKey(
      selectedMessageKey === messageKey ? null : messageKey
    );
  };

  const truncateMessage = (message, maxLength = 120) => {
    let displayText;
    
    // For protobuf messages, prefer decoded data for display in table
    if (message && message.isProtobuf && message.protobufDecoded) {
      displayText = message.protobufDecoded;
    } else {
      // For non-protobuf messages, use message.data
      displayText = message && message.data ? message.data : message;
    }
    
    // Handle different data types properly
    if (typeof displayText !== "string") {
      if (displayText instanceof ArrayBuffer) {
        // Convert ArrayBuffer to hex string for display
        const bytes = new Uint8Array(displayText);
        displayText = `[Binary ${bytes.length} bytes]: ${Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}${bytes.length > 8 ? '...' : ''}`;
      } else if (displayText instanceof Uint8Array) {
        // Convert Uint8Array to hex string for display
        displayText = `[Binary ${displayText.length} bytes]: ${Array.from(displayText.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}${displayText.length > 8 ? '...' : ''}`;
      } else if (displayText instanceof Blob) {
        displayText = `[Blob ${displayText.size} bytes]`;
      } else if (typeof displayText === 'object' && displayText !== null) {
        try {
          displayText = JSON.stringify(displayText, null, 2);
        } catch (e) {
          displayText = String(displayText);
        }
      } else {
        displayText = String(displayText);
      }
    }
    
    displayText = displayText.replace(/\s+/g, " ").trim();
    if (displayText.length <= maxLength) return displayText;
    return displayText.substring(0, maxLength) + "...";
  };

  const getMessageLength = (message) => {
    if (message.type !== "message") return "-";
    return message.data ? message.data.length : 0;
  };

  // Copy message content to clipboard
  const handleCopyMessage = async (messageData, messageKey) => {
    const textToCopy =
      typeof messageData === "string"
        ? messageData
        : JSON.stringify(normalizeMessageDataForExport(messageData), null, 2);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageKey(messageKey);
      setTimeout(() => {
        setCopiedMessageKey(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedMessageKey(messageKey);
        setTimeout(() => {
          setCopiedMessageKey(null);
        }, 2000);
      } catch (fallbackError) {
        console.error("Fallback copy also failed:", fallbackError);
      }
    }
  };

  const handleClearSearchFilter = () => {
    isNavigatingFilterHistoryRef.current = false;
    setFilterText("");
    setFilterInvert(false);
    setFilterHistoryIndex(-1);
    setFilterHistoryDraft("");
    if (!isApplyingFilterPresetRef.current) {
      setSelectedFilterPresetId("");
    }
  };

  const handleClearMessagesList = () => {
    if (!connection || !onClearMessages) return;
    onClearMessages(connection.id);
    setSelectedMessageKey(null);
    clearHighlights(); // Clear any remaining highlights
  };

  const handleMessagesTableScroll = (event) => {
    isNearBottomRef.current = isContainerNearBottom(event.currentTarget);
  };

  const handleImportMessagesClick = () => {
    importInputRef.current?.click();
  };

  const handleImportMessagesFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !connection || !onImportMessages) {
      event.target.value = "";
      return;
    }

    try {
      const fileText = await file.text();
      const parsed = JSON.parse(fileText);
      const sourceMessages = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.messages)
        ? parsed.messages
        : null;

      if (!sourceMessages || sourceMessages.length === 0) {
        throw new Error("No messages found in file");
      }

      const normalizedMessages = sourceMessages.map((message, index) => ({
        messageId:
          message.messageId ||
          `msg_import_${Date.now()}_${index}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        type: message.type || "message",
        direction: message.direction || null,
        timestamp:
          Number.isFinite(Number(message.timestamp))
            ? Number(message.timestamp)
            : Date.now() + index,
        data: message.data ?? "",
        simulated: Boolean(message.simulated),
        blocked: Boolean(message.blocked),
        reason: message.reason || null,
        isProtobuf: Boolean(message.isProtobuf),
        protobufDecoded: message.protobufDecoded ?? null,
        url: parsed?.connection?.url || connection.url,
      }));

      onImportMessages(connection.id, normalizedMessages);
    } catch (error) {
      window.alert(t("messageDetails.controls.importMessagesError"));
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveCurrentFilterPreset = () => {
    const presetName = window.prompt(
      t("messageDetails.controls.filterFavoriteName"),
      selectedFilterPresetId
        ? filterPresets.find((item) => item.id === selectedFilterPresetId)?.name || ""
        : filterText.trim()
    );

    if (!presetName || !presetName.trim()) {
      return;
    }

    const nextPreset = filterPresetsService.addPreset({
      name: presetName,
      filters: {
        direction: filterDirection,
        text: filterText,
        invert: filterInvert,
      },
    });

    if (!nextPreset) {
      return;
    }

    const nextPresets = filterPresetsService.getPresets();
    setFilterPresets(nextPresets);
    setSelectedFilterPresetId(nextPreset.id);
  };

  const handleFilterPresetChange = (e) => {
    const presetId = e.target.value;
    setSelectedFilterPresetId(presetId);

    if (!presetId) {
      return;
    }

    const selectedPreset = filterPresets.find((item) => item.id === presetId);
    if (!selectedPreset) {
      return;
    }

    isApplyingFilterPresetRef.current = true;
    isNavigatingFilterHistoryRef.current = false;
    setFilterDirection(selectedPreset.filters.direction || "all");
    setFilterText(selectedPreset.filters.text || "");
    setFilterInvert(Boolean(selectedPreset.filters.invert));
    setFilterHistoryIndex(-1);
    setFilterHistoryDraft("");
  };

  const handleDeleteFilterPreset = () => {
    if (!selectedFilterPresetId) {
      return;
    }

    const deleted = filterPresetsService.deletePreset(selectedFilterPresetId);
    if (!deleted) {
      return;
    }

    setFilterPresets(filterPresetsService.getPresets());
    setSelectedFilterPresetId("");
  };

  const handleExportMessages = () => {
    if (!connection || !connection.messages || connection.messages.length === 0) {
      return;
    }

    const exportPayload = {
      connection: {
        id: connection.id,
        url: connection.url,
        status: connection.status || null,
      },
      exportedAt: new Date().toISOString(),
      messageCount: connection.messages.length,
      messages: connection.messages.map((message) => ({
        messageId: message.messageId,
        type: message.type,
        direction: message.direction || null,
        timestamp: message.timestamp,
        timestampText: formatExportTimestamp(message.timestamp),
        data: normalizeMessageDataForExport(message.data),
        simulated: Boolean(message.simulated),
        blocked: Boolean(message.blocked),
        reason: message.reason || null,
        isProtobuf: Boolean(message.isProtobuf),
        protobufDecoded: message.isProtobuf
          ? normalizeMessageDataForExport(message.protobufDecoded)
          : null,
      })),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const fileName = `ws-messages-${formatExportFileTimestamp()}.json`;
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 0);
  };

  const getSelectedMessage = () => {
    if (!selectedMessageKey) return null;
    return sortedMessages.find((msg) => {
      return msg.messageId === selectedMessageKey;
    });
  };

  const renderDataCell = (message) => {
    const isSystemMessage = message.type !== "message";
    const tags = [];

    if (message.blocked) {
      tags.push(
        <span
          key="blocked"
          className="message-tag blocked"
          title={message.reason || t("messageDetails.tooltips.messageBlocked")}
        >
          <Icons.Block />
          <span>{t("messageDetails.tags.block")}</span>
        </span>
      );
    }
    if (message.isProtobuf) {
      tags.push(
        <span
          key="protobuf"
          className="message-tag protobuf"
          title={message.protobufError ? `Protobuf detected but decoding failed: ${message.protobufError}` : "Protocol Buffers message detected and decoded"}
        >
          <Icons.Protobuf />
          <span>{t("common.binary")}</span>
        </span>
      );
    }

    if (isSystemMessage) {
      return (
        <div className="data-cell system">
          <Icons.Connection className="system-icon" style={{flexShrink: 0}}/>
          {tags.length > 0 && <span className="message-tags">{tags}</span>}
          <span className="system-text">
            {message.type === "open"
              ? t("messageDetails.connection.requestServed", { data: message.data || "WebSocket" })
              : message.type === "close"
              ? t("messageDetails.connection.disconnected", { url: message.url || "WebSocket" })
              : message.type === "error"
              ? t("messageDetails.connection.connectionError")
              : message.type}
          </span>
        </div>
      );
    }

    return (
      <div className="data-cell">
        <span className={`direction-arrow ${message.direction}`}>
          {message.direction === "outgoing" ? (
            <Icons.ArrowUp />
          ) : (
            <Icons.ArrowDown />
          )}
        </span>
        {tags.length > 0 && <span className="message-tags">{tags}</span>}
        <span className="message-text">{truncateMessage(message)}</span>
      </div>
    );
  };

  return (
    <div className="message-details">
      <div className="details-header">
        <div className="connection-info">
          <span className="connection-badge" title={connection.url}>{connection.url}</span>
        </div>
        <div className="controls">
          <div className="control-row">
            <div className="filter-controls direction-filter">
              <select
                value={filterDirection}
                onChange={(e) => {
                  if (!isApplyingFilterPresetRef.current && selectedFilterPresetId) {
                    setSelectedFilterPresetId("");
                  }
                  setFilterDirection(e.target.value);
                }}
              >
                <option value="all">{t("messageDetails.controls.all")}</option>
                <option value="outgoing">{t("messageDetails.controls.send")}</option>
                <option value="incoming">{t("messageDetails.controls.receive")}</option>
              </select>
            </div>
            <div className="filter-controls search-filter">
              <div className="filter-input-container">
                <span className="filter-icon">
                  <Search size={12} />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={filterText}
                  onChange={handleFilterTextChange}
                  onKeyDown={handleFilterInputKeyDown}
                  onBlur={() => commitFilterHistory(filterText)}
                  placeholder={t("messageDetails.controls.filterPlaceholder")}
                />
                {filterText && (
                  <button className="clear-filter-btn" onClick={handleClearSearchFilter}>
                    <CircleX size={12} />
                  </button>
                )}
              </div>
            </div>
            <label className="invert-checkbox">
              <input
                type="checkbox"
                checked={filterInvert}
                onChange={(e) => {
                  if (!isApplyingFilterPresetRef.current && selectedFilterPresetId) {
                    setSelectedFilterPresetId("");
                  }
                  setFilterInvert(e.target.checked);
                }}
              />
              <span className="checkmark"></span>
              <span className="checkbox-label">{t("messageDetails.controls.invert")}</span>
            </label>
            <label className="invert-checkbox auto-scroll-toggle">
              <input
                type="checkbox"
                checked={autoScrollEnabled}
                onChange={(e) => {
                  const nextValue = e.target.checked;
                  setAutoScrollEnabled(nextValue);

                  if (nextValue) {
                    requestAnimationFrame(() => {
                      const tableContainer = messagesTableContainerRef.current;
                      if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                        isNearBottomRef.current = true;
                      }
                    });
                  }
                }}
              />
              <span className="checkmark"></span>
              <span className="checkbox-label">{t("messageDetails.controls.autoScroll")}</span>
            </label>
            <div className="filter-controls filter-presets-select">
              <select value={selectedFilterPresetId} onChange={handleFilterPresetChange}>
                <option value="" disabled hidden>
                  {t("messageDetails.controls.filterFavorites")}
                </option>
                {filterPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="view-mode-switcher" role="group" aria-label="View mode">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => handleViewModeChange("table")}
                title="Table view"
              >
                <TableIcon size={13} />
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "compact" ? "active" : ""}`}
                onClick={() => handleViewModeChange("compact")}
                title="Compact log view"
              >
                <ListIcon size={13} />
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "conversation" ? "active" : ""}`}
                onClick={() => handleViewModeChange("conversation")}
                title="Conversation view"
              >
                <MessageSquare size={13} />
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "json" ? "active" : ""}`}
                onClick={() => handleViewModeChange("json")}
                title="JSON formatted view"
              >
                <Braces size={13} />
              </button>
            </div>
            <button
              className="clear-messages-btn save-filter-btn"
              onClick={handleSaveCurrentFilterPreset}
              title={t("messageDetails.controls.saveFilterFavorite")}
            >
              <Star size={14} />
            </button>
            <button
              className="clear-messages-btn delete-filter-btn"
              onClick={handleDeleteFilterPreset}
              disabled={!selectedFilterPresetId}
              title={t("messageDetails.controls.deleteFilterFavorite")}
            >
              <Trash2 size={14} />
            </button>
            <button
              className="clear-messages-btn export-messages-btn"
              onClick={handleExportMessages}
              disabled={!connection || !connection.messages || connection.messages.length === 0}
              title={t("messageDetails.controls.exportMessages")}
            >
              <Download size={14} />
            </button>
            <button
              className="clear-messages-btn import-messages-btn"
              onClick={handleImportMessagesClick}
              disabled={!connection || !onImportMessages}
              title={t("messageDetails.controls.importMessages")}
            >
              <Upload size={14} />
            </button>
            <button
              className="clear-messages-btn"
              onClick={handleClearMessagesList}
              disabled={!connection || !connection.messages || connection.messages.length === 0}
              title={t("messageDetails.controls.clearMessages")}
            >
              <Ban size={14} />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden-file-input"
              onChange={handleImportMessagesFileChange}
            />
          </div>
          {filterFeedback.usesFieldSearch && (
            <div className="filter-feedback info">
              {t("messageDetails.controls.fieldSearchHint")}
            </div>
          )}
          {filterFeedback.hasRegex && filterFeedback.mode !== "invalid-regex" && (
            <div className="filter-feedback info">
              {t("messageDetails.controls.regexMode")}
            </div>
          )}
          {filterFeedback.mode === "invalid-regex" && (
            <div className="filter-feedback error">
              {t("messageDetails.controls.invalidRegex")}: {filterFeedback.error}
            </div>
          )}
        </div>
      </div>

      <div className="messages-container">
        {sortedMessages.length === 0 ? (
          <div className="empty-state">
            <p>{t("messageDetails.emptyState.noMessages")}</p>
          </div>
        ) : (
          <PanelGroup direction="vertical">
            <Panel defaultSize={selectedMessageKey ? 70 : 100} minSize={5}>
              <div
                ref={messagesTableContainerRef}
                className={`messages-table-container view-${viewMode}`}
                tabIndex={0}
                style={{ outline: 'none' }}
                onScroll={handleMessagesTableScroll}
              >
                {viewMode === "table" && (
                  <table className="ws-messages-table">
                    <thead>
                      <tr>
                        <th className="col-data">{t("messageDetails.table.data")}</th>
                        <th className="col-length">{t("messageDetails.table.length")}</th>
                        <th className="col-time">{t("messageDetails.table.time")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMessages.map((message, index) => {
                        const messageKey = message.messageId;
                        const isSelected = selectedMessageKey === messageKey;
                        const isNewMsg = isNewMessage(messageKey);
                        const isHovered = hoveredMessageKey === messageKey;
                        return (
                          <tr
                            key={`${messageKey}-${index}`}
                            data-message-id={messageKey}
                            className={`message-row ${message.direction} ${message.simulated ? "simulated" : ""} ${
                              message.blocked ? "blocked" : ""
                            } ${isSelected ? "selected" : ""} ${isNewMsg ? "new-message" : ""} ${
                              isHovered ? "hovered" : ""
                            }`}
                            onClick={() => handleMessageClick(messageKey)}
                            onMouseEnter={() => setHoveredMessageKey(messageKey)}
                            onMouseLeave={() => setHoveredMessageKey(null)}
                          >
                            <td className="col-data">
                              <div className="data-cell-wrapper">{renderDataCell(message)}</div>
                            </td>
                            <td className="col-length">{getMessageLength(message)}</td>
                            <td className="col-time">{formatTimestamp(message.timestamp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {viewMode === "compact" && (
                  <ul className="ws-messages-compact">
                    {sortedMessages.map((message, index) => {
                      const messageKey = message.messageId;
                      const isSelected = selectedMessageKey === messageKey;
                      const isNewMsg = isNewMessage(messageKey);
                      const isSystem = message.type !== "message";
                      const arrow =
                        message.direction === "outgoing"
                          ? "↑"
                          : message.direction === "incoming"
                          ? "↓"
                          : "•";
                      return (
                        <li
                          key={`${messageKey}-${index}`}
                          data-message-id={messageKey}
                          className={`compact-row ${message.direction || "system"} ${
                            isSelected ? "selected" : ""
                          } ${isNewMsg ? "new-message" : ""} ${isSystem ? "system" : ""}`}
                          onClick={() => handleMessageClick(messageKey)}
                        >
                          <span className="compact-time">{formatTimestamp(message.timestamp)}</span>
                          <span className={`compact-arrow ${message.direction || "system"}`}>
                            {arrow}
                          </span>
                          <span className="compact-text">{truncateMessage(message, 200)}</span>
                          <span className="compact-length">{getMessageLength(message)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {viewMode === "conversation" && (
                  <div className="ws-messages-conversation">
                    {sortedMessages.map((message, index) => {
                      const messageKey = message.messageId;
                      const isSelected = selectedMessageKey === messageKey;
                      const isNewMsg = isNewMessage(messageKey);
                      const isSystem = message.type !== "message";
                      const side = isSystem
                        ? "center"
                        : message.direction === "outgoing"
                        ? "right"
                        : "left";
                      return (
                        <div
                          key={`${messageKey}-${index}`}
                          data-message-id={messageKey}
                          className={`bubble-row ${side} ${isSelected ? "selected" : ""} ${
                            isNewMsg ? "new-message" : ""
                          }`}
                          onClick={() => handleMessageClick(messageKey)}
                        >
                          <div className={`bubble ${side} ${isSystem ? "system" : ""}`}>
                            <div className="bubble-text">{truncateMessage(message, 280)}</div>
                            <div className="bubble-meta">
                              <span>{formatTimestamp(message.timestamp)}</span>
                              <span>·</span>
                              <span>{getMessageLength(message)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewMode === "json" && (
                  <div className="ws-messages-json">
                    {sortedMessages.map((message, index) => {
                      const messageKey = message.messageId;
                      const isSelected = selectedMessageKey === messageKey;
                      const isNewMsg = isNewMessage(messageKey);
                      const isSystem = message.type !== "message";
                      const side = isSystem
                        ? "center"
                        : message.direction === "outgoing"
                        ? "right"
                        : "left";
                      const messageText = getMessageSearchText(message);
                      return (
                        <div
                          key={`${messageKey}-${index}`}
                          data-message-id={messageKey}
                          className={`json-row ${side} ${message.direction || "system"} ${
                            isSelected ? "selected" : ""
                          } ${isNewMsg ? "new-message" : ""} ${isSystem ? "system" : ""}`}
                          onClick={() => handleMessageClick(messageKey)}
                        >
                          <div className="json-row-meta">
                            <span className="json-time">{formatTimestamp(message.timestamp)}</span>
                            <span className="json-direction">
                              {message.direction === "outgoing"
                                ? t("messageDetails.controls.send")
                                : message.direction === "incoming"
                                ? t("messageDetails.controls.receive")
                                : message.type}
                            </span>
                            <span className="json-length">{getMessageLength(message)}</span>
                            <div className="json-row-actions">
                              <button
                                type="button"
                                className="json-row-action-btn"
                                title="Search by this message"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFilterText(messageText);
                                  searchInputRef.current?.focus();
                                  searchInputRef.current?.select?.();
                                }}
                              >
                                <Search size={12} />
                              </button>
                              <button
                                type="button"
                                className="json-row-action-btn"
                                title={t("jsonViewer.controls.copy")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCopyMessage(message.data, messageKey);
                                }}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="json-row-viewer">
                            <JsonViewer
                              data={getJsonViewPayload(message)}
                              className={`json-row-viewer-inner ${message.direction || "system"} ${
                                isSystem ? "system" : ""
                              }`}
                              showControls={false}
                              readOnly={true}
                              enableWrap={true}
                              enableNestedParse={false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>

            {selectedMessageKey && (
              <>
                <PanelResizeHandle className="panel-resize-handle horizontal message-detail-resize-handle" />
                <Panel
                  defaultSize={50}
                  minSize={10}
                  maxSize={95}
                  style={{
                    boxShadow: "rgba(21, 21, 21, 0.81) 0px -5px 20px 20px",
                    borderTopLeftRadius: "20px",
                    borderTopRightRadius: "20px",
                  }}
                >
                  <div className="message-detail-simple" key={selectedConnectionId}>
                    <div className="detail-content">
                      {(() => {
                        const selectedMessage = getSelectedMessage();
                        if (!selectedMessage) return null;

                        const messageKey = selectedMessageKey;
                        return (
                          // <div className="detail-body">
                          <>
                            {/* <div className="detail-actions">
                              <button
                                className="close-btn"
                                onClick={() => setSelectedMessageKey(null)}
                              >
                                ✕
                              </button>
                            </div> */}
                            <JsonViewer
                              data={normalizeMessageDataForExport(selectedMessage.data)}
                              className="compact"
                              showControls={true}
                              onCopy={(data) => handleCopyMessage(data, messageKey)}
                              copyButtonText="📋 Copy"
                              copiedText="✓ Copied"
                              isCopied={copiedMessageKey === messageKey}
                            />
                            {/* </div> */}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>
        )}
      </div>
    </div>
  );
};

export default MessageDetails;
