import api from './axios';

const coerceFiniteNumber = (value) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
};

const pickFirstDefined = (...values) =>
    values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ''
    );

const normalizeWorkspace = (workspace = {}) => {
    const normalizedId = coerceFiniteNumber(
        pickFirstDefined(
            workspace?.workspaceId,
            workspace?.workspace_id,
            workspace?.id
        )
    );
    const normalizedLatitude = coerceFiniteNumber(
        pickFirstDefined(
            workspace?.latitude,
            workspace?.lat,
            workspace?.y
        )
    );
    const normalizedLongitude = coerceFiniteNumber(
        pickFirstDefined(
            workspace?.longitude,
            workspace?.lng,
            workspace?.x
        )
    );
    const normalizedCleanScore = coerceFiniteNumber(
        pickFirstDefined(
            workspace?.cleanScore,
            workspace?.clean_score,
            workspace?.score
        )
    );
    const normalizedReviewCount = coerceFiniteNumber(
        pickFirstDefined(
            workspace?.reviewCount,
            workspace?.review_count,
            workspace?.reviewsCount,
            workspace?.reviews_count
        )
    );
    const nestedWorkspace =
        workspace?.workspace ||
        workspace?.place ||
        workspace?.store ||
        workspace?.business ||
        {};

    return {
        ...workspace,
        workspaceId:
            normalizedId ??
            pickFirstDefined(
                workspace?.workspaceId,
                workspace?.workspace_id,
                workspace?.id
            ),
        id:
            normalizedId ??
            pickFirstDefined(
                workspace?.id,
                workspace?.workspaceId,
                workspace?.workspace_id
            ),
        name:
            pickFirstDefined(
                workspace?.name,
                workspace?.placeName,
                workspace?.place_name,
                workspace?.workspaceName,
                workspace?.workspace_name,
                workspace?.businessName,
                workspace?.business_name,
                workspace?.storeName,
                workspace?.store_name,
                workspace?.title,
                workspace?.displayName,
                workspace?.display_name,
                nestedWorkspace?.name,
                nestedWorkspace?.placeName,
                nestedWorkspace?.place_name,
                nestedWorkspace?.workspaceName,
                nestedWorkspace?.workspace_name,
                nestedWorkspace?.businessName,
                nestedWorkspace?.storeName,
                nestedWorkspace?.title
            ) || '사업장 이름 없음',
        address:
            pickFirstDefined(
                workspace?.address,
                workspace?.roadAddress,
                workspace?.road_address,
                workspace?.addressName,
                workspace?.address_name,
                workspace?.road_address_name
            ) || '',
        category:
            pickFirstDefined(
                workspace?.category,
                workspace?.categoryName,
                workspace?.category_name,
                workspace?.industryType,
                workspace?.industry_type
            ) || '기타',
        district:
            pickFirstDefined(
                workspace?.district,
                workspace?.region,
                workspace?.gu,
                workspace?.addressRegion,
                workspace?.address_region
            ) || '',
        latitude:
            normalizedLatitude ??
            pickFirstDefined(
                workspace?.latitude,
                workspace?.lat,
                workspace?.y
            ),
        longitude:
            normalizedLongitude ??
            pickFirstDefined(
                workspace?.longitude,
                workspace?.lng,
                workspace?.x
            ),
        cleanScore:
            normalizedCleanScore ??
            pickFirstDefined(
                workspace?.cleanScore,
                workspace?.clean_score,
                workspace?.score
            ),
        reviewCount:
            normalizedReviewCount ??
            pickFirstDefined(
                workspace?.reviewCount,
                workspace?.review_count,
                workspace?.reviewsCount,
                workspace?.reviews_count
            )
    };
};

const normalizeWorkspaceList = (payload) => {
    if (Array.isArray(payload)) {
        return payload.map(normalizeWorkspace);
    }

    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const nestedKeys = [
        'content',
        'results',
        'items',
        'workspaces',
        'list',
        'data',
        'result'
    ];

    for (const key of nestedKeys) {
        const normalized = normalizeWorkspaceList(
            payload[key]
        );

        if (normalized.length > 0) {
            return normalized;
        }
    }

    return [];
};

