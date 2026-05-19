import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';
import LegalPoliciesSlidePanel from '../Shared/LegalPoliciesSlidePanel';

const LS_TOKEN = 'ctv_landing_public_chat_token';
const LS_NAME = 'ctv_landing_visitor_name';
/** Thời điểm CTV xem tab «Chat với admin» — dùng để đếm tin từ admin chưa đọc */
const LS_LAST_READ_ADMIN = 'ctv_landing_chat_last_read_admin_at';

/** ensure + retry khi localStorage còn token phiên guest gắn tài khoản khác (403) */
async function ensurePublicCtvSessionResilient({ sessionToken, visitorLabel }) {
  const body = {
    sessionToken: sessionToken || undefined,
    visitorLabel: visitorLabel || undefined,
  };
  try {
    return await apiService.ensurePublicCtvChatSession(body);
  } catch (e) {
    const msg = `${e?.data?.message || ''} ${e?.message || ''}`;
    const stale =
      sessionToken &&
      (e?.status === 403 || /gắn tài khoản|tài khoản khác|another account/i.test(msg));
    if (stale) {
      try {
        localStorage.removeItem(LS_TOKEN);
      } catch {
        /* ignore */
      }
      return apiService.ensurePublicCtvChatSession({
        visitorLabel: visitorLabel || undefined,
      });
    }
    throw e;
  }
}

const FACEBOOK_JOBSHERE_URL = 'https://www.facebook.com/';

const linkInBubbleClass =
  'text-[10px] font-semibold !text-[#2563eb] underline decoration-1 underline-offset-1 hover:!text-[#1d4ed8]';

