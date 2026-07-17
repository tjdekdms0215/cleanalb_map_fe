import api from './axios';

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

    return response.data;
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
    const results = Array.isArray(raw?.results)
        ? raw.results
        : [];

    return {
        interpreted:
            raw?.interpreted &&
            typeof raw.interpreted === 'object'
                ? raw.interpreted
                : null,
        results
    };
};

export const searchReviewTargets = async (keyword) => {
    const response = await api.get(
        '/workspaces/place-search',
        {
            params: {
                keyword
            },
            useAuth: false
        }
    );

    if (!Array.isArray(response.data)) {
        throw new Error(
            '사업장 검색 API 응답이 배열이 아닙니다.'
        );
    }

    return response.data.map((place) => ({
        ...place,
        category:
            place.category?.trim() || '기타'
    }));
};

export const getWorkspaceDetail = async (workspaceId) => {
    const response = await api.get(
        `/workspaces/${workspaceId}`,
        {
            useAuth: false
        }
    );

    return response.data;
};

export const getWorkspaceSummary = async (workspaceId) => {
    const response = await api.get(
        `/workspaces/${workspaceId}/summary`,
        {
            useAuth: false
        }
    );

    return response.data;
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
