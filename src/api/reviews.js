import api from './axios';
import {
    getViolationIndicatorIds,
    normalizeIndicatorKey
} from '../constants/reviewIndicators';

const ADMIN_STATUSES = [
    'PENDING',
    'APPROVED',
    'REJECTED'
];

const DEFAULT_ADMIN_PAGE_SIZE = 50;

const deepClone = (value) =>
    JSON.parse(JSON.stringify(value));

const MOCK_ADMIN_REVIEWS = [
    {
        reviewId: 'mock-pending-1',
        status: 'PENDING',
        workspaceId: 101,
        workspaceName: 'GS25 상대점',
        category: '편의점',
        district: '상대 상권',
        submitterId: 'user_b3k9',
        submittedAt: '2026-06-27T09:05:00+09:00',
        violationItems: [
            'NO_CONTRACT',
            'MINIMUM_WAGE',
            'PAY_DELAY'
        ],
        coworkerCount: 3,
        simultaneousWorkers: '3명',
        reviewText:
            '혼자 일하는 경우가 많고 쉬는 시간도 제대로 못 쉬었어요.',
        evidenceFiles: [
            {
                id: 'file-1',
                name: '출퇴근기록.png',
                type: 'IMAGE'
            },
            {
                id: 'file-2',
                name: '보험가입내역.pdf',
                type: 'PDF'
            },
            {
                id: 'file-3',
                name: '유니폼착용.jpg',
                type: 'IMAGE'
            }
        ],
        rejectionReason: ''
    },
    {
        reviewId: 'mock-pending-2',
        status: 'PENDING',
        workspaceId: 102,
        workspaceName: '더벤티 후문점',
        category: '카페',
        district: '전남대 후문',
        submitterId: 'user_c1m4',
        submittedAt: '2026-06-27T08:00:00+09:00',
        violationItems: ['WEEKLY_ALLOWANCE'],
        coworkerCount: 1,
        simultaneousWorkers: '1명',
        reviewText:
            '피크타임에는 혼자 일하는 시간이 길었고 주휴수당 정산이 불분명했습니다.',
        evidenceFiles: [
            {
                id: 'file-4',
                name: '근무표캡처.png',
                type: 'IMAGE'
            }
        ],
        rejectionReason: ''
    },
    {
        reviewId: 'mock-approved-1',
        status: 'APPROVED',
        workspaceId: 103,
        workspaceName: '노래방 별빛',
        category: '노래방',
        district: '전남우 상권',
        submitterId: 'user_a7f2',
        submittedAt: '2026-06-27T10:23:00+09:00',
        violationItems: [
            'NO_CONTRACT',
            'MINIMUM_WAGE',
            'PAY_DELAY'
        ],
        coworkerCount: 3,
        simultaneousWorkers: '3명',
        reviewText:
            '사장님이 급여를 계속 미루고 계약서도 안 써줬어요. 개선이 필요할 것 같아요.',
        evidenceFiles: [
            {
                id: 'file-5',
                name: '급여입금내역.jpg',
                type: 'IMAGE'
            },
            {
                id: 'file-6',
                name: '근로계약서사본.pdf',
                type: 'PDF'
            }
        ],
        rejectionReason: ''
    },
    {
        reviewId: 'mock-approved-2',
        status: 'APPROVED',
        workspaceId: 104,
        workspaceName: 'BHC치킨 전남대후문점',
        category: '식당',
        district: '전남대 후문',
        submitterId: 'user_d8p2',
        submittedAt: '2026-06-26T18:10:00+09:00',
        violationItems: ['OVERTIME_PAY'],
        coworkerCount: 4,
        simultaneousWorkers: '4명',
        reviewText:
            '마감 연장근무가 잦았고 초과근무 수당 정산이 애매했습니다.',
        evidenceFiles: [
            {
                id: 'file-7',
                name: '근무기록.jpg',
                type: 'IMAGE'
            },
            {
                id: 'file-8',
                name: '급여명세서.pdf',
                type: 'PDF'
            }
        ],
        rejectionReason: ''
    },
    {
        reviewId: 'mock-rejected-1',
        status: 'REJECTED',
        workspaceId: 105,
        workspaceName: '이디야커피 전남대정문점',
        category: '카페',
        district: '정문 상권',
        submitterId: 'user_e5r7',
        submittedAt: '2026-06-25T11:30:00+09:00',
        violationItems: [
            'NO_CONTRACT',
            'MINIMUM_WAGE',
            'PAY_DELAY'
        ],
        coworkerCount: 1,
        simultaneousWorkers: '1명',
        reviewText:
            '혼자 일하는 경우가 많고 쉬는 시간도 제대로 못 쉬었어요.',
        evidenceFiles: [
            {
                id: 'file-9',
                name: '캡쳐사진.jpg',
                type: 'IMAGE'
            }
        ],
        rejectionReason:
            '제출된 인증 자료만으로는 근로 여부를 확인하기 어렵습니다. 급여 입금 내역 또는 근로계약서를 추가로 제출해주세요.'
    }
];

