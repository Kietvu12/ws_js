import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Target, FileText, Star, ExternalLink, X, Briefcase, Building2, MapPin, DollarSign, Calendar, Users, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService, { normalizePostImageUrl } from '../../services/api';
import { fetchInformationList, startInformationListPolling, stopInformationListPolling } from '../../store/actions/informationListActions';
import AgentJobsPageSession2 from './AgentJobsPageSession2';


const AgentHomePageSession3 = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const { loading, loadingMore, data: tableData = [], pagination = {}, error } = useSelector(
    (state) => state.informationList || {}
  );
  
  // Debug: Log Redux state
  useEffect(() => {
    console.log('[Component] Redux state:', { 
      loading, 
      loadingMore, 
      tableDataLength: tableData?.length, 
      pagination, 
      error,
      tableData: tableData?.slice(0, 3) // Log first 3 items
    });
  }, [loading, loadingMore, tableData, pagination, error]);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalJobs, setModalJobs] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const modalCursorChainRef = useRef([null]);
  const [modalPagination, setModalPagination] = useState({
    page: 1,
    limit: 10,
    hasNext: false,
  });
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null);
  const [hoveredLoadMoreButton, setHoveredLoadMoreButton] = useState(false);
  const [hoveredRetryButton, setHoveredRetryButton] = useState(false);
  const [hoveredCloseButton, setHoveredCloseButton] = useState(false);
  const [hoveredModalLoadMoreButton, setHoveredModalLoadMoreButton] = useState(false);
  const [hoveredJobCardIndex, setHoveredJobCardIndex] = useState(null);
  const [hoveredCloseModalButton, setHoveredCloseModalButton] = useState(false);

  const closeSlidePanel = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedItem(null);
      setModalPage(1);
      setModalJobs([]);
      modalCursorChainRef.current = [null];
      setModalPagination({ page: 1, limit: 10, hasNext: false });
    }, 320);
  };

  // Mở panel với slide-in: khi có selectedItem thì sau 1 frame bật showModal
  useEffect(() => {
    if (!selectedItem) return;
    const id = requestAnimationFrame(() => setShowModal(true));
    return () => cancelAnimationFrame(id);
  }, [selectedItem]);

  // Fetch data on component mount and start polling
  useEffect(() => {
    dispatch(fetchInformationList(1, false));
    dispatch(startInformationListPolling(30000)); // Poll every 30 seconds
    
    // Cleanup: stop polling when component unmounts
    return () => {
      dispatch(stopInformationListPolling());
    };
  }, [dispatch]);

  // Calculate hasMore based on pagination
  const hasMore = React.useMemo(() => {
    const totalPages = Math.max(
      pagination.jobPickups?.totalPages || 0,
      pagination.campaigns?.totalPages || 0,
      pagination.posts?.totalPages || 0
    );
    return totalPages > 1;
  }, [pagination]);

  // Tách dữ liệu thành 3 nhóm: Campaign, Job pick up, News
  const campaigns = React.useMemo(
    () => (tableData || []).filter((item) => item.type === 'campaign'),
    [tableData]
  );
  const jobPickups = React.useMemo(
    () => (tableData || []).filter((item) => item.type === 'job-pickup'),
    [tableData]
  );
  const newsItems = React.useMemo(() => {
    const items = (tableData || []).filter((item) => item.type === 'news');
    return [...items].sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.publishedAt || b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [tableData]);

  const loadMore = () => {
    const nextPage = Math.floor((tableData?.length || 0) / 20) + 1;
    dispatch(fetchInformationList(nextPage, true));
  };

  // Legacy loadData function - kept for backward compatibility but not used
  const loadData = async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const limit = 20; // Tăng limit lên 20 items mỗi loại
      // Lấy items từ mỗi loại
      const [jobPickupsRes, campaignsRes, postsRes] = await Promise.all([
        apiService.getCTVJobPickups({ page, limit, sortBy: 'created_at', sortOrder: 'DESC' }).catch(() => ({ success: false, data: { pickups: [], pagination: {} } })),
        apiService.getCTVCampaigns({ page, limit, status: 1, sortBy: 'created_at', sortOrder: 'DESC' }).catch(() => ({ success: false, data: { campaigns: [], pagination: {} } })),
        apiService.getCTVPosts({ page, limit, status: 2, sortBy: 'published_at', sortOrder: 'DESC' }).catch(() => ({ success: false, data: { posts: [], pagination: {} } }))
      ]);

      const newData = [];
      const newPagination = { ...pagination };
      
      // Lưu pagination info
      if (jobPickupsRes.success && jobPickupsRes.data?.pagination) {
        newPagination.jobPickups = jobPickupsRes.data.pagination;
      }
      if (campaignsRes.success && campaignsRes.data?.pagination) {
        newPagination.campaigns = campaignsRes.data.pagination;
      }
      if (postsRes.success && postsRes.data?.pagination) {
        newPagination.posts = postsRes.data.pagination;
      }
      setPagination(newPagination);

      // Add job pickups
      if (jobPickupsRes.success && jobPickupsRes.data?.pickups) {
        jobPickupsRes.data.pickups.forEach((pickup) => {
          newData.push({
            id: `pickup-${pickup.id}`,
            type: 'job-pickup',
            originalId: pickup.id,
            tag: t.agentHomeJobPickup,
            tagColor: 'bg-yellow-100 text-yellow-700',
            tagIcon: Star,
            title: pickup.name || '',
            date: formatDate(pickup.createdAt),
            description: pickup.description || '',
            action: t.viewDetails || 'Xem chi tiết',
            url: `/agent/jobs?pickupId=${pickup.id}`,
            isNew: isRecent(pickup.createdAt),
          });
        });
      }

      // Add campaigns
      if (campaignsRes.success && campaignsRes.data?.campaigns) {
        console.log(`[Frontend] Campaigns received:`, campaignsRes.data.campaigns.length, campaignsRes.data.campaigns.map(c => ({ id: c.id, name: c.name })));
        campaignsRes.data.campaigns.forEach((campaign) => {
          newData.push({
            id: `campaign-${campaign.id}`,
            type: 'campaign',
            originalId: campaign.id,
            tag: t.agentHomeCampaign,
            tagColor: 'bg-purple-100 text-purple-700',
            tagIcon: Target,
            title: campaign.name || '',
            date: formatDate(campaign.startDate || campaign.createdAt),
            description: campaign.description || '',
            action: t.viewDetails || 'Xem chi tiết',
            url: `/agent/jobs?campaignId=${campaign.id}`,
            isNew: campaign.status === 1 && isRecent(campaign.startDate || campaign.createdAt),
          });
        });
      } else {
        console.log(`[Frontend] Campaigns response:`, campaignsRes);
      }

      // Add posts (news)
      if (postsRes.success && postsRes.data?.posts) {
        postsRes.data.posts.forEach((post) => {
          newData.push({
            id: `post-${post.id}`,
            type: 'news',
            originalId: post.id,
            tag: t.agentHomeNews,
            tagColor: 'bg-blue-100 text-blue-700',
            tagIcon: FileText,
            title: post.title || '',
            date: formatDate(post.publishedAt || post.createdAt),
            description: post.metaDescription || post.content?.substring(0, 100) || '',
            action: t.viewDetails || 'Xem chi tiết',
            url: `/agent/jobs?postId=${post.id}`,
            isNew: isRecent(post.publishedAt || post.createdAt),
          });
        });
      }

      // Sort by date (newest first) và loại bỏ duplicate
      newData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB - dateA;
      });

      // Loại bỏ duplicate dựa trên id
      const uniqueData = [];
      const seenIds = new Set();
      newData.forEach(item => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueData.push(item);
        } else {
          console.log(`[Frontend] Duplicate found and removed:`, item.id, item.title);
        }
      });
      
      console.log(`[Frontend] Total items before unique: ${newData.length}, after unique: ${uniqueData.length}`);
      console.log(`[Frontend] Campaigns in final data:`, uniqueData.filter(item => item.type === 'campaign').map(item => ({ id: item.id, title: item.title })));

      if (append) {
        setTableData(prev => {
          const combined = [...prev, ...uniqueData];
          // Loại bỏ duplicate trong combined data
          const seen = new Set();
          return combined.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
      } else {
        setTableData(uniqueData);
      }

      // Kiểm tra xem còn dữ liệu để load không
      const totalPages = Math.max(
        newPagination.jobPickups?.totalPages || 0,
        newPagination.campaigns?.totalPages || 0,
        newPagination.posts?.totalPages || 0
      );
      setHasMore(page < totalPages);
    } catch (error) {
      console.error('Error loading data:', error);
      if (!append) {
        setTableData([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(
      language === 'vi' ? 'vi-VN' : language === 'en' ? 'en-US' : 'ja-JP',
      { year: 'numeric', month: '2-digit', day: '2-digit' }
    );
  };

  const isRecent = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // New if within 7 days
  };

  const pickByLanguage = (viText, enText, jpText) => {
    if (language === 'en') return enText || viText || jpText || '';
    if (language === 'ja') return jpText || enText || viText || '';
    return viText || enText || jpText || '';
  };

  const getLocalizedItemTitle = (item) =>
    pickByLanguage(item?.title, item?.titleEn, item?.titleJp);

  const getLocalizedItemDescription = (item) =>
    pickByLanguage(item?.description, item?.descriptionEn, item?.descriptionJp);

  // Strip HTML tags and format text
  const stripHtml = (html) => {
    if (!html) return '';
    
    // Check if it's already plain text
    if (!html.includes('<')) return html;
    
    try {
      // Create a temporary div element
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      
      // Convert <ul><li> and <ol><li> to bullet points
      const lists = tmp.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = list.querySelectorAll('li');
        const bulletPoints = Array.from(items).map(li => {
          const text = li.textContent.trim();
          return text ? `• ${text}` : '';
        }).filter(Boolean).join('\n');
        
        if (bulletPoints) {
          const textNode = document.createTextNode(bulletPoints);
          if (list.parentNode) {
            list.parentNode.replaceChild(textNode, list);
          }
        } else {
          list.remove();
        }
      });
      
      // Convert <br> to newlines
      const breaks = tmp.querySelectorAll('br');
      breaks.forEach(br => {
        br.replaceWith('\n');
      });
      
      // Convert <p> to newlines
      const paragraphs = tmp.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text) {
          p.replaceWith(`\n${text}\n`);
        } else {
          p.remove();
        }
      });
      
      // Get text content
      let text = tmp.textContent || tmp.innerText || '';
      
      // Clean up extra whitespace and newlines
      text = text
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
        .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
        .trim();
      
      return text;
    } catch (error) {
      console.error('Error stripping HTML:', error);
      // Fallback: simple regex to remove HTML tags
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
  };

  const handleRowClick = async (item, page = 1) => {
    if (item.type === 'news') {
      closeSlidePanel();
      navigate(`/landing/collaborator/blog/${item.originalId}`);
      return;
    }
    if (item.type !== 'campaign' && item.type !== 'job-pickup') {
      setModalJobs([]);
      return;
    }

    if (page === 1) {
      setSelectedItem(item);
      setShowModal(false);
      setModalJobs([]);
      modalCursorChainRef.current = [null];
    }
    setModalLoading(true);

    let chain = modalCursorChainRef.current.slice();
    let targetPage = Math.max(1, parseInt(page, 10) || 1);
    if (targetPage === 1) {
      chain = [null];
    } else if (targetPage > chain.length) {
      targetPage = chain.length;
    }
    let reqCursor = chain[targetPage - 1];
    if (targetPage > 1 && (reqCursor === undefined || reqCursor === null)) {
      targetPage = Math.max(1, chain.length - 1);
      reqCursor = chain[targetPage - 1];
    }

    setModalPage(targetPage);

    const baseParams = {
      limit: 10,
      sortBy: 'id',
      sortOrder: 'DESC'
    };
    if (reqCursor) baseParams.cursor = reqCursor;

    try {
      let response;
      if (item.type === 'campaign') {
        console.log(`[Frontend] Loading jobs for campaign ID: ${item.originalId}`);
        response = await apiService.getCTVJobsByCampaign(item.originalId, baseParams);
        console.log(`[Frontend] Campaign jobs response:`, response);
      } else {
        console.log(`[Frontend] Loading jobs for job pickup ID: ${item.originalId}`);
        response = await apiService.getCTVJobsByJobPickup(item.originalId, baseParams);
        console.log(`[Frontend] Job pickup jobs response:`, response);
      }

      if (response.success && response.data?.jobs) {
        setModalJobs(response.data.jobs);
        const pag = response.data.pagination || {};
        const hasMore = !!pag.hasMore;
        const nextCursor = pag.nextCursor || null;
        const newChain = chain.slice(0, targetPage);
        if (hasMore && nextCursor) {
          newChain.push(nextCursor);
        }
        modalCursorChainRef.current = newChain;
        setModalPagination({
          page: targetPage,
          limit: 10,
          hasNext: hasMore
        });
        setModalPage(targetPage);
      } else {
        if (page === 1) {
          setModalJobs([]);
        }
        modalCursorChainRef.current = [null];
        setModalPagination({ page: targetPage, limit: 10, hasNext: false });
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      if (page === 1) {
        setModalJobs([]);
      }
      modalCursorChainRef.current = [null];
      setModalPagination({ page: 1, limit: 10, hasNext: false });
    } finally {
      setModalLoading(false);
    }
  };

  const loadMoreModalJobs = () => {
    if (selectedItem && modalPagination.hasNext) {
      handleRowClick(selectedItem, modalPage + 1);
    }
  };
  const formatJob = (job) => {
    // Get commission info from jobValues
    // Cấu trúc: job có jobCommissionType ('fixed' hoặc 'percent')
    // jobValues có value (string) chứa giá trị cụ thể
    const jobValues = job.jobValues || job.profits || [];
    let commissionText = t.agentHomeContact;
    
    if (jobValues.length > 0) {
      // Lấy jobValue đầu tiên
      const firstJobValue = jobValues[0];
      
      // Lấy giá trị từ jobValue.value
      const value = firstJobValue.value;
      const commissionType = job.jobCommissionType || 'fixed';
      
      if (value) {
        if (commissionType === 'fixed' || commissionType === 'percent') {
          // Nếu là fixed, giá trị là số tiền
          if (commissionType === 'fixed') {
            const amount = parseInt(value) || 0;
            if (amount > 0) {
              commissionText = `${amount.toLocaleString('vi-VN')} yên`;
            }
          } else if (commissionType === 'percent') {
            // Nếu là percent, giá trị có thể là string như "5%" hoặc số
            if (typeof value === 'string' && value.includes('%')) {
              commissionText = value;
            } else {
              const percent = parseFloat(value) || 0;
              if (percent > 0) {
                commissionText = `${percent}%`;
              }
            }
          }
        }
      }
      
      // Fallback: Nếu có settings (cho tương thích với API cũ)
      if (commissionText === t.agentHomeContact && firstJobValue.settings && typeof firstJobValue.settings === 'object') {
        const settings = firstJobValue.settings;
        const settingKeys = Object.keys(settings);
        
        if (settingKeys.length > 0) {
          const firstValue = settings[settingKeys[0]];
          const type = firstJobValue.type;
          
          if (type === 1) {
            // Phí cố định
            const amount = parseInt(firstValue) || 0;
            if (amount > 0) {
              commissionText = `${amount.toLocaleString('vi-VN')} yên`;
            }
          } else if (type === 2) {
            // Phí %
            if (typeof firstValue === 'string') {
              commissionText = firstValue;
            } else {
              commissionText = `${firstValue}%`;
            }
          }
        }
      }
    }

    return {
      id: job.id,
      jobCode: job.jobCode || job.id,
      title: job.title || '',
      category: job.category?.name || '',
      company: job.company?.name || '',
      workLocation: stripHtml(job.workLocation || ''),
      estimatedSalary: stripHtml(job.estimatedSalary || ''),
      commission: commissionText,
      isHot: job.isHot,
      isPinned: job.isPinned,
    };
  };

  const getTagColorClass = (color) => {
    const colorMap = {
      green: 'bg-green-50 text-green-700 border-green-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return colorMap[color] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getTagInlineStyle = (tagColorClass) => {
    // Map các tagColor class từ code cũ sang inline styles
    if (tagColorClass.includes('bg-yellow-100')) {
      return { backgroundColor: '#fef3c7', color: '#a16207', borderColor: '#fde047' };
    } else if (tagColorClass.includes('bg-purple-100')) {
      return { backgroundColor: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' };
    } else if (tagColorClass.includes('bg-blue-100')) {
      return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' };
    } else if (tagColorClass.includes('bg-green-50')) {
      return { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' };
    } else if (tagColorClass.includes('bg-orange-50')) {
      return { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' };
    } else if (tagColorClass.includes('bg-blue-50')) {
      return { backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' };
    } else {
      return { backgroundColor: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' };
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white rounded-sm sm:rounded-md border border-gray-100 shadow-[0_4px_18px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="border-b border-gray-100 px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 bg-slate-50">
          <div className="h-4 sm:h-5 rounded w-1/4 animate-pulse bg-slate-100" />
        </div>
        <div className="p-2 sm:p-2.5 md:p-3">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 sm:h-14 rounded animate-pulse bg-slate-50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-sm sm:rounded-md border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 bg-slate-50">
          <h3 className="text-[10px] sm:text-xs font-semibold text-gray-900">{t.informationList || 'Danh sách thông tin'}</h3>
        </div>
        <div className="p-6 text-center">
          <p className="mb-2 text-sm text-red-600">{t.agentHomeErrorOccurred}</p>
          <p className="text-[11px] sm:text-xs text-gray-500">{error}</p>
          <button
            onClick={() => dispatch(fetchInformationList(1, false))}
            onMouseEnter={() => setHoveredRetryButton(true)}
            onMouseLeave={() => setHoveredRetryButton(false)}
            className="mt-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {t.agentHomeRetry}
          </button>
        </div>
      </div>
    );
  }

  // Màu gradient cho card (xoay vòng 3 kiểu: tím, xanh indigo, hồng)
  const productCardThemes = [
    { gradient: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 50%, #c4b5fd 100%)', accent: 'rgba(167,139,250,0.4)' },
    { gradient: 'linear-gradient(135deg, #312e81 0%, #3730a3 50%, #4338ca 100%)', accent: 'rgba(199,210,254,0.5)' },
    { gradient: 'linear-gradient(135deg, #f472b6 0%, #fb7185 50%, #fda4af 100%)', accent: 'rgba(251,207,232,0.5)' },
  ];

  const renderBlock = (title, items, defaultIcon) => (
    <div className="flex flex-col h-full min-h-0 rounded-lg border border-slate-100 overflow-hidden bg-slate-50/50">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 flex-shrink-0 bg-slate-50">
        <h3 className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-slate-700">{title}</h3>
        {items.length > 0 && (
          <span className="text-[9px] text-slate-500">{items.length}{language === 'ja' ? '件' : ''}</span>
        )}
      </div>
      {items.length > 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto max-h-[180px] sm:max-h-[200px]">
          <div className="grid grid-cols-1 gap-1.5 p-1.5">
            {items.map((item) => {
              const iconMap = { 'Star': Star, 'Target': Target, 'FileText': FileText };
              const Icon = iconMap[item.tagIcon] || defaultIcon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  onMouseEnter={() => setHoveredCardIndex(item.id)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  className={`border rounded-md p-2 transition-all cursor-pointer bg-white hover:border-blue-200 hover:shadow-sm ${
                    hoveredCardIndex === item.id ? 'border-blue-200 shadow-sm' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <div className="p-1 rounded flex-shrink-0" style={getTagInlineStyle(item.tagColor)}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                    <h4 className={`text-[9px] sm:text-[10px] ${item.isNew ? 'font-semibold' : 'font-medium'} leading-tight line-clamp-1 text-slate-900`}>
                      {getLocalizedItemTitle(item)}
                    </h4>
                      <span className="text-[8px] sm:text-[9px] mt-0.5 block text-slate-500">{item.date}</span>
                      {getLocalizedItemDescription(item) && (
                        <p className="text-[8px] sm:text-[9px] leading-snug line-clamp-2 mt-0.5 text-slate-500">
                          {stripHtml(getLocalizedItemDescription(item))}
                        </p>
                      )}
                      {item.isNew && (
                        <span className="inline-block mt-1 px-1 py-0.5 text-white text-[8px] font-semibold rounded bg-red-500">{t.new || 'Mới'}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-2">
          <p className="text-[9px] sm:text-[10px] text-slate-400">{t.noData || 'Không có dữ liệu'}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full rounded-sm sm:rounded-md overflow-hidden">
      {jobPickups.length > 0 && (
        <div className="px-2 sm:px-2.5 md:px-3 pt-2 pb-3 border-b border-slate-100">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
            {t.agentHomeJobPickup}
          </h3>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
            {jobPickups.map((item, index) => {
              const theme = productCardThemes[index % productCardThemes.length];
              const coverSrc = item.coverUrl || item.cover_url;
              return (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  onMouseEnter={() => setHoveredCardIndex(item.id)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  className={`flex-shrink-0 w-[160px] sm:w-[200px] rounded-xl border overflow-hidden transition-all cursor-pointer bg-white shadow-sm hover:shadow-md ${
                    hoveredCardIndex === item.id ? 'border-blue-300 shadow-md ring-1 ring-blue-200' : 'border-slate-100'
                  }`}
                >
                  {/* Phần graphic / thumbnail — ưu tiên ảnh cover từ admin */}
                  <div
                    className="h-24 sm:h-28 relative overflow-hidden bg-slate-100"
                    style={!coverSrc ? { background: theme.gradient } : undefined}
                  >
                    {coverSrc ? (
                      <img
                        src={normalizePostImageUrl(coverSrc)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 flex items-start justify-start p-2 sm:p-3 gap-1">
                          <span className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: theme.accent }} />
                          <span className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: theme.accent }} />
                          <span className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: theme.accent }} />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                          <div className="h-1.5 flex-1 rounded opacity-60" style={{ backgroundColor: theme.accent }} />
                          <div className="h-3 w-8 rounded opacity-50" style={{ backgroundColor: theme.accent }} />
                        </div>
                      </>
                    )}
                  </div>
                  {/* Phần text trắng */}
                  <div className="p-2.5 sm:p-3 bg-white">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 flex items-center gap-0.5">
                      {item.date}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </p>
                    <h4 className={`text-xs sm:text-sm font-bold text-slate-900 leading-tight line-clamp-2 ${item.isNew ? 'text-amber-700' : ''}`}>
                      {getLocalizedItemTitle(item)}
                    </h4>
                    {item.isNew && (
                      <span className="inline-block mt-1.5 px-1.5 py-0.5 text-white text-[9px] font-semibold rounded bg-red-500">
                        {t.new || 'Mới'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="px-2 sm:px-2.5 md:px-3 pt-2 pb-3 border-b border-slate-100">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
            {t.campaign || 'Campaign'}
          </h3>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
            {campaigns.map((item, index) => {
              const theme = productCardThemes[index % productCardThemes.length];
              const coverSrc = item.coverUrl || item.cover_url;
              return (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  onMouseEnter={() => setHoveredCardIndex(item.id)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  className={`flex-shrink-0 w-[160px] sm:w-[200px] rounded-xl border overflow-hidden transition-all cursor-pointer bg-white shadow-sm hover:shadow-md ${
                    hoveredCardIndex === item.id ? 'border-blue-300 shadow-md ring-1 ring-blue-200' : 'border-slate-100'
                  }`}
                >
                  <div
                    className="h-24 sm:h-28 relative overflow-hidden bg-slate-100"
                    style={!coverSrc ? { background: theme.gradient } : undefined}
                  >
                    {coverSrc ? (
                      <img
                        src={normalizePostImageUrl(coverSrc)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 flex items-start justify-start p-2 sm:p-3 gap-1">
                          <span className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: theme.accent }} />
                          <span className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: theme.accent }} />
                          <span className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: theme.accent }} />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                          <div className="h-1.5 flex-1 rounded opacity-60" style={{ backgroundColor: theme.accent }} />
                          <div className="h-3 w-8 rounded opacity-50" style={{ backgroundColor: theme.accent }} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 flex items-center gap-0.5">
                      {item.date}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </p>
                    <h4 className={`text-xs sm:text-sm font-bold text-slate-900 leading-tight line-clamp-2 ${item.isNew ? 'text-amber-700' : ''}`}>
                      {getLocalizedItemTitle(item)}
                    </h4>
                    {item.isNew && (
                      <span className="inline-block mt-1.5 px-1.5 py-0.5 text-white text-[9px] font-semibold rounded bg-red-500">
                        {t.new || 'Mới'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 p-2 sm:p-2.5 md:p-3 border-b border-slate-100 bg-slate-50/30">
        {renderBlock(t.news || 'News', newsItems, FileText)}
      </div>

      {/* Slide-in panel từ bên trái (thay pop-up) */}
      {selectedItem && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${showModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closeSlidePanel}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out ${
              showModal ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 p-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {selectedItem.tagIcon && (() => {
                  const iconMap = { 'Star': Star, 'Target': Target, 'FileText': FileText };
                  const IconComponent = iconMap[selectedItem.tagIcon] || FileText;
                  return (
                    <div className="p-1.5 rounded-lg flex-shrink-0 border border-slate-100" style={getTagInlineStyle(selectedItem.tagColor)}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate text-gray-900">{getLocalizedItemTitle(selectedItem)}</h3>
                  {modalJobs.length > 0 && (
                    <p className="text-[10px] text-gray-500">
                      {t.agentHomeTotalJobs.replace(
                        '{count}',
                        String(modalJobs.length) + (modalPagination.hasNext ? '+' : '')
                      )}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeSlidePanel}
                onMouseEnter={() => setHoveredCloseModalButton(true)}
                onMouseLeave={() => setHoveredCloseModalButton(false)}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(selectedItem.coverUrl || selectedItem.cover_url) && (
              <div className="flex-shrink-0 w-full h-36 sm:h-40 border-b border-slate-100 bg-slate-100">
                <img
                  src={normalizePostImageUrl(selectedItem.coverUrl || selectedItem.cover_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto flex flex-col min-h-0 p-2 sm:p-3">
              {modalLoading && modalJobs.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  {t.loading}
                </div>
              ) : modalJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium text-gray-600">{t.agentHomeNoJobs}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.agentHomeNoJobsRelated}</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-[min(50dvh,420px)] w-full lg:min-h-0">
                    <AgentJobsPageSession2
                      jobs={modalJobs}
                      showAllJobs
                      hideViewMoreButton
                      onJobClick={(job) => {
                        closeSlidePanel();
                        navigate(`/agent/jobs/${job.id}`, {
                          state: { returnTo: '/agent' },
                        });
                      }}
                    />
                  </div>
                  {(modalPage > 1 || modalPagination.hasNext) && (
                    <div className="pt-3 pb-2 flex items-center justify-center gap-2 border-t border-slate-100 mt-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => selectedItem && modalPage > 1 && handleRowClick(selectedItem, modalPage - 1)}
                        disabled={modalLoading || modalPage <= 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-slate-600 min-w-[120px] text-center">
                        {language === 'vi'
                          ? `Trang ${modalPage}`
                          : language === 'en'
                            ? `Page ${modalPage}`
                            : `ページ ${modalPage}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectedItem && modalPagination.hasNext && handleRowClick(selectedItem, modalPage + 1)}
                        disabled={modalLoading || !modalPagination.hasNext}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentHomePageSession3;
