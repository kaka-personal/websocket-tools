import { useState, useEffect, useRef, useCallback } from "react";

// Performance configuration
const MAX_HIGHLIGHTED_MESSAGES = 50; // Limit highlighted messages to prevent memory issues
const BATCH_CLEANUP_INTERVAL = 200; // Cleanup interval in ms (batch instead of individual timeouts)

/**
 * Custom hook to manage new message highlighting animation
 * Optimized for high-traffic scenarios (Figma, etc.)
 * @param {Object} connection - Connection object containing messages
 * @param {number} highlightDuration - Duration of highlight animation in ms (default: 500)
 * @returns {Object} Object containing isNewMessage function and cleanup
 */
export const useNewMessageHighlight = (connection, highlightDuration = 500) => {
  // Use a Map with expiration timestamps instead of Set for batch cleanup
  const [newMessageKeys, setNewMessageKeys] = useState(new Map());
  const previousMessageCountRef = useRef(0);
  const lastCheckTimestampRef = useRef(Date.now());
  const previousConnectionIdRef = useRef(null);
  const cleanupTimerRef = useRef(null);

  // Batch cleanup function - removes expired highlights
  const cleanupExpiredHighlights = useCallback(() => {
    const now = Date.now();
    setNewMessageKeys(prev => {
      const updated = new Map();
      prev.forEach((expiresAt, key) => {
        if (expiresAt > now) {
          updated.set(key, expiresAt);
        }
      });
      // Only update if something changed
      if (updated.size !== prev.size) {
        return updated;
      }
      return prev;
    });
  }, []);

  // Setup batch cleanup interval
  useEffect(() => {
    cleanupTimerRef.current = setInterval(cleanupExpiredHighlights, BATCH_CLEANUP_INTERVAL);
    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [cleanupExpiredHighlights]);

  // Effect to detect new messages and trigger highlight animation
  useEffect(() => {
    if (!connection || !connection.messages) return;

    // Reset everything if connection changed
    if (previousConnectionIdRef.current !== connection.id) {
      setNewMessageKeys(new Map());
      previousMessageCountRef.current = 0;
      lastCheckTimestampRef.current = Date.now();
      previousConnectionIdRef.current = connection.id;
      return;
    }

    const currentMessages = connection.messages;
    const currentMessageCount = currentMessages.length;

    // Check if we have new messages (count increased)
    if (currentMessageCount > previousMessageCountRef.current) {
      const now = Date.now();
      const expiresAt = now + highlightDuration;

      // Find new messages by timestamp comparison
      const newMessages = currentMessages.filter(msg =>
        msg.timestamp > lastCheckTimestampRef.current
      );

      if (newMessages.length > 0) {
        setNewMessageKeys(prev => {
          const updated = new Map(prev);

          // Add new messages with expiration timestamps
          // Limit to last N messages to prevent memory issues in high-traffic scenarios
          const messagesToHighlight = newMessages.slice(-MAX_HIGHLIGHTED_MESSAGES);

          messagesToHighlight.forEach((msg) => {
            const messageKey = msg.messageId;
            if (!updated.has(messageKey)) {
              updated.set(messageKey, expiresAt);
            }
          });

          // If we have too many highlights, remove oldest ones
          if (updated.size > MAX_HIGHLIGHTED_MESSAGES) {
            const entries = Array.from(updated.entries());
            // Sort by expiration time (oldest first)
            entries.sort((a, b) => a[1] - b[1]);
            // Keep only the most recent ones
            const toKeep = entries.slice(-MAX_HIGHLIGHTED_MESSAGES);
            return new Map(toKeep);
          }

          return updated;
        });

        // Update last check timestamp to the latest message timestamp
        const latestTimestamp = Math.max(...newMessages.map(msg => msg.timestamp));
        lastCheckTimestampRef.current = latestTimestamp;
      }
    }

    // Update refs
    previousMessageCountRef.current = currentMessageCount;

  }, [connection?.messages, connection?.id, highlightDuration]);

  // Function to check if a message is new (not expired)
  const isNewMessage = useCallback((messageKey) => {
    const expiresAt = newMessageKeys.get(messageKey);
    if (!expiresAt) return false;
    return expiresAt > Date.now();
  }, [newMessageKeys]);

  // Clear all highlights (useful for cleanup)
  const clearHighlights = useCallback(() => {
    setNewMessageKeys(new Map());
  }, []);

  return {
    isNewMessage,
    clearHighlights,
    newMessageCount: newMessageKeys.size
  };
};

export default useNewMessageHighlight; 