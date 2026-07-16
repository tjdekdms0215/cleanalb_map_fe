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

export const searchReviewTargets = async (keyword) => {
    const response = await api.get(
        '/workspaces/search',
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