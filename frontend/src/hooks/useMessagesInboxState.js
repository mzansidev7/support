import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { readMessageCache } from "../components/dashboard/messageCache";

const useMessagesInboxState = ({ emojiCategories }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const cacheScope = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return `admin:${user?.id || "unknown"}`;
    } catch {
      return "admin:unknown";
    }
  }, []);
  const currentUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.id || "";
    } catch {
      return "";
    }
  }, []);
  const [conversations, setConversations] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:conversations`);
    return Array.isArray(cached) ? cached : [];
  });
  const [selectedId, setSelectedId] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:selected-conversation`);
    return typeof cached === "string" ? cached : "";
  });
  const [messages, setMessages] = useState(() => {
    const cachedId = readMessageCache(`${cacheScope}:selected-conversation`);
    const cached = cachedId
      ? readMessageCache(`${cacheScope}:messages:${cachedId}`)
      : null;
    return Array.isArray(cached) ? cached : [];
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:conversations`);
    return !Array.isArray(cached);
  });
  const [messageLoading, setMessageLoading] = useState(() => {
    const cachedId = readMessageCache(`${cacheScope}:selected-conversation`);
    const cached = cachedId
      ? readMessageCache(`${cacheScope}:messages:${cachedId}`)
      : null;
    return !Array.isArray(cached);
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState("");
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const reactionRequestsRef = useRef(new Set());
  const reactionListRefs = useRef(new Map());
  useEffect(() => {
    for (const [messageId, element] of reactionListRefs.current) {
      if (messages.some((message) => message.id === messageId)) {
        element.scrollLeft =
          element.children.length > 1
            ? element.scrollWidth - element.clientWidth
            : 0;
      }
    }
  }, [messages]);
  const [emojiPopupPosition, setEmojiPopupPosition] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [downloadingPreview, setDownloadingPreview] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupUsers, setGroupUsers] = useState([]);
  const [groupAnchorUserId, setGroupAnchorUserId] = useState("");
  const [groupCandidates, setGroupCandidates] = useState([]);
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupUsersLoading, setGroupUsersLoading] = useState(false);
  const [groupCandidatesLoading, setGroupCandidatesLoading] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupManagementMode, setGroupManagementMode] = useState("");
  const [groupManagementOpen, setGroupManagementOpen] = useState(false);
  const [groupManagementUsers, setGroupManagementUsers] = useState([]);
  const [groupManagementUserIds, setGroupManagementUserIds] = useState([]);
  const [groupManagementLoading, setGroupManagementLoading] = useState(false);
  const [groupManagementSaving, setGroupManagementSaving] = useState(false);
  const [groupManagementError, setGroupManagementError] = useState("");
  const [editGroupNameOpen, setEditGroupNameOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupNameSaving, setEditGroupNameSaving] = useState(false);
  const [editGroupNameError, setEditGroupNameError] = useState("");
  const [detailsRemoveMode, setDetailsRemoveMode] = useState(false);
  const [detailsRemoveUserIds, setDetailsRemoveUserIds] = useState([]);
  const [detailsRemoveError, setDetailsRemoveError] = useState("");
  const [detailsRemoveSaving, setDetailsRemoveSaving] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [deleteGroupSaving, setDeleteGroupSaving] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  const messagesConversationIdRef = useRef(selectedId);
  const messagesListRef = useRef(null);
  const handledTargetRef = useRef("");
  const optimisticAttachmentUrlsRef = useRef([]);
  const attachmentPreviewUrls = useMemo(
    () => selectedAttachments.map((file) => URL.createObjectURL(file)),
    [selectedAttachments],
  );
  const activeEmojiCategory = emojiCategories[emojiCategory];
  const visibleEmojis = emojiSearch.trim()
    ? emojiCategories
        .flatMap((category) => category.emojis)
        .filter((emoji) => emoji.includes(emojiSearch.trim()))
    : activeEmojiCategory.emojis;
  const selectedConversation = useMemo(
    () => conversations.find((item) => String(item.id) === String(selectedId)),
    [conversations, selectedId],
  );
  const participant = selectedConversation?.participant || {};

  return {
    location,
    navigate,
    cacheScope,
    currentUserId,
    conversations,
    setConversations,
    selectedId,
    setSelectedId,
    messages,
    setMessages,
    search,
    setSearch,
    loading,
    setLoading,
    messageLoading,
    setMessageLoading,
    sending,
    setSending,
    error,
    setError,
    messageError,
    setMessageError,
    draft,
    setDraft,
    selectedAttachments,
    setSelectedAttachments,
    emojiOpen,
    setEmojiOpen,
    emojiCategory,
    setEmojiCategory,
    emojiSearch,
    setEmojiSearch,
    reactionPickerMessageId,
    setReactionPickerMessageId,
    reactionPickerPosition,
    setReactionPickerPosition,
    reactionRequestsRef,
    reactionListRefs,
    emojiPopupPosition,
    setEmojiPopupPosition,
    recording,
    setRecording,
    recordingSeconds,
    setRecordingSeconds,
    recordingSupported,
    setRecordingSupported,
    mobileThreadOpen,
    setMobileThreadOpen,
    imagePreview,
    setImagePreview,
    pdfPreviewUrl,
    setPdfPreviewUrl,
    previewError,
    setPreviewError,
    downloadingPreview,
    setDownloadingPreview,
    groupModalOpen,
    setGroupModalOpen,
    groupUsers,
    setGroupUsers,
    groupAnchorUserId,
    setGroupAnchorUserId,
    groupCandidates,
    setGroupCandidates,
    groupMemberIds,
    setGroupMemberIds,
    groupName,
    setGroupName,
    groupUsersLoading,
    setGroupUsersLoading,
    groupCandidatesLoading,
    setGroupCandidatesLoading,
    groupSaving,
    setGroupSaving,
    groupError,
    setGroupError,
    groupManagementMode,
    setGroupManagementMode,
    groupManagementOpen,
    setGroupManagementOpen,
    groupManagementUsers,
    setGroupManagementUsers,
    groupManagementUserIds,
    setGroupManagementUserIds,
    groupManagementLoading,
    setGroupManagementLoading,
    groupManagementSaving,
    setGroupManagementSaving,
    groupManagementError,
    setGroupManagementError,
    editGroupNameOpen,
    setEditGroupNameOpen,
    editGroupName,
    setEditGroupName,
    editGroupNameSaving,
    setEditGroupNameSaving,
    editGroupNameError,
    setEditGroupNameError,
    detailsRemoveMode,
    setDetailsRemoveMode,
    detailsRemoveUserIds,
    setDetailsRemoveUserIds,
    detailsRemoveError,
    setDetailsRemoveError,
    detailsRemoveSaving,
    setDetailsRemoveSaving,
    deleteGroupOpen,
    setDeleteGroupOpen,
    deleteGroupSaving,
    setDeleteGroupSaving,
    deleteGroupError,
    setDeleteGroupError,
    fileInputRef,
    textareaRef,
    emojiButtonRef,
    recorderRef,
    streamRef,
    selectedIdRef,
    messagesConversationIdRef,
    messagesListRef,
    handledTargetRef,
    optimisticAttachmentUrlsRef,
    attachmentPreviewUrls,
    activeEmojiCategory,
    visibleEmojis,
    selectedConversation,
    participant,
  };
};

export default useMessagesInboxState;