const COPY = {
  vi: {
    title: 'Hỗ trợ CTV',
    subtitle: 'Có thể chuyển sang tư vấn trực tiếp với đội ngũ',
    openAria: 'Mở chat hỗ trợ',
    close: 'Đóng',
    back: 'Quay lại',
    yourName: 'Tên gọi (tuỳ chọn)',
    agentMeta: 'JobShare • Hỗ trợ',
    greeting: (name) =>
      `Xin chào ${name}! Chọn một trong các câu hỏi gợi ý bên dưới để xem trả lời. Muốn trò chuyện trực tiếp với admin, hãy mở tab «Chat với admin».`,
    opt1: 'Chính sách hoa hồng',
    opt2: 'Hướng dẫn đăng ký CTV',
    opt3: 'Lịch đào tạo/Seminar',
    opt4: 'Cần hỗ trợ trực tiếp',
    linkPolicy: 'tại đây',
    opt1ReplyLead:
      'JobShare có chính sách hoa hồng hấp dẫn cho CTV khi giới thiệu ứng viên thành công. Bạn có thể xem chi tiết bảng thưởng ',
    opt1ReplyTail: ' Càng kết nối nhiều, thu nhập càng cao!',
    opt2Reply:
      'Bạn chỉ cần nhấn vào nút «Đăng ký» trên thanh menu và điền đầy đủ các thông tin cần thiết. Sau khi hệ thống phê duyệt tài khoản, bạn có thể bắt đầu xem danh sách việc làm, tạo hồ sơ ứng viên và tiến cử ngay.',
    opt3ReplyLead:
      'Chúng tôi thường xuyên có các buổi hướng dẫn kỹ năng cho CTV mới. Bạn có thể theo dõi các thông tin mới nhất tại mục ',
    opt3LinkNews: 'Tin tức',
    opt3ReplyTail: '.',
    opt4ContactIntro:
      'Nếu cần giải đáp về kỹ thuật hoặc đối soát chi phí hoa hồng, hãy liên hệ đội ngũ hỗ trợ của chúng tôi:',
    opt4HotlineVn: '(+84) 972899728',
    opt4HotlineJp: '(+81) 9094411975',
    opt4Facebook: 'Inbox Facebook JobShare',
    placeholderFirst: 'Nhập lời nhắn của bạn…',
    startChat: 'Gửi & bắt đầu chat',
    chatPlaceholder: 'Soạn tin nhắn…',
    send: 'Gửi',
    guest: 'bạn',
    connecting: 'Đang kết nối…',
    tabHome: 'Gợi ý',
    tabMessages: 'Chat với admin',
    chatWithAdminTitle: 'Chat với admin',
    chatWithAdminSubtitle: 'Trực tiếp với đội ngũ',
    chatWithAdminHint: 'Nhập tên (tuỳ chọn) và tin nhắn đầu tiên — tư vấn viên JobShare sẽ phản hồi.',
    chatWithAdminHintAgent: 'Soạn tin nhắn đầu tiên — tên hiển thị lấy từ tài khoản CTV của bạn.',
    registeredCtvBadge: 'Đã đăng ký',
  },
  en: {
    title: 'CTV support',
    subtitle: 'Our team can help you directly',
    openAria: 'Open support chat',
    close: 'Close',
    back: 'Back',
    yourName: 'Your name (optional)',
    agentMeta: 'JobShare • Support',
    greeting: (name) =>
      `Hello ${name}! Tap a suggested question below to see the answer. For live chat with our team, open the «Chat with admin» tab.`,
    opt1: 'Commission policy',
    opt2: 'How to register as a collaborator',
    opt3: 'Training / seminar schedule',
    opt4: 'Direct support',
    linkPolicy: 'here',
    opt1ReplyLead:
      'JobShare offers an attractive commission policy for collaborators when referrals succeed. See the reward table ',
    opt1ReplyTail: ' The more you connect, the more you can earn!',
    opt2Reply:
      'Click «Sign up» in the top menu and complete the required information. After your account is approved, you can browse jobs, create candidate profiles, and submit referrals right away.',
    opt3ReplyLead:
      'We regularly run skills sessions for new collaborators. Follow the latest updates in ',
    opt3LinkNews: 'News',
    opt3ReplyTail: '.',
    opt4ContactIntro: 'For technical questions or commission reconciliation, contact our support team:',
    opt4HotlineVn: '(+84) 972899728',
    opt4HotlineJp: '(+81) 9094411975',
    opt4Facebook: 'JobShare Facebook inbox',
    placeholderFirst: 'Type your message…',
    startChat: 'Send & start chat',
    chatPlaceholder: 'Type a message…',
    send: 'Send',
    guest: 'there',
    connecting: 'Connecting…',
    tabHome: 'Quick picks',
    tabMessages: 'Chat with admin',
    chatWithAdminTitle: 'Chat with admin',
    chatWithAdminSubtitle: 'Live team support',
    chatWithAdminHint: 'Optional name and your first message — our team will reply.',
    chatWithAdminHintAgent: 'Type your first message — your display name comes from your CTV account.',
    registeredCtvBadge: 'Registered',
  },
  ja: {
    title: 'CTVサポート',
    subtitle: 'チームによるサポートも可能です',
    openAria: 'サポートチャットを開く',
    close: '閉じる',
    back: '戻る',
    yourName: 'お名前（任意）',
    agentMeta: 'JobShare • サポート',
    greeting: (name) =>
      `${name}さん、下の質問から選ぶと回答が表示されます。担当者とチャットするには「管理者チャット」タブへ。`,
    opt1: '歩合・手数料ポリシー',
    opt2: 'コラボレーター登録の流れ',
    opt3: '研修・セミナー日程',
    opt4: '直接サポート',
    linkPolicy: 'こちら',
    opt1ReplyLead:
      '紹介が成立するとコラボレーター向けに魅力的な歩合制度があります。詳細な報酬表は',
    opt1ReplyTail: ' つながりが広がるほど収入の可能性も高まります。',
    opt2Reply:
      '上部メニューの「登録」から必要事項を入力してください。アカウント承認後、求人一覧の閲覧、候補者プロフィール作成、紹介がすぐに始められます。',
    opt3ReplyLead:
      '新規コラボレーター向けのスキル研修を定期的に開催しています。最新情報は',
    opt3LinkNews: 'ニュース',
    opt3ReplyTail: 'でご確認ください。',
    opt4ContactIntro: '技術的なご質問や歩合精算についてはサポートまで：',
    opt4HotlineVn: '(+84) 972899728',
    opt4HotlineJp: '(+81) 9094411975',
    opt4Facebook: 'Facebook（JobShare）',
    placeholderFirst: 'メッセージを入力…',
    startChat: '送信してチャット開始',
    chatPlaceholder: 'メッセージ…',
    send: '送信',
    guest: 'ゲスト',
    connecting: '接続中…',
    tabHome: 'クイック',
    tabMessages: '管理者チャット',
    chatWithAdminTitle: '管理者チャット',
    chatWithAdminSubtitle: '担当者とやり取り',
    chatWithAdminHint: 'お名前（任意）と最初のメッセージを入力してください。',
    chatWithAdminHintAgent: '最初のメッセージを入力してください。表示名はCTVアカウントの氏名を使用します。',
    registeredCtvBadge: '登録済み',
  },
};

