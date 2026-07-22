import api from './axios';
import {
    getViolationIndicatorIds,
    normalizeIndicatorKey
} from '../constants/reviewIndicators';
import { normalizeReviewSentiment } from '../utils/reviewSentiment';

const ADMIN_STATUSES = [
    'PENDING',
    'APPROVED',
    'REJECTED'
];

const DEFAULT_ADMIN_PAGE_SIZE = 50;
const REVIEW_CREATE_TIMEOUT_MS = 30000;
const REVIEW_ATTACHMENT_TIMEOUT_MS = 30000;
const REVIEW_PURITY_TIMEOUT_MS = 45000;
const REVIEW_ATTACHMENT_MAX_ATTEMPTS = 3;
const REVIEW_ATTACHMENT_RETRY_DELAYS = [700, 1500];

const normalizeToneKey = (value = '') =>
    normalizeIndicatorKey(value);

const pickFirstString = (source, keys) => {
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

const pickFirstArray = (source, keys) => {
    if (!source || typeof source !== 'object') {
        return [];
    }

    for (const key of keys) {
        const value = source[key];

        if (Array.isArray(value)) {
            return value;
        }
    }

    return [];
};

const toInteger = (value) => {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);

        if (Number.isInteger(parsed)) {
            return parsed;
        }
    }

    return null;
};

const isTimeoutError = (error) =>
    error?.code === 'ECONNABORTED' ||
    /timeout/i.test(String(error?.message || ''));

const isNetworkError = (error) =>
    !error?.response &&
    (error?.code === 'ERR_NETWORK' ||
        String(error?.message || '')
            .trim()
            .toLowerCase() === 'network error');

const isTransientServerError = (error) =>
    [502, 503, 504].includes(error?.response?.status) ||
    isTimeoutError(error) ||
    isNetworkError(error);

const wait = (ms) =>
    new Promise((resolve) => {
        globalThis.setTimeout(resolve, ms);
    });

const extractApiErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData === 'string' && responseData.trim()) {
        return responseData.trim();
    }

    const objectFieldErrors = Object.entries(
        responseData?.errors || {}
    ).filter(
        ([, value]) =>
            typeof value === 'string' && value.trim()
    );

    if (objectFieldErrors.length > 0) {
        return objectFieldErrors
            .map(
                ([field, message]) =>
                    `${field}: ${message.trim()}`
            )
            .join(', ');
    }

    const arrayFieldErrorMessage =
        responseData?.errors?.find?.(
            (item) =>
                typeof item?.defaultMessage === 'string' &&
                item.defaultMessage.trim()
        )?.defaultMessage ||
        responseData?.errors?.find?.(
            (item) =>
                typeof item?.message === 'string' &&
                item.message.trim()
        )?.message;

    if (arrayFieldErrorMessage) {
        return arrayFieldErrorMessage.trim();
    }

    const candidates = [
        responseData?.message,
        responseData?.error,
        responseData?.detail,
        responseData?.reason,
        responseData?.data?.message,
        responseData?.data?.error,
        responseData?.data?.detail
    ];

    const firstMessage = candidates.find(
        (value) =>
            typeof value === 'string' && value.trim()
    );

    if (firstMessage) {
        return firstMessage.trim();
    }

    return '';
};

const isGenericBadRequestMessage = (message = '') =>
    [
        'BAD REQUEST',
        'BADREQUEST',
        '요청값이 올바르지 않습니다.'
    ].includes(
        String(message)
            .trim()
            .toUpperCase()
    );

const buildUppercaseEnumReviewData = (
    reviewData = {}
) => ({
    ...reviewData,
    dayType:
        typeof reviewData.dayType === 'string'
            ? reviewData.dayType.toUpperCase()
            : reviewData.dayType,
    timeSlot:
        typeof reviewData.timeSlot === 'string'
            ? reviewData.timeSlot.toUpperCase()
            : reviewData.timeSlot
});

