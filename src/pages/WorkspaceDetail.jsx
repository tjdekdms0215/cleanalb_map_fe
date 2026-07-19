import React, {
    useEffect,
    useMemo,
    useState
} from 'react';
import {
    useNavigate,
    useParams
} from 'react-router-dom';
import { getWorkspaceDetail } from '../api/workspace';
import {
    beginKakaoLogin,
    getStoredAuth,
    setPostLoginRedirectPath
} from '../utils/auth';
import {
    REVIEW_INDICATORS,
    findReviewIndicator,
    getViolationIndicatorIds
} from '../constants/reviewIndicators';
import AppHeader from '../components/AppHeader';
import useMediaQuery from '../hooks/useMediaQuery';

const DEFAULT_SHIFT_ORDER = ['morning', 'afternoon', 'night'];
const SHIFT_LABELS = {
    morning: '오전',
    afternoon: '오후',
    night: '야간'
};

const DAY_TYPE_LABELS = {
    weekday: '평일',
    weekend: '주말'
};
const REVIEWS_PER_PAGE = 5;

const coerceNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const match = value.match(/-?\d+(\.\d+)?/);

        if (match) {
            return Number(match[0]);
        }
    }

    return null;
};

const pickFirstNumber = (source, keys) => {
    if (!source || typeof source !== 'object') {
        return null;
    }

    for (const key of keys) {
        const value = coerceNumber(source[key]);

        if (value !== null) {
            return value;
        }
    }

    return null;
};