const chipClassName =
  'inline-flex max-w-[100%] rounded-xl border border-[#e8e4dc] bg-white px-2 py-1.5 text-left text-[9px] font-medium leading-tight !text-[#92400e] shadow-sm transition hover:border-[#d6d0c4] hover:bg-[#fffefb] whitespace-normal text-balance';

/** Chip nút gợi ý — viền nhạt, chữ amber như reference */
function SuggestionChip({ children, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} className={`${chipClassName} ${className}`}>
      {children}
    </button>
  );
}

function ChipLink({ href, download, children, target, rel, className }) {
  return (
    <a
      href={href}
      download={download}
      target={target}
      rel={rel}
      className={className != null && className !== '' ? className : chipClassName}
    >
      {children}
    </a>
  );
}

/** Parse [[LINK:/path|nhãn]] trong tin admin — backend gửi kèm deep link tới form hồ sơ */
function renderChatMessageBody(body, { isVisitorBubble = false } = {}) {
  if (body == null || typeof body !== 'string') return body;
  const re = /\[\[LINK:([^|]+)\|([^\]]+)\]\]/g;
  const out = [];
  let last = 0;
  let mi = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`txt-${mi++}`} className="whitespace-pre-wrap break-words">
          {body.slice(last, m.index)}
        </span>
      );
    }
    const path = m[1];
    const label = m[2];
    out.push(
      <Link
        key={`lnk-${mi++}`}
        to={path}
        className={
          isVisitorBubble
            ? `${linkInBubbleClass} !text-white underline decoration-white/80`
            : linkInBubbleClass
        }
      >
        {label}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    out.push(
      <span key={`txt-${mi++}`} className="whitespace-pre-wrap break-words">
        {body.slice(last)}
      </span>
    );
  }
  return out.length ? <span className="inline break-words">{out}</span> : body;
}

/** Lần đầu vào: coi đã đọc tới tin admin mới nhất trong batch tải được — tránh badge 99+ nhưng vẫn bắt được tin sau đó (SSE). */
function bootstrapLastReadAdminFromFetchedMessages(msgs) {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(LS_LAST_READ_ADMIN)) return;
  if (!msgs?.length) return;
  const adminTimes = msgs
    .filter((m) => m.senderType === 'admin')
    .map((m) => new Date(m.createdAt || m.created_at).getTime());
  const t = adminTimes.length ? Math.max(...adminTimes) : Date.now();
  localStorage.setItem(LS_LAST_READ_ADMIN, new Date(t).toISOString());
}