const buildLegacyCompatibleReviewData = (
    reviewData = {}
) => {
    const nextReviewData = {
        ...reviewData
    };

    if (
        Object.prototype.hasOwnProperty.call(
            nextReviewData,
            'weeklyHolidayAllowanceViolation'
        )
    ) {
        nextReviewData.weeklyAllowanceViolation =
            nextReviewData.weeklyHolidayAllowanceViolation;
        delete nextReviewData.weeklyHolidayAllowanceViolation;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            nextReviewData,
            'substituteDemandViolation'
        )
    ) {
        nextReviewData.substituteCoercionViolation =
            nextReviewData.substituteDemandViolation;
        delete nextReviewData.substituteDemandViolation;
    }

    delete nextReviewData.breakTimeViolation;

    return nextReviewData;
};

const buildLegacyWorkerCountReviewData = (
    reviewData = {}
) => {
    const nextReviewData = {
        ...reviewData
    };

    if (
        Object.prototype.hasOwnProperty.call(
            nextReviewData,
            'coworkerCount'
        )
    ) {
        nextReviewData.simultaneousWorkers =
            nextReviewData.coworkerCount;
        delete nextReviewData.coworkerCount;
    }

    return nextReviewData;
};

const buildNoShiftReviewData = (
    reviewData = {}
) => {
    const nextReviewData = {
        ...reviewData
    };

    delete nextReviewData.dayType;
    delete nextReviewData.timeSlot;

    return nextReviewData;
};

const buildCreateReviewPayloadAttempts = (
    reviewData = {}
) => {
    const exact = {
        ...reviewData
    };
    const uppercaseEnum =
        buildUppercaseEnumReviewData(exact);
    const legacyCompatible =
        buildLegacyCompatibleReviewData(exact);
    const legacyUppercaseEnum =
        buildUppercaseEnumReviewData(
            legacyCompatible
        );
    const legacyWorkerCount =
        buildLegacyWorkerCountReviewData(exact);
    const legacyWorkerCountUppercaseEnum =
        buildUppercaseEnumReviewData(
            legacyWorkerCount
        );
    const legacyFullCompatible =
        buildLegacyWorkerCountReviewData(
            legacyCompatible
        );
    const legacyFullUppercaseEnum =
        buildUppercaseEnumReviewData(
            legacyFullCompatible
        );
    const noShift =
        buildNoShiftReviewData(exact);
    const noShiftLegacyCompatible =
        buildLegacyCompatibleReviewData(noShift);
    const noShiftLegacyWorkerCount =
        buildLegacyWorkerCountReviewData(noShift);
    const noShiftLegacyFullCompatible =
        buildLegacyWorkerCountReviewData(
            noShiftLegacyCompatible
        );

    return [
        {
            label: 'exact',
            data: exact
        },
        {
            label: 'uppercase-enum',
            data: uppercaseEnum
        },
        {
            label: 'legacy-compatible',
            data: legacyCompatible
        },
        {
            label: 'legacy-uppercase-enum',
            data: legacyUppercaseEnum
        },
        {
            label: 'legacy-worker-count',
            data: legacyWorkerCount
        },
        {
            label: 'legacy-worker-count-uppercase-enum',
            data: legacyWorkerCountUppercaseEnum
        },
        {
            label: 'legacy-full-compatible',
            data: legacyFullCompatible
        },
        {
            label: 'legacy-full-uppercase-enum',
            data: legacyFullUppercaseEnum
        },
        {
            label: 'no-shift',
            data: noShift
        },
        {
            label: 'no-shift-legacy-compatible',
            data: noShiftLegacyCompatible
        },
        {
            label: 'no-shift-legacy-worker-count',
            data: noShiftLegacyWorkerCount
        },
        {
            label: 'no-shift-legacy-full-compatible',
            data: noShiftLegacyFullCompatible
        }
    ].filter(
        (attempt, index, attempts) =>
            attempts.findIndex(
                (candidate) =>
                    JSON.stringify(candidate.data) ===
                    JSON.stringify(attempt.data)
            ) === index
    );
};