const pickFirstText = (source, keys) => {
    if (!source || typeof source !== 'object') {
        return '';
    }

    for (const key of keys) {
        const value = source[key];

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
};

const pickFirstDefined = (source, keys) => {
    if (!source || typeof source !== 'object') {
        return undefined;
    }

    for (const key of keys) {
        const value = source[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {
            return value;
        }
    }

    return undefined;
};

const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

const getCleanGradeInfo = (score) => {
    if (score === null || score === undefined) {
        return {
            accentColor: '#8A8A8A',
            color: '#666666',
            label: '미정'
        };
    }

    if (score >= 80) {
        return {
            accentColor: '#009900',
            color: '#08752A',
            label: '우수'
        };
    }

    if (score >= 60) {
        return {
            accentColor: '#FFC000',
            color: '#9A6700',
            label: '보통'
        };
    }

    if (score >= 40) {
        return {
            accentColor: '#FF6600',
            color: '#C94F00',
            label: '주의'
        };
    }

    return {
        accentColor: '#DD0000',
        color: '#B30000',
        label: '위험'
    };
};

const toPercent = (value) => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    if (value <= 1) {
        return clamp(value * 100, 0, 100);
    }

    return clamp(value, 0, 100);
};

const formatDate = (value) => {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
};

const extractDistrict = (workspace) => {
    const district =
        workspace?.district ||
        workspace?.region ||
        workspace?.gu ||
        workspace?.addressRegion;

    if (district) {
        return district;
    }

    const address =
        workspace?.address ||
        workspace?.roadAddress ||
        workspace?.addressName ||
        workspace?.address_name ||
        '';
    const segments = address.split(' ').filter(Boolean);

    return segments.slice(0, 2).join(' ') || '지역 정보 없음';
};

const getWorkspaceName = (workspace) =>
    workspace?.name ||
    workspace?.placeName ||
    workspace?.place_name ||
    '사업장 이름 없음';

const getWorkspaceCategory = (workspace) =>
    workspace?.category ||
    workspace?.categoryName ||
    workspace?.category_name ||
    '업종 정보 없음';

const getReviewCount = (workspace) => {
    const directCount = pickFirstNumber(workspace, [
        'reviewCount',
        'approvedReviewCount',
        'reviewsCount'
    ]);

    if (directCount !== null) {
        return directCount;
    }

    if (Array.isArray(workspace?.reviews)) {
        return workspace.reviews.length;
    }

    if (Array.isArray(workspace?.approvedReviews)) {
        return workspace.approvedReviews.length;
    }

    if (Array.isArray(workspace?.reviewList)) {
        return workspace.reviewList.length;
    }

    return 0;
};

const getDetailStatsSource = (workspace) => {
    const candidates = [
        workspace?.checklistStats,
        workspace?.indicatorStats,
        workspace?.indicatorSummary,
        workspace?.cleanScoreIndicators,
        workspace?.cleanScoreEvidence,
        workspace?.reviewStats,
        workspace?.complianceStats,
        workspace?.oxStats,
        workspace?.ox_stats
    ];

    return (
        candidates.find(
            (candidate) =>
                candidate &&
                typeof candidate === 'object'
        ) || null
    );
};

const toEntries = (source) => {
    if (!source) {
        return [];
    }

    if (Array.isArray(source)) {
        return source;
    }

    if (Array.isArray(source.items)) {
        return source.items;
    }

    if (Array.isArray(source.entries)) {
        return source.entries;
    }

    if (Array.isArray(source.stats)) {
        return source.stats;
    }

    return Object.entries(source).map(([key, value]) => ({
        key,
        value
    }));
};

const normalizeIndicatorStat = (indicator, entry) => {
    const nested =
        entry?.value &&
        typeof entry.value === 'object' &&
        !Array.isArray(entry.value)
            ? entry.value
            : entry;
    const directValue =
        nested === entry &&
        typeof entry?.value !== 'object'
            ? entry?.value
            : null;

    const complianceCount =
        pickFirstNumber(nested, [
            'complianceCount',
            'compliantCount',
            'positiveCount',
            'safeCount',
            'yesCount',
            'trueCount'
        ]) ??
        (typeof directValue === 'boolean'
            ? Number(directValue)
            : null);
    const violationCount =
        pickFirstNumber(nested, [
            'violationCount',
            'violatedCount',
            'negativeCount',
            'riskCount',
            'noCount',
            'falseCount'
        ]) ??
        (typeof directValue === 'number'
            ? directValue
            : null);
    const totalCount =
        pickFirstNumber(nested, [
            'totalCount',
            'total',
            'responseCount',
            'responses',
            'reviewCount'
        ]) ||
        (Number.isFinite(complianceCount) &&
        Number.isFinite(violationCount)
            ? complianceCount + violationCount
            : null);
    const violationRate = toPercent(
        pickFirstNumber(nested, [
            'violationRate',
            'negativeRate',
            'riskRate',
            'falseRate'
        ]) ??
            (Number.isFinite(totalCount) &&
            totalCount > 0 &&
            Number.isFinite(violationCount)
                ? (violationCount / totalCount) * 100
                : 0)
    );
    const complianceRate = toPercent(
        pickFirstNumber(nested, [
            'complianceRate',
            'positiveRate',
            'safeRate',
            'yesRate',
            'trueRate'
        ]) ??
            (100 - violationRate)
    );

    return {
        id: indicator.id,
        label: indicator.label,
        complianceCount:
            Number.isFinite(complianceCount)
                ? complianceCount
                : Math.max(
                      0,
                      Math.round(
                          ((100 - violationRate) / 100) *
                              (totalCount || 0)
                      )
                  ),
        violationCount:
            Number.isFinite(violationCount)
                ? violationCount
                : Math.max(
                      0,
                      Math.round(
                          (violationRate / 100) *
                              (totalCount || 0)
                      )
                  ),
        violationRate,
        complianceRate,
        color:
            complianceRate >= 50
                ? '#1FA84F'
                : '#EF3B33'
    };
};

const buildIndicatorStats = (workspace) => {
    const source = getDetailStatsSource(workspace);
    const entries = toEntries(source);
    const mapped = new Map();

    entries.forEach((entry) => {
        const rawKey =
            entry?.id ||
            entry?.item ||
            entry?.code ||
            entry?.key ||
            entry?.name ||
            entry?.title ||
            entry?.label;
        const indicator = findReviewIndicator(rawKey);

        if (indicator) {
            mapped.set(
                indicator.id,
                normalizeIndicatorStat(indicator, entry)
            );
        }
    });

    return REVIEW_INDICATORS.map((indicator) =>
        mapped.get(indicator.id) ||
        normalizeIndicatorStat(indicator, {
            complianceCount: 0,
            violationCount: 0,
            totalCount: 0,
            complianceRate: 0,
            violationRate: 0
        })
    );
};

const normalizeShiftKey = (value = '') => {
    const normalized = String(value)
        .trim()
        .toLowerCase();
    const compact = normalized.replace(/[\s_-]/g, '');

    if (
        [
            '오전',
            '아침',
            'morning',
            'morningshift',
            'am'
        ].includes(compact)
    ) {
        return 'morning';
    }

    if (
        [
            '오후',
            '점심',
            'afternoon',
            'afternoonshift',
            'pm'
        ].includes(compact)
    ) {
        return 'afternoon';
    }

    if (
        [
            '야간',
            '밤',
            'night',
            'nightshift',
            'evening',
            'eveningshift'
        ].includes(compact)
    ) {
        return 'night';
    }

    return compact || normalized;
};

const normalizeDayTypeKey = (value = '') => {
    const normalized = String(value)
        .trim()
        .toLowerCase();
    const compact = normalized.replace(/[\s_-]/g, '');

    if (
        [
            '평일',
            'weekday',
            'weekdays',
            'weekdaywork',
            'workday',
            'workdays',
            'daily'
        ].includes(compact)
    ) {
        return 'weekday';
    }

    if (
        [
            '주말',
            'weekend',
            'weekends',
            'weekendday',
            'holiday',
            'holidays'
        ].includes(compact)
    ) {
        return 'weekend';
    }

    return compact || normalized;
};

const getShiftValue = (source) =>
    pickFirstDefined(source, [
        'timeSlot',
        'time_slot',
        'workTimeSlot',
        'work_time_slot',
        'shift',
        'shiftType',
        'shift_type',
        'time',
        'slot',
        'label'
    ]);

const getDayTypeValue = (source) =>
    pickFirstDefined(source, [
        'dayType',
        'day_type',
        'workDayType',
        'work_day_type',
        'workdayType',
        'workday_type',
        'day',
        'type',
        'category'
    ]);

const getCoworkerCountValue = (source) =>
    pickFirstNumber(source, [
        'coworkerCount',
        'coworker_count',
        'workerCount',
        'worker_count',
        'simultaneousWorkers',
        'simultaneousWorkerCount',
        'simultaneous_worker_count',
        'sameTimeWorkerCount',
        'same_time_worker_count',
        'workers',
        'count',
        'value',
        'averageCoworkerCount',
        'avgCoworkerCount',
        'averageWorkers',
        'avgWorkers'
    ]);

const buildShiftRowsFromObject = (source) => {
    const result = {};

    if (Array.isArray(source)) {
        source.forEach((entry) => {
            const shiftKey = normalizeShiftKey(getShiftValue(entry));
            const dayType = normalizeDayTypeKey(getDayTypeValue(entry));

            if (
                SHIFT_LABELS[shiftKey] &&
                (dayType === 'weekday' ||
                    dayType === 'weekend')
            ) {
                if (!result[shiftKey]) {
                    result[shiftKey] = {
                        id: shiftKey,
                        label: SHIFT_LABELS[shiftKey],
                        weekday: 0,
                        weekend: 0
                    };
                }

                result[shiftKey][dayType] =
                    getCoworkerCountValue(entry) || 0;
            }
        });

        return result;
    }

    const directShiftKey = normalizeShiftKey(getShiftValue(source));
    const directDayType = normalizeDayTypeKey(
        getDayTypeValue(source)
    );
    const directCount = getCoworkerCountValue(source);

    if (
        SHIFT_LABELS[directShiftKey] &&
        ['weekday', 'weekend'].includes(directDayType) &&
        directCount !== null
    ) {
        result[directShiftKey] = {
            id: directShiftKey,
            label: SHIFT_LABELS[directShiftKey],
            weekday: directDayType === 'weekday' ? directCount : 0,
            weekend: directDayType === 'weekend' ? directCount : 0
        };

        return result;
    }

    Object.entries(source || {}).forEach(([key, value]) => {
        const shiftKey = normalizeShiftKey(key);
        const dayType = normalizeDayTypeKey(key);

        if (
            ['weekday', 'weekend'].includes(dayType) &&
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
        ) {
            Object.entries(value).forEach(
                ([shiftTypeKey, shiftTypeValue]) => {
                    const normalizedShiftKey =
                        normalizeShiftKey(shiftTypeKey);

                    if (!SHIFT_LABELS[normalizedShiftKey]) {
                        return;
                    }

                    if (!result[normalizedShiftKey]) {
                        result[normalizedShiftKey] = {
                            id: normalizedShiftKey,
                            label: SHIFT_LABELS[normalizedShiftKey],
                            weekday: 0,
                            weekend: 0
                        };
                    }

                    result[normalizedShiftKey][dayType] =
                        coerceNumber(shiftTypeValue) || 0;
                }
            );

            return;
        }

        if (!SHIFT_LABELS[shiftKey]) {
            return;
        }

        if (!result[shiftKey]) {
            result[shiftKey] = {
                id: shiftKey,
                label: SHIFT_LABELS[shiftKey],
                weekday: 0,
                weekend: 0
            };
        }

        if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
        ) {
            Object.entries(value).forEach(
                ([dayTypeKey, dayTypeValue]) => {
                    const normalizedDayType =
                        normalizeDayTypeKey(dayTypeKey);

                    if (
                        normalizedDayType === 'weekday' ||
                        normalizedDayType === 'weekend'
                    ) {
                        result[shiftKey][normalizedDayType] =
                            coerceNumber(dayTypeValue) || 0;
                    }
                }
            );
        }
    });

    return result;
};

