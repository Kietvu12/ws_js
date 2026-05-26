import React, { useState } from 'react';
import {
  Search, ChevronDown, Eye, Clock, Star, FileText, Download,
  ArrowRight, BookOpen, MessageSquare, Sparkles
} from 'lucide-react';
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_ARTICLES } from './mockData';

const FEATURED_ARTICLE = {
  title: '10 bước xây dựng quy trình tuyển dụng hiệu quả cho doanh nghiệp vừa và nhỏ',
  category: 'Tuyển dụng',
  date: '15/05/2024',
  readTime: 12,
  views: 2400,
  summary: 'Hướng dẫn chi tiết cách xây dựng quy trình tuyển dụng chuyên nghiệp, từ xác định nhu cầu đến onboarding nhân viên mới.',
};

const DOCUMENTS = [
  { title: 'Mẫu JD IT Developer (Song ngữ Việt - Nhật)', type: 'DOCX', size: '2.4 MB', downloads: 856 },
  { title: 'Template đánh giá ứng viên sau phỏng vấn', type: 'Excel', size: '1.8 MB', downloads: 1203 },
  { title: 'Checklist onboarding nhân viên mới', type: 'PDF', size: '3.2 MB', downloads: 967 },
  { title: 'Slide training kỹ năng phỏng vấn', type: 'PPTX', size: '5.6 MB', downloads: 534 },
  { title: 'Mẫu hợp đồng lao động chuẩn 2024', type: 'DOCX', size: '1.1 MB', downloads: 1456 },
];

const RECOMMENDED_DOCS = [
  'Hướng dẫn sử dụng Scout Credit hiệu quả',
  'Cách tối ưu JD để thu hút ứng viên',
  'Template đánh giá hiệu suất nhân viên',
  'Mẫu KPI cho phòng tuyển dụng',
];

const NEW_DOCS = [
  { title: 'Luật lao động sửa đổi Q2/2024', date: '20/05/2024', isNew: true },
  { title: 'Báo cáo thị trường lao động IT 2024', date: '18/05/2024', isNew: true },
  { title: 'Hướng dẫn Sàn CTV mới cập nhật', date: '15/05/2024', isNew: true },
  { title: 'Template bảng lương theo vùng', date: '12/05/2024', isNew: false },
];

const TYPE_COLORS = {
  'DOCX': { bg: '#fef2f2', color: '#dc2626' },
  'Excel': { bg: '#fee2e2', color: '#b91c1c' },
  'PDF': { bg: '#fecaca', color: '#991b1b' },
  'PPTX': { bg: '#fef2f2', color: '#ef4444' },
};

const CATEGORY_COLORS = {
  'Tuyển dụng': { bg: '#fef2f2', color: '#dc2626' },
  'Quản trị nhân sự': { bg: '#fee2e2', color: '#b91c1c' },
  'Phát triển đội ngũ': { bg: '#fecaca', color: '#991b1b' },
  'Pháp lý & Tuân thủ': { bg: '#fef2f2', color: '#ef4444' },
  'Kỹ năng nghề nghiệp': { bg: '#fee2e2', color: '#dc2626' },
  'Khác': { bg: '#F3F4F6', color: '#6B7280' },
};

export default function CompanyKnowledge() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="bg-gray-50 p-3 sm:p-5 lg:p-6">
      {/* Search bar */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 w-full sm:w-auto">
            Danh mục <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Category Icons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 sm:mb-6">
        {KNOWLEDGE_CATEGORIES.map((cat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center hover:border-red-300 cursor-pointer transition-colors"
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <div className="text-xs font-medium text-gray-900">{cat.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{cat.count} bài viết</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="w-full lg:flex-1 lg:max-w-[65%]">
          {/* Featured Article */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 px-4 sm:px-6 pt-4 sm:pt-6 pb-3">Bài viết nổi bật</h2>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-red-100 to-red-100 p-4 sm:p-8 mb-4">
                <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                  NỔI BẬT
                </span>
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                    >
                      {FEATURED_ARTICLE.category}
                    </span>
                    <span className="text-xs text-gray-500">{FEATURED_ARTICLE.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{FEATURED_ARTICLE.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{FEATURED_ARTICLE.summary}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {FEATURED_ARTICLE.readTime} phút đọc</span>
                    <span className="flex items-center gap-1"><Eye size={12} /> {FEATURED_ARTICLE.views.toLocaleString()} lượt xem</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Article List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-4 sm:mb-6">
            <div className="space-y-4">
              {KNOWLEDGE_ARTICLES.map((article) => {
                const catStyle = CATEGORY_COLORS[article.category] || { bg: '#F3F4F6', color: '#6B7280' };
                return (
                  <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: catStyle.bg, color: catStyle.color }}
                        >
                          {article.category}
                        </span>
                        <span className="text-xs text-gray-400">{article.date}</span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">{article.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {article.readTime} phút</span>
                        <span className="flex items-center gap-1"><Eye size={11} /> {article.views.toLocaleString()}</span>
                        {article.featured && (
                          <span className="flex items-center gap-1 text-red-500"><Star size={11} /> Nổi bật</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <a href="#" className="flex items-center gap-1 text-sm text-red-600 hover:underline mt-4">
              Xem tất cả bài viết nổi bật <ArrowRight size={14} />
            </a>
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Tài liệu & Mẫu biểu hữu ích</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOCUMENTS.map((doc, i) => {
                const typeStyle = TYPE_COLORS[doc.type] || { bg: '#F3F4F6', color: '#6B7280' };
                return (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-red-200 cursor-pointer">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: typeStyle.bg }}
                    >
                      <FileText size={16} style={{ color: typeStyle.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span style={{ color: typeStyle.color }}>{doc.type}</span>
                        <span>·</span>
                        <span>{doc.size}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Download size={10} /> {doc.downloads}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[35%]">
          {/* Recommended Docs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-red-500" />
              Tài liệu nổi bật cho bạn
            </h3>
            <div className="space-y-2">
              {RECOMMENDED_DOCS.map((doc, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <BookOpen size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{doc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tài liệu mới cập nhật</h3>
            <div className="space-y-3">
              {NEW_DOCS.map((doc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 truncate">{doc.title}</span>
                      {doc.isNew && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded flex-shrink-0">
                          Mới
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{doc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Card */}
          <div className="bg-gradient-to-br from-red-50 to-red-50 rounded-xl border border-red-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900">Góp ý & Yêu cầu tài liệu</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Bạn cần tài liệu về chủ đề nào? Hãy gửi yêu cầu và chúng tôi sẽ bổ sung vào Knowledge Hub.
            </p>
            <button className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              Gửi yêu cầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
