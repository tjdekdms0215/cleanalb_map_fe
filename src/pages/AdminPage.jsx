import React, {
    useEffect,
    useMemo,
    useState
} from 'react';
import {
    downloadAdminReviewAttachment,
    getAdminReviewDetail,
    getAdminReviews,
    getAdminStats,
    updateAdminReviewContent,
    updateAdminReviewSentiment,
    updateAdminReviewStatus
} from '../api/reviews';
import { REVIEW_INDICATORS } from '../constants/reviewIndicators';
import { REVIEW_SENTIMENT_OPTIONS } from '../utils/reviewSentiment';
import AppHeader from '../components/AppHeader';

const STATUS_TABS = [
    {
        key: 'PENDING',
        label: '대기중',
        accentColor: '#FF8A3D',
        softColor: '#FFF4EA'
    },
    {
        key: 'APPROVED',
        label: '승인됨',
        accentColor: '#22B35B',
        softColor: '#EFFBF3'
    },
    {
        key: 'REJECTED',
        label: '거절됨',
        accentColor: '#FF5A57',
        softColor: '#FFF1F0'
    }
];

const useIsMobile = () => {
    const getInitialValue = () =>
        typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 920px)').matches
            : false;

    const [isMobile, setIsMobile] = useState(getInitialValue);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia(
            '(max-width: 920px)'
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

const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const period = hour < 12 ? '오전' : '오후';
    const displayHour =
        hour % 12 === 0 ? 12 : hour % 12;

    return `${year}. ${month}. ${day}. ${period} ${displayHour}:${minute}`;
};

const formatRelativeTime = (value) => {
    if (!value) {
        return '';
    }

    const submittedAt = new Date(value).getTime();

    if (Number.isNaN(submittedAt)) {
        return '';
    }

    const diffHours = Math.max(
        1,
        Math.round((Date.now() - submittedAt) / (1000 * 60 * 60))
    );

    if (diffHours < 24) {
        return `${diffHours}시간 전`;
    }

    return `${Math.round(diffHours / 24)}일 전`;
};

