import React, { useState } from 'react';
import {
  Search, Filter, Send, Paperclip, Smile, Download, FileText, Clock,
  Phone, Video, MoreHorizontal, ChevronDown, Star, User, MapPin,
  Briefcase, CheckCircle2, Circle, MessageSquare, History, Plus,
  ExternalLink, X, ArrowLeft
} from 'lucide-react';
import { MESSAGE_TABS, MESSAGE_CONVERSATIONS } from './mockData';

const SOURCE_BADGE_COLORS = {
  'Từ Landing Page': { bg: '#fef2f2', color: '#dc2626' },
  'Scout Credit': { bg: '#fee2e2', color: '#dc2626' },
  'CTV': { bg: '#fecaca', color: '#b91c1c' },
  'WS': { bg: '#fef2f2', color: '#991b1b' },
};

const TAB_ICONS = {
  lp: { color: '#dc2626', bg: '#fef2f2' },
  scout: { color: '#dc2626', bg: '#fee2e2' },
  ctv: { color: '#b91c1c', bg: '#fecaca' },
  ws: { color: '#991b1b', bg: '#fef2f2' },
};

const MOCK_MESSAGES = [
  { id: 1, sender: 'them', text: 'Chào anh/chị, Em đã xem qua mô tả công việc Frontend Developer. Em rất quan tâm đến vị trí này.', time: '10:15' },
  { id: 2, sender: 'them', text: 'Em có 4 năm kinh nghiệm với React.js và TypeScript, hiện đang tìm cơ hội mới.', time: '10:16' },
  { id: 3, sender: 'me', text: 'Chào bạn! Cảm ơn bạn đã quan tâm đến vị trí này. Bạn có thể gửi CV cho mình không?', time: '10:20' },
  { id: 4, sender: 'them', text: 'Dạ, em gửi CV ạ.', time: '10:25' },
  { id: 5, sender: 'them', type: 'file', fileName: 'CV_TranVanHung_Frontend.pdf', fileSize: '2.4 MB', time: '10:25' },
  { id: 6, sender: 'me', text: 'Mình đã nhận được CV. Mình sẽ review và phản hồi bạn trong 1-2 ngày nhé!', time: '10:30' },
];

const QUICK_REPLIES = [
  'Cảm ơn bạn đã ứng tuyển',
  'Mời bạn phỏng vấn',
  'Gửi thông tin JD',
  'Yêu cầu bổ sung hồ sơ',
];

const RECRUITMENT_STEPS = [
  { label: 'Nhận hồ sơ', status: 'done', date: '18/05/2024' },
  { label: 'Screening', status: 'done', date: '19/05/2024' },
  { label: 'Phỏng vấn vòng 1', status: 'current', date: '22/05/2024' },
  { label: 'Phỏng vấn vòng 2', status: 'pending' },
  { label: 'Offer', status: 'pending' },
];

