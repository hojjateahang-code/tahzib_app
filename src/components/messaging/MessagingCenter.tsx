import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Message, User, Role, CustomGroup, MessageAttachment } from '../../types';
import { 
  Send, Mail, MessageSquare, User as UserIcon, Check, CheckCheck, Clock, 
  FileText, Search, PlusCircle, Paperclip, Image as ImageIcon, Film, Music, 
  File, Users, FolderPlus, Trash2, X, AlertCircle, ArrowRight, Megaphone, Eye 
} from 'lucide-react';
import { triggerSync } from '../../sync';
import { FilePreviewModal } from '../common/FilePreviewModal';

const ROLE_LABELS: Record<Role, string> = {
  DIRECTOR: 'مدیر مدرسه',
  VICE_PRINCIPAL: 'معاون تهذیب',
  MENTOR: 'استاد راهنما',
  COUNSELOR: 'مشاور',
  STUDENT: 'طلبه',
  TECH_ADMIN: 'مسئول فنی',
};

function getUserDisplayName(user?: User | null): string {
  if (!user) return 'کاربر سیستم';
  if (user.name && user.name.trim()) return user.name.trim();
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (fullName) return fullName;
  if (user.username && user.username.trim()) return user.username.trim();
  return 'کاربر';
}

export function MessagingCenter() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'OFFICIAL' | 'CHAT'>('OFFICIAL');
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Official Form States
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [recipientType, setRecipientType] = useState<'SINGLE' | 'BASE' | 'GROUP'>('SINGLE');
  const [officialRecipientId, setOfficialRecipientId] = useState<string>('');
  const [selectedBase, setSelectedBase] = useState<number>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [officialSubject, setOfficialSubject] = useState('');
  const [officialContent, setOfficialContent] = useState('');
  const [ccUserIds, setCcUserIds] = useState<string[]>([]);
  const [officialAttachments, setOfficialAttachments] = useState<MessageAttachment[]>([]);

  // Custom Group Modal States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);

  // Bulk Chat Modal States (For Officials)
  const [showBulkChatModal, setShowBulkChatModal] = useState(false);
  const [bulkChatTargetType, setBulkChatTargetType] = useState<'BASE' | 'GROUP' | 'ALL_STUDENTS' | 'ALL_OFFICIALS' | 'MANUAL'>('BASE');
  const [bulkChatBase, setBulkChatBase] = useState<number>(1);
  const [bulkChatGroupId, setBulkChatGroupId] = useState<string>('');
  const [bulkChatManualUserIds, setBulkChatManualUserIds] = useState<string[]>([]);
  const [bulkChatContent, setBulkChatContent] = useState('');
  const [bulkChatAttachments, setBulkChatAttachments] = useState<MessageAttachment[]>([]);

  // Direct Chat States
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachments, setChatAttachments] = useState<MessageAttachment[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);

  // Fetch raw users for full lookup (including historical deleted users)
  const rawAllUsers = useLiveQuery(() => db.users.toArray());
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    rawAllUsers?.forEach(u => map.set(u.id, u));
    return map;
  }, [rawAllUsers]);

  // Fetch all active non-deleted users for messaging contacts and selections (matching User Management list)
  const allUsers = useMemo(() => {
    if (!rawAllUsers) return [];
    return rawAllUsers.filter(u => !u.isDeleted);
  }, [rawAllUsers]);

  // Auto-deselect chat contact if user gets deleted
  useEffect(() => {
    if (selectedChatUserId && allUsers) {
      const exists = allUsers.some(u => u.id === selectedChatUserId);
      if (!exists) {
        setSelectedChatUserId(null);
      }
    }
  }, [selectedChatUserId, allUsers]);

  // Fetch custom groups owned by current user or available
  const customGroups = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      return db.customGroups.where('ownerId').equals(currentUser.id).toArray();
    },
    [currentUser?.id]
  );

  // Fetch messages involving current user
  const myMessages = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const msgs = await db.messages.toArray();
      return msgs.filter(m => 
        m.senderId === currentUser.id || 
        m.recipientId === currentUser.id || 
        (m.ccUserIds && m.ccUserIds.includes(currentUser.id))
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    [currentUser?.id]
  );

  // Auto-scroll to bottom of chat when activeChatMessages change or selected chat changes
  const activeChatMessages = useMemo(() => {
    if (!myMessages || !selectedChatUserId || !currentUser) return [];
    return myMessages.filter(m => 
      m.type === 'CHAT' && (
        (m.senderId === currentUser.id && m.recipientId === selectedChatUserId) ||
        (m.senderId === selectedChatUserId && m.recipientId === currentUser.id)
      )
    );
  }, [myMessages, selectedChatUserId, currentUser]);

  useEffect(() => {
    if (activeTab === 'CHAT' && selectedChatUserId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatMessages, selectedChatUserId, activeTab]);

  // Mark unread messages as read when selecting chat contact
  useEffect(() => {
    if (!currentUser || !myMessages || !selectedChatUserId || activeTab !== 'CHAT') return;
    const unreadFromContact = myMessages.filter(m => 
      m.type === 'CHAT' && 
      m.senderId === selectedChatUserId && 
      m.recipientId === currentUser.id && 
      !m.isRead
    );

    if (unreadFromContact.length > 0) {
      unreadFromContact.forEach(m => {
        db.messages.update(m.id, { isRead: true });
      });
      triggerSync();
    }
  }, [selectedChatUserId, activeTab, myMessages, currentUser]);

  // Mark unread official messages as read when viewing OFFICIAL tab
  useEffect(() => {
    if (!currentUser || !myMessages || activeTab !== 'OFFICIAL') return;
    const unreadOfficial = myMessages.filter(m => 
      m.type === 'OFFICIAL' && 
      (m.recipientId === currentUser.id || (m.ccUserIds && m.ccUserIds.includes(currentUser.id))) && 
      !m.isRead
    );

    if (unreadOfficial.length > 0) {
      unreadOfficial.forEach(m => {
        db.messages.update(m.id, { isRead: true });
      });
      triggerSync();
    }
  }, [activeTab, myMessages, currentUser]);

  const markAllMessagesAsRead = async () => {
    if (!currentUser || !myMessages) return;
    const unread = myMessages.filter(m => 
      (m.recipientId === currentUser.id || (m.ccUserIds && m.ccUserIds.includes(currentUser.id))) && 
      !m.isRead
    );
    if (unread.length > 0) {
      for (const m of unread) {
        await db.messages.update(m.id, { isRead: true });
      }
      triggerSync();
    }
  };

  // Unread message counts for badges
  const officialUnreadCount = useMemo(() => {
    if (!myMessages || !currentUser) return 0;
    return myMessages.filter(m => 
      m.type === 'OFFICIAL' && 
      (m.recipientId === currentUser.id || (m.ccUserIds && m.ccUserIds.includes(currentUser.id))) && 
      !m.isRead
    ).length;
  }, [myMessages, currentUser]);

  const chatUnreadCount = useMemo(() => {
    if (!myMessages || !currentUser) return 0;
    return myMessages.filter(m => 
      m.type === 'CHAT' && 
      m.recipientId === currentUser.id && 
      !m.isRead
    ).length;
  }, [myMessages, currentUser]);

  // Officials list for CC or student recipients
  const officials = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.role !== 'STUDENT' && u.id !== currentUser?.id);
  }, [allUsers, currentUser]);

  // Available recipients for official messages depending on role
  const officialRecipientOptions = useMemo(() => {
    if (!allUsers || !currentUser) return [];
    if (currentUser.role === 'STUDENT') {
      return allUsers.filter(u => u.role !== 'STUDENT');
    }
    return allUsers.filter(u => u.id !== currentUser.id);
  }, [allUsers, currentUser]);

  // Filtered official messages (Newest first)
  const officialMessages = useMemo(() => {
    if (!myMessages) return [];
    return myMessages.filter(m => m.type === 'OFFICIAL').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [myMessages]);

  // Chat contacts list with individual unread badges
  const chatContacts = useMemo(() => {
    if (!allUsers || !currentUser) return [];
    const query = userSearchQuery.toLowerCase().trim();
    
    return allUsers
      .filter(u => u.id !== currentUser.id && !u.isDeleted)
      .filter(u => {
        if (!query) return true;
        const displayName = getUserDisplayName(u).toLowerCase();
        const username = (u.username || '').toLowerCase();
        const firstName = (u.firstName || '').toLowerCase();
        const lastName = (u.lastName || '').toLowerCase();
        const nationalId = (u.nationalId || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const roleLabel = (ROLE_LABELS[u.role] || '').toLowerCase();

        return (
          displayName.includes(query) ||
          username.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query) ||
          nationalId.includes(query) ||
          phone.includes(query) ||
          roleLabel.includes(query)
        );
      })
      .map(contact => {
        const unreadCount = myMessages?.filter(m => 
          m.type === 'CHAT' && 
          m.senderId === contact.id && 
          m.recipientId === currentUser.id && 
          !m.isRead
        ).length || 0;

        const lastMsg = myMessages?.filter(m => 
          m.type === 'CHAT' && (
            (m.senderId === currentUser.id && m.recipientId === contact.id) ||
            (m.senderId === contact.id && m.recipientId === currentUser.id)
          )
        ).slice(-1)[0];

        return { contact, unreadCount, lastMsg };
      })
      .sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        const dateA = a.lastMsg ? new Date(a.lastMsg.date).getTime() : 0;
        const dateB = b.lastMsg ? new Date(b.lastMsg.date).getTime() : 0;
        return dateB - dateA;
      });
  }, [allUsers, currentUser, userSearchQuery, myMessages]);

  // Handle File Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'OFFICIAL' | 'CHAT' | 'BULK_CHAT') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        let attachmentType: MessageAttachment['type'] = 'FILE';

        if (file.type.startsWith('image/')) attachmentType = 'IMAGE';
        else if (file.type.startsWith('video/')) attachmentType = 'VIDEO';
        else if (file.type.startsWith('audio/')) attachmentType = 'AUDIO';

        const newAttachment: MessageAttachment = {
          id: crypto.randomUUID(),
          name: file.name,
          url: result,
          type: attachmentType,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };

        if (mode === 'OFFICIAL') {
          setOfficialAttachments(prev => [...prev, newAttachment]);
        } else if (mode === 'CHAT') {
          setChatAttachments(prev => [...prev, newAttachment]);
        } else if (mode === 'BULK_CHAT') {
          setBulkChatAttachments(prev => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  // Create Custom Group
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !groupName.trim() || groupMemberIds.length === 0) return;

    const newGroup: CustomGroup = {
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      name: groupName.trim(),
      memberIds: groupMemberIds
    };

    await db.customGroups.add(newGroup);
    setGroupName('');
    setGroupMemberIds([]);
    setShowGroupModal(false);
    alert(`گروه «${newGroup.name}» با موفقیت ایجاد شد.`);
  };

  // Delete Custom Group
  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('آیا از حذف این گروه اطمینان دارید؟')) {
      await db.customGroups.delete(groupId);
    }
  };

  // Send Official Message
  const handleSendOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !officialSubject.trim() || !officialContent.trim()) return;

    let targetUserIds: string[] = [];

    if (recipientType === 'SINGLE') {
      if (!officialRecipientId) {
        alert('لطفاً گیرنده اصلی را انتخاب کنید.');
        return;
      }
      targetUserIds = [officialRecipientId];
    } else if (recipientType === 'BASE') {
      const baseStudents = allUsers?.filter(u => u.role === 'STUDENT' && Number(u.base) === Number(selectedBase)) || [];
      targetUserIds = baseStudents.map(u => u.id);
      if (targetUserIds.length === 0) {
        alert(`هیچ طلبی‌ای در پایه ${selectedBase} یافت نشد.`);
        return;
      }
    } else if (recipientType === 'GROUP') {
      const targetGroup = customGroups?.find(g => g.id === selectedGroupId);
      if (!targetGroup || targetGroup.memberIds.length === 0) {
        alert('گروه انتخابی عضوی ندارد.');
        return;
      }
      targetUserIds = targetGroup.memberIds.filter(id => allUsers.some(u => u.id === id));
      if (targetUserIds.length === 0) {
        alert('هیچ عضو فعالی در این گروه یافت نشد.');
        return;
      }
    }

    for (const recipientId of targetUserIds) {
      const newMsg: Message = {
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        recipientId,
        ccUserIds: ccUserIds,
        type: 'OFFICIAL',
        subject: officialSubject.trim(),
        content: officialContent.trim(),
        attachments: officialAttachments.length > 0 ? officialAttachments : undefined,
        date: new Date().toISOString(),
        isRead: false
      };
      await db.messages.add(newMsg);
    }

    setShowComposeModal(false);
    setOfficialRecipientId('');
    setOfficialSubject('');
    setOfficialContent('');
    setCcUserIds([]);
    setOfficialAttachments([]);
    alert(`نامه رسمی با موفقیت به ${targetUserIds.length} نفر ارسال شد.`);
    triggerSync();
  };

  // Send Direct Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedChatUserId || (!chatInput.trim() && chatAttachments.length === 0)) return;

    const newMsg: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      recipientId: selectedChatUserId,
      type: 'CHAT',
      content: chatInput.trim(),
      attachments: chatAttachments.length > 0 ? chatAttachments : undefined,
      date: new Date().toISOString(),
      isRead: false
    };

    await db.messages.add(newMsg);
    setChatInput('');
    setChatAttachments([]);
    triggerSync();
  };

  // Send Bulk Chat Messages (For Officials)
  const handleSendBulkChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'STUDENT' || (!bulkChatContent.trim() && bulkChatAttachments.length === 0)) return;

    let targetUserIds: string[] = [];

    if (bulkChatTargetType === 'BASE') {
      const baseStudents = allUsers?.filter(u => u.role === 'STUDENT' && Number(u.base) === Number(bulkChatBase)) || [];
      targetUserIds = baseStudents.map(u => u.id);
    } else if (bulkChatTargetType === 'GROUP') {
      const targetGroup = customGroups?.find(g => g.id === bulkChatGroupId);
      targetUserIds = (targetGroup?.memberIds || []).filter(id => allUsers.some(u => u.id === id));
    } else if (bulkChatTargetType === 'ALL_STUDENTS') {
      const students = allUsers?.filter(u => u.role === 'STUDENT') || [];
      targetUserIds = students.map(u => u.id);
    } else if (bulkChatTargetType === 'ALL_OFFICIALS') {
      const officialUsers = allUsers?.filter(u => u.role !== 'STUDENT' && u.id !== currentUser.id) || [];
      targetUserIds = officialUsers.map(u => u.id);
    } else if (bulkChatTargetType === 'MANUAL') {
      targetUserIds = bulkChatManualUserIds.filter(id => allUsers.some(u => u.id === id));
    }

    if (targetUserIds.length === 0) {
      alert('هیچ دریافت‌کننده‌ای برای این ارسال انبوه یافت نشد.');
      return;
    }

    for (const recipientId of targetUserIds) {
      const newMsg: Message = {
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        recipientId,
        type: 'CHAT',
        content: bulkChatContent.trim(),
        attachments: bulkChatAttachments.length > 0 ? bulkChatAttachments : undefined,
        date: new Date().toISOString(),
        isRead: false
      };
      await db.messages.add(newMsg);
    }

    setShowBulkChatModal(false);
    setBulkChatContent('');
    setBulkChatAttachments([]);
    setBulkChatManualUserIds([]);
    alert(`پیام گفتگوی انبوه با موفقیت به ${targetUserIds.length} مخاطب ارسال شد.`);
    triggerSync();
  };

  const toggleCcUser = (userId: string) => {
    setCcUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleGroupMember = (userId: string) => {
    setGroupMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleBulkManualUser = (userId: string) => {
    setBulkChatManualUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const activeContact = useMemo(() => {
    if (!selectedChatUserId || !allUsers) return null;
    return allUsers.find(u => u.id === selectedChatUserId) || null;
  }, [selectedChatUserId, allUsers]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* File Preview Modal */}
      <FilePreviewModal 
        attachment={previewAttachment} 
        onClose={() => setPreviewAttachment(null)} 
      />

      {/* Header Tabs & Actions - Sticky Sub Bar */}
      <div className="sticky top-12 sm:top-14 z-10 bg-[#F1F5F9] dark:bg-slate-950 pt-1 pb-2">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('OFFICIAL')}
            className={`relative flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'OFFICIAL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>مکاتبات رسمی (نامه‌ها)</span>
            {officialUnreadCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'OFFICIAL' ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
              }`}>
                {officialUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CHAT')}
            className={`relative flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'CHAT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>گفتگوی مستقیم</span>
            {chatUnreadCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'CHAT' ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
              }`}>
                {chatUnreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {(officialUnreadCount > 0 || chatUnreadCount > 0) && (
            <button
              onClick={markAllMessagesAsRead}
              className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
              title="علامت‌گذاری تمام پیام‌ها به عنوان رویت‌شده"
            >
              <CheckCheck className="w-4 h-4" />
              <span>خوانده‌شدن همه</span>
            </button>
          )}

          {/* Official Only Actions */}
          {currentUser?.role !== 'STUDENT' && (
            <>
              {activeTab === 'CHAT' && (
                <button
                  onClick={() => setShowBulkChatModal(true)}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                  title="ارسال پیام انبوه همزمان به چند مخاطب یا پایه تحصیلی"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>ارسال پیام انبوه در گفتگو</span>
                </button>
              )}

              <button
                onClick={() => setShowGroupModal(true)}
                className="flex items-center justify-center gap-1.5 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors shadow-sm"
                title="ایجاد و مدیریت گروه‌های اختصاصی"
              >
                <Users className="w-4 h-4" />
                <span>ساخت گروه اختصاصی</span>
              </button>
            </>
          )}

          {activeTab === 'OFFICIAL' && (
            <button
              onClick={() => setShowComposeModal(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {currentUser?.role === 'STUDENT' ? 'ارسال درخواست به مسئولین' : 'ایجاد مکاتبه / ارسال پیام'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Official Letters View */}
      {activeTab === 'OFFICIAL' && (
        <div className="space-y-4">
          {officialMessages.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center flex flex-col items-center">
              <Mail className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">هیچ مکاتبه رسمی یافت نشد</h3>
              <p className="text-sm text-slate-500 max-w-md">
                {currentUser?.role === 'STUDENT'
                  ? 'شما می‌توانید درخواست‌ها، نامه‌ها یا نامه‌های اداری خود را برای مسئولین مدرسه ارسال نمایید.'
                  : 'شما می‌توانید برای طرح موضوعات رسمی، ابلاغیه‌ها یا ارسال پیام‌های گروهی با طلاب و مسئولین مکاتبه کنید.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {officialMessages.map(msg => {
                const sender = userMap.get(msg.senderId);
                const recipient = userMap.get(msg.recipientId);
                const isSentByMe = msg.senderId === currentUser?.id;
                const isCc = msg.ccUserIds?.includes(currentUser?.id || '');

                return (
                  <div 
                    key={msg.id}
                    className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${
                      isCc ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-3">
                        {sender?.profileImage ? (
                          <img 
                            src={sender.profileImage} 
                            alt={sender.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0">
                            {getUserDisplayName(sender).charAt(0)}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-800">{msg.subject || 'بدون موضوع'}</h3>
                            {isSentByMe ? (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                                ارسالی شما
                              </span>
                            ) : isCc ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                                رونوشت به شما
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                                گیرنده اصلی
                              </span>
                            )}
                            {sender?.isDeleted && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                                کاربر حذف شده
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>
                              <strong>فرستنده:</strong> {sender ? `${getUserDisplayName(sender)} (${ROLE_LABELS[sender.role] || sender.role})` : 'کاربر سیستم'}
                              {sender?.isDeleted ? ' (حذف شده)' : ''}
                            </span>
                            <span>•</span>
                            <span>
                              <strong>گیرنده:</strong> {recipient ? `${getUserDisplayName(recipient)} (${ROLE_LABELS[recipient.role] || recipient.role})` : 'کاربر سیستم'}
                              {recipient?.isDeleted ? ' (حذف شده)' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium self-end sm:self-center">
                        {new Date(msg.date).toLocaleDateString('fa-IR')} - {new Date(msg.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                      {msg.content}
                    </p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-4 bg-slate-100/70 p-3 rounded-xl space-y-2 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-1">فایل‌های پیوست (کلیک برای باز کردن / پخش):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.attachments.map(att => (
                            <div key={att.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                              <button
                                onClick={() => setPreviewAttachment(att)}
                                className="flex items-center gap-2 min-w-0 text-right hover:text-indigo-600 transition-colors"
                              >
                                {att.type === 'IMAGE' && <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />}
                                {att.type === 'VIDEO' && <Film className="w-4 h-4 text-purple-600 shrink-0" />}
                                {att.type === 'AUDIO' && <Music className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {att.type === 'FILE' && <File className="w-4 h-4 text-slate-600 shrink-0" />}
                                <span className="text-xs font-medium text-slate-800 truncate">{att.name}</span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => setPreviewAttachment(att)}
                                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded"
                                  title="مشاهده / پخش آنلاین"
                                >
                                  <Eye className="w-3 h-3" />
                                  مشاهده
                                </button>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded"
                                  title="دانلود مستقیم"
                                >
                                  دانلود
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.ccUserIds && msg.ccUserIds.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                        <span className="font-bold text-amber-900">رونوشت به:</span>
                        {msg.ccUserIds.map(id => {
                          const ccUser = userMap.get(id);
                          if (!ccUser) return null;
                          return (
                            <span key={id} className="bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800 text-[11px] font-medium">
                              {ccUser.name} ({ROLE_LABELS[ccUser.role]}) {ccUser.isDeleted ? '(حذف شده)' : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Direct Chat View with Responsive Page Separation */}
      {activeTab === 'CHAT' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[580px] grid grid-cols-1 md:grid-cols-12">
          {/* Contacts Sidebar: On mobile, visible ONLY when selectedChatUserId === null */}
          <div className={`md:col-span-4 border-l border-slate-200 bg-slate-50 flex flex-col h-full ${
            selectedChatUserId !== null ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="p-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  لیست مخاطبین گفتگو
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  ({chatContacts.length} نفر)
                </span>
              </h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام مخاطب..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[520px]">
              {chatContacts.map(({ contact, unreadCount, lastMsg }) => {
                const isSelected = selectedChatUserId === contact.id;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedChatUserId(contact.id)}
                    className={`w-full text-right p-3 rounded-2xl transition-all border flex items-center gap-3 relative ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {contact.profileImage ? (
                      <img
                        src={contact.profileImage}
                        alt={getUserDisplayName(contact)}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-xs ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {getUserDisplayName(contact).charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-xs truncate">{getUserDisplayName(contact)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {ROLE_LABELS[contact.role] || contact.role}
                        </span>
                      </div>
                      
                      {lastMsg && (
                        <p className={`text-[11px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {lastMsg.content || 'فایل پیوست'}
                        </p>
                      )}
                    </div>

                    {unreadCount > 0 && !isSelected && (
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white shadow-xs shrink-0 animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat Conversation Area: On mobile, visible ONLY when selectedChatUserId !== null */}
          <div className={`md:col-span-8 flex flex-col h-[580px] bg-slate-50/50 ${
            selectedChatUserId === null ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedChatUserId ? (
              <>
                {/* Dedicated Chat Header with BACK BUTTON */}
                <div className="p-3.5 bg-white border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {/* BACK BUTTON for mobile & clear selection */}
                    <button
                      onClick={() => setSelectedChatUserId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      title="بازگشت به لیست مخاطبین"
                    >
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                      <span className="inline">بازگشت</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-2.5">
                      {activeContact?.profileImage ? (
                        <img
                          src={activeContact.profileImage}
                          alt="Profile"
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xs">
                          {getUserDisplayName(activeContact).charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                          {getUserDisplayName(activeContact)}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500">
                          {ROLE_LABELS[activeContact?.role || 'STUDENT']}
                          {activeContact?.base ? ` - پایه ${activeContact.base}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages List with Auto-Scroll */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {activeChatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      هنوز پیامی رد و بدل نشده است. گفتگو را شروع کنید.
                    </div>
                  ) : (
                    activeChatMessages.map(m => {
                      const isMe = m.senderId === currentUser?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                          >
                            {m.content}

                            {m.attachments && m.attachments.length > 0 && (
                              <div className="mt-2 space-y-2 border-t border-white/20 pt-2">
                                {m.attachments.map(att => (
                                  <div key={att.id} className="rounded-lg overflow-hidden bg-black/10 p-2 cursor-pointer hover:bg-black/20 transition-all" onClick={() => setPreviewAttachment(att)}>
                                    {att.type === 'IMAGE' && (
                                      <div className="relative group">
                                        <img src={att.url} alt={att.name} className="max-h-48 rounded-lg object-contain w-full" />
                                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 opacity-90">
                                          <Eye className="w-3 h-3" /> بزرگ‌نمایی
                                        </span>
                                      </div>
                                    )}
                                    {att.type === 'VIDEO' && (
                                      <div className="relative group">
                                        <video src={att.url} controls className="max-h-48 rounded-lg w-full" />
                                        <button onClick={(e) => { e.stopPropagation(); setPreviewAttachment(att); }} className="mt-1 text-[10px] font-bold text-white/90 underline flex items-center gap-1">
                                          <Eye className="w-3 h-3" /> پخش کامل در پنجره بزرگ
                                        </button>
                                      </div>
                                    )}
                                    {att.type === 'AUDIO' && (
                                      <div>
                                        <audio src={att.url} controls className="w-full h-8 mb-1" />
                                        <button onClick={(e) => { e.stopPropagation(); setPreviewAttachment(att); }} className="text-[10px] font-bold text-white/90 underline flex items-center gap-1">
                                          <Eye className="w-3 h-3" /> پخش کننده چندرسانه‌ای
                                        </button>
                                      </div>
                                    )}
                                    {att.type === 'FILE' && (
                                      <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="flex items-center gap-2 underline">
                                          <File className="w-4 h-4" />
                                          {att.name} ({att.size})
                                        </span>
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">باز کردن / دانلود</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div
                              className={`text-[9px] mt-1 text-left ${
                                isMe ? 'text-emerald-100' : 'text-slate-400'
                              }`}
                            >
                              {new Date(m.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input & Attachment Toolbar */}
                <div className="bg-white border-t border-slate-200 p-3 space-y-2">
                  {chatAttachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {chatAttachments.map(att => (
                        <div key={att.id} className="relative bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 border border-slate-200">
                          <span className="truncate max-w-[120px] font-medium">{att.name}</span>
                          <button
                            onClick={() => setChatAttachments(prev => prev.filter(a => a.id !== att.id))}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendChat} className="flex gap-2 items-center">
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={e => handleFileUpload(e, 'CHAT')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                      title="ارسال فایل، عکس، فیلم یا صوت"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder="پیام خود را بنویسید..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-500"
                    />

                    <button
                      type="submit"
                      disabled={!chatInput.trim() && chatAttachments.length === 0}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <Send className="w-4 h-4" />
                      ارسال
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-bold text-slate-600 text-sm">برای شروع گفتگو یک مخاطب را از سمت راست انتخاب کنید.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK CHAT MODAL (For Officials) */}
      {showBulkChatModal && currentUser?.role !== 'STUDENT' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-600" />
                ارسال پیام گفتگوی همزمان و انبوه (ویژه مسئولین)
              </h3>
              <button
                onClick={() => setShowBulkChatModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendBulkChat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب گروه مخاطبین انبوه:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBulkChatTargetType('BASE')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border ${
                      bulkChatTargetType === 'BASE' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    پایه تحصیلی
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChatTargetType('GROUP')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border ${
                      bulkChatTargetType === 'GROUP' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    گروه اختصاصی
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChatTargetType('ALL_STUDENTS')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border ${
                      bulkChatTargetType === 'ALL_STUDENTS' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    تمام طلاب مدرسه
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChatTargetType('ALL_OFFICIALS')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border ${
                      bulkChatTargetType === 'ALL_OFFICIALS' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    تمام اساتید و کادر
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChatTargetType('MANUAL')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border col-span-2 sm:col-span-1 ${
                      bulkChatTargetType === 'MANUAL' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    انتخاب دستی افراد
                  </button>
                </div>
              </div>

              {/* Options details depending on bulkChatTargetType */}
              {bulkChatTargetType === 'BASE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پایه تحصیلی:</label>
                  <select
                    value={bulkChatBase}
                    onChange={e => setBulkChatBase(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map(b => (
                      <option key={b} value={b}>تمام طلاب پایه {b}</option>
                    ))}
                  </select>
                </div>
              )}

              {bulkChatTargetType === 'GROUP' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">گروه اختصاصی:</label>
                  {customGroups && customGroups.length > 0 ? (
                    <select
                      value={bulkChatGroupId}
                      onChange={e => setBulkChatGroupId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="">انتخاب گروه...</option>
                      {customGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.memberIds.length} عضو)</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      هیچ گروه اختصاصی نساخته‌اید. ابتدا با دکمه «ساخت گروه اختصاصی» یک گروه بسازید.
                    </p>
                  )}
                </div>
              )}

              {bulkChatTargetType === 'MANUAL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب افراد جهت دریافت پیام:</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                    {allUsers
                      ?.filter(u => u.id !== currentUser?.id)
                      .map(u => (
                        <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkChatManualUserIds.includes(u.id)}
                            onChange={() => toggleBulkManualUser(u.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="font-medium text-slate-800">{getUserDisplayName(u)}</span>
                          <span className="text-[10px] text-slate-400">({ROLE_LABELS[u.role] || u.role}{u.base ? ` - پایه ${u.base}` : ''})</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Message content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">متن پیام گفتگو:</label>
                <textarea
                  required
                  rows={4}
                  placeholder="متن پیامی که به چت خصوصی تک تک اعضا ارسال خواهد شد..."
                  value={bulkChatContent}
                  onChange={e => setBulkChatContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* File Attachment Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پیوست فایل / تصویر / ویدیو / صوت:</label>
                <input
                  type="file"
                  multiple
                  ref={bulkFileInputRef}
                  onChange={e => handleFileUpload(e, 'BULK_CHAT')}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {bulkChatAttachments.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {bulkChatAttachments.map(att => (
                      <span key={att.id} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] flex items-center gap-1">
                        {att.name}
                        <button type="button" onClick={() => setBulkChatAttachments(prev => prev.filter(a => a.id !== att.id))} className="text-rose-500 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!bulkChatContent.trim() && bulkChatAttachments.length === 0}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  ارسال انبوه پیام
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkChatModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Group Creation Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                مدیریت و ساخت گروه‌های اختصاصی مخاطبین
              </h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {customGroups && customGroups.length > 0 && (
              <div className="mb-6 space-y-2">
                <h4 className="text-xs font-bold text-slate-700">گروه‌های ساخته شده شما:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customGroups.map(g => (
                    <div key={g.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">{g.name}</span>
                        <span className="text-[10px] text-slate-500">{g.memberIds.length} عضو</span>
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                        title="حذف گروه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام گروه جدید:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: گروه هنری، بسیج، کادر اجرایی، طلاب ممتاز..."
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اعضای گروه (طلاب و کاربران را انتخاب کنید):
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                  {allUsers
                    ?.filter(u => u.id !== currentUser?.id)
                    .map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupMemberIds.includes(u.id)}
                          onChange={() => toggleGroupMember(u.id)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span className="font-medium text-slate-800">{getUserDisplayName(u)}</span>
                        <span className="text-[10px] text-slate-400">({ROLE_LABELS[u.role] || u.role}{u.base ? ` - پایه ${u.base}` : ''})</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!groupName.trim() || groupMemberIds.length === 0}
                  className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  ذخیره و ایجاد گروه
                </button>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                {currentUser?.role === 'STUDENT' ? 'ارسال درخواست و نامه به مسئولین' : 'ارسال مکاتبه / پیام رسمی'}
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendOfficial} className="space-y-4">
              {currentUser?.role !== 'STUDENT' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">نوع دریافت‌کننده:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRecipientType('SINGLE')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                        recipientType === 'SINGLE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      فردی
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType('BASE')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                        recipientType === 'BASE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      ارسال به پایه تحصیلی
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType('GROUP')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                        recipientType === 'GROUP' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      گروه اختصاصی
                    </button>
                  </div>
                </div>
              )}

              {recipientType === 'SINGLE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">گیرنده اصلی:</label>
                  <select
                    required
                    value={officialRecipientId}
                    onChange={e => setOfficialRecipientId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">انتخاب کنید...</option>
                    {officialRecipientOptions.map(u => (
                      <option key={u.id} value={u.id}>
                        {getUserDisplayName(u)} ({ROLE_LABELS[u.role] || u.role}{u.base ? ` - پایه ${u.base}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recipientType === 'BASE' && currentUser?.role !== 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب پایه تحصیلی طلاب:</label>
                  <select
                    value={selectedBase}
                    onChange={e => setSelectedBase(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map(b => (
                      <option key={b} value={b}>تمام طلاب پایه {b}</option>
                    ))}
                  </select>
                </div>
              )}

              {recipientType === 'GROUP' && currentUser?.role !== 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب گروه مخاطبین:</label>
                  {customGroups && customGroups.length > 0 ? (
                    <select
                      value={selectedGroupId}
                      onChange={e => setSelectedGroupId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">انتخاب گروه...</option>
                      {customGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.memberIds.length} عضو)</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      هنوز هیچ گروه اختصاصی نساخته‌اید. ابتدا با دکمه «ساخت گروه اختصاصی» گروه بسازید.
                    </p>
                  )}
                </div>
              )}

              {officials.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ارسال رونوشت به سایر مسئولین (جهت اطلاع):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                    {officials.map(official => (
                      <label key={official.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ccUserIds.includes(official.id)}
                          onChange={() => toggleCcUser(official.id)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span className="font-medium">{getUserDisplayName(official)} ({ROLE_LABELS[official.role] || official.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">موضوع مکاتبه:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: درخواست مرخصی / گزارش وضعیت / پیگیری امور آموزشی..."
                  value={officialSubject}
                  onChange={e => setOfficialSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">متن مکاتبه:</label>
                <textarea
                  required
                  rows={5}
                  placeholder="شرح کامل نامه یا درخواست رسمی..."
                  value={officialContent}
                  onChange={e => setOfficialContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">پیوست تصویر، ویدیو، صوت یا فایل:</label>
                <input
                  type="file"
                  multiple
                  onChange={e => handleFileUpload(e, 'OFFICIAL')}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {officialAttachments.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {officialAttachments.map(att => (
                      <span key={att.id} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] flex items-center gap-1">
                        {att.name}
                        <button type="button" onClick={() => setOfficialAttachments(prev => prev.filter(a => a.id !== att.id))} className="text-rose-500 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  ثبت و ارسال نامه رسمی
                </button>
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