const hasShiftStats = (rowsMap) =>
    Object.values(rowsMap || {}).some(
        (row) => (row.weekday || 0) > 0 || (row.weekend || 0) > 0
    );

const buildShiftRowsFromReviews = (reviews = []) => {
    const buckets = {};

    reviews.forEach((review) => {
        const shiftKey = normalizeShiftKey(getShiftValue(review));
        const dayType = normalizeDayTypeKey(getDayTypeValue(review));
        const coworkerCount = getCoworkerCountValue(review);

        if (
            !SHIFT_LABELS[shiftKey] ||
            !['weekday', 'weekend'].includes(dayType) ||
            coworkerCount === null
        ) {
            return;
        }

        const bucketKey = `${shiftKey}:${dayType}`;

        if (!buckets[bucketKey]) {
            buckets[bucketKey] = {
                total: 0,
                count: 0
            };
        }

        buckets[bucketKey].total += coworkerCount;
        buckets[bucketKey].count += 1;
    });

    return Object.entries(buckets).reduce(
        (accumulator, [bucketKey, bucket]) => {
            const [shiftKey, dayType] = bucketKey.split(':');

            if (!accumulator[shiftKey]) {
                accumulator[shiftKey] = {
                    id: shiftKey,
                    label: SHIFT_LABELS[shiftKey],
                    weekday: 0,
                    weekend: 0
                };
            }

            accumulator[shiftKey][dayType] = Math.round(
                bucket.total / bucket.count
            );

            return accumulator;
        },
        {}
    );
};