const shouldRetryWithUppercaseEnums = (
    error,
    reviewData
) => {
    if (error?.response?.status !== 400) {
        return false;
    }

    const apiMessage = extractApiErrorMessage(error);

    if (!isGenericBadRequestMessage(apiMessage)) {
        return false;
    }

    const hasLowercaseDayType =
        typeof reviewData?.dayType === 'string' &&
        /[a-z]/.test(reviewData.dayType);
    const hasLowercaseTimeSlot =
        typeof reviewData?.timeSlot === 'string' &&
        /[a-z]/.test(reviewData.timeSlot);

    return hasLowercaseDayType || hasLowercaseTimeSlot;
};

const normalizeAdminStatus = (value = '') => {
    const normalized = String(value)
        .trim()
        .toUpperCase();

    if (
        ['APPROVED', 'APPROVE', '승인', '승인됨'].includes(
            normalized
        )
    ) {
        return 'APPROVED';
    }

    if (
        ['REJECTED', 'REJECT', '반려', '거절', '거절됨'].includes(
            normalized
        )
    ) {
        return 'REJECTED';
    }

    return 'PENDING';
};

const normalizeEvidenceFile = (item, index) => {
    if (typeof item === 'string') {
        const fileName =
            item.split('/').pop() || `인증자료_${index + 1}`;

        return {
            attachmentId: null,
            id: `${fileName}-${index}`,
            name: fileName,
            contentType: '',
            size: null,
            url: item,
            type: /\.pdf$/i.test(fileName) ? 'PDF' : 'IMAGE'
        };
    }

    const name =
        item?.name ||
        item?.fileName ||
        item?.originalFileName ||
        item?.filename ||
        `인증자료_${index + 1}`;
    const contentType =
        item?.type ||
        item?.fileType ||
        item?.contentType ||
        item?.mimeType ||
        '';
    const normalizedType = String(contentType).toUpperCase();

    return {
        attachmentId:
            item?.attachmentId ||
            item?.id ||
            item?.fileId ||
            null,
        id:
            item?.attachmentId ||
            item?.id ||
            item?.fileId ||
            `${name}-${index}`,
        name,
        contentType,
        size: toInteger(item?.size),
        url:
            item?.url ||
            item?.fileUrl ||
            item?.downloadUrl ||
            item?.path ||
            '',
        type:
            normalizedType.includes('PDF') ||
            String(name).toLowerCase().endsWith('.pdf')
                ? 'PDF'
                : 'IMAGE'
    };
};

const mapPurifyOptionKey = (item, index) => {
    const toneKey = normalizeToneKey(
        item?.style ||
            item?.tone ||
            item?.type ||
            item?.label ||
            item?.title
    );
    const optionId =
        item?.optionId ??
        item?.option_id ??
        item?.id ??
        index + 1;

    if (
        [
            '객관형',
            '객관적사실전달형',
            '객관적사실형',
            '매우건조하고객관적인사실전달형',
            'OBJECTIVE'
        ].includes(toneKey)
    ) {
        return 'objective';
    }

    if (
        [
            '완곡형',
            '부드럽고완곡한경험공유형',
            'GENTLE',
            'SOFT'
        ].includes(toneKey)
    ) {
        return 'soft';
    }

    if (
        [
            '감정유지형',
            '공감호소형',
            '감정유지하되법적문제만제거',
            '원문의감정을어느정도유지하되법적문제만제거한형태',
            'EMOTIONAL',
            'EMPATHY'
        ].includes(toneKey)
    ) {
        return 'emotional';
    }

    if (Number(optionId) === 1) {
        return 'objective';
    }

    if (Number(optionId) === 2) {
        return 'soft';
    }

    if (Number(optionId) === 3) {
        return 'emotional';
    }

    if (index === 0) {
        return 'soft';
    }

    if (index === 1) {
        return 'objective';
    }

    return 'emotional';
};

