import React, {
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import {
    useLocation,
    useNavigate,
    useParams
} from 'react-router-dom';
import { submitReview, purifyReview } from '../api/reviews';
import {
    getWorkspaceDetail,
    resolveWorkspace
} from '../api/workspace';
import {
    buildReviewRequestPayload,
    REVIEW_FORM_INDICATORS
} from '../constants/reviewIndicators';
import ReviewPurifyModal from '../components/ai/ReviewPurifyModal';
import AppHeader from '../components/AppHeader';
import {
    beginKakaoLogin,
    getStoredAuth
} from '../utils/auth';

const MIN_REVIEW_LENGTH = 10;
const MAX_EVIDENCE_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = [
    'jpg',
    'jpeg',
    'jfif',
    'png',
    'pdf'
];
const JPEG_EXTENSIONS = ['jpg', 'jpeg', 'jfif'];
const JPEG_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg'
];
const PDF_EXTENSIONS = ['pdf'];
const PDF_MIME_TYPES = [
    'application/pdf',
    'application/x-pdf',
    'application/acrobat'
];

const PURIFY_OPTIONS = [
    {
        id: 'soft',
        title: '완곡형',
        subtitle: '부드럽고 완화된 표현으로 감정 충돌 없이 전달',
        accentColor: '#1fd19a'
    },
    {
        id: 'objective',
        title: '객관형',
        subtitle: '감정 없이 사실만 간결하게 기록한 진술체',
        accentColor: '#4a72ff'
    },
    {
        id: 'emotional',
        title: '감정유지형',
        subtitle: '원문 뉘앙스를 살리되 표현을 한층 순화',
        accentColor: '#ff7b1a'
    }
];

const SHIFT_DAY_OPTIONS = [
    {
        id: 'weekday',
        label: '평일'
    },
    {
        id: 'weekend',
        label: '주말'
    }
];

const SHIFT_TIME_OPTIONS = [
    {
        id: 'morning',
        label: '오전'
    },
    {
        id: 'afternoon',
        label: '오후'
    },
    {
        id: 'night',
        label: '야간'
    }
];

const isImageFile = (file) =>
    file.type.startsWith('image/');

const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)}KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const getFileExtension = (fileName = '') =>
    fileName.split('.').pop()?.toLowerCase() || '';

const isJpegLikeFile = (file) => {
    const extension = getFileExtension(file.name);
    const mimeType = String(file.type || '').toLowerCase();

    return (
        JPEG_EXTENSIONS.includes(extension) ||
        JPEG_MIME_TYPES.includes(mimeType)
    );
};

const isPdfLikeFile = (file) => {
    const extension = getFileExtension(file.name);
    const mimeType = String(file.type || '').toLowerCase();

    return (
        PDF_EXTENSIONS.includes(extension) ||
        PDF_MIME_TYPES.includes(mimeType)
    );
};

const normalizeEvidenceFile = (file) => {
    if (isJpegLikeFile(file)) {
        const hasExtension = /\.[^.]+$/.test(file.name);
        const normalizedName = hasExtension
            ? file.name.replace(/\.[^.]+$/i, '.jpg')
            : `${file.name}.jpg`;

        if (
            file.name === normalizedName &&
            file.type === 'image/jpeg'
        ) {
            return file;
        }

        return new File([file], normalizedName, {
            type: 'image/jpeg',
            lastModified: file.lastModified
        });
    }

    if (isPdfLikeFile(file)) {
        const hasExtension = /\.[^.]+$/.test(file.name);
        const normalizedName = hasExtension
            ? file.name.replace(/\.[^.]+$/i, '.pdf')
            : `${file.name}.pdf`;

        if (
            file.name === normalizedName &&
            file.type === 'application/pdf'
        ) {
            return file;
        }

        return new File([file], normalizedName, {
            type: 'application/pdf',
            lastModified: file.lastModified
        });
    }

    return file;
};

const isAllowedEvidenceFile = (file) => {
    const extension = getFileExtension(file.name);
    const mimeType = String(file.type || '').toLowerCase();

    return (
        ALLOWED_FILE_EXTENSIONS.includes(extension) ||
        [
            ...JPEG_MIME_TYPES,
            ...PDF_MIME_TYPES,
            'image/png'
        ].includes(
            mimeType
        )
    );
};

const readWorkspaceName = (workspace) =>
    workspace?.name ||
    workspace?.placeName ||
    workspace?.place_name ||
    '선택한 사업장';

const readWorkspaceCategory = (workspace) =>
    workspace?.category ||
    workspace?.categoryName ||
    workspace?.category_name ||
    '업종 정보 없음';

const readWorkspaceAddress = (workspace) =>
    workspace?.address ||
    workspace?.roadAddress ||
    workspace?.addressName ||
    workspace?.address_name ||
    workspace?.road_address_name ||
    '주소 정보 없음';

const buildResolveWorkspacePayload = (workspace) => ({
    kakaoPlaceId:
        String(
            workspace?.kakaoPlaceId ||
                workspace?.providerPlaceId ||
                workspace?.id ||
                ''
        ).trim(),
    name: readWorkspaceName(workspace),
    address:
        workspace?.address ||
        workspace?.addressName ||
        workspace?.address_name ||
        '',
    category: readWorkspaceCategory(workspace),
    latitude: Number(
        workspace?.latitude ?? workspace?.y
    ),
    longitude: Number(
        workspace?.longitude ?? workspace?.x
    )
});

const buildFileSignature = (file) =>
    [
        file.name,
        file.size,
        file.lastModified,
        file.type || ''
    ].join(':');

const createEvidenceItem = (file) => ({
    id:
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
    signature: buildFileSignature(file),
    file,
    isImage: isImageFile(file),
    previewUrl: isImageFile(file)
        ? URL.createObjectURL(file)
        : null
});

const revokeEvidencePreview = (item) => {
    if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
    }
};

const useIsMobile = () => {
    const getInitialValue = () =>
        typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 720px)').matches
            : false;

    const [isMobile, setIsMobile] = useState(getInitialValue);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia(
            '(max-width: 720px)'
        );

        const handleChange = (event) => {
            setIsMobile(event.matches);
        };

        setIsMobile(mediaQuery.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener(
                'change',
                handleChange
            );

            return () =>
                mediaQuery.removeEventListener(
                    'change',
                    handleChange
                );
        }

        mediaQuery.addListener(handleChange);

        return () => mediaQuery.removeListener(handleChange);
    }, []);

    return isMobile;
};

