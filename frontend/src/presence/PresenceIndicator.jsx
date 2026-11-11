import { useEffect, useRef, useState } from "react";
import { usePresence } from "./PresenceProvider";
import "../styles/presence.css";

const formatLastSeen = (timestamp) => {
  if (!timestamp) return "Last seen unavailable";
  const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
};

export const PresenceDot = ({ userId }) => {
  const { ready, onlineUserIds, lastSeenByUserId, refreshLastSeen } =
    usePresence();
  const [now, setNow] = useState(Date.now());
  const lastSeen = lastSeenByUserId[String(userId)];
  const elapsed = lastSeen ? now - new Date(lastSeen).getTime() : Infinity;
  const isRecentlyActive =
    Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 90_000;
  useEffect(() => {
    if (!userId || !ready) return undefined;
    void refreshLastSeen([String(userId)]);
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void refreshLastSeen([String(userId)]);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [ready, refreshLastSeen, userId]);
  if (!userId || (!onlineUserIds.has(String(userId)) && !isRecentlyActive)) {
    return null;
  }
  return (
    <i className="presence-online-dot" aria-label="Online" title="Online" />
  );
};

export const PresenceStatus = ({ userId }) => {
  const { ready, onlineUserIds, lastSeenByUserId, refreshLastSeen } =
    usePresence();
  const [now, setNow] = useState(Date.now());
  const lastSeen = lastSeenByUserId[String(userId)];
  const elapsed = lastSeen ? now - new Date(lastSeen).getTime() : Infinity;
  const isRecentlyActive =
    Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 90_000;
  const isOnline = Boolean(
    userId && (onlineUserIds.has(String(userId)) || isRecentlyActive),
  );
  const wasOnline = useRef(false);
  const wasReady = useRef(false);
  useEffect(() => {
    if (ready && userId) {
      void refreshLastSeen(
        [String(userId)],
        wasOnline.current || !wasReady.current,
      );
    }
    wasOnline.current = isOnline;
    wasReady.current = ready;
  }, [isOnline, ready, refreshLastSeen, userId]);
  useEffect(() => {
    if (!ready || !userId) return undefined;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void refreshLastSeen([String(userId)]);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [ready, refreshLastSeen, userId]);
  if (!userId) return null;
  if (!ready) return <span className="presence-status">Connecting...</span>;
  return isOnline ? (
    <span className="presence-status online">Online</span>
  ) : (
    <span className="presence-status">
      {formatLastSeen(lastSeenByUserId[String(userId)])}
    </span>
  );
};
