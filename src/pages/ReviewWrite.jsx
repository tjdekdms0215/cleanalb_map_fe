import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    useLocation,
    useNavigate,
    useParams
} from 'react-router-dom';

const API_BASE_URL = 'https://cleanalb-map.duckdns.org';

const KAKAO_REST_API_KEY =
    import.meta.env.VITE_KAKAO_REST_API_KEY;

const KAKAO_REDIRECT_URI =
    import.meta.env.VITE_KAKAO_REDIRECT_URI;

const VIOLATION_ITEMS = [
    { id: 'NO_CONTRACT', label: '근로계약서 미작성' },
    { id: 'MINIMUM_WAGE', label: '최저시급 미준수' },
    { id: 'WEEKLY_ALLOWANCE', label: '주휴수당 미지급' },
    { id: 'BREAK_TIME', label: '휴게시간 부족' },
    { id: 'PAY_DELAY', label: '급여 지급 지연' },
    { id: 'SCHEDULE_CHANGE', label: '사전 협의 없는 스케줄 변경' },
    { id: 'VERBAL_ABUSE', label: '반복적이고 지속적인 대타 요구 및 강요' },
    { id: 'OVERTIME_PAY', label: '초과근무 급여 미지급' }
];

const AI_REWRITE_OPTIONS = [
    {
        id: 'soft',
        title: '완곡형',
        description: '부드럽고 완화된 표현으로 감정 충돌 없이 전달',
        accentColor: '#19b977'
    },
    {
        id: 'objective',
        title: '객관적 사실형',
        description: '감정 없이 사실만 간결하게 기록한 진술체',
        accentColor: '#4169e1'
    },
    {
        id: 'empathy',
        title: '공감호소형',
        description: '같은 처지의 아르바이트생에게 공감을 이끄는 문체',
        accentColor: '#ff7a00'
    }
];

