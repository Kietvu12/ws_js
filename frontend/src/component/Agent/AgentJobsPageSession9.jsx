import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Copy,
  Download,
  Heart,
  MessageCircle,
  Briefcase,
  Users,
  Building2,
  FileText,
  DollarSign,
  HelpCircle,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const AgentJobsPageSession9 = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [activeTocItem, setActiveTocItem] = useState('applicationRequirements');
  const downloadMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  const handleRecommendCandidate = () => {
    // TODO: Implement recommend candidate functionality
    console.log('Recommend candidate');
  };

  const handleCopyJobURL = () => {
    // TODO: Implement copy job URL functionality
    console.log('Copy job URL');
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Download');
  };

  const handleKeep = () => {
    // TODO: Implement keep/save functionality
    console.log('Keep job');
  };

  const handleAskQuestion = () => {
    // TODO: Implement ask question functionality
    console.log('Ask question');
  };

  const tocItems = [
    {
      id: 'applicationRequirements',
      icon: Briefcase,
      label: t.applicationRequirements,
      isActive: activeTocItem === 'applicationRequirements',
    },
    {
      id: 'selectionInformation',
      icon: Users,
      label: t.selectionInformation,
      isActive: activeTocItem === 'selectionInformation',
    },
    {
      id: 'companyInformation',
      icon: Building2,
      label: t.companyInformation,
      isActive: activeTocItem === 'companyInformation',
    },
    {
      id: 'jobSummary',
      icon: FileText,
      label: t.jobSummary,
      isActive: activeTocItem === 'jobSummary',
    },
    {
      id: 'referralFeeInformation',
      icon: DollarSign,
      label: t.referralFeeInformation,
      isActive: activeTocItem === 'referralFeeInformation',
    },
    {
      id: 'questionsAtRecommendation',
      icon: HelpCircle,
      label: t.questionsAtRecommendation,
      isActive: activeTocItem === 'questionsAtRecommendation',
    },
    {
      id: 'similarJobs',
      icon: Briefcase,
      label: t.similarJobs,
      isActive: activeTocItem === 'similarJobs',
    },
  ];

  return (
    <div className="w-80 bg-white rounded-lg border border-gray-200 p-5 space-y-6">
      {/* Action Buttons Section */}
      <div className="space-y-2.5">
        {/* Recommend Candidate Button - Primary */}
        <button
          onClick={handleRecommendCandidate}
          className="w-full flex items-center justify-start gap-2.5 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-blue-700 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <UserPlus className="w-5 h-5 flex-shrink-0" />
          <span className="leading-tight">{t.recommendCandidate}</span>
        </button>

        {/* Copy Job URL Button */}
        <button
          onClick={handleCopyJobURL}
          className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 transition-all duration-200"
        >
          <Copy className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight">{t.copyJobURL}</span>
        </button>

        {/* Download Button with Dropdown */}
        <div className="relative" ref={downloadMenuRef}>
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="leading-tight">{t.download}</span>
            </div>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${showDownloadMenu ? 'rotate-180' : ''}`} />
          </button>
          {showDownloadMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => {
                  handleDownload();
                  setShowDownloadMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.downloadPDF}
              </button>
              <button
                onClick={() => {
                  handleDownload();
                  setShowDownloadMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
              >
                {t.downloadExcel}
              </button>
            </div>
          )}
        </div>

        {/* Keep Button */}
        <button
          onClick={handleKeep}
          className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 transition-all duration-200"
        >
          <Heart className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight">{t.keep}</span>
        </button>

        {/* Ask Question Button */}
        <button
          onClick={handleAskQuestion}
          className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 transition-all duration-200"
        >
          <MessageCircle className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight">{t.askQuestion}</span>
        </button>
      </div>

      {/* Table of Contents Section */}
      <div className="border-t border-gray-200 pt-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">{t.tableOfContents}</h3>
        <div className="space-y-0.5">
          {tocItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTocItem(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  item.isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${item.isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-sm ${item.isActive ? 'font-semibold' : 'font-medium'} leading-tight text-left`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentJobsPageSession9;