let mockAdminReviews = deepClone(MOCK_ADMIN_REVIEWS);

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

const shouldUseMockFallback = (error) =>
    !error?.response ||
    [404, 405, 501].includes(error?.response?.status);

const extractApiErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData === 'string' && responseData.trim()) {
        return responseData.trim();
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

    const fieldErrorMessage =
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

    if (fieldErrorMessage) {
        return fieldErrorMessage.trim();
    }

    return '';
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
            id: `${fileName}-${index}`,
            name: fileName,
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
        id:
            item?.attachmentId ||
            item?.id ||
            item?.fileId ||
            `${name}-${index}`,
        name,
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
            workspace?.address ||
            workspace?.roadAddress ||
            '지역 정보 없음',
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
        evidenceFiles: evidenceFiles.map(
            normalizeEvidenceFile
        ),
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

const REVIEW_CREATE_RETRY_STATUSES = [
    400,
    404,
    405,
    415,
    422,
    501
];

const REVIEW_ATTACHMENT_RETRY_STATUSES = [
    400,
    404,
    405,
    415,
    422,
    501
];

const buildCreateReviewAttempts = (
    workspaceId,
    reviewData
) => {
    const payload = {
        workspaceId,
        ...reviewData
    };

    return [
        {
            url: '/reviews',
            data: payload
        },
        {
            url: `/workspaces/${workspaceId}/reviews`,
            data: payload
        }
    ];
};

const createReview = async (workspaceId, reviewData) => {
    const attempts = buildCreateReviewAttempts(
        workspaceId,
        reviewData
    );
    let lastError = null;

    for (let index = 0; index < attempts.length; index += 1) {
        const attempt = attempts[index];

        try {
            const response = await api.post(
                attempt.url,
                attempt.data
            );

            return response.data?.data || response.data;
        } catch (error) {
            lastError = error;

            const statusCode = error?.response?.status;
            const canRetry =
                index < attempts.length - 1 &&
                REVIEW_CREATE_RETRY_STATUSES.includes(
                    statusCode
                );

            if (!canRetry) {
                break;
            }
        }
    }

    const statusCode = lastError?.response?.status;
    const apiMessage = extractApiErrorMessage(lastError);

    throw new Error(
        apiMessage ||
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

const buildAttachmentUploadAttempts = (
    reviewId,
    file
) => {
    const endpointCandidates = [
        `/reviews/${reviewId}/attachments`,
        `/reviews/${reviewId}/attachment`,
        `/reviews/${reviewId}/evidences`,
        `/reviews/${reviewId}/evidence`
    ];
    const fieldCandidates = [
        'file',
        'attachment',
        'evidenceFile',
        'evidence'
    ];

    return endpointCandidates.flatMap((url) =>
        fieldCandidates.map((fieldName) => {
            const formData = new FormData();
            formData.append(
                fieldName,
                file,
                file.name
            );

            return {
                url,
                data: formData
            };
        })
    );
};

const uploadReviewAttachment = async (reviewId, file) => {
    const attempts = buildAttachmentUploadAttempts(
        reviewId,
        file
    );
    let lastError = null;

    for (let index = 0; index < attempts.length; index += 1) {
        const attempt = attempts[index];

        try {
            const response = await api.post(
                attempt.url,
                attempt.data
            );

            return response.data?.data || response.data;
        } catch (error) {
            lastError = error;

            const statusCode = error?.response?.status;
            const canRetry =
                index < attempts.length - 1 &&
                REVIEW_ATTACHMENT_RETRY_STATUSES.includes(
                    statusCode
                );

            if (!canRetry) {
                break;
            }
        }
    }

    throw lastError;
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

    const uploadedAttachments = [];

    for (const file of evidenceFiles) {
        try {
            uploadedAttachments.push(
                await uploadReviewAttachment(
                    createdReviewId,
                    file
                )
            );
        } catch (error) {
            const fileName =
                file?.name || '첨부 파일';
            const statusCode = error?.response?.status;
            const apiMessage = extractApiErrorMessage(error);

            throw new Error(
                apiMessage ||
                    (statusCode
                    ? `${fileName} 업로드에 실패했습니다. (HTTP ${statusCode})`
                    : `${fileName} 업로드에 실패했습니다.`)
            );
        }
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
        }
    );

    return normalizePurifyResponse(
        response.data,
        content
    );
};

export const getAdminReviews = async (status = null) => {
    try {
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
    } catch (error) {
        if (!shouldUseMockFallback(error)) {
            throw error;
        }

        console.warn(
            '관리자 리뷰 목록 API 응답을 받지 못해 목업 데이터를 사용합니다.',
            error
        );

        const filtered = status
            ? mockAdminReviews.filter(
                  (item) =>
                      item.status ===
                      normalizeAdminStatus(status)
              )
            : mockAdminReviews;

        return sortAdminReviews(deepClone(filtered));
    }
};

export const getAdminReviewDetail = async (reviewId) => {
    try {
        const response = await api.get(
            `/admin/reviews/${reviewId}`,
            {
                preserveAuthOnFailure: true
            }
        );

        return normalizeAdminReview(
            response.data?.data || response.data
        );
    } catch (error) {
        if (!shouldUseMockFallback(error)) {
            throw error;
        }

        console.warn(
            '관리자 리뷰 상세 API 응답을 받지 못해 목업 데이터를 사용합니다.',
            error
        );

        const matched = mockAdminReviews.find(
            (item) =>
                String(item.reviewId) === String(reviewId)
        );

        if (!matched) {
            throw new Error(
                '검수 상세 데이터를 찾을 수 없습니다.'
            );
        }

        return deepClone(matched);
    }
};

export const updateAdminReviewStatus = async ({
    reviewId,
    status,
    rejectionReason = ''
}) => {
    const normalizedStatus =
        normalizeAdminStatus(status);

    try {
        const response = await api.patch(
            `/admin/reviews/${reviewId}/status`,
            {
                status: normalizedStatus
            },
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
    } catch (error) {
        if (!shouldUseMockFallback(error)) {
            throw error;
        }

        console.warn(
            '관리자 상태 변경 API 응답을 받지 못해 로컬 목업 상태를 갱신합니다.',
            error
        );

        mockAdminReviews = mockAdminReviews.map((item) =>
            String(item.reviewId) === String(reviewId)
                ? {
                      ...item,
                      status: normalizedStatus,
                      rejectionReason:
                          normalizedStatus ===
                          'REJECTED'
                              ? rejectionReason
                              : ''
                  }
                : item
        );

        return {
            reviewId,
            status: normalizedStatus,
            cleanScore: null,
            workspaceStatus: ''
        };
    }
};

export const getAdminStats = async () => {
    try {
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
    } catch (error) {
        if (!shouldUseMockFallback(error)) {
            throw error;
        }

        const pendingReviews = mockAdminReviews.filter(
            (item) => item.status === 'PENDING'
        ).length;
        const approvedReviews = mockAdminReviews.filter(
            (item) => item.status === 'APPROVED'
        ).length;
        const rejectedReviews = mockAdminReviews.filter(
            (item) => item.status === 'REJECTED'
        ).length;

        return {
            totalReviews: mockAdminReviews.length,
            pendingReviews,
            approvedReviews,
            rejectedReviews,
            totalWorkspaces: new Set(
                mockAdminReviews.map((item) => item.workspaceId)
            ).size
        };
    }
};