const normalizePurifyResponse = (payload, sourceText) => {
    const raw = payload?.data || payload?.result || payload;

    if (!raw || typeof raw !== 'object') {
        throw new Error(
            'AI 순화 응답 형식이 올바르지 않습니다.'
        );
    }

    const options = pickFirstArray(raw, [
        'purifiedOptions',
        'purified_options',
        'options',
        'suggestions'
    ]);

    const mapped = {
        source: 'remote',
        originalText:
            pickFirstString(raw, [
                'originalText',
                'original_text',
                'reviewText'
            ]) || sourceText,
        riskLevel: pickFirstString(
            raw?.riskAssessment || raw?.risk_assessment,
            ['riskLevel', 'risk_level']
        ),
        detectedIssues: pickFirstArray(
            raw?.riskAssessment || raw?.risk_assessment,
            ['detectedIssues', 'detected_issues']
        ),
        reasoning: pickFirstString(
            raw?.riskAssessment || raw?.risk_assessment,
            ['reasoning']
        ),
        soft: '',
        objective: '',
        emotional: ''
    };

    options.forEach((item, index) => {
        const key = mapPurifyOptionKey(item, index);
        const text = pickFirstString(item, [
            'text',
            'content',
            'value'
        ]);

        if (text) {
            mapped[key] = text;
        }
    });

    if (
        mapped.objective &&
        mapped.soft &&
        mapped.emotional
    ) {
        return mapped;
    }

    throw new Error(
        'AI 순화 응답에 필요한 3가지 버전이 모두 포함되지 않았습니다.'
    );
};

const toCoworkerText = (value) => {
    if (Number.isInteger(value) && value >= 0) {
        return `${value}명`;
    }

    return '';
};

const normalizeAdminReview = (item) => {
    const workspace =
        item?.workspace ||
        item?.externalWorkspace ||
        item?.place ||
        {};
    const review =
        item?.review || item?.reviewData || {};
    const reviewSource = {
        ...review,
        ...item
    };
    const coworkerCount =
        toInteger(
            reviewSource?.coworkerCount ??
                reviewSource?.workerCount
        ) ?? null;
    const evidenceFiles = pickFirstArray(item, [
        'attachments',
        'evidenceFiles',
        'proofFiles',
        'files'
    ]);
    const attachmentCount =
        toInteger(
            item?.attachmentCount ??
                item?.attachmentsCount ??
                review?.attachmentCount ??
                review?.attachmentsCount
        ) ?? evidenceFiles.length;

    return {
        reviewId:
            item?.reviewId ||
            item?.id ||
            review?.reviewId ||
            review?.id ||
            '',
        workspaceId:
            item?.workspaceId ||
            workspace?.workspaceId ||
            workspace?.id ||
            null,
        workspaceName:
            item?.workspaceName ||
            workspace?.name ||
            workspace?.placeName ||
            '사업장 이름 없음',
        category:
            item?.category ||
            item?.workspaceCategory ||
            workspace?.category ||
            workspace?.categoryName ||
            '업종 정보 없음',
        district:
            item?.district ||
            item?.workspaceDistrict ||
            workspace?.district ||
            workspace?.region ||
            '지역 정보 없음',
        address:
            item?.address ||
            item?.workspaceAddress ||
            workspace?.address ||
            workspace?.roadAddress ||
            workspace?.addressName ||
            workspace?.roadAddressName ||
            '',
        submitterId:
            item?.submitterId ||
            item?.authorEmail ||
            item?.userId ||
            item?.writerId ||
            item?.memberId ||
            item?.createdBy ||
            'unknown_user',
        authorEmail:
            item?.authorEmail ||
            item?.submitterId ||
            '',
        submittedAt:
            item?.submittedAt ||
            item?.createdAt ||
            item?.createdDate ||
            review?.createdAt ||
            '',
        createdAt:
            item?.createdAt ||
            item?.createdDate ||
            review?.createdAt ||
            '',
        updatedAt:
            item?.updatedAt ||
            item?.updated_at ||
            review?.updatedAt ||
            review?.updated_at ||
            '',
        status: normalizeAdminStatus(
            item?.status ||
                item?.reviewStatus ||
                item?.moderationStatus
        ),
        violationItems: getViolationIndicatorIds(reviewSource),
        coworkerCount,
        simultaneousWorkers:
            toCoworkerText(coworkerCount) ||
            pickFirstString(reviewSource, [
                'simultaneousWorkers',
                'workerCountText',
                'workersSummary'
            ]),
        reviewText:
            pickFirstString(reviewSource, [
                'content',
                'reviewText',
                'subjectiveReview',
                'originalText',
                'original_text'
            ]) || '',
        purifiedText: pickFirstString(reviewSource, [
            'purifiedText',
            'purifiedContent',
            'sanitizedContent'
        ]),
        sentiment: normalizeReviewSentiment(
            reviewSource?.sentiment ||
                reviewSource?.reviewSentiment ||
                reviewSource?.review_sentiment ||
                reviewSource?.sentimentType ||
                reviewSource?.sentiment_type ||
                reviewSource?.mood ||
                reviewSource?.reviewMood ||
                reviewSource?.review_mood ||
                reviewSource?.atmosphere ||
                reviewSource?.tone
        ),
        evidenceFiles: evidenceFiles.map(
            normalizeEvidenceFile
        ),
        attachmentCount,
        rejectionReason:
            pickFirstString(item, [
                'rejectionReason',
                'rejectReason',
                'adminMemo'
            ]) || '',
        cleanScore: toInteger(item?.cleanScore),
        workspaceStatus:
            pickFirstString(item, [
                'workspaceStatus'
            ]) || ''
    };
};