const EvidencePreviewList = ({
    evidenceItems,
    onRemove,
    isMobile
}) => (
    <div
        style={{
            ...previewGridStyle,
            gridTemplateColumns: '1fr'
        }}
    >
        {evidenceItems.map((item) => (
            <article
                key={item.id}
                style={previewCardStyle}
            >
                <div style={previewThumbStyle}>
                    {item.isImage ? (
                        <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            style={previewImageStyle}
                        />
                    ) : (
                        <div style={pdfThumbStyle}>PDF</div>
                    )}
                </div>

                <div style={previewMetaStyle}>
                    <strong style={previewNameStyle}>
                        {item.file.name}
                    </strong>
                    <span style={previewSubTextStyle}>
                        {formatFileSize(item.file.size)}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    style={previewRemoveButtonStyle}
                >
                    삭제
                </button>
            </article>
        ))}
    </div>
);

const PurifyModal = ({
    isOpen,
    isLoading,
    selectedTone,
    suggestions,
    onSelect,
    onApply,
    onClose
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            style={modalOverlayStyle}
            onClick={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label="AI 후기 순화"
                style={modalCardStyle}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={modalHandleStyle} />

                <div style={modalHeaderStyle}>
                    <h2 style={modalTitleStyle}>AI 후기 순화</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        style={modalCloseButtonStyle}
                        aria-label="AI 후기 순화 닫기"
                    >
                        ×
                    </button>
                </div>

                <div style={modalBodyStyle}>
                    {isLoading ? (
                        <div style={modalLoadingStyle}>
                            AI가 표현을 정리하고 있습니다.
                        </div>
                    ) : (
                        PURIFY_OPTIONS.map((option) => {
                            const isSelected =
                                selectedTone === option.id;

                            return (
                                <button
                                    type="button"
                                    key={option.id}
                                    onClick={() =>
                                        onSelect(option.id)
                                    }
                                    style={{
                                        ...toneCardStyle,
                                        borderColor: isSelected
                                            ? option.accentColor
                                            : '#e6e9ee',
                                        backgroundColor: isSelected
                                            ? `${option.accentColor}14`
                                            : '#ffffff'
                                    }}
                                >
                                    <div
                                        style={toneCardHeaderStyle}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    ...toneTitleStyle,
                                                    color: isSelected
                                                        ? option.accentColor
                                                        : '#1f2430'
                                                }}
                                            >
                                                {option.title}
                                            </div>
                                            <p
                                                style={{
                                                    ...toneSubtitleStyle,
                                                    color: isSelected
                                                        ? option.accentColor
                                                        : '#98a0ab'
                                                }}
                                            >
                                                {option.subtitle}
                                            </p>
                                        </div>

                                        <span
                                            style={{
                                                ...toneRadioStyle,
                                                borderColor: isSelected
                                                    ? option.accentColor
                                                    : '#d2d8e0',
                                                backgroundColor: isSelected
                                                    ? option.accentColor
                                                    : '#ffffff'
                                            }}
                                        >
                                            {isSelected ? '✓' : ''}
                                        </span>
                                    </div>

                                    <div style={toneTextStyle}>
                                        {suggestions[option.id] ||
                                            '순화 결과를 준비하고 있습니다.'}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div style={modalFooterStyle}>
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={isLoading}
                        style={{
                            ...applyButtonStyle,
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        이 버전으로 적용하기
                        <span aria-hidden="true">›</span>
                    </button>
                </div>
            </section>
        </div>
    );
};

const SubmissionOverlay = ({
    onGoHome
}) => (
    <div style={submissionOverlayStyle}>
        <div style={submissionCardStyle}>
            <div style={submissionBadgeStyle}>
                관리자 검수 중
            </div>

            <div style={submissionIconStyle}>✓</div>

            <h2 style={submissionTitleStyle}>
                후기 제출이 완료되었습니다.
            </h2>

            <p style={submissionTextStyle}>
                관리자에 의해 검수중입니다
            </p>

            <button
                type="button"
                onClick={onGoHome}
                style={submissionButtonStyle}
            >
                홈으로 돌아가기
            </button>
        </div>
    </div>
);

const ReviewWrite = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { workspaceId: workspaceIdParam } = useParams();
    const fileInputRef = useRef(null);
    const evidenceItemsRef = useRef([]);
    const shiftMenuRef = useRef(null);
    const isMobile = useIsMobile();

    const [authState, setAuthState] = useState(
        getStoredAuth()
    );
    const [workspace, setWorkspace] = useState(
        location.state?.workspace || null
    );
    const [workspaceError, setWorkspaceError] = useState('');
    const [isWorkspaceLoading, setIsWorkspaceLoading] =
        useState(false);
    const [isWorkspaceResolving, setIsWorkspaceResolving] =
        useState(false);

    const [selectedViolations, setSelectedViolations] =
        useState([]);
    const [isShiftMenuOpen, setIsShiftMenuOpen] =
        useState(false);
    const [selectedShiftDay, setSelectedShiftDay] =
        useState('');
    const [selectedShiftTime, setSelectedShiftTime] =
        useState('');
    const [simultaneousWorkers, setSimultaneousWorkers] =
        useState('');
    const [reviewText, setReviewText] = useState('');
    const [evidenceItems, setEvidenceItems] = useState([]);

    const [uploadMessage, setUploadMessage] = useState('');
    const [formErrorMessage, setFormErrorMessage] =
        useState('');
    const [aiNoticeMessage, setAiNoticeMessage] =
        useState('');

    const [isPurifyModalOpen, setIsPurifyModalOpen] =
        useState(false);
    const [isPurifyLoading, setIsPurifyLoading] =
        useState(false);
    const [selectedTone, setSelectedTone] = useState('soft');
    const [purifySuggestions, setPurifySuggestions] =
        useState({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmissionComplete, setIsSubmissionComplete] =
        useState(false);

    const numericWorkspaceId = useMemo(() => {
        if (
            !workspaceIdParam ||
            workspaceIdParam === 'new'
        ) {
            return null;
        }

        const parsed = Number(workspaceIdParam);

        return Number.isFinite(parsed) ? parsed : null;
    }, [workspaceIdParam]);

    const resolvedWorkspaceId = useMemo(() => {
        if (numericWorkspaceId) {
            return numericWorkspaceId;
        }

        const fallbackId = Number(
            workspace?.workspaceId || workspace?.id
        );

        return Number.isFinite(fallbackId)
            ? fallbackId
            : null;
    }, [numericWorkspaceId, workspace]);

    const coworkerCount = useMemo(() => {
        if (!simultaneousWorkers.trim()) {
            return null;
        }

        const parsed = Number(simultaneousWorkers);

        return Number.isInteger(parsed) && parsed >= 0
            ? parsed
            : null;
    }, [simultaneousWorkers]);

    const selectedShiftLabel = useMemo(() => {
        if (!selectedShiftDay || !selectedShiftTime) {
            return '';
        }

        const dayLabel =
            SHIFT_DAY_OPTIONS.find(
                (option) =>
                    option.id === selectedShiftDay
            )?.label || '';
        const timeLabel =
            SHIFT_TIME_OPTIONS.find(
                (option) =>
                    option.id === selectedShiftTime
            )?.label || '';

        if (!dayLabel || !timeLabel) {
            return '';
        }

        return `${dayLabel} · ${timeLabel}`;
    }, [selectedShiftDay, selectedShiftTime]);

    const isFormValid = useMemo(
        () =>
            coworkerCount !== null &&
            evidenceItems.length > 0 &&
            reviewText.trim().length >= MIN_REVIEW_LENGTH,
        [
            coworkerCount,
            evidenceItems.length,
            reviewText
        ]
    );

    useEffect(() => {
        if (location.state?.workspace) {
            setWorkspace(location.state.workspace);
        }
    }, [location.state]);

    useEffect(() => {
        if (!isShiftMenuOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (
                shiftMenuRef.current &&
                !shiftMenuRef.current.contains(
                    event.target
                )
            ) {
                setIsShiftMenuOpen(false);
            }
        };

        document.addEventListener(
            'mousedown',
            handlePointerDown
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handlePointerDown
            );
        };
    }, [isShiftMenuOpen]);

    useEffect(() => {
        if (workspace) {
            return undefined;
        }

        if (!numericWorkspaceId) {
            const savedPlace = sessionStorage.getItem(
                'selected_kakao_place'
            );

            if (savedPlace) {
                try {
                    setWorkspace(JSON.parse(savedPlace));
                    return undefined;
                } catch (error) {
                    console.warn(
                        '선택한 사업장 임시 정보를 복원하지 못했습니다.',
                        error
                    );
                }
            }

            setWorkspaceError(
                '선택된 사업장 정보가 없습니다. 다시 선택해 주세요.'
            );
            return undefined;
        }

        let isMounted = true;

        const fetchWorkspace = async () => {
            setWorkspaceError('');
            setIsWorkspaceLoading(true);

            try {
                const data = await getWorkspaceDetail(
                    numericWorkspaceId
                );

                if (isMounted) {
                    setWorkspace(data);
                }
            } catch (error) {
                console.error(
                    '사업장 상세 정보를 불러오지 못했습니다.',
                    error
                );

                if (isMounted) {
                    setWorkspaceError(
                        '사업장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
                    );
                }
            } finally {
                if (isMounted) {
                    setIsWorkspaceLoading(false);
                }
            }
        };

        fetchWorkspace();

        return () => {
            isMounted = false;
        };
    }, [numericWorkspaceId, workspace]);

    useEffect(() => {
        if (
            !authState.isLoggedIn ||
            !workspace ||
            resolvedWorkspaceId ||
            isWorkspaceResolving
        ) {
            return undefined;
        }

        const resolvePayload =
            buildResolveWorkspacePayload(workspace);

        if (
            !resolvePayload.kakaoPlaceId ||
            !Number.isFinite(resolvePayload.latitude) ||
            !Number.isFinite(resolvePayload.longitude)
        ) {
            return undefined;
        }

        let isMounted = true;

        const syncWorkspace = async () => {
            setIsWorkspaceResolving(true);
            setWorkspaceError('');

            try {
                const data = await resolveWorkspace(
                    resolvePayload
                );

                if (!isMounted) {
                    return;
                }

                setWorkspace((current) => ({
                    ...current,
                    workspaceId: data.workspaceId,
                    existing: true
                }));
            } catch (error) {
                console.error(
                    '사업장 정보를 동기화하지 못했습니다.',
                    error
                );

                if (isMounted) {
                    setWorkspaceError(
                        '사업장 정보를 등록하지 못했습니다. 다시 시도해 주세요.'
                    );
                }
            } finally {
                if (isMounted) {
                    setIsWorkspaceResolving(false);
                }
            }
        };

        syncWorkspace();

        return () => {
            isMounted = false;
        };
    }, [
        authState.isLoggedIn,
        isWorkspaceResolving,
        resolvedWorkspaceId,
        workspace
    ]);

    useEffect(() => {
        evidenceItemsRef.current = evidenceItems;
    }, [evidenceItems]);

    useEffect(
        () => () => {
            evidenceItemsRef.current.forEach(
                revokeEvidencePreview
            );
        },
        []
    );

    const handleKakaoLogin = () => {
        const hasStarted = beginKakaoLogin();

        if (!hasStarted) {
            alert('카카오 로그인 설정을 확인해 주세요.');
        }
    };

    const handleToggleShiftMenu = () => {
        setIsShiftMenuOpen((current) => !current);
    };

    const handleSelectShiftDay = (dayId) => {
        setSelectedShiftDay(dayId);
        setSelectedShiftTime('');
    };

    const handleSelectShiftTime = (timeId) => {
        if (!selectedShiftDay) {
            return;
        }

        setSelectedShiftTime(timeId);
        setIsShiftMenuOpen(false);
    };

    const handleResetShiftSelection = () => {
        setSelectedShiftDay('');
        setSelectedShiftTime('');
        setIsShiftMenuOpen(false);
    };

    const toggleViolation = (itemId) => {
        setSelectedViolations((current) =>
            current.includes(itemId)
                ? current.filter((id) => id !== itemId)
                : [...current, itemId]
        );
        setFormErrorMessage('');
    };

    const handleAddFiles = (files) => {
        const warnings = [];

        setEvidenceItems((current) => {
            const nextItems = [...current];

            Array.from(files).forEach((file) => {
                const normalizedFile =
                    normalizeEvidenceFile(file);

                if (!isAllowedEvidenceFile(normalizedFile)) {
                    warnings.push(
                        `${file.name}은(는) JPG, JPEG, PNG, PDF만 업로드할 수 있습니다.`
                    );
                    return;
                }

                if (
                    normalizedFile.size >
                    MAX_FILE_SIZE_BYTES
                ) {
                    warnings.push(
                        `${file.name}은(는) 10MB 이하 파일만 업로드할 수 있습니다.`
                    );
                    return;
                }

                const nextSignature =
                    buildFileSignature(normalizedFile);
                const isDuplicate = nextItems.some(
                    (item) =>
                        item.signature === nextSignature
                );

                if (isDuplicate) {
                    warnings.push(
                        `${file.name}은(는) 이미 추가된 파일입니다.`
                    );
                    return;
                }

                if (nextItems.length >= MAX_EVIDENCE_FILES) {
                    warnings.push(
                        `증빙 자료는 최대 ${MAX_EVIDENCE_FILES}개까지 업로드할 수 있습니다.`
                    );
                    return;
                }

                nextItems.push(
                    createEvidenceItem(normalizedFile)
                );
            });

            return nextItems;
        });

        setUploadMessage(warnings[0] || '');
        setFormErrorMessage('');
    };

    const handleFileChange = (event) => {
        if (event.target.files?.length) {
            handleAddFiles(event.target.files);
        }

        event.target.value = '';
    };

    const handleFileDrop = (event) => {
        event.preventDefault();

        if (event.dataTransfer.files?.length) {
            handleAddFiles(event.dataTransfer.files);
        }
    };

    const handleRemoveEvidence = (itemId) => {
        setEvidenceItems((current) => {
            const target = current.find(
                (item) => item.id === itemId
            );

            revokeEvidencePreview(target);

            return current.filter(
                (item) => item.id !== itemId
            );
        });
        setUploadMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openPurifyModal = async () => {
        if (reviewText.trim().length < MIN_REVIEW_LENGTH) {
            setFormErrorMessage(
                `AI 후기 순화는 최소 ${MIN_REVIEW_LENGTH}자 이상 작성해야 사용할 수 있습니다.`
            );
            return;
        }

        setAiNoticeMessage('');
        setFormErrorMessage('');
        setIsPurifyLoading(true);
        setIsPurifyModalOpen(true);
        setSelectedTone('soft');

        try {
            const result = await purifyReview(
                reviewText.trim()
            );

            setPurifySuggestions({
                objective: result.objective,
                soft: result.soft,
                emotional: result.emotional
            });

            if (result.source === 'fallback') {
                setAiNoticeMessage(
                    'AI 응답이 지연되어 예비 순화 문안을 먼저 보여드리고 있습니다.'
                );
            }
        } catch (error) {
            console.error(
                'AI 후기 순화 요청에 실패했습니다.',
                error
            );
            setFormErrorMessage(
                error?.response?.status === 404
                    ? 'AI 후기 순화 API가 현재 서버에 연결되어 있지 않습니다. 백엔드 배포 경로를 확인해 주세요.'
                    : 'AI 후기 순화 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            );
            setIsPurifyModalOpen(false);
        } finally {
            setIsPurifyLoading(false);
        }
    };

    const handleApplyPurifiedText = () => {
        const selectedText =
            purifySuggestions[selectedTone];

        if (selectedText) {
            setReviewText(selectedText);
            setFormErrorMessage('');
        }

        setIsPurifyModalOpen(false);
    };

    const handleSubmit = async () => {
        if (!authState.isLoggedIn) {
            handleKakaoLogin();
            return;
        }

        if (!workspace && !resolvedWorkspaceId) {
            setFormErrorMessage(
                '사업장 정보가 없어 제출할 수 없습니다. 다시 선택해 주세요.'
            );
            return;
        }

        if (!resolvedWorkspaceId) {
            setFormErrorMessage(
                '사업장 정보를 동기화하는 중입니다. 잠시 후 다시 시도해 주세요.'
            );
            return;
        }

        if (!isFormValid) {
            setFormErrorMessage(
                '필수 항목을 모두 입력한 뒤 제출해 주세요.'
            );
            return;
        }

        setIsSubmitting(true);
        setFormErrorMessage('');

        try {
            await submitReview({
                workspaceId: resolvedWorkspaceId,
                reviewData: buildReviewRequestPayload({
                    selectedIndicatorIds: selectedViolations,
                    coworkerCount,
                    content: reviewText
                }),
                evidenceFiles: evidenceItems.map(
                    (item) => item.file
                )
            });

            sessionStorage.removeItem(
                'selected_kakao_place'
            );
            setIsSubmissionComplete(true);
        } catch (error) {
            console.error('후기 제출에 실패했습니다.', error);
            setFormErrorMessage(
                error?.message ||
                    '후기 제출 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const workspaceName = isWorkspaceLoading
        ? '사업장 정보를 불러오는 중입니다.'
        : isWorkspaceResolving
            ? '사업장 정보를 등록하는 중입니다.'
            : readWorkspaceName(workspace);

    const workspaceCategory =
        readWorkspaceCategory(workspace);
    const workspaceAddress = readWorkspaceAddress(workspace);

    return (
        <div style={pageStyle}>
            <AppHeader />

            <main style={mainStyle}>
                <section
                    style={{
                        ...formShellStyle,
                        padding: isMobile
                            ? '26px 20px 80px'
                            : '28px 0 96px'
                    }}
                >
                    <button
                        type="button"
                        onClick={() => navigate('/review/select')}
                        style={backButtonStyle}
                    >
                        ‹ 돌아가기
                    </button>

                    {workspaceError && !workspace ? (
                        <div style={emptyCardStyle}>
                            <strong style={emptyTitleStyle}>
                                사업장 정보를 확인할 수 없습니다.
                            </strong>
                            <p style={emptyTextStyle}>
                                {workspaceError}
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate('/review/select', {
                                        replace: true
                                    })
                                }
                                style={emptyActionStyle}
                            >
                                사업장 다시 선택하기
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={workspaceHeaderStyle}>
                                <h1 style={workspaceTitleStyle}>
                                    {workspaceName}
                                </h1>
                                <p style={workspaceMetaStyle}>
                                    {workspaceCategory} ·{' '}
                                    {workspaceAddress}
                                </p>
                            </div>

                            <section style={sectionStyle}>
                                <div
                                    style={sectionTitleRowStyle}
                                >
                                    <h2 style={sectionTitleStyle}>
                                        근무 시간대
                                    </h2>
                                </div>
                                <p style={sectionHelpStyle}>
                                    선택 버튼을 누른 뒤 평일 또는 주말을
                                    고르고, 이어서 오전·오후·야간 중 하나를
                                    선택해 주세요.
                                </p>

                                <div
                                    ref={shiftMenuRef}
                                    style={shiftMenuWrapStyle}
                                >
                                    <button
                                        type="button"
                                        onClick={
                                            handleToggleShiftMenu
                                        }
                                        style={
                                            shiftTriggerButtonStyle
                                        }
                                        aria-haspopup="menu"
                                        aria-expanded={
                                            isShiftMenuOpen
                                        }
                                    >
                                        <span
                                            style={
                                                selectedShiftLabel
                                                    ? shiftTriggerValueStyle
                                                    : shiftTriggerPlaceholderStyle
                                            }
                                        >
                                            {selectedShiftLabel ||
                                                '선택'}
                                        </span>

                                        <span
                                            style={{
                                                ...shiftArrowStyle,
                                                transform:
                                                    isShiftMenuOpen
                                                        ? 'rotate(180deg)'
                                                        : 'rotate(0deg)'
                                            }}
                                        >
                                            ▾
                                        </span>
                                    </button>

                                    {isShiftMenuOpen && (
                                        <div
                                            style={{
                                                ...shiftMenuPanelStyle,
                                                gridTemplateColumns:
                                                    isMobile
                                                        ? '1fr'
                                                        : 'repeat(2, minmax(0, 1fr))'
                                            }}
                                        >
                                            <div
                                                style={
                                                    shiftMenuColumnStyle
                                                }
                                            >
                                                <span
                                                    style={
                                                        shiftMenuColumnTitleStyle
                                                    }
                                                >
                                                    1단계
                                                </span>

                                                <div
                                                    style={
                                                        shiftMenuOptionsStyle
                                                    }
                                                >
                                                    {SHIFT_DAY_OPTIONS.map(
                                                        (
                                                            option
                                                        ) => (
                                                            <button
                                                                key={
                                                                    option.id
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    handleSelectShiftDay(
                                                                        option.id
                                                                    )
                                                                }
                                                                style={{
                                                                    ...shiftOptionButtonStyle,
                                                                    borderColor:
                                                                        selectedShiftDay ===
                                                                        option.id
                                                                            ? '#4a72ff'
                                                                            : '#e4e8ef',
                                                                    backgroundColor:
                                                                        selectedShiftDay ===
                                                                        option.id
                                                                            ? '#eff3ff'
                                                                            : '#ffffff',
                                                                    color:
                                                                        selectedShiftDay ===
                                                                        option.id
                                                                            ? '#3158e8'
                                                                            : '#4d5766'
                                                                }}
                                                            >
                                                                {
                                                                    option.label
                                                                }
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                style={
                                                    shiftMenuColumnStyle
                                                }
                                            >
                                                <span
                                                    style={
                                                        shiftMenuColumnTitleStyle
                                                    }
                                                >
                                                    2단계
                                                </span>

                                                {selectedShiftDay ? (
                                                    <div
                                                        style={
                                                            shiftMenuOptionsStyle
                                                        }
                                                    >
                                                        {SHIFT_TIME_OPTIONS.map(
                                                            (
                                                                option
                                                            ) => (
                                                                <button
                                                                    key={
                                                                        option.id
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleSelectShiftTime(
                                                                            option.id
                                                                        )
                                                                    }
                                                                    style={{
                                                                        ...shiftOptionButtonStyle,
                                                                        borderColor:
                                                                            selectedShiftTime ===
                                                                            option.id
                                                                                ? '#4a72ff'
                                                                                : '#e4e8ef',
                                                                        backgroundColor:
                                                                            selectedShiftTime ===
                                                                            option.id
                                                                                ? '#eff3ff'
                                                                                : '#ffffff',
                                                                        color:
                                                                            selectedShiftTime ===
                                                                            option.id
                                                                                ? '#3158e8'
                                                                                : '#4d5766'
                                                                    }}
                                                                >
                                                                    {
                                                                        option.label
                                                                    }
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div
                                                        style={
                                                            shiftEmptyStateStyle
                                                        }
                                                    >
                                                        먼저 평일 또는 주말을
                                                        선택해 주세요.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedShiftLabel && (
                                    <div
                                        style={
                                            shiftSelectionRowStyle
                                        }
                                    >
                                        <span
                                            style={
                                                shiftSelectionChipStyle
                                            }
                                        >
                                            {selectedShiftLabel}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={
                                                handleResetShiftSelection
                                            }
                                            style={
                                                shiftResetButtonStyle
                                            }
                                        >
                                            선택 초기화
                                        </button>
                                    </div>
                                )}
                            </section>

                            <section style={sectionStyle}>
                                <div
                                    style={sectionTitleRowStyle}
                                >
                                    <h2 style={sectionTitleStyle}>
                                        근로기준법 준수 체크리스트
                                    </h2>
                                    <span
                                        style={
                                            requiredBadgeStyle
                                        }
                                    >
                                        *필수
                                    </span>
                                </div>
                                <p style={sectionHelpStyle}>
                                    위반한 항목을 체크해주세요.
                                    (체크 = 위반, 해당 없으면 체크하지 않아도 됩니다.)
                                </p>

                                <div style={checklistStyle}>
                                    {REVIEW_FORM_INDICATORS.map(
                                        (item) => {
                                            const isChecked =
                                                selectedViolations.includes(
                                                    item.id
                                                );

                                            return (
                                                <label
                                                    key={item.id}
                                                    style={{
                                                        ...checkItemStyle,
                                                        borderColor:
                                                            isChecked
                                                                ? '#4a72ff'
                                                                : '#e7ebf1',
                                                        backgroundColor:
                                                            isChecked
                                                                ? '#f9fbff'
                                                                : '#ffffff'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isChecked
                                                        }
                                                        onChange={() =>
                                                            toggleViolation(
                                                                item.id
                                                            )
                                                        }
                                                        style={
                                                            checkboxStyle
                                                        }
                                                    />
                                                    <span
                                                        style={
                                                            checkLabelStyle
                                                        }
                                                    >
                                                        {item.label}
                                                    </span>
                                                </label>
                                            );
                                        }
                                    )}
                                </div>
                            </section>

                            <section style={sectionStyle}>
                                <div
                                    style={sectionTitleRowStyle}
                                >
                                    <h2 style={sectionTitleStyle}>
                                        동시간대 업무자 수
                                    </h2>
                                    <span
                                        style={
                                            requiredBadgeStyle
                                        }
                                    >
                                        *필수
                                    </span>
                                </div>
                                <p style={sectionHelpStyle}>
                                    근무 중 같은 시간대에 함께 일한 인원을 숫자로 적어주세요.
                                </p>

                                <input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={simultaneousWorkers}
                                    onChange={(event) => {
                                        setSimultaneousWorkers(
                                            event.target.value
                                        );
                                        setFormErrorMessage(
                                            ''
                                        );
                                    }}
                                    placeholder="예: 3"
                                    style={textInputStyle}
                                />
                            </section>

                            <section style={sectionStyle}>
                                <div
                                    style={sectionTitleRowStyle}
                                >
                                    <h2 style={sectionTitleStyle}>
                                        근로 인증 자료
                                    </h2>
                                    <span
                                        style={
                                            requiredBadgeStyle
                                        }
                                    >
                                        *필수
                                    </span>
                                </div>
                                <p style={sectionHelpStyle}>
                                    근로계약서, 급여 입금 내역, 보험 내역 등
                                    (jpg, jpeg, png, pdf / 파일당 최대
                                    10MB / 최대 5개)
                                </p>

                                <div
                                    style={uploadBoxStyle}
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDrop={handleFileDrop}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key ===
                                                'Enter' ||
                                            event.key === ' '
                                        ) {
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        multiple
                                        onChange={
                                            handleFileChange
                                        }
                                        style={{
                                            display: 'none'
                                        }}
                                    />

                                    <div style={uploadIconStyle}>
                                        ⇪
                                    </div>
                                    <strong
                                        style={uploadTitleStyle}
                                    >
                                        파일을 드래그하거나 클릭해서 업로드
                                    </strong>
                                    <span
                                        style={uploadTextStyle}
                                    >
                                        JPG · JPEG · PNG · PDF 지원
                                    </span>
                                </div>

                                <div style={uploadMetaRowStyle}>
                                    <span>
                                        업로드 {evidenceItems.length}/
                                        {MAX_EVIDENCE_FILES}
                                    </span>
                                    <span>
                                        이미지 파일은 미리보기가 제공됩니다.
                                    </span>
                                </div>

                                {uploadMessage && (
                                    <p
                                        style={
                                            inlineWarningTextStyle
                                        }
                                    >
                                        {uploadMessage}
                                    </p>
                                )}

                                {evidenceItems.length > 0 && (
                                    <EvidencePreviewList
                                        evidenceItems={
                                            evidenceItems
                                        }
                                        onRemove={
                                            handleRemoveEvidence
                                        }
                                        isMobile={isMobile}
                                    />
                                )}
                            </section>

                            <section style={sectionStyle}>
                                <div
                                    style={sectionTitleRowStyle}
                                >
                                    <h2 style={sectionTitleStyle}>
                                        주관식 후기
                                    </h2>
                                    <span
                                        style={
                                            requiredBadgeStyle
                                        }
                                    >
                                        *필수
                                    </span>
                                </div>
                                <p style={sectionHelpStyle}>
                                    자유롭게 작성하면 AI가 법적 위험 표현을 순화해드립니다.
                                </p>

                                <div
                                    style={
                                        textareaWrapperStyle
                                    }
                                >
                                    <textarea
                                        value={reviewText}
                                        onChange={(event) => {
                                            setReviewText(
                                                event.target.value
                                            );
                                            setFormErrorMessage(
                                                ''
                                            );
                                        }}
                                        placeholder="근무 경험을 자유롭게 작성해주세요"
                                        maxLength={1000}
                                        style={textareaStyle}
                                    />

                                    <span
                                        style={
                                            characterCountStyle
                                        }
                                    >
                                        {reviewText.length}/최소{' '}
                                        {MIN_REVIEW_LENGTH}자
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={openPurifyModal}
                                    style={purifyButtonStyle}
                                >
                                    ✨ AI 후기 순화
                                </button>

                                {aiNoticeMessage && (
                                    <p
                                        style={
                                            inlineNoticeTextStyle
                                        }
                                    >
                                        {aiNoticeMessage}
                                    </p>
                                )}
                            </section>

                            <div style={warningBoxStyle}>
                                <span style={warningIconStyle}>
                                    !
                                </span>
                                <span>
                                    허위 정보 작성 시 법적 책임이 발생할 수 있습니다.
                                    인증 자료는 관리자 검수 후 폐기됩니다.
                                </span>
                            </div>

                            {formErrorMessage && (
                                <p style={errorTextStyle}>
                                    {formErrorMessage}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={
                                    !isFormValid ||
                                    isSubmitting ||
                                    isWorkspaceResolving
                                }
                                style={{
                                    ...submitButtonStyle,
                                    backgroundColor:
                                        isFormValid &&
                                        !isSubmitting &&
                                        !isWorkspaceResolving
                                            ? '#4a72ff'
                                            : '#cfd5df',
                                    cursor:
                                        isFormValid &&
                                        !isSubmitting &&
                                        !isWorkspaceResolving
                                            ? 'pointer'
                                            : 'not-allowed'
                                }}
                            >
                                {isSubmitting
                                    ? '제출 중입니다'
                                    : isWorkspaceResolving
                                        ? '사업장 동기화 중입니다'
                                    : '후기 제출하기'}
                            </button>

                            <p style={submitHelpStyle}>
                                관리자 검수 후 지도에 반영됩니다.
                            </p>
                        </>
                    )}
                </section>
            </main>

            <ReviewPurifyModal
                isOpen={isPurifyModalOpen}
                isLoading={isPurifyLoading}
                selectedTone={selectedTone}
                suggestions={purifySuggestions}
                onSelect={setSelectedTone}
                onApply={handleApplyPurifiedText}
                onClose={() => setIsPurifyModalOpen(false)}
            />

            {isSubmissionComplete && (
                <SubmissionOverlay
                    onGoHome={() => navigate('/')}
                />
            )}
        </div>
    );
};

const pageStyle = {
    height: '100vh',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f6f8fb',
    overflow: 'hidden'
};

const headerStyle = {
    height: '64px',
    padding: '0 clamp(16px, 2.4vw, 28px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #eceff4',
    boxSizing: 'border-box'
};

const brandButtonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#121826',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '900',
    letterSpacing: '-0.3px'
};

const headerActionsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
};

const headerLinkButtonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#7d8593',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
};

const profileChipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#8c94a0',
    fontSize: '13px',
    fontWeight: '600'
};

const profileIconStyle = {
    width: '24px',
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #dce1e8',
    borderRadius: '999px',
    fontSize: '11px',
    lineHeight: 1
};

const mainStyle = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto'
};

const formShellStyle = {
    width: 'min(100%, 472px)',
    margin: '0 auto'
};

const backButtonStyle = {
    marginBottom: '14px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#adb4bf',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
};

const workspaceHeaderStyle = {
    marginBottom: '28px'
};

const workspaceTitleStyle = {
    margin: '0 0 6px',
    color: '#121826',
    fontSize: 'clamp(28px, 2vw, 38px)',
    fontWeight: '900',
    lineHeight: '1.18',
    letterSpacing: '-0.8px'
};

const workspaceMetaStyle = {
    margin: 0,
    color: '#9ba3af',
    fontSize: '13px',
    fontWeight: '500'
};

const sectionStyle = {
    marginBottom: '30px'
};

const sectionTitleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px'
};

const sectionTitleStyle = {
    margin: 0,
    color: '#1d2433',
    fontSize: '18px',
    fontWeight: '900',
    letterSpacing: '-0.3px'
};

const requiredBadgeStyle = {
    color: '#ff5a5a',
    fontSize: '12px',
    fontWeight: '800'
};

const sectionHelpStyle = {
    margin: '0 0 13px',
    color: '#a3aab5',
    fontSize: '12px',
    lineHeight: '1.55'
};

const shiftMenuWrapStyle = {
    position: 'relative'
};

const shiftTriggerButtonStyle = {
    width: '100%',
    minHeight: '46px',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e4e8ef',
    borderRadius: '10px',
    cursor: 'pointer',
    boxSizing: 'border-box'
};

const shiftTriggerPlaceholderStyle = {
    color: '#9aa2ae',
    fontSize: '13px',
    fontWeight: '600'
};

const shiftTriggerValueStyle = {
    color: '#273142',
    fontSize: '13px',
    fontWeight: '700'
};

const shiftArrowStyle = {
    color: '#8b95a3',
    fontSize: '12px',
    transition: 'transform 0.18s ease'
};

const shiftMenuPanelStyle = {
    marginTop: '10px',
    width: '100%',
    padding: '14px',
    display: 'grid',
    gap: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e7ebf1',
    borderRadius: '16px',
    boxShadow: '0 16px 34px rgba(15, 23, 42, 0.10)',
    boxSizing: 'border-box'
};

const shiftMenuColumnStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const shiftMenuColumnTitleStyle = {
    color: '#8f98a5',
    fontSize: '11px',
    fontWeight: '800'
};

const shiftMenuOptionsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const shiftOptionButtonStyle = {
    minHeight: '42px',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #e4e8ef',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700'
};

const shiftEmptyStateStyle = {
    minHeight: '142px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9aa2ae',
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '1.6',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    border: '1px dashed #dbe2ea',
    borderRadius: '10px',
    boxSizing: 'border-box'
};

const shiftSelectionRowStyle = {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
};

const shiftSelectionChipStyle = {
    padding: '8px 12px',
    borderRadius: '999px',
    backgroundColor: '#eef3ff',
    color: '#3158e8',
    fontSize: '12px',
    fontWeight: '800'
};

const shiftResetButtonStyle = {
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#8c95a1',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer'
};

const checklistStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const checkItemStyle = {
    minHeight: '40px',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid',
    borderRadius: '2px',
    cursor: 'pointer',
    boxSizing: 'border-box'
};

const checkboxStyle = {
    width: '16px',
    height: '16px',
    accentColor: '#4a72ff'
};

const checkLabelStyle = {
    color: '#606977',
    fontSize: '13px',
    fontWeight: '500'
};

const textInputStyle = {
    width: '100%',
    height: '38px',
    padding: '0 14px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    border: '1px solid #e4e8ef',
    borderRadius: '2px',
    outline: 'none',
    color: '#273142',
    fontSize: '13px'
};

const uploadBoxStyle = {
    minHeight: '126px',
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: '#ffffff',
    border: '1px dashed #d8dee7',
    borderRadius: '2px',
    textAlign: 'center',
    cursor: 'pointer'
};

const uploadIconStyle = {
    color: '#8e97a3',
    fontSize: '20px',
    lineHeight: 1
};

const uploadTitleStyle = {
    color: '#717b88',
    fontSize: '13px',
    fontWeight: '700'
};

const uploadTextStyle = {
    color: '#a0a8b3',
    fontSize: '11px',
    fontWeight: '500'
};

const uploadMetaRowStyle = {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    color: '#a1a8b3',
    fontSize: '11px',
    flexWrap: 'wrap'
};

const previewGridStyle = {
    marginTop: '10px',
    display: 'grid',
    gap: '10px'
};

const previewCardStyle = {
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #e8edf3',
    borderRadius: '8px'
};

const previewThumbStyle = {
    width: '60px',
    height: '60px',
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundColor: '#f3f5f8',
    flexShrink: 0
};

const previewImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
};

const pdfThumbStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ff6d3a',
    fontSize: '13px',
    fontWeight: '900',
    backgroundColor: '#fff3ee'
};

const previewMetaStyle = {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1
};

const previewNameStyle = {
    minWidth: 0,
    color: '#273142',
    fontSize: '12px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
};

const previewSubTextStyle = {
    color: '#9aa2ae',
    fontSize: '11px'
};

const previewRemoveButtonStyle = {
    flexShrink: 0,
    padding: '8px 10px',
    backgroundColor: '#f4f6fa',
    border: 'none',
    borderRadius: '8px',
    color: '#637083',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700'
};

const textareaWrapperStyle = {
    position: 'relative'
};

const textareaStyle = {
    width: '100%',
    minHeight: '128px',
    padding: '14px 14px 34px',
    backgroundColor: '#ffffff',
    border: '1px solid #e4e8ef',
    borderRadius: '2px',
    resize: 'vertical',
    outline: 'none',
    color: '#273142',
    fontSize: '13px',
    lineHeight: '1.7',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
};

const characterCountStyle = {
    position: 'absolute',
    right: '12px',
    bottom: '10px',
    color: '#a4acb7',
    fontSize: '11px'
};

const purifyButtonStyle = {
    width: '100%',
    height: '38px',
    marginTop: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e4e8ef',
    borderRadius: '2px',
    color: '#848d99',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
};

const warningBoxStyle = {
    minHeight: '44px',
    marginBottom: '14px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: '#fff7ee',
    border: '1px solid #ffd9af',
    color: '#c36b15',
    fontSize: '12px',
    lineHeight: '1.6'
};

const warningIconStyle = {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ff8f38',
    borderRadius: '999px',
    flexShrink: 0,
    fontSize: '11px',
    fontWeight: '900'
};

const inlineWarningTextStyle = {
    margin: '10px 0 0',
    color: '#d25f33',
    fontSize: '12px'
};

const inlineNoticeTextStyle = {
    margin: '10px 0 0',
    color: '#72809a',
    fontSize: '12px'
};

const errorTextStyle = {
    margin: '0 0 14px',
    color: '#dc4a4a',
    fontSize: '12px',
    textAlign: 'center'
};

const submitButtonStyle = {
    width: '100%',
    height: '48px',
    border: 'none',
    borderRadius: '2px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '800',
    transition: 'background-color 0.2s ease'
};

const submitHelpStyle = {
    margin: '12px 0 0',
    color: '#a6aeb9',
    fontSize: '11px',
    textAlign: 'center'
};

const emptyCardStyle = {
    padding: '26px 22px',
    backgroundColor: '#ffffff',
    border: '1px solid #e6ebf1',
    borderRadius: '12px',
    textAlign: 'center'
};

const emptyTitleStyle = {
    display: 'block',
    marginBottom: '8px',
    color: '#1f2430',
    fontSize: '16px',
    fontWeight: '800'
};

const emptyTextStyle = {
    margin: '0 0 18px',
    color: '#77808d',
    fontSize: '13px',
    lineHeight: '1.6'
};

const emptyActionStyle = {
    padding: '11px 18px',
    backgroundColor: '#4a72ff',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700'
};

const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.48)'
};

const modalCardStyle = {
    width: 'min(100%, 370px)',
    maxHeight: 'min(80vh, 620px)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 20px 56px rgba(0, 0, 0, 0.24)',
    overflow: 'hidden'
};

const modalHandleStyle = {
    width: '34px',
    height: '4px',
    margin: '8px auto 0',
    borderRadius: '999px',
    backgroundColor: '#e5e8ed'
};

const modalHeaderStyle = {
    minHeight: '48px',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #eff2f6'
};

const modalTitleStyle = {
    margin: 0,
    color: '#121826',
    fontSize: '14px',
    fontWeight: '900'
};

const modalCloseButtonStyle = {
    width: '24px',
    height: '24px',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6f9',
    border: 'none',
    borderRadius: '999px',
    color: '#a0a8b3',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1
};

const modalBodyStyle = {
    padding: '14px 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto'
};

const modalLoadingStyle = {
    padding: '48px 18px',
    color: '#798391',
    fontSize: '13px',
    textAlign: 'center'
};

const toneCardStyle = {
    width: '100%',
    padding: '14px 14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1.5px solid',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    textAlign: 'left',
    cursor: 'pointer'
};

const toneCardHeaderStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px'
};

const toneTitleStyle = {
    fontSize: '12px',
    fontWeight: '900'
};

const toneSubtitleStyle = {
    margin: '4px 0 0',
    fontSize: '10px',
    fontWeight: '600',
    lineHeight: '1.5'
};

const toneRadioStyle = {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    borderRadius: '999px',
    fontSize: '10px',
    color: '#ffffff',
    lineHeight: 1,
    flexShrink: 0
};

const toneTextStyle = {
    color: '#3d4654',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap'
};

const modalFooterStyle = {
    padding: '0 12px 12px'
};

const applyButtonStyle = {
    width: '100%',
    height: '42px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#4668ec',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '800'
};

const submissionOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 2200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: 'rgba(246, 248, 251, 0.98)'
};

const submissionCardStyle = {
    width: '100%',
    maxWidth: '320px',
    textAlign: 'center'
};

const submissionBadgeStyle = {
    marginBottom: '18px',
    color: '#6d7786',
    fontSize: '12px',
    fontWeight: '700'
};

const submissionIconStyle = {
    width: '38px',
    height: '38px',
    margin: '0 auto 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a72ff',
    borderRadius: '999px',
    color: '#ffffff',
    fontSize: '18px',
    boxShadow: '0 14px 28px rgba(74, 114, 255, 0.26)'
};

const submissionTitleStyle = {
    margin: '0 0 8px',
    color: '#121826',
    fontSize: '30px',
    fontWeight: '900',
    letterSpacing: '-0.8px'
};

const submissionTextStyle = {
    margin: '0 0 20px',
    color: '#9ca5b2',
    fontSize: '13px'
};

const submissionButtonStyle = {
    minWidth: '114px',
    height: '32px',
    padding: '0 18px',
    backgroundColor: '#ffffff',
    border: '1px solid #d7dce3',
    borderRadius: '6px',
    color: '#3f4753',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700'
};

export default ReviewWrite;