const normalizeWorkspacePayload = (payload) => {
    const source =
        payload?.data &&
        typeof payload.data === 'object' &&
        !Array.isArray(payload.data)
            ? payload.data
            : payload;
    const nestedWorkspace =
        source?.workspace ||
        source?.workspaceDetail ||
        source?.workspaceInfo ||
        source?.detail ||
        source?.item;
    const mergedSource =
        nestedWorkspace &&
        typeof nestedWorkspace === 'object' &&
        !Array.isArray(nestedWorkspace)
            ? {
                  ...source,
                  ...nestedWorkspace
              }
            : source;

    return normalizeWorkspace(mergedSource);
};

/**
 * 사업장 목록 및 지도 핀 데이터 조회
 *
 * @param {string|null} status
 * @param {string|null} keyword
 * @returns {Promise<Array>}
 */
export const getWorkspaces = async (
    status = null,
    keyword = null
) => {
    const params = {};

    if (status) {
        params.status = status;
    }

    if (keyword) {
        params.keyword = keyword;
    }

    const response = await api.get('/workspaces', {
        params,
        useAuth: false
    });

    return normalizeWorkspaceList(response.data);
};

export const searchWorkspacesNaturalLanguage = async (
    query
) => {
    const response = await api.get(
        '/workspaces/nl-search',
        {
            params: {
                query
            },
            useAuth: false
        }
    );

    const raw = response.data?.data || response.data;
    const results = normalizeWorkspaceList(raw);

    return {
        interpreted:
            raw?.interpreted &&
            typeof raw.interpreted === 'object'
                ? raw.interpreted
                : null,
        results
    };
};

const normalizeReviewTarget = (place) => {
    const normalizedWorkspace =
        normalizeWorkspace(place);
    const workspaceId = Number(
        normalizedWorkspace?.workspaceId ??
            normalizedWorkspace?.id
    );

    return {
        ...normalizedWorkspace,
        workspaceId: Number.isFinite(workspaceId)
            ? workspaceId
            : normalizedWorkspace?.workspaceId,
        kakaoPlaceId:
            place?.kakaoPlaceId ||
            place?.providerPlaceId ||
            place?.kakao_place_id ||
            place?.placeId ||
            place?.place_id ||
            '',
        name:
            normalizedWorkspace?.name ||
            '사업장 이름 없음',
        address:
            normalizedWorkspace?.address ||
            '',
        category:
            normalizedWorkspace?.category?.trim?.() ||
            '기타',
        latitude: normalizedWorkspace?.latitude ?? null,
        longitude:
            normalizedWorkspace?.longitude ?? null,
        existing:
            place?.existing ??
            Boolean(
                Number.isFinite(workspaceId)
                    ? workspaceId
                    : place?.workspaceId
            )
    };
};

export const searchReviewTargets = async (keyword) => {
    try {
        const response = await api.get(
            '/workspaces/place-search',
            {
                params: {
                    keyword
                },
                useAuth: false
            }
        );

        const results = normalizeWorkspaceList(response.data);

        return results.map(normalizeReviewTarget);
    } catch (error) {
        if (![502, 503].includes(error?.response?.status)) {
            throw error;
        }

        const fallbackResults = await getWorkspaces(
            null,
            keyword
        );

        if (!Array.isArray(fallbackResults)) {
            throw error;
        }

        return fallbackResults.map((place) =>
            normalizeReviewTarget({
                ...place,
                existing: true
            })
        );
    }
};

export const getWorkspaceDetail = async (workspaceId) => {
    const response = await api.get(
        `/workspaces/${workspaceId}`,
        {
            useAuth: false
        }
    );

    return normalizeWorkspacePayload(response.data);
};

export const getWorkspaceSummary = async (workspaceId) => {
    const response = await api.get(
        `/workspaces/${workspaceId}/summary`,
        {
            useAuth: false
        }
    );

    return normalizeWorkspacePayload(response.data);
};

export const createWorkspace = async (payload) => {
    const response = await api.post(
        '/workspaces',
        payload
    );

    return response.data;
};

export const recalculateWorkspaceCleanScore = async (
    workspaceId
) => {
    const response = await api.post(
        `/workspaces/${workspaceId}/clean-score/recalculate`
    );

    return response.data;
};

/**
 * 미등록 카카오 장소를 내부 사업장으로 등록합니다.
 *
 * @param {object} placeData
 * @returns {Promise<object>}
 */
export const resolveWorkspace = async (placeData) => {
    const response = await api.post(
        '/workspaces/resolve',
        placeData
    );

    return response.data;
};