const sortAdminReviews = (reviews) =>
    reviews.slice().sort((left, right) => {
        const leftTime = new Date(
            left.submittedAt || 0
        ).getTime();
        const rightTime = new Date(
            right.submittedAt || 0
        ).getTime();

        return rightTime - leftTime;
    });

const fetchAdminReviewPage = async (status) => {
    const response = await api.get('/admin/reviews', {
        params: {
            status,
            page: 0,
            size: DEFAULT_ADMIN_PAGE_SIZE
        },
        preserveAuthOnFailure: true
    });
    const raw = response.data?.data || response.data;
    const content = Array.isArray(raw?.content)
        ? raw.content
        : [];

    return {
        reviews: content.map(normalizeAdminReview),
        totalElements:
            toInteger(raw?.totalElements) ||
            content.length
    };
};

const createReview = async (workspaceId, reviewData) => {
    const attempts =
        buildCreateReviewPayloadAttempts(
            reviewData
        );
    const attemptedLabels = [];
    let lastError = null;

    for (const attempt of attempts) {
        attemptedLabels.push(attempt.label);

        try {
            const response = await api.post(
                `/workspaces/${workspaceId}/reviews`,
                attempt.data,
                {
                    timeout: REVIEW_CREATE_TIMEOUT_MS
                }
            );

            return response.data?.data || response.data;
        } catch (error) {
            lastError = error;

            console.error('리뷰 생성 요청 실패', {
                attempt: attempt.label,
                url: `/workspaces/${workspaceId}/reviews`,
                workspaceId,
                requestBody: attempt.data,
                responseData: error?.response?.data,
                status: error?.response?.status,
                errorCode: error?.code,
                errorMessage: error?.message
            });

            const statusCode = error?.response?.status;
            const apiMessage = extractApiErrorMessage(error);
            const canRetry =
                statusCode === 400 &&
                isGenericBadRequestMessage(apiMessage) &&
                attempt !==
                    attempts[attempts.length - 1];

            if (!canRetry) {
                break;
            }
        }
    }

    const statusCode = lastError?.response?.status;
    const apiMessage = extractApiErrorMessage(lastError);
    const finalMessage =
        isTimeoutError(lastError)
            ? '서버 응답이 지연되어 후기 등록 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
            : isNetworkError(lastError)
                ? '리뷰 등록 서버에 연결하지 못했습니다. 네트워크 상태나 백엔드 서버 상태를 확인해 주세요.'
                : statusCode === 400 &&
                    isGenericBadRequestMessage(apiMessage)
                    ? '서버가 리뷰 생성 요청을 거절했습니다. 프론트에서 호환 형식으로 여러 번 재시도했지만 모두 실패했습니다. 백엔드 로그에서 리뷰 생성 사유를 확인해 주세요.'
                    : apiMessage;

    if (
        statusCode === 400 &&
        isGenericBadRequestMessage(apiMessage)
    ) {
        console.error('리뷰 생성 호환 재시도 전체 실패', {
            url: `/workspaces/${workspaceId}/reviews`,
            workspaceId,
            attemptedLabels,
            lastResponseData: lastError?.response?.data,
            lastStatus: statusCode,
            lastErrorCode: lastError?.code,
            lastErrorMessage: lastError?.message
        });
    }

    throw new Error(
        finalMessage ||
            (statusCode
                ? `후기 등록에 실패했습니다. (HTTP ${statusCode})`
                : '후기 등록에 실패했습니다.')
    );
};