function CollaboratorLandingChatbot() {
  const { language } = useLanguage();
  const { pathname } = useLocation();
  const collabPrefix = pathname.startsWith('/landing/collaborator') ? '/landing/collaborator' : '/collaborator';
  /** Khu vực đăng nhập CTV (/agent): tên chat lấy từ profile, không hỏi khách nhập tên */
  const isAgentArea = pathname.startsWith('/agent');
  const t = COPY[language] || COPY.vi;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('home');
  /** Luồng chat trực tiếp: menu = chưa gửi tin đầu; live = đã có phiên */
  const [step, setStep] = useState('menu');
  /** Tab Gợi ý: mỗi lần chọn chip append một lượt (opt1…4), không thay thế luồng */
  const [scriptTurns, setScriptTurns] = useState([]);
  const [visitorName, setVisitorName] = useState(() => localStorage.getItem(LS_NAME) || '');
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(LS_TOKEN) || '');
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveInput, setLiveInput] = useState('');
  const [firstLiveInput, setFirstLiveInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  /** Phiên chat đã gắn tài khoản CTV đăng nhập (cùng bảng public_ctv_chat) */
  const [ctvChatRegistered, setCtvChatRegistered] = useState(false);
  /** Tin từ admin chưa xem (khi không mở tab Chat hoặc đóng widget) */
  const [unreadAdminCount, setUnreadAdminCount] = useState(0);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState('commission');
  const [buttonPosition, setButtonPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 12, y: 12 };
    return { x: window.innerWidth - 76, y: window.innerHeight - 76 };
  });
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const [buttonDragStart, setButtonDragStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
  /** Trên /agent: đã tải xong profile để điền tên (tránh flash ô «tên tuỳ chọn») */
  const [agentProfileReady, setAgentProfileReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !(pathname.startsWith('/agent') && localStorage.getItem('userType') === 'ctv' && localStorage.getItem('token'));
  });
  const messagesEndRef = useRef(null);
  const scriptThreadEndRef = useRef(null);
  const esRef = useRef(null);
  const buttonRef = useRef(null);

  const hasLiveThread = step === 'live' || liveMessages.length > 0;

  const fabGap = 8;

  const getFabSize = useCallback(() => (typeof window === 'undefined' ? 60 : window.innerWidth < 640 ? 56 : 60), []);

  const clampFabPosition = useCallback(
    (x, y, isOpen) => {
      if (typeof window === 'undefined') return { x, y };
      const fab = getFabSize();
      const side = window.innerWidth < 640 ? 8 : 12;
      const bottomOffset = window.innerWidth < 1024 ? 88 : 32;
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;

      let nx = x;
      let ny = y;

      if (!isOpen) {
        return {
          x: Math.max(side, Math.min(nx, innerW - fab - side)),
          y: Math.max(side, Math.min(ny, innerH - fab - bottomOffset)),
        };
      }

      const panelW = Math.min(400, innerW - 2 * side);
      const panelH = Math.min(520, Math.max(220, innerH - side - bottomOffset - fab - fabGap - side));

      for (let iter = 0; iter < 8; iter++) {
        const fabLeft = nx;
        const fabTop = ny;
        const fabRight = nx + fab;
        const fabBottom = ny + fab;
        const panelLeft = nx + fab - panelW;
        const panelTop = ny - fabGap - panelH;
        const panelRight = panelLeft + panelW;
        const panelBottom = panelTop + panelH;

        const minX = Math.min(fabLeft, panelLeft);
        const maxX = Math.max(fabRight, panelRight);
        const minY = Math.min(fabTop, panelTop);
        const maxY = Math.max(fabBottom, panelBottom);

        let dx = 0;
        let dy = 0;
        if (minX < side) dx = side - minX;
        if (maxX + dx > innerW - side) dx = innerW - side - maxX;
        if (minY + dy < side) dy = side - minY;
        if (maxY + dy > innerH - bottomOffset) dy = innerH - bottomOffset - maxY;

        if (dx === 0 && dy === 0) break;
        nx += dx;
        ny += dy;
      }

      nx = Math.max(side, Math.min(nx, innerW - fab - side));
      ny = Math.max(side, Math.min(ny, innerH - fab - bottomOffset));

      return { x: nx, y: ny };
    },
    [getFabSize]
  );

  const handleButtonDragStart = useCallback((e) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDraggingButton(true);
    setDragMoved(false);
    setButtonDragStart({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const stopStream = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  };

  const startStream = useCallback((token) => {
    stopStream();
    const url = apiService.getPublicCtvChatStreamUrl(token);
    const es = new EventSource(url);
    esRef.current = es;
    es.addEventListener('chat', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'message' && data.message) {
          setLiveMessages((prev) => {
            if (prev.some((m) => Number(m.id) === Number(data.message.id))) return prev;
            return [...prev, data.message];
          });
          setStep('live');
        }
      } catch {
        // ignore
      }
    });
    es.onerror = () => {
      es.close();
    };
  }, []);

  /** Khôi phục phiên: trên /agent tải tên CTV từ profile trước; CTV đăng nhập gọi ensure rồi tải tin */
  useEffect(() => {
    let cancelled = false;
    const ut = localStorage.getItem('userType');
    const ctvToken = localStorage.getItem('token');
    const waitAgentProfile = pathname.startsWith('/agent') && ut === 'ctv' && ctvToken;

    if (waitAgentProfile) setAgentProfileReady(false);
    else setAgentProfileReady(true);

    (async () => {
      try {
        const lsTok = localStorage.getItem(LS_TOKEN);
        let nameHint = (localStorage.getItem(LS_NAME) || '').trim();

        if (waitAgentProfile) {
          try {
            const me = await apiService.getCTVProfile();
            if (!cancelled && me.success) {
              const c = me.data?.collaborator || me.data?.user || me.data?.ctv || me.data;
              const n = (c?.name || '').trim();
              if (n) {
                nameHint = n;
                setVisitorName(n);
                localStorage.setItem(LS_NAME, n);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (cancelled) return;

        if (ctvToken) {
          const res = await ensurePublicCtvSessionResilient({
            sessionToken: lsTok || undefined,
            visitorLabel: nameHint || undefined,
          });
          if (cancelled || !res?.success || !res.data?.sessionToken) return;
          setCtvChatRegistered(!!res.data.isRegistered);
          const effectiveTok = res.data.sessionToken;
          if (effectiveTok !== lsTok) {
            localStorage.setItem(LS_TOKEN, effectiveTok);
            setSessionToken(effectiveTok);
          } else {
            setSessionToken(effectiveTok);
          }
          const msgsRes = await apiService.getPublicCtvChatMessages(effectiveTok);
          if (cancelled || !msgsRes.success) return;
          const msgs = msgsRes.data?.messages || [];
          bootstrapLastReadAdminFromFetchedMessages(msgs);
          setLiveMessages(msgs);
          /** Phiên đã có nhưng chưa có tin: vẫn vào luồng chat (ô gửi dưới), không kẹt màn «tin đầu tiên». */
          setStep('live');
          /** Luôn mở SSE khi đã có phiên — kể cả chưa có tin; nếu không, tin admin gửi sau không vào state → không có badge. */
          startStream(effectiveTok);
          return;
        }

        if (!lsTok) return;
        const res = await apiService.getPublicCtvChatMessages(lsTok);
        if (cancelled || !res.success) return;
        const msgs = res.data?.messages || [];
        bootstrapLastReadAdminFromFetchedMessages(msgs);
        setLiveMessages(msgs);
        setSessionToken(lsTok);
        setStep('live');
        startStream(lsTok);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled && waitAgentProfile) setAgentProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, startStream]);

  useEffect(() => {
    localStorage.setItem(LS_NAME, visitorName);
  }, [visitorName]);

  useEffect(() => {
    if (open && tab === 'messages') {
      localStorage.setItem(LS_LAST_READ_ADMIN, new Date().toISOString());
      setUnreadAdminCount(0);
      return;
    }
    const lr = localStorage.getItem(LS_LAST_READ_ADMIN);
    const t0 = lr ? new Date(lr).getTime() : 0;
    const n = liveMessages.filter((m) => {
      if (m.senderType !== 'admin') return false;
      const ts = new Date(m.createdAt || m.created_at).getTime();
      return ts > t0;
    }).length;
    setUnreadAdminCount(n);
  }, [liveMessages, open, tab]);

  const displayName = visitorName.trim() || t.guest;

  const scrollBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollBottom();
  }, [liveMessages]);

  useEffect(() => {
    if (tab !== 'home') return;
    scriptThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scriptTurns, tab]);

  useEffect(() => {
    const handleResize = () => {
      setButtonPosition((prev) => clampFabPosition(prev.x, prev.y, open));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampFabPosition, open]);

  useEffect(() => {
    setButtonPosition((prev) => clampFabPosition(prev.x, prev.y, open));
  }, [open, clampFabPosition]);

  useEffect(() => {
    if (!isDraggingButton) return undefined;

    const handleMouseMove = (e) => {
      const next = clampFabPosition(e.clientX - buttonDragStart.x, e.clientY - buttonDragStart.y, open);
      setButtonPosition(next);
      setDragMoved(true);
      e.preventDefault();
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const next = clampFabPosition(touch.clientX - buttonDragStart.x, touch.clientY - buttonDragStart.y, open);
      setButtonPosition(next);
      setDragMoved(true);
      e.preventDefault();
    };

    const stopDragging = () => {
      setIsDraggingButton(false);
      window.setTimeout(() => setDragMoved(false), 120);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopDragging);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDragging);
    };
  }, [isDraggingButton, buttonDragStart, clampFabPosition, open]);

  useEffect(() => () => stopStream(), []);

  const ensureSession = async (tokenHint) => {
    const res = await ensurePublicCtvSessionResilient({
      sessionToken: tokenHint || undefined,
      visitorLabel: visitorName.trim() || null,
    });
    if (!res.success || !res.data?.sessionToken) throw new Error('session');
    if (res.data.isRegistered != null) setCtvChatRegistered(!!res.data.isRegistered);
    const tok = res.data.sessionToken;
    setSessionToken(tok);
    localStorage.setItem(LS_TOKEN, tok);
    return tok;
  };

  const loadMessages = async (tok) => {
    const res = await apiService.getPublicCtvChatMessages(tok);
    if (res.success && res.data?.messages) {
      setLiveMessages(res.data.messages);
    }
  };

  const sendLive = async () => {
    const text = liveInput.trim();
    if (!text || sending || !sessionToken) return;
    setSending(true);
    try {
      const res = await apiService.sendPublicCtvChatMessage({ sessionToken, body: text });
      if (res.success && res.data?.message) {
        setLiveMessages((prev) => {
          if (prev.some((m) => m.id === res.data.message.id)) return prev;
          return [...prev, res.data.message];
        });
        setLiveInput('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const submitFirstMessage = async () => {
    const text = firstLiveInput.trim();
    if (!text || sending) return;
    setSending(true);
    setConnecting(true);
    try {
      let tok = sessionToken;
      if (!tok) {
        tok = await ensureSession(null);
      } else {
        tok = await ensureSession(tok);
      }
      await apiService.sendPublicCtvChatMessage({ sessionToken: tok, body: text });
      await loadMessages(tok);
      startStream(tok);
      setStep('live');
      setFirstLiveInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
      setConnecting(false);
    }
  };

  const resetScriptThread = () => {
    setScriptTurns([]);
  };

  const appendScriptTurn = (key) => {
    setScriptTurns((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, key }]);
  };

  const goBackHeader = () => {
    if (tab === 'messages') {
      setTab('home');
      return;
    }
    if (tab === 'home' && scriptTurns.length > 0) resetScriptThread();
  };

  const showHeaderBack = tab === 'messages' || (tab === 'home' && scriptTurns.length > 0);

  /** Vùng trên: script (home) hoặc chat admin (messages) */
  const renderMessageArea = () => {
    if (tab === 'messages') {
      if (!hasLiveThread) {
        const isCtvAgent =
          isAgentArea && typeof localStorage !== 'undefined' && localStorage.getItem('userType') === 'ctv';
        if (isCtvAgent && !agentProfileReady) {
          return (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
              <p className="text-center text-[10px] text-[#6b7280]">{t.connecting}</p>
            </div>
          );
        }
        const useAccountNameOnly = isCtvAgent && !!visitorName.trim();
        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2 scroll-pt-4">
            <h3 className="text-[10px] font-bold leading-tight text-[#111827]">{t.chatWithAdminTitle}</h3>
            <p className="mt-0.5 text-[9px] leading-snug text-[#6b7280]">
              {useAccountNameOnly ? t.chatWithAdminHintAgent : t.chatWithAdminHint}
            </p>
            {!useAccountNameOnly && (
              <label className="mt-3 block text-[9px] font-medium uppercase tracking-wide text-[#9ca3af]">
                {t.yourName}
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e8e8ea] bg-white px-2 py-1.5 text-[10px] text-[#111827] outline-none focus:border-[#d1d5db]"
                  maxLength={120}
                />
              </label>
            )}
            <textarea
              value={firstLiveInput}
              onChange={(e) => setFirstLiveInput(e.target.value)}
              rows={4}
              placeholder={t.placeholderFirst}
              aria-label={t.placeholderFirst}
              className={`${
                useAccountNameOnly ? 'mt-3' : 'mt-1'
              } w-full resize-none rounded-xl border border-[#e8e8ea] bg-white px-2 py-2 text-[10px] leading-snug text-[#111827] caret-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#d1d5db]`}
            />
          </div>
        );
      }
      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {connecting && (
            <p className="shrink-0 px-2 pt-2 text-center text-[9px] text-[#6b7280]">{t.connecting}</p>
          )}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2 scroll-smooth scroll-pt-2 [scrollbar-gutter:stable]">
            <div className="space-y-2">
              {liveMessages.map((m) => (
                <div key={m.id}>
                  <div
                    className={`flex ${m.senderType === 'visitor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-2 py-1.5 text-[10px] leading-snug ${
                        m.senderType === 'visitor'
                          ? 'bg-[#ED212F] text-white'
                          : 'border border-[#ececec] bg-white text-[#1f2937] shadow-sm'
                      }`}
                    >
                      {renderChatMessageBody(m.body, { isVisitorBubble: m.senderType === 'visitor' })}
                    </div>
                  </div>
                  <p className="mt-0.5 text-[9px] text-[#9ca3af]">
                    {m.senderType === 'visitor' ? displayName : t.agentMeta} •{' '}
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-px w-full shrink-0" />
            </div>
          </div>
        </div>
      );
    }

    if (tab === 'home') {
      const bubbleAgent = (body) => (
        <div className="flex w-full min-w-0 justify-start">
          <div className="max-w-[92%] rounded-xl border border-[#ececec] bg-white px-2 py-1.5 text-[10px] leading-snug !text-[#1f2937] shadow-sm [&_a]:inline [&_button]:inline [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:align-baseline">
            {body}
          </div>
        </div>
      );
      const bubbleUser = (body) => (
        <div className="flex w-full min-w-0 justify-end">
          <div className="max-w-[92%] rounded-xl bg-[#ED212F] px-2 py-1.5 text-[10px] leading-snug !text-white">
            {body}
          </div>
        </div>
      );

      const scriptQuestion = { opt1: t.opt1, opt2: t.opt2, opt3: t.opt3, opt4: t.opt4 };

      const scriptReplyBody = (key) => {
        switch (key) {
          case 'opt1':
            return (
              <>
                {t.opt1ReplyLead}
                <button
                  type="button"
                  onClick={() => {
                    setLegalInitialTab('commission');
                    setLegalOpen(true);
                  }}
                  className={linkInBubbleClass}
                >
                  {t.linkPolicy}
                </button>
                {t.opt1ReplyTail}
              </>
            );
          case 'opt2':
            return <span className="whitespace-normal">{t.opt2Reply}</span>;
          case 'opt3':
            return (
              <>
                {t.opt3ReplyLead}
                <Link to={`${collabPrefix}#hot-news`} className={linkInBubbleClass}>
                  {t.opt3LinkNews}
                </Link>
                {t.opt3ReplyTail}
              </>
            );
          case 'opt4':
            return (
              <span className="block space-y-1 whitespace-normal">
                <span className="block">{t.opt4ContactIntro}</span>
                <span className="block">
                  📞 Hotline:{' '}
                  <a href="tel:+84972899728" className={linkInBubbleClass}>
                    {t.opt4HotlineVn}
                  </a>{' '}
                  (🇻🇳) —{' '}
                  <a href="tel:+819094411975" className={linkInBubbleClass}>
                    {t.opt4HotlineJp}
                  </a>{' '}
                  (🇯🇵)
                </span>
                <span className="block">
                  💬{' '}
                  <ChipLink
                    href={FACEBOOK_JOBSHERE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkInBubbleClass}
                  >
                    {t.opt4Facebook}
                  </ChipLink>
                </span>
              </span>
            );
          default:
            return null;
        }
      };

      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2 scroll-pt-4">
          <div className="space-y-2">
            {bubbleAgent(t.greeting(displayName))}

            {scriptTurns.map((turn) => (
              <React.Fragment key={turn.id}>
                {bubbleUser(scriptQuestion[turn.key])}
                {bubbleAgent(scriptReplyBody(turn.key))}
              </React.Fragment>
            ))}
            <div ref={scriptThreadEndRef} className="h-px w-full shrink-0" />
          </div>
        </div>
      );
    }

    return null;
  };

  /** Vùng dưới: chip script / nhập chat admin */
  const renderBottomPanel = () => {
    if (tab === 'messages' && hasLiveThread) {
      return (
        <div className="shrink-0 border-t border-[#ececf0] bg-white px-2 py-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendLive()}
              placeholder={t.chatPlaceholder}
              className="min-w-0 flex-1 rounded-full border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[10px] text-[#111827] caret-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#d1d5db] focus:bg-white"
            />
            <button
              type="button"
              onClick={sendLive}
              disabled={sending || !liveInput.trim() || !sessionToken}
              className="shrink-0 rounded-full bg-[#ED212F] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {t.send}
            </button>
          </div>
        </div>
      );
    }

    if (tab === 'messages' && !hasLiveThread) {
      return (
        <div className="shrink-0 border-t border-[#ececf0] bg-white px-2 py-2">
          <button
            type="button"
            disabled={sending || !firstLiveInput.trim()}
            onClick={submitFirstMessage}
            className="flex w-full items-center justify-center gap-1 rounded-full bg-[#FACC15] py-2 text-[10px] font-bold leading-tight text-black shadow-lg shadow-amber-200/60 transition hover:bg-[#eab308] disabled:opacity-50"
          >
            {connecting ? t.connecting : t.startChat}
          </button>
        </div>
      );
    }

    if (tab === 'home') {
      return (
        <div className="max-h-[min(46%,260px)] min-h-[88px] shrink-0 bg-[#f2f3f5] px-2 py-1.5">
          <div className="flex max-h-[min(200px,26vh)] flex-wrap content-end justify-end gap-1 overflow-y-auto pb-0.5">
            <SuggestionChip onClick={() => appendScriptTurn('opt1')}>{t.opt1}</SuggestionChip>
            <SuggestionChip onClick={() => appendScriptTurn('opt2')}>{t.opt2}</SuggestionChip>
            <SuggestionChip onClick={() => appendScriptTurn('opt3')}>{t.opt3}</SuggestionChip>
            <SuggestionChip onClick={() => appendScriptTurn('opt4')}>{t.opt4}</SuggestionChip>
          </div>
          <div className="mt-1 flex justify-center">
            <span className="rounded-full border border-[#e5e7eb] bg-white p-1 text-[#9ca3af] shadow-sm">
              <ChevronDown className="h-3 w-3" aria-hidden />
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div
        className="pointer-events-none fixed z-[60]"
        style={{
          left: buttonPosition.x,
          top: buttonPosition.y,
        }}
      >
        <div className="pointer-events-auto relative h-14 w-14 sm:h-[3.75rem] sm:w-[3.75rem]">
          {open && (
            <div
              className="absolute bottom-full right-0 z-[61] mb-2 flex h-[min(520px,calc(100dvh-7.5rem))] w-[min(calc(100vw-1rem),400px)] max-h-[min(520px,calc(100dvh-7.5rem))] flex-col overflow-hidden rounded-2xl border border-[#e8e8ec] bg-white text-[10px] leading-snug text-[#111827] shadow-[0_12px_40px_rgba(15,23,42,0.12)] [color-scheme:light]"
              role="dialog"
              aria-label={t.title}
            >
              <header
                className="flex shrink-0 cursor-grab touch-none items-center gap-1 border-b border-[#f0f0f3] bg-white px-2 py-2 select-none active:cursor-grabbing"
                onMouseDown={handleButtonDragStart}
                onTouchStart={handleButtonDragStart}
              >
                {showHeaderBack ? (
                  <button
                    type="button"
                    onClick={goBackHeader}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#374151] hover:bg-[#f3f4f6]"
                    aria-label={t.back}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="h-7 w-7 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1 text-center">
                  <div className="flex min-w-0 items-center justify-center gap-1.5">
                    <h2 className="truncate text-[11px] font-bold leading-tight tracking-tight text-[#111827]">
                      {tab === 'messages' ? t.chatWithAdminTitle : t.title}
                    </h2>
                    {tab === 'messages' && ctvChatRegistered && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-emerald-800">
                        {t.registeredCtvBadge}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[9px] leading-tight text-[#6b7280]">
                    {tab === 'messages' ? t.chatWithAdminSubtitle : t.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6]"
                  aria-label={t.close}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </header>

          <div className="flex shrink-0 border-b border-[#f0f0f3] bg-white px-1">
            <button
              type="button"
              onClick={() => setTab('home')}
              className={`flex-1 border-b-2 py-1.5 text-center text-[9px] font-semibold leading-tight transition ${
                tab === 'home' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#9ca3af]'
              }`}
            >
              {t.tabHome}
            </button>
            <button
              type="button"
              onClick={() => setTab('messages')}
              className={`relative flex-1 border-b-2 py-1.5 text-center text-[9px] font-semibold leading-tight transition ${
                tab === 'messages' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#9ca3af]'
              }`}
            >
              <span className="relative inline-block">
                {t.tabMessages}
                {unreadAdminCount > 0 && tab !== 'messages' && (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ED212F] px-1 text-[8px] font-bold text-white"
                    aria-hidden
                  >
                    {unreadAdminCount > 9 ? '9+' : unreadAdminCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Phần 1: khung nội dung — flex-1 min-h-0 để không cắt đầu khi cuộn */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f2f3f5]">{renderMessageArea()}</div>

          {/* Phần 2: vùng tương tác cố định */}
          {renderBottomPanel()}
            </div>
          )}

          <button
            ref={buttonRef}
            type="button"
            onMouseDown={handleButtonDragStart}
            onTouchStart={handleButtonDragStart}
            onClick={() => {
              if (dragMoved) return;
              setOpen((o) => !o);
            }}
            className="relative flex h-full w-full items-center justify-center rounded-full bg-[#FACC15] text-black shadow-lg shadow-amber-300/40 transition hover:bg-[#eab308]"
            style={{ cursor: isDraggingButton ? 'grabbing' : 'grab' }}
            aria-label={t.openAria}
          >
            {open ? <ChevronDown className="h-6 w-6 sm:h-7 sm:w-7" /> : <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />}
            {unreadAdminCount > 0 && !(open && tab === 'messages') && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#ED212F] px-1 text-[9px] font-bold leading-none text-white"
                aria-label={`${unreadAdminCount} tin mới`}
              >
                {unreadAdminCount > 9 ? '9+' : unreadAdminCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <LegalPoliciesSlidePanel
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
        mode="threeTabs"
        initialTab={legalInitialTab}
      />
    </>
  );
}

export default CollaboratorLandingChatbot;
