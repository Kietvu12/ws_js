import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import vi from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('vi', vi);
import apiService from '../../services/api';

import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  FileText,
  Award,
  UserCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Upload,
  Plus,
  X,
  Trash2,
  Save,
} from 'lucide-react';

const EditCandidate = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    nameKanji: '',
    nameKana: '',
    birthDate: '',
    age: '',
    gender: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    // Education
    educations: [],
    // Work Experience
    workExperiences: [],
    // Skills & Certificates
    technicalSkills: '',
    certificates: [],
    learnedTools: [],
    experienceTools: [],
    jlptLevel: '',
    experienceYears: '',
    specialization: '',
    qualification: '',
    // Self Introduction
    careerSummary: '',
    strengths: '',
    motivation: '',
    // Preferences
    currentSalary: '',
    desiredSalary: '',
    desiredPosition: '',
    desiredLocation: '',
    desiredStartDate: '',
    // Additional fields
    status: 1,
    currentResidence: '',
    jpResidenceStatus: '',
    visaExpirationDate: '',
    otherCountry: '',
    passport: '',
    spouse: '',
    currentIncome: '',
    desiredIncome: '',
    addressCurrent: '',
    addressOrigin: '',
  });
  const [cvFiles, setCvFiles] = useState([]);
  const [cvPreviews, setCvPreviews] = useState([]);
  const [existingCvFile, setExistingCvFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0 });
  const [parseError, setParseError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);

  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredAddEducationButton, setHoveredAddEducationButton] = useState(false);
  const [hoveredRemoveEducationButtons, setHoveredRemoveEducationButtons] = useState({});
  const [hoveredAddWorkExperienceButton, setHoveredAddWorkExperienceButton] = useState(false);
  const [hoveredRemoveWorkExperienceButtons, setHoveredRemoveWorkExperienceButtons] = useState({});
  const [hoveredUploadArea, setHoveredUploadArea] = useState(false);
  const [hoveredRemoveCVButtons, setHoveredRemoveCVButtons] = useState({});
  const [hoveredAddMoreFilesButton, setHoveredAddMoreFilesButton] = useState(false);
  const [hoveredClearAllFilesButton, setHoveredClearAllFilesButton] = useState(false);
  const [hoveredAddCertificateButton, setHoveredAddCertificateButton] = useState(false);
  const [hoveredRemoveCertificateButtons, setHoveredRemoveCertificateButtons] = useState({});
  const [hoveredAddLearnedToolButton, setHoveredAddLearnedToolButton] = useState(false);
  const [hoveredRemoveLearnedToolButtons, setHoveredRemoveLearnedToolButtons] = useState({});
  const [hoveredAddExperienceToolButton, setHoveredAddExperienceToolButton] = useState(false);
  const [hoveredRemoveExperienceToolButtons, setHoveredRemoveExperienceToolButtons] = useState({});

  // API Base URL for CV parsing
  const API_BASE_URL = 'https://unboiled-nonprescriptive-hiedi.ngrok-free.dev';

  useEffect(() => {
    loadCandidateData();
  }, [candidateId]);

  const loadCandidateData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCVStorageById(candidateId);
      
      if (response.success && response.data?.cv) {
        const cv = response.data.cv;
        
        // Helper function to safely parse JSON array fields
        const parseArrayField = (field) => {
          if (!field) return [];
          if (Array.isArray(field)) return field;
          if (typeof field === 'string') {
            try {
              const parsed = JSON.parse(field);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        };

        // Parse JSON fields - ensure they are always arrays
        const educations = parseArrayField(cv.educations);
        const workExperiences = parseArrayField(cv.workExperiences);
        const certificates = parseArrayField(cv.certificates);
        const learnedTools = parseArrayField(cv.learnedTools);
        const experienceTools = parseArrayField(cv.experienceTools);

        setFormData({
          nameKanji: cv.name || cv.nameKanji || '',
          nameKana: cv.furigana || cv.nameKana || '',
          birthDate: cv.birthDate || '',
          age: cv.ages || cv.age || '',
          gender: cv.gender || '',
          postalCode: cv.postalCode || '',
          address: cv.addressCurrent || cv.address || '',
          phone: cv.phone || '',
          email: cv.email || '',
          educations: educations,
          workExperiences: workExperiences,
          technicalSkills: cv.technicalSkills || '',
          certificates: certificates,
          learnedTools: learnedTools,
          experienceTools: experienceTools,
          jlptLevel: cv.jlptLevel || '',
          experienceYears: cv.experienceYears || '',
          specialization: cv.specialization || '',
          qualification: cv.qualification || '',
          careerSummary: cv.careerSummary || '',
          strengths: cv.strengths || '',
          motivation: cv.motivation || '',
          currentSalary: cv.currentIncome || '',
          desiredSalary: cv.desiredIncome || '',
          desiredPosition: cv.desiredPosition || '',
          desiredLocation: cv.desiredWorkLocation || cv.desiredLocation || '',
          desiredStartDate: cv.nyushaTime || cv.desiredStartDate || '',
          status: cv.status !== undefined ? cv.status : 1,
          currentResidence: cv.currentResidence || '',
          jpResidenceStatus: cv.jpResidenceStatus || '',
          visaExpirationDate: cv.visaExpirationDate || '',
          otherCountry: cv.otherCountry || '',
          passport: cv.passport !== undefined && cv.passport !== null ? (cv.passport === true || cv.passport === '1' || cv.passport === 1 ? '1' : '0') : '',
          spouse: cv.spouse !== undefined && cv.spouse !== null ? (cv.spouse === true || cv.spouse === '1' || cv.spouse === 1 ? '1' : '0') : '',
          currentIncome: cv.currentIncome || '',
          desiredIncome: cv.desiredIncome || '',
          addressCurrent: cv.addressCurrent || cv.address || '',
          addressOrigin: cv.addressOrigin || '',
        });

        if (cv.cvFile) {
          setExistingCvFile(cv.cvFile);
        }
      } else {
        alert('Không tìm thấy thông tin ứng viên');
        navigate('/agent/candidates');
      }
    } catch (error) {
      console.error('Error loading candidate:', error);
      alert('Lỗi khi tải thông tin ứng viên');
      navigate('/agent/candidates');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely parse date
  const parseDate = (dateString) => {
    if (!dateString || dateString === '') return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  // Handle date change from DatePicker
  const handleBirthDateChange = (date) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      const age = calculateAge(date);
      setFormData(prev => ({
        ...prev,
        birthDate: dateString,
        age: age
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        birthDate: '',
        age: ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-calculate age when birthDate changes
      if (name === 'birthDate' && value) {
        const age = calculateAge(value);
        newData.age = age;
      }
      
      return newData;
    });
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
      educations: Array.isArray(parsedData.education_history) && parsedData.education_history.length > 0 
        ? parsedData.education_history.map(edu => ({
            year: edu.year || '',
            month: edu.month || '',
            content: edu.content || ''
          }))
        : (Array.isArray(prev.educations) ? prev.educations : []),
      workExperiences: Array.isArray(parsedData.employment_history_details) && parsedData.employment_history_details.length > 0
        ? parsedData.employment_history_details.map(emp => ({
            period: emp.period || '',
            company_name: emp.company_name || '',
            business_purpose: emp.business_purpose || '',
            scale_role: emp.scale_role || '',
            description: emp.description || '',
            tools_tech: emp.tools_tech || ''
          }))
        : (Array.isArray(prev.workExperiences) ? prev.workExperiences : []),
      technicalSkills: parsedData.skills_and_certifications?.technical_skills || prev.technicalSkills,
      certificates: Array.isArray(parsedData.skills_and_certifications?.licenses) && parsedData.skills_and_certifications.licenses.length > 0
        ? parsedData.skills_and_certifications.licenses.map(lic => ({
            year: lic.year || '',
            month: lic.month || '',
            name: lic.name || ''
          }))
        : (Array.isArray(prev.certificates) ? prev.certificates : []),
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

  // Tools handlers
  const handleAddLearnedTool = () => {
    setFormData(prev => ({
      ...prev,
      learnedTools: [...prev.learnedTools, '']
    }));
  };

  const updateLearnedTool = (index, value) => {
    const updated = [...formData.learnedTools];
    updated[index] = value;
    setFormData(prev => ({ ...prev, learnedTools: updated }));
  };

  const removeLearnedTool = (index) => {
    setFormData(prev => ({
      ...prev,
      learnedTools: prev.learnedTools.filter((_, i) => i !== index)
    }));
  };

  const handleAddExperienceTool = () => {
    setFormData(prev => ({
      ...prev,
      experienceTools: [...prev.experienceTools, '']
    }));
  };

  const updateExperienceTool = (index, value) => {
    const updated = [...formData.experienceTools];
    updated[index] = value;
    setFormData(prev => ({ ...prev, experienceTools: updated }));
  };

  const removeExperienceTool = (index) => {
    setFormData(prev => ({
      ...prev,
      experienceTools: prev.experienceTools.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      // Create FormData
      const formDataToSend = new FormData();
      
      formDataToSend.append('name', formData.nameKanji);
      formDataToSend.append('nameKana', formData.nameKana);
      formDataToSend.append('furigana', formData.nameKana);
      formDataToSend.append('birthDate', formData.birthDate);
      formDataToSend.append('age', formData.age);
      formDataToSend.append('ages', formData.age);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('postalCode', formData.postalCode);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('addressCurrent', formData.addressCurrent || formData.address);
      formDataToSend.append('addressOrigin', formData.addressOrigin);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('educations', JSON.stringify(formData.educations));
      formDataToSend.append('workExperiences', JSON.stringify(formData.workExperiences));
      formDataToSend.append('technicalSkills', formData.technicalSkills);
      formDataToSend.append('certificates', JSON.stringify(formData.certificates));
      if (formData.learnedTools && formData.learnedTools.length > 0) {
        formDataToSend.append('learnedTools', JSON.stringify(formData.learnedTools));
      }
      if (formData.experienceTools && formData.experienceTools.length > 0) {
        formDataToSend.append('experienceTools', JSON.stringify(formData.experienceTools));
      }
      if (formData.jlptLevel) formDataToSend.append('jlptLevel', formData.jlptLevel);
      if (formData.experienceYears) formDataToSend.append('experienceYears', formData.experienceYears);
      if (formData.specialization) formDataToSend.append('specialization', formData.specialization);
      if (formData.qualification) formDataToSend.append('qualification', formData.qualification);
      formDataToSend.append('careerSummary', formData.careerSummary);
      formDataToSend.append('strengths', formData.strengths);
      formDataToSend.append('motivation', formData.motivation);
      formDataToSend.append('currentIncome', formData.currentSalary || formData.currentIncome);
      formDataToSend.append('desiredIncome', formData.desiredSalary || formData.desiredIncome);
      formDataToSend.append('desiredPosition', formData.desiredPosition);
      formDataToSend.append('desiredLocation', formData.desiredLocation);
      formDataToSend.append('desiredWorkLocation', formData.desiredLocation);
      formDataToSend.append('desiredStartDate', formData.desiredStartDate);
      formDataToSend.append('nyushaTime', formData.desiredStartDate);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('currentResidence', formData.currentResidence);
      formDataToSend.append('jpResidenceStatus', formData.jpResidenceStatus);
      formDataToSend.append('visaExpirationDate', formData.visaExpirationDate);
      formDataToSend.append('otherCountry', formData.otherCountry);
      formDataToSend.append('passport', formData.passport === '1' ? '1' : '0');
      formDataToSend.append('spouse', formData.spouse === '1' ? '1' : '0');
      formDataToSend.append('experienceYears', formData.experienceYears);
      formDataToSend.append('jlptLevel', formData.jlptLevel);
      formDataToSend.append('specialization', formData.specialization);
      formDataToSend.append('qualification', formData.qualification);
      
      if (cvFiles.length > 0) {
        cvFiles.forEach((file) => {
          formDataToSend.append('cvFile', file);
        });
      }

      const response = await apiService.updateCVStorage(candidateId, formDataToSend);

      if (response.success) {
        alert('Cập nhật thông tin ứng viên thành công!');
        navigate(`/agent/candidates/${candidateId}`);
      } else {
        alert(response.message || 'Có lỗi xảy ra khi cập nhật thông tin');
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert(error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate(`/agent/candidates/${candidateId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#ef4444' }}></div>
          <p style={{ color: '#4b5563' }}>Đang tải thông tin ứng viên...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4 border flex items-center justify-between" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/agent/candidates/${candidateId}`)}
            onMouseEnter={() => setHoveredBackButton(true)}
            onMouseLeave={() => setHoveredBackButton(false)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent'
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#374151' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Chỉnh sửa ứng viên</h1>
            <p className="text-sm mt-1" style={{ color: '#4b5563' }}>Cập nhật thông tin ứng viên</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            onMouseEnter={() => setHoveredCancelButton(true)}
            onMouseLeave={() => setHoveredCancelButton(false)}
            className="px-4 py-2 border rounded-lg font-bold text-sm transition-colors"
            style={{
              backgroundColor: hoveredCancelButton ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151'
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            onMouseEnter={() => !saving && setHoveredSaveButton(true)}
            onMouseLeave={() => setHoveredSaveButton(false)}
            className="px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
            style={{
              backgroundColor: hoveredSaveButton ? '#dc2626' : '#ef4444',
              color: 'white',
              opacity: saving ? 0.5 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'white' }}></div>
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form - Reuse the same form structure as AddCandidate */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Personal Information */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
              <User className="w-5 h-5" style={{ color: '#ef4444' }} />
              Thông tin cá nhân (個人情報)
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Họ tên (Kanji) - 氏名 *
                  </label>
                  <input
                    type="text"
                    name="nameKanji"
                    value={formData.nameKanji}
                    onChange={handleInputChange}
                    placeholder="VD: 山田 太郎"
                    required
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{
                      borderColor: '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ef4444';
                      e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Họ tên (Kana) - ふりがな
                  </label>
                  <input
                    type="text"
                    name="nameKana"
                    value={formData.nameKana}
                    onChange={handleInputChange}
                    placeholder="VD: やまだ たろう"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{
                      borderColor: '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ef4444';
                      e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Ngày sinh - 生年月日
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{ color: '#9ca3af' }} />
                    <DatePicker
                      selected={parseDate(formData.birthDate)}
                      onChange={handleBirthDateChange}
                      dateFormat="yyyy-MM-dd"
                      maxDate={new Date()}
                      placeholderText="Chọn ngày sinh"
                      className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={100}
                      scrollableYearDropdown
                      locale="vi"
                      isClearable
                      peekNextMonth
                      showMonthYearPicker={false}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Tuổi - 満歳
                  </label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="30"
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none cursor-not-allowed"
                    style={{
                      borderColor: '#d1d5db',
                      backgroundColor: '#f9fafb'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Giới tính - 性別
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{
                      borderColor: '#d1d5db'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ef4444';
                      e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Chọn</option>
                    <option value="男">Nam (男)</option>
                    <option value="女">Nữ (女)</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4 mt-4" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: '#374151' }}>
                  Thông tin liên hệ (連絡先)
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Mã bưu điện - 〒
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder="123-4567"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Địa chỉ - 現住所
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="東京都渋谷区..."
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                          style={{
                            borderColor: '#d1d5db'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Điện thoại - 電話
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="090-1234-5678"
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                          style={{
                            borderColor: '#d1d5db'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@example.com"
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                          style={{
                            borderColor: '#d1d5db'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              
              {/* Residence & Visa Information */}
              <div className="border-t pt-4 mt-4" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: '#374151' }}>
                  Thông tin cư trú & Visa (在留情報)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                      Địa chỉ gốc - 出身地
                    </label>
                    <input
                      type="text"
                      name="addressOrigin"
                      value={formData.addressOrigin}
                      onChange={handleInputChange}
                      placeholder="VD: ベトナム ホーチミン市"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Passport - パスポート
                      </label>
                      <select
                        name="passport"
                        value={formData.passport}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Chọn</option>
                        <option value="1">Có</option>
                        <option value="0">Không</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Nơi cư trú hiện tại - 現在の居住地
                      </label>
                      <select
                        name="currentResidence"
                        value={formData.currentResidence}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Chọn</option>
                        <option value="1">Nhật Bản</option>
                        <option value="2">Việt Nam</option>
                        <option value="3">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Tư cách lưu trú - 在留資格
                      </label>
                      <select
                        name="jpResidenceStatus"
                        value={formData.jpResidenceStatus}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Chọn</option>
                        <option value="1">技術・人文知識・国際業務</option>
                        <option value="2">特定技能</option>
                        <option value="3">留学</option>
                        <option value="4">永住者</option>
                        <option value="5">日本人の配偶者等</option>
                        <option value="6">定住者</option>
                        <option value="7">その他</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                        Ngày hết hạn Visa - 在留期限
                      </label>
                      <DatePicker
                        selected={parseDate(formData.visaExpirationDate)}
                        onChange={(date) => {
                          if (date) {
                            setFormData(prev => ({
                              ...prev,
                              visaExpirationDate: date.toISOString().split('T')[0]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              visaExpirationDate: ''
                            }));
                          }
                        }}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Chọn ngày hết hạn"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                        isClearable
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                      Quốc gia khác - その他の国
                    </label>
                    <input
                      type="text"
                      name="otherCountry"
                      value={formData.otherCountry}
                      onChange={handleInputChange}
                      placeholder="VD: アメリカ"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-t pt-4 mt-4">
                <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                  Trạng thái
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                >
                  <option value="0">Draft</option>
                  <option value="1">Active</option>
                  <option value="2">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Education - Same as AddCandidate */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
              <GraduationCap className="w-5 h-5" style={{ color: '#ef4444' }} />
              Học vấn (学歴)
            </h2>
            <div className="space-y-3">
              {(Array.isArray(formData.educations) ? formData.educations : []).map((edu, index) => (
                <div key={index} className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold" style={{ color: '#6b7280' }}>#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      onMouseEnter={() => setHoveredRemoveEducationButtons(prev => ({ ...prev, [index]: true }))}
                      onMouseLeave={() => setHoveredRemoveEducationButtons(prev => ({ ...prev, [index]: false }))}
                      className="transition-colors"
                      style={{
                        color: hoveredRemoveEducationButtons[index] ? '#b91c1c' : '#ef4444'
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
                      style={{
                        borderColor: '#d1d5db'
                      }}
                    />
                    <input
                      type="text"
                      value={edu.month}
                      onChange={(e) => updateEducation(index, 'month', e.target.value)}
                      placeholder="Tháng (月)"
                      className="px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                    />
                    <input
                      type="text"
                      value={edu.content}
                      onChange={(e) => updateEducation(index, 'content', e.target.value)}
                      placeholder="Tên trường, ngành học..."
                      className="col-span-2 px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddEducation}
                className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  borderColor: hoveredAddEducationButton ? '#ef4444' : '#d1d5db',
                  color: hoveredAddEducationButton ? '#ef4444' : '#4b5563'
                }}
                onMouseEnter={() => setHoveredAddEducationButton(true)}
                onMouseLeave={() => setHoveredAddEducationButton(false)}
              >
                <Plus className="w-4 h-4" />
                Thêm học vấn
              </button>
            </div>
          </div>

          {/* Work Experience - Same as AddCandidate */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
              <Briefcase className="w-5 h-5" style={{ color: '#ef4444' }} />
              Kinh nghiệm làm việc (職歴)
            </h2>
            <div className="space-y-3">
              {(Array.isArray(formData.workExperiences) ? formData.workExperiences : []).map((emp, index) => (
                <div key={index} className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold" style={{ color: '#6b7280' }}>#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeEmployment(index)}
                      onMouseEnter={() => setHoveredRemoveWorkExperienceButtons(prev => ({ ...prev, [index]: true }))}
                      onMouseLeave={() => setHoveredRemoveWorkExperienceButtons(prev => ({ ...prev, [index]: false }))}
                      className="transition-colors"
                      style={{
                        color: hoveredRemoveWorkExperienceButtons[index] ? '#b91c1c' : '#ef4444'
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
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      />
                      <input
                        type="text"
                        value={emp.company_name}
                        onChange={(e) => updateEmployment(index, 'company_name', e.target.value)}
                        placeholder="Tên công ty"
                        className="px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={emp.business_purpose}
                        onChange={(e) => updateEmployment(index, 'business_purpose', e.target.value)}
                        placeholder="Lĩnh vực kinh doanh (事業目的)"
                        className="px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      />
                      <input
                        type="text"
                        value={emp.scale_role}
                        onChange={(e) => updateEmployment(index, 'scale_role', e.target.value)}
                        placeholder="Quy mô / Vai trò (規模／役割)"
                        className="px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      />
                    </div>
                    <textarea
                      value={emp.description}
                      onChange={(e) => updateEmployment(index, 'description', e.target.value)}
                      placeholder="Mô tả công việc (業務内容)"
                      rows={2}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                    />
                    <input
                      type="text"
                      value={emp.tools_tech}
                      onChange={(e) => updateEmployment(index, 'tools_tech', e.target.value)}
                      placeholder="Công cụ, công nghệ (ツール)"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddWorkExperience}
                className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  borderColor: hoveredAddWorkExperienceButton ? '#ef4444' : '#d1d5db',
                  color: hoveredAddWorkExperienceButton ? '#ef4444' : '#4b5563'
                }}
                onMouseEnter={() => setHoveredAddWorkExperienceButton(true)}
                onMouseLeave={() => setHoveredAddWorkExperienceButton(false)}
              >
                <Plus className="w-4 h-4" />
                Thêm kinh nghiệm
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Same structure as AddCandidate */}
        <div className="space-y-4">
          {/* Upload CV */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
              <FileText className="w-5 h-5" style={{ color: '#ef4444' }} />
              Upload CV
            </h2>
            {existingCvFile && cvFiles.length === 0 && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: '1px', borderStyle: 'solid' }}>
                <p className="text-sm mb-2" style={{ color: '#1e3a8a' }}>File CV hiện tại:</p>
                <p className="text-xs" style={{ color: '#2563eb' }}>{existingCvFile}</p>
              </div>
            )}
            {cvFiles.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl p-8 text-center transition-colors" style={{ borderColor: hoveredUploadArea ? '#ef4444' : '#d1d5db' }} onMouseEnter={() => setHoveredUploadArea(true)} onMouseLeave={() => setHoveredUploadArea(false)}>
                <label htmlFor="cv-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                      <Upload className="w-8 h-8" style={{ color: '#9ca3af' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: '#111827' }}>Kéo thả file CV vào đây</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>hoặc</p>
                      <p className="text-sm font-medium mt-1" style={{ color: '#ef4444' }}>Chọn file từ máy tính</p>
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
              <div className="space-y-4">
                {/* File List */}
                <div className="space-y-2">
                  {cvFiles.map((file, index) => (
                    <div key={index} className="rounded-lg p-3 border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
                            <FileText className="w-4 h-4" style={{ color: '#ef4444' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#111827' }}>{file.name}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCV(index)}
                          onMouseEnter={() => setHoveredRemoveCVButtons(prev => ({ ...prev, [index]: true }))}
                          onMouseLeave={() => setHoveredRemoveCVButtons(prev => ({ ...prev, [index]: false }))}
                          className="p-1 transition-colors"
                          style={{
                            color: hoveredRemoveCVButtons[index] ? '#ef4444' : '#9ca3af'
                          }}
                          disabled={isParsing}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More Files Button */}
                <label htmlFor="cv-upload-more" className="block">
                  <div className="w-full px-4 py-2 border border-dashed rounded-lg text-sm font-medium transition-colors text-center cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      borderColor: hoveredAddMoreFilesButton ? '#ef4444' : '#d1d5db',
                      color: hoveredAddMoreFilesButton ? '#ef4444' : '#4b5563'
                    }}
                    onMouseEnter={() => setHoveredAddMoreFilesButton(true)}
                    onMouseLeave={() => setHoveredAddMoreFilesButton(false)}
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

                {/* Parsing Progress */}
                {isParsing && (
                  <div className="rounded-lg p-4" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: '1px', borderStyle: 'solid' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full" style={{ borderColor: '#2563eb' }}></div>
                      <p className="text-sm font-medium" style={{ color: '#1e3a8a' }}>
                        Đang phân tích CV bằng AI... ({parseProgress.current}/{parseProgress.total})
                      </p>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: '#bfdbfe' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(parseProgress.current / parseProgress.total) * 100}%`, backgroundColor: '#2563eb' }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Parse Error */}
                {parseError && (
                  <div className="rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: '1px', borderStyle: 'solid' }}>
                    <span className="mt-0.5" style={{ color: '#ef4444' }}>⚠️</span>
                    <pre className="flex-1 text-sm font-medium whitespace-pre-wrap" style={{ color: '#991b1b' }}>{parseError}</pre>
                    <button type="button" onClick={() => setParseError(null)} className="transition-colors" style={{ color: '#ef4444' }} onMouseEnter={(e) => e.target.style.color = '#991b1b'} onMouseLeave={(e) => e.target.style.color = '#ef4444'}>✕</button>
                  </div>
                )}

                {/* Parse Success */}
                {parseSuccess && (
                  <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: '1px', borderStyle: 'solid' }}>
                    <span style={{ color: '#16a34a' }}>✓</span>
                    <p className="flex-1 text-sm font-medium" style={{ color: '#166534' }}>{parseSuccess}</p>
                  </div>
                )}

                {/* Clear All Button */}
                {cvFiles.length > 1 && !isParsing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCV()}
                    className="w-full px-4 py-2 text-sm rounded-lg transition-colors"
                    style={{
                      color: hoveredClearAllFilesButton ? '#dc2626' : '#ef4444',
                      backgroundColor: hoveredClearAllFilesButton ? '#fef2f2' : 'transparent'
                    }}
                    onMouseEnter={() => setHoveredClearAllFilesButton(true)}
                    onMouseLeave={() => setHoveredClearAllFilesButton(false)}
                  >
                    Xóa tất cả file
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Skills & Certificates - Same as AddCandidate */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
              <Award className="w-5 h-5" style={{ color: '#ef4444' }} />
              Kỹ năng & Chứng chỉ (資格)
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    JLPT Level - 日本語能力試験
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-semibold pointer-events-none" style={{ color: '#4b5563' }}>N</span>
                    <input
                      type="number"
                      name="jlptLevel"
                      value={formData.jlptLevel}
                      onChange={handleInputChange}
                      min="1"
                      max="5"
                      placeholder="1-5"
                      className="w-full pl-6 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>Nhập số từ 1 (N1) đến 5 (N5)</p>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Số năm kinh nghiệm - 経験年数
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    placeholder="VD: 3"
                    min="0"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Chuyên ngành - 専門分野
                  </label>
                  <input
                    type="number"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    placeholder="ID chuyên ngành"
                    min="0"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Bằng cấp - 資格
                  </label>
                  <input
                    type="number"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    placeholder="ID bằng cấp"
                    min="0"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                  Kỹ năng kỹ thuật (活かせる経験・知識・技術)
                </label>
                <textarea
                  name="technicalSkills"
                  value={formData.technicalSkills}
                  onChange={handleInputChange}
                  placeholder="VD: Project Management, React, Python..."
                  rows="3"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#111827' }}>
                  Chứng chỉ (免許・資格)
                </label>
                <div className="space-y-2">
                  {(Array.isArray(formData.certificates) ? formData.certificates : []).map((cert, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={cert.year}
                        onChange={(e) => updateCertificate(index, 'year', e.target.value)}
                        placeholder="Năm"
                        className="w-16 px-2 py-1.5 border rounded text-sm"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                      />
                      <input
                        type="text"
                        value={cert.month}
                        onChange={(e) => updateCertificate(index, 'month', e.target.value)}
                        placeholder="Tháng"
                        className="w-16 px-2 py-1.5 border rounded text-sm"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                      />
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                        placeholder="Tên chứng chỉ"
                        className="flex-1 px-2 py-1.5 border rounded text-sm"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeCertificate(index)}
                        onMouseEnter={() => setHoveredRemoveCertificateButtons(prev => ({ ...prev, [index]: true }))}
                        onMouseLeave={() => setHoveredRemoveCertificateButtons(prev => ({ ...prev, [index]: false }))}
                        className="transition-colors"
                        style={{
                          color: hoveredRemoveCertificateButtons[index] ? '#b91c1c' : '#ef4444'
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddCertificate}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{
                      color: hoveredAddCertificateButton ? '#dc2626' : '#ef4444'
                    }}
                    onMouseEnter={() => setHoveredAddCertificateButton(true)}
                    onMouseLeave={() => setHoveredAddCertificateButton(false)}
                  >
                    <Plus className="w-4 h-4" />
                    Thêm chứng chỉ
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#111827' }}>
                  Công cụ đã học - 学習したツール
                </label>
                <div className="space-y-2">
                  {formData.learnedTools.map((tool, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tool}
                        onChange={(e) => updateLearnedTool(index, e.target.value)}
                        placeholder="VD: React, Python, Docker..."
                        className="flex-1 px-2 py-1.5 border rounded text-sm"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeLearnedTool(index)}
                        onMouseEnter={() => setHoveredRemoveLearnedToolButtons(prev => ({ ...prev, [index]: true }))}
                        onMouseLeave={() => setHoveredRemoveLearnedToolButtons(prev => ({ ...prev, [index]: false }))}
                        className="transition-colors"
                        style={{
                          color: hoveredRemoveLearnedToolButtons[index] ? '#b91c1c' : '#ef4444'
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddLearnedTool}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{
                      color: hoveredAddLearnedToolButton ? '#dc2626' : '#ef4444'
                    }}
                    onMouseEnter={() => setHoveredAddLearnedToolButton(true)}
                    onMouseLeave={() => setHoveredAddLearnedToolButton(false)}
                  >
                    <Plus className="w-4 h-4" />
                    Thêm công cụ đã học
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#111827' }}>
                  Công cụ có kinh nghiệm - 経験のあるツール
                </label>
                <div className="space-y-2">
                  {formData.experienceTools.map((tool, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tool}
                        onChange={(e) => updateExperienceTool(index, e.target.value)}
                        placeholder="VD: AWS, Kubernetes, TypeScript..."
                        className="flex-1 px-2 py-1.5 border rounded text-sm"
                        style={{
                          borderColor: '#d1d5db'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExperienceTool(index)}
                        onMouseEnter={() => setHoveredRemoveExperienceToolButtons(prev => ({ ...prev, [index]: true }))}
                        onMouseLeave={() => setHoveredRemoveExperienceToolButtons(prev => ({ ...prev, [index]: false }))}
                        className="transition-colors"
                        style={{
                          color: hoveredRemoveExperienceToolButtons[index] ? '#b91c1c' : '#ef4444'
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddExperienceTool}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{
                      color: hoveredAddExperienceToolButton ? '#dc2626' : '#ef4444'
                    }}
                    onMouseEnter={() => setHoveredAddExperienceToolButton(true)}
                    onMouseLeave={() => setHoveredAddExperienceToolButton(false)}
                  >
                    <Plus className="w-4 h-4" />
                    Thêm công cụ có kinh nghiệm
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Self Introduction - Same as AddCandidate */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
              <UserCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
              Giới thiệu bản thân (自己PR)
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                  Tóm tắt nghề nghiệp (職務要約)
                </label>
                <textarea
                  name="careerSummary"
                  value={formData.careerSummary}
                  onChange={handleInputChange}
                  placeholder="Tóm tắt kinh nghiệm làm việc..."
                  rows="2"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                  Điểm mạnh (自己PR)
                </label>
                <textarea
                  name="strengths"
                  value={formData.strengths}
                  onChange={handleInputChange}
                  placeholder="Điểm mạnh của bạn..."
                  rows="2"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                  Động lực ứng tuyển (志望動機)
                </label>
                <textarea
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder="Lý do muốn ứng tuyển..."
                  rows="2"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                />
              </div>
            </div>
          </div>

          {/* Preferences - Same as AddCandidate */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>Mong muốn (希望)</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Lương hiện tại (現在年収)
                  </label>
                  <input
                    type="text"
                    name="currentSalary"
                    value={formData.currentSalary}
                    onChange={handleInputChange}
                    placeholder="VD: 500万円"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Lương mong muốn (希望年収)
                  </label>
                  <input
                    type="text"
                    name="desiredSalary"
                    value={formData.desiredSalary}
                    onChange={handleInputChange}
                    placeholder="VD: 600万円"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                  Vị trí mong muốn (希望職種)
                </label>
                <input
                  type="text"
                  name="desiredPosition"
                  value={formData.desiredPosition}
                  onChange={handleInputChange}
                  placeholder="VD: Software Engineer"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Địa điểm (希望勤務地)
                  </label>
                  <input
                    type="text"
                    name="desiredLocation"
                    value={formData.desiredLocation}
                    onChange={handleInputChange}
                    placeholder="VD: Tokyo"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#111827' }}>
                    Ngày bắt đầu (希望入社日)
                  </label>
                  <input
                    type="text"
                    name="desiredStartDate"
                    value={formData.desiredStartDate}
                    onChange={handleInputChange}
                    placeholder="VD: 2025年4月"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{
                        borderColor: '#d1d5db'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ef4444';
                        e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditCandidate;