const resolveCreatedReviewId = (createdReview) =>
    createdReview?.reviewId ||
    createdReview?.id ||
    createdReview?.review_id ||
    createdReview?.data?.reviewId ||
    createdReview?.data?.id ||
    createdReview?.data?.review_id ||
    null;

const uploadReviewAttachment = async (reviewId, file) => {
    let lastError = null;

    for (
        let attempt = 1;
        attempt <= REVIEW_ATTACHMENT_MAX_ATTEMPTS;
        attempt += 1
    ) {
        try {
            const formData = new FormData();
            formData.append('file', file, file.name);

            const response = await api.post(
                `/reviews/${reviewId}/attachments`,
                formData,
                {
                    timeout: REVIEW_ATTACHMENT_TIMEOUT_MS
                }
            );

            return response.data?.data || response.data;
        } catch (error) {
            lastError = error;

            console.error('리뷰 첨부 업로드 실패', {
                attempt,
                url: `/reviews/${reviewId}/attachments`,
                reviewId,
                fileName: file?.name,
                fileType: file?.type,
                fileSize: file?.size,
                responseData: error?.response?.data,
                status: error?.response?.status,
                errorCode: error?.code,
                errorMessage: error?.message
            });

            if (
                attempt >= REVIEW_ATTACHMENT_MAX_ATTEMPTS ||
                !isTransientServerError(error)
            ) {
                break;
            }

            await wait(
                REVIEW_ATTACHMENT_RETRY_DELAYS[attempt - 1] ||
                    REVIEW_ATTACHMENT_RETRY_DELAYS[
                        REVIEW_ATTACHMENT_RETRY_DELAYS.length - 1
                    ]
            );
        }
    }

    throw lastError;
};

const buildAttachmentUploadError = ({
    error,
    fileName,
    reviewId
}) => {
    const statusCode = error?.response?.status;
    const apiMessage = extractApiErrorMessage(error);
    const finalMessage =
        isTimeoutError(error)
            ? `${fileName} 업로드 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.`
            : isNetworkError(error)
                ? `${fileName} 업로드 서버에 연결하지 못했습니다. 네트워크 상태나 백엔드 서버 상태를 확인해 주세요.`
                : isTransientServerError(error)
                    ? `${fileName} 인증자료 업로드 서버가 일시적으로 응답하지 않습니다. 후기는 생성되었지만 인증자료 업로드가 완료되지 않았습니다. (reviewId: ${reviewId})`
                : statusCode === 400 &&
                    isGenericBadRequestMessage(apiMessage)
                    ? `${fileName} 업로드 요청이 거절되었습니다. 파일 형식(JPG, JPEG, PNG, PDF)과 용량(10MB 이하)을 확인해 주세요.`
                    : apiMessage;

    const uploadError = new Error(
        finalMessage ||
            (statusCode
                ? `${fileName} 업로드에 실패했습니다. (HTTP ${statusCode})`
                : `${fileName} 업로드에 실패했습니다.`)
    );

    uploadError.reviewId = reviewId;
    uploadError.fileName = fileName;
    uploadError.attachmentUploadFailed = true;
    uploadError.cause = error;

    return uploadError;
};

