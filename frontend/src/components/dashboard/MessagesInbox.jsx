import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Alert,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiHeart,
  FiInfo,
  FiMic,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPaperclip,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSmile,
  FiSquare,
  FiX,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "./PageHeader";
import { readMessageCache, writeMessageCache } from "./messageCache";
import "./MessagesInbox.css";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Your support session has expired. Please sign in again.");
  }
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.error || "The request failed.");
  }
  return result;
};

const EMOJI_CATEGORIES = [
  { name: "Smileys", icon: "😀", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤔 😎 🥳 😕 🙁 😮 😳 🥺 🥹 😢 😭 😱 😤 😡 🤬 😴 🤒 🤢 🤧 🥶 🥵 🤯 👻 💩".split(" ") },
  { name: "People", icon: "👋", emojis: "👋 🤚 ✋ 🖐️ 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 👍 👎 👏 🙌 🫶 🙏 💪 🦾 🦵 👂 👃 👀 👶 🧒 🧑 👨 👩 🧓 🙋 🙆 🙅 🤷 🤦 💃 🕺 🏃 🚶".split(" ") },
  { name: "Animals", icon: "🐻", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐞 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐘 🦒 🐕 🐈 🦜 🦢".split(" ") },
  { name: "Food", icon: "🍕", emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥝 🍅 🥑 🥦 🥕 🌽 🥐 🍞 🧀 🥚 🍳 🥞 🥓 🍔 🍟 🍕 🌮 🌯 🥗 🍝 🍜 🍣 🍱 🍰 🎂 🍪 🍩 🍫 🍿 ☕ 🧃 🥤 🍺 🍷".split(" ") },
  { name: "Travel", icon: "🚗", emojis: "🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚜 🛵 🏍️ 🚲 🛴 🚦 ⚓ ⛵ 🚤 🚢 ✈️ 🛫 🛬 🚁 🚀 🛸 🌍 🗺️ 🧭 🏔️ 🏕️ 🏖️ 🏝️ 🏠 🏢 🏥 🏫 🏰 🗼 🌅 🌆 🌉".split(" ") },
  { name: "Activities", icon: "⚽", emojis: "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🛹 🛼 ⛸️ 🎿 🏂 🏋️ 🤼 🤸 🏇 🧘 🏄 🏊 🏆 🥇 🥈 🥉 🎖️ 🎨 🎬 🎤 🎧 🎹 🥁 🎷 🎸 🎻 🎲 🎯 🎳 🎮 🧩 🎉 🎊".split(" ") },
  { name: "Objects", icon: "💡", emojis: "💌 💝 💖 💗 💓 💞 💕 💔 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 💢 💥 💫 💦 💬 💭 💤 💻 📱 ☎️ 📷 🎥 💡 🔦 📚 📝 📌 ✂️ 🔒 🔑 🔨 🔧 🧰 💉 💊 🛏️ 🚿 🛒 🎁 🏷️".split(" ") },
  { name: "Symbols", icon: "✅", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ✅ ❎ ❌ ⭕ 🚫 ❗ ❓ ‼️ ⁉️ ⚠️ ➕ ➖ ➗ ✖️ ♾️ ✔️ ☑️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ⭐ 🌟 ✨ ⚡ 🔥 💧 🌈 ☀️ 🌙".split(" ") },
];
const QUICK_MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 20;
const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/3gpp",
]);

const formatTime = (value, includeDate = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(
    [],
    includeDate
      ? { dateStyle: "medium", timeStyle: "short" }
      : { hour: "numeric", minute: "2-digit" },
  );
};

const getPreview = (content) => {
  if (!content) return "Start a conversation";
  try {
    const attachment = JSON.parse(content);
    if (
      attachment?.type === "attachment_group" &&
      Array.isArray(attachment.attachments)
    ) {
      const images = attachment.attachments.filter(
        (item) => item.mediaType === "image",
      ).length;
      const others = attachment.attachments.length - images;
      return [
        images ? `${images} ${images === 1 ? "photo" : "photos"}` : "",
        others
          ? `${others} ${others === 1 ? "attachment" : "attachments"}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (attachment?.type === "attachment") {
      const label =
        attachment.mediaType === "image"
          ? "Photo"
          : attachment.mediaType === "audio"
            ? "Voice message"
            : "File attachment";
      return attachment.caption ? `${label}: ${attachment.caption}` : label;
    }
  } catch {
    return content;
  }
  return content;
};

const roleLabel = (role) =>
  role === "group"
    ? "Group chat"
    : role === "driver"
    ? "Driver"
    : role === "client"
      ? "Parent"
      : role === "school"
        ? "School"
        : role === "owner"
          ? "Fleet owner"
          : role === "admin"
            ? "Support team"
            : "User";

const userSchoolName = (user) =>
  user?.schools?.find((school) => school?.name)?.name ||
  user?.school?.name ||
  "";

const messagePath = (conversation, conversationId) => {
  const id = encodeURIComponent(conversationId);
  if (conversation?.is_linked_conversation) {
    return `/admin/linked-conversations/${id}/messages`;
  }
  if (conversation?.conversation_type === "admin_driver") {
    return `/admin/driver-conversations/${id}/messages`;
  }
  return `/admin/user-conversations/${id}/messages`;
};

const sendPath = (conversation, conversationId) => {
  const id = encodeURIComponent(conversationId);
  if (conversation?.conversation_type === "admin_driver") {
    return `/admin/driver-conversations/${id}/messages`;
  }
  return `/admin/user-conversations/${id}/messages`;
};

const attachmentUploadPath = (conversation, conversationId) => {
  const id = encodeURIComponent(conversationId);
  if (conversation?.conversation_type === "admin_driver") {
    return `/admin/driver-conversations/${id}/attachments`;
  }
  return `/admin/user-conversations/${id}/attachments`;
};

const parseAttachment = (content) => {
  try {
    const attachment = JSON.parse(content);
    if (attachment?.type === "attachment" && attachment.url) {
      return {
        attachments: [attachment],
        caption: attachment.caption || "",
      };
    }
    if (
      attachment?.type === "attachment_group" &&
      Array.isArray(attachment.attachments) &&
      attachment.attachments.length
    ) {
      return {
        attachments: attachment.attachments.filter((item) => item?.url),
        caption: attachment.caption || "",
      };
    }
    return null;
  } catch {
    return null;
  }
};

const groupAdjacentAttachmentMessages = (messages) => {
  const attachmentBurstWindowMs = 2 * 60 * 1000;
  const groupedMessages = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const attachment = parseAttachment(message.content);
    if (
      !attachment ||
      message.deliveryError ||
      String(message.id).startsWith("optimistic-") ||
      attachment.attachments.length !== 1
    ) {
      groupedMessages.push(message);
      continue;
    }

    const attachments = [...attachment.attachments];
    let nextIndex = index + 1;
    const firstSentAt = new Date(message.sent_at).getTime();

    while (nextIndex < messages.length) {
      const nextMessage = messages[nextIndex];
      const nextAttachment = parseAttachment(nextMessage.content);
      const nextSentAt = new Date(nextMessage.sent_at).getTime();
      const elapsed = nextSentAt - firstSentAt;
      if (
        !nextAttachment ||
        nextMessage.deliveryError ||
        String(nextMessage.id).startsWith("optimistic-") ||
        nextAttachment.attachments.length !== 1 ||
        nextMessage.sender_id !== message.sender_id ||
        nextAttachment.caption !== attachment.caption ||
        !Number.isFinite(elapsed) ||
        elapsed < 0 ||
        elapsed > attachmentBurstWindowMs
      ) {
        break;
      }
      attachments.push(nextAttachment.attachments[0]);
      nextIndex += 1;
    }

    if (attachments.length === 1) {
      groupedMessages.push(message);
      continue;
    }

    groupedMessages.push({
      ...message,
      content: JSON.stringify({
        type: "attachment_group",
        attachments,
        caption: attachment.caption,
      }),
    });
    index = nextIndex - 1;
  }

  return groupedMessages;
};

const getMessageIdentity = (message) => {
  const attachment = parseAttachment(message.content);
  if (!attachment) return `text:${message.content}`;
  return `attachments:${JSON.stringify({
    caption: attachment.caption,
    items: attachment.attachments.map((item) => ({
      mediaType: item.mediaType,
      name: item.name,
      mimeType: item.mimeType,
    })),
  })}`;
};

const mergeServerMessages = (serverMessages, currentMessages) => {
  const pending = currentMessages.filter((message) =>
    String(message.id).startsWith("optimistic-"),
  );
  const matchedPending = new Set();
  const mergedMessages = [...serverMessages];

  for (const serverMessage of serverMessages) {
    const serverTime = new Date(serverMessage.sent_at).getTime();
    const match = pending.find((pendingMessage) => {
      if (matchedPending.has(pendingMessage.id)) return false;
      const pendingTime = new Date(pendingMessage.sent_at).getTime();
      return (
        pendingMessage.sender_id === serverMessage.sender_id &&
        getMessageIdentity(pendingMessage) === getMessageIdentity(serverMessage) &&
        Number.isFinite(serverTime) &&
        Number.isFinite(pendingTime) &&
        serverTime >= pendingTime - 15 * 1000 &&
        serverTime <= pendingTime + 10 * 60 * 1000
      );
    });
    if (match) matchedPending.add(match.id);
  }

  mergedMessages.push(
    ...pending.filter((message) => !matchedPending.has(message.id)),
  );
  return mergedMessages.sort(
    (first, second) =>
      new Date(first.sent_at).getTime() - new Date(second.sent_at).getTime(),
  );
};

const MessagesInbox = () => {
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
  const activeEmojiCategory = EMOJI_CATEGORIES[emojiCategory];
  const visibleEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((category) => category.emojis).filter((emoji) =>
        emoji.includes(emojiSearch.trim()),
      )
    : activeEmojiCategory.emojis;

  useEffect(() => {
    if (!emojiOpen) return undefined;
    const updatePosition = () => {
      const button = emojiButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(430, window.innerWidth - 24);
      setEmojiPopupPosition({
        left: Math.max(
          12,
          Math.min(rect.left, window.innerWidth - width - 12),
        ),
        bottom: Math.max(12, window.innerHeight - rect.top + 8),
        width,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [emojiOpen]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => String(item.id) === String(selectedId)),
    [conversations, selectedId],
  );
  const participant = selectedConversation?.participant || {};

  useEffect(() => {
    writeMessageCache(`${cacheScope}:conversations`, conversations);
  }, [cacheScope, conversations]);

  useEffect(() => {
    if (!selectedId) return;
    writeMessageCache(`${cacheScope}:selected-conversation`, selectedId);
    if (String(messagesConversationIdRef.current) !== String(selectedId)) return;
    writeMessageCache(`${cacheScope}:messages:${selectedId}`, messages);
  }, [cacheScope, messages, selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setDetailsRemoveMode(false);
    setDetailsRemoveUserIds([]);
    setDetailsRemoveError("");
  }, [selectedId]);

  useEffect(() => {
    return () => {
      attachmentPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachmentPreviewUrls]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(
      () => setRecordingSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    setSelectedAttachments([]);
  }, [selectedId]);

  useEffect(() => {
    setRecordingSupported(
      Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof window.MediaRecorder !== "undefined" &&
        RECORDING_MIME_TYPES.some((type) =>
          window.MediaRecorder.isTypeSupported(type),
        ),
    );
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      optimisticAttachmentUrlsRef.current.forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, []);

  const loadConversations = useCallback(async () => {
    if (!conversations.length) setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/conversations");
      const sorted = [...(Array.isArray(result) ? result : [])].sort(
        (first, second) =>
          new Date(second.last_message_at || 0).getTime() -
          new Date(first.last_message_at || 0).getTime(),
      );
      setConversations(sorted);
      setSelectedId((current) =>
        current && sorted.some((item) => String(item.id) === String(current))
          ? current
          : String(
              (sorted.some((item) => String(item.id) === String(
                readMessageCache(`${cacheScope}:selected-conversation`),
              ))
                ? readMessageCache(`${cacheScope}:selected-conversation`)
                : sorted[0]?.id) || "",
            ),
      );
    } catch (loadError) {
      console.error("Could not load support inbox:", loadError);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [cacheScope, conversations.length]);

  const openGroupModal = async () => {
    setGroupModalOpen(true);
    setGroupError("");
    if (groupUsers.length) return;
    setGroupUsersLoading(true);
    try {
      const result = await apiRequest("/admin/users");
      setGroupUsers(
        (Array.isArray(result) ? result : []).filter((user) =>
          ["client", "driver", "owner", "school"].includes(user.role),
        ),
      );
    } catch (loadError) {
      console.error("Could not load group chat users:", loadError);
      setGroupError(loadError.message);
    } finally {
      setGroupUsersLoading(false);
    }
  };

  const loadGroupCandidates = async (userId) => {
    setGroupAnchorUserId(userId);
    setGroupCandidates([]);
    setGroupMemberIds([]);
    setGroupError("");
    if (!userId) return;
    setGroupCandidatesLoading(true);
    try {
      const result = await apiRequest(
        `/admin/users/${encodeURIComponent(userId)}/group-candidates`,
      );
      setGroupCandidates(
        Array.isArray(result.linkedUsers) ? result.linkedUsers : [],
      );
    } catch (loadError) {
      console.error("Could not load linked group chat users:", loadError);
      setGroupError(loadError.message);
    } finally {
      setGroupCandidatesLoading(false);
    }
  };

  const createGroupConversation = async () => {
    if (!groupAnchorUserId || !groupMemberIds.length) return;
    setGroupSaving(true);
    setGroupError("");
    try {
      const result = await apiRequest("/admin/group-conversations", {
        method: "POST",
        body: JSON.stringify({
          anchorUserId: groupAnchorUserId,
          memberUserIds: groupMemberIds,
          groupName,
        }),
      });
      setGroupModalOpen(false);
      setGroupAnchorUserId("");
      setGroupCandidates([]);
      setGroupMemberIds([]);
      setGroupName("");
      await loadConversations();
      setSelectedId(String(result.conversationId));
      setMobileThreadOpen(true);
    } catch (createError) {
      console.error("Could not create group conversation:", createError);
      setGroupError(createError.message);
    } finally {
      setGroupSaving(false);
    }
  };

  const openGroupManagement = async (mode) => {
    if (!selectedConversation?.is_group_conversation) return;
    setGroupManagementMode(mode);
    setGroupManagementOpen(true);
    setGroupManagementError("");
    setGroupManagementUserIds([]);
    setGroupManagementUsers([]);
    setGroupManagementLoading(true);
    try {
      if (mode === "remove") {
        setGroupManagementUsers(
          (selectedConversation.participants || []).filter(
            (user) => user.role !== "admin" && user.id !== currentUserId,
          ),
        );
        return;
      }
      const anchorUserId = selectedConversation.anchor_user_id;
      if (!anchorUserId) {
        throw new Error("This group is missing its linked account.");
      }
      const result = await apiRequest(
        `/admin/users/${encodeURIComponent(anchorUserId)}/group-candidates`,
      );
      const existingIds = new Set(
        (selectedConversation.participants || []).map((user) =>
          String(user.id),
        ),
      );
      setGroupManagementUsers(
        (Array.isArray(result.linkedUsers) ? result.linkedUsers : []).filter(
          (user) => !existingIds.has(String(user.id)),
        ),
      );
    } catch (loadError) {
      console.error("Could not load group membership options:", loadError);
      setGroupManagementError(loadError.message);
    } finally {
      setGroupManagementLoading(false);
    }
  };

  const saveGroupMembership = async () => {
    if (!selectedConversation?.is_group_conversation || !groupManagementUserIds.length) {
      return;
    }
    setGroupManagementSaving(true);
    setGroupManagementError("");
    try {
      const path = `/admin/group-conversations/${selectedConversation.id}/members`;
      await apiRequest(path, {
        method: groupManagementMode === "add" ? "POST" : "DELETE",
        body: JSON.stringify({ memberUserIds: groupManagementUserIds }),
      });
      await loadConversations();
      setGroupManagementOpen(false);
      setGroupManagementUserIds([]);
    } catch (saveError) {
      console.error("Could not update group membership:", saveError);
      setGroupManagementError(saveError.message);
    } finally {
      setGroupManagementSaving(false);
    }
  };

  const removeDetailsParticipants = async () => {
    if (
      !selectedConversation?.is_group_conversation ||
      !detailsRemoveUserIds.length
    ) {
      return;
    }
    setDetailsRemoveSaving(true);
    setDetailsRemoveError("");
    try {
      await apiRequest(
        `/admin/group-conversations/${selectedConversation.id}/members`,
        {
          method: "DELETE",
          body: JSON.stringify({ memberUserIds: detailsRemoveUserIds }),
        },
      );
      setDetailsRemoveMode(false);
      setDetailsRemoveUserIds([]);
      await loadConversations();
    } catch (removeError) {
      console.error("Could not remove group participants from details:", removeError);
      setDetailsRemoveError(removeError.message);
    } finally {
      setDetailsRemoveSaving(false);
    }
  };

  const deleteGroupConversation = async () => {
    if (!selectedConversation?.is_group_conversation) return;
    setDeleteGroupSaving(true);
    setDeleteGroupError("");
    try {
      const conversationId = selectedConversation.id;
      await apiRequest(`/admin/group-conversations/${conversationId}`, {
        method: "DELETE",
      });
      writeMessageCache(`${cacheScope}:messages:${conversationId}`, null);
      setDeleteGroupOpen(false);
      setMessages([]);
      setSelectedId("");
      setMobileThreadOpen(false);
      await loadConversations();
    } catch (deleteError) {
      console.error("Could not delete group conversation:", deleteError);
      setDeleteGroupError(deleteError.message);
    } finally {
      setDeleteGroupSaving(false);
    }
  };

  const openEditGroupName = () => {
    if (!selectedConversation?.is_group_conversation) return;
    setEditGroupName(selectedConversation.group_name || participant.name || "");
    setEditGroupNameError("");
    setEditGroupNameOpen(true);
  };

  const saveGroupName = async () => {
    const groupName = editGroupName.trim();
    if (!selectedConversation?.is_group_conversation || !groupName) {
      setEditGroupNameError("Enter a group name.");
      return;
    }
    if (groupName.length > 80) {
      setEditGroupNameError("Group names must be 80 characters or fewer.");
      return;
    }

    setEditGroupNameSaving(true);
    setEditGroupNameError("");
    try {
      const result = await apiRequest(
        `/admin/group-conversations/${encodeURIComponent(selectedConversation.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ groupName }),
        },
      );
      setConversations((current) =>
        current.map((conversation) =>
          String(conversation.id) === String(result.conversationId)
            ? {
                ...conversation,
                group_name: result.groupName,
                other_participant: conversation.other_participant
                  ? { ...conversation.other_participant, name: result.groupName }
                  : conversation.other_participant,
              }
            : conversation,
        ),
      );
      setEditGroupNameOpen(false);
    } catch (saveError) {
      console.error("Could not update group name:", saveError);
      setEditGroupNameError(saveError.message);
    } finally {
      setEditGroupNameSaving(false);
    }
  };

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(), 15000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    const targetUserId = location.state?.openConversationUserId;
    if (!targetUserId || loading) return;
    const targetKey = String(targetUserId);
    if (handledTargetRef.current === targetKey) return;
    handledTargetRef.current = targetKey;

    const existing = conversations.find(
      (item) =>
        !item.is_linked_conversation &&
        String(item.participant?.id) === targetKey,
    );
    if (existing) {
      setSelectedId(String(existing.id));
      setMobileThreadOpen(true);
      navigate("/messages", { replace: true, state: null });
      return;
    }

    const role = location.state?.openConversationRole;
    const endpoint =
      role === "driver"
        ? `/admin/drivers/${encodeURIComponent(targetKey)}/conversation`
        : `/admin/users/${encodeURIComponent(targetKey)}/conversation`;
    apiRequest(endpoint, { method: "POST", body: JSON.stringify({}) })
      .then(async (result) => {
        await loadConversations();
        setSelectedId(String(result.conversationId || ""));
        setMobileThreadOpen(true);
        navigate("/messages", { replace: true, state: null });
      })
      .catch((openError) => {
        console.error("Could not open conversation from Users:", openError);
        setError(openError.message);
      });
  }, [conversations, loadConversations, loading, location.state, navigate]);

  const loadMessages = useCallback(async (conversation) => {
    if (!conversation?.id) {
      setMessages([]);
      return;
    }
    setMessageError("");
    try {
      const result = await apiRequest(
        messagePath(conversation, conversation.id),
      );
      const nextMessages = Array.isArray(result) ? result : [];
      if (String(selectedIdRef.current) === String(conversation.id)) {
        setMessages((currentMessages) => {
          const mergedMessages = mergeServerMessages(
            nextMessages,
            currentMessages,
          );
          writeMessageCache(
            `${cacheScope}:messages:${conversation.id}`,
            mergedMessages,
          );
          return mergedMessages;
        });
      } else {
        writeMessageCache(
          `${cacheScope}:messages:${conversation.id}`,
          nextMessages,
        );
      }
    } catch (loadError) {
      console.error("Could not load conversation messages:", loadError);
      if (String(selectedIdRef.current) === String(conversation.id)) {
        setMessageError(loadError.message);
      }
    } finally {
      if (String(selectedIdRef.current) === String(conversation.id)) {
        setMessageLoading(false);
      }
    }
  }, [cacheScope]);

  useEffect(() => {
    if (!selectedConversation) {
      messagesConversationIdRef.current = "";
      setMessages([]);
      setMessageLoading(false);
      return undefined;
    }
    messagesConversationIdRef.current = String(selectedConversation.id);
    const cached = readMessageCache(
      `${cacheScope}:messages:${selectedConversation.id}`,
    );
    if (Array.isArray(cached)) {
      setMessages(cached);
      setMessageLoading(false);
    } else {
      setMessages([]);
      setMessageLoading(true);
    }
    void loadMessages(selectedConversation);
    const timer = window.setInterval(
      () => void loadMessages(selectedConversation),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [cacheScope, loadMessages, selectedConversation]);

  useEffect(() => {
    const messageList = messagesListRef.current;
    if (messageList) {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!imagePreview || imagePreview.images.length < 2) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setImagePreview((current) => ({
          ...current,
          index:
            (current.index - 1 + current.images.length) %
            current.images.length,
        }));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setImagePreview((current) => ({
          ...current,
          index: (current.index + 1) % current.images.length,
        }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imagePreview]);

  useEffect(() => {
    const attachment = imagePreview?.images[imagePreview.index];
    if (!attachment || attachment.mediaType !== "pdf") {
      setPdfPreviewUrl("");
      setPreviewError("");
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = "";
    setPdfPreviewUrl("");
    setPreviewError("");
    fetch(attachment.url, {
      signal: controller.signal,
      referrerPolicy: "no-referrer",
    })
      .then((response) => {
        if (!response.ok) throw new Error("PDF preview could not be loaded.");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(
          blob.type === "application/pdf"
            ? blob
            : new Blob([blob], { type: "application/pdf" }),
        );
        setPdfPreviewUrl(objectUrl);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load PDF preview:", error);
          setPreviewError("PDF preview could not be loaded. Try downloading it.");
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePreview]);

  const downloadPreviewAttachment = async () => {
    const attachment = imagePreview?.images[imagePreview.index];
    if (!attachment) return;
    setDownloadingPreview(true);
    setPreviewError("");
    try {
      const response = await fetch(attachment.url, {
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("Attachment could not be downloaded.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.name || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Could not download message attachment:", error);
      setPreviewError("Download failed. Please try again.");
    } finally {
      setDownloadingPreview(false);
    }
  };

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const contact = conversation.participant || {};
      return [
        contact.name,
        contact.email,
        contact.phone,
        roleLabel(contact.role),
        getPreview(conversation.last_message?.content),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [conversations, search]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (
      (!draft.trim() && !selectedAttachments.length) ||
      !selectedConversation ||
      selectedConversation.is_linked_conversation
    ) {
      return;
    }
    const content = draft.trim();
    const optimisticId = `optimistic-${Date.now()}`;
    const currentUserId = (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null")?.id;
      } catch {
        return null;
      }
    })();
    const optimisticMessage = {
      id: optimisticId,
      content,
      sender_id: currentUserId,
      sent_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    if (selectedAttachments.length) {
      await uploadAttachments(
        selectedAttachments,
        content,
        selectedConversation,
        optimisticMessage,
      );
      return;
    }
    setSending(true);
    setMessageError("");
    try {
      const sent = await apiRequest(
        sendPath(selectedConversation, selectedConversation.id),
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId ? { ...sent, content } : message,
        ),
      );
      void loadConversations();
    } catch (sendError) {
      console.error("Could not send support message:", sendError);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const uploadAttachments = async (
    files,
    caption = "",
    conversation = selectedConversation,
    optimisticMessage,
  ) => {
    if (!files.length || !conversation?.id || conversation.is_linked_conversation) {
      return;
    }
    if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      setDraft(caption);
      setMessageError(
        `You can send up to ${MAX_ATTACHMENTS_PER_MESSAGE} attachments in one message.`,
      );
      if (optimisticMessage) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimisticMessage.id),
        );
      }
      return;
    }
    const invalidFile = files.find((file) => {
      const mimeType = file.type.split(";")[0].trim().toLowerCase();
      return (
        !ALLOWED_ATTACHMENT_TYPES.has(mimeType) ||
        file.size > MAX_ATTACHMENT_SIZE
      );
    });
    if (invalidFile) {
      setDraft(caption);
      setMessageError(
        invalidFile.size > MAX_ATTACHMENT_SIZE
          ? `${invalidFile.name} is over the 20 MB attachment limit.`
          : `${invalidFile.name} is not a supported attachment type.`,
      );
      if (optimisticMessage) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimisticMessage.id),
        );
      }
      return;
    }

    const localAttachments = files.map((file) => {
      const url = URL.createObjectURL(file);
      optimisticAttachmentUrlsRef.current.push(url);
      return {
        type: "attachment",
        url,
        name: file.name,
        mimeType: file.type,
        mediaType: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "audio"
            : "pdf",
      };
    });
    if (optimisticMessage) {
      const optimisticContent =
        localAttachments.length === 1
          ? JSON.stringify({ ...localAttachments[0], caption: caption.trim() })
          : JSON.stringify({
              type: "attachment_group",
              attachments: localAttachments,
              caption: caption.trim(),
            });
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...message, content: optimisticContent }
            : message,
        ),
      );
    }
    setDraft("");
    setSelectedAttachments([]);
    setSending(true);
    setMessageError("");
    const uploadedAttachments = [];
    let failedIndex = -1;
    let failureError = null;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploaded = await apiRequest(
          attachmentUploadPath(conversation, conversation.id),
          { method: "POST", body: formData },
        );
        uploadedAttachments.push(uploaded);
      } catch (uploadError) {
        console.error("Could not upload message attachment:", uploadError);
        failedIndex = index;
        failureError = uploadError;
        break;
      }
    }

    if (failedIndex >= 0) {
      console.error("Could not upload message attachment:", failureError);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage?.id
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
      setSending(false);
      return;
    }

    const messageAttachment =
      uploadedAttachments.length === 1
        ? {
            type: "attachment",
            ...uploadedAttachments[0],
            caption: caption.trim(),
          }
        : {
            type: "attachment_group",
            attachments: uploadedAttachments,
            caption: caption.trim(),
          };
    try {
      const sent = await apiRequest(sendPath(conversation, conversation.id), {
        method: "POST",
        body: JSON.stringify({ content: JSON.stringify(messageAttachment) }),
      });
      if (String(selectedIdRef.current) === String(conversation.id)) {
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticMessage?.id
              ? { ...sent, content: JSON.stringify(messageAttachment) }
              : message,
          ),
        );
      }
      localAttachments.forEach((item) => URL.revokeObjectURL(item.url));
      optimisticAttachmentUrlsRef.current =
        optimisticAttachmentUrlsRef.current.filter(
          (url) => !localAttachments.some((item) => item.url === url),
        );
      setEmojiOpen(false);
      void loadConversations();
    } catch (sendError) {
      console.error("Could not send grouped message attachments:", sendError);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage?.id
            ? { ...message, deliveryError: true }
            : message,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const stageAttachments = (files) => {
    const availableSlots =
      MAX_ATTACHMENTS_PER_MESSAGE - selectedAttachments.length;
    if (files.length > availableSlots) {
      setMessageError(
        `You can send up to ${MAX_ATTACHMENTS_PER_MESSAGE} attachments in one message.`,
      );
      return;
    }
    const invalidFile = files.find((file) => {
      const mimeType = file.type.split(";")[0].trim().toLowerCase();
      return (
        !ALLOWED_ATTACHMENT_TYPES.has(mimeType) ||
        file.size > MAX_ATTACHMENT_SIZE
      );
    });
    if (invalidFile) {
      setMessageError(
        invalidFile.size > MAX_ATTACHMENT_SIZE
          ? `${invalidFile.name} is over the 20 MB attachment limit.`
          : `${invalidFile.name} is not a supported attachment type.`,
      );
      return;
    }
    setMessageError("");
    setSelectedAttachments((current) => [...current, ...files]);
  };

  const startVoiceRecording = async () => {
    if (!recordingSupported || !selectedConversation)
      return;
    setMessageError("");
    try {
      const mimeType = RECORDING_MIME_TYPES.find((type) =>
        window.MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType) {
        setMessageError("Voice recording is not supported by this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new window.MediaRecorder(stream, { mimeType });
      const chunks = [];
      const targetConversation = selectedConversation;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setMessageError("Voice recording failed. Please try again.");
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
      };
      recorder.onstop = () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!chunks.length) return;
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const audioFile = new File(
          [blob],
          `voice-note-${Date.now()}.${extension}`,
          { type: blob.type },
        );
        if (audioFile.size > MAX_ATTACHMENT_SIZE) {
          setMessageError("This recording is over the 20 MB attachment limit.");
        } else if (
          String(selectedIdRef.current) === String(targetConversation.id)
        ) {
          stageAttachments([audioFile]);
          setRecordingSeconds(0);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
    } catch (recordError) {
      console.error("Could not start voice recording:", recordError);
      setMessageError(
        recordError.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Voice recording could not be started on this device.",
      );
    }
  };

  const stopVoiceRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const toggleMessageReaction = async (message, emoji) => {
    if (
      !selectedConversation ||
      String(message.id).startsWith("optimistic-")
    ) {
      return;
    }
    const previousReactions = message.reactions || [];
    const selected = previousReactions.find(
      (reaction) => reaction.emoji === emoji,
    );
    const userAlreadyReacted =
      selected?.userIds?.includes(currentUserId) || selected?.reactedByMe;
    const optimisticReactions = userAlreadyReacted
      ? previousReactions
          .map((reaction) =>
            reaction.emoji === emoji
              ? {
                  ...reaction,
                  count: reaction.count - 1,
                  userIds: reaction.userIds?.filter(
                    (id) => id !== currentUserId,
                  ),
                  reactedByMe: false,
                }
              : reaction,
          )
          .filter((reaction) => reaction.count > 0)
      : selected
        ? previousReactions.map((reaction) =>
            reaction.emoji === emoji
              ? {
                  ...reaction,
                  count: reaction.count + 1,
                  userIds: [...(reaction.userIds || []), currentUserId],
                  reactedByMe: true,
                }
              : reaction,
          )
        : [
            ...previousReactions,
            {
              emoji,
              count: 1,
              userIds: [currentUserId],
              reactedByMe: true,
            },
          ];
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...item, reactions: optimisticReactions }
          : item,
      ),
    );
    setReactionPickerMessageId("");
    setReactionPickerPosition(null);
    try {
      const result = await apiRequest(
        `/admin/user-conversations/${selectedConversation.id}/messages/${message.id}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        },
      );
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, reactions: result.reactions || [] }
            : item,
        ),
      );
    } catch (reactionError) {
      console.error("Could not update support message reaction:", reactionError);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, reactions: previousReactions }
            : item,
        ),
      );
      setMessageError(
        reactionError.message || "Reaction could not be saved.",
      );
    }
  };

  const toggleReactionPicker = (messageId, event) => {
    if (reactionPickerMessageId === messageId) {
      setReactionPickerMessageId("");
      setReactionPickerPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 212;
    const popupHeight = 44;
    setReactionPickerPosition({
      left: Math.max(8, Math.min(rect.right - popupWidth, window.innerWidth - popupWidth - 8)),
      top:
        rect.top >= popupHeight + 8
          ? rect.top - popupHeight - 8
          : Math.min(rect.bottom + 8, window.innerHeight - popupHeight - 8),
    });
    setReactionPickerMessageId(messageId);
  };

  const renderMessage = (message) => {
    const own = message.sender_id === currentUserId;
    const attachment = parseAttachment(message.content);
    const imageAttachments =
      attachment?.attachments.filter((item) => item.mediaType === "image") || [];
    return (
      <Flex
        key={message.id || `${message.sent_at}-${message.content}`}
        className={`inbox-message-row${own ? " is-own" : ""}`}
      >
        {!own && (
          <Avatar
            className="inbox-message-avatar"
            name={message.users?.name || participant.name}
            src={message.users?.avatar || participant.avatar}
            size="xs"
          />
        )}
        <Box className={`inbox-message${own ? " is-own" : ""}`}>
          {attachment ? (
            <Box className="inbox-attachment-group">
              {attachment.attachments.map((item, index) => {
                if (item.mediaType === "image") {
                  const imageIndex = imageAttachments.indexOf(item);
                  return (
                    <button
                      className="inbox-image-preview-trigger"
                      type="button"
                      key={`${item.url}-${index}`}
                      onClick={() =>
                        setImagePreview({
                          images: imageAttachments,
                          index: imageIndex,
                        })
                      }
                      aria-label={`Preview image ${imageIndex + 1} of ${imageAttachments.length}`}
                    >
                    <img
                      src={item.url}
                      alt={item.name || "Attachment"}
                      referrerPolicy="no-referrer"
                    />
                    </button>
                  );
                }
                if (item.mediaType === "audio") {
                  return (
                    <audio controls src={item.url} key={`${item.url}-${index}`} />
                  );
                }
                return (
                  <Box
                    className="inbox-pdf-attachment"
                    key={`${item.url}-${index}`}
                  >
                    <button
                      className="inbox-pdf-preview-trigger"
                      type="button"
                      onClick={() =>
                        setImagePreview({ images: [item], index: 0 })
                      }
                    >
                      {item.name || "Open attachment"}
                    </button>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Text whiteSpace="pre-wrap" wordBreak="break-word">
              {message.content}
            </Text>
          )}
          {attachment?.caption && <Text mt={1}>{attachment.caption}</Text>}
          <div className={`inbox-message-footer${own ? " is-own" : ""}`}>
            {/* Show reaction badges for both own and other messages next to the timestamp */}
            {message.reactions?.length > 0 && (
              <span
                className="inbox-message-reaction-badges"
                aria-label={own ? "Reactions to your message" : "Reactions to message"}
              >
                {message.reactions.map((reaction) => (
                  <span key={reaction.emoji}>{reaction.emoji}</span>
                ))}
              </span>
            )}
            <Text className="inbox-message-time">
              {formatTime(message.sent_at)}
              {own && !message.deliveryError && (
                <span
                  className={`inbox-message-read-tick${message.is_read ? " is-read" : ""}`}
                  aria-label={message.is_read ? "Read" : "Sent"}
                  title={message.is_read ? "Read" : "Sent"}
                >
                  {message.is_read ? "✓✓" : "✓"}
                </span>
              )}
            </Text>
            {!own && (
              <div className="inbox-message-reactions">
                {(message.reactions || []).map((reaction) => {
                  const selected =
                    reaction.userIds?.includes(currentUserId) ||
                    reaction.reactedByMe;
                  return (
                    <button
                      type="button"
                      key={reaction.emoji}
                      className={`inbox-message-reaction${selected ? " is-selected" : ""}`}
                      onClick={() =>
                        void toggleMessageReaction(message, reaction.emoji)
                      }
                      aria-label={`${reaction.emoji} reaction`}
                      aria-pressed={Boolean(selected)}
                    >
                      <span>{reaction.emoji}</span>
                    </button>
                  );
                })}
                {reactionPickerMessageId === message.id && (
                  createPortal(
                    <div
                      className="inbox-reaction-picker"
                      style={reactionPickerPosition}
                    >
                      {QUICK_MESSAGE_REACTIONS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() =>
                            void toggleMessageReaction(message, emoji)
                          }
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>,
                    document.body,
                  )
                )}
                {!String(message.id).startsWith("optimistic-") && (
                  <>
                    <button
                      type="button"
                      className={`inbox-message-reaction-like${message.reactions?.some((reaction) => reaction.emoji === "❤️" && (reaction.userIds?.includes(currentUserId) || reaction.reactedByMe)) ? " is-selected" : ""}`}
                      onClick={() =>
                        void toggleMessageReaction(message, "❤️")
                      }
                      aria-label="Like message"
                    >
                      <FiHeart />
                    </button>
                    <button
                      type="button"
                      className="inbox-message-reaction-add"
                      onClick={(event) =>
                        toggleReactionPicker(message.id, event)
                      }
                      aria-label="Add reaction"
                      aria-expanded={reactionPickerMessageId === message.id}
                    >
                      <FiSmile />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {message.deliveryError && (
            <Text className="inbox-message-error">Message not sent</Text>
          )}
        </Box>
      </Flex>
    );
  };

  return (
    <Box className="messages-inbox-page">
      <PageHeader
        eyebrow="MESSAGING"
        title="Conversations"
        description="Review support conversations and reply to users."
        actions={
          <HStack spacing={2}>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={() => void openGroupModal()}
            >
              New group
            </Button>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              onClick={() => void loadConversations()}
              isLoading={loading}
            >
              Refresh
            </Button>
          </HStack>
        }
      />

      {error && (
        <Alert status="error" borderRadius="lg" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Modal
        isOpen={groupModalOpen}
        onClose={() => {
          if (!groupSaving) setGroupModalOpen(false);
        }}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create group chat</ModalHeader>
          <ModalCloseButton isDisabled={groupSaving} />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text color="gray.600" fontSize="sm">
                Choose a user to see their linked drivers, parents, owners, or
                school members. Select who should join the group.
              </Text>
              {groupError && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {groupError}
                </Alert>
              )}
              <FormControl>
                <FormLabel>Start with a user</FormLabel>
                <Select
                  value={groupAnchorUserId}
                  onChange={(event) =>
                    void loadGroupCandidates(event.target.value)
                  }
                  placeholder={
                    groupUsersLoading ? "Loading users..." : "Select a user"
                  }
                  isDisabled={groupUsersLoading || groupSaving}
                >
                  {groupUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {(user.name || user.email || "User") +
                        ` · ${roleLabel(user.role)}` +
                        (user.role === "school" && userSchoolName(user)
                          ? ` · ${userSchoolName(user)}`
                          : "")}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {groupAnchorUserId && (
                <FormControl>
                  <FormLabel>
                    Linked users ({groupMemberIds.length} selected)
                    {groupUsers.find(
                      (user) => String(user.id) === String(groupAnchorUserId),
                    )?.role === "school" ? (
                      <Text as="span" ml={2} color="gray.500" fontWeight="normal">
                        · School:{" "}
                        {userSchoolName(
                          groupUsers.find(
                            (user) =>
                              String(user.id) === String(groupAnchorUserId),
                          ),
                        ) || "School name unavailable"}
                      </Text>
                    ) : null}
                  </FormLabel>
                  {groupCandidatesLoading ? (
                    <Flex justify="center" py={4}>
                      <Spinner color="blue.500" />
                    </Flex>
                  ) : groupCandidates.length ? (
                    <VStack
                      align="stretch"
                      spacing={2}
                      maxH="240px"
                      overflowY="auto"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={3}
                    >
                      {groupCandidates.map((user) => (
                        <Checkbox
                          key={user.id}
                          isChecked={groupMemberIds.includes(user.id)}
                          onChange={(event) =>
                            setGroupMemberIds((current) =>
                              event.target.checked
                                ? [...current, user.id]
                                : current.filter((id) => id !== user.id),
                            )
                          }
                          isDisabled={groupSaving}
                        >
                          {user.name || user.email || "User"}{" "}
                          <Text as="span" color="gray.500" fontSize="xs">
                            · {roleLabel(user.role)}
                          </Text>
                        </Checkbox>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500" fontSize="sm">
                      No linked users are available for this account.
                    </Text>
                  )}
                </FormControl>
              )}
              <FormControl>
                <FormLabel>Group name (optional)</FormLabel>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  maxLength={80}
                  placeholder="e.g. Transport updates"
                  isDisabled={groupSaving}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setGroupModalOpen(false)}
              isDisabled={groupSaving}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => void createGroupConversation()}
              isLoading={groupSaving}
              isDisabled={
                !groupAnchorUserId ||
                !groupMemberIds.length ||
                groupCandidatesLoading
              }
            >
              Create group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={editGroupNameOpen}
        onClose={() => {
          if (!editGroupNameSaving) setEditGroupNameOpen(false);
        }}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit group name</ModalHeader>
          <ModalCloseButton isDisabled={editGroupNameSaving} />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text color="gray.600" fontSize="sm">
                Choose a name that helps participants recognize this group.
              </Text>
              {editGroupNameError ? (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {editGroupNameError}
                </Alert>
              ) : null}
              <FormControl isRequired>
                <FormLabel htmlFor="edit-group-name">Group name</FormLabel>
                <Input
                  id="edit-group-name"
                  value={editGroupName}
                  onChange={(event) => setEditGroupName(event.target.value)}
                  maxLength={80}
                  autoFocus
                  isDisabled={editGroupNameSaving}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveGroupName();
                    }
                  }}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setEditGroupNameOpen(false)}
              isDisabled={editGroupNameSaving}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => void saveGroupName()}
              isLoading={editGroupNameSaving}
              isDisabled={!editGroupName.trim()}
            >
              Save name
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={groupManagementOpen}
        onClose={() => {
          if (!groupManagementSaving) setGroupManagementOpen(false);
        }}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {groupManagementMode === "add"
              ? "Add participants"
              : "Remove participants"}
          </ModalHeader>
          <ModalCloseButton isDisabled={groupManagementSaving} />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text color="gray.600" fontSize="sm">
                {groupManagementMode === "add"
                  ? "Select linked users to add to this group."
                  : "Select the participants you want to remove from this group."}
              </Text>
              {groupManagementError && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {groupManagementError}
                </Alert>
              )}
              {groupManagementLoading ? (
                <Flex justify="center" py={5}>
                  <Spinner color="blue.500" />
                </Flex>
              ) : groupManagementUsers.length ? (
                <VStack
                  align="stretch"
                  spacing={2}
                  maxH="300px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={3}
                >
                  {groupManagementUsers.map((user) => (
                    <Checkbox
                      key={user.id}
                      isChecked={groupManagementUserIds.includes(user.id)}
                      onChange={(event) =>
                        setGroupManagementUserIds((current) =>
                          event.target.checked
                            ? [...current, user.id]
                            : current.filter((id) => id !== user.id),
                        )
                      }
                      isDisabled={groupManagementSaving}
                    >
                      {user.name || user.email || "User"}{" "}
                      <Text as="span" color="gray.500" fontSize="xs">
                        · {roleLabel(user.role)}
                      </Text>
                    </Checkbox>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" fontSize="sm">
                  {groupManagementMode === "add"
                    ? "There are no additional linked users to add."
                    : "There are no removable participants in this group."}
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setGroupManagementOpen(false)}
              isDisabled={groupManagementSaving}
            >
              Cancel
            </Button>
            <Button
              colorScheme={groupManagementMode === "remove" ? "red" : "blue"}
              onClick={() => void saveGroupMembership()}
              isLoading={groupManagementSaving}
              isDisabled={
                groupManagementLoading || !groupManagementUserIds.length
              }
            >
              {groupManagementMode === "add" ? "Add selected" : "Remove selected"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={deleteGroupOpen}
        onClose={() => {
          if (!deleteGroupSaving) setDeleteGroupOpen(false);
        }}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete group chat?</ModalHeader>
          <ModalCloseButton isDisabled={deleteGroupSaving} />
          <ModalBody>
            {deleteGroupError && (
              <Alert status="error" borderRadius="md" mb={3}>
                <AlertIcon />
                {deleteGroupError}
              </Alert>
            )}
            <Text color="gray.600" fontSize="sm">
              This permanently deletes the group and its messages for all
              participants. This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setDeleteGroupOpen(false)}
              isDisabled={deleteGroupSaving}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => void deleteGroupConversation()}
              isLoading={deleteGroupSaving}
            >
              Delete group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Box
        className={`messages-inbox-layout${mobileThreadOpen ? " has-selection" : ""}`}
      >
        <Box className="messages-inbox-list">
          <Flex className="messages-inbox-list-heading">
            <Text>Chats</Text>
            <Badge colorScheme="blue">{filteredConversations.length}</Badge>
          </Flex>
          <InputGroup className="messages-inbox-search">
            <InputLeftElement pointerEvents="none">
              <FiSearch />
            </InputLeftElement>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              aria-label="Search conversations"
            />
          </InputGroup>
          <Text className="messages-inbox-section-title">My chats</Text>
          <VStack
            className="messages-inbox-conversation-list"
            align="stretch"
            spacing={0}
          >
            {loading && !conversations.length ? (
              <Flex justify="center" py={8}>
                <Spinner color="blue.500" />
              </Flex>
            ) : filteredConversations.length ? (
              filteredConversations.map((conversation) => {
                const contact = conversation.participant || {};
                const lastMessage = conversation.last_message || {};
                return (
                  <button
                    className={`messages-inbox-conversation${String(conversation.id) === String(selectedId) ? " is-selected" : ""}`}
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(String(conversation.id));
                      setMobileThreadOpen(true);
                    }}
                  >
                    <Avatar
                      name={contact.name || contact.email}
                      src={contact.avatar}
                      size="sm"
                    />
                    <span className="messages-inbox-conversation-info">
                      <span className="messages-inbox-conversation-name">
                        {contact.name || contact.email || "Contact"}
                        <small>{roleLabel(contact.role)}</small>
                      </span>
                      <span className="messages-inbox-conversation-preview">
                        {getPreview(lastMessage.content)}
                      </span>
                    </span>
                    <span className="messages-inbox-conversation-meta">
                      <time>{formatTime(conversation.last_message_at)}</time>
                      {Number(conversation.unread_count) > 0 && (
                        <Badge colorScheme="red" borderRadius="full">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <Text className="messages-inbox-empty">
                {search
                  ? "No conversations match your search."
                  : "No conversations yet."}
              </Text>
            )}
          </VStack>
        </Box>

        <Box className="messages-inbox-thread">
          {selectedConversation ? (
            <>
              <Flex className="messages-inbox-thread-header">
                <IconButton
                  className="messages-inbox-mobile-back"
                  icon={<FiArrowLeft />}
                  aria-label="Back to chats"
                  onClick={() => setMobileThreadOpen(false)}
                  variant="ghost"
                />
                <Avatar
                  name={participant.name || participant.email}
                  src={participant.avatar}
                  size="sm"
                />
                <Box minW={0}>
                  <Text fontWeight="700" noOfLines={1}>
                    {participant.name || participant.email || "Contact"}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {participant.role === "group" &&
                    selectedConversation.participants?.length
                      ? `${selectedConversation.participants.length} members`
                      : roleLabel(participant.role)}
                  </Text>
                </Box>
                {selectedConversation.is_group_conversation ? (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      className="messages-inbox-header-more"
                      icon={<FiMoreHorizontal />}
                      aria-label="Group chat options"
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem onClick={openEditGroupName}>
                        Edit group name
                      </MenuItem>
                      <MenuItem onClick={() => void openGroupManagement("add")}>
                        Add participants
                      </MenuItem>
                      <MenuItem
                        onClick={() => void openGroupManagement("remove")}
                      >
                        Remove participants
                      </MenuItem>
                      <MenuItem
                        color="red.600"
                        onClick={() => {
                          setDeleteGroupError("");
                          setDeleteGroupOpen(true);
                        }}
                      >
                        Delete group chat
                      </MenuItem>
                    </MenuList>
                  </Menu>
                ) : (
                  <FiMoreHorizontal className="messages-inbox-header-more" />
                )}
              </Flex>
              <VStack
                ref={messagesListRef}
                className="messages-inbox-messages"
                align="stretch"
                spacing={3}
              >
                {messageError && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {messageError}
                  </Alert>
                )}
                {messageLoading && !messages.length ? (
                  <Flex justify="center" py={10}>
                    <Spinner color="blue.500" />
                  </Flex>
                ) : messages.length ? (
                  groupAdjacentAttachmentMessages(messages).map(renderMessage)
                ) : (
                  <Text className="messages-inbox-empty">
                    No messages in this conversation yet.
                  </Text>
                )}
              </VStack>
              {selectedConversation.is_linked_conversation ? (
                <Box className="messages-inbox-readonly">
                  <FiInfo />
                  This is a linked user conversation. Platform admins can review
                  it but cannot reply.
                </Box>
              ) : (
                <Box
                  as="form"
                  className="messages-inbox-composer"
                  onSubmit={sendMessage}
                >
                  {selectedAttachments.length > 0 && (
                    <Flex className="messages-inbox-attachment-previews">
                      {selectedAttachments.map((attachment, index) => (
                        <Flex
                          className="messages-inbox-attachment-preview"
                          align="center"
                          key={`${attachment.name}-${attachment.lastModified}-${index}`}
                        >
                          {attachment.type.startsWith("image/") ? (
                            <img
                              className="messages-inbox-attachment-thumbnail"
                              src={attachmentPreviewUrls[index]}
                              alt={`Preview of ${attachment.name}`}
                            />
                          ) : attachment.type.startsWith("audio/") ? (
                            <audio
                              className="messages-inbox-attachment-audio"
                              controls
                              src={attachmentPreviewUrls[index]}
                            />
                          ) : (
                            <Box className="messages-inbox-attachment-file-icon">
                              <FiPaperclip />
                            </Box>
                          )}
                          <Box className="messages-inbox-attachment-info" minW={0}>
                            <Text noOfLines={1} fontWeight="600">
                              {attachment.name}
                            </Text>
                            <Text color="gray.500">
                              {(attachment.size / (1024 * 1024)).toFixed(2)} MB
                            </Text>
                          </Box>
                          <IconButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            icon={<FiX />}
                            aria-label={`Remove ${attachment.name}`}
                            onClick={() =>
                              setSelectedAttachments((current) =>
                                current.filter((_, itemIndex) => itemIndex !== index),
                              )
                            }
                            isDisabled={sending}
                          />
                        </Flex>
                      ))}
                    </Flex>
                  )}
                  <Flex className="messages-inbox-composer-row" align="center">
                    <HStack
                      className="messages-inbox-composer-tools"
                      spacing={1}
                    >
                      <IconButton
                        ref={emojiButtonRef}
                        type="button"
                        size="sm"
                        variant={emojiOpen ? "solid" : "ghost"}
                        colorScheme={emojiOpen ? "yellow" : "gray"}
                        icon={<FiSmile />}
                        aria-label="Choose emoji"
                        aria-expanded={emojiOpen}
                        onClick={() => setEmojiOpen((open) => !open)}
                        isDisabled={sending || recording}
                      />
                      <IconButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        icon={<FiPaperclip />}
                        aria-label="Attach image or PDF"
                        onClick={() => fileInputRef.current?.click()}
                        isDisabled={sending || recording}
                      />
                      <input
                        ref={fileInputRef}
                        className="messages-inbox-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/mp4,audio/m4a,audio/mpeg,audio/aac,audio/wav,audio/x-wav,audio/webm,audio/3gpp"
                        multiple
                        aria-label="Choose multiple images, PDFs, or audio files"
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []);
                          event.target.value = "";
                          stageAttachments(files);
                        }}
                      />
                      {recordingSupported && (
                        <IconButton
                          type="button"
                          size="sm"
                          variant={recording ? "solid" : "ghost"}
                          colorScheme={recording ? "red" : "gray"}
                          icon={recording ? <FiSquare /> : <FiMic />}
                          aria-label={
                            recording
                              ? "Stop and send voice note"
                              : "Record voice note"
                          }
                          onClick={
                            recording ? stopVoiceRecording : startVoiceRecording
                          }
                          isDisabled={sending}
                        />
                      )}
                    </HStack>
                    {recording ? (
                      <Box
                        className="messages-inbox-recording-status"
                        role="status"
                      >
                        <Flex align="center" justify="space-between">
                          <Text fontWeight="600">Recording voice note</Text>
                          <Text fontVariantNumeric="tabular-nums">
                            {String(Math.floor(recordingSeconds / 60)).padStart(
                              2,
                              "0",
                            )}
                            :{String(recordingSeconds % 60).padStart(2, "0")}
                          </Text>
                        </Flex>
                        <Progress
                          className="messages-inbox-recording-progress"
                          size="xs"
                          colorScheme="red"
                          isIndeterminate
                        />
                      </Box>
                    ) : (
                      <Textarea
                        className="messages-inbox-composer-input"
                        ref={textareaRef}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        placeholder="Type a message…"
                        rows={1}
                        resize="none"
                        aria-label="Message"
                      />
                    )}
                    <Button
                      className="messages-inbox-send-button"
                      type="submit"
                      leftIcon={<FiSend />}
                      size="sm"
                      colorScheme="blue"
                      isLoading={sending}
                      isDisabled={
                        (!draft.trim() && !selectedAttachments.length) || recording
                      }
                    >
                      Send
                    </Button>
                  </Flex>
                  <Text
                    className="messages-inbox-composer-hint"
                    color={recording ? "red.500" : "gray.500"}
                  >
                    {recording
                      ? "Select stop when your voice note is ready"
                      : selectedAttachments.length
                        ? `${selectedAttachments.length} attachment${selectedAttachments.length === 1 ? "" : "s"} ready · select Send to share`
                        : "Select multiple files to attach · Enter to send · Shift+Enter for a new line"}
                  </Text>
                  {emojiOpen &&
                    emojiPopupPosition &&
                    createPortal(
                      <div
                        className="messages-inbox-emoji-overlay"
                        onClick={() => setEmojiOpen(false)}
                      >
                    <Box
                      className="messages-inbox-emoji-picker"
                      style={{
                        position: "fixed",
                        left: emojiPopupPosition.left,
                        bottom: emojiPopupPosition.bottom,
                        width: emojiPopupPosition.width,
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Flex className="messages-inbox-emoji-header" align="center">
                        <Text fontSize="sm" fontWeight="700">Choose an emoji</Text>
                        <IconButton
                          type="button"
                          size="xs"
                          variant="ghost"
                          icon={<FiX />}
                          aria-label="Close emoji picker"
                          onClick={() => setEmojiOpen(false)}
                        />
                      </Flex>
                      <Input
                        className="messages-inbox-emoji-search"
                        size="sm"
                        value={emojiSearch}
                        onChange={(event) => setEmojiSearch(event.target.value)}
                        placeholder="Search emojis"
                        aria-label="Search emojis"
                      />
                      {!emojiSearch.trim() && (
                        <HStack
                          className="messages-inbox-emoji-categories"
                          spacing={1}
                        >
                          {EMOJI_CATEGORIES.map((category, index) => (
                            <Button
                              key={category.name}
                              type="button"
                              size="xs"
                              variant={emojiCategory === index ? "solid" : "ghost"}
                              colorScheme={emojiCategory === index ? "purple" : "gray"}
                              onClick={() => setEmojiCategory(index)}
                              aria-label={`${category.name} emoji`}
                              aria-pressed={emojiCategory === index}
                            >
                              <span className="messages-inbox-emoji-category-icon">
                                {category.icon}
                              </span>
                              <span>{category.name}</span>
                            </Button>
                          ))}
                        </HStack>
                      )}
                      <Text className="messages-inbox-emoji-category-title">
                        {emojiSearch.trim()
                          ? "Search results"
                          : activeEmojiCategory.name}
                      </Text>
                      <Box className="messages-inbox-emoji-grid">
                        {visibleEmojis.length ? (
                          visibleEmojis.map((emoji, index) => (
                            <Button
                              key={`${emoji}-${index}`}
                              type="button"
                              variant="ghost"
                              aria-label={`Insert ${emoji}`}
                              onClick={() => {
                                const textarea = textareaRef.current;
                                const start =
                                  textarea?.selectionStart ?? draft.length;
                                const end = textarea?.selectionEnd ?? draft.length;
                                const nextDraft =
                                  draft.slice(0, start) + emoji + draft.slice(end);
                                setDraft(nextDraft);
                                requestAnimationFrame(() => {
                                  textarea?.focus();
                                  textarea?.setSelectionRange(
                                    start + emoji.length,
                                    start + emoji.length,
                                  );
                                });
                              }}
                            >
                              {emoji}
                            </Button>
                          ))
                        ) : (
                          <Text className="messages-inbox-emoji-no-results">
                            No matching emojis
                          </Text>
                        )}
                      </Box>
                    </Box>
                      </div>,
                      document.body,
                    )}
                </Box>
              )}
            </>
          ) : (
            <Flex className="messages-inbox-no-selection">
              <FiMessageCircle />
              <Text>Select a conversation to view messages.</Text>
            </Flex>
          )}
        </Box>

        <Box className="messages-inbox-details">
          <Flex className="messages-inbox-details-heading">
            <Text>Details</Text>
            <FiMoreHorizontal />
          </Flex>
          {selectedConversation ? (
            <VStack align="stretch" spacing={3}>
              <Box className="messages-inbox-detail-card">
                <Text className="messages-inbox-detail-title">
                  General info
                </Text>
                <HStack align="flex-start" spacing={3}>
                  <Avatar
                    name={participant.name || participant.email}
                    size="sm"
                  />
                  <Box minW={0}>
                    <Text fontWeight="700" fontSize="sm" noOfLines={2}>
                      {participant.name || "Unnamed user"}
                    </Text>
                    <Text fontSize="xs" color="gray.600" wordBreak="break-word">
                      {participant.email || "No email provided"}
                    </Text>
                  </Box>
                </HStack>
                <Text className="messages-inbox-detail-line">
                  {roleLabel(participant.role)}
                </Text>
                {participant.phone && (
                  <Text className="messages-inbox-detail-line">
                    {participant.phone}
                  </Text>
                )}
                <Text className="messages-inbox-detail-line">
                  {selectedConversation.is_linked_conversation
                    ? "Linked conversation · read only"
                    : selectedConversation.is_group_conversation
                      ? "Group chat"
                      : selectedConversation.conversation_type === "admin_driver"
                      ? "Direct driver support chat"
                      : "Direct support chat"}
                </Text>
                <Text className="messages-inbox-detail-line">
                  Last message{" "}
                  {formatTime(selectedConversation.last_message_at, true) ||
                    "not available"}
                </Text>
                {selectedConversation.is_group_conversation ? (
                  <Box mt={4}>
                    <Flex
                      align="center"
                      justify="space-between"
                      gap={2}
                      mb={2}
                    >
                      <Text className="messages-inbox-detail-title" mb={0}>
                        Participants
                      </Text>
                      {detailsRemoveMode ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          colorScheme="gray"
                          onClick={() => {
                            setDetailsRemoveMode(false);
                            setDetailsRemoveUserIds([]);
                            setDetailsRemoveError("");
                          }}
                          isDisabled={detailsRemoveSaving}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="xs"
                          variant="link"
                          colorScheme="red"
                          onClick={() => {
                            setDetailsRemoveMode(true);
                            setDetailsRemoveUserIds([]);
                            setDetailsRemoveError("");
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </Flex>
                    {detailsRemoveError ? (
                      <Alert status="error" borderRadius="md" mb={2}>
                        <AlertIcon />
                        <Text fontSize="xs">{detailsRemoveError}</Text>
                      </Alert>
                    ) : null}
                    <VStack align="stretch" spacing={2}>
                      {(selectedConversation.participants || []).map((member) => {
                        const canRemove =
                          member.role !== "admin" &&
                          String(member.id) !== String(currentUserId);
                        return (
                          <HStack key={member.id} spacing={2}>
                            {detailsRemoveMode && canRemove ? (
                              <Checkbox
                                size="sm"
                                isChecked={detailsRemoveUserIds.includes(
                                  String(member.id),
                                )}
                                onChange={(event) =>
                                  setDetailsRemoveUserIds((current) =>
                                    event.target.checked
                                      ? [...current, String(member.id)]
                                      : current.filter(
                                          (id) => id !== String(member.id),
                                        ),
                                  )
                                }
                                isDisabled={detailsRemoveSaving}
                                aria-label={`Select ${member.name || member.email || "participant"} for removal`}
                              />
                            ) : null}
                            <Avatar
                              name={member.name || member.email}
                              src={member.avatar}
                              size="xs"
                            />
                            <Box minW={0}>
                              <Text fontSize="sm" noOfLines={1}>
                                {member.name || member.email || "Participant"}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {roleLabel(member.role)}
                              </Text>
                            </Box>
                          </HStack>
                        );
                      })}
                    </VStack>
                    {detailsRemoveMode ? (
                      <Button
                        mt={3}
                        size="sm"
                        colorScheme="red"
                        onClick={() => void removeDetailsParticipants()}
                        isLoading={detailsRemoveSaving}
                        isDisabled={!detailsRemoveUserIds.length}
                      >
                        Remove selected
                      </Button>
                    ) : null}
                  </Box>
                ) : null}
              </Box>
              <Box className="messages-inbox-detail-card">
                <Text className="messages-inbox-detail-title">
                  Conversation
                </Text>
                <Text className="messages-inbox-detail-line">
                  {messages.length}{" "}
                  {messages.length === 1 ? "message" : "messages"} loaded
                </Text>
                <Text className="messages-inbox-detail-line">
                  {Number(selectedConversation.unread_count) || 0} unread
                </Text>
              </Box>
            </VStack>
          ) : (
            <Text className="messages-inbox-empty">
              Contact details appear here when a conversation is selected.
            </Text>
          )}
        </Box>
      </Box>
      <Modal
        isOpen={Boolean(imagePreview)}
        onClose={() => setImagePreview(null)}
        size="6xl"
        isCentered
        motionPreset="fade"
      >
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent className="inbox-image-preview-modal">
          <ModalCloseButton
            color="white"
            zIndex={2}
            aria-label="Close image preview"
          />
          <ModalBody className="inbox-image-preview-modal-body">
            {imagePreview && (
              <>
                {imagePreview.images[imagePreview.index].mediaType === "pdf" ? (
                  pdfPreviewUrl ? (
                    <iframe
                      className="inbox-pdf-preview-modal"
                      src={pdfPreviewUrl}
                      title={
                        imagePreview.images[imagePreview.index].name ||
                        "PDF preview"
                      }
                    />
                  ) : (
                    <Text className="inbox-preview-status">
                      {previewError || "Loading PDF preview..."}
                    </Text>
                  )
                ) : (
                  <img
                    className="inbox-image-preview-modal-image"
                    src={imagePreview.images[imagePreview.index].url}
                    alt={
                      imagePreview.images[imagePreview.index].name || "Image"
                    }
                    referrerPolicy="no-referrer"
                  />
                )}
                <IconButton
                  className="inbox-preview-download"
                  icon={<FiDownload />}
                  aria-label="Download attachment"
                  title="Download attachment"
                  isLoading={downloadingPreview}
                  onClick={downloadPreviewAttachment}
                />
                {previewError && pdfPreviewUrl ? (
                  <Text className="inbox-preview-error">{previewError}</Text>
                ) : null}
                {imagePreview.images.length > 1 && (
                  <>
                    <IconButton
                      className="inbox-image-preview-nav is-previous"
                      icon={<FiChevronLeft />}
                      aria-label="Previous image"
                      onClick={() =>
                        setImagePreview((current) => ({
                          ...current,
                          index:
                            (current.index - 1 + current.images.length) %
                            current.images.length,
                        }))
                      }
                    />
                    <IconButton
                      className="inbox-image-preview-nav is-next"
                      icon={<FiChevronRight />}
                      aria-label="Next image"
                      onClick={() =>
                        setImagePreview((current) => ({
                          ...current,
                          index: (current.index + 1) % current.images.length,
                        }))
                      }
                    />
                    <Text className="inbox-image-preview-counter">
                      {imagePreview.index + 1} / {imagePreview.images.length}
                    </Text>
                  </>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MessagesInbox;
