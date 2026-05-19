import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, AlertTriangle, CheckCircle, FileText, User, GraduationCap, Briefcase, Award, MapPin, Phone, Mail, Calendar, Upload, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';


const NominationModal = ({ isOpen, onClose, jobId, jobTitle }) => {
  const { language } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' or 'new'
  const [cvStorages, setCvStorages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCvId, setSelectedCvId] = useState(null);
  
  // Form data for new CV
  const [formData, setFormData] = useState({
    nameKanji: '',
    nameKana: '',
    birthDate: '',
    age: '',
    gender: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    educations: [],
    workExperiences: [],
    technicalSkills: '',
    certificates: [],
    careerSummary: '',
    strengths: '',
    motivation: '',
    currentSalary: '',
    desiredSalary: '',
    desiredPosition: '',
    desiredLocation: '',
    desiredStartDate: '',
  });
  const [cvFiles, setCvFiles] = useState([]);
  const [cvPreviews, setCvPreviews] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0 });
  const [parseError, setParseError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Hover states
  const [hoveredCloseButton, setHoveredCloseButton] = useState(false);
  const [hoveredTabExisting, setHoveredTabExisting] = useState(false);
  const [hoveredTabNew, setHoveredTabNew] = useState(false);
  const [hoveredCvCardIndex, setHoveredCvCardIndex] = useState(null);
  const [hoveredRemoveCvButtonIndex, setHoveredRemoveCvButtonIndex] = useState(null);
  const [hoveredAddFileButton, setHoveredAddFileButton] = useState(false);
  const [hoveredRemoveEducationIndex, setHoveredRemoveEducationIndex] = useState(null);
  const [hoveredAddEducationButton, setHoveredAddEducationButton] = useState(false);
  const [hoveredRemoveEmploymentIndex, setHoveredRemoveEmploymentIndex] = useState(null);
  const [hoveredAddEmploymentButton, setHoveredAddEmploymentButton] = useState(false);
  const [hoveredRemoveCertificateIndex, setHoveredRemoveCertificateIndex] = useState(null);
  const [hoveredAddCertificateButton, setHoveredAddCertificateButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSubmitButton, setHoveredSubmitButton] = useState(false);

  // API Base URL for CV parsing
  const API_BASE_URL = 'https://unboiled-nonprescriptive-hiedi.ngrok-free.dev';

  useEffect(() => {
    if (isOpen && activeTab === 'existing') {
      loadCVStorages();
    }
  }, [isOpen, activeTab]);

  const loadCVStorages = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCVStorages({ 
        page: 1, 
        limit: 50,
        isDuplicate: '0' // Only show non-duplicate CVs
      });
      if (response.success && response.data?.cvStorages) {
        setCvStorages(response.data.cvStorages);
      }
    } catch (error) {
      console.error('Error loading CV storages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check duplicate when key fields change
    if (['nameKanji', 'email', 'phone', 'birthDate'].includes(name)) {
      checkDuplicate();
    }
  };

  const checkDuplicate = async () => {
    if (!formData.nameKanji && !formData.email && !formData.phone) {
      return;
    }

    try {
      setCheckingDuplicate(true);
      const response = await apiService.checkDuplicateCV({
        name: formData.nameKanji,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate
      });

      if (response.success && response.data) {
        setIsDuplicate(response.data.isDuplicate);
        setDuplicateInfo(response.data);
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Helper function to merge parsed data with form structure
  const mergeResumeData = (parsedData) => {
    setFormData(prev => ({
      ...prev,
      nameKanji: parsedData.personal_info?.full_name_kanji || prev.nameKanji,
      nameKana: parsedData.personal_info?.full_name_kana || prev.nameKana,
      birthDate: parsedData.personal_info?.dob || prev.birthDate,
      age: parsedData.personal_info?.age || prev.age,
      gender: parsedData.personal_info?.gender || prev.gender,
      postalCode: parsedData.personal_info?.contact?.postal_code || prev.postalCode,
      address: parsedData.personal_info?.contact?.address || prev.address,
      phone: parsedData.personal_info?.contact?.phone || prev.phone,
      email: parsedData.personal_info?.contact?.email || prev.email,
      educations: parsedData.education_history?.length > 0 
        ? parsedData.education_history.map(edu => ({
            year: edu.year || '',
            month: edu.month || '',
            content: edu.content || ''
          }))
        : prev.educations,
      workExperiences: parsedData.employment_history_details?.length > 0
        ? parsedData.employment_history_details.map(emp => ({
            period: emp.period || '',
            company_name: emp.company_name || '',
            business_purpose: emp.business_purpose || '',
            scale_role: emp.scale_role || '',
            description: emp.description || '',
            tools_tech: emp.tools_tech || ''
          }))
        : prev.workExperiences,
      technicalSkills: parsedData.skills_and_certifications?.technical_skills || prev.technicalSkills,
      certificates: parsedData.skills_and_certifications?.licenses?.length > 0
        ? parsedData.skills_and_certifications.licenses.map(lic => ({
            year: lic.year || '',
            month: lic.month || '',
            name: lic.name || ''
          }))
        : prev.certificates,
      careerSummary: parsedData.self_promotion?.job_summary || prev.careerSummary,
      strengths: parsedData.self_promotion?.self_pr || prev.strengths,
      motivation: parsedData.self_promotion?.motivation || prev.motivation,
      currentSalary: parsedData.preferences?.current_salary || prev.currentSalary,
      desiredSalary: parsedData.preferences?.desired_salary || prev.desiredSalary,
      desiredPosition: parsedData.preferences?.desired_job || prev.desiredPosition,
      desiredLocation: parsedData.preferences?.desired_location || prev.desiredLocation,
      desiredStartDate: parsedData.preferences?.start_date || prev.desiredStartDate,
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter PDF files only
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      setParseError('Vui lòng chọn file PDF');
      return;
    }

    // Add files to state
    setCvFiles(prev => [...prev, ...pdfFiles]);
    setParseError(null);
    setParseSuccess(null);

    // Create previews for new files
    pdfFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvPreviews(prev => [...prev, { name: file.name, url: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    // Parse all PDF files sequentially
    setIsParsing(true);
    setParseProgress({ current: 0, total: pdfFiles.length });

    let successCount = 0;
    let errorMessages = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setParseProgress({ current: i + 1, total: pdfFiles.length });

      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await fetch(`${API_BASE_URL}/resume/parse`, {
          method: 'POST',
          body: formDataUpload,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Lỗi khi phân tích ${file.name}`);
        }

        const resumeData = await response.json();
        console.log(`Parsed ResumeData from ${file.name}:`, resumeData);

        // Merge parsed data into form
        mergeResumeData(resumeData);
        successCount++;
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
        errorMessages.push(`${file.name}: ${err.message}`);
      }
    }

    setIsParsing(false);

    if (successCount > 0) {
      setParseSuccess(`Đã trích xuất dữ liệu từ ${successCount}/${pdfFiles.length} file CV thành công!`);
    }
    if (errorMessages.length > 0) {
      setParseError(errorMessages.join('\n'));
    }
  };

  const handleRemoveCV = (index) => {
    if (index !== undefined) {
      // Remove specific file
      setCvFiles(prev => prev.filter((_, i) => i !== index));
      setCvPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove all files
      setCvFiles([]);
      setCvPreviews([]);
    }
    setParseError(null);
    setParseSuccess(null);
  };

  // Education handlers
  const handleAddEducation = () => {
    setFormData(prev => ({
      ...prev,
      educations: [...prev.educations, { year: '', month: '', content: '' }]
    }));
  };

  const updateEducation = (index, field, value) => {
    const updated = [...formData.educations];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, educations: updated }));
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };

  // Employment handlers
  const handleAddWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      workExperiences: [...prev.workExperiences, {
        period: '',
        company_name: '',
        business_purpose: '',
        scale_role: '',
        description: '',
        tools_tech: ''
      }]
    }));
  };

  const updateEmployment = (index, field, value) => {
    const updated = [...formData.workExperiences];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, workExperiences: updated }));
  };

  const removeEmployment = (index) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.filter((_, i) => i !== index)
    }));
  };

  // Certificate handlers
  const handleAddCertificate = () => {
    setFormData(prev => ({
      ...prev,
      certificates: [...prev.certificates, { year: '', month: '', name: '' }]
    }));
  };

  const updateCertificate = (index, field, value) => {
    const updated = [...formData.certificates];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, certificates: updated }));
  };

  const removeCertificate = (index) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitExisting = async () => {
    if (!selectedCvId) {
      alert(t.selectCV || 'Vui lòng chọn một ứng viên');
      return;
    }

    try {
      setSubmitting(true);
      // Get CV storage details first
      const cvResponse = await apiService.getCVStorageById(selectedCvId);
      
      if (!cvResponse.success || !cvResponse.data?.cvStorage) {
        alert('Không tìm thấy thông tin ứng viên');
        return;
      }

      const cv = cvResponse.data.cvStorage;

      // Check if CV is duplicate
      if (cv.isDuplicate) {
        alert(t.duplicateCVWarning || 'Hồ sơ này đã được đánh dấu là trùng lặp. Không thể tiến cử.');
        return;
      }

      // Create job application with existing CV storage
      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('name', cv.name || '');
      formData.append('furigana', cv.furigana || '');
      formData.append('email', cv.email || '');
      formData.append('phone', cv.phone || '');
      formData.append('addressCurrent', cv.addressCurrent || '');
      formData.append('birthDate', cv.birthDate || '');
      formData.append('ages', cv.ages || '');
      formData.append('gender', cv.gender || '');
      formData.append('currentIncome', cv.currentIncome || '');
      formData.append('desiredIncome', cv.desiredIncome || '');
      formData.append('desiredWorkLocation', cv.desiredWorkLocation || '');
      formData.append('nyushaTime', cv.nyushaTime || '');
      formData.append('selfPromotion', cv.strengths || '');
      formData.append('reasonApply', cv.motivation || '');
      formData.append('cvType', 1); // Existing CV
      if (cv.code) formData.append('cvCode', cv.code);
      formData.append('cvId', String(cv.id));

      const response = await apiService.createJobApplication(formData);

      if (response.success) {
        alert(t.nominationSuccess || 'Tiến cử thành công!');
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error submitting nomination:', error);
      alert(error.message || 'Có lỗi xảy ra khi tiến cử');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNew = async (e) => {
    e.preventDefault();

    if (!formData.nameKanji || !formData.email) {
      alert(t.requiredFields || 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (isDuplicate) {
      alert(t.duplicateCVWarning || 'Hồ sơ này đã tồn tại trong hệ thống. Không thể tiến cử.');
      return;
    }

    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('jobId', jobId);
      formDataToSend.append('nameKanji', formData.nameKanji);
      formDataToSend.append('nameKana', formData.nameKana);
      formDataToSend.append('birthDate', formData.birthDate);
      formDataToSend.append('age', formData.age);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('postalCode', formData.postalCode);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('educations', JSON.stringify(formData.educations));
      formDataToSend.append('workExperiences', JSON.stringify(formData.workExperiences));
      formDataToSend.append('technicalSkills', formData.technicalSkills);
      formDataToSend.append('certificates', JSON.stringify(formData.certificates));
      formDataToSend.append('careerSummary', formData.careerSummary);
      formDataToSend.append('strengths', formData.strengths);
      formDataToSend.append('motivation', formData.motivation);
      formDataToSend.append('currentSalary', formData.currentSalary);
      formDataToSend.append('desiredSalary', formData.desiredSalary);
      formDataToSend.append('desiredPosition', formData.desiredPosition);
      formDataToSend.append('desiredLocation', formData.desiredLocation);
      formDataToSend.append('desiredStartDate', formData.desiredStartDate);
      
      if (cvFiles.length > 0) {
        cvFiles.forEach((file) => {
          formDataToSend.append('cvFile', file);
        });
      }

      const response = await apiService.createCVStorageAndNominate(formDataToSend);

      if (response.success) {
        if (response.data.isDuplicate) {
          alert(t.duplicateCVWarning || 'Hồ sơ này đã tồn tại trong hệ thống. Không thể tiến cử.');
        } else {
          alert(t.nominationSuccess || 'Tiến cử thành công!');
          onClose();
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error submitting nomination:', error);
      alert(error.message || 'Có lỗi xảy ra khi tiến cử');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCVStorages = cvStorages.filter(cv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (cv.name && cv.name.toLowerCase().includes(search)) ||
      (cv.email && cv.email.toLowerCase().includes(search)) ||
      (cv.code && cv.code.toLowerCase().includes(search))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#111827' }}>
              {t.recommendCandidate || 'Tiến cử ứng viên'}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
              {jobTitle || 'Job Title'}
            </p>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setHoveredCloseButton(true)}
            onMouseLeave={() => setHoveredCloseButton(false)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredCloseButton ? '#f3f4f6' : 'transparent'
            }}
          >
            <X className="w-5 h-5" style={{ color: '#4b5563' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={() => setActiveTab('existing')}
            onMouseEnter={() => setHoveredTabExisting(true)}
            onMouseLeave={() => setHoveredTabExisting(false)}
            className="flex-1 px-6 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'existing' ? '#eff6ff' : (hoveredTabExisting ? '#f9fafb' : 'transparent'),
              color: activeTab === 'existing' ? '#1d4ed8' : (hoveredTabExisting ? '#111827' : '#4b5563'),
              borderBottom: activeTab === 'existing' ? '2px solid #1d4ed8' : '2px solid transparent'
            }}
          >
            {t.selectExistingCV || 'Chọn ứng viên có sẵn'}
          </button>
          <button
            onClick={() => setActiveTab('new')}
            onMouseEnter={() => setHoveredTabNew(true)}
            onMouseLeave={() => setHoveredTabNew(false)}
            className="flex-1 px-6 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'new' ? '#eff6ff' : (hoveredTabNew ? '#f9fafb' : 'transparent'),
              color: activeTab === 'new' ? '#1d4ed8' : (hoveredTabNew ? '#111827' : '#4b5563'),
              borderBottom: activeTab === 'new' ? '2px solid #1d4ed8' : '2px solid transparent'
            }}
          >
            {t.createNewCV || 'Tạo hồ sơ mới'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'existing' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={t.searchCV || 'Tìm kiếm ứng viên...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none"
                  style={{
                    borderColor: '#d1d5db',
                    focusRingColor: '#3b82f6'
                  }}
                />
              </div>

              {/* CV List */}
              {loading ? (
                <div className="text-center py-8" style={{ color: '#6b7280' }}>
                  {t.loading || 'Đang tải...'}
                </div>
              ) : filteredCVStorages.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#6b7280' }}>
                  {t.noCVFound || 'Không tìm thấy ứng viên nào'}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCVStorages.map((cv) => (
                    <div
                      key={cv.id}
                      onClick={() => setSelectedCvId(cv.id)}
                      onMouseEnter={() => setHoveredCvCardIndex(cv.id)}
                      onMouseLeave={() => setHoveredCvCardIndex(null)}
                      className="p-4 border-2 rounded-lg cursor-pointer transition-all"
                      style={{
                        borderColor: selectedCvId === cv.id ? '#3b82f6' : (hoveredCvCardIndex === cv.id ? '#d1d5db' : '#e5e7eb'),
                        backgroundColor: selectedCvId === cv.id ? '#eff6ff' : 'transparent'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#3b82f6' }}>
                            {cv.name ? cv.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-semibold" style={{ color: '#111827' }}>{cv.name || 'N/A'}</p>
                            <p className="text-sm" style={{ color: '#4b5563' }}>{cv.email || 'N/A'}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{cv.code}</p>
                          </div>
                        </div>
                        {selectedCvId === cv.id && (
                          <CheckCircle className="w-5 h-5" style={{ color: '#3b82f6' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitNew} className="space-y-4">
              {/* Duplicate Warning */}
              {isDuplicate && (
                <div className="border-2 rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                  <div className="flex-1">
                    <p className="font-semibold mb-1" style={{ color: '#7f1d1d' }}>
                      {t.duplicateCVDetected || 'Phát hiện hồ sơ trùng lặp'}
                    </p>
                    <p className="text-sm" style={{ color: '#991b1b' }}>
                      {t.duplicateCVWarning || 'Hồ sơ này đã tồn tại trong hệ thống. Bạn không thể tiến cử ứng viên này.'}
                    </p>
                    {duplicateInfo && duplicateInfo.duplicateCount > 0 && (
                      <p className="text-xs mt-2" style={{ color: '#dc2626' }}>
                        {t.duplicateCount || 'Số lượng hồ sơ trùng'}: {duplicateInfo.duplicateCount}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <User className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      {t.nameKanji || 'Họ tên (Kanji)'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="nameKanji"
                      value={formData.nameKanji}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      {t.nameKana || 'Họ tên (Kana)'}
                    </label>
                    <input
                      type="text"
                      name="nameKana"
                      value={formData.nameKana}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Ngày sinh
                    </label>
                    <input
                      type="text"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      placeholder="1990年1月1日"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Tuổi
                    </label>
                    <input
                      type="text"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="30"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Giới tính
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    >
                      <option value="">Chọn</option>
                      <option value="男">Nam (男)</option>
                      <option value="女">Nữ (女)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      {t.email || 'Email'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      {t.phone || 'Điện thoại'}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Mã bưu điện
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="123-4567"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="東京都渋谷区..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                </div>
              </div>

              {/* CV File Upload */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Upload CV
                </h3>
                {cvFiles.length === 0 ? (
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
                    onMouseEnter={() => setHoveredAddFileButton(true)}
                    onMouseLeave={() => setHoveredAddFileButton(false)}
                    style={{
                      borderColor: hoveredAddFileButton ? '#2563eb' : '#d1d5db'
                    }}
                  >
                    <label htmlFor="cv-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                          <Upload className="w-6 h-6" style={{ color: '#9ca3af' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>Kéo thả file CV vào đây</p>
                          <p className="text-xs" style={{ color: '#6b7280' }}>hoặc</p>
                          <p className="text-sm font-medium mt-1" style={{ color: '#2563eb' }}>Chọn file từ máy tính</p>
                        </div>
                        <p className="text-xs" style={{ color: '#6b7280' }}>Hỗ trợ nhiều file PDF - Tự động trích xuất dữ liệu</p>
                      </div>
                      <input
                        id="cv-upload"
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {cvFiles.map((file, index) => (
                        <div key={index} className="rounded-lg p-3 border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                                <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>{file.name}</p>
                                <p className="text-xs" style={{ color: '#6b7280' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCV(index)}
                              onMouseEnter={() => setHoveredRemoveCvButtonIndex(index)}
                              onMouseLeave={() => setHoveredRemoveCvButtonIndex(null)}
                              className="p-1"
                              disabled={isParsing}
                              style={{
                                color: hoveredRemoveCvButtonIndex === index ? '#dc2626' : '#9ca3af'
                              }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <label htmlFor="cv-upload-more" className="block">
                      <div 
                        className="w-full px-4 py-2 border border-dashed rounded-lg text-sm font-medium transition-colors text-center cursor-pointer flex items-center justify-center gap-2"
                        onMouseEnter={() => setHoveredAddFileButton(true)}
                        onMouseLeave={() => setHoveredAddFileButton(false)}
                        style={{
                          borderColor: hoveredAddFileButton ? '#2563eb' : '#d1d5db',
                          color: hoveredAddFileButton ? '#2563eb' : '#4b5563'
                        }}
                      >
                        <Plus className="w-4 h-4" /> Thêm file PDF
                      </div>
                      <input
                        id="cv-upload-more"
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isParsing}
                      />
                    </label>
                    {isParsing && (
                      <div className="border rounded-lg p-3" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" style={{ borderColor: '#2563eb' }}></div>
                          <p className="text-xs font-medium" style={{ color: '#1e40af' }}>
                            Đang phân tích CV bằng AI... ({parseProgress.current}/{parseProgress.total})
                          </p>
                        </div>
                        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#bfdbfe' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${(parseProgress.current / parseProgress.total) * 100}%`,
                              backgroundColor: '#2563eb'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {parseError && (
                      <div className="border rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                        <span className="mt-0.5 text-xs" style={{ color: '#dc2626' }}>⚠️</span>
                        <pre className="flex-1 text-xs font-medium whitespace-pre-wrap" style={{ color: '#991b1b' }}>{parseError}</pre>
                        <button type="button" onClick={() => setParseError(null)} className="text-xs" style={{ color: '#dc2626' }}>✕</button>
                      </div>
                    )}
                    {parseSuccess && (
                      <div className="border rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <span className="text-xs" style={{ color: '#16a34a' }}>✓</span>
                        <p className="flex-1 text-xs font-medium" style={{ color: '#166534' }}>{parseSuccess}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <GraduationCap className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Học vấn (学歴)
                </h3>
                {formData.educations.map((edu, index) => (
                  <div key={index} className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold" style={{ color: '#6b7280' }}>#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        onMouseEnter={() => setHoveredRemoveEducationIndex(index)}
                        onMouseLeave={() => setHoveredRemoveEducationIndex(null)}
                        style={{
                          color: hoveredRemoveEducationIndex === index ? '#b91c1c' : '#ef4444'
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={edu.year}
                        onChange={(e) => updateEducation(index, 'year', e.target.value)}
                        placeholder="Năm (年)"
                        className="px-2 py-1.5 border rounded text-sm"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <input
                        type="text"
                        value={edu.month}
                        onChange={(e) => updateEducation(index, 'month', e.target.value)}
                        placeholder="Tháng (月)"
                        className="px-2 py-1.5 border rounded text-sm"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <input
                        type="text"
                        value={edu.content}
                        onChange={(e) => updateEducation(index, 'content', e.target.value)}
                        placeholder="Tên trường, ngành học..."
                        className="col-span-2 px-2 py-1.5 border rounded text-sm"
                        style={{ borderColor: '#d1d5db' }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddEducation}
                  onMouseEnter={() => setHoveredAddEducationButton(true)}
                  onMouseLeave={() => setHoveredAddEducationButton(false)}
                  className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    borderColor: hoveredAddEducationButton ? '#2563eb' : '#d1d5db',
                    color: hoveredAddEducationButton ? '#2563eb' : '#4b5563'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Thêm học vấn
                </button>
              </div>

              {/* Work Experience */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Kinh nghiệm làm việc (職歴)
                </h3>
                {formData.workExperiences.map((emp, index) => (
                  <div key={index} className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold" style={{ color: '#6b7280' }}>#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEmployment(index)}
                        onMouseEnter={() => setHoveredRemoveEmploymentIndex(index)}
                        onMouseLeave={() => setHoveredRemoveEmploymentIndex(null)}
                        style={{
                          color: hoveredRemoveEmploymentIndex === index ? '#b91c1c' : '#ef4444'
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={emp.period}
                          onChange={(e) => updateEmployment(index, 'period', e.target.value)}
                          placeholder="Thời gian (YYYY/MM - YYYY/MM)"
                          className="px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                        <input
                          type="text"
                          value={emp.company_name}
                          onChange={(e) => updateEmployment(index, 'company_name', e.target.value)}
                          placeholder="Tên công ty"
                          className="px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={emp.business_purpose}
                          onChange={(e) => updateEmployment(index, 'business_purpose', e.target.value)}
                          placeholder="Lĩnh vực kinh doanh"
                          className="px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                        <input
                          type="text"
                          value={emp.scale_role}
                          onChange={(e) => updateEmployment(index, 'scale_role', e.target.value)}
                          placeholder="Quy mô / Vai trò"
                          className="px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                      </div>
                      <textarea
                        value={emp.description}
                        onChange={(e) => updateEmployment(index, 'description', e.target.value)}
                        placeholder="Mô tả công việc"
                        rows={2}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <input
                        type="text"
                        value={emp.tools_tech}
                        onChange={(e) => updateEmployment(index, 'tools_tech', e.target.value)}
                        placeholder="Công cụ, công nghệ"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        style={{ borderColor: '#d1d5db' }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddWorkExperience}
                  onMouseEnter={() => setHoveredAddEmploymentButton(true)}
                  onMouseLeave={() => setHoveredAddEmploymentButton(false)}
                  className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    borderColor: hoveredAddEmploymentButton ? '#2563eb' : '#d1d5db',
                    color: hoveredAddEmploymentButton ? '#2563eb' : '#4b5563'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Thêm kinh nghiệm
                </button>
              </div>

              {/* Skills & Certificates */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <Award className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Kỹ năng & Chứng chỉ
                </h3>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                    Kỹ năng kỹ thuật
                  </label>
                  <textarea
                    name="technicalSkills"
                    value={formData.technicalSkills}
                    onChange={handleInputChange}
                    placeholder="VD: Project Management, React, Python..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#111827' }}>
                    Chứng chỉ (免許・資格)
                  </label>
                  <div className="space-y-2">
                    {formData.certificates.map((cert, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={cert.year}
                          onChange={(e) => updateCertificate(index, 'year', e.target.value)}
                          placeholder="Năm"
                          className="w-16 px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                        <input
                          type="text"
                          value={cert.month}
                          onChange={(e) => updateCertificate(index, 'month', e.target.value)}
                          placeholder="Tháng"
                          className="w-16 px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                        <input
                          type="text"
                          value={cert.name}
                          onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                          placeholder="Tên chứng chỉ"
                          className="flex-1 px-2 py-1.5 border rounded text-sm"
                          style={{ borderColor: '#d1d5db' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeCertificate(index)}
                          onMouseEnter={() => setHoveredRemoveCertificateIndex(index)}
                          onMouseLeave={() => setHoveredRemoveCertificateIndex(null)}
                          style={{
                            color: hoveredRemoveCertificateIndex === index ? '#b91c1c' : '#ef4444'
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddCertificate}
                      onMouseEnter={() => setHoveredAddCertificateButton(true)}
                      onMouseLeave={() => setHoveredAddCertificateButton(false)}
                      className="text-sm flex items-center gap-1"
                      style={{
                        color: hoveredAddCertificateButton ? '#1d4ed8' : '#2563eb'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Thêm chứng chỉ
                    </button>
                  </div>
                </div>
              </div>

              {/* Self Introduction */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <User className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Giới thiệu bản thân
                </h3>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                    Tóm tắt nghề nghiệp
                  </label>
                  <textarea
                    name="careerSummary"
                    value={formData.careerSummary}
                    onChange={handleInputChange}
                    placeholder="Tóm tắt kinh nghiệm làm việc..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                    Điểm mạnh
                  </label>
                  <textarea
                    name="strengths"
                    value={formData.strengths}
                    onChange={handleInputChange}
                    placeholder="Điểm mạnh của bạn..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                    Động lực ứng tuyển
                  </label>
                  <textarea
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    placeholder="Lý do muốn ứng tuyển..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: '#111827' }}>Mong muốn (希望)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Lương hiện tại
                    </label>
                    <input
                      type="text"
                      name="currentSalary"
                      value={formData.currentSalary}
                      onChange={handleInputChange}
                      placeholder="VD: 500万円"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Lương mong muốn
                    </label>
                    <input
                      type="text"
                      name="desiredSalary"
                      value={formData.desiredSalary}
                      onChange={handleInputChange}
                      placeholder="VD: 600万円"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                    Vị trí mong muốn
                  </label>
                  <input
                    type="text"
                    name="desiredPosition"
                    value={formData.desiredPosition}
                    onChange={handleInputChange}
                    placeholder="VD: Software Engineer"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Địa điểm
                    </label>
                    <input
                      type="text"
                      name="desiredLocation"
                      value={formData.desiredLocation}
                      onChange={handleInputChange}
                      placeholder="VD: Tokyo"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                      Ngày bắt đầu
                    </label>
                    <input
                      type="text"
                      name="desiredStartDate"
                      value={formData.desiredStartDate}
                      onChange={handleInputChange}
                      placeholder="VD: 2025年4月"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
          <button
            onClick={onClose}
            onMouseEnter={() => setHoveredCancelButton(true)}
            onMouseLeave={() => setHoveredCancelButton(false)}
            className="px-4 py-2 border rounded-lg font-medium transition-colors"
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
              backgroundColor: hoveredCancelButton ? '#f3f4f6' : 'transparent'
            }}
          >
            {t.cancel || 'Hủy'}
          </button>
          <button
            onClick={activeTab === 'existing' ? handleSubmitExisting : handleSubmitNew}
            disabled={submitting || (activeTab === 'existing' && !selectedCvId) || (activeTab === 'new' && isDuplicate)}
            onMouseEnter={() => setHoveredSubmitButton(true)}
            onMouseLeave={() => setHoveredSubmitButton(false)}
            className="px-6 py-2 rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: hoveredSubmitButton ? '#facc15' : '#facc15',
              color: '#1d4ed8',
              opacity: (submitting || (activeTab === 'existing' && !selectedCvId) || (activeTab === 'new' && isDuplicate)) ? 0.5 : 1,
              cursor: (submitting || (activeTab === 'existing' && !selectedCvId) || (activeTab === 'new' && isDuplicate)) ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (t.submitting || 'Đang xử lý...') : (t.submitNomination || 'Tiến cử')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NominationModal;