const safelyParseJson = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const ReviewWrite = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { workspaceId } = useParams();
    const fileInputRef = useRef(null);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const [workspace, setWorkspace] = useState(
        location.state?.workspace || null
    );
    const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);

    const [violations, setViolations] = useState([]);
    const [simultaneousWorkers, setSimultaneousWorkers] = useState('');
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [reviewText, setReviewText] = useState('');

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [selectedAiOption, setSelectedAiOption] = useState('objective');
    const [aiCandidates, setAiCandidates] = useState({});
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const isNewWorkspace = workspaceId === 'new';

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const savedNickname = localStorage.getItem('user_nickname');
        const userRole = localStorage.getItem('user_role');

        if (token) {
            setIsLoggedIn(true);
            setNickname(savedNickname || '');
            setIsAdmin(userRole === 'ADMIN');
        }
    }, []);

    useEffect(() => {
        if (workspace) return;

        if (isNewWorkspace) {
            const savedPlace = safelyParseJson(
                sessionStorage.getItem('selected_kakao_place')
            );

            if (savedPlace) {
                setWorkspace(savedPlace);
            }

            return;
        }

        if (!workspaceId) return;

        const fetchWorkspace = async () => {
            setIsWorkspaceLoading(true);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/workspaces/${workspaceId}`
                );

                if (!response.ok) {
                    throw new Error(
                        `사업장 정보 조회 실패: ${response.status}`
                    );
                }

                const data = await response.json();
                setWorkspace(data);
            } catch (error) {
                console.error('사업장 정보 조회 오류:', error);
            } finally {
                setIsWorkspaceLoading(false);
            }
        };

        fetchWorkspace();
    }, [isNewWorkspace, workspace, workspaceId]);

    const handleKakaoLogin = () => {
        if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
            alert('카카오 로그인 설정을 확인해 주세요.');
            return;
        }

        const state = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        sessionStorage.setItem('kakao_oauth_state', state);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: KAKAO_REST_API_KEY,
            redirect_uri: KAKAO_REDIRECT_URI,
            state
        });

        window.location.assign(
            `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
        );
    };

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setNickname('');
        setIsAdmin(false);
        navigate('/');
    };

    const toggleViolation = (itemId) => {
        setViolations((current) =>
            current.includes(itemId)
                ? current.filter((id) => id !== itemId)
                : [...current, itemId]
        );
    };

    const addEvidenceFiles = (files) => {
        const acceptedFiles = Array.from(files).filter((file) => {
            const isAcceptedType =
                file.type.startsWith('image/') ||
                file.type === 'application/pdf';

            return isAcceptedType;
        });

        setEvidenceFiles((current) => {
            const merged = [...current, ...acceptedFiles];

            return merged
                .filter(
                    (file, index, list) =>
                        list.findIndex(
                            (candidate) =>
                                candidate.name === file.name &&
                                candidate.size === file.size
                        ) === index
                )
                .slice(0, 10);
        });
    };

    const handleFileChange = (event) => {
        addEvidenceFiles(event.target.files);
        event.target.value = '';
    };

    const handleFileDrop = (event) => {
        event.preventDefault();
        addEvidenceFiles(event.dataTransfer.files);
    };

    const removeEvidenceFile = (targetIndex) => {
        setEvidenceFiles((current) =>
            current.filter((_, index) => index !== targetIndex)
        );
    };

    const isFormValid = useMemo(() => {
        return (
            violations.length > 0 &&
            simultaneousWorkers.trim().length > 0 &&
            evidenceFiles.length > 0 &&
            reviewText.trim().length >= 10
        );
    }, [
        evidenceFiles.length,
        reviewText,
        simultaneousWorkers,
        violations.length
    ]);

    const buildLocalAiCandidates = (sourceText) => {
        const normalized = sourceText.trim();

        return {
            soft: `근무 환경에서 다소 아쉬운 점이 있었습니다. ${normalized} 전반적으로 관련 절차와 근무 여건이 조금 더 체계적으로 정비된다면 더 나은 근무 환경이 될 것 같습니다.`,
            objective: `근로계약서 작성 여부, 임금 지급 기준, 초과근무 수당 지급 여부 등 근로 조건과 관련된 사실을 확인할 필요가 있습니다. 작성자가 경험한 내용은 다음과 같습니다. ${normalized}`,
            empathy: `비슷한 환경에서 근무하는 분들이 참고할 수 있도록 경험을 공유합니다. ${normalized} 근무를 시작하기 전에 계약 조건과 급여 지급 기준을 미리 확인하는 것이 도움이 될 것 같습니다.`
        };
    };

    const openAiRewriteModal = async () => {
        if (reviewText.trim().length < 10) {
            setErrorMessage('AI 후기 순화를 사용하려면 후기를 10자 이상 작성해 주세요.');
            return;
        }

        setErrorMessage('');
        setIsAiLoading(true);
        setIsAiModalOpen(true);

        try {
            // 백엔드 AI 순화 API가 준비되면 이 요청으로 교체할 수 있습니다.
            // const response = await fetch(`${API_BASE_URL}/api/reviews/rewrite`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ content: reviewText })
            // });
            // const data = await response.json();
            // setAiCandidates(data);

            await new Promise((resolve) => setTimeout(resolve, 250));
            setAiCandidates(buildLocalAiCandidates(reviewText));
        } finally {
            setIsAiLoading(false);
        }
    };

    const applyAiRewrite = () => {
        const selectedText = aiCandidates[selectedAiOption];

        if (selectedText) {
            setReviewText(selectedText);
        }

        setIsAiModalOpen(false);
    };

    const handleSubmit = async () => {
        if (!isLoggedIn) {
            alert('후기를 제출하려면 먼저 로그인해 주세요.');
            handleKakaoLogin();
            return;
        }

        if (!isFormValid) {
            setErrorMessage('필수 항목을 모두 입력해 주세요.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const payload = {
                workspaceId: isNewWorkspace
                    ? null
                    : Number(workspaceId),
                externalWorkspace: isNewWorkspace
                    ? {
                          provider: 'KAKAO',
                          providerPlaceId:
                              workspace?.kakaoPlaceId ||
                              workspace?.providerPlaceId ||
                              workspace?.id,
                          name:
                              workspace?.name ||
                              workspace?.placeName ||
                              workspace?.place_name,
                          category:
                              workspace?.category ||
                              workspace?.categoryName ||
                              workspace?.category_name,
                          address:
                              workspace?.address ||
                              workspace?.addressName ||
                              workspace?.address_name,
                          roadAddress:
                              workspace?.roadAddress ||
                              workspace?.road_address_name,
                          latitude:
                              workspace?.latitude ||
                              workspace?.y,
                          longitude:
                              workspace?.longitude ||
                              workspace?.x,
                          phone: workspace?.phone || '',
                          placeUrl:
                              workspace?.kakaoPlaceUrl ||
                              workspace?.placeUrl ||
                              workspace?.place_url
                      }
                    : null,
                review: {
                    violationItems: violations,
                    simultaneousWorkers,
                    content: reviewText
                }
            };

            console.log('후기 제출 payload:', payload);
            console.log('첨부 파일:', evidenceFiles);

            // 실제 후기 제출 API가 준비되면 FormData 전송으로 교체하세요.
            // const formData = new FormData();
            // formData.append(
            //     'request',
            //     new Blob([JSON.stringify(payload)], {
            //         type: 'application/json'
            //     })
            // );
            // evidenceFiles.forEach((file) =>
            //     formData.append('evidenceFiles', file)
            // );
            //
            // const token = localStorage.getItem('jwt_token');
            // const response = await fetch(`${API_BASE_URL}/api/reviews`, {
            //     method: 'POST',
            //     headers: {
            //         Authorization: `Bearer ${token}`
            //     },
            //     body: formData
            // });
            //
            // if (!response.ok) {
            //     throw new Error(`후기 제출 실패: ${response.status}`);
            // }

            await new Promise((resolve) => setTimeout(resolve, 400));

            sessionStorage.removeItem('selected_kakao_place');
            alert('후기 작성 화면 검증이 완료되었습니다. 제출 API 연결 후 실제 등록됩니다.');
        } catch (error) {
            console.error('후기 제출 오류:', error);
            setErrorMessage('후기 제출 중 문제가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const workspaceName =
        workspace?.name ||
        workspace?.placeName ||
        workspace?.place_name ||
        (isWorkspaceLoading
            ? '사업장 정보를 불러오는 중입니다'
            : '선택한 사업장');

    const workspaceCategory =
        workspace?.category ||
        workspace?.categoryName ||
        workspace?.category_name ||
        '업종 정보 없음';

    const workspaceAddress =
        workspace?.address ||
        workspace?.roadAddress ||
        workspace?.addressName ||
        workspace?.address_name ||
        workspace?.road_address_name ||
        '주소 정보 없음';

    return (
        <div style={pageStyle}>
            <header style={headerStyle}>
                <div style={headerLeftStyle}>
                    <button
                        type="button"
                        style={logoBtnStyle}
                        onClick={() => navigate('/')}
                    >
                        전남대 클린알바맵
                    </button>

                    <button
                        type="button"
                        style={navBtnStyle}
                        onClick={() => navigate('/guide')}
                    >
                        근로기준법 안내
                    </button>
                </div>

                <div style={headerRightStyle}>
                    {isLoggedIn ? (
                        <>
                            <button
                                type="button"
                                style={profileButtonStyle}
                                onClick={() => navigate('/profile')}
                            >
                                <div style={profileCircleStyle}>
                                    <img
                                        src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                                        alt="프로필"
                                        style={profileImageStyle}
                                    />
                                </div>

                                {nickname && (
                                    <span style={profileTextStyle}>
                                        {nickname}님
                                    </span>
                                )}
                            </button>

                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin')}
                                    style={adminBtnStyle}
                                >
                                    ⚙️ 관리자
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleLogout}
                                style={btnStyle}
                            >
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleKakaoLogin}
                            style={kakaoLoginBtnStyle}
                        >
                            카카오 로그인
                        </button>
                    )}
                </div>
            </header>

            <main style={mainScrollStyle}>
                <section style={formContainerStyle}>
                    <button
                        type="button"
                        onClick={() => navigate('/review/select')}
                        style={backButtonStyle}
                    >
                        ‹ 돌아가기
                    </button>

                    <div style={workspaceHeaderStyle}>
                        <h1 style={workspaceTitleStyle}>
                            {workspaceName}
                        </h1>

                        <p style={workspaceMetaStyle}>
                            {workspaceCategory} · {workspaceAddress}
                        </p>
                    </div>

                    <section style={formSectionStyle}>
                        <div style={sectionHeadingRowStyle}>
                            <h2 style={sectionTitleStyle}>
                                근로기준법 준수 체크리스트
                            </h2>
                            <span style={requiredTextStyle}>*필수</span>
                        </div>

                        <p style={sectionHelpStyle}>
                            위반한 항목을 체크해주세요. (체크 = 위반)
                        </p>

                        <div style={checklistStyle}>
                            {VIOLATION_ITEMS.map((item) => {
                                const isChecked = violations.includes(
                                    item.id
                                );

                                return (
                                    <label
                                        key={item.id}
                                        style={{
                                            ...checkItemStyle,
                                            borderColor: isChecked
                                                ? '#4169e1'
                                                : '#e4e8ed',
                                            backgroundColor: isChecked
                                                ? '#fbfcff'
                                                : '#ffffff'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                                toggleViolation(item.id)
                                            }
                                            style={checkboxStyle}
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </section>

                    <section style={formSectionStyle}>
                        <div style={sectionHeadingRowStyle}>
                            <h2 style={sectionTitleStyle}>
                                동시간대 업무자 수
                            </h2>
                            <span style={requiredTextStyle}>*필수</span>
                        </div>

                        <p style={sectionHelpStyle}>
                            근무 중 함께 일하는 인원을 자유롭게 적어주세요.
                        </p>

                        <input
                            type="text"
                            value={simultaneousWorkers}
                            onChange={(event) =>
                                setSimultaneousWorkers(event.target.value)
                            }
                            placeholder="예: 보통 2~3명, 혼자 일할 때도 있었음"
                            style={textInputStyle}
                        />
                    </section>

                    <section style={formSectionStyle}>
                        <div style={sectionHeadingRowStyle}>
                            <h2 style={sectionTitleStyle}>
                                근로 인증 자료
                            </h2>
                            <span style={requiredTextStyle}>*필수</span>
                        </div>

                        <p style={sectionHelpStyle}>
                            근로계약서, 급여 입금 내역, 보험 내역 등
                            (jpg, jpeg, png, pdf / 최대 10개)
                        </p>

                        <div
                            style={uploadBoxStyle}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            <div style={uploadIconStyle}>⇧</div>
                            <strong style={uploadTitleStyle}>
                                파일을 드래그하거나 클릭해서 업로드
                            </strong>
                            <span style={uploadSubTextStyle}>
                                JPG · JPEG · PNG · PDF 지원
                            </span>
                        </div>

                        {evidenceFiles.length > 0 && (
                            <div style={fileListStyle}>
                                {evidenceFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${file.size}`}
                                        style={fileRowStyle}
                                    >
                                        <span style={fileNameStyle}>
                                            {file.name}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeEvidenceFile(index)
                                            }
                                            style={fileRemoveButtonStyle}
                                            aria-label={`${file.name} 삭제`}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section style={formSectionStyle}>
                        <div style={sectionHeadingRowStyle}>
                            <h2 style={sectionTitleStyle}>
                                주관식 후기
                            </h2>
                            <span style={requiredTextStyle}>*필수</span>
                        </div>

                        <p style={sectionHelpStyle}>
                            자유롭게 작성하면 AI가 법적 위험 표현을
                            순화해드립니다.
                        </p>

                        <div style={textareaWrapperStyle}>
                            <textarea
                                value={reviewText}
                                onChange={(event) =>
                                    setReviewText(event.target.value)
                                }
                                placeholder="근무 경험을 자유롭게 작성해주세요"
                                maxLength={1000}
                                style={textareaStyle}
                            />

                            <span style={characterCountStyle}>
                                {reviewText.length}/최소 10자
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={openAiRewriteModal}
                            style={aiRewriteButtonStyle}
                        >
                            ✨ AI 후기 순화
                        </button>
                    </section>

                    <div style={warningBoxStyle}>
                        <span style={warningIconStyle}>!</span>
                        <span>
                            허위 정보 작성 시 법적 책임이 발생할 수
                            있습니다. 인증 자료는 관리자 검수 후
                            폐기됩니다.
                        </span>
                    </div>

                    {errorMessage && (
                        <p style={errorMessageStyle}>
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        style={{
                            ...submitButtonStyle,
                            backgroundColor:
                                isFormValid && !isSubmitting
                                    ? '#4169e1'
                                    : '#cbd0d8',
                            cursor:
                                isFormValid && !isSubmitting
                                    ? 'pointer'
                                    : 'not-allowed'
                        }}
                    >
                        {isSubmitting
                            ? '제출 중입니다'
                            : '후기 제출하기'}
                    </button>

                    <p style={submitHelpStyle}>
                        관리자 검수 후 지도에 반영됩니다.
                    </p>
                </section>
            </main>

            {isAiModalOpen && (
                <div
                    style={modalOverlayStyle}
                    onClick={() => setIsAiModalOpen(false)}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="AI 후기 순화"
                        style={aiModalStyle}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div style={modalDragHandleStyle} />

                        <div style={aiModalHeaderStyle}>
                            <h2 style={aiModalTitleStyle}>
                                AI 후기 순화
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsAiModalOpen(false)
                                }
                                style={modalCloseButtonStyle}
                                aria-label="AI 후기 순화 닫기"
                            >
                                ✕
                            </button>
                        </div>

                        <div style={aiModalBodyStyle}>
                            {isAiLoading ? (
                                <div style={aiLoadingStyle}>
                                    AI가 후기를 순화하고 있습니다.
                                </div>
                            ) : (
                                AI_REWRITE_OPTIONS.map((option) => {
                                    const isSelected =
                                        selectedAiOption === option.id;

                                    return (
                                        <button
                                            type="button"
                                            key={option.id}
                                            onClick={() =>
                                                setSelectedAiOption(
                                                    option.id
                                                )
                                            }
                                            style={{
                                                ...aiOptionCardStyle,
                                                borderColor: isSelected
                                                    ? option.accentColor
                                                    : '#e1e5ea',
                                                backgroundColor: isSelected
                                                    ? `${option.accentColor}0D`
                                                    : '#ffffff'
                                            }}
                                        >
                                            <div style={aiOptionTopStyle}>
                                                <div>
                                                    <strong
                                                        style={{
                                                            ...aiOptionTitleStyle,
                                                            color: isSelected
                                                                ? option.accentColor
                                                                : '#333333'
                                                        }}
                                                    >
                                                        {option.title}
                                                    </strong>

                                                    <p
                                                        style={{
                                                            ...aiOptionDescriptionStyle,
                                                            color: isSelected
                                                                ? option.accentColor
                                                                : '#8a929d'
                                                        }}
                                                    >
                                                        {option.description}
                                                    </p>
                                                </div>

                                                <span
                                                    style={{
                                                        ...radioStyle,
                                                        borderColor:
                                                            isSelected
                                                                ? option.accentColor
                                                                : '#cfd5dc',
                                                        backgroundColor:
                                                            isSelected
                                                                ? option.accentColor
                                                                : '#ffffff'
                                                    }}
                                                >
                                                    {isSelected ? '✓' : ''}
                                                </span>
                                            </div>

                                            <div style={aiCandidateTextStyle}>
                                                {aiCandidates[option.id] ||
                                                    '순화된 문장을 준비하고 있습니다.'}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div style={aiModalFooterStyle}>
                            <button
                                type="button"
                                onClick={applyAiRewrite}
                                disabled={isAiLoading}
                                style={applyAiButtonStyle}
                            >
                                이 버전으로 적용하기
                                <span aria-hidden="true">›</span>
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

const pageStyle = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f7f8fa',
    overflow: 'hidden'
};

const headerStyle = {
    minHeight: '64px',
    height: '64px',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e1e4e8',
    zIndex: 10
};

const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
};

const headerRightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
};

const logoBtnStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#222831',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '800'
};

const navBtnStyle = {
    padding: '8px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#596273',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
};

const btnStyle = {
    padding: '7px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #dfe3e8',
    borderRadius: '6px',
    color: '#596273',
    cursor: 'pointer',
    fontSize: '14px'
};

const kakaoLoginBtnStyle = {
    padding: '9px 16px',
    backgroundColor: '#FEE500',
    border: 'none',
    borderRadius: '8px',
    color: '#191919',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700'
};

const adminBtnStyle = {
    ...btnStyle,
    color: '#d7263d',
    borderColor: '#d7263d',
    fontWeight: '700'
};

const profileButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer'
};

const profileCircleStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '1px solid #e3e6ea'
};

const profileImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
};

const profileTextStyle = {
    color: '#333333',
    fontSize: '14px',
    fontWeight: '700'
};

const mainScrollStyle = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch'
};

const formContainerStyle = {
    width: '100%',
    maxWidth: '640px',
    margin: '0 auto',
    padding: '34px 24px 72px',
    boxSizing: 'border-box'
};

const backButtonStyle = {
    marginBottom: '14px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9aa2ad',
    cursor: 'pointer',
    fontSize: '13px'
};

const workspaceHeaderStyle = {
    marginBottom: '26px'
};

const workspaceTitleStyle = {
    margin: '0 0 6px',
    color: '#222831',
    fontSize: '24px',
    fontWeight: '900',
    letterSpacing: '-0.5px'
};

const workspaceMetaStyle = {
    margin: 0,
    color: '#9aa2ad',
    fontSize: '13px'
};

const formSectionStyle = {
    marginBottom: '28px'
};

const sectionHeadingRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px'
};

const sectionTitleStyle = {
    margin: 0,
    color: '#222831',
    fontSize: '17px',
    fontWeight: '900'
};

const requiredTextStyle = {
    color: '#ff4d4f',
    fontSize: '12px',
    fontWeight: '800'
};

const sectionHelpStyle = {
    margin: '0 0 13px',
    color: '#9aa2ad',
    fontSize: '12px',
    lineHeight: '1.5'
};

const checklistStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const checkItemStyle = {
    minHeight: '46px',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid',
    boxSizing: 'border-box',
    color: '#525b67',
    cursor: 'pointer',
    fontSize: '13px'
};

const checkboxStyle = {
    width: '16px',
    height: '16px',
    accentColor: '#4169e1'
};

const textInputStyle = {
    width: '100%',
    height: '46px',
    padding: '0 14px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    border: '1px solid #dde2e7',
    outline: 'none',
    color: '#333333',
    fontSize: '13px'
};

const uploadBoxStyle = {
    minHeight: '138px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    border: '1px dashed #d9dee5',
    color: '#7e8793',
    cursor: 'pointer',
    textAlign: 'center'
};

const uploadIconStyle = {
    marginBottom: '8px',
    fontSize: '24px',
    lineHeight: 1
};

const uploadTitleStyle = {
    marginBottom: '5px',
    color: '#67717e',
    fontSize: '13px'
};

const uploadSubTextStyle = {
    color: '#a2a9b2',
    fontSize: '11px'
};

const fileListStyle = {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
};

const fileRowStyle = {
    minHeight: '34px',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: '#eef0f3',
    color: '#596273',
    fontSize: '12px'
};

const fileNameStyle = {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};

const fileRemoveButtonStyle = {
    flexShrink: 0,
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9aa2ad',
    cursor: 'pointer'
};

const textareaWrapperStyle = {
    position: 'relative'
};

const textareaStyle = {
    width: '100%',
    minHeight: '140px',
    padding: '14px 14px 34px',
    boxSizing: 'border-box',
    resize: 'vertical',
    backgroundColor: '#ffffff',
    border: '1px solid #dde2e7',
    outline: 'none',
    color: '#333333',
    fontFamily: 'inherit',
    fontSize: '13px',
    lineHeight: '1.65'
};

const characterCountStyle = {
    position: 'absolute',
    right: '12px',
    bottom: '10px',
    color: '#a1a8b1',
    fontSize: '11px'
};

const aiRewriteButtonStyle = {
    width: '100%',
    height: '42px',
    marginTop: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #dde2e7',
    color: '#6b7480',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
};

const warningBoxStyle = {
    minHeight: '46px',
    marginBottom: '14px',
    padding: '11px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxSizing: 'border-box',
    backgroundColor: '#fff7ec',
    border: '1px solid #ffd5a5',
    color: '#bf6500',
    fontSize: '12px',
    lineHeight: '1.5'
};

const warningIconStyle = {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid #ff8a00',
    borderRadius: '50%',
    fontSize: '11px',
    fontWeight: '800'
};

const errorMessageStyle = {
    margin: '0 0 12px',
    color: '#d64040',
    fontSize: '12px',
    textAlign: 'center'
};

const submitButtonStyle = {
    width: '100%',
    height: '48px',
    border: 'none',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '800'
};

const submitHelpStyle = {
    margin: '12px 0 0',
    color: '#a1a8b1',
    fontSize: '11px',
    textAlign: 'center'
};

const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    overflowY: 'auto'
};

const aiModalStyle = {
    position: 'absolute',
    left: '50%',
    top: '58%',
    transform: 'translate(-50%, -50%)',
    width: 'min(560px, calc(100% - 32px))',
    maxHeight: '78vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 18px 50px rgba(0,0,0,0.26)',
    overflow: 'hidden'
};

const modalDragHandleStyle = {
    width: '34px',
    height: '4px',
    margin: '10px auto 2px',
    backgroundColor: '#e1e5ea',
    borderRadius: '4px'
};

const aiModalHeaderStyle = {
    minHeight: '56px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #edf0f3',
    boxSizing: 'border-box'
};

const aiModalTitleStyle = {
    margin: 0,
    color: '#222831',
    fontSize: '17px',
    fontWeight: '900'
};

const modalCloseButtonStyle = {
    width: '30px',
    height: '30px',
    padding: 0,
    backgroundColor: '#f5f6f8',
    border: 'none',
    borderRadius: '50%',
    color: '#9aa2ad',
    cursor: 'pointer'
};

const aiModalBodyStyle = {
    minHeight: 0,
    padding: '16px 20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto'
};

const aiLoadingStyle = {
    padding: '42px 20px',
    color: '#7f8792',
    fontSize: '13px',
    textAlign: 'center'
};

const aiOptionCardStyle = {
    width: '100%',
    padding: '14px',
    boxSizing: 'border-box',
    border: '1.5px solid',
    borderRadius: '12px',
    textAlign: 'left',
    cursor: 'pointer'
};

const aiOptionTopStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '10px'
};

const aiOptionTitleStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '13px',
    fontWeight: '900'
};

const aiOptionDescriptionStyle = {
    margin: 0,
    fontSize: '11px',
    lineHeight: '1.4'
};

const radioStyle = {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1.5px solid',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '900'
};

const aiCandidateTextStyle = {
    padding: '12px',
    backgroundColor: 'rgba(247,248,250,0.92)',
    borderRadius: '8px',
    color: '#4b5563',
    fontSize: '12px',
    lineHeight: '1.65'
};

const aiModalFooterStyle = {
    padding: '10px 20px 16px',
    backgroundColor: '#ffffff'
};

const applyAiButtonStyle = {
    width: '100%',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#4169e1',
    border: 'none',
    borderRadius: '9px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800'
};

export default ReviewWrite;