const extractReviewCollection = (source) => {
    if (Array.isArray(source)) {
        return source;
    }

    if (!source || typeof source !== 'object') {
        return [];
    }

    const reviewKeys = [
        'reviews',
        'approvedReviews',
        'approvedReviewList',
        'reviewList',
        'reviewPage',
        'reviewResponses',
        'reviewSummaries',
        'reviewDtos'
    ];
    const pageKeys = [
        'content',
        'items',
        'list',
        'records',
        'data',
        'result'
    ];

    for (const key of reviewKeys) {
        const reviews = extractReviewCollection(source[key]);

        if (reviews.length > 0) {
            return reviews;
        }
    }

    for (const key of pageKeys) {
        const value = source[key];

        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === 'object') {
            const reviews = extractReviewCollection(value);

            if (reviews.length > 0) {
                return reviews;
            }
        }
    }

    return [];
};

const buildShiftRows = (workspace) => {
    const source =
        workspace?.simultaneousWorkerStats ||
        workspace?.staffingStats ||
        workspace?.timeSlotWorkerStats ||
        workspace?.workerStats ||
        workspace?.workerCountStats ||
        workspace?.coworkerStats ||
        workspace?.coworkerCountStats ||
        workspace?.shiftStats ||
        workspace?.simultaneousWorkersStats ||
        workspace?.simultaneousWorkerCountStats ||
        null;
    const statsRowsMap = buildShiftRowsFromObject(source);
    const rowsMap = hasShiftStats(statsRowsMap)
        ? statsRowsMap
        : buildShiftRowsFromReviews(buildReviews(workspace));
    const rows = DEFAULT_SHIFT_ORDER.map((shiftKey) => ({
        id: shiftKey,
        label: SHIFT_LABELS[shiftKey],
        weekday: rowsMap[shiftKey]?.weekday || 0,
        weekend: rowsMap[shiftKey]?.weekend || 0
    }));

    return rows;
};

const buildReviews = (workspace) => {
    const source = extractReviewCollection(workspace);

    if (!Array.isArray(source)) {
        return [];
    }

    return source.map((review, index) => ({
        id:
            review?.id ||
            review?.reviewId ||
            `review-${index}`,
        content:
            review?.content ||
            review?.reviewContent ||
            review?.text ||
            '',
        violationItems: getViolationIndicatorIds(review),
        dayType:
            getDayTypeValue(review) || '',
        timeSlot:
            getShiftValue(review) || '',
        coworkerCount: getCoworkerCountValue(review),
        createdAt:
            review?.createdAt ||
            review?.createdDate ||
            review?.date ||
            '',
        status:
            review?.status ||
            review?.reviewStatus ||
            'APPROVED'
    }));
};

const CircularScore = ({
    score,
    accentColor,
    textColor
}) => {
    const size = 98;
    const strokeWidth = 10;
    const radius =
        (size - strokeWidth) / 2;
    const circumference =
        2 * Math.PI * radius;
    const safeScore = clamp(
        Number(score) || 0,
        0,
        100
    );
    const dashOffset =
        circumference -
        (safeScore / 100) * circumference;

    return (
        <div style={scoreWrapStyle}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={scoreSvgStyle}
                aria-hidden="true"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#EEF0F2"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>

            <div style={scoreInnerStyle}>
                <strong
                    style={{
                        ...scoreValueStyle,
                        color: textColor
                    }}
                >
                    {safeScore}
                </strong>
                <span style={scoreLabelStyle}>
                    클린점수
                </span>
            </div>
        </div>
    );
};

