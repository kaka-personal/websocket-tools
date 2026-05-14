import React, { useState, useEffect, useRef } from "react";
import JsonViewer from "./JsonViewer";
import { CircleArrowDown, CircleArrowUp, Info, Github, Heart } from "lucide-react";
import { Tooltip } from "@mantine/core";
import { t } from "../utils/i18n";
import { hasProjectLink, openProjectLink } from "../utils/projectLinks";

// Session storage key for tracking button state within current session
const SESSION_BUTTONS_SHOWN_KEY = 'websocket-devtools-session-buttons-shown';
// LocalStorage key for tracking if user has clicked animated buttons (disables future animations)
const BUTTONS_CLICKED_KEY = 'websocket-devtools-animated-buttons-clicked';

// Reusable simulate button component
const SimulateButton = ({
  direction,
  icon: Icon,
  label,
  className,
  onSimulate,
  isDisabled,
  onFirstClick,
}) => (
  <button
    className={`simulate-btn ${className}`}
    onClick={() => {
      onSimulate(direction);
      onFirstClick && onFirstClick();
    }}
    disabled={isDisabled}
  >
    <Icon size={16} />
    {label}
  </button>
);

const SimulateEditorTab = ({
  message,
  isSending,
  onChange,
  onSimulate,
  onAddToFavorites,
  onKeyPress,
  onSimulateNestedParse,
}) => {
  const isSimulateDisabled = !message.trim() || isSending;
  const animationTimeoutRef = useRef(null);
  const hasAnimatedButtons = hasProjectLink("chromeStore") || hasProjectLink("repository");
  
  // Helper functions for storage access with error handling
  const getStorageValue = (storage, key, fallback = false) => {
    try {
      return storage.getItem(key) === 'true';
    } catch {
      return fallback;
    }
  };
  
  const setStorageValue = (storage, key, value) => {
    try {
      if (value) {
        storage.setItem(key, 'true');
      } else {
        storage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Storage operation failed for ${key}:`, error);
    }
  };
  
  const hasClickedAnimatedButtons = () => getStorageValue(localStorage, BUTTONS_CLICKED_KEY);
  const isShownInSession = () => getStorageValue(sessionStorage, SESSION_BUTTONS_SHOWN_KEY);
  
  // Initialize button visibility state - only show if in current session and user hasn't clicked animated buttons before
  const getInitialButtonState = () => {
    if (!hasAnimatedButtons) {
      return false;
    }

    const hasClicked = hasClickedAnimatedButtons();
    const inSession = isShownInSession();
    return !hasClicked && inSession;
  };
  
  const [showAnimatedButtons, setShowAnimatedButtons] = useState(getInitialButtonState);
  const [animationCompleted, setAnimationCompleted] = useState(getInitialButtonState);

  const handleFirstSimulateClick = () => {
    // If user has clicked animated buttons before, never show them again
    if (hasClickedAnimatedButtons()) {
      return;
    }
    
    // If already shown in this session, do nothing
    if (isShownInSession()) {
      return;
    }
    
    // Mark as shown in current session
    setStorageValue(sessionStorage, SESSION_BUTTONS_SHOWN_KEY, true);
    
    // Show buttons with animation
    setShowAnimatedButtons(true);
    setAnimationCompleted(false);
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Complete animation after duration
    animationTimeoutRef.current = setTimeout(() => {
      setAnimationCompleted(true);
    }, 1200);
  };

  const markButtonsAsClicked = () => {
    setStorageValue(localStorage, BUTTONS_CLICKED_KEY, true);
  };

  const handleGithubClick = () => {
    markButtonsAsClicked();
    openProjectLink("repository");
  };

  const handleHeartClick = () => {
    markButtonsAsClicked();
    openProjectLink("chromeStore");
  };


  // Sync state on component mount to handle component remounting
  useEffect(() => {
    const shouldShow = getInitialButtonState();
    setShowAnimatedButtons(shouldShow);
    setAnimationCompleted(shouldShow);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="simulate-content">
      <div className="simulate-input-container">
        <div className="simulate-input-editor" onKeyDown={onKeyPress}>
          <JsonViewer
            data={message}
            readOnly={false}
            onChange={onChange}
            showControls={true}
            className="simulate-editor"
            showFavoritesButton={true}
            onAddToFavorites={onAddToFavorites}
            showNestedParseButton={false}
            showSimulateNestedParseButton={true}
            onSimulateNestedParse={onSimulateNestedParse}
          />
        </div>
      </div>
      <div className="simulate-actions">
        {/* Animated buttons that appear on first simulate click */}
        {showAnimatedButtons && hasAnimatedButtons && (
          <div className={`simulate-animated-buttons ${animationCompleted ? 'animated' : ''}`}>
            {hasProjectLink("chromeStore") && (
              <Tooltip
                label={t('simulate.animated.heartTooltip')}
                arrowSize={6}
                arrowOffset={12}
                zIndex={1600}
                hoverable
                withinPortal={true}
              >
                <button
                  className="simulate-animated-btn heart-btn"
                  onClick={handleHeartClick}
                >
                  <Heart size={14} />
                </button>
              </Tooltip>
            )}
            {hasProjectLink("repository") && (
              <Tooltip
                label={t('simulate.animated.githubTooltip')}
                arrowSize={6}
                arrowOffset={12}
                zIndex={1600}
                hoverable
                withinPortal={true}
              >
                <button
                  className="simulate-animated-btn github-btn"
                  onClick={handleGithubClick}
                >
                  <Github size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
        
        <div className="simulate-buttons">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Tooltip
              label={t("simulate.actions.simulateReceiveTooltip")}
              arrowSize={6}
              arrowOffset={12}
              zIndex={1600}
              hoverable
              openDelay={100}
              closeDelay={200}
              withinPortal={true}
              styles={{
                tooltip: {
                  background: "rgba(87, 43, 12, 0.8)",
                  color: "#fb923c",
                  border: "1px solid rgba(251, 146, 60, 0.3)",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.89)",
                  whiteSpace: "normal",
                  wordWrap: "break-word",
                },
                arrow: {
                  borderColor: "#f59e0b",
                },
              }}
            >
              <Info
                size={12}
                strokeWidth={2.5}
                style={{
                  color: "#c28535",
                  cursor: "pointer",
                  verticalAlign: "middle",
                }}
              />
            </Tooltip>
          </div>
          <SimulateButton
            direction="outgoing"
            icon={CircleArrowUp}
            label={t("simulate.actions.simulateSend")}
            className="outgoing"
            onSimulate={onSimulate}
            isDisabled={isSimulateDisabled}
            onFirstClick={handleFirstSimulateClick}
          />
          <SimulateButton
            direction="incoming"
            icon={CircleArrowDown}
            label={t("simulate.actions.simulateReceive")}
            className="incoming"
            onSimulate={onSimulate}
            isDisabled={isSimulateDisabled}
            onFirstClick={handleFirstSimulateClick}
          />
        </div>
      </div>
    </div>
  );
};

export default SimulateEditorTab;