export const uploadReviewAttachments = async ({
    reviewId,
    evidenceFiles = []
}) => {
    if (!reviewId) {
        throw new Error(
            '인증 자료를 업로드할 reviewId가 없습니다.'
        );
    }

    const uploadedAttachments = [];

    for (const file of evidenceFiles) {
        try {
            uploadedAttachments.push(
                await uploadReviewAttachment(
                    reviewId,
                    file
                )
            );
        } catch (error) {
            const fileName =
                file?.name || '첨부 파일';

            throw buildAttachmentUploadError({
                error,
                fileName,
                reviewId
            });
        }
    }

    return uploadedAttachments;
};

export const submitReview = async ({
    workspaceId,
    reviewData,
    evidenceFiles = []
}) => {
    if (!workspaceId) {
        throw new Error(
            '리뷰를 작성할 사업장 ID가 없습니다.'
        );
    }

    const createdReview = await createReview(
        workspaceId,
        reviewData
    );

    const createdReviewId =
        resolveCreatedReviewId(createdReview);

    if (!createdReviewId) {
        throw new Error(
            '리뷰 생성 응답에서 reviewId를 찾을 수 없습니다.'
        );
    }

    let uploadedAttachments = [];

    try {
        uploadedAttachments =
            await uploadReviewAttachments({
                reviewId: createdReviewId,
                evidenceFiles
            });
    } catch (error) {
        error.createdReview = createdReview;
        throw error;
    }

    return {
        ...createdReview,
        reviewId: createdReviewId,
        attachments: uploadedAttachments
    };
};

export const purifyReview = async (content) => {
    const response = await api.post(
        '/reviews/purity-preview',
        {
            reviewText: content
        },
        {
            timeout: REVIEW_PURITY_TIMEOUT_MS
        }
    );

    return normalizePurifyResponse(
        response.data,
        content
    );
};

export const getAdminReviews = async (status = null) => {
    if (status) {
        const result = await fetchAdminReviewPage(
            normalizeAdminStatus(status)
        );

        return sortAdminReviews(result.reviews);
    }

    const results = await Promise.all(
        ADMIN_STATUSES.map(fetchAdminReviewPage)
    );

    return sortAdminReviews(
        results.flatMap((result) => result.reviews)
    );
};

export const getAdminReviewDetail = async (reviewId) => {
    const response = await api.get(
        `/admin/reviews/${reviewId}`,
        {
            preserveAuthOnFailure: true
        }
    );

    return normalizeAdminReview(
        response.data?.data || response.data
    );
};

const readFileNameFromDisposition = (
    disposition = ''
) => {
    const encodedMatch = String(disposition).match(
        /filename\*=UTF-8''([^;]+)/i
    );

    if (encodedMatch?.[1]) {
        return decodeURIComponent(
            encodedMatch[1].replace(/"/g, '')
        );
    }

    const plainMatch = String(disposition).match(
        /filename="?([^";]+)"?/i
    );

    return plainMatch?.[1]
        ? plainMatch[1].trim()
        : '';
};

