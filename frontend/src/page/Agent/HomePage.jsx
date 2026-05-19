import React from 'react';
import { useNavigate } from 'react-router-dom';
import AgentHomePageSession1 from '../../component/Agent/AgentHomePageSession1';
import AgentHomePageSession2 from '../../component/Agent/AgentHomePageSession2';
import AgentHomePageSession3 from '../../component/Agent/AgentHomePageSession3';
import AgentHomePageSession4 from '../../component/Agent/AgentHomePageSession4';
import AgentHomePageSession4Floating from '../../component/Agent/AgentHomePageSession4Floating';
import AgentHomePageSessionPaymentNomination from '../../component/Agent/AgentHomePageSessionPaymentNomination';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const HomePage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 lg:gap-3 h-full">
        {/* Left Column - Sessions 1, 2, Payment/Nomination, 3 */}
        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2 sm:space-y-3 md:space-y-4 lg:pr-2">
          <AgentHomePageSession3 />
          <AgentHomePageSession1 />
          <AgentHomePageSession2 />
          <AgentHomePageSessionPaymentNomination />
          
        </div>

        {/* Right Column - Session 4 (Desktop only) - thu gọn chiều ngang */}
        <div className="hidden lg:block w-80 max-w-[340px] flex-shrink-0 overflow-y-auto hide-scrollbar">
          <AgentHomePageSession4 />
        </div>
      </div>

      {/* Floating Schedule Button (Mobile only) */}
      <AgentHomePageSession4Floating />
    </>
  );
};

export default HomePage;