const formatEvidenceSize = (size) => {
    if (!Number.isFinite(size) || size <= 0) {
        return '';
    }

    if (size < 1024 * 1024) {
        return `${Math.round(size / 1024)}KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
};

const isImageEvidence = (file) =>
    file?.type === 'IMAGE' ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file?.name || '');

const triggerBlobDownload = (blob, fileName) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = fileName || '인증자료';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 1000);
};

const getStatusMeta = (status) =>
    STATUS_TABS.find(
        (tab) => tab.key === status
    ) || STATUS_TABS[0];

const ImagePlaceholderIcon = () => (
    <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            stroke="#3B78FF"
            strokeWidth="1.8"
        />
        <circle
            cx="9"
            cy="9"
            r="1.6"
            fill="#3B78FF"
        />
        <path
            d="M6.5 17L11 12.5L13.8 15.3L17.5 11.5"
            stroke="#3B78FF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PdfPlaceholderIcon = () => (
    <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M8 3.5H14.5L19 8V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
            stroke="#7C4DFF"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
        <path
            d="M14 3.5V8H18.5"
            stroke="#7C4DFF"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
        <path
            d="M9 12.5H15"
            stroke="#7C4DFF"
            strokeWidth="1.6"
            strokeLinecap="round"
        />
        <path
            d="M9 15.5H15"
            stroke="#7C4DFF"
            strokeWidth="1.6"
            strokeLinecap="round"
        />
    </svg>
);

const AdminPage = () => {
    const isMobile = useIsMobile();
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeStatus, setActiveStatus] = useState('PENDING');
    const [selectedReviewId, setSelectedReviewId] =
        useState('');
    const [selectedReview, setSelectedReview] =
        useState(null);
    const [isListLoading, setIsListLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] =
        useState(true);
    const [isDetailLoading, setIsDetailLoading] =
        useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isReviewTextEditing, setIsReviewTextEditing] =
        useState(false);
    const [editableReviewText, setEditableReviewText] =
        useState('');
    const [isReviewTextSaving, setIsReviewTextSaving] =
        useState(false);
    const [isSentimentSaving, setIsSentimentSaving] =
        useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadReviews = async () => {
        setIsListLoading(true);
        setErrorMessage('');

        try {
            const data = await getAdminReviews();
            setReviews(data);
        } catch (error) {
            console.error(
                '관리자 리뷰 목록을 불러오지 못했습니다.',
                error
            );
            setErrorMessage(
                [401, 403].includes(
                    error?.response?.status
                )
                    ? '관리자 인증이 만료되었거나 권한을 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.'
                    : '관리자 리뷰 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setIsListLoading(false);
        }
    };

    const loadStats = async () => {
        setIsStatsLoading(true);

        try {
            const data = await getAdminStats();
            setStats(data);
        } catch (error) {
            console.error(
                '관리자 통계를 불러오지 못했습니다.',
                error
            );
        } finally {
            setIsStatsLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const fetchReviews = async () => {
            if (!isMounted) {
                return;
            }

            await Promise.all([
                loadReviews(),
                loadStats()
            ]);
        };

        fetchReviews();

        return () => {
            isMounted = false;
        };
    }, []);

    const reviewsByStatus = useMemo(
        () =>
            STATUS_TABS.reduce((accumulator, tab) => {
                accumulator[tab.key] = reviews.filter(
                    (review) => review.status === tab.key
                );
                return accumulator;
            }, {}),
        [reviews]
    );

    const visibleReviews =
        reviewsByStatus[activeStatus] || [];

    useEffect(() => {
        if (!visibleReviews.length) {
            setSelectedReviewId('');
            setSelectedReview(null);
            return;
        }

        const stillVisible = visibleReviews.some(
            (review) =>
                String(review.reviewId) ===
                String(selectedReviewId)
        );

        if (!stillVisible) {
            setSelectedReviewId(
                visibleReviews[0].reviewId
            );
        }
    }, [activeStatus, selectedReviewId, visibleReviews]);

    useEffect(() => {
        if (!selectedReviewId) {
            return;
        }

        const summary = reviews.find(
            (review) =>
                String(review.reviewId) ===
                String(selectedReviewId)
        );

        if (summary) {
            setSelectedReview(summary);
        }

        let isMounted = true;

        const fetchDetail = async () => {
            setIsDetailLoading(true);

            try {
                const data = await getAdminReviewDetail(
                    selectedReviewId
                );

                if (isMounted) {
                    setSelectedReview(data);
                }
            } catch (error) {
                console.error(
                    '관리자 리뷰 상세를 불러오지 못했습니다.',
                    error
                );
            } finally {
                if (isMounted) {
                    setIsDetailLoading(false);
                }
            }
        };

        fetchDetail();

        return () => {
            isMounted = false;
        };
    }, [selectedReviewId]);

    useEffect(() => {
        setIsReviewTextEditing(false);
        setEditableReviewText(selectedReview?.reviewText || '');
    }, [selectedReview?.reviewId, selectedReview?.reviewText]);

    const handleModeration = async (nextStatus) => {
        if (!selectedReview) {
            return;
        }

        let rejectionReason = '';

        if (nextStatus === 'REJECTED') {
            const input = window.prompt(
                '거절 사유를 입력해 주세요.',
                selectedReview.rejectionReason ||
                    '제출된 인증 자료만으로는 근로 여부를 확인하기 어렵습니다. 급여 입금 내역 또는 근로계약서를 추가로 제출해주세요.'
            );

            if (input === null) {
                return;
            }

            rejectionReason = input.trim();

            if (!rejectionReason) {
                setErrorMessage(
                    '거절 처리 시 사유를 입력해 주세요.'
                );
                return;
            }
        }

        setIsUpdating(true);
        setErrorMessage('');

        try {
            await updateAdminReviewStatus({
                reviewId: selectedReview.reviewId,
                status: nextStatus,
                rejectionReason
            });

            setSelectedReview(null);
            await Promise.all([
                loadReviews(),
                loadStats()
            ]);
        } catch (error) {
            console.error(
                '관리자 상태 변경에 실패했습니다.',
                error
            );
            setErrorMessage(
                [401, 403].includes(
                    error?.response?.status
                )
                    ? '관리자 인증이 만료되었거나 권한을 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.'
                    : '상태 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDownloadEvidence = async (file) => {
        if (!selectedReview || !file) {
            return;
        }

        if (file.url) {
            window.open(file.url, '_blank', 'noreferrer');
            return;
        }

        if (!file.attachmentId) {
            setErrorMessage(
                '다운로드할 인증 자료 ID가 없습니다.'
            );
            return;
        }

        setErrorMessage('');

        try {
            const result =
                await downloadAdminReviewAttachment({
                    reviewId: selectedReview.reviewId,
                    attachmentId: file.attachmentId
                });

            triggerBlobDownload(
                result.blob,
                result.fileName || file.name
            );
        } catch (error) {
            console.error(
                '관리자 인증 자료 다운로드에 실패했습니다.',
                error
            );
            setErrorMessage(
                [401, 403].includes(
                    error?.response?.status
                )
                    ? '인증 자료 다운로드 권한을 확인할 수 없습니다. 관리자 계정으로 다시 로그인해 주세요.'
                    : error?.response?.status === 404
                        ? '해당 인증 자료를 찾을 수 없습니다.'
                        : '인증 자료 다운로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            );
        }
    };

    const handleStartReviewTextEdit = () => {
        if (!selectedReview) {
            return;
        }

        if (selectedReview.status !== 'PENDING') {
            setErrorMessage(
                '승인 또는 거절된 후기는 수정할 수 없습니다.'
            );
            return;
        }

        setEditableReviewText(selectedReview.reviewText || '');
        setIsReviewTextEditing(true);
        setErrorMessage('');
    };

    const handleCancelReviewTextEdit = () => {
        setEditableReviewText(selectedReview?.reviewText || '');
        setIsReviewTextEditing(false);
        setErrorMessage('');
    };

    const handleSaveReviewText = async () => {
        if (!selectedReview) {
            return;
        }

        if (selectedReview.status !== 'PENDING') {
            setIsReviewTextEditing(false);
            setErrorMessage(
                '주관식 후기는 승인하기 전까지만 수정할 수 있습니다.'
            );
            return;
        }

        const nextReviewText = editableReviewText.trim();

        setIsReviewTextSaving(true);
        setErrorMessage('');

        try {
            const updatedReview =
                await updateAdminReviewContent({
                    reviewId: selectedReview.reviewId,
                    content: nextReviewText
                });
            const updatedText =
                updatedReview.reviewText ?? nextReviewText;
            const updatedAt = updatedReview.updatedAt || '';

            setSelectedReview((current) =>
                current
                    ? {
                          ...current,
                          reviewText: updatedText,
                          updatedAt:
                              updatedAt || current.updatedAt
                      }
                    : current
            );
            setReviews((currentReviews) =>
                currentReviews.map((review) =>
                    String(review.reviewId) ===
                    String(selectedReview.reviewId)
                        ? {
                              ...review,
                              reviewText: updatedText,
                              updatedAt:
                                  updatedAt || review.updatedAt
                          }
                        : review
                )
            );
            setEditableReviewText(updatedText);
            setIsReviewTextEditing(false);
        } catch (error) {
            console.error(
                '관리자 주관식 후기 수정에 실패했습니다.',
                error
            );
            setErrorMessage(
                [401, 403].includes(
                    error?.response?.status
                )
                    ? '후기 수정 권한을 확인할 수 없습니다. 관리자 계정으로 다시 로그인해 주세요.'
                    : error?.response?.status === 404
                        ? '후기 수정 API를 찾을 수 없습니다. 백엔드 경로를 확인해 주세요.'
                        : '주관식 후기 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setIsReviewTextSaving(false);
        }
    };

    const handleSelectSentiment = async (sentiment) => {
        if (!selectedReview) {
            return;
        }

        const previousSentiment = selectedReview.sentiment || '';
        const applySentiment = (nextSentiment) => {
            setSelectedReview((current) =>
                current
                    ? {
                          ...current,
                          sentiment: nextSentiment
                      }
                    : current
            );
            setReviews((currentReviews) =>
                currentReviews.map((review) =>
                    String(review.reviewId) ===
                    String(selectedReview.reviewId)
                        ? {
                              ...review,
                              sentiment: nextSentiment
                          }
                        : review
                )
            );
        };

        applySentiment(sentiment);
        setIsSentimentSaving(true);
        setErrorMessage('');

        try {
            const updatedReview =
                await updateAdminReviewSentiment({
                    reviewId: selectedReview.reviewId,
                    sentiment
                });
            const nextSentiment =
                updatedReview.sentiment || sentiment;

            applySentiment(nextSentiment);
        } catch (error) {
            applySentiment(previousSentiment);
            console.error(
                '관리자 후기 분위기 저장에 실패했습니다.',
                error
            );
            setErrorMessage(
                [401, 403].includes(
                    error?.response?.status
                )
                    ? '후기 분위기 수정 권한을 확인할 수 없습니다. 관리자 계정으로 다시 로그인해 주세요.'
                    : error?.response?.status === 404
                        ? '후기 분위기 수정 API를 찾을 수 없습니다. 백엔드 경로를 확인해 주세요.'
                        : '후기 분위기 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            );
        } finally {
            setIsSentimentSaving(false);
        }
    };

    const statusMeta = getStatusMeta(
        selectedReview?.status
    );
    const canEditReviewText =
        selectedReview?.status === 'PENDING';
    const violationSet = new Set(
        selectedReview?.violationItems || []
    );
    const statsCards = [
        {
            key: 'totalReviews',
            label: '전체 리뷰 수',
            value: stats?.totalReviews ?? 0
        },
        {
            key: 'pendingReviews',
            label: '검수 대기 리뷰 수',
            value: stats?.pendingReviews ?? 0
        },
        {
            key: 'approvedReviews',
            label: '승인 리뷰 수',
            value: stats?.approvedReviews ?? 0
        },
        {
            key: 'rejectedReviews',
            label: '반려 리뷰 수',
            value: stats?.rejectedReviews ?? 0
        },
        {
            key: 'totalWorkspaces',
            label: '전체 사업장 수',
            value: stats?.totalWorkspaces ?? 0
        }
    ];

    return (
        <div
            style={{
                ...pageStyle,
                ...(isMobile
                    ? mobilePageStyle
                    : desktopPageStyle)
            }}
        >
            <AppHeader />

            <main
                style={{
                    ...mainStyle,
                    ...(isMobile
                        ? mobileMainStyle
                        : desktopMainStyle),
                    gridTemplateColumns: isMobile
                        ? '1fr'
                        : '240px minmax(0, 1fr)'
                }}
            >
                <aside
                    style={{
                        ...sidebarStyle,
                        ...(isMobile
                            ? mobileSidebarStyle
                            : desktopSidebarStyle)
                    }}
                >
                    <div
                        style={{
                            ...statusTabsStyle,
                            flexWrap: 'nowrap'
                        }}
                    >
                        {STATUS_TABS.map((tab) => {
                            const isActive =
                                activeStatus === tab.key;

                            return (
                                <button
                                    type="button"
                                    key={tab.key}
                                    onClick={() =>
                                        setActiveStatus(tab.key)
                                    }
                                    style={{
                                        ...statusTabStyle,
                                        ...(isMobile
                                            ? mobileStatusTabStyle
                                            : {}),
                                        backgroundColor:
                                            isActive
                                                ? '#4668EC'
                                                : '#F5F6F8',
                                        color: isActive
                                            ? '#FFFFFF'
                                            : '#5F6775'
                                    }}
                                >
                                    <span>{tab.label}</span>
                                    <span>
                                        (
                                        {
                                            reviewsByStatus[
                                                tab.key
                                            ]?.length
                                        }
                                        )
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            ...listWrapStyle,
                            ...(isMobile
                                ? mobileListWrapStyle
                                : desktopListWrapStyle)
                        }}
                    >
                        {isListLoading ? (
                            <div style={emptyPanelStyle}>
                                검수 목록을 불러오는 중입니다.
                            </div>
                        ) : visibleReviews.length ? (
                            visibleReviews.map((review) => {
                                const isSelected =
                                    String(
                                        review.reviewId
                                    ) ===
                                    String(
                                        selectedReviewId
                                    );

                                return (
                                        <button
                                            type="button"
                                            key={review.reviewId}
                                            onClick={() =>
                                                setSelectedReviewId(
                                                    review.reviewId
                                                )
                                            }
                                            style={{
                                                ...listItemStyle,
                                                borderColor:
                                                    isSelected
                                                        ? '#4668EC'
                                                        : '#E8ECF2',
                                                boxShadow:
                                                    isSelected
                                                        ? 'inset 0 0 0 1px #4668EC'
                                                        : 'none'
                                            }}
                                        >
                                        <div
                                            style={
                                                listItemTopStyle
                                            }
                                        >
                                            <strong
                                                style={
                                                    listItemTitleStyle
                                                }
                                            >
                                                {
                                                    review.workspaceName
                                                }
                                            </strong>
                                            <span
                                                style={
                                                    listItemArrowStyle
                                                }
                                            >
                                                ›
                                            </span>
                                        </div>

                                        <div
                                            style={
                                                listItemMetaStyle
                                            }
                                        >
                                            {review.submitterId}
                                            {' · '}
                                            {
                                                review.category
                                            }
                                        </div>

                                        <div
                                            style={
                                                listItemBottomStyle
                                            }
                                        >
                                            <span>
                                                {formatRelativeTime(
                                                    review.submittedAt
                                                )}
                                            </span>
                                            <span>
                                                자료{' '}
                                                {
                                                    review
                                                        .attachmentCount
                                                }
                                                개
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div style={emptyPanelStyle}>
                                해당 상태의 검수 항목이 없습니다.
                            </div>
                        )}
                    </div>
                </aside>

                <section
                    style={{
                        ...detailAreaStyle,
                        ...(isMobile
                            ? mobileDetailAreaStyle
                            : desktopDetailAreaStyle)
                    }}
                >
                    <div
                        style={{
                            ...adminStatsGridStyle,
                            gridTemplateColumns: isMobile
                                ? 'repeat(2, minmax(0, 1fr))'
                                : 'repeat(5, minmax(0, 1fr))'
                        }}
                    >
                        {statsCards.map((card, index) => (
                            <article
                                key={card.key}
                                style={{
                                    ...adminStatsCardStyle,
                                    ...(isMobile &&
                                    index === statsCards.length - 1
                                        ? {
                                              gridColumn:
                                                  '1 / -1'
                                          }
                                        : {})
                                }}
                            >
                                <span
                                    style={
                                        adminStatsLabelStyle
                                    }
                                >
                                    {card.label}
                                </span>
                                <strong
                                    style={
                                        adminStatsValueStyle
                                    }
                                >
                                    {isStatsLoading
                                        ? '-'
                                        : `${card.value}개`}
                                </strong>
                            </article>
                        ))}
                    </div>

                    {errorMessage && (
                        <p style={errorTextStyle}>
                            {errorMessage}
                        </p>
                    )}

                    {!selectedReview ? (
                        <div style={detailEmptyCardStyle}>
                            검수할 후기를 선택해 주세요.
                        </div>
                    ) : (
                        <>
                            <article style={summaryCardStyle}>
                                <div style={summaryHeaderStyle}>
                                    <div>
                                        <h1
                                            style={
                                                summaryTitleStyle
                                            }
                                        >
                                            {
                                                selectedReview.workspaceName
                                            }
                                        </h1>
                                        <p
                                            style={
                                                summaryMetaStyle
                                            }
                                        >
                                            {
                                                selectedReview.category
                                            }
                                            {' · '}
                                            {
                                                selectedReview.district
                                            }
                                        </p>
                                    </div>

                                    <span
                                        style={{
                                            ...statusBadgeStyle,
                                            color:
                                                statusMeta.accentColor,
                                            backgroundColor:
                                                statusMeta.softColor
                                        }}
                                    >
                                        <span
                                            style={{
                                                ...statusDotStyle,
                                                backgroundColor:
                                                    statusMeta.accentColor
                                            }}
                                        />
                                        {
                                            statusMeta.label
                                        }
                                    </span>
                                </div>

                                <div style={summaryInfoRowStyle}>
                                    {[
                                        [
                                            '제출자 ID',
                                            selectedReview.submitterId
                                        ],
                                        [
                                            '제출 시간',
                                            formatDateTime(
                                                selectedReview.submittedAt
                                            )
                                        ],
                                        [
                                            '위반 항목',
                                            `${selectedReview.violationItems.length}개`
                                        ],
                                        [
                                            '인증 자료',
                                            `${selectedReview.attachmentCount}개`
                                        ]
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            style={
                                                summaryInfoItemStyle
                                            }
                                        >
                                            <span
                                                style={
                                                    summaryLabelStyle
                                                }
                                            >
                                                {label}
                                            </span>
                                            <strong
                                                style={
                                                    summaryValueStyle
                                                }
                                            >
                                                {value}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article style={sectionCardStyle}>
                                <h2 style={sectionTitleStyle}>
                                    체크리스트 응답
                                </h2>

                                <div style={checklistWrapStyle}>
                                    {REVIEW_INDICATORS.map(
                                        (indicator) => {
                                            const isViolation =
                                                violationSet.has(
                                                    indicator.id
                                                );

                                            return (
                                                <div
                                                    key={
                                                        indicator.id
                                                    }
                                                    style={{
                                                        ...checkRowStyle,
                                                        borderColor:
                                                            isViolation
                                                                ? '#FFC9C6'
                                                                : '#EEF1F5',
                                                        backgroundColor:
                                                            isViolation
                                                                ? '#FFF7F6'
                                                                : '#FAFBFD'
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            ...checkLabelStyle,
                                                            color:
                                                                isViolation
                                                                    ? '#333C49'
                                                                    : '#B7BDC7'
                                                        }}
                                                    >
                                                        {
                                                            indicator.label
                                                        }
                                                    </span>
                                                    {isViolation && (
                                                        <span
                                                            style={
                                                                violationBadgeStyle
                                                            }
                                                        >
                                                            위반
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }
                                    )}

                                    <div
                                        style={{
                                            ...checkRowStyle,
                                            minHeight: '54px',
                                            alignItems: 'flex-start',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            borderColor: '#EEF1F5',
                                            backgroundColor: '#FAFBFD'
                                        }}
                                    >
                                        <span
                                            style={
                                                workerLabelStyle
                                            }
                                        >
                                            동시간대 업무자 수 (주관식)
                                        </span>
                                        <strong
                                            style={
                                                workerValueStyle
                                            }
                                        >
                                            {selectedReview.simultaneousWorkers ||
                                                '-'}
                                        </strong>
                                    </div>
                                </div>
                            </article>

                            <article style={sectionCardStyle}>
                                <h2 style={sectionTitleStyle}>
                                    후기 분위기
                                </h2>

                                <div style={sentimentSelectRowStyle}>
                                    {REVIEW_SENTIMENT_OPTIONS.map(
                                        (option) => {
                                            const isSelected =
                                                selectedReview.sentiment ===
                                                option.id;

                                            return (
                                                <button
                                                    type="button"
                                                    key={option.id}
                                                    onClick={() =>
                                                        handleSelectSentiment(
                                                            option.id
                                                        )
                                                    }
                                                    disabled={
                                                        isSentimentSaving
                                                    }
                                                    style={{
                                                        ...sentimentSelectButtonStyle,
                                                        borderColor:
                                                            isSelected
                                                                ? option.color
                                                                : '#E2E7EF',
                                                        backgroundColor:
                                                            isSelected
                                                                ? option.softColor
                                                                : '#FFFFFF',
                                                        color: isSelected
                                                            ? option.color
                                                            : '#687284',
                                                        opacity:
                                                            isSentimentSaving
                                                                ? 0.72
                                                                : 1
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>

                                <p style={sentimentHelpTextStyle}>
                                    승인 후 사업장 상세의 후기 분위기 비율에 반영됩니다.
                                </p>
                            </article>

                            <article style={sectionCardStyle}>
                                <h2 style={sectionTitleStyle}>
                                    인증 자료 (
                                    {
                                        selectedReview
                                            .evidenceFiles
                                            .length
                                    }
                                    개)
                                </h2>

                                <div
                                    style={{
                                        ...evidenceGridStyle,
                                        gridTemplateColumns:
                                            isMobile
                                                ? 'repeat(2, minmax(0, 1fr))'
                                                : 'repeat(auto-fit, minmax(126px, 126px))'
                                    }}
                                >
                                    {selectedReview.evidenceFiles.map(
                                        (file) => {
                                            const evidenceSizeLabel =
                                                formatEvidenceSize(
                                                    file.size
                                                );

                                            return (
                                                <button
                                                    type="button"
                                                    key={
                                                        file.id
                                                    }
                                                    onClick={() =>
                                                        handleDownloadEvidence(
                                                            file
                                                        )
                                                    }
                                                    style={{
                                                        ...evidenceCardStyle,
                                                        backgroundColor:
                                                            file.type ===
                                                            'PDF'
                                                                ? '#F3EEFF'
                                                                : '#EEF4FD',
                                                        textDecoration:
                                                            'none'
                                                    }}
                                                >
                                                    <div
                                                        style={
                                                            evidenceIconWrapStyle
                                                        }
                                                    >
                                                        {isImageEvidence(
                                                            file
                                                        ) ? (
                                                            file.url ? (
                                                                <img
                                                                    src={
                                                                        file.url
                                                                    }
                                                                    alt={
                                                                        file.name
                                                                    }
                                                                    style={
                                                                        evidenceThumbStyle
                                                                    }
                                                                />
                                                            ) : (
                                                                <ImagePlaceholderIcon />
                                                            )
                                                        ) : (
                                                            <PdfPlaceholderIcon />
                                                        )}
                                                    </div>

                                                    <strong
                                                        style={
                                                            evidenceNameStyle
                                                        }
                                                    >
                                                        {
                                                            file.name
                                                        }
                                                    </strong>

                                                    <span
                                                        style={{
                                                            ...evidenceTypeStyle,
                                                            color:
                                                                file.type ===
                                                                'PDF'
                                                                    ? '#8A67FF'
                                                                    : '#6F8EEA'
                                                        }}
                                                    >
                                                        {file.type}
                                                        {evidenceSizeLabel
                                                            ? ` · ${evidenceSizeLabel}`
                                                            : ''}
                                                    </span>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </article>

                            <article style={sectionCardStyle}>
                                <div
                                    style={
                                        reviewEditHeaderStyle
                                    }
                                >
                                    <h2
                                        style={{
                                            ...sectionTitleStyle,
                                            margin: 0
                                        }}
                                    >
                                        주관식 후기
                                    </h2>

                                    {!isReviewTextEditing &&
                                        canEditReviewText && (
                                        <button
                                            type="button"
                                            onClick={
                                                handleStartReviewTextEdit
                                            }
                                            disabled={
                                                isDetailLoading ||
                                                isReviewTextSaving
                                            }
                                            style={
                                                editReviewTextButtonStyle
                                            }
                                        >
                                            수정
                                        </button>
                                    )}
                                </div>

                                {isReviewTextEditing &&
                                canEditReviewText ? (
                                    <>
                                        <textarea
                                            value={
                                                editableReviewText
                                            }
                                            onChange={(event) =>
                                                setEditableReviewText(
                                                    event.target
                                                        .value
                                                )
                                            }
                                            placeholder="관리자 검수 후 표시할 후기 내용을 입력해 주세요."
                                            maxLength={1000}
                                            style={
                                                reviewEditTextareaStyle
                                            }
                                        />

                                        <div
                                            style={
                                                reviewEditActionRowStyle
                                            }
                                        >
                                            <span
                                                style={
                                                    reviewEditCountStyle
                                                }
                                            >
                                                {
                                                    editableReviewText.length
                                                }
                                                /1000
                                            </span>

                                            <button
                                                type="button"
                                                onClick={
                                                    handleCancelReviewTextEdit
                                                }
                                                disabled={
                                                    isReviewTextSaving
                                                }
                                                style={
                                                    cancelReviewTextButtonStyle
                                                }
                                            >
                                                취소
                                            </button>

                                            <button
                                                type="button"
                                                onClick={
                                                    handleSaveReviewText
                                                }
                                                disabled={
                                                    isReviewTextSaving
                                                }
                                                style={{
                                                    ...saveReviewTextButtonStyle,
                                                    opacity:
                                                        isReviewTextSaving
                                                            ? 0.7
                                                            : 1,
                                                    cursor:
                                                        isReviewTextSaving
                                                            ? 'not-allowed'
                                                            : 'pointer'
                                                }}
                                            >
                                                {isReviewTextSaving
                                                    ? '저장 중'
                                                    : '저장'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div
                                        style={
                                            reviewContentBoxStyle
                                        }
                                    >
                                        {isDetailLoading
                                            ? '상세 후기를 불러오는 중입니다.'
                                            : selectedReview.reviewText ||
                                              '작성된 후기가 없습니다.'}
                                    </div>
                                )}
                            </article>

                            {selectedReview.status ===
                                'REJECTED' && (
                                <article
                                    style={
                                        rejectReasonCardStyle
                                    }
                                >
                                    <strong
                                        style={
                                            rejectReasonTitleStyle
                                        }
                                    >
                                        거절 사유
                                    </strong>
                                    <p
                                        style={
                                            rejectReasonTextStyle
                                        }
                                    >
                                        {selectedReview.rejectionReason ||
                                            '거절 사유가 등록되지 않았습니다.'}
                                    </p>
                                </article>
                            )}

                            {selectedReview.status ===
                                'PENDING' && (
                                <div
                                    style={{
                                        ...actionRowStyle,
                                        flexDirection:
                                            isMobile
                                                ? 'column'
                                                : 'row'
                                    }}
                                >
                                    <button
                                        type="button"
                                        style={
                                            rejectButtonStyle
                                        }
                                        onClick={() =>
                                            handleModeration(
                                                'REJECTED'
                                            )
                                        }
                                        disabled={isUpdating}
                                    >
                                        × 거절
                                    </button>

                                    <button
                                        type="button"
                                        style={
                                            approveButtonStyle
                                        }
                                        onClick={() =>
                                            handleModeration(
                                                'APPROVED'
                                            )
                                        }
                                        disabled={isUpdating}
                                    >
                                        ✓ 승인하기
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
};

const pageStyle = {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F6F8FB',
    overflowX: 'hidden'
};

const desktopPageStyle = {
    height: '100dvh',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    overflow: 'hidden'
};

const mobilePageStyle = {
    overflowY: 'auto'
};

const headerStyle = {
    height: '64px',
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E8ECF2',
    boxSizing: 'border-box'
};

const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center'
};

const headerRightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
};

const logoButtonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#121826',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '900'
};

const plainNavButtonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#8A93A1',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
};

const profileCircleStyle = {
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #E3E8EF',
    borderRadius: '999px',
    color: '#8A93A1',
    fontSize: '12px',
    fontWeight: '700'
};

const mainStyle = {
    display: 'grid',
    flex: '1 1 auto',
    minHeight: 0,
    minWidth: 0,
    width: '100%'
};

const desktopMainStyle = {
    minHeight: 0,
    height: '100%',
    overflow: 'hidden'
};

const mobileMainStyle = {
    minHeight: 0,
    gap: '0'
};

const sidebarStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: '100%',
    borderRight: '1px solid #E8ECF2',
    backgroundColor: '#FFFFFF',
    overflow: 'visible'
};

const desktopSidebarStyle = {
    height: '100%',
    minHeight: 0,
    overflow: 'hidden'
};

const mobileSidebarStyle = {
    height: 'auto',
    borderRight: 'none',
    borderBottom: '1px solid #E8ECF2'
};

const statusTabsStyle = {
    display: 'flex',
    gap: '6px',
    padding: '14px 10px 8px'
};

const statusTabStyle = {
    minWidth: '72px',
    minHeight: '30px',
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '800',
    lineHeight: '1.25',
    textAlign: 'center',
    wordBreak: 'keep-all',
    whiteSpace: 'normal',
    flex: '1 1 0'
};

const mobileStatusTabStyle = {
    minHeight: '60px',
    padding: '8px 10px',
    flexDirection: 'column',
    gap: '2px'
};

const listWrapStyle = {
    padding: '0 6px 10px',
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'visible'
};

const desktopListWrapStyle = {
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch'
};

const mobileListWrapStyle = {
    overflow: 'visible',
    paddingBottom: '14px'
};

const listItemStyle = {
    width: '100%',
    marginBottom: '8px',
    padding: '14px 12px',
    border: '1px solid #E8ECF2',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    textAlign: 'left',
    cursor: 'pointer',
    boxSizing: 'border-box'
};

const listItemTopStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px'
};

const listItemTitleStyle = {
    color: '#212833',
    fontSize: '14px',
    fontWeight: '900'
};

const listItemArrowStyle = {
    color: '#CBD1DA',
    fontSize: '16px',
    flexShrink: 0
};

const listItemMetaStyle = {
    marginTop: '8px',
    color: '#A2A9B4',
    fontSize: '12px',
    fontWeight: '500'
};

const listItemBottomStyle = {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    color: '#9CA3AF',
    fontSize: '12px',
    fontWeight: '500'
};

const emptyPanelStyle = {
    padding: '20px 12px',
    color: '#9BA3AF',
    fontSize: '13px',
    lineHeight: '1.6'
};

const detailAreaStyle = {
    padding: '22px 18px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
    boxSizing: 'border-box'
};

const desktopDetailAreaStyle = {
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch'
};

const mobileDetailAreaStyle = {
    overflow: 'visible',
    padding: '16px 12px 24px'
};

const adminStatsGridStyle = {
    display: 'grid',
    gap: '8px'
};

const adminStatsCardStyle = {
    minHeight: '58px',
    padding: '10px 10px 9px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    border: '1px solid #E7EBF2',
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box'
};

const adminStatsLabelStyle = {
    color: '#8E96A3',
    fontSize: '11px',
    fontWeight: '700',
    lineHeight: '1.35',
    wordBreak: 'keep-all'
};

const adminStatsValueStyle = {
    color: '#1F2937',
    fontSize: '19px',
    fontWeight: '900',
    lineHeight: 1.1,
    letterSpacing: '-0.4px'
};

const errorTextStyle = {
    margin: 0,
    color: '#E14A42',
    fontSize: '12px'
};

const detailEmptyCardStyle = {
    padding: '26px',
    border: '1px solid #E8ECF2',
    borderRadius: '18px',
    backgroundColor: '#FFFFFF',
    color: '#9CA3AF',
    fontSize: '14px'
};

const summaryCardStyle = {
    padding: '20px 20px 18px',
    border: '1px solid #E8ECF2',
    borderRadius: '18px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 20px rgba(30, 41, 59, 0.04)'
};

const summaryHeaderStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #EEF1F5',
    flexWrap: 'wrap'
};

const summaryTitleStyle = {
    margin: 0,
    color: '#18202D',
    fontSize: '18px',
    fontWeight: '900'
};

const summaryMetaStyle = {
    margin: '8px 0 0',
    color: '#9CA4B0',
    fontSize: '13px'
};

const statusBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '28px',
    padding: '0 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '800'
};

const statusDotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '999px'
};

const summaryInfoRowStyle = {
    marginTop: '14px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '14px'
};

const summaryInfoItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const summaryLabelStyle = {
    color: '#A8AFB9',
    fontSize: '12px',
    fontWeight: '600'
};

const summaryValueStyle = {
    color: '#303744',
    fontSize: '14px',
    fontWeight: '800'
};

const sectionCardStyle = {
    padding: '18px',
    border: '1px solid #E8ECF2',
    borderRadius: '18px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 20px rgba(30, 41, 59, 0.04)'
};

const sectionTitleStyle = {
    margin: '0 0 16px',
    color: '#18202D',
    fontSize: '16px',
    fontWeight: '900'
};

const checklistWrapStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const checkRowStyle = {
    minHeight: '34px',
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    border: '1px solid',
    borderRadius: '10px',
    boxSizing: 'border-box'
};

const checkLabelStyle = {
    fontSize: '13px',
    fontWeight: '600'
};

const violationBadgeStyle = {
    color: '#FF4B45',
    fontSize: '12px',
    fontWeight: '800'
};

const workerLabelStyle = {
    color: '#B2B8C3',
    fontSize: '11px',
    fontWeight: '600'
};

const workerValueStyle = {
    color: '#333C49',
    fontSize: '14px',
    fontWeight: '800'
};

const sentimentSelectRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '8px'
};

const sentimentSelectButtonStyle = {
    height: '38px',
    border: '1px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '900',
    fontFamily: 'inherit'
};

const sentimentHelpTextStyle = {
    margin: '10px 0 0',
    color: '#9EA6B3',
    fontSize: '12px',
    lineHeight: '1.5'
};

const evidenceGridStyle = {
    display: 'grid',
    gap: '12px'
};

const evidenceCardStyle = {
    width: '100%',
    minHeight: '112px',
    padding: '14px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    border: '1px solid #E4E8F0',
    borderRadius: '12px',
    boxSizing: 'border-box',
    appearance: 'none',
    fontFamily: 'inherit',
    textAlign: 'left',
    cursor: 'pointer'
};

const evidenceIconWrapStyle = {
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const evidenceThumbStyle = {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '8px'
};

const evidenceNameStyle = {
    color: '#333B48',
    fontSize: '12px',
    fontWeight: '700',
    wordBreak: 'break-all'
};

const evidenceTypeStyle = {
    fontSize: '11px',
    fontWeight: '700'
};

const reviewContentBoxStyle = {
    minHeight: '52px',
    padding: '16px 14px',
    borderRadius: '12px',
    backgroundColor: '#F8FAFD',
    color: '#475062',
    fontSize: '14px',
    lineHeight: '1.8',
    boxSizing: 'border-box'
};

const reviewEditHeaderStyle = {
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
};

const editReviewTextButtonStyle = {
    minWidth: '58px',
    height: '30px',
    padding: '0 12px',
    border: '1px solid #D8DEE8',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    color: '#5F6877',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '800',
    fontFamily: 'inherit'
};

const reviewEditTextareaStyle = {
    width: '100%',
    minHeight: '132px',
    padding: '14px',
    border: '1px solid #DCE2EA',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    color: '#333C49',
    outline: 'none',
    resize: 'vertical',
    fontSize: '14px',
    lineHeight: '1.8',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
};

const reviewEditActionRowStyle = {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    flexWrap: 'wrap'
};

const reviewEditCountStyle = {
    marginRight: 'auto',
    color: '#A0A8B4',
    fontSize: '12px',
    fontWeight: '600'
};

const cancelReviewTextButtonStyle = {
    minWidth: '68px',
    height: '36px',
    padding: '0 14px',
    border: '1px solid #D9DFE7',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: '#5B6473',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '800',
    fontFamily: 'inherit'
};

const saveReviewTextButtonStyle = {
    minWidth: '76px',
    height: '36px',
    padding: '0 16px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#4668EC',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '800',
    fontFamily: 'inherit'
};

const rejectReasonCardStyle = {
    padding: '18px',
    border: '1px solid #FFCCC8',
    borderRadius: '16px',
    backgroundColor: '#FFF5F4'
};

const rejectReasonTitleStyle = {
    display: 'block',
    marginBottom: '10px',
    color: '#FF4B45',
    fontSize: '14px',
    fontWeight: '900'
};

const rejectReasonTextStyle = {
    margin: 0,
    color: '#4F5766',
    fontSize: '13px',
    lineHeight: '1.8'
};

const actionRowStyle = {
    display: 'flex',
    gap: '10px'
};

const rejectButtonStyle = {
    flex: 1,
    height: '40px',
    border: '1px solid #D9DFE7',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    color: '#5B6473',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800'
};

const approveButtonStyle = {
    flex: 1.9,
    height: '40px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: '#4668EC',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800',
    boxShadow: '0 8px 18px rgba(70, 104, 236, 0.22)'
};

export default AdminPage;