export const downloadAdminReviewAttachment = async ({
    reviewId,
    attachmentId
}) => {
    if (!reviewId || !attachmentId) {
        throw new Error(
            '다운로드할 인증 자료 정보가 없습니다.'
        );
    }

    const response = await api.get(
        `/admin/reviews/${reviewId}/attachments/${attachmentId}`,
        {
            responseType: 'blob',
            preserveAuthOnFailure: true
        }
    );

    return {
        blob: response.data,
        fileName: readFileNameFromDisposition(
            response.headers?.['content-disposition']
        ),
        contentType: response.headers?.['content-type'] || ''
    };
};

export const updateAdminReviewStatus = async ({
    reviewId,
    status,
    rejectionReason = ''
}) => {
    const normalizedStatus =
        normalizeAdminStatus(status);

    const payload = {
        status: normalizedStatus
    };

    if (
        normalizedStatus === 'REJECTED' &&
        rejectionReason
    ) {
        payload.rejectionReason = rejectionReason;
    }

    const response = await api.patch(
        `/admin/reviews/${reviewId}/status`,
        payload,
        {
            preserveAuthOnFailure: true
        }
    );
    const raw = response.data?.data || response.data;

    return {
        reviewId:
            raw?.reviewId || Number(reviewId) || reviewId,
        status: normalizeAdminStatus(raw?.status),
        cleanScore: toInteger(raw?.cleanScore),
        workspaceStatus:
            pickFirstString(raw, [
                'workspaceStatus'
            ]) || ''
    };
};

export const updateAdminReviewContent = async ({
    reviewId,
    content
}) => {
    if (!reviewId) {
        throw new Error('수정할 리뷰 정보가 없습니다.');
    }

    const response = await api.patch(
        `/admin/reviews/${reviewId}/content`,
        {
            content
        },
        {
            preserveAuthOnFailure: true
        }
    );
    const raw = response.data?.data || response.data;
    const normalized = normalizeAdminReview(raw);

    return {
        ...normalized,
        reviewId:
            normalized.reviewId ||
            raw?.reviewId ||
            Number(reviewId) ||
            reviewId,
        reviewText:
            pickFirstString(raw, [
                'content',
                'reviewText',
                'subjectiveReview',
                'purifiedContent'
            ]) || content,
        updatedAt:
            raw?.updatedAt ||
            raw?.updated_at ||
            normalized.updatedAt ||
            ''
    };
};

export const updateAdminReviewSentiment = async ({
    reviewId,
    sentiment
}) => {
    if (!reviewId) {
        throw new Error('수정할 리뷰 정보가 없습니다.');
    }

    const normalizedSentiment =
        normalizeReviewSentiment(sentiment);

    if (!normalizedSentiment) {
        throw new Error('후기 분위기를 선택해 주세요.');
    }

    const apiSentiment = normalizedSentiment.toUpperCase();
    const payload = {
        sentiment: apiSentiment
    };
    const response = await api.patch(
        `/admin/reviews/${reviewId}/sentiment`,
        payload,
        {
            preserveAuthOnFailure: true
        }
    );

    const raw = response.data?.data || response.data;
    const normalized = normalizeAdminReview(raw);

    return {
        ...normalized,
        reviewId:
            normalized.reviewId ||
            raw?.reviewId ||
            Number(reviewId) ||
            reviewId,
        sentiment:
            normalized.sentiment || normalizedSentiment,
        updatedAt:
            raw?.updatedAt ||
            raw?.updated_at ||
            normalized.updatedAt ||
            ''
    };
};

export const getAdminStats = async () => {
    const response = await api.get('/admin/stats', {
        preserveAuthOnFailure: true
    });
    const raw = response.data?.data || response.data;

    return {
        totalReviews:
            toInteger(raw?.totalReviews) || 0,
        pendingReviews:
            toInteger(raw?.pendingReviews) || 0,
        approvedReviews:
            toInteger(raw?.approvedReviews) || 0,
        rejectedReviews:
            toInteger(raw?.rejectedReviews) || 0,
        totalWorkspaces:
            toInteger(raw?.totalWorkspaces) || 0
    };
};