const WorkspaceDetail = () => {
    const navigate = useNavigate();
    const { workspaceId } = useParams();
    const isMobile = useMediaQuery('(max-width: 720px)');
    const [workspace, setWorkspace] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [reviewPage, setReviewPage] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const fetchDetail = async () => {
            setIsLoading(true);
            setErrorMessage('');

            try {
                const data = await getWorkspaceDetail(
                    workspaceId
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
                    setErrorMessage(
                        '사업장 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDetail();

        return () => {
            isMounted = false;
        };
    }, [workspaceId]);

    const detailData = useMemo(() => {
        const safeWorkspace = workspace || {};
        const shiftRows = buildShiftRows(safeWorkspace);
        const maxWorkers = Math.max(
            1,
            ...shiftRows.flatMap((row) => [
                row.weekday,
                row.weekend
            ])
        );

        return {
            workspaceName: getWorkspaceName(safeWorkspace),
            district: extractDistrict(safeWorkspace),
            category: getWorkspaceCategory(safeWorkspace),
            reviewCount: getReviewCount(safeWorkspace),
            cleanScore: clamp(
                Number(safeWorkspace?.cleanScore) || 0,
                0,
                100
            ),
            cleanGradeInfo: getCleanGradeInfo(
                clamp(
                    Number(safeWorkspace?.cleanScore) || 0,
                    0,
                    100
                )
            ),
            indicatorStats:
                buildIndicatorStats(safeWorkspace),
            shiftRows,
            maxWorkers,
            reviews: buildReviews(safeWorkspace)
        };
    }, [workspace]);

    useEffect(() => {
        setReviewPage(0);
    }, [workspaceId, detailData.reviews.length]);

    const visibleReviews = detailData.reviews.slice(
        reviewPage * REVIEWS_PER_PAGE,
        (reviewPage + 1) * REVIEWS_PER_PAGE
    );
    const hasPreviousReviewPage = reviewPage > 0;
    const hasNextReviewPage =
        (reviewPage + 1) * REVIEWS_PER_PAGE <
        detailData.reviews.length;
    const handleReviewWriteClick = () => {
        const writePath = `/review/write/${workspaceId}`;
        const auth = getStoredAuth();

        if (auth.isLoggedIn) {
            navigate(writePath, {
                state: { workspace }
            });
            return;
        }

        setPostLoginRedirectPath(writePath);

        const hasStarted = beginKakaoLogin();

        if (!hasStarted) {
            alert('카카오 로그인 설정을 확인해 주세요.');
        }
    };

    return (
        <div style={pageStyle}>
            <AppHeader />

            <main style={mainStyle}>
                <div
                    style={{
                        ...contentWrapStyle,
                        ...(isMobile
                            ? mobileContentWrapStyle
                            : null)
                    }}
                >
                    {isLoading ? (
                        <section style={feedbackCardStyle}>
                            사업장 정보를 불러오는 중입니다.
                        </section>
                    ) : errorMessage ? (
                        <section style={feedbackCardStyle}>
                            {errorMessage}
                        </section>
                    ) : (
                        <>
                            <section
                                style={{
                                    ...heroStyle,
                                    ...(isMobile
                                        ? mobileHeroStyle
                                        : null)
                                }}
                            >
                                <CircularScore
                                    score={detailData.cleanScore}
                                    accentColor={
                                        detailData.cleanGradeInfo
                                            .accentColor
                                    }
                                    textColor={
                                        detailData.cleanGradeInfo
                                            .color
                                    }
                                />

                                <div
                                    style={{
                                        ...heroTextStyle,
                                        ...(isMobile
                                            ? mobileHeroTextStyle
                                            : null)
                                    }}
                                >
                                    <h1
                                        style={{
                                            ...titleStyle,
                                            ...(isMobile
                                                ? mobileTitleStyle
                                                : null)
                                        }}
                                    >
                                        {
                                            detailData.workspaceName
                                        }
                                    </h1>

                                    <p
                                        style={{
                                            ...metaStyle,
                                            ...(isMobile
                                                ? mobileMetaStyle
                                                : null)
                                        }}
                                    >
                                        {
                                            detailData.district
                                        }
                                        <span
                                            style={
                                                metaDotStyle
                                            }
                                        >
                                            ·
                                        </span>
                                        {
                                            detailData.category
                                        }
                                        <span
                                            style={
                                                metaDotStyle
                                            }
                                        >
                                            ·
                                        </span>
                                        후기{' '}
                                        {
                                            detailData.reviewCount
                                        }
                                        개
                                    </p>
                                </div>
                            </section>

                            <section style={sectionStyle}>
                                <h2 style={sectionTitleStyle}>
                                    항목별 준수 현황
                                </h2>

                                <div
                                    style={{
                                        ...indicatorGridStyle,
                                        ...(isMobile
                                            ? mobileIndicatorGridStyle
                                            : null)
                                    }}
                                >
                                    {detailData.indicatorStats.map(
                                        (item) => (
                                            <article
                                                key={item.id}
                                                style={
                                                    indicatorCardStyle
                                                }
                                            >
                                                <strong
                                                    style={
                                                        indicatorTitleStyle
                                                    }
                                                >
                                                    {
                                                        item.label
                                                    }
                                                </strong>

                                                <div
                                                    style={
                                                        progressTrackStyle
                                                    }
                                                >
                                                    <div
                                                        style={{
                                                            ...progressFillStyle,
                                                            width: `${item.complianceRate}%`,
                                                            backgroundColor:
                                                                detailData
                                                                    .cleanGradeInfo
                                                                    .accentColor
                                                        }}
                                                    />
                                                </div>

                                                <p
                                                    style={
                                                        indicatorMetaStyle
                                                    }
                                                >
                                                    {
                                                        item.complianceCount
                                                    }
                                                    건 준수 /{' '}
                                                    {
                                                        item.violationCount
                                                    }
                                                    건 위반
                                                    <span
                                                        style={
                                                            indicatorSubMetaStyle
                                                        }
                                                    >
                                                        {' '}
                                                        (위반율{' '}
                                                        {Math.round(
                                                            item.violationRate
                                                        )}
                                                        %)
                                                    </span>
                                                </p>
                                            </article>
                                        )
                                    )}
                                </div>
                            </section>

                            <section style={sectionStyle}>
                                <h2 style={sectionTitleStyle}>
                                    동시간대 근무자 수
                                </h2>

                                <div
                                    style={{
                                        ...workerCardStyle,
                                        ...(isMobile
                                            ? mobileWorkerCardStyle
                                            : null)
                                    }}
                                >
                                    <div style={legendStyle}>
                                        <span
                                            style={
                                                legendItemStyle
                                            }
                                        >
                                            <span
                                                style={{
                                                    ...legendDotStyle,
                                                    backgroundColor:
                                                        detailData
                                                            .cleanGradeInfo
                                                            .accentColor
                                                }}
                                            />
                                            평일
                                        </span>

                                        <span
                                            style={
                                                legendItemStyle
                                            }
                                        >
                                            <span
                                                style={{
                                                    ...legendDotStyle,
                                                    backgroundColor:
                                                        '#316AE8'
                                                }}
                                            />
                                            주말
                                        </span>
                                    </div>

                                    <div
                                        style={
                                            workerRowsStyle
                                        }
                                    >
                                        {[
                                            'weekday',
                                            'weekend'
                                        ].map(
                                            (dayType) => (
                                                <div
                                                    key={dayType}
                                                    style={{
                                                        ...shiftRowStyle,
                                                        ...(isMobile
                                                            ? mobileShiftRowStyle
                                                            : null)
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            ...shiftLabelStyle,
                                                            ...(isMobile
                                                                ? mobileShiftLabelStyle
                                                                : null)
                                                        }}
                                                    >
                                                        {
                                                            DAY_TYPE_LABELS[
                                                                dayType
                                                            ]
                                                        }
                                                    </div>

                                                    <div
                                                        style={
                                                            shiftBarsStyle
                                                        }
                                                    >
                                                        {detailData.shiftRows.map(
                                                            (row) => {
                                                                const value =
                                                                    row[
                                                                        dayType
                                                                    ];

                                                                return (
                                                                    <div
                                                                        key={`${dayType}-${row.id}`}
                                                                        style={{
                                                                            ...shiftBarLineStyle,
                                                                            ...(isMobile
                                                                                ? mobileShiftBarLineStyle
                                                                                : null)
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={
                                                                                dayTypeLabelStyle
                                                                            }
                                                                        >
                                                                            {
                                                                                row.label
                                                                            }
                                                                        </span>

                                                                        <div
                                                                            style={
                                                                                shiftTrackStyle
                                                                            }
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    ...shiftFillStyle,
                                                                                    width: `${(value / detailData.maxWorkers) * 100}%`,
                                                                                    backgroundColor:
                                                                                        dayType ===
                                                                                        'weekday'
                                                                                            ? detailData
                                                                                                  .cleanGradeInfo
                                                                                                  .accentColor
                                                                                            : '#316AE8'
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        <strong
                                                                            style={
                                                                                workerValueStyle
                                                                            }
                                                                        >
                                                                            {
                                                                                value
                                                                            }
                                                                            명
                                                                        </strong>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section style={sectionStyle}>
                                <div
                                    style={
                                        reviewHeaderStyle
                                    }
                                >
                                    <h2
                                        style={
                                            sectionTitleStyle
                                        }
                                    >
                                        후기 목록
                                        <span
                                            style={
                                                reviewCountStyle
                                            }
                                        >
                                            (
                                            {
                                                detailData.reviews
                                                    .length
                                            }
                                            )
                                        </span>
                                    </h2>

                                    <button
                                        type="button"
                                        style={{
                                            ...reviewWriteButtonStyle,
                                            ...(isMobile
                                                ? mobileReviewWriteButtonStyle
                                                : null)
                                        }}
                                        onClick={
                                            handleReviewWriteClick
                                        }
                                    >
                                        후기 남기기
                                    </button>
                                </div>

                                <div
                                    style={reviewListStyle}
                                >
                                    {detailData.reviews.length ? (
                                        visibleReviews.map(
                                            (
                                                review
                                            ) => (
                                                <article
                                                    key={
                                                        review.id
                                                    }
                                                    style={{
                                                        ...reviewCardStyle,
                                                        ...(isMobile
                                                            ? mobileReviewCardStyle
                                                            : null)
                                                    }}
                                                >
                                                    <p
                                                        style={
                                                            reviewContentStyle
                                                        }
                                                    >
                                                        {
                                                            review.content
                                                        }
                                                    </p>

                                                    {review.violationItems
                                                        ?.length ? (
                                                        <div
                                                            style={
                                                                reviewTagListStyle
                                                            }
                                                        >
                                                            {review.violationItems.map(
                                                                (
                                                                    item
                                                                ) => {
                                                                    const matched =
                                                                        findReviewIndicator(
                                                                            item
                                                                        );

                                                                    return (
                                                                        <span
                                                                            key={`${review.id}-${item}`}
                                                                            style={
                                                                                reviewTagStyle
                                                                            }
                                                                        >
                                                                            {matched?.label ||
                                                                                item}
                                                                        </span>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    ) : null}

                                                    <span
                                                        style={
                                                            reviewDateStyle
                                                        }
                                                    >
                                                        {formatDate(
                                                            review.createdAt
                                                        )}
                                                    </span>
                                                </article>
                                            )
                                        )
                                    ) : (
                                        <div
                                            style={
                                                emptyStateStyle
                                            }
                                        >
                                            아직 등록된 후기가 없습니다.
                                        </div>
                                    )}
                                </div>

                                {detailData.reviews.length >
                                REVIEWS_PER_PAGE ? (
                                    <div
                                        style={{
                                            ...reviewPaginationStyle,
                                            ...(isMobile
                                                ? mobileReviewPaginationStyle
                                                : null)
                                        }}
                                    >
                                        <button
                                            type="button"
                                            style={{
                                                ...reviewPageButtonStyle,
                                                ...(!hasPreviousReviewPage
                                                    ? reviewPageButtonDisabledStyle
                                                    : {})
                                            }}
                                            onClick={() =>
                                                setReviewPage(
                                                    (previousPage) =>
                                                        Math.max(
                                                            previousPage - 1,
                                                            0
                                                        )
                                                )
                                            }
                                            disabled={
                                                !hasPreviousReviewPage
                                            }
                                        >
                                            이전
                                        </button>

                                        <button
                                            type="button"
                                            style={{
                                                ...reviewPageButtonStyle,
                                                ...(!hasNextReviewPage
                                                    ? reviewPageButtonDisabledStyle
                                                    : {})
                                            }}
                                            onClick={() =>
                                                setReviewPage(
                                                    (previousPage) =>
                                                        previousPage + 1
                                                )
                                            }
                                            disabled={
                                                !hasNextReviewPage
                                            }
                                        >
                                            다음
                                        </button>
                                    </div>
                                ) : null}
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

const pageStyle = {
    minHeight: '100dvh',
    backgroundColor: '#FFFFFF',
    overflowX: 'hidden',
    overflowY: 'auto'
};

const headerStyle = {
    height: '64px',
    padding: '0 22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    borderBottom: '1px solid #ECEFF4',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box'
};

const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap'
};

const headerRightStyle = {
    display: 'flex',
    alignItems: 'center'
};

const logoButtonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#121826',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '900'
};

const navButtonStyle = {
    padding: '0 6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#5F6775',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
};

const plainHeaderButtonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#5F6775',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700'
};

const loginButtonStyle = {
    height: '36px',
    padding: '0 16px',
    backgroundColor: '#FEE500',
    border: 'none',
    borderRadius: '18px',
    color: '#191919',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800'
};

const mainStyle = {
    width: '100%',
    overflowX: 'hidden'
};

const contentWrapStyle = {
    width: '100%',
    maxWidth: '744px',
    margin: '0 auto',
    padding: '28px 20px 40px',
    boxSizing: 'border-box'
};

const mobileContentWrapStyle = {
    padding: '20px 14px 32px'
};

const backButtonStyle = {
    marginBottom: '26px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#B2B8C2',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
};

const feedbackCardStyle = {
    padding: '20px',
    border: '1px solid #ECEFF4',
    borderRadius: '16px',
    color: '#5F6775',
    fontSize: '14px'
};

const heroStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '26px',
    marginBottom: '34px',
    flexWrap: 'wrap'
};

const mobileHeroStyle = {
    gap: '18px',
    marginBottom: '28px'
};

const heroTextStyle = {
    minWidth: 0,
    flex: 1
};

const mobileHeroTextStyle = {
    width: '100%'
};

const titleStyle = {
    margin: 0,
    color: '#171C24',
    fontSize: '22px',
    fontWeight: '900',
    letterSpacing: '-0.4px'
};

const mobileTitleStyle = {
    fontSize: '20px',
    lineHeight: '1.35'
};

const metaStyle = {
    margin: '10px 0 0',
    color: '#8C94A0',
    fontSize: '14px',
    fontWeight: '500'
};

const mobileMetaStyle = {
    fontSize: '13px',
    lineHeight: '1.6'
};

const metaDotStyle = {
    margin: '0 8px',
    color: '#C1C7D0'
};

const scoreWrapStyle = {
    position: 'relative',
    width: '104px',
    height: '104px',
    flexShrink: 0
};

const scoreSvgStyle = {
    display: 'block',
    width: '100%',
    height: '100%'
};

const scoreInnerStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
};

const scoreValueStyle = {
    color: '#1FA84F',
    fontSize: '28px',
    fontWeight: '900',
    lineHeight: 1
};

const scoreLabelStyle = {
    marginTop: '4px',
    color: '#A4A9B1',
    fontSize: '11px',
    fontWeight: '700'
};

const sectionStyle = {
    marginBottom: '34px'
};

const sectionTitleStyle = {
    margin: '0 0 18px',
    color: '#171C24',
    fontSize: '17px',
    fontWeight: '900',
    letterSpacing: '-0.3px'
};

const indicatorGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '12px'
};

const mobileIndicatorGridStyle = {
    gridTemplateColumns: '1fr'
};

const indicatorCardStyle = {
    padding: '18px 18px 16px',
    border: '1px solid #E6EAF0',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF'
};

const indicatorTitleStyle = {
    display: 'block',
    marginBottom: '14px',
    color: '#232933',
    fontSize: '14px',
    fontWeight: '800'
};

const progressTrackStyle = {
    width: '100%',
    height: '5px',
    borderRadius: '999px',
    backgroundColor: '#EEF0F2',
    overflow: 'hidden'
};

const progressFillStyle = {
    height: '100%',
    borderRadius: '999px'
};

const indicatorMetaStyle = {
    margin: '12px 0 0',
    color: '#B0B6C0',
    fontSize: '12px',
    fontWeight: '500'
};

const indicatorSubMetaStyle = {
    color: '#A0A8B3'
};

const workerCardStyle = {
    padding: '18px 20px 20px',
    border: '1px solid #E6EAF0',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF'
};

const mobileWorkerCardStyle = {
    padding: '16px 14px'
};

const legendStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
    flexWrap: 'wrap'
};

const legendItemStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#666E7A',
    fontSize: '12px',
    fontWeight: '600'
};

const legendDotStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '999px'
};

const workerRowsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
};

const shiftRowStyle = {
    display: 'grid',
    gridTemplateColumns: '44px minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'start'
};

const mobileShiftRowStyle = {
    gridTemplateColumns: '1fr',
    gap: '8px'
};

const shiftLabelStyle = {
    paddingTop: '18px',
    color: '#2C313A',
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'right'
};

const mobileShiftLabelStyle = {
    paddingTop: 0,
    textAlign: 'left'
};

const shiftBarsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const shiftBarLineStyle = {
    display: 'grid',
    gridTemplateColumns: '26px minmax(0, 1fr) 34px',
    gap: '10px',
    alignItems: 'center'
};

const mobileShiftBarLineStyle = {
    gridTemplateColumns: '30px minmax(0, 1fr) 32px',
    gap: '8px'
};

const dayTypeLabelStyle = {
    color: '#B0B6C0',
    fontSize: '11px',
    fontWeight: '700'
};

const shiftTrackStyle = {
    width: '100%',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: '#EEF0F2',
    overflow: 'hidden'
};

const shiftFillStyle = {
    height: '100%',
    borderRadius: '999px'
};

const workerValueStyle = {
    color: '#232933',
    fontSize: '14px',
    fontWeight: '800'
};

const reviewHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap'
};

const reviewCountStyle = {
    color: '#A6ADB8',
    fontSize: '15px',
    fontWeight: '700',
    marginLeft: '2px'
};

const reviewWriteButtonStyle = {
    height: '32px',
    padding: '0 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D8DEE7',
    borderRadius: '16px',
    color: '#4A515C',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700'
};

const mobileReviewWriteButtonStyle = {
    width: '100%',
    height: '38px',
    borderRadius: '12px'
};

const reviewListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
};

const reviewPaginationStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '18px',
    flexWrap: 'wrap'
};

const mobileReviewPaginationStyle = {
    justifyContent: 'stretch'
};

const reviewPageButtonStyle = {
    minWidth: '64px',
    height: '32px',
    padding: '0 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D8DEE7',
    borderRadius: '16px',
    color: '#4A515C',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700'
};

const reviewPageButtonDisabledStyle = {
    opacity: 0.42,
    cursor: 'default'
};

const reviewCardStyle = {
    padding: '18px 18px 16px',
    border: '1px solid #E6EAF0',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF'
};

const mobileReviewCardStyle = {
    padding: '16px 14px'
};

const reviewContentStyle = {
    margin: 0,
    color: '#2A2F38',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.8',
    wordBreak: 'keep-all'
};

const reviewTagListStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
};

const reviewTagStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '24px',
    padding: '0 10px',
    border: '1px solid #FFB7B5',
    borderRadius: '999px',
    backgroundColor: '#FFF5F4',
    color: '#FF5048',
    fontSize: '11px',
    fontWeight: '800'
};

const reviewDateStyle = {
    display: 'block',
    marginTop: '12px',
    color: '#B5BBC4',
    fontSize: '12px',
    fontWeight: '500'
};

const emptyStateStyle = {
    padding: '24px 18px',
    border: '1px dashed #DCE1E8',
    borderRadius: '16px',
    color: '#8C94A0',
    fontSize: '14px',
    textAlign: 'center'
};

export default WorkspaceDetail;