export default function CompanyMessages() {
  const [activeTab, setActiveTab] = useState('lp');
  const [activeConversation, setActiveConversation] = useState(1);
  const [chatSubTab, setChatSubTab] = useState('chat');
  const [messageInput, setMessageInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat' | 'detail'

  const filteredConversations = MESSAGE_CONVERSATIONS.filter(c => {
    const matchTab = c.tab === activeTab;
    const matchSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTab && matchSearch;
  });

  const activeConv = MESSAGE_CONVERSATIONS.find(c => c.id === activeConversation);

  const handleSelectConversation = (id) => {
    setActiveConversation(id);
    setMobileView('chat');
  };

  return (
    <div className="bg-gray-50 p-3 sm:p-4 lg:p-6 h-full flex flex-col">
      {/* Top Tabs - horizontal scroll on mobile */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        {MESSAGE_TABS.map(tab => {
          const tabStyle = TAB_ICONS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: isActive ? tabStyle.bg : '#F9FAFB',
                color: isActive ? tabStyle.color : '#6B7280',
                border: isActive ? `1.5px solid ${tabStyle.color}40` : '1px solid #E5E7EB',
              }}
            >
              <span>{tab.label}</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center"
                style={{
                  backgroundColor: isActive ? tabStyle.color : '#9CA3AF',
                  color: '#fff',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Layout: 3 columns on desktop, single panel on mobile */}
      <div className="flex gap-3 lg:gap-4 flex-1 min-h-0">
        {/* Left: Conversation List */}
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[30%] bg-white rounded-xl border border-gray-200 shadow-sm flex-col overflow-hidden`}>
          {/* Search & Filter */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm cuộc hội thoại..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unread">Chưa đọc</option>
              <option value="read">Đã đọc</option>
            </select>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">Không có cuộc hội thoại nào</div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConversation;
                const sourceBadge = SOURCE_BADGE_COLORS[conv.source] || SOURCE_BADGE_COLORS['WS'];
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="px-3 py-3 border-b border-gray-50 cursor-pointer transition-colors"
                    style={{ backgroundColor: isActive ? '#fef2f2' : 'transparent' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">{conv.name}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{conv.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{conv.title}</p>
                        {conv.source && (
                          <span
                            className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ backgroundColor: sourceBadge.bg, color: sourceBadge.color }}
                          >
                            {conv.source}
                          </span>
                        )}
                        {conv.jd && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">JD: {conv.jd}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 truncate">{conv.lastMsg || 'Chưa có tin nhắn'}</p>
                      </div>
                      {conv.unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#dc2626' }}>
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center: Chat Area */}
        <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[40%] bg-white rounded-xl border border-gray-200 shadow-sm flex-col overflow-hidden`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Back button on mobile */}
                    <button
                      onClick={() => setMobileView('list')}
                      className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={16} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{activeConv.name}</p>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 flex-wrap">
                        <span className="truncate max-w-[100px] sm:max-w-none">{activeConv.title}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:flex items-center gap-1"><Briefcase size={10} />4 năm KN</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:flex items-center gap-1"><MapPin size={10} />Hà Nội</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Detail panel toggle on mobile */}
                    <button
                      onClick={() => setMobileView('detail')}
                      className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <User size={16} />
                    </button>
                    <button className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Phone size={16} /></button>
                    <button className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Video size={16} /></button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><MoreHorizontal size={16} /></button>
                  </div>
                </div>

                {/* Action Buttons - scroll on mobile */}
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                    <User size={12} />Xem hồ sơ
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                    <Download size={12} />Tải CV
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                    <History size={12} />Lịch sử ứng tuyển
                  </button>
                </div>

                {/* Chat Sub-tabs - scroll on mobile */}
                <div className="flex items-center gap-1 mt-3 border-b border-gray-100 -mb-3 sm:-mb-4 -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'chat', label: 'Trò chuyện', icon: MessageSquare },
                    { id: 'profile', label: 'Hồ sơ ứng viên', icon: User },
                    { id: 'history', label: 'Lịch sử hoạt động', icon: History },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setChatSubTab(tab.id)}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0"
                      style={{
                        borderColor: chatSubTab === tab.id ? '#dc2626' : 'transparent',
                        color: chatSubTab === tab.id ? '#dc2626' : '#6B7280',
                      }}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3" style={{ backgroundColor: '#FAFBFC' }}>
                {MOCK_MESSAGES.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] sm:max-w-[75%]">
                      {msg.type === 'file' ? (
                        <div
                          className="rounded-xl p-3 border"
                          style={{
                            backgroundColor: msg.sender === 'me' ? '#dc2626' : '#fff',
                            borderColor: msg.sender === 'me' ? '#dc2626' : '#E5E7EB',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: msg.sender === 'me' ? 'rgba(255,255,255,0.2)' : '#fecaca' }}>
                              <FileText size={18} style={{ color: msg.sender === 'me' ? '#fff' : '#b91c1c' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${msg.sender === 'me' ? 'text-white' : 'text-gray-900'}`}>
                                {msg.fileName}
                              </p>
                              <p className={`text-xs ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-400'}`}>
                                {msg.fileSize}
                              </p>
                            </div>
                            <button className={`p-1.5 rounded-lg flex-shrink-0 ${msg.sender === 'me' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                              <Download size={14} style={{ color: msg.sender === 'me' ? '#fff' : '#6B7280' }} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="rounded-xl px-3 sm:px-4 py-2.5"
                          style={{
                            backgroundColor: msg.sender === 'me' ? '#dc2626' : '#fff',
                            border: msg.sender === 'me' ? 'none' : '1px solid #E5E7EB',
                          }}
                        >
                          <p className={`text-sm ${msg.sender === 'me' ? 'text-white' : 'text-gray-800'}`}>
                            {msg.text}
                          </p>
                        </div>
                      )}
                      <p className={`text-[10px] mt-1 ${msg.sender === 'me' ? 'text-right' : 'text-left'} text-gray-400`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Replies */}
              <div className="px-3 sm:px-4 py-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-[10px] text-gray-400 flex-shrink-0">Mẫu:</span>
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 whitespace-nowrap flex-shrink-0 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-2 sm:p-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0">
                    <Paperclip size={18} />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Nhập tin nhắn..."
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 pr-10"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <Smile size={16} />
                    </button>
                  </div>
                  <button
                    className="p-2 sm:p-2.5 rounded-xl text-white flex-shrink-0"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Chọn một cuộc hội thoại để bắt đầu
            </div>
          )}
        </div>

        {/* Right: Info Panel */}
        <div className={`${mobileView === 'detail' ? 'flex flex-col' : 'hidden'} lg:flex lg:flex-col w-full lg:w-[30%] space-y-4 overflow-y-auto`}>
          {/* Back button on mobile */}
          <button
            onClick={() => setMobileView('chat')}
            className="lg:hidden flex items-center gap-2 text-sm text-gray-600 mb-1"
          >
            <ArrowLeft size={16} />
            Quay lại chat
          </button>

          {/* Candidate Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thông tin ứng viên</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={24} className="text-gray-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
                  style={{ backgroundColor: '#fee2e2' }}>
                  <span className="text-[10px] font-bold text-red-700">85%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{activeConv?.name || 'Ứng viên'}</p>
                <p className="text-xs text-gray-500">{activeConv?.title || ''}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">Match: 85%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between"><span className="text-gray-400">Kinh nghiệm:</span><span>4 năm</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Vị trí:</span><span>Frontend Developer</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Địa điểm:</span><span>Hà Nội</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Mức lương:</span><span>25-30 triệu</span></div>
            </div>
          </div>

          {/* Applied JDs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Ứng viên đang ứng tuyển</h3>
            <div className="space-y-2">
              {[
                { jd: 'Frontend Developer (FE2405-0012)', status: 'Phỏng vấn', color: '#b91c1c' },
                { jd: 'IT Developer (IT2405-0008)', status: 'Đang xem xét', color: '#ef4444' },
              ].map((item, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs font-medium text-gray-800">{item.jd}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recruitment Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tiến trình tuyển dụng</h3>
            <div className="space-y-0">
              {RECRUITMENT_STEPS.map((step, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {i < RECRUITMENT_STEPS.length - 1 && (
                    <div className="absolute left-[9px] top-5 w-0.5 h-full"
                      style={{ backgroundColor: step.status === 'done' ? '#dc2626' : '#E5E7EB' }} />
                  )}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    {step.status === 'done' ? (
                      <CheckCircle2 size={18} className="text-red-500" />
                    ) : step.status === 'current' ? (
                      <div className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#dc2626' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                      </div>
                    ) : (
                      <Circle size={18} className="text-gray-300" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-xs font-medium ${step.status === 'current' ? 'text-red-600' : step.status === 'done' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {step.date && <p className="text-[10px] text-gray-400">{step.date}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Ghi chú nội bộ</h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xs text-gray-700">Ứng viên phản hồi nhanh, thái độ tốt. Cần confirm lịch PV vòng 1.</p>
                <p className="text-[10px] text-gray-400 mt-1">Nguyễn Văn A - 20/05/2024</p>
              </div>
            </div>
            <button className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors flex items-center justify-center gap-1">
              <Plus size={12} />
              Thêm ghi chú
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
